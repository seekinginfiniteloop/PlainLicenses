/**
 * Handles the state and behavior of the hero image cycling feature on the landing page.
 * @copyright No rights reserved. Created by and for Plain License: https//www.plainlicense.org and dedicated to the Public Domain.
 * @license Plain Unlicense (Public Domain)
 */

import gsap from "gsap"
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subscription,
  firstValueFrom,
  from,
  fromEvent,
  interval,
  merge,
  of,
  shareReplay,
  throwError
} from "rxjs"
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  mergeMap,
  switchMap,
  tap,
  withLatestFrom
} from "rxjs/operators"

import { SubscriptionManagerType, isHome, isOnSite, locationBeacon$, locationBehavior$, prefersReducedMotion, setCssVariable } from "~/utils"
import { getAsset } from "~/cache"
import { HeroImage, heroImages } from "~/hero/imageshuffle/data"
import { logger } from "~/log"

const HERO_CONFIG = {
  INTERVAL: 20000,
  ANIMATION: {
    ENTER: { perspective: "1600px", ease: "power2.inOut" },
    ENTER_DURATION: 2,
    EXIT: { ease: "power2.out" },
    EXIT_DURATION: 0.5,
    PAN: {
      intervals: 3,
      duration: 20,
      ease: "none",
      buffer: 48,
      focalZone: {
        horizontalWeight: 0.66,
        verticalWeight: 0.66,
        bias: 0.7
      }
    }
  }
} as const

const isPageVisible = () => !document.hidden
const isAtHome = () => {
  const loc = locationBehavior$.value
  return isHome(loc) && isOnSite(loc)
}
const leftPage = () => !isAtHome() && isOnSite(locationBehavior$.value)

const portraitMediaQuery = window.matchMedia("(orientation: portrait)")
const parallaxLayer = document.getElementById("parallax-hero-image-layer")

/**
 * Manages the state and behavior of a hero image cycling feature.
 *
 * The HeroStateManager class handles the visibility, home status, and image cycling logic for a hero component.
 * It utilizes RxJS for state management and subscriptions, and GSAP for animations. The class also manages
 * image loading and updates based on the current viewport size and orientation.
 */
class HeroStateManager {
  private state$ = new BehaviorSubject<HeroState>(this.getInitialState())

  private readonly subscriptionManager: SubscriptionManagerType = window.subscriptionManager

  private readonly shuffledHeroes: HeroImage[]

  private loadedImages = new Map<string, HTMLImageElement>()

  private homePath: null | string = null

  private cleanup = new Map<HTMLImageElement, GSAPTimeline>()

  private imageMetadata = new WeakMap<HTMLImageElement, ImageMetadata>()

  private hasPageSubscriptions = false

  private readonly optimalWidth$ = new BehaviorSubject<number>(this.getOptimalWidth())

  /**
   * An observable that emits a boolean indicating whether the hero can cycle through images.
   */
  public readonly canCycle$ = this.state$.pipe(
    map(({ isVisible, isAtHome, status }) => isVisible && isAtHome && status === 'cycling'),
    distinctUntilChanged(),
    shareReplay(1)
  )

  /**
   * Retrieves an array of hero images with their optimal widths.
   * @returns An array of hero images.
   */
  private getHeroes = (): HeroImage[] => {
    const optimalWidth = this.optimalWidth$.value
    return heroImages.map(image => ({ ...image, src: image.widths[optimalWidth] }))
  }

  /**
   * Calculates the optimal width based on the current screen dimensions.
   * @returns The optimal width for the hero images.
   */
  private getOptimalWidth(): number {
    const screenWidth = Math.max(window.innerWidth, window.innerHeight)
    if (screenWidth <= 1175) {
      return 1280
    }
    if (screenWidth <= 1850) {
      return 1920
    }
    if (screenWidth <= 2400) {
      return 2560
    }
    return 3840
  }

  /**
   * Initializes the hero state with default values.
   * @returns The initial state of the hero component; setting its attributes.
   */
  private getInitialState(): HeroState {
    return {
      status: 'loading',
      isVisible: isPageVisible(),
      isAtHome: isAtHome(),
      activeImageIndex: 0,
      orientation: portraitMediaQuery.matches ? 'portrait' : 'landscape',
      optimalWidth: this.getOptimalWidth(),
      lastActiveTime: Date.now(),
    }
  }

