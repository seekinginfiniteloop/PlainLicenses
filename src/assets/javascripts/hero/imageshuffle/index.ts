import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  Subscription,
  from,
  fromEvent,
  fromEventPattern,
  iif,
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
  first,
  map,
  mergeMap,
  skipWhile,
  takeUntil,
  tap,
  toArray,
  withLatestFrom
} from "rxjs/operators"

import { isElementVisible, isHome, isOnSite, setCssVariable, watchLocationChange } from "~/utils"
import { getAsset } from "~/cache"
import { HeroImage, heroImages } from "~/hero/imageshuffle/data"
import { logger } from "~/log"

const location$ = new BehaviorSubject<URL>(new URL(window.location.href))

/**
 * Gets the current location
 * @returns the current location URL
 */
function getCurrentLocation() {
  return location$.getValue()
}

// Image state management
type HeroState = {
  status: 'loading' | 'ready' | 'cycling' | 'paused' | 'stopped'
  isVisible: boolean
  isAtHome: boolean
  activeImageIndex: number
  orientation: 'portrait' | 'landscape'
  optimalWidth: number
}

/**
 * Calculates optimal image width based on screen dimensions
 * @returns Optimal width of image based on viewport
 */
const getOptimalWidth = () => {
  if (!window) {
    return 1280
  }
  const screenWidth = Math.max(window.innerWidth, window.innerHeight)
  return screenWidth <= 1280 ? 1280
    : screenWidth <= 1920 ? 1920
    : screenWidth <= 2560 ? 2560
    : 2840
}

// Configuration and DOM references
const CONFIG = { INTERVAL_TIME: 25000 } as const
const isPageVisible = () => !document.hidden
const isAtHome = () => {
  const loc = getCurrentLocation()
  return isHome(loc) && isOnSite(loc)
}
const portraitMediaQuery = window.matchMedia("(orientation: portrait)")
const parallaxLayer = document.getElementById("parallax-hero-image-layer")
const optimalWidth$ = new BehaviorSubject<number>(getOptimalWidth())

const createHeroStateManager = () => {
  const initialState: HeroState = {
    status: 'loading',
    isVisible: isPageVisible(),
    isAtHome: true,
    activeImageIndex: 0,
    orientation: portraitMediaQuery.matches ? 'portrait' : 'landscape',
    optimalWidth: optimalWidth$.value
  }

  const state$ = new BehaviorSubject<HeroState>(initialState)
  const cleanup = new Subject<void>()

  const canCycle$ = state$.pipe(
    map(state =>
      state.isVisible &&
      state.isAtHome &&
      state.status === 'cycling'
    ),
    distinctUntilChanged(),
    shareReplay(1)
  )

  return {
    state$,
    canCycle$,
    cleanup$: cleanup.asObservable(),

    updateState: (updates: Partial<HeroState>) => {
      if (state$.closed) {
        return
      }
      state$.next({ ...state$.value, ...updates })
    },

    cleanup: () => {
      cleanup.next()
      cleanup.complete()
      state$.complete()
    }
  }
}

/**
 * Updates image sources based on optimal width
 * @param images the hero images
 * @param optimalWidth the optimal width for the images
 */
const updateImageSources = (images: HTMLImageElement[], optimalWidth: number) => {
  images.forEach(image => {
    const imageName = image.classList[1].split("--")[1]
    const foundImage = retrieveImage(imageName)
    if (foundImage) {
      image.src = foundImage.widths[optimalWidth]
    }
  })
}

/**
 * Retrieves image settings by name
 * @param imageName the name ... of... the image -- what else?
 * @returns the image settings
 */
const retrieveImage = (imageName: string): HeroImage | undefined => {
  return heroImages.find(image => image.imageName === imageName)
}

/**
 * Gets all heroes with optimal widths
 * @returns Array of hero images
 */
const getHeroes = (): HeroImage[] => {
  const optimalWidth = getOptimalWidth()
  return heroImages.map(image => ({ ...image, src: image.widths[optimalWidth] }))
}

const allHeroes = getHeroes()

