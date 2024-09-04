"use strict";
/** ------------ Hero Image Shuffle -------------
 * This script handles the dynamic loading and cycling of hero images on the home page.
 * It uses IndexedDB for image caching and applies transformations to images for visual effects.
 * The script also includes utility functions for color management and image settings, so images can be customized based on predefined styles and orientations.
 *
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
function delay(t, val) {
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
const defaultPortraitSettings = {
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
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    const landscapeSettings = imageSettings[imageName] || {};
    const portraitSettings = portraitImageSettings[imageName] || {};
    return Object.assign(Object.assign(Object.assign({}, defaultSettings), landscapeSettings), (isPortrait ? Object.assign(Object.assign({}, defaultPortraitSettings), portraitSettings) : {}));
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
const parallaxLayer = document.getElementById('parallax-hero-image-layer');
function abortableFetch(input_1) {
    return __awaiter(this, arguments, void 0, function* (input, init = {}) {
        const { signal } = globalAbortController;
        if (init.signal) {
            init.signal = AbortSignal.any([init.signal, signal]);
        }
        else {
            init.signal = signal;
        }
        return fetch(input, init);
    });
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
const generateImageDataType = (imageName, rootUrl) => {
    const settings = getImageSettings(imageName);
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
        settings,
        colorSpace: "srgb",
        data: new Uint8ClampedArray(),
        imgWidth: "1280",
    };
};
/**
 * Retrieves image data for all images defined in the image settings.
 *
 * This asynchronous function gathers all image data, shuffles the image names,
 * and returns an object containing the image data for each image.
 *
 * @returns {Promise<Record<string, ImageDataType>>} A promise that resolves to an object
 * containing image data for all images.
 */
const getImageData = () => __awaiter(void 0, void 0, void 0, function* () {
    const imageNames = Object.keys(imageSettings);
    const shuffledImages = shuffle(imageNames);
    const rootUrl = "assets/images/hero";
    const imageData = {};
    for (const imageName of shuffledImages) {
        imageData[imageName] = generateImageDataType(imageName, rootUrl);
    }
    return imageData;
});
/**
 * Opens a connection to the IndexedDB database for image caching.
 *
 * This function creates or opens the "ImageCacheDB" database and sets up the necessary
 * object store for caching images.
 *
 * @returns {Promise<IDBDatabase>} A promise that resolves to the opened database instance.
 */
const openDB = () => {
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
const getImageFromCache = (db, optimalUrl) => __awaiter(void 0, void 0, void 0, function* () {
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
});
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
const storeImageInCache = (db, optimalUrl, blob) => __awaiter(void 0, void 0, void 0, function* () {
    blob = blob || (yield abortableFetch(optimalUrl).then((response) => response.blob()));
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["images"], "readwrite");
        const objectStore = transaction.objectStore("images");
        const request = objectStore.add({ url: optimalUrl, image: blob });
        request.onsuccess = () => resolve();
        request.onerror = () => reject("Failed to store image in cache");
    });
});
/**
 * Determines the optimal width for images based on the current screen width.
 *
 * This function checks the width of the window and returns the appropriate width
 * value for responsive image loading.
 *
 * @returns {string} The optimal width for images based on the current screen size.
 */
const determineOptimalWidth = () => {
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
function getTransformationSettings(settings) {
    return __awaiter(this, void 0, void 0, function* () {
        const transformationSettings = new Map();
        for (const [key, value] of Object.entries(settings)) {
            if (key.startsWith("transform") || key === "transition") {
                transformationSettings.set(key, value);
            }
        }
        return transformationSettings;
    });
}
/**
 * Applies the specified styles to an image element.
 *
 * This asynchronous function sets the CSS properties of the provided image element
 * based on the provided settings, including opacity and transition effects.
 *
 * @param {HTMLImageElement} img - The image element to which styles will be applied.
 * @param {ImageSettings} settings - The settings object containing style properties.
 * @returns {Promise<HTMLImageElement>} A promise that resolves to the styled image element.
 */
function setStyles(img, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const [key, value] of Object.entries(settings)) {
            if ((value && key !== "colors") || key.startsWith("transform") || key === "transition") {
                img.style.setProperty(key, value.toString());
            }
        }
        img.style.order = "-1";
        img.style.alignContent = "flex-start";
        img.style.alignSelf = "flex-start";
        img.style.opacity = "0";
        return img;
    });
}
/**
 * Applies transformation settings to an image element.
 *
 * This asynchronous function sets the transformation properties of the provided image
 * element based on the specified transformation settings.
 *
 * @param {HTMLImageElement} img - The image element to which transformations will be applied.
 * @param {Map<string, string>} transformationSettings - The transformation settings to apply.
 */
