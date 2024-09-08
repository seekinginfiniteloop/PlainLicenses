/** ------------ Hero Image Shuffle -------------
 * This script handles the dynamic loading and cycling of hero images on the home page.
 * It uses IndexedDB for image caching and applies transformations to images for visual effects.
 * The script also includes utility functions for color management and image settings, so images can be customized based on predefined styles and orientations.
 *
*/

/**
 * Delays the execution for a specified amount of time.
 *
 * This function returns a promise that resolves after a given number of milliseconds,
 * optionally returning a value when the promise resolves.
 *
 * @param {number} t - The duration of the delay in milliseconds.
 * @param {any} [val] - An optional value to be returned when the promise resolves.
 * @returns {Promise<any>} A promise that resolves after the specified delay.
 */
function delay(t: number, val?: any): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, t, val));
}

let globalAbortController = new AbortController();

/**
 * Resets the global AbortController instance.
 *
 * This function aborts any ongoing operations associated with the current global
 * AbortController and creates a new instance, allowing for fresh abort signals
 * to be issued for subsequent operations.
 *
 * @returns {void} This function does not return a value.
 * @throws {AbortError} Throws an error if there are ongoing operations that are aborted.
 */
function resetAbortController() {
    globalAbortController.abort();
    globalAbortController = new AbortController();
}

// Listen for navigation events
window.addEventListener('beforeunload', resetAbortController);

/**
 * An object representing various color values used in the application.
 *
 * This object contains color definitions that can be referenced throughout the code
 * to maintain consistency in color usage.
 *
 * @type {Object}
 * @property {string} atomicOrange - The color value for atomic orange.
 * @property {string} aqua - The color value for aqua.
 * @property {string} aquamarine - The color value for aquamarine.
 * @property {string} blueBlue - The color value for blue blue.
 * @property {string} darkEmerald - The color value for dark emerald.
 * @property {string} dutchWhite - The color value for dutch white.
 * @property {string} ecru - The color value for ecru.
 * @property {string} emerald - The color value for emerald.
 * @property {string} mindaro - The color value for mindaro.
 * @property {string} white - The color value for white.
 * @property {string} zaffre - The color value for zaffre.
 */
const colors = {
    atomicOrange: "var(--atomic-tangerine)",
    aqua: "var(--aqua)",
    aquamarine: "var(--aquamarine)",
    blueBlue: "var(--blue-blue)",
    darkEmerald: "var(--dark-emerald)",
    dutchWhite: "var(--dutch-white)",
    ecru: "var(--ecru)",
    emerald: "var(--emerald)",
    mindaro: "var(--mindaro)",
    white: "white",
    zaffre: "var(--zaffre)",
};

/**
 * Interface representing the settings for an image.
 *
 * This interface defines the structure of the settings object that can be applied to images,
 * including color settings, dimensions, and transformation properties.
 *
 * @interface ImageSettings
 * @property {{ h1: string; p: string }} colors - The color settings for the image.
 * @property {string} [height] - The height of the image.
 * @property {string} [animation] - The animation settings for the image.
 * @property {string} [perspective] - The perspective setting for the image.
 * @property {string} [perspectiveOrigin] - The origin point for the perspective.
 * @property {string} [transition] - The transition settings for the image.
 * @property {string} [transitionBehavior] - The behavior of the transition.
 * @property {string} [transform] - The transformation settings for the image.
 * @property {string} [transformOrigin] - The origin point for the transformation.
 * @property {string} [transformStyle] - The style of the transformation.
 * @property {string} [translate] - The translation settings for the image.
 * @property {string} [scale] - The scale settings for the image.
 * @property {string} [objectFit] - The fit settings for the image.
 * @property {string} [objectPosition] - The position settings for the image.
 */
interface ImageSettings {
    colors: { h1: string; p: string };
    height?: string;
    animation?: string;
    perspective?: string;
    perspectiveOrigin?: string;
    transition?: string;
    transitionBehavior?: string;
    transform?: string; // TODO: get translated transforms to work
    transformOrigin?: string;
    transformStyle?: string;
    translate?: string;
    scale?: string;
    objectFit?: string;
    objectPosition?: string;
}

/**
 * Default settings for images.
 *
 * This object contains the default settings that will be applied to images unless overridden
 * by specific settings.
 *
 * @type {ImageSettings}
 */
