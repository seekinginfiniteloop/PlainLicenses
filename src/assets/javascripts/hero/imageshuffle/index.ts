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
  ReplaySubject,
  Subscription,
  combineLatest,
  from,
  fromEvent,
  fromEventPattern,
  interval,
  map,
  of,
  throwError
} from "rxjs"
import { catchError, distinctUntilChanged, filter, mergeMap, switchMap, tap } from "rxjs/operators"

import { getAsset } from "~/cache"
import { logger } from "~/log"
import { ImageSettings } from "~/hero/imageshuffle/types"
import { heroImages } from "./data"

const { document$, viewport$, location$ } = window

const CONFIG = {
  INTERVAL_TIME: 25000
}

const subscriptions: Subscription[] = []

const portraitMediaQuery = window.matchMedia("(orientation: portrait)")

const imageNames = Object.keys(heroImages)

const parallaxLayer = document.getElementById("parallax-hero-image-layer")

/**
 * Determine the optimal width based on screen size
 * @function
 * @returns the optimal width for the image
 */
const getOptimalWidth = () => {
    const screenWidth = Math.max(window.innerWidth, window.innerHeight)
    if (screenWidth <= 1280) {
      return 1280
    }
    if (screenWidth <= 1920) {
      return 1920
    }
    if (screenWidth <= 2560) {
      return 2560
    }
    return 2840
  }

/**
 * Creates an array of ImageSettings objects from the heroImages object.
 * @function
 * @returns an array of ImageSettings objects
 */
const getImageSettings = (): ImageSettings[] => {
  const optimalWidth = getOptimalWidth()
  return imageNames.map(imageName => {
    const urls = heroImages.imageName
    if (Array.isArray(urls) && urls.length > 0) {
      const srcset = heroImages.imageName.srcset as unknown as string
      const src = urls.find(url => url.includes(optimalWidth))
      if (!src || !srcset) {
        throw new Error(`Failed to generate image settings for ${imageName}`)
      }
      return { imageName, srcset, src }
    } else {
      throw new Error(`Failed to generate image settings for ${imageName}`)
    }
  })
}

const allImageSettings = getImageSettings()

const hashTableSubject = new ReplaySubject<{ [key: string]: string }>(1)

/**
 * Fetches the hash table containing the image URLs.
 * @function
 * @returns Observable of the hash table
 */
const getHashTable = (): Observable<{ [key: string]: string }> =>
  from(fetch("hashTable.json")).pipe(
    mergeMap(response => from(response.json())),
    tap(hTable => {
      logger.info("Hash table fetched")
      hashTableSubject.next(hTable) // Emit the fetched hash table
    }),
    catchError(error => {
      logger.error(`Failed to fetch hash table: ${error}`)
      return throwError(() => new Error("Failed to fetch hash table"))
    })
  )

// Fetch the hash table and subscribe to handle errors
subscriptions.push(
  getHashTable().subscribe({
  error: (err: Error) => logger.error("Error fetching hash table:", err)
  }))

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
const fetchAndSetImage = (imgSettings: ImageSettings): Observable<void> => {
  const { imageName, srcset, src } = imgSettings
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

/**
 * Randomizes the order of the image settings to shuffle the images
 * @function
 * @returns array of the shuffled image settings
 */
function randomizeImageSettings(): ImageSettings[] {
  return allImageSettings.sort(() => Math.random() - 0.5)
}

let imageGenerator: Generator<ImageSettings>

/**
 * Generates an image data type generator
 *
 * @generator
 * @function
 * @param imgSettings - array of image settings
 * @yields image datum objects
 */
function* imageRetrievalGenerator(imgSettings: ImageSettings[]): Generator<ImageSettings> {
  for (const setting of imgSettings) {
    yield setting
  }
}

/**
 * Initializes the image generator
 *
 * @function
 */
function initializeImageGenerator() {
  const randomSettings = randomizeImageSettings() // Shuffle and store the settings
  imageGenerator = imageRetrievalGenerator(randomSettings) // Create the generator
}

// Variables for image cycling
initializeImageGenerator()
let generatorExhausted = false // turns true when the generator is exhausted
const isPageVisible = true
let cycleImagesSubscription: Subscription | undefined

/**
 * Returns the next image data type from the generator
 * @function
 * @returns image data type or undefined if the generator is exhausted
 */
const imageSettingsGen = (): ImageSettings | undefined => {
  if (generatorExhausted) {
    return undefined
  }
  const nextImageSettings = imageGenerator.next()
  if (nextImageSettings.done) {
    generatorExhausted = true
    return undefined
  }
  return nextImageSettings.value
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
 * Starts the image cycling subscription
 * @function
 * @returns Observable of void
 * @throws {Error} if the first image is not found
 * @throws {Error} if the image cycling subscription fails
 */
const startImageCycling = (): Observable<void> => {
  return new Observable(subscriber => {
    combineLatest([interval(CONFIG.INTERVAL_TIME), viewport$, location$])
      .pipe(
        switchMap(() => cycleImages()),
        catchError(error => {
          logger.error("Error cycling images:", error)
          return EMPTY
        })
      )
      .subscribe({
        next: () => logger.info("Image cycled successfully"),
          error: (err: Error) => subscriber.error(err),
        complete: () => subscriber.complete()
      })
  })
}

/**
 * Handles visibility change events
 * @function
 * @returns Observable of void
 */
const handleVisibilityChange = (): Observable<void> =>
  isPageVisible ? startImageCycling() : of(stopImageCycling())

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
  const nextImage = generatorExhausted ? undefined : imageSettingsGen()

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

/**
 * Shuffles the images in the hero section
 * @function
 * @returns Observable of void
 */
export const shuffle = (): Observable<void> => {
  const settings = imageSettingsGen()
  return settings ? fetchAndSetImage(settings).pipe(map(() => {})) : EMPTY
}

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
  Array.from(parallaxLayer?.getElementsByTagName("img") || []).forEach((image, index) => {
    if (index !== 0) {
      const imageName = image.classList[1].split("--")[1]
      const newChildSrc = heroImages[imageName].widths[optimalWidth]
      if (newChildSrc) {
        image.src = newChildSrc
      }
    }
  })

  const nextSettings: ImageSettings[] = []
  let result = imageGenerator.next()
  while (!result.done) {
    if (result.value !== undefined) {
      nextSettings.push(result.value)
    }
    result = imageGenerator.next()
  }
  generatorExhausted = nextSettings.length === 0
  nextSettings.forEach(setting => {
    const newSrc = heroImages[setting.imageName].widths[optimalWidth]
    setting.src = newSrc
  })
  if (nextSettings.length > 0) {
    imageGenerator = imageRetrievalGenerator(nextSettings)
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
  filter(() => isPageVisible),
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

/**
 * Starts the image cycling subscription when the page is visible
 * @function
 */
const initSubscriptions = (): void => {
  const subscribeWithErrorHandling = (observable: Observable<unknown>, name: string) =>
    observable.subscribe({
      next: () => logger.info(`${name} change processed`),
      error: err => logger.error(`Unhandled error in ${name} subscription:`, err),
      complete: () => logger.info(`${name} subscription completed`)
    })

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

initSubscriptions()

/**
 * Unsubscribes from all subscriptions when the page is closed or refreshed
 * @event beforeunload
 */
window.addEventListener("beforeunload", () => {
  stopImageCycling()
  subscriptions.forEach(sub => sub.unsubscribe())
})
