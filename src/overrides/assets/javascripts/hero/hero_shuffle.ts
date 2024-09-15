import {
  Observable,
  Subscription,
  combineLatest,
  delay,
  fromEvent,
  fromEventPattern,
  interval,
  takeUntil
} from "rxjs"
import { distinctUntilChanged, filter, map, switchMap } from "rxjs/operators"

import * as imgSettings from "./hero_image_config"

/** !!! NOTE ON IMAGE HANDLING: !!!
 * Only the first child of the parallax layer is set to display. All other children of parallax layer are set to display: none. When a new image is fetched, it is prepended to the parallax layer, and the old image is pushed back a spot. The new image automatically transitions to display and the old automatically transitions to hidden (display: none). This setup provides a fallback in that we don't rely on javascript to set the display of the images. If the javascript fails, the first image will still display. We also don't have to set transitions because the change to/from first child *is* the transition.
 *
 * We use a generator to serve the images. When it's exhausted, we know we have all the images. We can then cycle through them simply by changing their position in the parallax layer.
 *
 * I wouldn't use this approach for a large number of images or extremely large images, but for a small number of images, it's a simple and effective way to handle the image cycling.
 */

const subscriptions: Subscription[] = []

const portraitMediaQuery = window.matchMedia("(orientation: portrait)")
const isPortrait = (): boolean => !!portraitMediaQuery.matches

/**
 * Retrieves the image settings for a given image name.
 *
 * This function checks if the device is in portrait mode and merges the default settings
 * with the specific settings for the requested image, returning the final settings object.
 *
 * @param imageName - The name of the image for which to retrieve settings.
 * @returns The merged settings for the specified image.
 */
const getImageSettings = (imageName: string): Map<string, imgSettings.ImageSettings> => {
  const landscapeSettings = imgSettings.imageSettings[imageName] || {}
  const portraitSettings = imgSettings.portraitImageSettings[imageName] || {}
  const combinedLandscapeSettings = {
    ...imgSettings.defaultSettings,
    ...landscapeSettings
  }
  const combinedPortraitSettings = {
    ...imgSettings.defaultSettings,
    ...imgSettings.defaultPortraitSettings,
    ...portraitSettings
  }

  return new Map(
    ["landscape", "portrait"].map(key => [
      key,
      key === "landscape"
        ? combinedLandscapeSettings
        : combinedPortraitSettings
    ])
  )
}

const parallaxLayer = document.getElementById("parallax-hero-image-layer")

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 *
 * This function randomly rearranges the elements of the provided array, ensuring that
 * each element has an equal probability of appearing in any position.
 *
 * @param array - The array to shuffle.
 * @returns The shuffled array.
 */
const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

/**
 * Generates the image data type for a given image name and root URL.
 *
 * This function constructs the image data object, including the image name, base URL,
 * URL, srcset, settings, color space, and image data.
 *
 * @param imageName - The name of the image to generate data for.
 * @param rootUrl - The root URL for the image assets.
 * @returns The generated image data object.
 */
const generateImageDataType = (
  imageName: string,
  rootUrl: string
): imgSettings.ImageDataType => {
  const combinedSettings: Map<string, imgSettings.ImageSettings> =
    getImageSettings(imageName)
  const landscapeSettings: imgSettings.ImageSettings =
    combinedSettings.get("landscape") || imgSettings.defaultSettings
  const portraitSettings: imgSettings.ImageSettings =
    combinedSettings.get("portrait") || imgSettings.defaultPortraitSettings
  const widths: string[] = ["1280", "1920", "2560", "3840"]
  const baseUrl: string = `${rootUrl}/${imageName}/${imageName}`
  const url: string = `${baseUrl}_1280.webp`
  const srcset: string = widths
    .map(
      imgWidth =>
        `${rootUrl}/${imageName}/${imageName}_${imgWidth}.webp ${imgWidth}w`
    )
    .join(", ")

  return {
    imageName,
    baseUrl,
    url,
    srcset,
    landscapeSettings,
    portraitSettings,
    colorSpace: "srgb",
    data: new Uint8ClampedArray(),
    imgWidth: "1280"
  }
}

