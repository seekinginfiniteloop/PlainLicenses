/**
 * Handles the state and behavior of the hero image cycling feature on the landing page.
 *
 * The HeroStateManager class manages the visibility, home status, and image cycling logic for the hero component.
 * Everything is probably overly verbose and could use a healthy refactor
 * @copyright No rights reserved. Created by and for Plain License: https//www.plainlicense.org and dedicated to the Public Domain.
 * @license Plain Unlicense (Public Domain)
 */

import gsap from "gsap"
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subscription,
  defer,
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
  takeLast,
  tap,
  withLatestFrom
} from "rxjs/operators"

import { getLocation } from "~/browser"

import { isHome, isOnSite, navigationEvents$, prefersReducedMotion$, setCssVariable, watchMediaQuery } from "~/utils"
import { getAsset$ } from "~/cache"
import { HeroImage, ImageFocalPoints, heroImages } from "~/hero/imageshuffle/data"
import { logger } from "~/log"
import { ImageTransformCalculator } from "~/utils/vectorcalc"
import { initHeroTextAnimation$ } from "../impactText"

import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import { text } from "stream/consumers"

gsap.registerPlugin(ScrollTrigger,ScrollToPlugin)

/**
 * ----------------------
 **   Config and utilities
 *------------------------*
 */

const HERO_CONFIG = {
  INTERVAL: 20000,
  ANIMATION: {
    ENTER: { ease: "power2.inOut", duration: 1.5 },
    EXIT: { ease: "power2.out", duration: 0.5 },
    PAN: {
      duration: 17000,
      ease: "sine.inOut",
      repeat: 0,
    }
  }
} as const

let customWindow = window as unknown as CustomWindow

const { location$, viewport$ } = customWindow

const isPortrait$ = watchMediaQuery("(orientation: portrait)")

const isPageVisible = () => !document.hidden
const isAtHome = () => {
  const loc = getLocation()
  location$.next(loc)
  return isHome(loc) && isOnSite(loc)
}
const leftPage = () => !isAtHome() && isOnSite(getLocation())

const parallaxLayer = customWindow.document.getElementById("parallax-hero-image-layer")

/**
 * ========================================================================
 **                       HERO STATE MANAGER
 *      It's a beast; needs a refactor, but it handles all the image
 *     cycling, loading, and state management for the hero component.
 *========================================================================*
 */

/**
 * Manages the state and behavior of a hero image cycling feature.
 *
 * It uses RxJS for state management and subscriptions, and GSAP for animations. The class also manages
 * image loading and updates based on the current viewport size and orientation.
 */
class HeroStateManager {
  private static instance: HeroStateManager | null = null

  private state$ = new BehaviorSubject<HeroState>(this.getInitialState())

  private readonly shuffledHeroes: HeroImage[]

  private loadedImages = new Map<string, HTMLImageElement>()

  private homePath: null | string = null

  private imageMetadata = new WeakMap<HTMLImageElement, ImageMetadata>()

  private hasPageSubscriptions = false

  private pageSubscriptions: Subscription = new Subscription()

  private homeWatcherSubscription: Subscription = new Subscription()

  private readonly optimalWidth$ = new BehaviorSubject<number>(this.getOptimalWidth())

  private readonly transformCalc = new ImageTransformCalculator()