/**
 * WeakMap to store image metadata without preventing garbage collection
 */
const imageMetadata = new WeakMap<HTMLImageElement, {
  loadTime: number
  displayCount: number
  width: number
}>()

/**
 * Loads an image from URL
 * @param imageUrl the image's url (blob)
 * @returns Observable of the image blob
 */
const loadImage = (imageUrl: string): Observable<Blob> => {
  return getAsset(imageUrl).pipe(
    mergeMap(response => from(response.blob())),
    catchError(error => {
      logger.error("Error loading image:", error)
      return throwError(() => new Error("Failed to load image"))
    })
  )
}

/**
 * Updates hero text elements with image specific classes (to shift colors etc.)
 * @param imgName The image's name
 */
const setText = async (imgName: string) => {
  const headerEl = document.getElementById("CTA_header")
  const textEl = document.getElementById("CTA_paragraph")
  headerEl?.setAttribute("class", `hero-parallax__image--${imgName}`)
  textEl?.setAttribute("class", `hero-parallax__image--${imgName}`)
}

/**
 * Cleans up image resources to prevent memory leaks
 * @param image the image element
 */
const cleanupImageResources = (image: HTMLImageElement) => {
  const currentSrc = image.src
  if (currentSrc.startsWith('blob:')) {
    URL.revokeObjectURL(currentSrc)
  }
}

/**
 * Fetches and sets up an image with proper resource management
 * @param imgSettings the HeroImage settings
 * @returns EMPTY if no source is available else observable of Void
 */
const fetchAndSetImage = (imgSettings: HeroImage): Observable<HTMLImageElement> => {
  const { imageName, srcset, src } = imgSettings
  if (!src) {
    return EMPTY
  }

  return loadImage(src).pipe(
    mergeMap(imageBlob => {
      const img = new Image()
      const imageUrl = URL.createObjectURL(imageBlob)
      img.src = src
      img.srcset = srcset
      img.sizes = "(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px"
      img.alt = ""
      img.classList.add("hero-parallax__image", `hero-parallax__image--${imageName}`)
      img.draggable = false
      img.loading = "eager"
      void setText(imageName)

      return from(new Promise<void>(resolve => {
        img.onload = () => {
          URL.revokeObjectURL(imageUrl)
          imageMetadata.set(img, {
            loadTime: Date.now(),
            displayCount: 0,
            width: img.width
          })
          resolve()
        }
      })).pipe(
        tap(() => parallaxLayer?.prepend(img)),
        map(() => img)
      )
    }),
    catchError(error => {
      logger.error("Error in fetchAndSetImage:", error)
      return EMPTY
    })
  )
}

/**
 * Creates an observable for orientation changes
 * @param mediaQuery the media query results
 * @returns Observable of boolean
 */
const createOrientationObservable = (mediaQuery: MediaQueryList): Observable<boolean> => {
  return fromEventPattern<boolean>(
    handler => mediaQuery.addEventListener("change", handler),
    handler => mediaQuery.removeEventListener("change", handler),
    (event: MediaQueryListEvent) => event.matches
  )
}

const shuffledHeroes = [...allHeroes].sort(() => Math.random() - 0.5)

/**
 * Memory-efficient image cycling with proper cleanup
 * @param parallaxLayer the parallax layer element, which is the parent of the hero images
 * @returns Object with start, stop and debug methods
 */
