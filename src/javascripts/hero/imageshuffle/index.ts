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
import * as imgSettings from "~/hero/config"
import { logger } from "~/log"

const { document$, viewport$, location$ } = window

const CONFIG = {
  INTERVAL_TIME: 25000
}


const subscriptions: Subscription[] = []

const portraitMediaQuery = window.matchMedia("(orientation: portrait)")
const isPortrait = (): boolean => !!portraitMediaQuery.matches

const parallaxLayer = document.getElementById("parallax-hero-image-layer")

/**
 * Retrieves image settings for a specified image name in both landscape and portrait orientations. Merges default settings with image-specific settings. Images inherit default settings if any setting is not specified.
 *
 * @param imageName - The name of the image for which settings are to be retrieved.
 * @returns A Map containing the image settings for both "landscape" and "portrait" orientations.
 */
const getImageSettings = (imageName: string): Map<string, imgSettings.ImageSettings> => {
  const landscapeSettings = {
    ...imgSettings.defaultSettings,
    ...imgSettings.imageSettings[imageName]
  }
  const portraitSettings = {
    ...imgSettings.defaultSettings,
    ...imgSettings.defaultPortraitSettings,
    ...imgSettings.portraitImageSettings[imageName]
  }

  return new Map([
    ["landscape", landscapeSettings],
    ["portrait", portraitSettings]
  ])
}

/**
 * Generates image data for an image with the specified name. The image data comes from the ImageSettings object.
 *
 * @param imageName - The name of the image for which data is to be generated.
 * @returns An object containing the image data type, including
 *          properties such as imageName, baseUrl, url, srcset, landscapeSettings,
 *          portraitSettings, colorSpace, data, and imgWidth.
 */
const generateImageDataType = (imageName: string): imgSettings.ImageDataType => {
  const combinedSettings = getImageSettings(imageName)
  const widths = ["1280", "1920", "2560", "3840"]
  const baseUrl = `assets/images/hero/${imageName}/${imageName}`
  const srcset = widths
    .map(imgWidth => `${baseUrl}_${imgWidth}.webp ${imgWidth}w`)
    .join(", ")

  return {
    versionHash: combinedSettings.get("landscape")?.versionHash || "v.1.0",
    imageName,
    baseUrl,
    url: `${baseUrl}_1280.webp`,
    srcset,
    landscapeSettings: combinedSettings.get("landscape") || imgSettings.defaultSettings,
    portraitSettings: combinedSettings.get("portrait") || imgSettings.defaultPortraitSettings,
    colorSpace: "srgb",
    data: new Uint8ClampedArray(),
    imgWidth: "1280"
  }
}

/**
 * Loads an image from the server.
 * @param imageName - image name; the name from the image settings object
 * @param version - image version
 * @returns Observable of the image blob
 */
export const loadImage = (imageName: string, version: string): Observable<Blob> => {
  const url = `assets/images/hero/${imageName}?v=${version}`
  return getAsset(url).pipe(
    mergeMap(response => from(response.blob())),
    catchError(error => {
      logger.error("Error loading image:", error)
      return throwError(() => new Error("Failed to load image"))
    })
  )
}

/**
 * Sets the styles for an image element based on the specified settings.
 * @param img - image element
 * @param settings - image settings
 * @returns Observable of the image element
 */
const setStyles = (img: HTMLImageElement, settings: imgSettings.ImageSettings): Observable<HTMLImageElement> =>
  of(img).pipe(
    tap(image => {
      Object.entries(settings).forEach(([key, value]) => {
        if (key !== "colors" && key !== "transformationSettings") {
          image.style.setProperty(key, value.toString())
        }
      })
      image.style.alignContent = "flex-start"
      image.style.alignSelf = "flex-start"
    })
  )

/**
 * Fetches and sets an image element based on the specified image data.
 * @param imageDatum - image data for a single image
 * @param firstImage - flag indicating whether this is the first image to be fetched, which means we load it immediately and without a transition
 * @returns Observable of the image element
 */
const fetchAndSetImage = (imageDatum: imgSettings.ImageDataType, firstImage = false): Observable<HTMLImageElement> => {
  const optimalWidth = window.innerWidth <= 1280 ? "1280" :
                       window.innerWidth <= 1920 ? "1920" :
      window.innerWidth <= 2560 ? "2560" : "3840"
  const {versionHash} = imageDatum
  const optimalUrl = `${imageDatum.baseUrl}_${optimalWidth}.webp?hash=${versionHash}`

  return loadImage(imageDatum.imageName, "hashValue").pipe(
    mergeMap(imageBlob => {
      const img = new Image()
      const imageUrl = URL.createObjectURL(imageBlob)

      img.src = optimalUrl
      img.srcset = imageDatum.srcset
      img.sizes = "(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px"
      img.alt = ""
      img.classList.add("hero-parallax__image")
      img.draggable = false
      img.fetchPriority = firstImage ? "high" : "auto"
      img.loading = "eager"

      const settings = isPortrait() ? imageDatum.portraitSettings : imageDatum.landscapeSettings
      return setStyles(img, settings).pipe(
        tap(styledImg => {
          styledImg.onload = () => {
            setTimeout(() => URL.revokeObjectURL(imageUrl), 60000)
            requestAnimationFrame(() => {})
          }
          styledImg.onerror = () => {}
        })
      )
    }),
    catchError(error => {
      logger.error("Error in fetchAndSetImage:", error)
      return throwError(() => new Error("Failed to fetch and set image"))
    })
  )
}