function applyTransformation(img, transformationSettings) {
    return __awaiter(this, void 0, void 0, function* () {
        img.style.transform = "none";
        requestAnimationFrame(() => {
            img.style.transition += transformationSettings.get("transition") || "";
            transformationSettings.forEach((value, key) => {
                if (key !== "transition") {
                    img.style.setProperty(key, value);
                }
            });
        });
    });
}
/**
 * Creates an image element based on the provided image data.
 *
 * This asynchronous function generates an HTMLImageElement, sets its properties,
 * and applies styles based on the provided image data.
 *
 * @param {ImageDataType} imageData - The data object containing information about the image.
 * @param {boolean} [firstImage] - A flag indicating if this is the first image being created.
 * @returns {Promise<HTMLImageElement | void>} A promise that resolves to the created image element or void.
 */
const createImageElement = (imageData, firstImage) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const db = yield openDB();
        const optimalWidth = determineOptimalWidth();
        const optimalUrl = `${imageData.baseUrl}_${optimalWidth}.webp`;
        const result = getImageFromCache(db, optimalUrl);
        const imageBlob = (yield Promise.any([result, abortableFetch(optimalUrl).then((response) => response.blob())]));
        if (!imageBlob || imageBlob.size === 0) {
            throw new Error("Failed to retrieve a valid image blob");
        }
        const img = new Image(Number(optimalWidth));
        const imageUrl = URL.createObjectURL(imageBlob);
        img.src = imageUrl;
        img.srcset = imageData.srcset;
        img.sizes =
            "(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px";
        img.alt = "";
        img.classList.add("hero-parallax__image");
        img.draggable = false;
        img.fetchPriority = firstImage ? "high" : "auto";
        img.loading = firstImage ? "eager" : "lazy";
        const styledImg = yield setStyles(img, imageData.settings);
        styledImg.onload = () => {
            setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);
            requestAnimationFrame(() => {
                styledImg.style.transition = "opacity .5s ease-out";
                styledImg.style.opacity = "1";
            });
        };
        styledImg.onerror = (error) => {
            console.error("Image failed to load:", imageData.imageName, error);
            return reloadOnFailure();
        };
        return styledImg;
    }
    catch (error) {
        console.error("Error in createImageElement:", error);
    }
});
/**
 * Updates the colors of the CTA elements based on the provided color settings.
 *
 * This asynchronous function applies the specified colors to the header and paragraph
 * elements, including transition effects for a smooth color change.
 *
 * @param {{ h1: string; p: string }} colors - The color settings for the header and paragraph.
 * @returns {Promise<void>} A promise that resolves when the colors have been updated.
 */
const updateColors = (colors) => __awaiter(void 0, void 0, void 0, function* () {
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
});
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
function getFirstImage(imageDatum, parallaxLayer) {
    return __awaiter(this, void 0, void 0, function* () {
        updateColors(imageDatum.settings.colors);
        const imageElement = yield createImageElement(imageDatum, true);
        if (!imageElement) {
            console.error("Failed to create image element");
            return reloadOnFailure();
        }
        const transformationSettings = yield getTransformationSettings(imageDatum.settings);
        parallaxLayer.appendChild(imageElement);
        if (transformationSettings) {
            applyTransformation(imageElement, transformationSettings);
            imageElement.style.opacity = "1";
        }
    });
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
function transitionImages(lastImage, nextImage, transformationSettings) {
    return __awaiter(this, void 0, void 0, function* () {
        lastImage.style.transition = "opacity .3s ease-out";
        lastImage.style.opacity = "0";
        if (transformationSettings) {
            applyTransformation(nextImage, transformationSettings);
        }
        nextImage.style.opacity = "1";
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            if (lastImage && lastImage.parentNode) {
                lastImage.parentNode.removeChild(lastImage);
            }
        }), 3000);
        lastImage.addEventListener('transitionend', () => {
            lastImage.remove();
        });
    });
}
/**
 * Cycles to the next image in the parallax layer.
 *
 * This asynchronous function preloads the next image, waits for it to load, and then
 * transitions from the last image to the newly loaded image.
 *
 * @param {ImageDataType} imageDatum - The data object containing information about the next image.
 * @param {HTMLElement} parallaxLayer - The layer to which the image will be appended.
 * @returns {Promise<void>} A promise that resolves when the cycling is complete.
 */
function cycleNextImage(imageDatum, parallaxLayer) {
    return __awaiter(this, void 0, void 0, function* () {
        const preLoad = yield createImageElement(imageDatum);
        if (!preLoad) {
            console.error("Failed to preload image:", imageDatum.imageName);
            return;
        }
        const lastImage = parallaxLayer.getElementsByTagName('img')[0];
        preLoad.style.opacity = "0";
        parallaxLayer.appendChild(preLoad);
        // Wait for the new image to load before starting the transition
        preLoad.onload = () => __awaiter(this, void 0, void 0, function* () {
            const transformationSettings = yield getTransformationSettings(imageDatum.settings);
            yield transitionImages(lastImage, preLoad, transformationSettings);
            updateColors(imageDatum.settings.colors);
        });
        preLoad.onerror = (error) => {
            console.error("Image failed to load:", imageDatum.imageName, error);
        };
    });
}
/**
 * Cycles through a collection of images in a parallax layer.
 *
 * This asynchronous function retrieves image data, displays the first image if specified,
 * and sets up a loop to continuously cycle through the remaining images. It also listens
 * for orientation changes to refresh the image data and restart the cycling process.
 *
 * @param {boolean} [firstImage=true] - A flag indicating whether this is the first image cycle.
 * @returns {Promise<void>} A promise that resolves when the cycling process is initiated.
 */