  /**
   * Sets the home path and subscribes to location changes.
   * @returns The subscription for the home path observer.
   */
  private setHomePathAndObserver = () => locationBeacon$.pipe(
    filter(() => isAtHome()),
    map(loc => loc as URL),
    shareReplay(1),
    tap(loc => {
      this.homePath = loc.pathname
      this.updateState({ isAtHome: true })
    }),
    finalize(() => logger.info(`Home observer completed for ${this.homePath}`))
  ).subscribe()

  /**
   * Creates an instance of HeroStateManager and initializes the shuffled heroes and subscriptions.
   */
  constructor() {
    this.shuffledHeroes = [...this.getHeroes()].sort(() => Math.random() - 0.5)
    this.setupSubscriptions()
    window.addEventListener('unload', () => this.dispose())
    this.setHomePathAndObserver()
  }

  /**
   * Sets up subscriptions for various events related to the hero state.
   */
  private setupSubscriptions(): void {
    const pageExitSub = locationBeacon$.pipe(
      filter(url => url instanceof URL && leftPage()),
      debounceTime(HERO_CONFIG.INTERVAL),
      filter(() => leftPage()),
      map(() => false)
    ).subscribe(isAtHome => {
      this.updateState({ isAtHome })
      this.subscriptionManager.cleanup()
      this.hasPageSubscriptions = false
    })

    const visibilitySub = fromEvent(document, 'visibilitychange').pipe(
      map(() => isPageVisible()),
      distinctUntilChanged(),
      tap(isVisible => this.updateState({ isVisible })),
    ).subscribe()

    const orientationSub = merge(
      fromEvent(window, 'resize'),
      fromEvent(portraitMediaQuery, 'change')
    ).pipe(
      debounceTime(100),
      map(() => ({
        orientation: portraitMediaQuery.matches ? 'portrait' : 'landscape',
        optimalWidth: this.getOptimalWidth(),
      })),
      tap(({ orientation, optimalWidth }) => {
        this.updateState({ orientation: orientation as 'portrait' | 'landscape', optimalWidth })
        this.updateImageSources(
          Array.from(parallaxLayer?.getElementsByTagName('img') || []),
          optimalWidth
        )
      })
    ).subscribe();

    [pageExitSub, orientationSub, visibilitySub].forEach(sub => this.subscriptionManager.addSubscription(sub, false))
  }

  /**
   * Updates the hero state with the provided partial updates.
   * @param updates The updates to apply to the current state.
   */
  public updateState(updates: Partial<HeroState>): void {
    if (this.state$.closed) {
      return
    }

    const currentState = this.state$.value
    const newState = { ...currentState, ...updates }

    newState.status = newState.isVisible && newState.isAtHome ? 'cycling' : 'paused'

    if (newState.status === 'cycling' && currentState.status !== 'cycling') {
      newState.lastActiveTime = Date.now()
    }

    this.state$.next(newState)
  }

  /**
   * Sets the height of the parallax effect based on the provided height.
   * @param height The height to set for the parallax effect.
   */
  private setParallaxHeight(height: number): void {
    const headerHeight = document.getElementById("header-target")?.clientHeight || 95
    setCssVariable("--header-height", `${headerHeight}px`)
    const effectiveViewHeight = window.innerHeight - headerHeight
    const maxFade = effectiveViewHeight * 1.4

    if (!parallaxLayer || height <= 0) {
      const currentValue = document.documentElement.style.getPropertyValue("--fade-height")
      setCssVariable("--fade-height", Math.max(Number(currentValue), effectiveViewHeight).toString())
    }

    setCssVariable("--fade-height", `${Math.min(height * 1.2, maxFade, effectiveViewHeight)}px`)
    setCssVariable("--parallax-height", `${height < effectiveViewHeight ? effectiveViewHeight : Math.min(height * 1.2, maxFade)}px`)
  }

  /**
   * Retrieves a hero image by its name.
   * @param imageName The name of the image to retrieve.
   * @returns The hero image if found, otherwise undefined.
   */
  private retrieveImage(imageName: string): HeroImage | undefined {
    return heroImages.find(image => image.imageName === imageName)
  }

  /**
   * Updates the sources of the provided images based on the optimal width.
   * @param images The images to update.
   * @param optimalWidth The optimal width to use for the image sources.
   */
  private updateImageSources(images: HTMLImageElement[], optimalWidth: number): void {
    images.forEach(image => {
      const imageName = image.classList[1].split("--")[1]
      const foundImage = this.retrieveImage(imageName)
      if (foundImage) {
        image.src = foundImage.widths[optimalWidth]
      }
    })
  }

