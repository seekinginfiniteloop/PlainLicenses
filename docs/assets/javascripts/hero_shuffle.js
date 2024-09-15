import { Observable, delay, combineLatest, interval, takeUntil, fromEventPattern, fromEvent } from 'rxjs';
import { filter, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
/** !!! NOTE ON IMAGE HANDLING: !!!
 * Only the first child of the parallax layer is set to display. All other children of parallax layer are set to display: none. When a new image is fetched, it is prepended to the parallax layer, and the old image is pushed back a spot. The new image automatically transitions to display and the old automatically transitions to hidden (display: none). This setup provides a fallback in that we don't rely on javascript to set the display of the images. If the javascript fails, the first image will still display. We also don't have to set transitions because the change to/from first child *is* the transition.
 *
 * We use a generator to serve the images. When it's exhausted, we know we have all the images. We can then cycle through them simply by changing their position in the parallax layer.
 *
 * I wouldn't use this approach for a large number of images or extremely large images, but for a small number of images, it's a simple and effective way to handle the image cycling.
 */
// Declare the RxJS observables provided by Material for MkDocs
const document$ = window.document$;
const location$ = window.location$;
const viewport$ = window.viewport$;
const subscriptions = [];
const portraitMediaQuery = window.matchMedia("(orientation: portrait)");
const isPortrait = () => !!portraitMediaQuery.matches;
// we have javascript, so set css for .hero-parallax__image to display: none
const heroParallaxImage = document.querySelector('.hero-parallax__image');
heroParallaxImage.style.display = 'none';
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
 * Default settings for images.
 *
 * This object contains the default settings that will be applied to images unless overridden
 * by specific settings.
 *
 * @type {ImageSettings}
 */
const defaultSettings = {
    colors: { h1: colors.emerald, p: colors.emerald },
    scale: "1.1",
    objectFit: "scale-down",
    perspective: "50em",
    perspectiveOrigin: "center bottom",
    objectPosition: "center bottom",
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
const imageSettings = {
    anime: { colors: { h1: colors.atomicOrange, p: colors.emerald } },
    artbrut: { colors: { h1: colors.atomicOrange, p: colors.aqua } },
    comic: { colors: { h1: colors.aquamarine, p: colors.white } },
    fanciful: {
        colors: { h1: colors.mindaro, p: colors.aqua },
        perspectiveOrigin: "30% 20%",
        scale: "1",
        translate: "0% -30%",
    },
    fantasy: {
        colors: { h1: colors.white, p: colors.mindaro },
        scale: "1",
        translate: "0% -20%",
    },
    farcical: {
        colors: { h1: colors.atomicOrange, p: colors.aqua },
        scale: "1",
        translate: "0% -35%",
    },
    fauvist: { colors: { h1: colors.mindaro, p: colors.white } },
    minimal: {
        colors: { h1: colors.atomicOrange, p: colors.white },
        scale: "1",
        perspective: "50rem",
        translate: "0% -25%",
    },
    mystical: {
        colors: { h1: colors.blueBlue, p: colors.white },
        scale: "1",
        perspective: "40rem",
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
const defaultPortraitSettings = {
    colors: { h1: colors.emerald, p: colors.emerald },
    objectFit: "cover",
    scale: "1.4",
};
/**
 * A record of portrait image settings keyed by image name.
 *
 * This object holds specific settings for different portrait images, allowing for customization
 * of each portrait image's appearance and behavior.
 *
 * @type {Record<string, ImageSettings>}
 */
const portraitImageSettings = {
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
const getImageSettings = (imageName) => {
    const landscapeSettings = imageSettings[imageName] || {};
    const portraitSettings = portraitImageSettings[imageName] || {};
    const combinedLandscapeSettings = { ...defaultSettings, ...landscapeSettings };
    const combinedPortraitSettings = { ...defaultSettings, ...defaultPortraitSettings, ...portraitSettings };
    return new Map(['landscape', 'portrait'].map((key) => [key, key === 'landscape' ? combinedLandscapeSettings : combinedPortraitSettings]));
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
const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};
const parallaxLayer = document.getElementById('parallax-hero-image-layer');
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
const generateImageDataType = (imageName, rootUrl) => {
    const combinedSettings = getImageSettings(imageName);
    const landscapeSettings = combinedSettings.get('landscape') || defaultSettings;
    const portraitSettings = combinedSettings.get('portrait') || defaultPortraitSettings;
    const widths = ["1280", "1920", "2560", "3840"];
    const baseUrl = `${rootUrl}/${imageName}/${imageName}`;
    const url = `${baseUrl}_1280.webp`;
    const srcset = widths
        .map((imgWidth) => `${rootUrl}/${imageName}/${imageName}_${imgWidth}.webp ${imgWidth}w`)
        .join(", ");
    return {
        imageName,
        baseUrl,
        url,
        srcset,
        landscapeSettings,
        portraitSettings,
        colorSpace: "srgb",
        data: new Uint8ClampedArray(),
        imgWidth: "1280",
    };
};
/**
 * Generates a map of image data types from shuffled image names.
 *
 * This function retrieves the keys from the `imageSettings` object, shuffles them,
 * and constructs a map where each key corresponds to an `ImageDataType` generated
 * from the image name and a predefined root URL. This allows for dynamic image
 * data retrieval in a randomized order.
 *
 * @returns {Map<string, ImageDataType>} A map containing image names as keys and
 *          their corresponding `ImageDataType` objects as values.
 */
const getImageData = function () {
    const imageNames = Object.keys(imageSettings);
    const shuffledImages = shuffle(imageNames);
    const rootUrl = "assets/images/hero";
    const imageData = new Map();
    for (const imageName of shuffledImages) {
        imageData.set(imageName, generateImageDataType(imageName, rootUrl));
    }
    return imageData;
};
/**
 * Opens a connection to the IndexedDB database for image caching.
 *
 * This function creates or opens the "ImageCacheDB" database and sets up the necessary
 * object store for caching images.
 *
 * @returns {Promise<IDBDatabase>} A promise that resolves to the opened database instance.
 */
const openDB = async () => {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open("ImageCacheDB", 1);
        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            db.createObjectStore("images", { keyPath: "url" });
        };
        request.onsuccess = function (event) {
            resolve(event.target.result);
        };
        request.onerror = function (event) {
            reject("Database error: " + event.target.error);
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
const getImageFromCache = async (db, optimalUrl) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["images"], "readonly");
        const objectStore = transaction.objectStore("images");
        const request = objectStore.get(optimalUrl);
        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.image);
            }
            else {
                storeImageInCache(db, optimalUrl);
            }
        };
        request.onerror = () => reject("Failed to retrieve image from cache");
    });
};
/**
 * Stores an image in the IndexedDB cache from a specified URL or a provided Blob.
 *
 * This function either fetches an image from the given URL or uses a provided Blob to store it in the
 * IndexedDB under the "images" object store. It returns an observable that completes when the image
 * is successfully stored or emits an error if the operation fails.
 *
 * @param {IDBDatabase} db - The IndexedDB database instance where the image will be stored.
 * @param {string} optimalUrl - The URL of the image to be stored in the cache.
 * @param {Blob | Promise<Blob>} [blob] - An optional Blob or a Promise that resolves to a Blob representing the image.
 * If not provided, the image will be fetched from the optimalUrl.
 * @returns {Observable<void>} An observable that completes when the image is successfully stored or emits an error if the operation fails.
 */
