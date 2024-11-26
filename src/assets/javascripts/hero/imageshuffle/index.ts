import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  Subscription,
  from,
  fromEvent,
  fromEventPattern,
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
  skipWhile,
  switchMap,
  takeUntil,
  tap,
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

/**
 * Calculates optimal image width based on screen dimensions
 * @returns Optimal width of image based on viewport
 */
const getOptimalWidth = () => {
  const screenWidth = Math.max(window.innerWidth, window.innerHeight)
  return screenWidth <= 1280 ? 1280
    : screenWidth <= 1920 ? 1920
    : screenWidth <= 2560 ? 2560
    : 2840
}

// Configuration and DOM references
const CONFIG = { INTERVAL_TIME: 25000, CLEANUP_DELAY: 60000 } as const
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
    optimalWidth: optimalWidth$.value,
    lastActiveTime: Date.now()
  }

  const state$ = new BehaviorSubject<HeroState>(initialState)
  const cleanup = new Subject<void>()
  let cleanupTimeout: number | null = null

  const canCycle$ = state$.pipe(
    map(state =>
      state.isVisible &&
      state.isAtHome &&
      state.status === 'cycling'
    ),
    distinctUntilChanged(),
    shareReplay(1)
  )

  const scheduleCleanup = () => {
    if (cleanupTimeout) {
      window.clearTimeout(cleanupTimeout)
    }
    cleanupTimeout = window.setTimeout(() => {
      if (!state$.value.isVisible && !state$.value.isAtHome) {
        cleanup.next()
        cleanup.complete()
      }
    }, CONFIG.CLEANUP_DELAY)
  }

  return {
    state$,
    canCycle$,
    cleanup$: cleanup.asObservable(),

    updateState: (updates: Partial<HeroState>) => {
      if (state$.closed) {
        return
      }

      const newState = { ...state$.value, ...updates }

      // Update last active time when becoming visible/at home
      if (updates.isVisible || updates.isAtHome) {
        newState.lastActiveTime = Date.now()
      }

      // Handle visibility changes
      if (updates.isVisible === false || updates.isAtHome === false) {
        scheduleCleanup()
      } else if (cleanupTimeout) {
        window.clearTimeout(cleanupTimeout)
        cleanupTimeout = null
      }

      state$.next(newState)
    },

    cleanup: () => {
      if (cleanupTimeout) {
        window.clearTimeout(cleanupTimeout)
      }
      cleanup.next()
      cleanup.complete()
      state$.complete()
    }
  }
}