const defaultSettings: ImageSettings = {
    colors: { h1: colors.emerald, p: colors.emerald },
    scale: "1.1",
    objectFit: "scale-down",
    perspective: "50em",
    perspectiveOrigin: "center bottom",
    // TODO: get translated transforms to work
};

/**
 * A record of image settings keyed by image name.
 *
 * This object holds specific settings for different images, allowing for customization
 * of each image's appearance and behavior.
 *
 * @type {Record<string, ImageSettings>}
 */
const imageSettings: Record<string, ImageSettings> = {
    anime: { colors: { h1: colors.atomicOrange, p: colors.emerald } },
    artbrut: { colors: { h1: colors.atomicOrange, p: colors.aqua } },
    comic: { colors: { h1: colors.aquamarine, p: colors.white } },
    fanciful: {
        colors: { h1: colors.mindaro, p: colors.aqua },
        perspectiveOrigin: "30% 20%",
        scale: "1",
        objectPosition: "center bottom",
        translate: "0% -30%",
    },
    fantasy: {
        colors: { h1: colors.white, p: colors.mindaro },
        scale: "1",
        objectPosition: "center bottom",
        translate: "0% -20%",
    },
    farcical: {
        colors: { h1: colors.atomicOrange, p: colors.aqua },
        scale: "1",
        translate: "0% -35%",
    },
    fauvist: { colors: { h1: colors.mindaro, p: colors.white } },
    minimal: {
        colors: { h1: colors.atomicOrange, p: colors.atomicOrange },
        objectPosition: "center bottom",
        scale: "1",
        perspective: "50rem",
        translate: "0% -25%",
    },
    mystical: {
        colors: { h1: colors.blueBlue, p: colors.white },
        scale: "1",
        perspective: "40rem",
        objectPosition: "center bottom",
        translate: "0% -25%",
    },
    surreal: {
        colors: { h1: colors.white, p: colors.atomicOrange },
        scale: "1",
        translate: "0% -25%",
    },
};

/**
 * Default settings for portrait images.
 *
 * This object contains the default settings that will be applied to portrait images.
 *
 * @type {ImageSettings}
 */
const defaultPortraitSettings: ImageSettings = {
    colors: { h1: colors.emerald, p: colors.emerald },
    scale: "1.4",
    objectFit: "cover",
    objectPosition: "center bottom",
};

/**
 * A record of portrait image settings keyed by image name.
 *
 * This object holds specific settings for different portrait images, allowing for customization
 * of each portrait image's appearance and behavior.
 *
 * @type {Record<string, ImageSettings>}
 */
const portraitImageSettings: Record<string, ImageSettings> = {
    anime: {
        colors: { h1: colors.atomicOrange, p: colors.white },
        perspective: "-50rem",
        scale: "1.8",
        translate: "0% 40%",
    },
    artbrut: { colors: { h1: colors.atomicOrange, p: colors.aqua }, translate: "0% 20%" },
    comic: { colors: { h1: colors.atomicOrange, p: colors.aqua }, translate: "0% 20%" },
    fanciful: { colors: { h1: colors.mindaro, p: colors.atomicOrange }, translate: "0% 20%" },
    fantasy: { colors: { h1: colors.atomicOrange, p: colors.mindaro }, translate: "0% 20%" },
    farcical: { colors: { h1: colors.mindaro, p: colors.aqua }, translate: "0% 16%" },
    fauvist: { colors: { h1: colors.mindaro, p: colors.white }, translate: "0% 18%" },
    minimal: { colors: { h1: colors.atomicOrange, p: colors.white }, translate: "0% 20%" },
    mystical: { colors: { h1: colors.white, p: colors.aquamarine }, translate: "0% 20%" },
    surreal: { colors: { h1: colors.white, p: colors.atomicOrange }, translate: "0% 20%" },
};

/**
 * Retrieves the image settings for a given image name.
 *
 * This function checks if the device is in portrait mode and merges the default settings
 * with the specific settings for the requested image, returning the final settings object.
 *
 * @param {string} imageName - The name of the image for which to retrieve settings.
 * @returns {ImageSettings} The merged settings for the specified image.
 */
