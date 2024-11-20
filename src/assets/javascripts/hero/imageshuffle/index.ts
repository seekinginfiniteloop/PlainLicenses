Perfect, let's start with Part 1 - core declarations, types, and state management:

```typescript
/**
 * Hero module contains the logic for the hero image shuffling on the home page.
 * It fetches image URLs, randomizes their order, caches and loads images on
 * the hero landing page. Handles visibility changes and screen orientation changes.
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @license Plain Unlicense (Public Domain)
 */

import {
  EMPTY,
  Observable,
  Subject,
  BehaviorSubject,
  Subscription,
  from,
  fromEvent,
  fromEventPattern,
  interval,
  of,
  shareReplay,
  throwError
} from "rxjs"
import { 
  catchError, 
  distinctUntilChanged, 
  distinctUntilKeyChanged, 
  filter, 
  first,
  map, 
  mergeMap, 
  retry, 
  skipUntil, 
  skipWhile, 
  switchMap, 
  takeUntil, 
  tap 
} from "rxjs/operators"

import { isElementVisible, isHome, isOnSite, mergedUnsubscription$, setCssVariable, unsubscribeFromAll, watchLocationChange } from "~/utils"
import { getAsset } from "~/cache"
import { heroImages } from "~/hero/imageshuffle/data"
import { logger } from "~/log"
import type { HeroImage } from "~/hero/imageshuffle/data"

/**
 * Core state type for hero image cycling
 */
type HeroState = {
  status: 'loading' | 'ready' | 'cycling' | 'paused' | 'stopped';
  isVisible: boolean;
  isAtHome: boolean;
  activeImageIndex: number;
  orientation: 'portrait' | 'landscape';
  optimalWidth: number;
};

// Configuration and DOM references
const CONFIG = { INTERVAL_TIME: 25000 } as const
const portraitMediaQuery = window.matchMedia("(orientation: portrait)")
const parallaxLayer = document.getElementById("parallax-hero-image-layer")
const { document$ } = window

/**
 * Creates and manages the hero state with proper cleanup
 */
const createHeroStateManager = () => {
  const initialState: HeroState = {
    status: 'loading',
    isVisible: !document.hidden,
    isAtHome: true,
    activeImageIndex: 0,
    orientation: portraitMediaQuery.matches ? 'portrait' : 'landscape',
    optimalWidth: getOptimalWidth()
  };

  const state$ = new BehaviorSubject<HeroState>(initialState);
  const cleanup = new Subject<void>();

  return {
    state$,
    cleanup$: cleanup.asObservable(),
    
    updateState: (updates: Partial<HeroState>) => {
      if (state$.closed) return;
      state$.next({ ...state$.value, ...updates });
    },
    
    cleanup: () => {
      cleanup.next();
      cleanup.complete();
      state$.complete();
    }
  };
};

/**
 * Calculates optimal image width based on screen dimensions
 */
const getOptimalWidth = () => {
  const screenWidth = Math.max(window.innerWidth, window.innerHeight)
  return screenWidth <= 1280 ? 1280 
    : screenWidth <= 1920 ? 1920 
    : screenWidth <= 2560 ? 2560 
    : 2840
}

/**
 * Updates image sources based on optimal width
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
 * Checks if the page is visible
 */
const isPageVisible = () => !document.hidden

/**
 * Retry operator for when returning to home page
 */
const retryWhenAtHome = retry({
  delay: () => watchLocationChange((url) => isHome(url) && isOnSite(url))
    .pipe(
      filter(() => isPageVisible() && parallaxLayer !== null && isElementVisible(parallaxLayer as Element)),
      map((value) => value || undefined)
    )
})

/**
 * Retrieves image settings by name
 */
const retrieveImage = (imageName: string): HeroImage | undefined => {
  return heroImages.find(image => image.imageName === imageName)
}

/**
 * Gets all heroes with optimal widths
 */
const getHeroes = (): HeroImage[] => {
  const optimalWidth = getOptimalWidth()
  return heroImages.map(image => ({ ...image, src: image.widths[optimalWidth] }))
}

const allHeroes = getHeroes()

Here's part 2 - image loading and cycling logic:

```typescript
/**
 * WeakMap to store image metadata without preventing garbage collection
 */