const stateManager = createHeroStateManager()

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
 * @param imageName the name of the image
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
  return getAsset(imageUrl, true).pipe(
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
    switchMap(_imageBlob => {
      const img = new Image()
      const loading = parallaxLayer?.getElementsByTagName('img').length !== 0 ? "lazy" : "eager"
      img.src = src
      img.srcset = srcset
      img.sizes = "(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px"
      img.alt = ""
      img.classList.add("hero-parallax__image", `hero-parallax__image--${imageName}`)
      img.draggable = false
      img.loading = loading
      void setText(imageName)

      return of(img).pipe(
        tap(() => {
          imageMetadata.set(img, {
            loadTime: Date.now(),
            displayCount: 0,
            width: img.width
          })
          parallaxLayer?.prepend(img)
        }),
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

const createVisibilityAndLocationObservable = () => {
  return merge(
    fromEvent(document, 'visibilitychange').pipe(
      tap(() => {
        stateManager.updateState({
          isVisible: isPageVisible(),
          status: isPageVisible() ? 'ready' : 'paused'
        })
      })
    ),
    watchLocationChange(url => isHome(url) && isOnSite(url)).pipe(
      tap(() => {
        stateManager.updateState({
          isAtHome: isAtHome(),
          status: isAtHome() ? 'ready' : 'stopped'
        })
      })
    )
  ).pipe(takeUntil(stateManager.cleanup$))
}

const createOrientationHandler = () => {
  const orientationChange$ = createOrientationObservable(portraitMediaQuery)
  const resize$ = fromEvent(window, 'resize')

  return merge(orientationChange$, resize$).pipe(
    debounceTime(100),
    skipWhile(() => !isPageVisible() || !isElementVisible(parallaxLayer as Element)),
    map(getOptimalWidth),
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

const shuffledHeroes = [...allHeroes].sort(() => Math.random() - 0.5)

const createImageCycler = (parallaxLayer: HTMLElement): ImageCycler => {
  const { state$, canCycle$, cleanup$, updateState } = stateManager
  const loadedImages = new Set<string>()
  // Load initial image
  const loadImages$ = from([shuffledHeroes[0]]).pipe(
    mergeMap(fetchAndSetImage),
    takeUntil(cleanup$),
    tap(_image => {
      loadedImages.add(shuffledHeroes[0].imageName)
      updateState({
        activeImageIndex: 0,
        status: 'cycling'
      })
    }),
    catchError(error => {
      logger.error("Failed to load initial image:", error)
      updateState({ status: 'error' })
      return EMPTY
    })
  )

  const cycle$ = interval(CONFIG.INTERVAL_TIME).pipe(
    withLatestFrom(canCycle$, state$),
    filter(([_, canCycle]) => canCycle),
    mergeMap(([_, __, state]) => {
      updateState({ status: 'cycling' })
      const nextIndex = (state.activeImageIndex + 1) % shuffledHeroes.length
      const nextImage = shuffledHeroes[nextIndex]
      // If not all images loaded yet, fetch next
      if (!loadedImages.has(nextImage.imageName)) {
        return fetchAndSetImage(nextImage).pipe(
          tap(() => {
            loadedImages.add(nextImage.imageName)
            updateState({ activeImageIndex: nextIndex })
            void setText(nextImage.imageName)
          }),
          catchError(error => {
            logger.error(`Failed to load image ${nextImage.imageName}:`, error)
            return EMPTY
          })
        )
      } else {return of(undefined)}
    }),
    takeUntil(cleanup$)
  )

  return {
    loadImages$,
    cycle$,
    stateManager,
    start: () => {
      const subscription = new Subscription()

      // Add subscriptions
      subscription.add(createVisibilityAndLocationObservable().subscribe())
      subscription.add(createOrientationHandler().subscribe())

      subscription.add(
        loadImages$.pipe(
          tap(() => {
            stateManager.updateState({ status: 'cycling' })
            subscription.add(cycle$.subscribe())
          })
        ).subscribe()
      )
      // Add cleanup
      subscription.add(() => {
        const images = parallaxLayer?.getElementsByTagName('img')
        if (images) {
          Array.from(images).forEach(cleanupImageResources)
        }
      })

      return subscription
    },
    stop: () => {
      stateManager.cleanup()
    },
    debug: {
      getState: () => stateManager.state$.value,
      getMetadata: (img: HTMLImageElement) => imageMetadata.get(img)
    }
  }
}

const cyclerRef = { current: null as ImageCycler | null }

// Initialize cycler
const initCycler = () => {
  if (!parallaxLayer) {
    return
  }

  if (cyclerRef.current?.stop) {
    cyclerRef.current.stop()
  }

  cyclerRef.current = createImageCycler(parallaxLayer)
  const subscription = cyclerRef.current.start()

  return () => {
    subscription?.unsubscribe()
    cyclerRef.current?.stop()
    cyclerRef.current = null
  }
}

// Start the cycler
const cleanup = initCycler()

// Export for external use
export const stopCycler = () => {
  cleanup?.()
}

export const debugState = () => {
  return cyclerRef.current?.stateManager.state$.value
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

const createHeightObservable = (stateManager: ReturnType<typeof createHeroStateManager>) => {
  // Get height whenever first image changes or viewport changes
  const imageChanges$ = stateManager.state$.pipe(
    map(() => getImage()),
    filter((img): img is HTMLImageElement => img !== null && img instanceof HTMLImageElement),
    map(img => img.height),
    filter(height => typeof height === 'number' && height > 0 && !Number.isNaN(height)),
    shareReplay(1)
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
    filter(height => typeof height === 'number' && height > 0 && !Number.isNaN(height)), shareReplay(1))

  return merge(imageChanges$, viewportChanges$).pipe(
    distinctUntilChanged(),
    filter(() => isPageVisible()),
    tap(height => setParallaxHeight(height)),
    catchError(error => {
      logger.error("Error adjusting height:", error)
      return EMPTY
    }),
    takeUntil(stateManager.cleanup$)
  )
}

export const shuffle$ = () => {
  if (!parallaxLayer) {
    return EMPTY
  }

  const cycler = cyclerRef.current
  if (!cycler) {
    return EMPTY
  }

  const subscription = new Subscription()

  subscription.add(createHeightObservable(cycler.stateManager).subscribe())

  return watchLocationChange(url => !isHome(url)).pipe(
    switchMap((url) => {
      if (parallaxLayer && !parallaxLayer.children.length && isOnSite(url)) {
        return fetchAndSetImage(shuffledHeroes[0]).pipe(map(() => void 0))
      }
      cycler.stop()
      return of(stopCycler())
    }),
    takeUntil(cycler.stateManager.cleanup$),
    catchError(error => {
      logger.error("Error in shuffle$:", error)
      return EMPTY
    }),
    finalize(() => subscription.unsubscribe())
  )
}