const cycleImages = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (firstImage = true) {
    const imageData = yield getImageData();
    if (firstImage && parallaxLayer) {
        const firstLoad = imageData[Object.keys(imageData)[0]];
        yield getFirstImage(firstLoad, parallaxLayer);
        firstImage = false;
    }
    window.addEventListener('orientationchange', () => __awaiter(void 0, void 0, void 0, function* () {
        const lastImage = parallaxLayer ? parallaxLayer.getElementsByTagName('img')[0] : null;
        if (lastImage && parallaxLayer) {
            const newData = yield getImageData();
            const currentImage = newData[Object.keys(imageData)[0]];
            cycleNextImage(currentImage, parallaxLayer);
            cycleImages();
        }
    }));
    const remainingKeys = Object.keys(imageData).slice(1);
    const remainingImages = remainingKeys.map((key) => imageData[key]);
    const cycleNext = (index) => __awaiter(void 0, void 0, void 0, function* () {
        if (index >= remainingImages.length) {
            index = 0; // Restart the cycle
        }
        yield delay(1000 * 30);
        if (parallaxLayer) {
            yield cycleNextImage(remainingImages[index], parallaxLayer);
            cycleNext(index + 1);
        }
        ;
        cycleNext(0);
    });
});
cycleImages();
/**
 * Handles image resizing events.
 *
 * This function is triggered on specific events and initiates the cycling of images
 * to adapt to the new screen size or orientation.
 *
 * @param {Event} event - The event that triggered the resize handling.
 * @returns {Promise<void>} A promise that resolves when the image cycling is complete.
 */
const imageResize = function (event) {
    return __awaiter(this, void 0, void 0, function* () {
        if (event instanceof Event && parallaxLayer) {
            const lastImage = parallaxLayer.getElementsByTagName('img')[0];
            if (lastImage) {
                lastImage.style.opacity = "0";
            }
            const currentResolution = lastImage ? lastImage.width : 0;
            const newResolution = determineOptimalWidth();
            if (!lastImage || currentResolution !== Number(newResolution)) {
                cycleImages();
            }
        }
        ;
    });
};
let reloadAttempts = 0;
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
const reloadOnFailure = () => __awaiter(void 0, void 0, void 0, function* () {
    if (reloadAttempts > 4) {
        console.error('Exceeded reload attempts, reloading page');
    }
    const imageLayer = document.getElementById("parallax-hero-image-layer");
    const currentImage = imageLayer ? imageLayer.getElementsByTagName('img')[0] : null;
    const currentImageVisible = currentImage && currentImage.style.opacity === '1';
    if (document.readyState === 'complete' && !document.hidden && !document.hasFocus() && !currentImageVisible) {
        if (currentImage) {
            try {
                const copiedImage = currentImage.cloneNode(true);
                imageLayer.replaceChildren(copiedImage);
                copiedImage.style.opacity = '1';
            }
            catch (error) {
                console.error('Failed to reload image:', error);
                reloadAttempts++;
                location.reload();
            }
        }
        else {
            reloadAttempts++;
            location.reload();
        }
    }
});
/**
 * Polices the number of visible images in the parallax layer.
 * Helps to ensure that only one image is visible at a time.
*/
const observer = new MutationObserver(() => {
    if (parallaxLayer) {
        const images = parallaxLayer.getElementsByTagName('img');
        const visibleImages = Array.from(images).filter(img => img.style.opacity !== '0');
        if (visibleImages.length > 1) {
            visibleImages.slice(1).forEach(img => {
                img.style.opacity = '0';
                setTimeout(() => {
                    if (img.parentNode) {
                        img.parentNode.removeChild(img);
                    }
                }, 1010); // Delay to allow transition to opacity 0
            });
        }
        // Initial check in case there are already multiple visible images
        const initialImages = parallaxLayer.getElementsByTagName('img');
        const initialVisibleImages = Array.from(initialImages).filter(img => img.style.opacity !== '0');
        if (initialVisibleImages.length > 1) {
            initialVisibleImages.slice(1).forEach(img => {
                img.style.opacity = '0';
                setTimeout(() => {
                    if (img.parentNode) {
                        img.parentNode.removeChild(img);
                    }
                }, 510); // Delay to allow transition to opacity 0
            });
        }
    }
});
/** --------------listeners------------- */
document.addEventListener('DOMContentLoaded', () => {
    if (parallaxLayer) {
        observer.observe(parallaxLayer, { childList: true, subtree: true });
    }
});
window.addEventListener('visibilitychange', reloadOnFailure);
// Event listeners for handling orientation changes and page visibility.
window.addEventListener('orientationchange', imageResize, true);
window.addEventListener('pageshow', imageResize);
window.addEventListener('pagereveal', imageResize);