const createImageCycler = (parallaxLayer: HTMLElement) => {
  const stateManager = createHeroStateManager()
  const { state$, canCycle$, cleanup$, updateState } = stateManager

  const loadImages$ = from(shuffledHeroes).pipe(
    mergeMap(image => fetchAndSetImage(image)),
    takeUntil(cleanup$),
    // When all images are loaded, check if we need size updates
    toArray(),
    tap((loadedImages) => {
      const currentOptimalWidth = getOptimalWidth()
      if (currentOptimalWidth !== state$.value.optimalWidth) {
        updateState({ optimalWidth: currentOptimalWidth })
        updateImageSources(loadedImages, currentOptimalWidth)
      }
    })
  )

  const loadFirstImage$ = fetchAndSetImage(shuffledHeroes[0]).pipe(
    tap(() => updateState({ status: 'cycling' }))
  )

  const cycle$ = interval(CONFIG.INTERVAL_TIME).pipe(
    withLatestFrom(canCycle$, state$),
    filter(([_, canCycle]) => canCycle),
    mergeMap(([_, __, state]) => {
      const nextIndex = (state.activeImageIndex + 1) % shuffledHeroes.length
      const nextImage = shuffledHeroes[nextIndex]
      return fetchAndSetImage(nextImage).pipe(
        tap(() => {
          const firstImage = parallaxLayer.firstElementChild as HTMLElement
          parallaxLayer.appendChild(firstImage)
          updateState({ activeImageIndex: nextIndex })
          void setText(nextImage.imageName)
        })
      )
    }),
    takeUntil(cleanup$)
  )

  // Visibility tracking
  const visibility$ = fromEvent(document, 'visibilitychange').pipe(
    tap(() => {
      updateState({
        isVisible: isPageVisible(),
        status: isPageVisible() ? 'ready' : 'paused'
      })
    }),
    takeUntil(cleanup$)
  )

  // Location tracking
  const locationWatcher$ = watchLocationChange((url) => isHome(url) && isOnSite(url)).pipe(
    tap(_url => {
      updateState({
        isAtHome: isAtHome(),
        status: isAtHome() ? 'ready' : 'stopped'
      })
    }),
    takeUntil(cleanup$)
  )


  /**
   * Orientation observable with state management
   * @param stateManager the state manager object
   * @returns Observable of void
   */
  const createOrientationHandler = (stateManager: ReturnType<typeof createHeroStateManager>) => {
    // Combine orientation changes and resize events
    const orientationChange$ = createOrientationObservable(portraitMediaQuery)
    const resize$ = fromEvent(window, 'resize')

    // Merge both events into a single stream of viewport changes
    return merge(orientationChange$, resize$).pipe(
      // Debounce to avoid too many rapid changes
      debounceTime(100),
      skipWhile(() => !isPageVisible() || !isElementVisible(parallaxLayer as Element)),
      map(() => getOptimalWidth()),
      distinctUntilChanged(),
      tap(optimalWidth => {
        stateManager.updateState({
          orientation: portraitMediaQuery.matches ? 'portrait' : 'landscape',
          optimalWidth
        })
        const imageLayers = Array.from(parallaxLayer?.getElementsByTagName("img") || [])
        updateImageSources(imageLayers, optimalWidth)
      }),
      takeUntil(stateManager.cleanup$),
      catchError(error => {
        logger.error("Error in viewport change handler:", error)
        return EMPTY
      })
    )
  }

  return {
    start: () => {
      const subscription = new Subscription()

      // Add all subscriptions
      subscription.add(visibility$.subscribe())
      subscription.add(locationWatcher$.subscribe())
      subscription.add(createOrientationHandler(stateManager).subscribe())

      // Start loading images
      subscription.add(
        loadImages$.pipe(
          tap(() => {
            updateState({ status: 'cycling' })
            subscription.add(cycle$.subscribe())
          })
        ).subscribe()
      )

      // Memory leak prevention
      subscription.add(() => {
        const images = Array.from(parallaxLayer.getElementsByTagName('img'))
        images.forEach(cleanupImageResources)
      })

      // Start the cycler after the first image is loaded
      subscription.add(loadFirstImage$.subscribe(() => {
        subscription.add(cycle$.subscribe())
      }))

      return subscription
    },
    stop: () => {
      stateManager.cleanup()
    },
    stateManager,  // Expose stateManager for height observable
    debug: {
      getState: () => state$.value,
      getMetadata: (img: HTMLImageElement) => imageMetadata.get(img)
    }
  }
}

/**
 * Gets current image from parallax layer
 * @returns HTMLImageElement or undefined
 */
const getImage = () => {
  const images = parallaxLayer?.getElementsByTagName("img")
  if (images && images.length > 0) {
    return images[0]
  }
  return undefined
}

/**
 * Sets parallax layer height and fade based on image height
 * @param height image's height
 */