  /**
   * Loads an image from the specified URL and returns an observable of the image blob.
   * @param imageUrl The URL of the image to load.
   * @returns An observable that emits the image blob.
   */
  private loadImage(imageUrl: string): Observable<Blob> {
    return getAsset(imageUrl, true).pipe(
      mergeMap(response => from(response.blob())),
      catchError(error => {
        logger.error("Error loading image:", error, { url: imageUrl })
        return throwError(() => new Error(`Failed to load image: ${imageUrl}`))
      })
    )
  }

  /**
   * Updates the text elements associated with the specified image name.
   * @param imageName The name of the image to update text elements for.
   */
  private updateTextElements(imageName: string): void {
    const headerEl = document.getElementById("CTA_header")
    const textEl = document.getElementById("CTA_paragraph")
    const className = `hero-parallax__image--${imageName}`

    headerEl?.setAttribute("class", className)
    textEl?.setAttribute("class", className)
  }

  /**
   * Calculates the pan range for the given parameters.
   * @param total The total size.
   * @param viewport The viewport size.
   * @param weight The weight for the calculation.
   * @param bias The bias for the calculation.
   * @returns The calculated pan range.
   */
  private calculatePanRange(
    total: number,
    viewport: number,
    weight: number,
    bias: number
  ): number {
    if (total <= viewport) {
      logger.info("Image is smaller than viewport; no pan needed")
      return 0
    }

    const excess = total - viewport
    const focalZoneSize = total * weight
    const panRange = -(excess + HERO_CONFIG.ANIMATION.PAN.buffer)
    const focalZoneRatio = focalZoneSize / total

    return panRange * bias * focalZoneRatio
  }

  /**
   * Tracks metadata for the specified image.
   * @param img The image element to track metadata for.
   */
  public trackImageMetadata(img: HTMLImageElement): void {
    this.imageMetadata.set(img, {
      loadTime: Date.now(),
      displayCount: 0,
      width: img.width,
      actualWidth: this.getOptimalWidth()
    })
  }

  /**
   * Creates an image cycler for the specified parallax layer.
   * @param parallaxLayer The parallax layer to associate with the cycler.
   * @returns The created image cycler.
   */
  public static createCycler(): ImageCycler {
    const state = new HeroStateManager()

    const loadImages$ = of(state.cycleImage()).pipe(
      catchError(error => {
        logger.error("Failed to load initial image:", error)
        state.updateState({ status: 'error' })
        return EMPTY
      })
    )

    const cycle$ = interval(HERO_CONFIG.INTERVAL).pipe(
      withLatestFrom(state.canCycle$),
      filter(([_, canCycle]) => canCycle),
      switchMap(() => from(state.cycleImage()))
    )

    return {
      loadImages$,
      cycle$,
      heroState: state,
      start: () => {
        const subscription = new Subscription()
        subscription.add(loadImages$.subscribe())
        subscription.add(cycle$.subscribe())
        return subscription
      },
      stop: () => state.dispose(),
    }
  }

  /**
   * Retrieves metadata for the specified image.
   * @param img The image element to retrieve metadata for.
   * @returns The metadata for the image, or undefined if not found.
   */
  public getImageMetadata(img: HTMLImageElement): ImageMetadata | undefined {
    return this.imageMetadata.get(img)
  }

  /**
   * Loads and prepares an image based on the provided settings.
   * @param imgSettings The settings for the image to load.
   * @returns A promise that resolves to the loaded image element.
   */
  public async loadAndPrepareImage(imgSettings: HeroImage): Promise<HTMLImageElement> {
    const { imageName, srcset, src } = imgSettings

    if (!src) {
      throw new Error('No image source provided')
    }

    const imageBlob = await firstValueFrom(this.loadImage(src))
    const img = new Image()

    this.setImageAttributes(img, imageBlob, imageName, srcset)

    this.trackImageMetadata(img)
    return img
  }

  /**
   * Sets the attributes for the specified image element.
   * @param img The image element to set attributes for.
   * @param imageBlob The image blob to create an object URL from.
   * @param imageName The name of the image.
   * @param srcset The source set for the image.
   */
  private setImageAttributes(img: HTMLImageElement, imageBlob: Blob, imageName: string, srcset: string): void {
    img.src = URL.createObjectURL(imageBlob)
    img.srcset = srcset
    img.sizes = `
      (max-width: 1175px) 1280px,
      (max-width: 1850px) 1920px,
      (max-width: 2400px) 2560px,
      3840px
    `
    img.alt = ""
    img.classList.add("hero-parallax__image", `hero-parallax__image--${imageName}`)
    img.draggable = false
    img.loading = parallaxLayer?.getElementsByTagName('img').length !== 0 ? "lazy" : "eager"
  }

