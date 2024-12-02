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
import { blob } from "stream/consumers"

const HERO_CONFIG = {
  INTERVAL: 20000,
  ANIMATION: {
    ENTER: { ease: "power2.inOut", duration: 1.5 },
    EXIT: { ease: "power2.out", duration: 0.5 },
    PAN: {
      delay: 1.5,
      duration: 15,
      ease: "sine.out",
    }
  }
} as const

let customWindow = window as unknown as CustomWindow

const isPageVisible = () => !document.hidden
const isAtHome = () => {
  const loc = locationBehavior$.value
  return isHome(loc) && isOnSite(loc)
}
const leftPage = () => !isAtHome() && isOnSite(locationBehavior$.value)

const portraitMediaQuery = customWindow.matchMedia("(orientation: portrait)")
const parallaxLayer = customWindow.document.getElementById("parallax-hero-image-layer")

/**
 * Manages the state and behavior of a hero image cycling feature.
 *
 * The HeroStateManager class handles the visibility, home status, and image cycling logic for a hero component.
 * It utilizes RxJS for state management and subscriptions, and GSAP for animations. The class also manages
 * image loading and updates based on the current viewport size and orientation.
 */
class HeroStateManager {
  private state$ = new BehaviorSubject<HeroState>(this.getInitialState())

  private readonly subscriptionManager: SubscriptionManagerType = customWindow.subscriptionManager

  private readonly shuffledHeroes: HeroImage[]

  private loadedImages = new Map<string, HTMLImageElement>()

  private homePath: null | string = null

  private imageMetadata = new WeakMap<HTMLImageElement, ImageMetadata>()

  private hasPageSubscriptions = false

  private readonly optimalWidth$ = new BehaviorSubject<number>(this.getOptimalWidth())

  private readonly subscriptionWatcher = new Subscription()

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
   * Sets up a subscription watcher to manage page subscriptions.
   */
  private setupSubscriptionWatcher = () => {
    const subscriptionWatcher$ = merge(this.state$.pipe(map(state => state.isAtHome), filter(isAtHome => isAtHome)), locationBeacon$.pipe(filter(() => isAtHome()))).pipe(
      distinctUntilChanged(),
      filter(() => !this.hasPageSubscriptions),
      tap(() => {
        this.setupSubscriptions()
        this.hasPageSubscriptions = true
      })).subscribe()

    this.subscriptionManager.addSubscription(subscriptionWatcher$, true)
    this.subscriptionWatcher.add(subscriptionWatcher$)
  }

