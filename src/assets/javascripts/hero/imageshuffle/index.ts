/**
 * @license Plain Unlicense (Public Domain)
 * @copyright No rights reserved. Created by and for Plain License www.plainlicense.org
 * @module hero module contains the logic for the hero image shuffling on the home page.
 * It fetches the image URLs, randomizes their order, caches and loads the images on
 * the hero landing page.
 * It also handles visibility changes and screen orientation changes.
 */
import {
  EMPTY,
  Observable,
  Subject,
  Subscription,
  from,
  fromEvent,
  fromEventPattern,
  interval,
  of,
  shareReplay,
  throwError
} from "rxjs"
import { catchError, distinctUntilChanged, filter, first, map, mergeMap, skipUntil, switchMap, takeUntil, tap } from "rxjs/operators"

import { isElementVisible, mergedUnsubscription$, setCssVariable } from "~/utils"
import { getAsset } from "~/cache"
import { heroImages } from "~/hero/imageshuffle/data"
import { logger } from "~/log"
// eslint-disable-next-line no-duplicate-imports
import type { HeroImage } from "~/hero/imageshuffle/data"

const { document$, location$ } = window
let stopCycling$ = new Subject<void>()
const CONFIG = { INTERVAL_TIME: 25000 }
const subscriptions: Subscription[] = []
const portraitMediaQuery = window.matchMedia("(orientation: portrait)")
const parallaxLayer = document.getElementById("parallax-hero-image-layer")

const getOptimalWidth = () => {
  const screenWidth = Math.max(window.innerWidth, window.innerHeight)
  return screenWidth <= 1280 ? 1280 : screenWidth <= 1920 ? 1920 : screenWidth <= 2560 ? 2560 : 2840
}

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
 * Check if the page is visible
 * @function
 * @returns - true if the page is visible, otherwise false
 */
function isPageVisible() {
  return !document.hidden
}

/**
 * Retrieves an image's settings based on its name
 * @function
 * @param imageName - The name of the image
 * @returns - the image's settings if found, otherwise undefined
 */
function retrieveImage(imageName: string): HeroImage | undefined {
  return heroImages.find(image => image.imageName === imageName)
}

const getHeroes = (): HeroImage[] => {
  const optimalWidth = getOptimalWidth()
  return heroImages.map(image => ({ ...image, src: image.widths[optimalWidth] }))
}

const allHeroes = getHeroes()

const loadImage = (imageUrl: string): Observable<Blob> => {
  return getAsset(imageUrl).pipe(
    mergeMap(response => from(response.blob())),
    catchError(error => {
      logger.error("Error loading image:", error)
      return throwError(() => new Error("Failed to load image"))
    })
  )
}

const setText = async (imgName: string) => {
  const headerEl = document.getElementById("CTA_header")
  const textEl = document.getElementById("CTA_paragraph")
  headerEl?.setAttribute("class", `hero-parallax__image--${imgName}`)
  textEl?.setAttribute("class", `hero-parallax__image--${imgName}`)
  }

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
          resolve()
        }
      })).pipe(
        tap(() => parallaxLayer?.prepend(img))
      )
    }),
    catchError(error => {
      logger.error("Error in fetchAndSetImage:", error)
      return of()
    })
  )
}

/**
 * Randomizes the order of the hero images
 * @function
 * @returns - an array of hero images in random order
 */
function randomizeHeroes(): HeroImage[] {
  return allHeroes.sort(() => Math.random() - 0.5)
}

let imageGenerator: Iterator<HeroImage>

/**
 * Initializes the image generator
 * @function
 */
function initializeImageGenerator() {
  imageGenerator = randomizeHeroes().values()
}

const heroesGen = (): HeroImage | undefined => {
  const nextHeroes = imageGenerator.next()
  return nextHeroes.done ? undefined : nextHeroes.value
}

const cycleImages = (): Observable<void> => {
  if (!parallaxLayer) {
    return EMPTY
  }

  const images = parallaxLayer.getElementsByTagName("img")
  const nextImage = heroesGen()

  if (nextImage) {
    return fetchAndSetImage(nextImage).pipe(
      catchError((err: Error): Observable<void> => {
        logger.error(`error fetching next image ${err}`)
        return EMPTY
      })
    )
  }

  if (images.length > 1) {
    const recycledImage = images[images.length - 1]
    parallaxLayer.prepend(recycledImage)
  }

if (images.length > 1 && nextImage === undefined) {
  const currentImage = images[0]
  parallaxLayer.appendChild(currentImage)
  if (parallaxLayer?.firstChild) {
    parallaxLayer.removeChild(parallaxLayer.firstChild)
  }
}
  return EMPTY
}
const startImageCycling = (): Observable<void> => {
    if (!parallaxLayer) {
      return EMPTY
    }

    return interval(CONFIG.INTERVAL_TIME).pipe(
      takeUntil(stopCycling$), // Automatically stop when stopCycling$ emits
      filter(() => isPageVisible()), // Only cycle images when the page is visible
      switchMap(() => cycleImages()),
      catchError((err: Error) => {
        logger.error("Error in startImageCycling:", err)
        return EMPTY
      })
    )
  }