  /**
   * Creates a pan animation for the specified image.
   * @param img The image to create a pan animation for.
   * @returns The created GSAP timeline for the pan animation, or undefined if reduced motion is preferred.
   */
  public createPanAnimation = (img: HTMLImageElement) => {
    if (prefersReducedMotion()) { return }
    logger.info("Creating pan animation")
    const { focalZone, intervals, duration } = HERO_CONFIG.ANIMATION.PAN
    const viewportHeight = window.innerHeight - (document.getElementById("header-target")?.clientHeight || 75)
    const viewportWidth = window.innerWidth

    const imageWidth = img.naturalWidth
    const imageHeight = img.naturalHeight
    logger.info(`Image dimensions: ${imageWidth}x${imageHeight}`)

    const xPan = this.calculatePanRange(imageWidth, viewportWidth, focalZone.horizontalWeight, focalZone.bias)
    const yPan = this.calculatePanRange(imageHeight, viewportHeight, focalZone.verticalWeight, focalZone.bias)

    logger.info(`Pan ranges: x=${xPan}, y=${yPan}; viewport: ${viewportWidth}x${viewportHeight}; image: ${imageWidth}x${imageHeight}; focal zone: ${focalZone.horizontalWeight}x${focalZone.verticalWeight}`)

    if (!xPan && !yPan) {
      return
    }

    const xKeyframes = xPan ? this.generateKeyframes(xPan, intervals, focalZone.bias) : [0]
    const yKeyframes = yPan ? this.generateKeyframes(yPan, intervals, focalZone.bias) : [0]

    const tl = gsap.timeline({ repeat: -1 })
    const segmentDuration = duration / intervals

    gsap.set(img, { x: xKeyframes[0], y: yKeyframes[0] })

    for (let i = 1; i <= intervals; i++) {
      tl.add(gsap.to(img, {
        x: xKeyframes[i % xKeyframes.length],
        y: yKeyframes[i % yKeyframes.length],
        duration: segmentDuration,
        ease: HERO_CONFIG.ANIMATION.PAN.ease
      }))
    }
    return tl
  }

  /**
   * Generates keyframes for the pan animation based on the maximum pan value.
   * @param maxPan The maximum pan value.
   * @param intervals The number of intervals for the animation.
   * @param focalBias The bias for the focal zone.
   * @returns An array of keyframe positions.
   */
  private generateKeyframes(maxPan: number, intervals: number, focalBias: number): number[] {
    const frames = []
    for (let i = 0; i <= intervals; i++) {
      const progress = i / intervals
      const weight = Math.sin(progress * Math.PI)
      const position = maxPan * weight * (progress < 0.5 ? focalBias : 1)
      frames.push(position)
    }
    return frames
  }

  /**
   * Cleans up resources associated with the specified image.
   * @param image The image element to clean up resources for.
   */
  public cleanupImageResources(image: HTMLImageElement) {
    const currentSrc = image.src
    if (currentSrc.startsWith('blob:')) {
      URL.revokeObjectURL(currentSrc)
    }
    const animation = this.cleanup.get(image)
    if (animation) {
      animation.kill()
      this.cleanup.delete(image)
    }
  }

  /**
   * Sets the timeline for the specified image, managing its entry and exit animations.
   * @param img The image to set the timeline for.
   * @param imgName The name of the image.
   * @param index The index of the image in the hero array.
   * @returns The GSAP timeline for the image animations.
   */
  private setTimelineForImage(img: HTMLImageElement, imgName: string, index: number): GSAPTimeline {
    if (!parallaxLayer) {
      return gsap.timeline()
    }

    const timeline = gsap.timeline({ paused: true })
    const currentImage = parallaxLayer.children?.[0] as HTMLImageElement | null
    const currentAnimation = currentImage && this.cleanup.get(currentImage)

    // Add a check to prevent double prepending
    timeline.add(() => {
        // Only prepend if image isn't already first child
        if (parallaxLayer.firstElementChild !== img) {
          if (parallaxLayer.contains(img)) {
            parallaxLayer.removeChild(img)
          }
          parallaxLayer.prepend(img)
        }

        gsap.set(img, { perspective: "0px", perspectiveOrigin: "bottom left" })
        this.setParallaxHeight(img.naturalHeight)
        this.updateState({ activeImageIndex: index })
        this.updateTextElements(imgName)

        if (currentAnimation) {
          currentAnimation.kill()
        }

        gsap.to(img, {
            perspective: "20000px",
            perspectiveOrigin: "5000% 2000%",
            transformOrigin: "center left",
            duration: 10,
            ease: "power2.inOut"
        })

        if (currentImage && currentImage !== img) {
          gsap.to(currentImage, { ...HERO_CONFIG.ANIMATION.EXIT })
        }
    })

    this.cleanup.set(img, timeline)
    return timeline
  }