/**
 * Generates a map of image data types from shuffled image names.
 *
 * This function retrieves the keys from the `imgSettings.imageSettings` object, shuffles them,
 * and constructs a map where each key corresponds to an `imgSettings.ImageDataType` generated
 * from the image name and a predefined root URL. This allows for dynamic image
 * data retrieval in a randomized order.
 *
 * @returns A map containing image names as keys and
 *          their corresponding `imgSettings.ImageDataType` objects as values.
 */
const getImageData = function (): Map<string, imgSettings.ImageDataType> {
  const imageNames = Object.keys(imgSettings.imageSettings)
  const shuffledImages = shuffleArray(imageNames)
  const rootUrl = "assets/images/hero"
  const imageData = new Map<string, imgSettings.ImageDataType>()
  for (const imageName of shuffledImages) {
    imageData.set(imageName, generateImageDataType(imageName, rootUrl))
  }
  return imageData
}

/**
 * Opens a connection to the IndexedDB database for image caching.
 *
 * This function creates or opens the "ImageCacheDB" database and sets up the necessary
 * object store for caching images.
 *
 * @returns A promise that resolves to the opened database instance.
 */
const openDB = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("ImageCacheDB", 1)

    request.onupgradeneeded = function (event) {
      const db = (event.target as IDBOpenDBRequest).result
      db.createObjectStore("images", { keyPath: "url" })
    }

    request.onsuccess = function (event) {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = function (event) {
      reject(`Database error: ${  (event.target as IDBOpenDBRequest).error}`)
    }
  })
}

/**
 * Retrieves an image from the cache based on the optimal URL.
 *
 * This asynchronous function attempts to get an image from the IndexedDB cache.
 * If the image is not found, it triggers the caching process.
 *
 * @param db - The database instance to use for the cache retrieval.
 * @param optimalUrl - The URL of the image to retrieve from the cache.
 * @returns A promise that resolves to the cached image blob or void.
 */
const getImageFromCache = async (
  db: IDBDatabase,
  optimalUrl: string
): Promise<Blob | void> => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["images"], "readonly")
    const objectStore = transaction.objectStore("images")
    const request = objectStore.get(optimalUrl)

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.image)
      } else {
        storeImageInCache(db, optimalUrl)
      }
    }

    request.onerror = () => reject("Failed to retrieve image from cache")
  })
}

/**
 * Stores an image in the IndexedDB cache from a specified URL or a provided Blob.
 *
 * This function either fetches an image from the given URL or uses a provided Blob to store it in the
 * IndexedDB under the "images" object store. It returns an observable that completes when the image
 * is successfully stored or emits an error if the operation fails.
 *
 * @param db - The IndexedDB database instance where the image will be stored.
 * @param optimalUrl - The URL of the image to be stored in the cache.
 * @param blob - An optional Blob or a Promise that resolves to a Blob representing the image.
 * @returns An observable that completes when the image is successfully stored or emits an error if the operation fails.
 */
const storeImageInCache = (
  db: IDBDatabase,
  optimalUrl: string,
  blob?: Blob | Promise<Blob>
): Observable<void> => {
  return new Observable(subscriber => {
    const storeBlob =
      blob || window.fetch(optimalUrl).then(response => response.blob())

    void Promise.resolve(storeBlob).then(resolvedBlob => {
      const transaction = db.transaction(["images"], "readwrite")
      const objectStore = transaction.objectStore("images")
      const request = objectStore.add({ url: optimalUrl, image: resolvedBlob })

      request.onsuccess = () => {
        subscriber.next()
        subscriber.complete()
      }
      request.onerror = () =>
        subscriber.error("Failed to store image in cache")
    })
  })
}

/**
 * Determines the optimal width for images based on the current screen width.
 *
 * This function checks the width of the window and returns the appropriate width
 * value for responsive image loading.
 *
 * @param screenWidth - The width of the screen, if available.
 * @returns The optimal width for images based on the current screen size.
 */
