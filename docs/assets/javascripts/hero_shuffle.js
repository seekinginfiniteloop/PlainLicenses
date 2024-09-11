import { Observable, Subscription, fromEvent, merge, BehaviorSubject, catchError, EMPTY, throttleTime, take } from 'rxjs';
import { debounceTime, filter, map, startWith, tap, distinctUntilChanged } from 'rxjs/operators';
const subscriptions = new Subscription();
let currentPath = window.location.pathname;
const currentPathSubject = new BehaviorSubject(currentPath);
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
const imageData = getImageData();
/**
 * Opens a connection to the IndexedDB database for image caching.
 *
 * This function creates or opens the "ImageCacheDB" database and sets up the necessary
 * object store for caching images.
 *
 * @returns {Observable<IDBDatabase>} An observable that resolves to the opened database instance.
 */
const openDB = () => {
    return new Observable((subscriber) => {
        const request = window.indexedDB.open("ImageCacheDB", 1);
        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            db.createObjectStore("images", { keyPath: "url" });
        };
        request.onsuccess = function (event) {
            subscriber.next(event.target.result);
            subscriber.complete();
        };
        request.onerror = function (event) {
            subscriber.error("Database error: " + event.target.error);
        };
    });
};
/**
 * Retrieves an image from the IndexedDB cache or stores it if not found.
 *
 * This function attempts to fetch an image from the specified IndexedDB database using the provided URL.
 * If the image is not found in the cache, it calls `storeImageInCache` to store the image and completes the observable.
 *
 * @param {IDBDatabase} db - The IndexedDB database instance from which to retrieve the image.
 * @param {string} optimalUrl - The URL of the image to retrieve from the cache.
 * @returns {Observable<Blob | void>} An observable that emits the image Blob if found, or completes if the image is stored successfully.
 */