const imageMetadata = new WeakMap<HTMLImageElement, {
  loadTime: number;
  displayCount: number;
  width: number;
}>();

/**
 * Loads an image from URL
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
 * Updates text elements with image-specific classes
 */
const setText = async (imgName: string) => {
  const headerEl = document.getElementById("CTA_header")
  const textEl = document.getElementById("CTA_paragraph")
  headerEl?.setAttribute("class", `hero-parallax__image--${imgName}`)
  textEl?.setAttribute("class", `hero-parallax__image--${imgName}`)
}

/**
 * Cleans up image resources to prevent memory leaks
 */
const cleanupImageResources = (image: HTMLImageElement) => {
  const currentSrc = image.src
  if (currentSrc.startsWith('blob:')) {
    URL.revokeObjectURL(currentSrc)
  }
}

/**
 * Fetches and sets up an image with proper resource management
 */
const fetchAndSetImage = (imgSettings: HeroImage): Observable<void> => {
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
        tap(() => parallaxLayer?.prepend(img))
      )
    }),
    catchError(error => {
      logger.error("Error in fetchAndSetImage:", error)
      return EMPTY
    })
  )
}

/**
 * Creates and manages the image cycling process
 */
const createImageCycler = (parallaxLayer: HTMLElement) => {
  const stateManager = createHeroStateManager();
  const { state$, cleanup$, updateState } = stateManager;

  let imageGenerator: Iterator<HeroImage>;

  /**
   * Initializes the image generator with randomized heroes
   */
  const initializeImageGenerator = () => {
    imageGenerator = [...allHeroes]
      .sort(() => Math.random() - 0.5)
      .values();
  };

  /**
   * Gets next hero from generator
   */
  const heroesGen = (): HeroImage | undefined => {
    const nextHeroes = imageGenerator.next();
    return nextHeroes.done ? undefined : nextHeroes.value;
  };

  /**
   * Handles image cycling logic
   */
  const cycleImages = (): Observable<void> => {
    if (!parallaxLayer) {
      return EMPTY;
    }

    const images = parallaxLayer.getElementsByTagName("img");
    const nextImage = heroesGen();

    if (nextImage) {
      return fetchAndSetImage(nextImage);
    }

    if (images.length > 1) {
      const lastImage = images[images.length - 1];
      if (lastImage instanceof HTMLImageElement) {
        const metadata = imageMetadata.get(lastImage);
        if (metadata) {
          metadata.displayCount++;
        }
        parallaxLayer.prepend(lastImage);
      }
    }

    return EMPTY;
  };

  /**
   * Creates observable for cycling images
   */
  const cycle$ = interval(CONFIG.INTERVAL_TIME).pipe(
    withLatestFrom(state$),
    filter(([_, state]) => 
      state.isVisible && 
      state.isAtHome && 
      state.status === 'cycling'
    ),
    switchMap(() => cycleImages()),
    takeUntil(cleanup$)
  );

  /**
   * Handles orientation changes
   */
  const orientation$ = createOrientationObservable(portraitMediaQuery).pipe(
    skipWhile(() => !isPageVisible() || !isElementVisible(parallaxLayer)),
    distinctUntilChanged(),
    tap(() => {
      const optimalWidth = getOptimalWidth();
      updateState({ 
        orientation: portraitMediaQuery.matches ? 'portrait' : 'landscape',
        optimalWidth 
      });
      regenerateSources(optimalWidth);
    }),
    takeUntil(cleanup$)
  );

  return {
    start: () => {
      const subscription = new Subscription();
      initializeImageGenerator();
      
      subscription.add(
        loadFirstImage().pipe(
          tap(() => updateState({ status: 'cycling' })),
          tap(() => {
            subscription.add(cycle$.subscribe());
            subscription.add(orientation$.subscribe());
          })
        ).subscribe()
      );

      subscription.add(() => {
        const images = Array.from(parallaxLayer.getElementsByTagName('img'));
        images.forEach(cleanupImageResources);
      });

      return subscription;
    },

    stop: () => {
      stateManager.cleanup();
    }
  };
};