const determineOptimalWidth = (screenWidth?: number): string => {
  screenWidth = screenWidth || window.innerWidth
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
 * Applies the specified styles to an image element.
 *
 * This asynchronous function sets the CSS properties of the provided image element
 * based on the provided settings, including transition effects.
 *
 * @param img - The image element to which styles will be applied.
 * @param settings - The settings object containing style properties.
 * @returns A promise that resolves to the styled image element.
 */
async function setStyles(
  img: HTMLImageElement,
  settings: imgSettings.ImageSettings
): Promise<HTMLImageElement> {
  for (const [key, value] of Object.entries(settings)) {
    if (key !== "colors" && key !== "transformationSettings") {
      img.style.setProperty(key, value.toString())
    }
  }
  img.style.alignContent = "flex-start"
  img.style.alignSelf = "flex-start"
  return img
}

/**
 * Applies transformation settings to an image element.
 *
 * This asynchronous function sets the transformation properties of the provided image
 * element based on the specified transformation settings.
 *
 * @param img - The image element to which transformations will be applied.
 * @param transformationSettings - The transformation settings to apply.
 *
 * TODO: Debug this
async function applyTransformation(img: HTMLImageElement, transformationSettings: Map<string, string>) {
    img.style.transform = "none"
    requestAnimationFrame(() => {
        img.style.transition += transformationSettings.get("transition") || ""
        transformationSettings.forEach((value, key) => {
            if (key !== "transition") {
                img.style.setProperty(key, value)
            }
        })
    })
}
 */

/**
 * Creates an image element based on the provided image data.
 *
 * This asynchronous function generates an HTMLImageElement, sets its properties,
 * and applies styles based on the provided image data.
 *
 * @param imageDatum - The data object containing information about the image.
 * @param - - A flag indicating if this is the first image being created.
 * @returns A promise that resolves to the created image element or void.
 */

const fetchAndSetImage = async (
  imageDatum: imgSettings.ImageDataType,
  firstImage?: boolean
): Promise<HTMLImageElement | void> => {
  try {
    const db = await openDB()
    const optimalWidth = determineOptimalWidth()
    const optimalUrl = imageDatum
      ? `${imageDatum.baseUrl}_${optimalWidth}.webp`
      : undefined
    if (!optimalUrl) {
      return
    }
    const result = getImageFromCache(db, optimalUrl)
    const imageBlob = (await Promise.any([
      result,
      fetch(optimalUrl).then(response => response.blob())
    ])) as Blob

    if (!imageBlob || imageBlob.size === 0) {
      throw new Error("Failed to retrieve a valid image blob")
    }
    const img = new Image(Number(optimalWidth))

    const imageUrl = URL.createObjectURL(imageBlob)

    img.setAttribute("data-name", imageDatum.imageName)
    img.src = imageUrl
    img.srcset = imageDatum.srcset
    img.sizes =
      "(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px"
    img.alt = ""
    img.classList.add("hero-parallax__image")
    img.draggable = false
    img.fetchPriority = firstImage ? "high" : "auto"
    img.loading = "eager"
    const settings = isPortrait()
      ? imageDatum.portraitSettings
      : imageDatum.landscapeSettings
    const styledImg = await setStyles(img, settings)
    styledImg.onload = () => {
      setTimeout(() => URL.revokeObjectURL(imageUrl), 60000)
      requestAnimationFrame(() => {})
    }

    styledImg.onerror = () => {
      return img
    }

    return styledImg
  } catch (error) {
    // Handle the error here
  }
}

/**
 * Creates an image element based on the provided image data.
 *
 * This asynchronous function facilitates generating an HTMLImageElement based on whether or not it is the first image being created.
 *
 * @param imageDatum - The data object containing information about the image.
 * @param firstImage - A flag indicating if this is the first image being created.
 * @returns A promise that resolves to the created image element or void.
 */
const createImageElement = async (
  imageDatum: imgSettings.ImageDataType,
  firstImage?: boolean
): Promise<void | HTMLImageElement> => {
  if (firstImage) {
    return fetchAndSetImage(imageDatum, firstImage)
  } else {
    return fetchAndSetImage(imageDatum)
  }
}

/**
 * Updates the colors of the CTA elements based on the provided color settings.
 *
 * This asynchronous function applies the specified colors to the header and paragraph
 * elements, including transition effects for a smooth color change.
 *
 * @param colors - The color settings for the header and paragraph.
 * @param transition - The transition effect to apply to the color change.
 * @returns A promise that resolves when the colors have been updated.
 */
const updateColors = async (
  colors: { h1: string, p: string },
  transition = "color 5s ease-in"
): Promise<void> => {
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
}

/**
 * Retrieves and displays the first image in the parallax layer.
 *
 * This asynchronous function updates the colors of the CTA elements, creates the first
 * image element, and appends it to the specified parallax layer.
 *
 * @param imageDatum - The data object containing information about the image.
 * @returns A promise that resolves to the created image element or void.
 */
async function getFirstImage(
  imageDatum: imgSettings.ImageDataType
): Promise<HTMLImageElement | void> {
  if (!parallaxLayer || !imageDatum) {
    return
  }
  const settings = isPortrait()
    ? imageDatum.portraitSettings
    : imageDatum.landscapeSettings
  await updateColors(settings.colors)
  const imageElement = (await createImageElement(
    imageDatum,
    true
  )) as HTMLImageElement

  if (!imageElement) {
    return
  }

  // const transformationSettings = await getTransformationSettings(imageDatum.settings)

  // if (transformationSettings) {
  //        applyTransformation(imageElement, transformationSettings)
  // }

  const existingImage = parallaxLayer.getElementsByTagName(
    "img"
  )[0]
  if (existingImage) {
    await transitionImages(existingImage, imageElement)
  }
  imageElement.style.transition = "none"
  parallaxLayer.prepend(imageElement)
}

/**
 * Transitions between two images in the parallax layer.
 *
 * This asynchronous function fades out the last image and fades in the next image,
 * applying any specified transformation settings during the transition.
 *
 * @param lastImage - The image element that is currently displayed.
 * @param nextImage - The image element that will be displayed next.
 * @returns A promise that resolves when the transition is complete.
 */
async function transitionImages(
  lastImage: HTMLImageElement,
  nextImage?: HTMLImageElement
): Promise<void> {
  // removed transformationSettings until it works

  // if (transformationSettings) {
  //    applyTransformation(nextImage, transformationSettings)
  // }
  if (!parallaxLayer || !lastImage || !nextImage) {
    return
  }
  lastImage.style.transition =
    lastImage.style.transition !== "none"
      ? lastImage.style.transition
      : "opacity 1.5s ease-in"
  const lastImageElement = parallaxLayer.getElementsByClassName(
    "hero-parallax__image"
  )[0] as HTMLImageElement
  if (lastImageElement) {
    parallaxLayer.prepend(nextImage)
  }
  return
}

/**
 * A generator function that yields image data from a collection.
 *
 * This function iterates over the values of a predefined image data collection, yielding
 * each image datum one at a time. It handles potential errors during iteration and logs
 * them to the console, ensuring that the generator can be used safely in asynchronous contexts.
 *
 * @returns A generator that produces imgSettings.ImageDataType objects
 *          from the image data collection.
 */
function* imageDatumGenerator(): Generator<imgSettings.ImageDataType> {
  const imageDataResult = imageData
  if (imageDataResult && imageDataResult.size > 0) {
    try {
      for (const imageDatum of imageDataResult.values()) {
        yield imageDatum
      }
    } catch (error) {
      // do something with the error
    }
  }
}

const generatedImageData: Array<imgSettings.ImageDataType | undefined> = []

// Variables for image cycling
let generatorExhausted = false
let isPageVisible = true
let cycleImagesSubscription: Subscription | undefined
const intervalTime = 25000 // Interval for cycling images]
const imageGen = imageDatumGenerator()

const imageData = getImageData()

/**
 * Retrieves the next image datum from the image generator.
 *
 * This function checks if the image generator has been exhausted. If not, it retrieves
 * the next image datum from the generator. If the generator is exhausted or no
 * image datum is available, it sets the `generatorExhausted` flag to true and returns null.
 *
 * @returns The next image datum if available, or null if the
 *          generator has been exhausted or no datum is found.
 */
const imageDatumGen = function (): imgSettings.ImageDataType | undefined {
  if (generatorExhausted) {
    return undefined
  }
  const nextImageDatum = imageGen.next().value
  if (nextImageDatum) {
    return nextImageDatum
  } else {
    generatorExhausted = true
    return undefined
  }
}

/**
 * Stops the cycling of images in the parallax layer.
 *
 * This function clears the interval timer used for cycling images, effectively stopping
 * the image cycling process.
 */
const stopImageCycling = (): void => {
  if (cycleImagesSubscription) {
    cycleImagesSubscription.unsubscribe()
    cycleImagesSubscription = undefined
  }
}

/**
 * Starts the process of cycling through images in the parallax layer.
 *
 * This function checks if the first image is present and if the page is visible.
 * If both conditions are met, it sets up an interval to trigger image cycling at
 * specified time intervals, while also managing subscriptions to viewport and location changes.
 *
 * @returns A promise that resolves when the image cycling process has been initiated.
 */
const startImageCycling = async (): Promise<void> => {
  const firstImage = parallaxLayer
    ? (parallaxLayer.getElementsByTagName("img")[0])
    : undefined
  if (firstImage && isPageVisible) {
    delay(intervalTime)

    if (cycleImagesSubscription) {
      cycleImagesSubscription.unsubscribe()
    }

    const interval$ = interval(intervalTime)

    cycleImagesSubscription = combineLatest([interval$, viewport$, location$])
      .pipe(takeUntil(location$))
      .subscribe(([,]) => {
        void cycleImages()
      })
  }
}

/**
 * Handles changes in the visibility state of the document.
 *
 * This function is triggered when the visibility of the page changes. It updates the `isPageVisible` flag and starts or stops image cycling based on whether the page is currently visible or hidden.
 */
const handleVisibilityChange = (): void => {
  if (document.hidden) {
    isPageVisible = false
    stopImageCycling()
  } else {
    isPageVisible = true
    void startImageCycling()
  }
}

/**
 * Fetches the first image from a specified parallax layer.
 *
 * This asynchronous function checks if there are any images within the parallax layer. If no images are found and the parallax layer exists, it retrieves the first image data and invokes the `getFirstImage` function to process it.
 *
 * @returns A promise that resolves when the image has been processed or if no action is taken.
 */
const fetchFirstImage = async (): Promise<void> => {
  try {
    const datum = imageDatumGen()
    generatedImageData.push(datum)
    if (datum) {
      await getFirstImage(datum)
    }
  } catch (error) {
    // Handle the error here
  }
}

/**
 * Maps HTMLImageElements to their corresponding imgSettings.ImageDataType based on a data attribute.
 *
 * This function iterates over an array of HTMLImageElement objects, retrieves the value of the
 * "data-name" attribute, and uses it to find and store the associated imgSettings.ImageDataType in a Map.
 *
 * @param images - An array of HTMLImageElement objects to be processed.
 * @returns A Map where the keys are image names and the values are
 *                                        the corresponding imgSettings.ImageDataType objects.
 */
const mapImageData = (
  images: Array<HTMLImageElement>
): Map<string, imgSettings.ImageDataType> => {
  const imageMap = new Map<string, imgSettings.ImageDataType>()
  for (const image of images) {
    const imageName = image.getAttribute("data-name")
    if (imageName && generatedImageData) {
      const imageDatum = generatedImageData.find(datum =>
        datum ? datum.imageName === imageName : undefined
      )
      if (imageDatum) {
        imageMap.set(imageName, imageDatum)
      }
    }
  }
  return imageMap
}

/**
 * Injects new styling settings into an image based on its orientation.
 *
 * This function updates the styles of the specified image and all other images
 * in the parallax layer according to the provided orientation ('portrait' or 'landscape'),
 * using predefined settings mapped to each image's data attributes.
 *
 * @param image - The image element to apply new settings to.
 * @param changeTo - The orientation to change the image settings to.
 */
const injectNewSettings = (
  image: HTMLImageElement,
  changeTo: "portrait" | "landscape"
): void => {
  const images = parallaxLayer ? parallaxLayer.getElementsByTagName("img") : []
  const imageMap = mapImageData(Array.from(images))
  const currentImage = images ? (images[0]) : undefined
  if (!currentImage) {
    return
  } else {
    const currentDatum = imageMap.get(
      currentImage.getAttribute("data-name") || ""
    )
    const settings =
      changeTo === "portrait"
        ? currentDatum
          ? currentDatum.portraitSettings
          : undefined
        : currentDatum
        ? currentDatum.landscapeSettings
        : undefined
    if (settings) {
      image.style.transition = "none"
      void setStyles(image, settings)
      void updateColors(settings.colors, "none")
    }
  }
  const otherImages = Array.from(images).slice(1)
  for (const img of otherImages) {
    const imgDatum = imageMap.get(img.getAttribute("data-name") || "")
    if (imgDatum) {
      const settings =
        changeTo === "portrait"
          ? imgDatum.portraitSettings
          : imgDatum.landscapeSettings
      if (settings) {
        void setStyles(img, settings)
      }
    }
  }
}

/**
 * Cycles through images in a parallax layer, transitioning between them.
 *
 * This function creates an Observable that emits the result of transitioning
 * from the last displayed image to the next image generated or the last image
 * in the parallax layer, handling both cases of image generation and exhaustion.
 *
 * @returns An Observable that completes when the image transition
 *          is finished or errors if an issue occurs during the image creation or transition.
 */
const cycleImages = async (): Promise<Observable<void>> => {
  return new Observable(subscriber => {
    const images = parallaxLayer
      ? parallaxLayer.getElementsByTagName("img")
      : []
    const lastImage = images[0]

    if (!generatorExhausted) {
      const nextDatum = imageDatumGen()
      generatedImageData.push(nextDatum)
      if (nextDatum) {
        createImageElement(nextDatum)
          .then(nextImage => {
            transitionImages(lastImage, nextImage as HTMLImageElement).then(() => {
              subscriber.complete()
            }).catch(err => subscriber.error(err))
          })
          .catch(err => subscriber.error(err))
      } else {
        subscriber.complete()
      }
    } else {
      const nextImage = images[images.length - 1] // last image is the first image because we always prepend
      if (nextImage) {
        transitionImages(lastImage, nextImage)
          .then(() => {
            subscriber.complete()
          })
          .catch(err => subscriber.error(err))
      } else {
        subscriber.complete()
      }
    }
  })
}

export const shuffle = async (): Promise<void> => {
  try {
    await fetchFirstImage()
    void startImageCycling()
  } catch (error) {
    // Handle the error here
  }
}
const createOrientationObservable = (
    mediaQuery: MediaQueryList
): Observable<boolean> => {
    return fromEventPattern<boolean>(
      handler => {
        mediaQuery.addEventListener("change", handler)
        return () => mediaQuery.removeEventListener("change", handler)
      },
      (_, event: MediaQueryListEvent) => event.matches
    )
  }

  // observable that monitors changes in viewport orientation if the page is visible
const orientation$ = createOrientationObservable(portraitMediaQuery).pipe(
  filter(() => isPageVisible === true),
  map((event: boolean) => event),
  distinctUntilChanged()
)

const initSubscriptions = async (): Promise<void> => {
  orientation$.subscribe(() => {
    if (isPortrait() && parallaxLayer) {
      injectNewSettings(
        parallaxLayer.getElementsByTagName("img")[0],
        "portrait"
      )
    } else if (parallaxLayer) {
      // we inject new settings when the orientation changes for existing images; new images will have the correct settings

      injectNewSettings(
        parallaxLayer.getElementsByTagName("img")[0],
        "landscape"
      )
    }
  })

  // we subscribe to the visibility change event
  subscriptions.push(
    document$
      .pipe(switchMap(doc => fromEvent(doc, "visibilitychange")))
      .subscribe(() => handleVisibilityChange())
  )

  subscriptions.push(
    location$
      .pipe(
        distinctUntilChanged(
          (a: URL, b: URL) => a === b || a.pathname === b.pathname
        ),
        filter(loc => loc.pathname === "/" || loc.pathname === "/index.html"),
        map(() => {
          stopImageCycling()
          return undefined // Ensure map returns a value
        })
      )
      .subscribe()
  )
}

void initSubscriptions()

window.addEventListener("beforeunload", () => {
  stopImageCycling()
  subscriptions.forEach(sub => sub.unsubscribe())
})