const initializeImageCycling = (): void => {
    stopCycling$ = new Subject<void>() // Reset the stopCycling$ subject

    startImageCycling().subscribe({
      next: () => logger.info("Image cycling in progress"),
      error: (err: Error) => logger.error("Error during image cycling:", err)
    })
  }

const stopImageCycling = (): void => {
    stopCycling$.next()
  }

const handleVisibilityChange = (): Observable<void> => {
    if (isPageVisible()) {
      // Restart image cycling
      return startImageCycling()
    } else {
      stopImageCycling()
      return EMPTY
    }
  }

const createOrientationObservable = (mediaQuery: MediaQueryList): Observable<boolean> =>
    fromEventPattern<boolean>(
      handler => mediaQuery.addEventListener("change", handler),
      handler => mediaQuery.removeEventListener("change", handler),
      (event: MediaQueryListEvent) => event.matches
    )

  /**
   * Regenerates the sources of the images following a screen orientation change
   * @function
   * @param optimalWidth - The optimal width of the images
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

const orientation$ = createOrientationObservable(portraitMediaQuery).pipe(
  filter(() => isPageVisible()),
  distinctUntilChanged(),
  tap(() => {
      const currentImage = parallaxLayer?.getElementsByTagName("img")[0]
      if (currentImage) {
        const currentWidth = currentImage.width
        const optimalWidth = getOptimalWidth()
        if (currentWidth !== optimalWidth) {
          regenerateSources(optimalWidth)
        }
      }
    }),
  catchError(error => {
      logger.error("Error in orientation observable:", error)
      return EMPTY
    })
)

const locationChange$ = location$.pipe(
  distinctUntilChanged((a: URL, b: URL) => a.pathname === b.pathname),
  filter(loc => loc.pathname === "/" || loc.pathname === "/index.html" || loc.pathname === "/#"),
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

  /**
   * Loads the first image on the hero landing page
   * @function
   * @returns - an observable that emits when the first image is loaded
   */
function loadFirstImage(): Observable<void> {
  const firstImage = heroesGen() || initializeImageGenerator()
  if (firstImage) {
    logger.info(`First image's settings loaded: ${firstImage.imageName}`)
    firstImage.src = firstImage.widths[getOptimalWidth()]
    logger.info(`First image's src: ${firstImage.src}`)
    return fetchAndSetImage(firstImage).pipe(
      tap(() => logger.info("First image loaded successfully"))
    )
  } else {
    return throwError(() => new Error("First image not found"))
  }
}

const getImage = () => {
  const images = parallaxLayer?.getElementsByTagName("img")
  if (images && images.length > 0) {
    return images[0]
  } else { return undefined }
}
const imageHeight$ = of(getImage())
  .pipe(map(img => img?.height || window.innerHeight),
    shareReplay(1),

    filter(() => isPageVisible() && isElementVisible(parallaxLayer as Element)),
    distinctUntilChanged()
  )

/**
 * Sets the height of the parallax layer and its fade height based on the image height
 * @function
 * @param height - The height to set
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


function initImages() {
  initializeImageGenerator()

subscriptions.push(
  document$.pipe(
    switchMap(() => imageHeight$)
  ).subscribe({
    next: height => setParallaxHeight(height)
  })
)

subscriptions.push(loadFirstImage().pipe(
  tap(() => initSubscriptions()),
  switchMap(() => startImageCycling())
).subscribe({
    next: () => {},
    error: (err: Error) => logger.error("Error during image cycling:", err)
  }))

document$.pipe(
  first(),
  tap(() => {
      initSubscriptions()
    }),
  switchMap(() => {
      return loadFirstImage()
    }),
  tap(() => {
      initializeImageCycling()
    }),
  catchError((err: Error) => {
      logger.error("Error during initialization:", err)
      return EMPTY
    })
).subscribe({
    complete: () => logger.info("Document initialization and image cycling completed")
  })

}

location$.pipe(skipUntil(location$.pipe(filter(loc => loc.pathname === "/" || loc.pathname === "/index.html" || loc.pathname === "/#")))).subscribe(() => { initImages() })



const urlFilter = (url: URL) => (url.pathname !== "/" && url.pathname !== "/index.html" && url.pathname !== "/#") || (url.hostname !== "plainlicense.org" && url.protocol === "https:")

mergedUnsubscription$(urlFilter).subscribe({
  next: () => {
    subscriptions.forEach(sub => sub.unsubscribe())
  }
})