const getImageSettings = (imageName: string): ImageSettings => {
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    const landscapeSettings = imageSettings[imageName] || {};
    const portraitSettings = portraitImageSettings[imageName] || {};

    return {
        ...defaultSettings,
        ...landscapeSettings,
        ...(isPortrait ? { ...defaultPortraitSettings, ...portraitSettings } : {}),
    };
};

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 *
 * This function randomly rearranges the elements of the provided array, ensuring that
 * each element has an equal probability of appearing in any position.
 *
 * @param {T[]} array - The array to shuffle.
 * @returns {T[]} The shuffled array.
 */
const shuffle = <T>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

/**
 * Interface representing the data structure for image information.
 *
 * This interface defines the properties that describe an image, including its name,
 * URL, settings, and other relevant data.
 *
 * @interface ImageDataType
 * @property {string} imageName - The name of the image.
 * @property {string} baseUrl - The base URL for the image.
 * @property {string} url - The full URL for the image.
 * @property {string} srcset - The srcset attribute for responsive images.
 * @property {ImageSettings} settings - The settings associated with the image.
 * @property {PredefinedColorSpace} colorSpace - The color space of the image.
 * @property {Uint8ClampedArray} data - The image data as a Uint8ClampedArray.
 * @property {string} imgWidth - The width of the image.
 */
interface ImageDataType {
    imageName: string;
    baseUrl: string;
    url: string;
    srcset: string;
    settings: ImageSettings;
    colorSpace: PredefinedColorSpace;
    data: Uint8ClampedArray;
    imgWidth: string;
}

/**
 * Utility type to extract the resolved type of a promise.
 *
 * This type checks if a given type is a promise and extracts the type of the value
 * that the promise resolves to.
 *
 * @type {PromiseType<T>}
 * @template T - The type to check.
 */
type PromiseType<T> = T extends Promise<infer R> ? R : T;

const parallaxLayer = document.getElementById('parallax-hero-image-layer');

/**
 * Performs a fetch request that can be aborted using an AbortController.
 *
 * This asynchronous function enhances the standard fetch API by allowing the request
 * to be aborted if the global abort controller's signal is triggered. It merges any
 * existing signal from the `init` parameter with the global signal to ensure that
 * both can control the fetch request's lifecycle.
 *
 * @param {RequestInfo | URL} input - The resource to fetch, either as a URL string or a Request object.
 * @param {RequestInit} [init={}] - An optional configuration object for the fetch request.
 * @returns {Promise<Response>} A promise that resolves to the Response object representing the response to the request.
 * @throws {AbortError} Throws an error if the fetch request is aborted.
 */
async function abortableFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const { signal } = globalAbortController;
    if (init.signal) {
        (init as any).signal = AbortSignal.any([init.signal, signal]);
    } else {
        (init as any).signal = signal;
    }
    return fetch(input, init);
}

/**
 * Generates the image data type for a given image name and root URL.
 *
 * This function constructs the image data object, including the image name, base URL,
 * URL, srcset, settings, color space, and image data.
 *
 * @param {string} imageName - The name of the image to generate data for.
 * @param {string} rootUrl - The root URL for the image assets.
 * @returns {ImageDataType} The generated image data object.
 */
const generateImageDataType = (
    imageName: string,
    rootUrl: string
): ImageDataType => {
    const settings: ImageSettings = getImageSettings(imageName);
    const widths: string[] = ["1280", "1920", "2560", "3840"];
    const baseUrl: string = `${rootUrl}/${imageName}/${imageName}`;
    const url: string = `${baseUrl}_1280.webp`;
    const srcset: string = widths
        .map(
            (imgWidth) =>
                `${rootUrl}/${imageName}/${imageName}_${imgWidth}.webp ${imgWidth}w`
        )
        .join(", ");

    return {
        imageName,
        baseUrl,
        url,
        srcset,
        settings,
        colorSpace: "srgb",
        data: new Uint8ClampedArray(),
        imgWidth: "1280",
    };
};