  /**
   * Cycles to the next image in the hero image array.
   * @returns A promise that resolves when the image has been cycled.
   */
  public async cycleImage(): Promise<void> {
    if (!parallaxLayer || this.state$.closed) {
      return
    }

    // Get current state
    const { activeImageIndex } = this.state$.value || { activeImageIndex: 0 }
    const nextIndex = parallaxLayer.childElementCount > 0 ?
        (activeImageIndex + 1) % this.shuffledHeroes.length : 0
    const nextImageName = this.shuffledHeroes[nextIndex].imageName

    // Check if we're already showing this image
    const currentImage = parallaxLayer.children[0] as HTMLImageElement
    if (currentImage?.classList.contains(`hero-parallax__image--${nextImageName}`)) {
      return
    }

    const newImageElement = this.loadedImages.get(nextImageName) ||
        await this.loadAndPrepareImage(this.shuffledHeroes[nextIndex])

    // Get or create timeline
    const timeline = this.cleanup.get(newImageElement) ||
        this.setTimelineForImage(newImageElement, nextImageName, nextIndex)

    timeline.play()
  }

  /**
   * Disposes of the hero state manager, cleaning up resources and subscriptions.
   */
  public dispose(): void {
    this.state$.complete()
    this.loadedImages.forEach(img => this.cleanupImageResources(img))
    this.cleanup.forEach(timeline => timeline.kill())
    this.cleanup.clear()
    this.loadedImages.clear()
    this.imageMetadata = new WeakMap()
    this.subscriptionManager.schedulePageCleanup(this.homePath || '/')
  }

  /**
   * Returns an observable of the current hero state.
   * @returns The observable of the hero state object.
   */
  public getState$(): Observable<HeroState> {
    return this.state$.asObservable()
  }

  /**
   * Retrieves the current state of the hero.
   * @returns The current instance's state object.
   */
  public getCurrentState(): HeroState {
    return this.state$.value
  }
}

const cyclerRef = { current: null as ImageCycler | null }

/**
 * Initializes and starts the hero image cycler
 * @returns Cleanup function
 */
const initCycler = () => {
  if (!parallaxLayer) {
    logger.warn("No parallax layer found")
    return
  }

  logger.info("Initializing cycler")

  // Clean up any existing cycler
  cyclerRef.current?.stop()

  // Create new cycler
  cyclerRef.current = HeroStateManager.createCycler()

  // Start cycling and store subscription
  const subscription = cyclerRef.current.start()

  // Return cleanup function
  return () => {
    subscription?.unsubscribe()
    cyclerRef.current?.stop()
    cyclerRef.current = null
  }
}

/**
 * Creates an observable that handles continuous image cycling
 * @returns Observable for image cycling
 */
const shuffle$ = (): Observable<void> => {
    if (!parallaxLayer) {
      logger.warn("No parallax layer found")
      return EMPTY
    }

    // Ensure single cycler instance
    if (!cyclerRef.current) {
      initCycler()
    }

    // Use shareReplay to prevent multiple subscriptions
    return interval(HERO_CONFIG.INTERVAL).pipe(
      switchMap(() => {
            if (!cyclerRef.current?.heroState) {
              return EMPTY
            }
            const { canCycle$ } = cyclerRef.current.heroState

            return canCycle$.pipe(
              filter((canCycle) => canCycle === true),
              switchMap(() => from(cyclerRef.current!.heroState.cycleImage())),
              catchError(error => {
                    logger.error("Error during image cycle:", error)
                    return EMPTY
                })
            )
        }),
      shareReplay(1)
    )
}

// Export cleaned up interface
export const stopCycler = () => {
  if (cyclerRef.current) {
    cyclerRef.current.stop()
    cyclerRef.current = null
  }
}

export const debugState = () => cyclerRef.current?.heroState.getCurrentState()
export { shuffle$ }