  /**
   * Creates an instance of HeroStateManager and initializes the shuffled heroes and subscriptions.
   */
  constructor() {
    this.shuffledHeroes = [...this.getHeroes()].sort(() => Math.random() - 0.5)
    this.setupSubscriptions()
    customWindow.addEventListener('unload', () => this.dispose())
    this.setHomePathAndObserver()
    this.setupSubscriptionWatcher()
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
      this.subscriptionManager.schedulePageCleanup(this.homePath || "/index.html")
      this.hasPageSubscriptions = false
    })

    const visibilitySub = fromEvent(document, 'visibilitychange').pipe(
      map(() => isPageVisible()),
      distinctUntilChanged(),
      tap(isVisible => this.updateState({ isVisible })),
    ).subscribe()

    const orientationSub = merge(
      fromEvent(customWindow, 'resize'),
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
    const headerRect = this.getHeaderRect()
    const headerHeight = headerRect.height
    setCssVariable("--header-height", `${headerHeight}px`)
    const effectiveViewHeight = customWindow.innerHeight - headerHeight
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
  static createCycler = (): ImageCycler => {
  const state = new HeroStateManager()

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

  // Combine both observables
  const combinedCycle$ = merge(loadImages$, cycle$)

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
    img.loading = parallaxLayer?.getElementsByTagName('img').length !== 0 ? "lazy" : "eager"
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
    const { naturalWidth, naturalHeight } = img
    logger.info("Testing image dimensions for", img, "Natural dimensions:", { naturalWidth, naturalHeight })
    img.style.opacity = "0"
    parallaxLayer.append(img)
    const emplacedElement = parallaxLayer.lastElementChild
    if (!emplacedElement) {
      throw new Error("Emplaced element not found")
    }
    // shell game to avoid garbage collector
    const elementRect = emplacedElement.getBoundingClientRect()
    const elementStyle = JSON.stringify(window.getComputedStyle(emplacedElement))
    const rectJSON = JSON.stringify(elementRect)
    logger.info("Bounding rect:", rectJSON, "Element style:", elementStyle)
    parallaxLayer.removeChild(emplacedElement)
    const boundingRect = JSON.parse(rectJSON)
    const processedStyle = JSON.parse(elementStyle)
    logger.info("Processed style:", processedStyle)
    logger.info("processed Bounding rect:", boundingRect)
    img.style.opacity = ""
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

  private computeExcessDimensions(value: number, boundingLine: number): number {
    logger.info("Computing excess dimensions for value:", value, "Bounding line:", boundingLine)
    if (boundingLine > 0) {
      return value > boundingLine ? value - boundingLine : boundingLine - value
    }
    return Math.abs(value)
  }

  private computeTranslationDimensions(img: HTMLImageElement): TranslatableAreas {
    const getOverflowComputed = (overflowRects: OverflowRects, overflow: OverflowComputed): [OverflowRects, OverflowComputed] => {
      overflow.topIsOffset = false
      overflow.noYoverflow = false
      if (overflow.top > 0 && overflow.bottom === 0) {
        if (imgHeight > visibleRect.height) {
          const offset = (imgHeight - visibleRect.height) / 2
          overflow.bottom = offset
          overflow.top = offset
          overflow.topIsOffset = true
        } else {
          overflowRects.top.y = visibleRect.top - overflow.top
          overflow.top = 0
          overflow.bottom = 0
          overflowRects.bottom.y = visibleRect.bottom + overflow.bottom
          overflow.noYoverflow = true
        }
      }
      logger.info("Overflow computed:", overflow)
      return [overflowRects, overflow]
    }
    const getTranslatability = (overflow: OverflowComputed) => {
    return {
      top: overflow.top > 0,
      bottom: overflow.bottom > 0,
      left: overflow.left > 0,
      right: overflow.right > 0
    }
  }

    const getComputedImageDimensions = (imgWidth: number, imgHeight: number) => {
      const aspectRatio = imgWidth / imgHeight
      const orientation = (aspectRatio > 1 ? 'landscape' : aspectRatio < 1 ? 'portrait' : 'square') as 'portrait' | 'landscape' | 'square'
      return { width: imgWidth, height: imgHeight, aspectRatio, orientation }
    }

    const getExcessDimensions = (headerRect: DOMRect, boundingRect: DOMRect) => {
      return {
        top: this.computeExcessDimensions(boundingRect.top, headerRect.bottom),
        left: this.computeExcessDimensions(boundingRect.left, 0),
        bottom: isImageBottomVisible ? 0 : this.computeExcessDimensions(boundingRect.bottom, customWindow.innerHeight),
        right: this.computeExcessDimensions(boundingRect.right, customWindow.innerWidth)
      }
    }

    const createDOMRect = (x: number, y: number, width: number, height: number) => { return new DOMRect(x, y, width, height) }

    const getInitialOverflowRects = (visibleRect: DOMRect, excesses: OverflowComputed, imageTop: number) => {
    return {
      yTopRect: createDOMRect(0, excesses.top > 0 ? Math.min(visibleRect.top - excesses.top, imageTop) : visibleRect.top, visibleRect.width, excesses.top),
      yBottomRect: createDOMRect(0, excesses.bottom ? visibleRect.bottom + excesses.bottom : 0, customWindow.innerWidth, excesses.bottom),
      xLeftRect: createDOMRect(-excesses.left, visibleRect.top, Math.abs(excesses.left), visibleRect.height),
      xRightRect: createDOMRect(visibleRect.right, visibleRect.top, excesses.right, visibleRect.height)
    }
  }

    const { computedStyle, naturalWidth, naturalHeight, boundingRect } = this.testImageDimensions(img)

    const containerRect = img.parentElement?.getBoundingClientRect() || document.body.getBoundingClientRect()

    const headerRect = this.getHeaderRect()

    const isImageBottomVisible = boundingRect.bottom <= (customWindow.innerHeight - boundingRect.top)

    // Calculate scaled image dimensions
    const scale = Number(computedStyle.scale) || 1
    const imgWidth = Math.max(naturalWidth * scale, boundingRect.width)
    const imgHeight = Math.max(naturalHeight * scale, boundingRect.height)
    const visibleRect = new DOMRect(0, headerRect.bottom, customWindow.innerWidth, customWindow.innerHeight - headerRect.bottom)

    const { top: excessTop, bottom: excessBottom, left: excessLeft, right: excessRight } = getExcessDimensions(headerRect, boundingRect)

    const { yTopRect, yBottomRect, xLeftRect, xRightRect } = getInitialOverflowRects(visibleRect, { top: excessTop, bottom: excessBottom, left: excessLeft, right: excessRight }, boundingRect.top)

    const [overflowRects, overflow] = getOverflowComputed({ top: yTopRect, right: xRightRect, bottom: yBottomRect, left: xLeftRect }, { top: excessTop, right: excessRight, bottom: excessBottom, left: excessLeft })
    const translatable = getTranslatability(overflow)

    const computedImageDimensions = getComputedImageDimensions(imgWidth, imgHeight)
    setCssVariable("--header-height", `${visibleRect.top}px`)
    setCssVariable("--fade-height", `${visibleRect.height}px`)
    return { overflowRects, overflow, visibleRect, containerRect, imageDimensions: { computedStyle, naturalWidth, naturalHeight, boundingRect }, computedImageDimensions, translatable }
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
    const tl = gsap.timeline({ repeat: 0, paused: true })
    const { overflowRects, overflow, visibleRect, containerRect, imageDimensions, computedImageDimensions, translatable} = this.computeTranslationDimensions(img)
    logger.info("Computed translation dimensions:", { overflowRects, overflow, visibleRect, containerRect, imageDimensions, computedImageDimensions, translatable })
    if (Object.values(translatable).every(value => value === false)) { return undefined }

    // Reposition to balance overflow or minimize bottom gap
    if (overflow.topIsOffset) {
      const offset = overflow.top
      tl.add(["yReposition", gsap.set(img, { y: visibleRect.top - offset })], "<")
    } else if (overflow.noYoverflow) {
      tl.add(["xReposition", gsap.set(img, { y: visibleRect.top })], "<")
    }

  // Calculate translation bounds based on overflow
    const bounds: TranslationBounds = {
      x: {
        min: -Math.abs(overflowRects.left.width),
        max: Math.abs(overflowRects.right.width)
      },
      y: {
        min: overflow.topIsOffset ? -overflow.top : 0,
        max: Math.abs(overflowRects.bottom.height)
      }
    }

  // Generate weighted random position
    const getWeightedPosition = (
    target: number,
    bounds: {min: number, max: number},
    variance: number = 0.2
    ): number => {
    const range = bounds.max - bounds.min
    const targetPos = gsap.utils.mapRange(0, 100, bounds.min, bounds.max, target)
      const randomOffset = (Math.random() - 0.5) * 2 * variance * range
    logger.info("Target position:", targetPos, "Random offset:", randomOffset)
    return gsap.utils.clamp(bounds.min, bounds.max, targetPos + randomOffset)
  }

  // Get focal points
    const focalX = Number(img.dataset.focusMainX) * 100 || 50
    const focalY = Number(img.dataset.focusMainY) * 100 || 50
    const startX = Number(img.dataset.focusSecondaryX) * 100 || 50
    const startY = Number(img.dataset.focusSecondaryY) * 100 || 50

  // Calculate positions with different variances
    const startPos = {
      x: getWeightedPosition(startX, bounds.x, 0.3),
      y: overflow.noYoverflow? visibleRect.top : getWeightedPosition(startY, bounds.y, 0.3)
    }

    const endPos = {
      x: getWeightedPosition(focalX, bounds.x, 0.1),
      y: overflow.noYoverflow ? visibleRect.top : getWeightedPosition(focalY, bounds.y, 0.1)
    }
    logger.info("Start position:", startPos, "End position:", endPos)

    const panVars = HERO_CONFIG.ANIMATION.PAN

  // Create pan animation
    tl.add(["panEffect", gsap.fromTo(
      img,
    { x: startPos.x, y: startPos.y },
    {
      x: endPos.x,
      y: endPos.y,
      ...panVars,
    }
    )], ">")

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

    const timeline = gsap.timeline({
      paused: true, repeat: 0, onComplete: () => {
        logger.info("=== Timeline completed for", imgName)}, onStart: () => { logger.info("Timeline started for ", imgName) 
        logger.info("Timeline duration:", timeline.duration())
      }
    })
    const currentImage = parallaxLayer.children?.[0] as HTMLImageElement | null
    const startUpActions = () => {
      const currentAnimation = this.state$.value.currentTimeline || null
      // remove the image if already in the DOM
      if (parallaxLayer.childNodes.length > 0 && Array.from(parallaxLayer.childNodes).find(node => node === img)) {
        parallaxLayer.removeChild(img)
      }
      // Add the image to the DOM; only first-child is visible in CSS, so no need to remove others
      parallaxLayer.prepend(img)
      // Ensure image is loaded before setting height
      this.updateTextElements(imgName)
      if (img.naturalHeight) {
        this.setParallaxHeight(img.naturalHeight)
      } else {
        img.onload = () => this.setParallaxHeight(img.naturalHeight)
      }
      if (currentAnimation.isActive()) {
        currentAnimation.kill()
      }
    }
    // Add startup settings to timeline first; triggers with animation
    timeline.add(["startupActions", startUpActions], 0)
    timeline.eventCallback("onStart", () => {
      logger.info("Startup actions completed for ", imgName)
      logger.info("Updating Hero state with new image:", imgName)
      logger.info("Current image index:", index)
    })
    // Add enter animation for new image
    timeline.add(["imageEnter", gsap.to(img, HERO_CONFIG.ANIMATION.ENTER)], "<")
    // Add exit animation for current image if it exists
    if (currentImage) {
      timeline.add(["imageExit", gsap.to(currentImage, HERO_CONFIG.ANIMATION.EXIT)], "<")
    }
    // Add pan animation if user isn't reducing motion and image is loaded
    if (!prefersReducedMotion()) {
      logger.info("Creating and adding pan animation for ", imgName)
      const panAnimation = this.createPanAnimation(img)
      if (panAnimation && panAnimation instanceof gsap.core.Timeline) {
        timeline.add(panAnimation)
      } else {
        logger.info("User prefers reduced motion; skipping pan animation for ", imgName)
      }
    }
      // update state with new timeline and smooth out timeline
    timeline.smoothChildTiming = true
    return timeline
  }

  /**
   * Cycles to the next image in the hero image array.
   * @returns An observable that emits when the image has been cycled.
   */
  public cycleImage() {
    if (!parallaxLayer || this.state$.closed) {
      return EMPTY
    }

    const currentState = this.state$.value

    return new Observable<void>(subscriber => {
    try {
      const { activeImageIndex } = currentState
      const nextIndex = parallaxLayer!.childElementCount > 0 ?
          (activeImageIndex + 1) % this.shuffledHeroes.length : 0
      const nextImage = this.shuffledHeroes[nextIndex]
      const nextImageName = nextImage.imageName

      // Check if cycling to same image
      const currentImage = parallaxLayer!.children[0] as HTMLImageElement
      if (currentImage?.classList.contains(`hero-parallax__image--${nextImageName}`)) {
        subscriber.complete()
        return
      }

      // Load or retrieve image
      const loadImage$ = this.loadedImages.has(nextImageName) ?
        of(this.loadedImages.get(nextImageName)!) :
        this.loadAndPrepareImage(nextImage).pipe(
          tap(img => this.loadedImages.set(nextImageName, img))
        )

      loadImage$.subscribe({
        next: (newImageElement) => {
          const timeline = this.setTimelineForImage(newImageElement, nextImageName, nextIndex)

          if (currentState.currentTimeline?.isActive()) {
            currentState.currentTimeline.progress(1)
          }

          this.updateState({
            activeImageIndex: nextIndex,
            currentImage: newImageElement,
            currentTimeline: timeline
          })

          timeline.play()
          subscriber.next()
          subscriber.complete()
        },
        error: (error) => {
          logger.error("Error cycling image:", error)
          subscriber.error(error)
        }
      })
    } catch (error) {
      logger.error("Error in cycleImage:", error)
      subscriber.error(error)
    }
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
    this.state$.complete()
    this.loadedImages.forEach(img => this.cleanupImageResources(img))
    this.loadedImages.clear()
    this.state$?.value.currentTimeline?.kill()
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

export const debugState = () => cyclerRef.current?.heroState.getCurrentState()
export { shuffle$ }