const getImageData = function (): Map<string, ImageDataType> {
    const imageNames = Object.keys(imageSettings);
    const shuffledImages = shuffle(imageNames);
    const rootUrl = "assets/images/hero";
    const imageData = new Map<string, ImageDataType>();
    for (const imageName of shuffledImages) {
        imageData.set(imageName, generateImageDataType(imageName, rootUrl));
    }
    return imageData;
};
const imageData = getImageData();
/**
 * Opens a connection to the IndexedDB database for image caching.
 *
 * This function creates or opens the "ImageCacheDB" database and sets up the necessary
 * object store for caching images.
 *
 * @returns {Promise<IDBDatabase>} A promise that resolves to the opened database instance.
 */
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open("ImageCacheDB", 1);

        request.onupgradeneeded = function (event) {
            const db = (event.target as IDBOpenDBRequest).result;
            db.createObjectStore("images", { keyPath: "url" });
        };

        request.onsuccess = function (event) {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = function (event) {
            reject("Database error: " + (event.target as IDBOpenDBRequest).error);
        };
    });
};

/**
 * Retrieves an image from the cache based on the optimal URL.
 *
 * This asynchronous function attempts to get an image from the IndexedDB cache.
 * If the image is not found, it triggers the caching process.
 *
 * @param {IDBDatabase} db - The database instance to use for the cache retrieval.
 * @param {string} optimalUrl - The URL of the image to retrieve from the cache.
 * @returns {Promise<Blob | void>} A promise that resolves to the cached image blob or void.
 */
const getImageFromCache = async (
    db: IDBDatabase,
    optimalUrl: string
): Promise<Blob | void> => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["images"], "readonly");
        const objectStore = transaction.objectStore("images");
        const request = objectStore.get(optimalUrl);

        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.image);
            } else {
                storeImageInCache(db, optimalUrl);
            }
        };

        request.onerror = () => reject("Failed to retrieve image from cache");
    });
};

/**
 * Stores an image in the cache using the provided URL and blob.
 *
 * This asynchronous function adds an image to the IndexedDB cache, allowing for
 * faster retrieval in the future.
 *
 * @param {IDBDatabase} db - The database instance to use for storing the image.
 * @param {string} optimalUrl - The URL of the image to store in the cache.
 * @param {Blob | Promise<Blob>} [blob] - The image blob to store; if not provided,
 * it will be fetched from the URL.
 * @returns {Promise<void>} A promise that resolves when the image is successfully stored.
 */
const storeImageInCache = async (
    db: IDBDatabase,
    optimalUrl: string,
    blob?: Blob | Promise<Blob>
): Promise<void> => {
    blob = blob || (await abortableFetch(optimalUrl).then((response) => response.blob()));
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["images"], "readwrite");
        const objectStore = transaction.objectStore("images");
        const request = objectStore.add({ url: optimalUrl, image: blob });
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Failed to store image in cache");
    });
};

/**
 * Determines the optimal width for images based on the current screen width.
 *
 * This function checks the width of the window and returns the appropriate width
 * value for responsive image loading.
 *
 * @returns {string} The optimal width for images based on the current screen size.
 */
const determineOptimalWidth = (): string => {
    const screenWidth = window.innerWidth;
    if (screenWidth <= 1280) {
        return "1280";
    }
    if (screenWidth <= 1920) {
        return "1920";
    }
    if (screenWidth <= 2560) {
        return "2560";
    }
    return "3840";
};

/**
 * Retrieves transformation settings from the provided image settings.
 *
 * This asynchronous function extracts transformation-related settings from the
 * image settings object and returns them in a Map for easy access.
 *
 * @param {ImageSettings} settings - The settings object from which to extract transformations.
 * @returns {Promise<Map<string, string>>} A promise that resolves to a Map of transformation settings.
 */
async function getTransformationSettings(settings: ImageSettings) {
    const transformationSettings = new Map<string, string>();
    for (const [key, value] of Object.entries(settings)) {
        if (key.startsWith("transform") || key === "transition") {
            transformationSettings.set(key, value);
        }
    }
    return transformationSettings;
}

/**
 * Applies the specified styles to an image element.
 *
 * This asynchronous function sets the CSS properties of the provided image element
 * based on the provided settings, including transition effects.
 *
 * @param {HTMLImageElement} img - The image element to which styles will be applied.
 * @param {ImageSettings} settings - The settings object containing style properties.
 * @returns {Promise<HTMLImageElement>} A promise that resolves to the styled image element.
 */
