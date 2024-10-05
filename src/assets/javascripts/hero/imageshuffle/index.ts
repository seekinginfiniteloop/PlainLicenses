/**
 * @license Plain Unlicense (Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @module This module contains the logic for the hero image shuffling on the home page.
 * It fetches the image URLs, randomizes their order, caches and loads the images on
 * the hero landing page.
 * It also handles visibility changes and screen orientation changes.
 */
import {
  EMPTY,
  Observable,
  Subscription,
  combineLatest,
  from,
  fromEvent,
  fromEventPattern,
  interval,
  of,
  throwError
} from "rxjs"
import { catchError, distinctUntilChanged, filter, mergeMap, switchMap, tap } from "rxjs/operators"

import { getAsset } from "~/cache"
import { heroImages } from "~/hero/imageshuffle/data"
import { logger } from "~/log"
// eslint-disable-next-line no-duplicate-imports
import type { HeroImage } from "~/hero/imageshuffle/data"

const { document$, viewport$, location$ } = window

const CONFIG = {
  INTERVAL_TIME: 25000
}

const subscriptions: Subscription[] = []

const portraitMediaQuery = window.matchMedia("(orientation: portrait)")

const parallaxLayer = document.getElementById("parallax-hero-image-layer")

// ===================================== UTILITIES =====================================

/**
 * Determine the optimal width based on screen size
 * @function
 * @returns the optimal width for the image
 */
const getOptimalWidth = () => {
  const screenWidth = Math.max(window.innerWidth, window.innerHeight)
  return screenWidth <= 1280 ? 1280 : screenWidth <= 1920 ? 1920 : screenWidth <= 2560 ? 2560 : 2840
}

/**
 * Updates the image sources based on the optimal width
 * @param images - an array of image elements
 * @param optimalWidth - the optimal width for the image
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
 * true if the page is visible, false otherwise
 * @function
 * @returns boolean
 */
function isPageVisible() {
  return !document.hidden
}

/**
 * Retrieves an image from the heroImages array based on the image name.
 * @function
 * @param imageName - the name of the image
 * @returns the HeroImage object or undefined if the image is not found
 */
function retrieveImage(imageName: string): HeroImage | undefined {
  return heroImages.find(image => image.imageName === imageName)
}

/**
 * Creates an array of HeroImage objects from the heroImages object.
 * @function
 * @returns an array of HeroImage objects
 */
const getHeroes = (): HeroImage[] => {
  const optimalWidth = getOptimalWidth()
  const heroes: HeroImage[] = []
  heroImages.forEach(image => {
    image.src = image.widths[optimalWidth]
    heroes.push(image)
  })
  return heroes
}

const allHeroes = getHeroes()

/**
 * Loads an image from the server.
 * @param imageUrl - image url
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
 * Fetches and sets an image element based on the specified image data.
 * @function
 * @param imgSettings - image settings for a single image
 * @returns Observable of the image element
 */
const fetchAndSetImage = (imgSettings: HeroImage): Observable<void> => {
  const { imageName, srcset, src } = imgSettings
  if (src === undefined) {
    return EMPTY
  } else {
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

        return from(new Promise<void>(resolve => {
          img.onload = () => {
            URL.revokeObjectURL(imageUrl)
            resolve()
          }
        })).pipe(
          tap(() => {
            if (parallaxLayer) {
              parallaxLayer.prepend(img)
            }
          })
        )
      }),
      catchError(error => {
        logger.error("Error in fetchAndSetImage:", error)
        return of() // Return an empty observable on error
      })
    )
  }
}

// ============================== IMAGE GENERATOR ==============================
/**
 * randomizes the order of the hero images
 * @function
 * @returns an array of HeroImage objects
 */
function randomizeHeroes(): HeroImage[] {
  return allHeroes.sort(() => Math.random() - 0.5)
}

let imageGenerator: Iterator<HeroImage>

/**
 * Initializes the image generator
 *
 * @function
 */
function initializeImageGenerator() {
  const randomSettings = randomizeHeroes() // Shuffle and store the settings
  imageGenerator = randomSettings.values() // Use the built-in iterator
}

// Variables for image cycling
let generatorExhausted = false // turns true when the generator is exhausted

let cycleImagesSubscription: Subscription | undefined

/**
 * Returns the next image data type from the generator
 * @function
 * @returns image data type or undefined if the generator is exhausted
 */
const heroesGen = (): HeroImage | undefined => {
  const nextHeroes = imageGenerator.next()
  return nextHeroes.done ? (generatorExhausted = true, undefined) : nextHeroes.value
}

/**
 * Stops the image cycling subscription
 * @function
 */
const stopImageCycling = (): void => {
  if (cycleImagesSubscription) {
    cycleImagesSubscription.unsubscribe()
    cycleImagesSubscription = undefined
  }
}

/**
 * Cycles the images in the hero section
 * @function
 * @returns Observable of void
 */
