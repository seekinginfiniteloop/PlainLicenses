import {
  EMPTY,
  Observable,
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
import { ImageSettings } from "./_types"

const { document$, viewport$, location$ } = window

const CONFIG = {
  INTERVAL_TIME: 25000
}

const subscriptions: Subscription[] = []

const portraitMediaQuery = window.matchMedia("(orientation: portrait)")

const imageNames = ["abstract", "anime", "artbrut", "comic", "fanciful", "fantasy", "farcical", "fauvist", "minimal", "mystical", "surreal"]

const parallaxLayer = document.getElementById("parallax-hero-image-layer")

const getHashTable = async () => {
  const tableJson = await fetch("hashTable.json")
  return tableJson.json()
}

const hashTable = await getHashTable()

/**
 * Fetches the image URLs for the specified image name.
 * @param imageName - image name; the name from the image settings object
 * @returns Promise of the image URLs
 */
async function getImageUrls(imageName: string): Promise<void | string[]> {
  const baseUrl = `assets/images/hero/${imageName}/${imageName}`
  const widths = ["1280", "1920", "2560", "3840"]
  const urls: string[] = []
  widths.forEach(width => {
    const lookup = `${imageName}_${width}.avif`
    const hash = hashTable[lookup]
    urls.push(`${baseUrl}_${width}.${hash}.avif`)
    return urls
  })
}

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

  // Determine the optimal width based on screen size
const getOptimalWidth = () => {
    const screenWidth = Math.max(window.innerWidth, window.innerHeight)
    if (screenWidth <= 1280) {
      return "1280"
    }
    if (screenWidth <= 1920) {
      return "1920"
    }
    if (screenWidth <= 2560) {
      return "2560"
    }
    return "3840"
  }

/**
 * Fetches and sets an image element based on the specified image data.
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
 * Generates image settings for the hero section
 * @returns Promise of the image settings
 */
async function generateImageSettings(): Promise<ImageSettings[]> {
  const imageSettings: ImageSettings[] = []
  const optimalWidth = getOptimalWidth()
  imageNames.forEach(imageName => {
    const urls = getImageUrls(imageName).then(urlList => urlList).catch(error => {
      logger.error(`Failed to generate image settings for ${imageName}: ${error}`)
      return undefined
    }
    )
    if (urls && urls instanceof Array && urls.length > 0) {
      const srcset = urls?.map(newUrl => `${newUrl as string} ${optimalWidth}w`).join(", ")
      const src = urls?.find(url => url.includes(optimalWidth))
      if (!src || !srcset) {
        throw new Error(`Failed to generate image settings for ${imageName}`)
      }
      imageSettings.push({ imageName, srcset, src })
    }
  })
  return imageSettings
}

/**
 * Randomizes the order of the image settings to shuffle the images
 * @param imageSettings - array of image settings
 * @returns Promise of the shuffled image settings
 */
async function randomizeImageSettings(imageSettings: ImageSettings[]): Promise < ImageSettings[] > {
  return imageSettings.sort(() => Math.random() - 0.5)
}

let imageSettings: ImageSettings[] = await randomizeImageSettings(await generateImageSettings())

/**
 * generates an image data type generator
 * @yields image datum objects
 */
function* imageRetrievalGenerator(): Generator<ImageSettings> {
  imageSettings.forEach(_imageSetting =>
    yield _imageSetting
  )
}

  // Variables for image cycling
let generatorExhausted = false // turns true when the generator is exhausted
const isPageVisible = true
let cycleImagesSubscription: Subscription | undefined
const imageGen = imageRetrievalGenerator()

/**
 * Returns the next image data type from the generator
 * @returns image data type or undefined if the generator is exhausted
 */
const imageSettingsGen = (): ImageSettings | undefined => {
  if (generatorExhausted) {
    return undefined
  }
  const nextImageSettings = imageGen.next()
  if (nextImageSettings.done) {
    generatorExhausted = true
    return undefined
  }
  return nextImageSettings.value
}

/**
 * Stops the image cycling subscription
 */
const stopImageCycling = (): void => {
  if (cycleImagesSubscription) {
    cycleImagesSubscription.unsubscribe()
    cycleImagesSubscription = undefined
  }
}

/**
 * Starts the image cycling subscription
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
 * @returns Observable of void
 */
const handleVisibilityChange = (): Observable<void> =>
  isPageVisible ? startImageCycling() : of(stopImageCycling())

/**
 * Cycles the images in the hero section
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
 * @returns Observable of void
 */
export const shuffle = (): Observable<void> => {
  const settings = imageSettingsGen()
  return settings ? fetchAndSetImage(settings).pipe(map(() => {})) : EMPTY
}

/**
 * Creates an observable for screen orientation changes.
 * @param the - media query list for the orientation
 * @returns boolean observable for orientation changes
 */

const createOrientationObservable = (mediaQuery: MediaQueryList): Observable<boolean> =>
  fromEventPattern<boolean>(
    handler => mediaQuery.addEventListener("change", handler),
    handler => mediaQuery.removeEventListener("change", handler),
    (event: MediaQueryListEvent) => event.matches
  )

/**
 * Sets the new sources for the images in the hero section following a screen orientation change.
 * @param img - the hero image
 * @param optimalWidth - the optimal width for the image
 */
function setNewSrc(img: HTMLImageElement, optimalWidth: string) {
  const newSrc = img.srcset.split(",").find(url => url.includes(optimalWidth))?.split(" ")[0]
  if (newSrc) {
    img.src = newSrc
  }
  Array.from(parallaxLayer?.getElementsByTagName("img") || []).forEach((image, index) => {
    if (index !== 0) {
      const newChildSrc = image.srcset.split(",").find(url => url.includes(optimalWidth))?.split(" ")[0]
      if (newChildSrc) {
        image.src = newChildSrc
      }
    }
  })

  // we exhaust the generator and use the yielded settings to create a new generator with adjusted settings
  const nextSettings: ImageSettings[] = []
  while (imageSettingsGen()) {
    const nextValue = imageSettingsGen()
    if (nextValue !== undefined) {
      nextSettings.push(nextValue)
    } else {
      break
    }
  }
  nextSettings.forEach(setting => {
    if (newSrc) {
      setting.src = newSrc
    }
  })
  if (nextSettings && nextSettings instanceof Array && nextSettings.length > 0) {
    imageSettings = nextSettings
  }
}

/**
 * Handles visibility changes
 * @returns Observable of void
 * @throws {Error} if the first image is not found
 * @throws {Error} if the image cycling subscription fails
 * @throws {Error} if the visibility change subscription fails
 *
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
        if (currentWidth !== parseInt(optimalWidth, 10)) {
          setNewSrc(currentImage, optimalWidth)
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

// Unsubscribes from all subscriptions when the user leaves the page
window.addEventListener("beforeunload", () => {
  stopImageCycling()
  subscriptions.forEach(sub => sub.unsubscribe())
})