  readonly config = {
    headerSelector: "#header-target",
    minTranslation: 100,
    maxScale: 1.4,
    layerSelector: "#parallax-hero-image-layer"
  }

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
    const screenWidth = Math.max(customWindow.innerWidth, customWindow.innerHeight)
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
      headerHeight: 0,
      viewportDimensions: { width: 0, height: 0 },
      optimalWidth: this.getOptimalWidth(),
      orientation: isPortrait$.subscribe((result => result)) ? 'portrait' : 'landscape',
      status: 'loading',
      preloadedImage: false,
    }
  }

  /**
   * Sets the home path and manages subscriptions for navigation events.
   */
  private setupHomeWatcher = () => {

    const leftHome$ = navigationEvents$.pipe(
      filter((url) => !isAtHome() && !isOnSite(url)),
      debounceTime(HERO_CONFIG.INTERVAL * 3),
      filter((url) => !isOnSite(url)), takeLast(1), // necessary? no. but it's here.
      finalize(() => this.dispose()) // cleanup
    ).subscribe()
    const homePathWatcher$ = merge(
      this.state$.pipe(
        map(state => state.isAtHome),
        filter(isAtHome => isAtHome)
      ),
      navigationEvents$.pipe(filter(() => isAtHome()))
    ).pipe(
      tap(loc => {
        if (loc instanceof URL) {
          this.homePath = loc.pathname
          this.updateState({ isAtHome: true })
          logger.info(`Home observer completed for ${this.homePath}`)
        }
      }),
      distinctUntilChanged(),
      filter(() => !this.hasPageSubscriptions),
      tap(() => {
        this.setupPageSubscriptions()
        this.hasPageSubscriptions = true
      })
    ).subscribe()

    this.homeWatcherSubscription.add(homePathWatcher$)
    this.homeWatcherSubscription.add(leftHome$)
  }

  /**
   * Creates an instance of HeroStateManager and initializes the shuffled heroes and subscriptions.
   */
  private constructor() {
    this.shuffledHeroes = [...this.getHeroes()].sort(() => Math.random() - 0.5)
    this.setupHomeWatcher()
    this.setupPageSubscriptions()
    customWindow.addEventListener('unload', () => this.dispose())
  }

  /**
   * Sets up subscriptions for various events related to the hero state.
   */
  private setupPageSubscriptions(): void {
    const pageExitSub = navigationEvents$.pipe(
      filter(url => url instanceof URL && leftPage()),
      debounceTime(HERO_CONFIG.INTERVAL),
      map(() => false)
    ).subscribe(() => {
      this.updateState({ isAtHome: false })
      this.hasPageSubscriptions = false
      this.pageSubscriptions.unsubscribe()
    })

    const visibilitySub = fromEvent(document, 'visibilitychange').pipe(
      map(() => isPageVisible()),
      distinctUntilChanged(),
      tap(isVisible => this.updateState({ isVisible })),
    ).subscribe()

    const orientationSub = merge(
      fromEvent(customWindow, 'resize').pipe(
        switchMap(() => viewport$),
        map(({ size }: Viewport) => size.width < size.height ? 'portrait' : 'landscape')
      ),
      fromEvent(customWindow, 'orientationchange'),
      isPortrait$.pipe(map(result => result ? 'portrait' : 'landscape'))
    ).pipe(
      debounceTime(150),
      tap(() => this.setParallaxHeight()),
      map((orientation) => ({
        orientation,
        optimalWidth: this.getOptimalWidth(),
      })),
      filter(({ optimalWidth }) => optimalWidth !== this.state$.value.optimalWidth),
      tap(({ orientation, optimalWidth }) => {
        this.updateState({ orientation: orientation as 'portrait' | 'landscape', optimalWidth })
        this.updateImageSources(
          Array.from(parallaxLayer?.getElementsByTagName('img') || []),
          optimalWidth
        )
      }),
      filter(() => this.state$.value.currentTimeline.isActive()),
      tap(() => {
        this.cycleImage(true)
      })
    ).subscribe()

    this.pageSubscriptions.add(pageExitSub)
    this.pageSubscriptions.add(visibilitySub)
    this.pageSubscriptions.add(orientationSub)
  }

  public static getInstance(): HeroStateManager {
    if (!HeroStateManager.instance) {
      HeroStateManager.instance = new HeroStateManager()
    }
    return HeroStateManager.instance
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

  private layerImages = () => {
    return Array.from(parallaxLayer?.getElementsByTagName('img') || [])
  }

  private layerEmpty = () => {
    return this.layerImages().length === 0
  }

  private layerNotEmpty = () => {
    return !this.layerEmpty()
  }

  private currentImage = () => {
    return this.layerImages()[0]
  }

  private lastImage = () => {
    return this.layerImages().slice(-1)[0]
  }

  /**
   * Sets the height of the parallax effect based on the provided height.
   */
  private setParallaxHeight(): void {
    const headerRect = this.getHeaderRect()
    const headerHeight = headerRect.height
    this.updateState({ headerHeight })
    setCssVariable("--header-height", `${headerHeight}px`)
    const effectiveViewHeight = customWindow.innerHeight - headerHeight
    const maxFade = effectiveViewHeight * 1.4

    if (!parallaxLayer || headerHeight <= 0) {
      const currentValue = document.documentElement.style.getPropertyValue("--fade-height")
      setCssVariable("--fade-height", Math.max(Number(currentValue), effectiveViewHeight).toString())
    }

    setCssVariable("--fade-height", `${Math.min(headerHeight * 1.2, maxFade, effectiveViewHeight)}px`)
    setCssVariable("--parallax-height", `${headerHeight < effectiveViewHeight ? effectiveViewHeight : Math.min(headerHeight * 1.2, maxFade)}px`)
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
    return getAsset$(imageUrl, true).pipe(
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
    const containsImageClass = (el: HTMLElement) => { return Array.from(el.classList).some(className => className.includes("hero-parallax__image--")) }

    const elements = [document.getElementById("CTA_header"), document.getElementById("CTA_paragraph")]
    const className = `hero-parallax__image--${imageName}`
    elements.forEach(el => {
      if (el && containsImageClass(el)) {
        const toRemove = Array.from(el.classList).filter(className => className.includes("hero-parallax__image--"))
        el.classList.remove(...toRemove)
        el.classList.add(className)
      } else if (el) {
        el.classList.add(className)
      }
    })
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
   * @returns The created image cycler.
   */
  static createCycler = (): ImageCycler => {
    const state = HeroStateManager.instance || new HeroStateManager()

    if (!parallaxLayer || !isAtHome()) {
      state.updateState({ status: 'paused' })
      // we cache an image to be ready if user navigates home
      state.loadAndPrepareImage(heroImages[0]).pipe(filter((image) => image instanceof HTMLImageElement)).subscribe({
        next: (img) => {
          state.loadedImages.set(heroImages[0].imageName, img)
          state.trackImageMetadata(img)
          state.updateState({ currentImage: img, preloadedImage: true, status: 'paused' })
        },
        error: (error) => {
          logger.error("Failed to preload image:", error)
          state.updateState({ status: 'error', preloadedImage: false, currentImage: null })
        }
      })

      return {
        cycle$: EMPTY,
        heroState: state,
        start: () => void 0,
        stop: () => state.dispose()
      }
    }

    // Create observable for initial image load
    const loadImages$ = from(state.cycleImage()).pipe(
      catchError(error => {
        logger.error("Failed to load initial image:", error)
        state.updateState({ status: 'error' })
        return EMPTY
      }),
      map(() => void 0)
    )

    // Create observable for subsequent cycles
    const cycle$ = interval(HERO_CONFIG.INTERVAL).pipe(
      withLatestFrom(state.canCycle$),
      filter(([_, canCycle]) => canCycle),
      tap(() => logger.info("=== Cycle interval triggered ===")),
      mergeMap(() => from(state.cycleImage()), 1),
      map(() => void 0),
      catchError(error => {
        logger.error("Failed to cycle image:", error)
        state.updateState({ status: 'error' })
        return EMPTY
      }),
      shareReplay(1)
    )

    // Combine both observables and ensure void type
    const combinedCycle$ = merge(loadImages$, cycle$).pipe(map(() => void 0))

    return {
      cycle$: combinedCycle$,
      heroState: state,
      start: () => combinedCycle$.subscribe(),
      stop: () => state.dispose()
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
  public loadAndPrepareImage(imgSettings: HeroImage): Observable<HTMLImageElement> {
    if (!parallaxLayer || !imgSettings.src) {
      throw new Error("Parallax layer or image source not found")
    }
    return this.loadImage(imgSettings.src).pipe(
      map(blob => {
        const img = new Image()
        img.src = URL.createObjectURL(blob)
        this.setImageAttributes(img, blob, imgSettings.imageName, imgSettings.srcset, imgSettings.focalPoints)
        return img
      }),
      tap(img => {
        if (!img.complete) {
          return new Promise((resolve) => {
            img.onload = () => resolve(img)
          })
        }
        return img
      })
    )
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
    logger.info("Setting image attributes for", imageName)
    img.src = URL.createObjectURL(imageBlob)
    img.srcset = srcset
    img.sizes = `
      (max-width: 1024px) 1280px,
      (max-width: 1600px) 1920px,
      (max-width: 2048px) 2560px,
      3840px
    `.trim().replace(/\s+/g, " ").replace(/\n/g, "")
    img.alt = ""
    img.classList.add("hero-parallax__image", `hero-parallax__image--${imageName}`)
    img.draggable = false
    img.loading = this.layerNotEmpty() ? "lazy" : "eager"
    if (focalPoints) {
      img.setAttribute("data-focus-main-x", focalPoints.main[0].toString())
      img.setAttribute("data-focus-main-y", focalPoints.main[1].toString())
      img.setAttribute("data-focus-secondary-x", focalPoints.secondary[0].toString())
      img.setAttribute("data-focus-secondary-y", focalPoints.secondary[1].toString())
    }
    logger.info("Image attributes set for", imageName)
  }

  /**
   * Quickly inserts an invisible impage into the DOM to test its position
   * and dimensions, then removes it.
   * @param img The image element to retrieve dimensions for.
   * @returns The dimensions of the image.
   */
  private testImageDimensions(img: HTMLImageElement): ImageDimensions {
    if (!parallaxLayer) {
      throw new Error("Parallax layer not found")
    }
    img.style.opacity = "0"
    img.style.scale = "1"
    parallaxLayer.append(img)
    const emplacedElement = this.lastImage()
    if (!emplacedElement) {
      throw new Error("Emplaced element not found")
    }
    const {naturalHeight, naturalWidth} = emplacedElement
    // shell game to avoid garbage collector
    const elementRect = emplacedElement.getBoundingClientRect()
    const elementStyle = JSON.stringify(window.getComputedStyle(emplacedElement))
    const rectJSON = JSON.stringify(elementRect)
    logger.info("Testing image in DOM:", img, "Emplaced element:", emplacedElement)
    logger.info("Bounding rect:", rectJSON, "Element style:", elementStyle, "Natural dimensions:", naturalWidth, naturalHeight)
    emplacedElement.remove()
    const boundingRect = JSON.parse(rectJSON)
    const processedStyle = JSON.parse(elementStyle)
    logger.info("Processed style:", processedStyle)
    logger.info("processed Bounding rect:", boundingRect)
    img.style.scale = ""
    img.style.opacity = ""
    img.style.visibility = ""
    return {
      computedStyle: processedStyle,
      naturalWidth,
      naturalHeight,
      boundingRect
    } as unknown as ImageDimensions
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
      logger.info("Tab and header are visible")
      return this.computeCombinedRects(headerBox, tabBox)
    }
    if (tabVisible && tabBox) {
      return tabBox
    }
    return headerBox || defaultRect
  }

  private getFocalPoints(img: HTMLImageElement): FocalPoints {
    // Get focal points (defaulting to center if not specified)
    return {
      main: {
        x: parseFloat(img.dataset.focusMainX || "0.5"),
        y: parseFloat(img.dataset.focusMainY || "0.5")
      },
      secondary: {
        x: parseFloat(img.dataset.focusSecondaryX || "0.5"),
        y: parseFloat(img.dataset.focusSecondaryY || "0.5")
      }
    }
  }

  private createImageAnimation(img: HTMLImageElement, imageName: string) {
    if (!img || !parallaxLayer) {
      return void 0
    }

    const tl = gsap.timeline({
      paused: true,
      repeat: 0,
      defaults: { ease: HERO_CONFIG.ANIMATION.PAN.ease },
      smoothChildTiming: true
    })

    // Add new image and text updates
    if (this.layerEmpty()) {
      Promise.allSettled([initHeroTextAnimation$()]).then(([textAnimation]) => {
        if (textAnimation.status === "fulfilled" && textAnimation.value instanceof gsap.core.Timeline) {
          tl.add(["introTextAnimation", textAnimation.value], "<")
        } else {
          logger.error("Failed to load text animation:", textAnimation.status)
        }
      })

      from(initHeroTextAnimation$()).pipe(switchMap((timeline) => {
        if (timeline && timeline instanceof gsap.core.Timeline) {
          tl.add(["introTextAnimation", timeline], "<")
          return of(timeline)
        } return of(null)
      })).subscribe((timeline) => { if (timeline) { tl.add(timeline, "<") } })
    }
    const startTime = tl.totalDuration() < 1 ? 0 : tl.totalDuration()
    const currentImage = this.layerNotEmpty() ? this.currentImage() : null

  // Handle existing image fade out
    if (currentImage) {
      tl.add(["currentImgFadeOut", gsap.to(currentImage, {...HERO_CONFIG.ANIMATION.EXIT})], "<")
    }
    tl.add(["updateText", () => this.updateTextElements(imageName)], startTime)
    .add(["addImage", () => parallaxLayer.append(img)], "<")
    .add(["imageFadeIn", gsap.to(img, { ...HERO_CONFIG.ANIMATION.ENTER })], startTime)

    prefersReducedMotion$.subscribe({
      next: (prefersReducedMotion) => {
        if (prefersReducedMotion) {
          this.state$.value.currentTimeline.kill()
          this.updateState({ currentTimeline: tl })
          return
        } // Skip animations if user prefers reduced motion
        else {
          const sizingData = this.testImageDimensions(img)
          const dimensions = {
            width: sizingData.boundingRect.width,
            height: sizingData.boundingRect.height
          }

          const viewportSize = {
            width: this.state$.value.viewportDimensions.width,
            height: this.state$.value.viewportDimensions.height
          }

          const focalPoints = this.getFocalPoints(img)

/**
 * const transforms = this.transformCalc.calculateAnimationTransforms(
 * dimensions,
 * viewportSize,
 * this.state$.value.headerHeight,
 * focalPoints
 * )
 */
          const waypoints = this.transformCalc.calculateAnimationWaypoints(
            dimensions,
            viewportSize,
            this.state$.value.headerHeight,
            [focalPoints.secondary, focalPoints.main]
          )

      // Apply transforms
          if (waypoints.length > 0) {
            waypoints.forEach((waypoint, index) => { tl.add([`waypoint${index.toString()}`, gsap.to(img, { x: waypoint.position.x, y: waypoint.position.y, duration: (waypoint.duration * HERO_CONFIG.ANIMATION.PAN.duration)})], ">") })
          }

          this.state$.value.currentTimeline.kill()
          this.updateState({ currentTimeline: tl })
        }
      }
    })
  }

  /**
   * Cycles to the next image in the hero image array.
   * @param recalcCurrent Whether to recalculate the current image.
   * @returns An observable that emits when the image has been cycled.
   */
  public cycleImage(recalcCurrent: boolean = false): Observable<void> {
    if (!parallaxLayer || this.state$.closed) {
      return EMPTY
    }

    const currentState = this.state$.value
    const { activeImageIndex } = currentState
    const notEmpty = this.layerNotEmpty()

    return defer(() => {
      const nextIndex = recalcCurrent ? activeImageIndex :
          (notEmpty ? (activeImageIndex + 1) % this.shuffledHeroes.length : 0)
      let nextImage = this.shuffledHeroes[nextIndex]
      let nextImageName = nextImage.imageName

      if (this.state$.value.preloadedImage) {
        this.updateState({ preloadedImage: false })
        nextImage = this.shuffledHeroes[0] || nextImage
        nextImageName = nextImage.imageName
      }

      const imageInDOM = notEmpty ? Array.from(parallaxLayer.childNodes).find((node) => (node as HTMLImageElement).srcset === nextImage.srcset) : null

      if (!recalcCurrent && notEmpty) {
        const currentImage = parallaxLayer!.children[0] as HTMLImageElement
        if (currentImage?.classList.contains(`hero-parallax__image--${nextImageName}`)) {
          return EMPTY
        }
      }

    const loadImage$ = this.loadedImages.has(nextImageName) ?
      of(this.loadedImages.get(nextImageName)!) :
      this.loadAndPrepareImage(nextImage).pipe(
        switchMap(img => {
          if (img instanceof HTMLImageElement) {
            if (!img.complete) {
              return new Promise((resolve) => {
                img.onload = () => resolve(img)
              })
            }
            this.loadedImages.set(nextImageName, img)
            this.trackImageMetadata(img)
            return of(img)
          } else { return throwError(() => new Error("Failed to load image")) }
        }),
        tap((img) => {
          this.updateState({ activeImageIndex: nextIndex })
          logger.info("Image loaded and prepared for", nextImageName)
          logger.info("Current image index:", nextIndex)
          logger.info(`type: ${typeof img}; Image name: ${nextImageName}; image URL: ${nextImage.src}; height: ${(img as HTMLImageElement).naturalHeight}; width: ${(img as HTMLImageElement).naturalWidth}`)
          }
        ))

    return loadImage$.pipe(
      switchMap(newImageElement => {
        this.createImageAnimation(newImageElement as HTMLImageElement, nextImageName)
        const timeline = this.state$.value.currentTimeline

        this.updateState({
          activeImageIndex: nextIndex,
          currentImage: newImageElement as HTMLImageElement,
          currentTimeline: timeline || gsap.timeline(),
        })
        if (imageInDOM && imageInDOM instanceof HTMLImageElement) {
          try { imageInDOM.remove() } catch (error) { logger.error("Error removing image:", error) }
        }
        timeline?.play()
        return of(void 0)
      }),
      catchError(error => {
        logger.error("Error cycling image:", error)
        return EMPTY})
    )
  })
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
  }

  /**
   * Disposes of the hero state manager, cleaning up resources and subscriptions.
   */
  public dispose(): void {
    this.loadedImages.forEach(img => this.cleanupImageResources(img))
    this.loadedImages.clear()
    this.state$.value.currentTimeline.kill()
    this.imageMetadata = new WeakMap()
    this.updateState({ status: 'paused'})
    this.state$.complete()
    this.pageSubscriptions.unsubscribe()
    this.homeWatcherSubscription.unsubscribe()
    HeroStateManager.instance = null
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
  let subscription = new Subscription()

  const state = cyclerRef.current?.heroState ? cyclerRef.current?.heroState.getCurrentState() : null
  // Clean up any existing cycler
  if (state && state.status !== 'cycling' && state.isAtHome) {
   subscription = cyclerRef.current.start()
   return {subscription.unsubscribe(),
    cyclerRef.current?.stop(),
    cyclerRef.current = null }
}

  // Create new cycler
  cyclerRef.current = HeroStateManager.createCycler()

  // Start cycling and store subscription
  subscription = cyclerRef.current.start()

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
export const shuffle$ = (): Observable<void> => {
  if (!parallaxLayer) {
    logger.warn("No parallax layer found")
    return EMPTY
  }

  initCycler()

  return interval(HERO_CONFIG.INTERVAL).pipe(
    withLatestFrom(cyclerRef.current?.heroState.canCycle$ || of(false)),
    filter(([_, canCycle]) => canCycle as boolean),
    switchMap(() => {
      if (!cyclerRef.current?.heroState) {
        return EMPTY
      }
      return from(cyclerRef.current.heroState.cycleImage()).pipe(
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