const cycleImages = (): Observable<void> => {
  if (!parallaxLayer) {
    return EMPTY
  }

  const images = parallaxLayer.getElementsByTagName("img")
  const lastImage = images[0]
  const nextImage = generatorExhausted ? undefined : heroesGen()

  if (nextImage !== undefined) {
    return fetchAndSetImage(nextImage).pipe(
      catchError((err: Error): Observable<void> => {
        logger.error(`error fetching next image ${err}`)
        return EMPTY
      })
    )
  }

  if (images.length > 1) {
    const recycledImage = images[images.length - 1]
    if (nextImage && lastImage) {
      parallaxLayer.prepend(recycledImage)
    }
  }

  return EMPTY
}

// ============================== IMAGE CYCLING ==============================

/**
 * Starts the image cycling subscription
 * @function
 * @returns Observable of void
 * @throws {Error} if the first image is not found
 * @throws {Error} if the image cycling subscription fails
 */
const startImageCycling = (): Observable<void> => {
  return combineLatest([interval(CONFIG.INTERVAL_TIME), viewport$, location$])
    .pipe(
      switchMap(() => cycleImages()),
      tap({
        next: () => logger.info("Image cycled successfully"),
        error: (error: Error) => logger.error("Error cycling images:", error)
      }),
      catchError(() => EMPTY)
    )
}

/**
 * Handles visibility change events
 * @function
 * @returns Observable of void
 */
const handleVisibilityChange = (): Observable<void> =>
  isPageVisible() ? startImageCycling() : of(stopImageCycling())

/**
 * Creates an observable for screen orientation changes.
 * @param mediaQuery - media query list for the orientation
 * @returns boolean observable for orientation changes
 */
const createOrientationObservable = (mediaQuery: MediaQueryList): Observable<boolean> =>
  fromEventPattern<boolean>(
    handler => mediaQuery.addEventListener("change", handler),
    handler => mediaQuery.removeEventListener("change", handler),
    (event: MediaQueryListEvent) => event.matches
  )

/**
 * Regenerates the sources for the images in the hero section following a screen orientation change.
 * @function
 * @param optimalWidth - the optimal width for the image
 */
function regenerateSources(optimalWidth: number) {
  const imageLayers = Array.from(parallaxLayer?.getElementsByTagName("img") || [])
  updateImageSources(imageLayers, optimalWidth)

  if (imageLayers.length === 0 && !generatorExhausted) {
    const firstImage = heroesGen() || initializeImageGenerator()
    if (firstImage) {
      firstImage.src = firstImage.widths[optimalWidth]
      fetchAndSetImage(firstImage).subscribe({
        next: () => logger.info("First image loaded successfully"),
        error: (err: Error) => logger.error("Error loading first image:", err)
      })
    }
  } else if (!generatorExhausted && imageGenerator) {
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
   * Handles visibility changes
   * @function
   * @returns Observable of void
   * @throws {Error} if the first image is not found
   * @throws {Error} if the image cycling subscription fails
   * @throws {Error} if the visibility change subscription fails
   */
const orientation$ = createOrientationObservable(portraitMediaQuery).pipe(
  filter(() => isPageVisible()),
  distinctUntilChanged(),
  tap(() => {
      if (parallaxLayer) {
        const currentImage = parallaxLayer.getElementsByTagName("img")[0]
        if (currentImage) {
          const currentWidth = currentImage.width
          const optimalWidth = getOptimalWidth()
          if (currentWidth !== optimalWidth) {
            regenerateSources(optimalWidth)
          }
        }
      }
    }),
  catchError(error => {
      logger.error("Error in orientation observable:", error)
      return EMPTY
    })
)

  /**
   * Creates an observable for visibility changes (e.g. navigating to a different tab or window). We use this to trigger the start and stop of image cycling.
   */
const locationChange$ = location$.pipe(
  distinctUntilChanged((a: URL, b: URL) => a.pathname === b.pathname),
  filter(loc => loc.pathname === "/" || loc.pathname === "/index.html"),
  tap(() => stopImageCycling()),
  catchError(error => {
      logger.error("Error in location change observable:", error)
      return EMPTY
    })
)

const subscribeWithErrorHandling = (observable: Observable<unknown>, name: string) => {
  return observable.subscribe({
    next: () => logger.info(`${name} change processed`),
    error: err => logger.error(`Unhandled error in ${name} subscription:`, err),
    complete: () => logger.info(`${name} subscription completed`)
  })
}

  /**
   * Starts the image cycling subscription when the page is visible
   * @function
   */
const initSubscriptions = (): void => {
  logger.info("Initializing subscriptions")
  subscriptions.push(
    subscribeWithErrorHandling(orientation$, "Orientation"),
    subscribeWithErrorHandling(
      document$.pipe(
        switchMap(doc => fromEvent(doc, "visibilitychange")),
        switchMap(() => handleVisibilityChange())
      ),
      "Visibility"
    ),
    subscribeWithErrorHandling(locationChange$, "Location")
  )
}

initializeImageGenerator()
startImageCycling().subscribe({
    next: () => logger.info("Image cycling started"),
    error: (err: Error) => logger.error("Error starting image cycling:", err),
    complete: () => logger.info("Image cycling completed")
  })
initSubscriptions()

  /**
   * Unsubscribes from all subscriptions when the page is closed or refreshed
   * @event beforeunload
   */
window.addEventListener("beforeunload", () => {
    stopImageCycling()
    subscriptions.forEach(sub => sub.unsubscribe())
  })