async function setStyles(img: HTMLImageElement, settings: ImageSettings): Promise<HTMLImageElement> {
    for (const [key, value] of Object.entries(settings)) {
        if ((value && key !== "colors")) { // TODO: debug || key.startsWith("transform") || key === "transition") {
            img.style.setProperty(key, value.toString());
        }
    }
    img.style.alignContent = "flex-start";
    img.style.alignSelf = "flex-start";
    return img;
}

/**
 * Applies transformation settings to an image element.
 *
 * This asynchronous function sets the transformation properties of the provided image
 * element based on the specified transformation settings.
 *
 * @param {HTMLImageElement} img - The image element to which transformations will be applied.
 * @param {Map<string, string>} transformationSettings - The transformation settings to apply.
 *
 * TODO: Debug this
 */
async function applyTransformation(img: HTMLImageElement, transformationSettings: Map<string, string>) {
    img.style.transform = "none";
    requestAnimationFrame(() => {
        img.style.transition += transformationSettings.get("transition") || "";
        transformationSettings.forEach((value, key) => {
            if (key !== "transition") {
                img.style.setProperty(key, value);
            }
        });
    });
}
/**
 * Creates an image element based on the provided image data.
 *
 * This asynchronous function generates an HTMLImageElement, sets its properties,
 * and applies styles based on the provided image data.
 *
 * @param {ImageDataType} imageDatum - The data object containing information about the image.
 * @param {boolean} [firstImage] - A flag indicating if this is the first image being created.
 * @returns {Promise<HTMLImageElement | void>} A promise that resolves to the created image element or void.
 */

const createImageElement = async (
    imageDatum: ImageDataType,
    firstImage?: boolean
): Promise<HTMLImageElement | void> => {
    try {
        const db = await openDB();
        const optimalWidth = determineOptimalWidth();
        const optimalUrl = imageDatum ? `${imageDatum.baseUrl}_${optimalWidth}.webp` : null;
        if (!optimalUrl) {
            throw new Error("Failed to determine optimal URL for image");
        }
        const result = getImageFromCache(db, optimalUrl);
        const imageBlob = (await Promise.any([result, abortableFetch(optimalUrl).then((response) => response.blob())])) as Blob;

        if (!imageBlob || imageBlob.size === 0) {
            throw new Error("Failed to retrieve a valid image blob");
        }
        const img = new Image(Number(optimalWidth));

        const imageUrl = URL.createObjectURL(imageBlob);

        img.src = imageUrl;
        img.srcset = imageDatum.srcset;
        img.sizes =
            "(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px";
        img.alt = "";
        img.classList.add("hero-parallax__image");
        img.draggable = false;
        img.fetchPriority = firstImage ? "high" : "auto";
        img.loading = "eager";
        const styledImg = await setStyles(img, imageDatum.settings);

        styledImg.onload = () => {
            setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);
            requestAnimationFrame(() => {
            });
        };

        styledImg.onerror = (error: any) => {
            console.error("Image failed to load:", imageDatum.imageName, error);
            throw new Error("Failed to load image");
        };

        return styledImg;
    } catch (error) {
        console.error("Error in createImageElement:", error);
    }
};

/**
 * Updates the colors of the CTA elements based on the provided color settings.
 *
 * This asynchronous function applies the specified colors to the header and paragraph
 * elements, including transition effects for a smooth color change.
 *
 * @param {{ h1: string; p: string }} colors - The color settings for the header and paragraph.
 * @returns {Promise<void>} A promise that resolves when the colors have been updated.
 */
const updateColors = async (colors: { h1: string; p: string }): Promise<void> => {
    const h1 = document.getElementById("CTA_header");
    const p = document.getElementById("CTA_paragraph");

    if (h1) {
        h1.style.transition = "color 0.5s ease-in";
        h1.style.color = colors.h1;
    }
    if (p) {
        p.style.transition = "color 0.5s ease-in";
        p.style.color = colors.p;
    }
};

/**
 * Retrieves and displays the first image in the parallax layer.
 *
 * This asynchronous function updates the colors of the CTA elements, creates the first
 * image element, and appends it to the specified parallax layer.
 *
 * @param {ImageDataType} imageDatum - The data object containing information about the image.
 * @param {HTMLElement} parallaxLayer - The layer to which the image will be appended.
 * @returns {Promise<HTMLImageElement | void>} A promise that resolves to the created image element or void.
 */