const getImageFromCache = (db, optimalUrl) => {
    return new Observable((subscriber) => {
        const transaction = db.transaction(["images"], "readonly");
        const objectStore = transaction.objectStore("images");
        const request = objectStore.get(optimalUrl);
        request.onsuccess = () => {
            if (request.result) {
                subscriber.next(request.result.image);
            }
            else {
                storeImageInCache(db, optimalUrl).subscribe({
                    complete: () => subscriber.complete(),
                    error: (err) => subscriber.error(err)
                });
            }
        };
        request.onerror = () => subscriber.error("Failed to retrieve image from cache");
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
TODO: Debug
async function getTransformationSettings(settings: ImageSettings) {
    const transformationSettings = new Map<string, string>();
    for (const [key, value] of Object.entries(settings)) {
        if (key.startsWith("transform") || key === "transition") {
            transformationSettings.set(key, value);
        }
    }
    return transformationSettings;
}
 */
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
 * Creates an HTMLImageElement from image data, retrieving it from cache or fetching it as needed.
 *
 * This function constructs an image element by determining the optimal URL based on the provided image data.
 * It retrieves the image from the IndexedDB cache, applies styles, and sets attributes for the image element.
 * The observable emits the styled image element once it has loaded successfully or emits an error if any step fails.
 *
 * @param {ImageDataType} imageDatum - The data containing information about the image, including its base URL and settings.
 * @param {boolean} [firstImage] - An optional flag indicating if this is the first image being created, affecting its fetch priority.
 * @returns {Observable<HTMLImageElement | void>} An observable that emits the created HTMLImageElement when loaded successfully or an error if the process fails.
 */
const createImageElement = (imageDatum, firstImage) => {
    return new Observable((subscriber) => {
        openDB().pipe(tap((db) => {
            const optimalWidth = determineOptimalWidth();
            const optimalUrl = imageDatum ? `${imageDatum.baseUrl}_${optimalWidth}.webp` : null;
            if (!optimalUrl) {
                throw new Error("Failed to determine optimal URL for image");
            }
            return { db, optimalUrl };
        }), map(({ db, optimalUrl }) => getImageFromCache(db, optimalUrl)), map((imageBlob) => {
            if (!imageBlob || imageBlob.size === 0) {
                throw new Error("Failed to retrieve a valid image blob");
            }
            const img = new Image(Number(determineOptimalWidth()));
            const imageUrl = URL.createObjectURL(imageBlob);
            img.src = imageUrl;
            img.srcset = imageDatum.srcset;
            img.sizes = "(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px";
            img.alt = "";
            img.classList.add("hero-parallax__image");
            img.draggable = false;
            img.fetchPriority = firstImage ? "high" : "auto";
            img.loading = "eager";
            return setStyles(img, imageDatum.settings);
        }), catchError(err => {
            console.error("Error in createImageElement:", err);
            return EMPTY; // Return empty observable on error
        })).subscribe({
            next: (styledImgPromise) => {
                styledImgPromise.then((styledImg) => {
                    styledImg.onload = () => {
                        setTimeout(() => URL.revokeObjectURL(styledImg.src), 60000);
                        requestAnimationFrame(() => {
                            subscriber.next(styledImg);
                            subscriber.complete();
                        });
                    };
                    styledImg.onerror = (error) => {
                        console.error("Image failed to load:", imageDatum.imageName, error);
                        subscriber.error(new Error("Failed to load image"));
                    };
                }).catch((error) => {
                    console.error("Error styling image:", error);
                    subscriber.error(new Error("Failed to style image"));
                });
            },
            error: (error) => {
                subscriber.error(error);
            }
        });
    });
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
const updateColors = async (colors) => {
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
 * Retrieves and displays the first image based on the provided image data, handling transitions if necessary.
 *
 * This function checks for the validity of the parallax layer and image data before proceeding. It updates
 * the colors based on the image settings, creates an image element, and manages the transition of existing
 * images if one is present. The observable emits completion or error based on the success of these operations.
 *
 * @param {ImageDataType} imageDatum - The data containing information about the image, including its settings.
 * @returns {Observable<void>} An observable that completes when the image is successfully added to the parallax layer
 * or emits an error if any step in the process fails.
 */
const getFirstImage = (imageDatum) => {
    return new Observable((subscriber) => {
        if (!parallaxLayer || !imageDatum) {
            console.error("Invalid parallax layer or image data");
            subscriber.error(new Error("Invalid parallax layer or image data"));
            return;
        }
        updateColors(imageDatum.settings.colors);
        createImageElement(imageDatum, true).subscribe({
            next: (imageElement) => {
                if (!imageElement) {
                    console.error("Failed to create image element");
                    subscriber.error(new Error("Failed to create image element"));
                    return;
                }
                const existingImage = parallaxLayer.getElementsByTagName('img')[0];
                if (existingImage) {
                    console.log("Existing image found on first load; attempting transition.");
                    transitionImages(existingImage, imageElement).subscribe({
                        complete: () => {
                            parallaxLayer.prepend(imageElement);
                            subscriber.complete();
                        },
                        error: (err) => subscriber.error(err)
                    });
                }
                else {
                    imageElement.style.transition = "none";
                    parallaxLayer.prepend(imageElement);
                    subscriber.complete();
                }
            },
            error: (err) => subscriber.error(err)
        });
    });
};
/**
 * Manages the transition between two images in a parallax layer with a specified duration.
 *
 * This function handles the visual transition of images by fading out the last image and fading in the next image.
 * It listens for the end of the transition and removes the last image from the DOM once the transition is complete.
 * The function emits completion or error based on the success of the transition process.
 *
 * @param {HTMLImageElement} lastImage - The image element that is currently displayed and will be transitioned out.
 * @param {HTMLImageElement} nextImage - The image element that will be displayed and transitioned in.
 * @param {number} [transitionTime=1600] - The duration of the transition in milliseconds (default is 1600ms).
 * @returns {Observable<void>} An observable that completes when the transition is finished or emits an error if any step in the process fails.
 */
const transitionImages = (lastImage, nextImage) => {
    return new Observable((subscriber) => {
        console.log('Transitioning images');
        if (!parallaxLayer || !lastImage || !nextImage) {
            console.error("Invalid parallax layer or image elements");
            subscriber.error(new Error("Invalid parallax layer or image elements"));
            return;
        }
        lastImage.style.transition = lastImage.style.transition !== "none" ? lastImage.style.transition : "opacity 1.5s ease-in";
        const lastImageElement = parallaxLayer.getElementsByClassName('hero-parallax__image')[0];
        if (lastImageElement) {
            parallaxLayer.prepend(nextImage);
            console.log("prepended next image");
            fromEvent(lastImageElement, 'transitionend').pipe(take(1), throttleTime(500) // Throttle the transition to avoid excessive firing
            ).subscribe({
                next: () => {
                    lastImageElement.remove();
                    console.log('last image removed');
                    subscriber.complete();
                },
                error: (err) => subscriber.error(err)
            });
            requestAnimationFrame(() => {
                lastImageElement.style.opacity = '0';
                nextImage.style.opacity = '1';
            });
        }
        else {
            subscriber.complete();
        }
    });
};
/**
 * A generator function that yields image data from a collection of image data types.
 *
 * This function iterates over a collection of image data, yielding each `ImageDataType` object one at a time.
 * It handles potential errors during iteration and logs them to the console. The generator can be used to
 * sequentially access image data without loading the entire collection into memory at once.
 *
 * @returns {Generator<ImageDataType>} A generator that produces `ImageDataType` objects from the image data collection.
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
// Variables for image cycling
let generatorExhausted = false;
let isPageVisible = true;
let cycleImagesInterval = null;
const interval = 25000; // Interval for cycling images]
let imageGen = imageDatumGenerator();
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
    if (cycleImagesInterval) {
        clearInterval(cycleImagesInterval);
        cycleImagesInterval = null;
    }
};
/**
 * Starts the cycling of images in the parallax layer.
 *
 * This function sets an interval timer to cycle through images in the parallax layer,
 * transitioning between each image at a specified interval.
 *
 * @returns {Subscription} The subscription to the interval timer for cycling images.
 */
const startImageCycling = () => {
    return merge(window.viewport$, fromEvent(document, 'visibilitychange')).pipe(startWith(null), debounceTime(300), filter(() => isPageVisible && !!parallaxLayer), tap(() => {
        const firstImage = parallaxLayer.getElementsByTagName('img')[0];
        if (firstImage) {
            return new Promise(resolve => setTimeout(resolve, interval));
        }
        else {
            return EMPTY;
        }
    })).subscribe(() => {
        cycleImages().subscribe();
    });
};
/**
 * Monitors the visibility state of the document and manages image cycling accordingly.
 *
 * This function subscribes to the 'visibilitychange' event on the document, updating the `isPageVisible`
 * variable based on the document's visibility state. When the page becomes visible, it starts cycling through
 * images, and when it becomes hidden, it stops the cycling process.
 *
 * @returns {Subscription} A subscription object that can be used to unsubscribe from the visibility change events.
 */
const handleVisibilityChange = () => {
    return fromEvent(document, 'visibilitychange').subscribe(() => {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            startImageCycling();
        }
        else {
            stopImageCycling();
        }
    });
};
/**
 * Fetches the first image based on generated image data and emits completion or error.
 *
 * This function generates image data using `imageDatumGen` and attempts to retrieve the first image
 * using the `getFirstImage` function. It subscribes to the observable returned by `getFirstImage`,
 * completing or emitting an error based on the result. If no image data is generated, it completes immediately.
 *
 * @returns {Observable<void>} An observable that completes when the image fetching process is complete or emits an error if it fails.
 */
const fetchFirstImage = () => {
    return new Observable((subscriber) => {
        const datum = imageDatumGen();
        if (datum) {
            getFirstImage(datum).pipe(catchError(err => {
                console.error("Error fetching first image:", err);
                return EMPTY; // Return empty observable to end gracefully
            })).subscribe({
                complete: () => subscriber.complete(),
                error: (err) => subscriber.error(err)
            });
        }
        else {
            subscriber.complete();
        }
    });
};
/**
 * Cycles through images in a parallax layer, transitioning to the next image based on availability.
 *
 * This function retrieves images from the parallax layer and manages the transition between them.
 * If there are more images to display, it creates a new image element and debounces the fetch to prevent rapid requests.
 * If all images have been exhausted, it transitions to the last image in the collection, throttling the transition to manage performance.
 *
 * @returns {Observable<void>} An observable that completes when the image cycling process is finished or emits an error if any step fails.
 */
const cycleImages = () => {
    return new Observable((subscriber) => {
        const images = parallaxLayer ? parallaxLayer.getElementsByTagName('img') : [];
        if (!generatorExhausted) {
            const nextDatum = imageDatumGen();
            if (nextDatum) {
                createImageElement(nextDatum).pipe(debounceTime(1000) // Debounce to prevent rapid image fetches
                ).subscribe({
                    next: (nextImage) => {
                        if (nextImage) {
                            nextImage.onload = () => {
                                transitionImages(images[0], nextImage).subscribe({
                                    complete: () => subscriber.complete(),
                                    error: (err) => subscriber.error(err)
                                });
                            };
                        }
                    },
                    error: (err) => subscriber.error(err)
                });
            }
        }
        else {
            const currentImage = images[0];
            const nextImage = images[images.length - 1];
            if (nextImage) {
                transitionImages(currentImage, nextImage).pipe(throttleTime(500) // Throttle transitions
                ).subscribe({
                    complete: () => subscriber.complete(),
                    error: (err) => subscriber.error(err)
                });
            }
        }
    });
};
// Initialize the script
subscriptions.add(fetchFirstImage().pipe(catchError(err => {
    console.error('Error fetching first image:', err);
    return EMPTY;
})).subscribe());
subscriptions.add(handleVisibilityChange());
subscriptions.add(startImageCycling());
/// Use window.viewport$ to handle resize events
subscriptions.add(window.viewport$.pipe(debounceTime(300)).subscribe(() => {
    // we recalculate the optimal image width on resize
    // if it changes, we fetch the image
    const optimalWidth = determineOptimalWidth();
    const currentImage = parallaxLayer.getElementsByTagName('img')[0];
    const currentImageWidth = currentImage ? currentImage.width.toString() : "0";
    if (currentImageWidth !== optimalWidth) {
        const currentImageDatum = imageData.get(currentImage.alt);
        if (currentImageDatum) {
            createImageElement(currentImageDatum).subscribe({
                next: (imageElement) => {
                    if (imageElement) {
                        transitionImages(currentImage, imageElement).subscribe();
                    }
                },
                error: (err) => console.error("Error fetching image on resize:", err)
            });
        }
    }
}));
// Use window.location$ to handle navigation events
subscriptions.add(window.location$.pipe(map(location => location.pathname), distinctUntilChanged(), filter(pathname => pathname !== currentPath)).subscribe(pathname => {
    currentPath = pathname;
    currentPathSubject.next(pathname);
    // Stop image cycling when navigating away
    stopImageCycling();
    console.log('Navigation occurred to:', pathname);
    // Restart image cycling if on the root index.html or '/'
    if (pathname === "/" || pathname === "/index.html") {
        startImageCycling();
    }
}));
// Unsubscribe from all subscriptions when the window is closed or reloaded
window.addEventListener('beforeunload', () => {
    subscriptions.unsubscribe();
});
//# sourceMappingURL=hero_shuffle.js.map