const storeImageInCache = (db, optimalUrl, blob) => {
    return new Observable((subscriber) => {
        const storeBlob = blob || window.fetch(optimalUrl).then((response) => response.blob());
        Promise.resolve(storeBlob).then((resolvedBlob) => {
            const transaction = db.transaction(["images"], "readwrite");
            const objectStore = transaction.objectStore("images");
            const request = objectStore.add({ url: optimalUrl, image: resolvedBlob });
            request.onsuccess = () => {
                subscriber.next();
                subscriber.complete();
            };
            request.onerror = () => subscriber.error("Failed to store image in cache");
        });
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
const determineOptimalWidth = (screenWidth) => {
    screenWidth = screenWidth || window.innerWidth;
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
 * Applies the specified styles to an image element.
 *
 * This asynchronous function sets the CSS properties of the provided image element
 * based on the provided settings, including transition effects.
 *
 * @param {HTMLImageElement} img - The image element to which styles will be applied.
 * @param {ImageSettings} settings - The settings object containing style properties.
 * @returns {Promise<HTMLImageElement>} A promise that resolves to the styled image element.
 */
async function setStyles(img, settings) {
    for (const [key, value] of Object.entries(settings)) {
        if (key !== "colors" && key !== "transformationSettings") {
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
     */
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
const fetchAndSetImage = async (imageDatum, firstImage) => {
    try {
        const db = await openDB();
        const optimalWidth = determineOptimalWidth();
        const optimalUrl = imageDatum ? `${imageDatum.baseUrl}_${optimalWidth}.webp` : null;
        if (!optimalUrl) {
            throw new Error("Failed to determine optimal URL for image");
        }
        const result = getImageFromCache(db, optimalUrl);
        const imageBlob = (await Promise.any([result, fetch(optimalUrl).then((response) => response.blob())]));
        if (!imageBlob || imageBlob.size === 0) {
            throw new Error("Failed to retrieve a valid image blob");
        }
        const img = new Image(Number(optimalWidth));
        const imageUrl = URL.createObjectURL(imageBlob);
        img.setAttribute('data-name', imageDatum.imageName);
        img.src = imageUrl;
        img.srcset = imageDatum.srcset;
        img.sizes =
            "(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px";
        img.alt = "";
        img.classList.add("hero-parallax__image");
        img.draggable = false;
        img.fetchPriority = firstImage ? "high" : "auto";
        img.loading = "eager";
        const settings = isPortrait() ? imageDatum.portraitSettings : imageDatum.landscapeSettings;
        const styledImg = await setStyles(img, settings);
        styledImg.onload = () => {
            setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);
            requestAnimationFrame(() => {
            });
        };
        styledImg.onerror = (error) => {
            console.error("Image failed to load:", imageDatum.imageName, error);
            throw new Error("Failed to load image");
        };
        return styledImg;
    }
    catch (error) {
        console.error("Error in createImageElement:", error);
    }
};
/**
 * Creates an image element based on the provided image data.
 *
 * This asynchronous function facilitates generating an HTMLImageElement based on whether or not it is the first image being created.
 *
 * @param {ImageDataType} imageDatum - The data object containing information about the image.
 * @param {boolean} [firstImage] - A flag indicating if this is the first image being created.
 * @returns {Promise<HTMLImageElement | void>} A promise that resolves to the created image element or void.
 */
const createImageElement = async (imageDatum, firstImage) => {
    if (firstImage) {
        return fetchAndSetImage(imageDatum, firstImage);
    }
    else {
        return fetchAndSetImage(imageDatum);
    }
    ;
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
const updateColors = async (colors, transition = 'color 5s ease-in') => {
    const h1 = document.getElementById("CTA_header");
    const p = document.getElementById("CTA_paragraph");
    if (h1) {
        h1.style.transition = transition;
        h1.style.color = colors.h1;
    }
    if (p) {
        p.style.transition = transition;
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
async function getFirstImage(imageDatum) {
    if (!parallaxLayer || !imageDatum) {
        console.error("Invalid parallax layer or image data");
        return;
    }
    const settings = isPortrait() ? imageDatum.portraitSettings : imageDatum.landscapeSettings;
    updateColors(settings.colors);
    const imageElement = await createImageElement(imageDatum, true);
    if (!imageElement) {
        console.error("Failed to create image element");
        return;
    }
    // const transformationSettings = await getTransformationSettings(imageDatum.settings);
    // if (transformationSettings) {
    //        applyTransformation(imageElement, transformationSettings);
    // }
    const existingImage = parallaxLayer.getElementsByTagName('img')[0];
    if (existingImage) {
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
async function transitionImages(lastImage, nextImage) {
    //if (transformationSettings) {
    //    applyTransformation(nextImage, transformationSettings);
    //}
    if (!parallaxLayer || !lastImage || !nextImage) {
        console.error("Invalid parallax layer or image elements");
        return;
    }
    lastImage.style.transition = lastImage.style.transition !== "none" ? lastImage.style.transition : "opacity 1.5s ease-in";
    const lastImageElement = parallaxLayer.getElementsByClassName('hero-parallax__image')[0];
    if (lastImageElement) {
        parallaxLayer.prepend(nextImage);
    }
    return;
}
;
/**
 * A generator function that yields image data from a collection.
 *
 * This function iterates over the values of a predefined image data collection, yielding
 * each image datum one at a time. It handles potential errors during iteration and logs
 * them to the console, ensuring that the generator can be used safely in asynchronous contexts.
 *
 * @returns {Generator<ImageDataType>} A generator that produces ImageDataType objects
 *          from the image data collection.
 */
function* imageDatumGenerator() {
    const imageDataResult = imageData;
    if (imageDataResult && imageDataResult.size > 0) {
        try {
            for (const imageDatum of imageDataResult.values()) {
                yield imageDatum;
            }
        }
        catch (error) {
            console.error("Error in imageDatumGenerator:", error);
        }
    }
}
let generatedImageData = [];
// Variables for image cycling
let generatorExhausted = false;
let isPageVisible = true;
let cycleImagesSubscription = null;
const intervalTime = 25000; // Interval for cycling images]
const imageGen = imageDatumGenerator();
const imageData = getImageData();
/**
 * Retrieves the next image datum from the image generator.
 *
 * This function checks if the image generator has been exhausted. If not, it retrieves
 * the next image datum from the generator. If the generator is exhausted or no
 * image datum is available, it sets the `generatorExhausted` flag to true and returns null.
 *
 * @returns {ImageDataType | null} The next image datum if available, or null if the
 *          generator has been exhausted or no datum is found.
 */
const imageDatumGen = function () {
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
 * Stops the cycling of images in the parallax layer.
 *
 * This function clears the interval timer used for cycling images, effectively stopping
 * the image cycling process.
 *
 * @returns {void} This function does not return a value.
 */
const stopImageCycling = () => {
    if (cycleImagesSubscription) {
        cycleImagesSubscription.unsubscribe();
        cycleImagesSubscription = null;
    }
};
/**
 * Starts the process of cycling through images in the parallax layer.
 *
 * This function checks if the first image is present and if the page is visible.
 * If both conditions are met, it sets up an interval to trigger image cycling at
 * specified time intervals, while also managing subscriptions to viewport and location changes.
 *
 * @returns {Promise<void>} A promise that resolves when the image cycling process has been initiated.
 */
const startImageCycling = async () => {
    const firstImage = parallaxLayer ? parallaxLayer.getElementsByTagName('img')[0] : null;
    if (firstImage && isPageVisible) {
        delay(intervalTime);
        if (cycleImagesSubscription) {
            cycleImagesSubscription.unsubscribe();
        }
        const interval$ = interval(intervalTime);
        cycleImagesSubscription = combineLatest([interval$, viewport$, location$])
            .pipe(takeUntil(location$))
            .subscribe(([,]) => {
            cycleImages();
        });
    }
};
/**
 * Handles changes in the visibility state of the document.
 *
 * This function is triggered when the visibility of the page changes. It updates the `isPageVisible` flag and starts or stops image cycling based on whether the page is currently visible or hidden.
 *
 * @returns {void} This function does not return a value.
 */
const handleVisibilityChange = () => {
    if (document.hidden) {
        isPageVisible = false;
        stopImageCycling();
    }
    else {
        isPageVisible = true;
        startImageCycling();
    }
};
/**
 * Fetches the first image from a specified parallax layer.
 *
 * This asynchronous function checks if there are any images within the parallax layer. If no images are found and the parallax layer exists, it retrieves the first image data and invokes the `getFirstImage` function to process it.
 *
 * @returns {Promise<void>} A promise that resolves when the image has been processed or if no action is taken.
 */
const fetchFirstImage = async () => {
    try {
        const datum = imageDatumGen();
        generatedImageData.push(datum);
        if (datum) {
            await getFirstImage(datum);
        }
    }
    catch (error) {
        console.error("Error fetching first image:", error);
    }
};
const mapImageData = (images) => {
    const imageMap = new Map();
    for (const image of images) {
        const imageName = image.getAttribute('data-name');
        if (imageName && generatedImageData) {
            const imageDatum = generatedImageData.find((datum) => datum ? datum.imageName === imageName : undefined);
            if (imageDatum) {
                imageMap.set(imageName, imageDatum);
            }
        }
    }
    return imageMap;
};
/**
 * Injects new styling settings into an image based on its orientation.
 *
 * This function updates the styles of the specified image and all other images
 * in the parallax layer according to the provided orientation ('portrait' or 'landscape'),
 * using predefined settings mapped to each image's data attributes.
 *
 * @param {HTMLImageElement} image - The image element to apply new settings to.
 * @param {'portrait' | 'landscape'} changeTo - The orientation to change the image settings to.
 * @returns {void} This function does not return a value.
 */
const injectNewSettings = (image, changeTo) => {
    const images = parallaxLayer ? parallaxLayer.getElementsByTagName('img') : [];
    const imageMap = mapImageData(Array.from(images));
    const currentImage = images ? images[0] : null;
    if (!currentImage) {
        return;
    }
    else {
        const currentDatum = imageMap.get(currentImage.getAttribute('data-name') || '');
        const settings = changeTo === 'portrait' ? (currentDatum ? currentDatum.portraitSettings : null) : (currentDatum ? currentDatum.landscapeSettings : null);
        if (settings) {
            image.style.transition = "none";
            setStyles(image, settings);
            updateColors(settings.colors, "none");
        }
    }
    const otherImages = Array.from(images).slice(1);
    for (const img of otherImages) {
        const imgDatum = imageMap.get(img.getAttribute('data-name') || '');
        if (imgDatum) {
            const settings = changeTo === 'portrait' ? imgDatum.portraitSettings : imgDatum.landscapeSettings;
            if (settings) {
                setStyles(img, settings);
            }
        }
    }
};
/**
 * Cycles through images in a parallax layer, transitioning between them.
 *
 * This function creates an Observable that emits the result of transitioning
 * from the last displayed image to the next image generated or the last image
 * in the parallax layer, handling both cases of image generation and exhaustion.
 *
 * @returns {Observable<void>} An Observable that completes when the image transition
 *          is finished or errors if an issue occurs during the image creation or transition.
 */
const cycleImages = async () => {
    return new Observable((subscriber) => {
        const images = parallaxLayer ? parallaxLayer.getElementsByTagName('img') : [];
        const lastImage = images[0];
        if (!generatorExhausted) {
            const nextDatum = imageDatumGen();
            generatedImageData.push(nextDatum);
            if (nextDatum) {
                createImageElement(nextDatum).then((nextImage) => {
                    transitionImages(lastImage, nextImage);
                    subscriber.complete();
                }).catch((err) => subscriber.error(err));
            }
            else {
                subscriber.complete();
            }
        }
        else {
            const nextImage = images[images.length - 1]; // last image is the first image because we always prepend
            if (nextImage) {
                transitionImages(lastImage, nextImage).then(() => {
                    subscriber.complete();
                }).catch((err) => subscriber.error(err));
            }
            else {
                subscriber.complete();
            }
        }
    });
};
const initialize = async () => {
    try {
        await fetchFirstImage();
        startImageCycling();
    }
    catch (error) {
        console.error("Error initiating image cycling:", error);
    }
};
const createOrientationObservable = (mediaQuery) => {
    return fromEventPattern((handler) => {
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, (_, event) => event.matches);
};
// observable that monitors changes in viewport orientation if the page is visible
const orientation$ = createOrientationObservable(portraitMediaQuery).pipe(filter((isPageVisible) => isPageVisible), map((event) => event), distinctUntilChanged());
// we inject new settings when the orientation changes for existing images; new images will have the correct settings
orientation$.subscribe(() => {
    if (isPortrait() && parallaxLayer) {
        injectNewSettings(parallaxLayer.getElementsByTagName('img')[0], 'portrait');
    }
    else if (parallaxLayer) {
        injectNewSettings(parallaxLayer.getElementsByTagName('img')[0], 'landscape');
    }
});
// we subscribe to the visibility change event
subscriptions.push(document$.pipe(switchMap((doc) => fromEvent(doc, 'visibilitychange'))).subscribe(() => handleVisibilityChange()));
subscriptions.push(location$.pipe(distinctUntilChanged((a, b) => a === b || a.pathname === b.pathname), filter(loc => loc.pathname === '/' || loc.pathname === '/index.html'), map(() => {
    stopImageCycling();
    return null; // Ensure map returns a value
})).subscribe());
window.addEventListener("beforeunload", () => {
    stopImageCycling();
    subscriptions.forEach((sub) => sub.unsubscribe());
});
initialize();
//# sourceMappingURL=hero_shuffle.js.map