async function getFirstImage(imageDatum: ImageDataType): Promise<HTMLImageElement | void> {
    if (!parallaxLayer || !imageDatum) {
        console.error("Invalid parallax layer or image data");
        return;
    }
    updateColors(imageDatum.settings.colors);
    const imageElement = await createImageElement(imageDatum, true);

    if (!imageElement) {
        console.error("Failed to create image element");
        return reloadOnFailure();
    }

    // const transformationSettings = await getTransformationSettings(imageDatum.settings);

    // if (transformationSettings) {
    //        applyTransformation(imageElement, transformationSettings);
    // }

    const existingImage = parallaxLayer.getElementsByTagName('img')[0] as HTMLImageElement;
    if (existingImage) {
        console.log("Existing image found on first load; attempting transition.");
        transitionImages(existingImage, imageElement);
    }
    imageElement.style.transition = "none";
    parallaxLayer.prepend(imageElement);
}

/**
 * Transitions between two images in the parallax layer.
 *
 * This asynchronous function fades out the last image and fades in the next image,
 * applying any specified transformation settings during the transition.
 *
 * @param {HTMLImageElement} lastImage - The image element that is currently displayed.
 * @param {HTMLImageElement} nextImage - The image element that will be displayed next.
 * @param {Map<string, string>} [transformationSettings] - The transformation settings to apply to the next image.
 * @returns {Promise<void>} A promise that resolves when the transition is complete.
 */
async function transitionImages(lastImage: HTMLImageElement, nextImage?: HTMLImageElement, transitionTime: number = 1600, transformationSettings?: Map<string, string>): Promise<void> {
    console.log('Transitioning images');
    //if (transformationSettings) {
    //    applyTransformation(nextImage, transformationSettings);
    //}
    if (!parallaxLayer || !lastImage || !nextImage) {
        console.error("Invalid parallax layer or image elements");
        return;
    }
    lastImage.style.transition = lastImage.style.transition !== "none" ? lastImage.style.transition : "opacity 1.5s ease-in";
    const lastImageElement = parallaxLayer.getElementsByClassName('hero-parallax__image')[0] as HTMLImageElement;
    console.log('lastImageElement', lastImageElement);
    if (lastImageElement) {
        parallaxLayer.prepend(nextImage);
        console.log("prepended next image");
        //lastImageElement.addEventListener('transitionend', () => {
          //  lastImageElement.remove();
            //console.log('last image removed');
        //});
    }
    return;
}
function* imageDatumGenerator(): Generator<ImageDataType> {
    const imageDataResult = imageData;
    if (imageDataResult && imageDataResult.size > 0) {
        try {
            for (const imageDatum of imageDataResult.values()) {
                yield imageDatum;
            }
        } catch (error) {
            console.error("Error in imageDatumGenerator:", error);
        }
    }
}

// Variables for image cycling
let generatorExhausted = false;
let reloadAttempts = 0;
let isPageVisible = true;
let cycleImagesInterval: NodeJS.Timeout | null = null;
const interval = 25000; // Interval for cycling images]
const imageGen = imageDatumGenerator();

const imageDatumGen = function (): ImageDataType | null {
    if (generatorExhausted) {
        return null;
    }
    const nextImageDatum = imageGen.next().value;
    if (nextImageDatum) {
        return nextImageDatum;
    }
    else {
        generatorExhausted = true;
        return null;
    }
};

/**
 * Reloads the current image in the parallax layer upon failure to display.
 *
 * This asynchronous function checks the visibility of the current image and attempts to
 * reload it if certain conditions are met, such as the document being fully loaded and
 * not hidden or focused. If the reload attempts exceed a specified limit, it logs an error
 * and reloads the entire page.
 *
 * @returns {Promise<void>} A promise that resolves when the reload attempt is complete.
 * @throws {Error} Throws an error if the image reload fails, triggering a page reload.
 */
