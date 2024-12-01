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
import { HeroImage, ImageFocalPoints, heroImages } from "~/hero/imageshuffle/data"
import { logger } from "~/log"
import { time } from "console"

const HERO_CONFIG = {
  INTERVAL: 20000,
  ANIMATION: {
    ENTER: { ease: "power2.inOut", duration: 1.5 },
    EXIT: { ease: "power2.out", duration: 0.5 },
    PAN: {
      delay: 1.5,
      duration: 15,
      ease: "sine.out",
      focalPoint: {
        horizontalBias: 0.8, // Center bias
        verticalBias: 0.6,
        randomness: 0.2 // How much random variation from center
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
    if (screenWidth <= 1024) {
      return 1280
    }
    if (screenWidth <= 1600) {
      return 1920
    }
    if (screenWidth <= 2048) {
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
      activeImageIndex: 0,
      currentImage: null,
      currentTimeline: gsap.timeline(),
      isAtHome: isAtHome(),
      isVisible: isPageVisible(),
      lastActiveTime: Date.now(),
      optimalWidth: this.getOptimalWidth(),
      orientation: portraitMediaQuery.matches ? 'portrait' : 'landscape',
      status: 'loading',
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
   * Quickly inserts an invisible impage into the DOM to test its position
   * and dimensions, then removes it.
   * @param img The image element to retrieve dimensions for.
   * @returns The dimensions of the image.
   */
  private testImageDimensions(img: HTMLImageElement): ImageDimensions {

    const timeline = gsap.timeline()
    let computedStyle = null
    let naturalWidth = 0
    let naturalHeight = 0
    let boundingRect = null
    timeline.add(gsap.set(img, { visibility: "hidden", opacity: 0 }))
    timeline.add(() => {
      parallaxLayer?.append(img)
      computedStyle = getComputedStyle(img)
      logger.info(`Computed style for ${img.nodeName}:`, computedStyle)
      naturalWidth = img.naturalWidth
      naturalHeight = img.naturalHeight
      boundingRect = img.getBoundingClientRect()
      logger.info(`Natural dimensions for ${img.nodeName}:`, { naturalWidth, naturalHeight })
      logger.info(`Bounding rect for ${img.nodeName}:`, boundingRect)
      parallaxLayer?.removeChild(img)
    }).eventCallback("onComplete", () => { timeline.kill() })
    timeline.add(gsap.set(img, { visibility: "visible", opacity: 1 }))
    timeline.play()
    if (timeline.isActive()) {
      timeline.kill()
    }
    return { computedStyle, naturalWidth, naturalHeight, boundingRect } as unknown as ImageDimensions
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
    const { imageName, srcset, src, focalPoints } = imgSettings

    if (!src) {
      throw new Error('No image source provided')
    }

    const imageBlob = await firstValueFrom(this.loadImage(src))
    const img = new Image()

    // Wait for image to load before continuing
    await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        this.setImageAttributes(img, imageBlob, imageName, srcset, focalPoints)
    })

    logger.info(`Image loaded: ${imageName} - dimensions: ${img.naturalWidth}x${img.naturalHeight}`)
    this.trackImageMetadata(img)
    return img
  }

  /**
   * Sets the attributes for the specified image element.
   * @param img The image element to set attributes for.
   * @param imageBlob The image blob to create an object URL from.
   * @param imageName The name of the image.
   * @param srcset The source set for the image.
   * @param focalPoints The focal points for the image.
   */
  private setImageAttributes(img: HTMLImageElement, imageBlob: Blob, imageName: string, srcset: string, focalPoints?: ImageFocalPoints): void {
    img.src = URL.createObjectURL(imageBlob)
    img.srcset = srcset
    img.sizes = `
      (max-width: 1024px) 1280px,
      (max-width: 1600px) 1920px,
      (max-width: 2048px) 2560px,
      3840px
    `
    img.alt = ""
    img.classList.add("hero-parallax__image", `hero-parallax__image--${imageName}`)
    img.draggable = false
    img.loading = parallaxLayer?.getElementsByTagName('img').length !== 0 ? "lazy" : "eager"
    if (focalPoints) {
      img.setAttribute("data-focus-main-x", focalPoints.main[0].toString())
      img.setAttribute("data-focus-main-y", focalPoints.main[1].toString())
      img.setAttribute("data-focus-secondary-x", focalPoints.secondary[0].toString())
      img.setAttribute("data-focus-secondary-y", focalPoints.secondary[1].toString())
    }
  }

  /**
   * Computes the combined bounding rectangle for the specified rectangles.
   * @param rect1 first bounding rectangle
   * @param rect2 second bounding rectangle
   * @returns The combined bounding rectangle.
   */
  private computeCombinedRects(rect1: DOMRect, rect2: DOMRect): DOMRect {
    const x = Math.min(rect1.x, rect2.x)
    const y = Math.min(rect1.y, rect2.y)
    const right = Math.max(rect1.right, rect2.right)
    const bottom = Math.max(rect1.bottom, rect2.bottom)
    const width = right - x
    const height = bottom - y
    return new DOMRect(x, y, width, height)
  }

  /**
   * Retrieves the bounding rectangle for the header element.
   * @returns The bounding rectangle for the header element, accounting for
   * the tab visibility if present.
   */
  private getHeaderRect(): DOMRect {
    const defaultRect = new DOMRect(0, 0, 0, 0)
    const tabElement = document.querySelector(".md-tabs")
    const headerElement = document.getElementById("header-target")
    const tabVisible = tabElement?.checkVisibility({ opacityProperty: true, visibilityProperty: true }) || false
    const headerBox = headerElement?.getBoundingClientRect()
    const tabBox = tabElement?.getBoundingClientRect()

    if (!headerBox && !tabBox) {
      return defaultRect
    }
    if (tabVisible && tabBox && headerBox) {
      return this.computeCombinedRects(headerBox, tabBox)
    }
    if (tabVisible && tabBox) {
      return tabBox
    }
    return headerBox || defaultRect
  }



  private computeTranslationDimensions(img: HTMLImageElement): TranslatableAreas {
    const { computedStyle, naturalWidth, naturalHeight, boundingRect } = this.testImageDimensions(img)
    const containerRect = img.parentElement?.getBoundingClientRect() || document.body.getBoundingClientRect()
    const headerRect = this.getHeaderRect()
    const isImageBottomVisible = boundingRect.bottom <= (window.innerHeight - boundingRect.top)

    // Calculate scaled image dimensions
    const scale = Number(computedStyle.getPropertyValue('scale')) || 1
    const imgWidth = Math.max(naturalWidth * scale, boundingRect.width)
    const imgHeight = Math.max(naturalHeight * scale, boundingRect.height)
    const visibleRect = new DOMRect(0, headerRect.bottom, window.innerWidth, window.innerHeight - headerRect.bottom)
    const excessTop = Math.abs(Math.min(0, headerRect.bottom - boundingRect.top))
    const excessBottom = isImageBottomVisible ? 0 : boundingRect.bottom - window.innerHeight
    const excessLeft = Math.abs(Math.min(0, boundingRect.left))
    const excessRight = Math.max(0, boundingRect.right - window.innerWidth)
    const yTopRect = new DOMRect(0, (excessTop > 0 ? Math.min(visibleRect.top - excessTop, boundingRect.top) : visibleRect.top), visibleRect.width, excessTop)
    const yBottomRect = new DOMRect(0, excessBottom ? (visibleRect.bottom + excessBottom) : 0, window.innerWidth, excessBottom)
    const xLeftRect = new DOMRect(-excessLeft, visibleRect.top, Math.abs(excessLeft), visibleRect.height)
    const xRightRect = new DOMRect(visibleRect.right, visibleRect.top, excessRight, visibleRect.height)
    setCssVariable("--header-height", `${visibleRect.top}px`)
    return {yTopRect, yBottomRect, xLeftRect, xRightRect, overflow: { left: excessLeft, right: excessRight, top: excessTop, bottom: excessBottom }, visibleRect, containerRect, imageDimensions: { computedStyle, naturalWidth, naturalHeight, boundingRect }, imageWidth: imgWidth, imageHeight: imgHeight} as TranslatableAreas
  }

  /**
   * Creates a pan animation for the specified image.
   * @param img The image to create a pan animation for.
   * @returns The created GSAP timeline for the pan animation, or undefined if reduced motion is preferred.
   */
  public createPanAnimation(img: HTMLImageElement): GSAPTimeline | undefined {
    if (prefersReducedMotion()) {
      return undefined
    }

    const tl = gsap.timeline()
    const { xLeftRect, xRightRect, yTopRect, yBottomRect, overflow, visibleRect, containerRect, imageDimensions, imageWidth, imageHeight } = this.computeTranslationDimensions(img)
    let translatable = { left: false, right: false, top: false, bottom: false }

    if (overflow.top && !overflow.bottom) {
      if (imageHeight > visibleRect.height) {
        // we even out the image
        const offset = (imageHeight - visibleRect.height) / 2
        tl.add(["yReposition", gsap.set(img, { y: visibleRect.top - offset })], "<")
        yTopRect.y = visibleRect.top - offset
        yBottomRect.y = visibleRect.bottom + offset
        overflow.bottom = offset
        overflow.top = offset
      } else {
        // align the image to the top
        tl.set(img, { y: yTopRect.top })
        overflow.top = 0
      }
    }
    translatable.top = overflow.top > 0
    translatable.bottom = overflow.bottom > 0
    translatable.left = overflow.left > 0
    translatable.right = overflow.right > 0

    if (Object.values(translatable).every(value => value === false)) { return undefined }


  // Maximum allowed translations
    const maxX = Math.max(0, (imgWidth - visibleWidth) / 2)
    const maxY = Math.max(0, (imgHeight - visibleHeight) / 2)

  // Focal points (ensure they are between 0 and 100)
    const focalX = gsap.utils.clamp(0, 100, Number(img.dataset.focusMainX) || 50)
    const focalY = gsap.utils.clamp(0, 100, Number(img.dataset.focusMainY) || 50)
    const startX = gsap.utils.clamp(0, 100, Number(img.dataset.focusSecondaryX) || 50)
    const startY = gsap.utils.clamp(0, 100, Number(img.dataset.focusSecondaryY) || 50)

  // Map focal points to positions
    const mapPosition = (value: number, max: number) =>
    gsap.utils.clamp(-max, max, gsap.utils.mapRange(0, 100, -max, max, value))

    const startPosX = mapPosition(startX, maxX)
    const startPosY = mapPosition(startY, maxY)
    const endPosX = mapPosition(focalX, maxX)
    const endPosY = mapPosition(focalY, maxY)

    logger.info(
      `Creating pan animation for ${img.nodeName}. Calculated values:\n` +
    `start: ${startPosX}, ${startPosY}\n` +
    `end: ${endPosX}, ${endPosY}\n` +
    `max: ${maxX}, ${maxY}\n` +
    `scale: ${scale}`
    )

  // Pan animation variables
    const panVars = HERO_CONFIG.ANIMATION.PAN

    tl.fromTo(
      img,
    { x: startPosX, y: startPosY },
    {
      x: endPosX,
      y: endPosY,
      duration: panVars.duration,
      ease: panVars.ease,
    }
    )

    return tl
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
    const currentAnimation = this.state$.value.currentTimeline || null
    const startUpActions = () => {
      // remove the image if already in the DOM
      if (parallaxLayer.contains(img)) {
        parallaxLayer.removeChild(img)
      }
      // Add the image to the DOM; only first-child is visible in CSS, so no need to remove others
        parallaxLayer.prepend(img)
        // Ensure image is loaded before setting height
        if (img.naturalHeight) {
          this.setParallaxHeight(img.naturalHeight)
        } else {
          img.onload = () => this.setParallaxHeight(img.naturalHeight)
        }
        this.updateState({ activeImageIndex: index })
        this.updateTextElements(imgName)
      if (currentAnimation.isActive()) {
        this.state$.value.currentTimeline.kill()
      }
    }
    // Add startup settings to timeline first; triggers with animation
    timeline.add(["startupActions", startUpActions], 0)
    // Add enter animation for new image
      .add(["imageEnter", gsap.to(img, HERO_CONFIG.ANIMATION.ENTER)], "<")
    // Add exit animation for current image if it exists
    if (currentImage) {
      timeline.add(["imageExit", gsap.to(currentImage, HERO_CONFIG.ANIMATION.EXIT)], "<")
    }
    // Add pan animation if user isn't reducing motion and image is loaded
    if (!prefersReducedMotion() && img.naturalWidth && img.naturalHeight) {
      logger.info("Creating and adding pan animation for ", imgName)
      const panAnimation = this.createPanAnimation(img)
      if (panAnimation && panAnimation instanceof gsap.core.Timeline) {
        timeline.add(["panEffect", panAnimation], ">")
      }
    }
    // update state with new timeline and smooth out timeline
    timeline.smoothChildTiming = true
    this.cleanup.set(img, timeline)
    this.updateState({ currentTimeline: timeline, currentImage: img })
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