/**
 * Updates the colors of the header and paragraph elements.
 * - @param colors object containing the colors for the header and paragraph elements
 * - @param transition transition string
 * @param colors
 * @param transition
 * @returns An Observable that emits void.
 */
const updateColors = (colors: { h1: string, p: string }, transition = "color 5s ease-in"): Observable<void> =>
  of(undefined).pipe(
    tap(() => {
      const h1 = document.getElementById("CTA_header")
      const p = document.getElementById("CTA_paragraph")
      if (h1) {
        h1.style.transition = transition
        h1.style.color = colors.h1
      }
      if (p) {
        p.style.transition = transition
        p.style.color = colors.p
      }
    })
  )

/**
 * retrieves the first image for the hero section
 * @param imageDatum - image data for a single image
 * @returns Observable of the image element
 */
const getFirstImage = (imageDatum: imgSettings.ImageDataType): Observable<HTMLImageElement> => {
  if (!parallaxLayer || !imageDatum) {
    return EMPTY
  }

  const settings = isPortrait() ? imageDatum.portraitSettings : imageDatum.landscapeSettings

  return updateColors(settings.colors).pipe(
    mergeMap(() => fetchAndSetImage(imageDatum, true)),
    tap(imageElement => {
      if (imageElement instanceof HTMLImageElement) {
        imageElement.style.transition = "none"
        parallaxLayer.prepend(imageElement)
      }
    }),
    catchError(error => {
      logger.error("Error in getFirstImage:", error)
      return EMPTY
    })
  )
}

/**
 * generates an image data type generator
 * @yields image datum objects
 */
function* imageDatumGenerator(): Generator<imgSettings.ImageDataType> {
  const imageNames = Object.keys(imgSettings.imageSettings)
  for (const imageName of imageNames) {
    yield generateImageDataType(imageName)
  }
}

// Variables for image cycling
let generatorExhausted = false // turns true when the generator is exhausted
const isPageVisible = true
let cycleImagesSubscription: Subscription | undefined
const imageGen = imageDatumGenerator()

/**
 * Returns the next image data type from the generator
 * @returns image data type or undefined if the generator is exhausted
 */
const imageDatumGen = (): imgSettings.ImageDataType | undefined => {
  if (generatorExhausted) {
    return undefined
  }
  const nextImageDatum = imageGen.next()
  if (nextImageDatum.done) {
    generatorExhausted = true
    return undefined
  }
  return nextImageDatum.value
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
  const firstImage = parallaxLayer?.getElementsByTagName("img")[0]
  if (firstImage && isPageVisible) {
    stopImageCycling()

    return new Observable(subscriber => {
      cycleImagesSubscription = combineLatest([interval(CONFIG.INTERVAL_TIME), viewport$, location$])
        .pipe(
          switchMap(() => cycleImages()),
          catchError(error => {
            logger.error("Error cycling images:", error)
            return EMPTY
          })
        )
        .subscribe({
          next: () => logger.info("Image cycled successfully"),
          error: err => subscriber.error(err),
          complete: () => subscriber.complete()
        })
    })
  }
  return EMPTY
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

  return new Observable(subscriber => {
    const images = parallaxLayer.getElementsByTagName("img")
    const lastImage = images[0]

    const nextDatum = generatorExhausted ? undefined : imageDatumGen()
    if (nextDatum !== undefined) {
      fetchAndSetImage(nextDatum).subscribe({
        next: nextImage => {
          if (nextImage && lastImage) {
            lastImage.style.transition = lastImage.style.transition !== "none"
              ? lastImage.style.transition
              : "opacity 1.5s ease-in"
            parallaxLayer.prepend(nextImage)
          }
          subscriber.complete()
        },
        error: err => subscriber.error(err)
      })
    } else if (images.length > 1) {
      const nextImage = images[images.length - 1]
      if (nextImage && lastImage) {
        lastImage.style.transition = lastImage.style.transition !== "none"
          ? lastImage.style.transition
          : "opacity 1.5s ease-in"
        parallaxLayer.prepend(nextImage)
      }
      subscriber.complete()
    } else {
      subscriber.complete()
    }
  })
}

/**
 * Shuffles the images in the hero section
 * @returns Observable of void
 */
export const shuffle = (): Observable<void> => {
  const datum = imageDatumGen()
  return datum ? getFirstImage(datum).pipe(
    mergeMap(() => startImageCycling()),
    catchError(error => {
      logger.error("Error in shuffle:", error)
      return EMPTY
    })
  ) : EMPTY
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
  tap(isPortrait => {
    if (parallaxLayer) {
      const firstImage = parallaxLayer.getElementsByTagName("img")[0]
      if (firstImage) {
        const imageName = firstImage.getAttribute("data-name") || ""
        const imageDatum = generateImageDataType(imageName)
        const settings = isPortrait ? imageDatum.portraitSettings : imageDatum.landscapeSettings
        setStyles(firstImage, settings).subscribe()
        updateColors(settings.colors, "none").subscribe()
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
  const subscribeWithErrorHandling = (observable: Observable<any>, name: string) =>
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