const reloadOnFailure = async (): Promise<void> => {
    console.log('reload triggered');
    if (reloadAttempts > 4) {
        console.error('Exceeded reload attempts');
        return;
    }
    const currentImage = parallaxLayer ? parallaxLayer.getElementsByTagName('img')[0] as HTMLImageElement : null;
    if (document.readyState === 'complete' && !document.hidden && !document.hasFocus()) {
        if (currentImage && parallaxLayer) {
            try {
                const copiedImage = currentImage.cloneNode(true) as HTMLImageElement;
                transitionImages(currentImage, copiedImage);
            } catch (error) {
                console.error('Failed to reload image:', error);
                reloadAttempts++;
                window.location.reload();
            }
        } else {
            reloadAttempts++;
            window.location.reload();
        }
    }
};

/**
 * Stops the cycling of images in the parallax layer.
 *
 * This function clears the interval timer used for cycling images, effectively stopping
 * the image cycling process.
 *
 * @returns {void} This function does not return a value.
 */
const stopImageCycling = (): void => {
    if (cycleImagesInterval) {
        clearInterval(cycleImagesInterval);
        cycleImagesInterval = null;
    }
};


/**
 * Initiates the cycling of images in the parallax layer at a specified interval.
 *
 * This asynchronous function retrieves the first image from the parallax layer and starts an interval timer to cycle through the images. If the page is visible, it applies a delay before beginning the cycling process.
 *
 * @returns {Promise<void>} A promise that resolves when the image cycling has started.
 */
const startImageCycling = async (): Promise<void> => {
    const firstImage = parallaxLayer ? parallaxLayer.getElementsByTagName('img')[0] as HTMLImageElement : null;
    if (firstImage && isPageVisible) {
        console.log("waiting on first image to finish its cycle");
        await delay(interval);
    }
    if (isPageVisible) {
    cycleImagesInterval = setInterval(async () => {
            await cycleImages();
        }, interval);
    }
}

/**
 * Handles changes in the visibility state of the document.
 *
 * This function is triggered when the visibility of the page changes. It updates the `isPageVisible` flag and starts or stops image cycling based on whether the page is currently visible or hidden.
 *
 * @returns {void} This function does not return a value.
 */
const handleVisibilityChange = (): void => {
    if (document.hidden) {
        isPageVisible = false;
        stopImageCycling();
    } else {
        isPageVisible = true;
        startImageCycling();
    }
}

/**
 * Fetches the first image from a specified parallax layer.
 *
 * This asynchronous function checks if there are any images within the parallax layer. If no images are found and the parallax layer exists, it retrieves the first image data and invokes the `getFirstImage` function to process it.
 *
 * @returns {Promise<void>} A promise that resolves when the image has been processed or if no action is taken.
 */
const fetchFirstImage = async (): Promise<void> => {
    try {
        const datum = imageDatumGen();
        if (datum) {
            await getFirstImage(datum);
        }
    } catch (error) {
        console.error("Error fetching first image:", error);
    }
}


/**
 * Cycles through images in a parallax layer asynchronously.
 *
 * This function retrieves the current image and updates the index to point to the next image in the sequence. If the next image is successfully fetched, it transitions to that image; otherwise, it logs an error and triggers a reload on failure.
 *
 * @returns {Promise<void>} A promise that resolves when the image cycling operation is complete.
 */
const cycleImages = async (): Promise<void> => {
    const images = parallaxLayer ? parallaxLayer.getElementsByTagName('img') : [];
    if (!generatorExhausted) {
        const nextDatum = imageDatumGen();
        if (nextDatum) {
            const nextImage = await createImageElement(nextDatum);
            if (nextImage) {
                nextImage.onload = async () => {
                    await transitionImages(images[0] as HTMLImageElement, nextImage);
                }
            }
        }
    } else { // if generator exhausted, we already have all images
        const currentImage = images[0] as HTMLImageElement;
        const nextImage = images[-1] as HTMLImageElement; // last image is the first image because we always prepend
        if (nextImage) {
            await transitionImages(currentImage, nextImage);
        }
    }
};

fetchFirstImage();
// Add event listener for visibility change
document.addEventListener('visibilitychange', handleVisibilityChange);
startImageCycling();
// Initial setup
/**document.addEventListener('DOMContentLoaded', () => {
    // Event listeners for handling orientation changes and page visibility.
    window.addEventListener('visibilitychange', reloadOnFailure);
    window.addEventListener('pageshow', reloadOnFailure);
    window.addEventListener('pagereveal', reloadOnFailure);

    startImageCycling();
});
*/