Here's part 3 - subscription management, height adjustments, and initialization code:

```typescript
/**
 * Creates an observable for orientation changes
 */
const createOrientationObservable = (mediaQuery: MediaQueryList): Observable<boolean> =>
  fromEventPattern<boolean>(
    handler => mediaQuery.addEventListener("change", handler),
    handler => mediaQuery.removeEventListener("change", handler),
    (event: MediaQueryListEvent) => event.matches
  )

/**
 * Regenerates image sources after orientation/size changes
 */
function regenerateSources(optimalWidth: number) {
  const imageLayers = Array.from(parallaxLayer?.getElementsByTagName("img") || [])
  updateImageSources(imageLayers, optimalWidth)

  if (imageLayers.length === 0) {
    const firstImage = heroesGen() || initializeImageGenerator()
    if (firstImage) {
      firstImage.src = firstImage.widths[optimalWidth]
      fetchAndSetImage(firstImage).subscribe({
        next: () => logger.info("First image loaded successfully"),
        error: (err: Error) => logger.error("Error loading first image:", err)
      })
    }
  } else {
    const nextSettings = []
    let result = heroesGen()
    while (result) {
      nextSettings.push(result)
      result = heroesGen()
    }
    nextSettings.forEach(hero => hero.src = hero.widths[optimalWidth])
    imageGenerator = nextSettings.values()
  }
}

/**
 * Watches for location changes
 */
const locationChange$ = watchLocationChange((url) => url instanceof URL).pipe(
  distinctUntilKeyChanged("pathname"),
  filter((url) => !isHome(url) || !isOnSite(url)),
  tap(() => {
    const cycler = cyclerRef.current
    if (cycler) {
      cycler.stop()
    }
  }),
  catchError(error => {
    logger.error("Error in location change observable:", error)
    return EMPTY
  })
)

/**
 * Subscribes to an observable with error handling
 */
const subscribeWithErrorHandling = (observable: Observable<unknown>, name: string) => {
  return observable.subscribe({
    next: () => logger.info(`${name} change processed`),
    error: err => logger.error(`Unhandled error in ${name} subscription:`, err),
    complete: () => logger.info(`${name} subscription completed`)
  })
}

/**
 * Gets current image from parallax layer
 */
const getImage = () => {
  const images = parallaxLayer?.getElementsByTagName("img")
  if (images && images.length > 0) {
    return images[0]
  }
  return undefined
}

/**
 * Observable for image height changes
 */
const imageHeight$ = of(getImage()).pipe(
  retryWhenAtHome,
  filter((img): img is HTMLImageElement => img !== null && img instanceof HTMLImageElement),
  map(img => img.height || window.innerHeight),
  shareReplay(1),
  filter(() => isPageVisible() && isElementVisible(parallaxLayer as Element)),
  distinctUntilChanged()
)

/**
 * Sets parallax layer height and fade based on image height
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

/**
 * Initializes the hero image shuffling
 */
export function shuffle$(): Observable<unknown> {
  if (!parallaxLayer) {
    return EMPTY
  }

  const cycler = createImageCycler(parallaxLayer)
  cyclerRef.current = cycler
  const subscription = cycler.start()

  // Handle height adjustments
  subscription.add(
    imageHeight$.pipe(
      takeUntil(cycler.cleanup$)
    ).subscribe({
      next: height => setParallaxHeight(height),
      error: err => logger.error("Error adjusting height:", err)
    })
  )

  // Subscribe to location changes
  subscription.add(
    subscribeWithErrorHandling(locationChange$, "Location")
  )

  // Cleanup on navigation away
  return watchLocationChange(url => !isHome(url) || !isOnSite(url)).pipe(
    first(),
    tap(() => {
      subscription.unsubscribe()
      cycler.stop()
      cyclerRef.current = null
    }),
    catchError(error => {
      logger.error("Error during cleanup:", error)
      return EMPTY
    })
  )
}