function setParallaxHeight(height: number) {
  const headerHeight = document.getElementById("header-target")?.clientHeight || 95
  setCssVariable("--header-height", `${headerHeight}px`)
  const effectiveViewHeight = window.innerHeight - headerHeight
  const maxFade = effectiveViewHeight * 1.4

  if (!parallaxLayer || height <= 0) {
    const currentValue = document.documentElement.style.getPropertyValue("--fade-height")
    setCssVariable("--fade-height", Math.max(Number(currentValue), effectiveViewHeight).toString())
  }

  setCssVariable("--fade-height", `${Math.min(height * 1.2, maxFade, effectiveViewHeight)}px`)

  const parallaxHeight = height < effectiveViewHeight
    ? effectiveViewHeight
    : Math.min(height * 1.2, maxFade)

  setCssVariable("--parallax-height", `${parallaxHeight}px`)
}

// Keep reference to current cycler for cleanup
const cyclerRef = {
  current: null as ReturnType<typeof createImageCycler> | null
}

// create an observable for height changes that combines image cycling and size changes
const createHeightObservable = (stateManager: ReturnType<typeof createHeroStateManager>) => {
  // Get height whenever first image changes or viewport changes
  const imageChanges$ = stateManager.state$.pipe(
    map(() => getImage()),
    filter((img): img is HTMLImageElement => img !== null && img instanceof HTMLImageElement),
    map(img => img.height || window.innerHeight)
  )

  const viewportChanges$ = merge(
    fromEvent(window, 'resize'),
    createOrientationObservable(portraitMediaQuery)
  ).pipe(
    debounceTime(100),
    map(() => {
      const img = getImage()
      return img?.height || window.innerHeight
    }),
    filter(height => typeof height === 'number' && height > 0 && !Number.isNaN(height))
  )

  return merge(imageChanges$, viewportChanges$).pipe(
    distinctUntilChanged(),
    filter(() => isPageVisible() && isElementVisible(parallaxLayer as Element)),
    tap(height => setParallaxHeight(height)),
    catchError(error => {
      logger.error("Error adjusting height:", error)
      return EMPTY
    }),
    takeUntil(stateManager.cleanup$)
  )
}

/**
 * Initializes the hero image shuffling
 * @returns Observable of cleanup trigger
 */
export function shuffle$() {
  if (!parallaxLayer) {
    return EMPTY
  }

  const cycler = createImageCycler(parallaxLayer)
  cyclerRef.current = cycler
  const subscription = cycler.start()

  // Handle height adjustments
  subscription.add(
    createHeightObservable(cycler.stateManager).subscribe()
  )

  const stopCycler$ = () => {
    cyclerRef.current = null
    subscription.unsubscribe()
    const images = parallaxLayer.getElementsByTagName('img')
    Array.from(images).forEach(img => {
      cleanupImageResources(img as HTMLImageElement)
      img.innerHTML = ''
    })
    parallaxLayer.innerHTML = ''
    return of(true)
  }

  const weCanSeeIt$ = merge(
    fromEvent(window, 'focus').pipe(filter(() => isElementVisible(parallaxLayer as Element))),
    fromEvent(window, 'visibilitychange').pipe(filter(() => isElementVisible(parallaxLayer as Element))),
    of(isElementVisible(parallaxLayer as Element))
  )

  const weAreBack$ = watchLocationChange(url => isHome(url) && isOnSite(url))

  // Cleanup on navigation away

  watchLocationChange(url => !isHome(url)).pipe(
    first(),
    tap((url) => {
      if (parallaxLayer && !parallaxLayer.children.length && isOnSite(url)) {
        fetchAndSetImage(shuffledHeroes[0]).subscribe() // load an image to have one ready on navigation back
      } else {
        cycler.stop()
      }
    }),
    mergeMap((url) => iif(
      () => isOnSite(url),
      merge(weCanSeeIt$, weAreBack$).pipe(
        tap(() => {
          cyclerRef.current = cycler
          subscription.add(cycler.start())
        })
      ),
      of(stopCycler$)
    ))
  )
}
