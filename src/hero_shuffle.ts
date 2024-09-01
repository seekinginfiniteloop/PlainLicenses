// Purpose: Cycle through a collection of images with a parallax effect.

function delay(t: number, val?: any): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, t, val));
}

const colors: { [key: string]: string } = {
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

const defaultSettings: ImageSettings = {
    colors: { h1: colors.emerald, p: colors.emerald },
    scale: "1.1",
    objectFit: "scale-down",
    perspective: "50em",
    perspectiveOrigin: "center bottom",
    // TODO: get translated transforms to work
};

const imageSettings: { [key: string]: ImageSettings } = {
    anime: {
        colors: { h1: colors.atomicOrange, p: colors.emerald },
    },
    artbrut: {
        colors: { h1: colors.atomicOrange, p: colors.aqua },
    },
    comic: {
        colors: { h1: colors.aquamarine, p: colors.white },
    },
    fanciful: {
        colors: { h1: colors.mindaro, p: colors.blueBlue },
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
        colors: { h1: colors.atomicOrange, p: colors.blueBlue },
        scale: "1",
        translate: "0% -35%",

    },
    fauvist: {
        colors: { h1: colors.mindaro, p: colors.white },
    },
    minimal: {
        colors: { h1: colors.atomicOrange, p: colors.mindaro },
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

const defaultPortraitSettings: ImageSettings = {
    colors: { h1: colors.emerald, p: colors.emerald },
    scale: "1.4",
    objectFit: "cover",
    objectPosition: "center bottom",
};

const portraitImageSettings: { [key: string]: ImageSettings } = {
    anime: {
        colors: { h1: colors.atomicOrange, p: colors.white },
        perspective: "-50rem",
        scale: "1.8",
        translate: "0% 40%",
    },
    artbrut: {
        colors: { h1: colors.atomicOrange, p: colors.aqua },
        translate: "0% 20%",
    },
    comic: {
        colors: { h1: colors.atomicOrange, p: colors.aqua },
        translate: "0% 20%",
    },
    fanciful: {
        colors: { h1: colors.mindaro, p: colors.aqua },
        translate: "0% 20%",
    },
    fantasy: {
        colors: { h1: colors.atomicOrange, p: colors.mindaro },
        translate: "0% 25%",
    },
    farcical: {
        colors: { h1: colors.mindaro, p: colors.aqua },
        translate: "0% 18%",
    },
    fauvist: {
        colors: { h1: colors.mindaro, p: colors.white },
        translate: "0% 20%",
    },
    minimal: {
        colors: { h1: colors.aquamarine, p: colors.white },
        translate: "0% 20%",
    },
    mystical: {
        colors: { h1: colors.white, p: colors.aquamarine },
        translate: "0% 20%",
    },
    surreal: {
        colors: { h1: colors.white, p: colors.atomicOrange },
        translate: "0% 20%",
    },
};

const getImageSettings = (imageName: string): ImageSettings => {
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    const landscapeSettings = imageSettings[imageName] || {};
    const portraitSettings = portraitImageSettings[imageName] || {};

    if (isPortrait) {
        return {
            ...defaultSettings,
            ...landscapeSettings,
            ...defaultPortraitSettings,
            ...portraitSettings,
        };
    }
    return {
        ...defaultSettings,
        ...landscapeSettings,
    }
};

const shuffle = <T>(array: T[]): T[] => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

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

type PromiseType<T> = T extends Promise<infer R> ? R : T;

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

const getImageData = async (): Promise<{ [key: string]: ImageDataType }> => {
    const imageNames = Object.keys(imageSettings);
    const shuffledImages = shuffle(imageNames);
    const rootUrl = "assets/images/hero";
    const imageData: { [key: string]: ImageDataType } = {};
    for (const imageName of shuffledImages) {
        imageData[imageName] = generateImageDataType(imageName, rootUrl);
    }
    return imageData;
};

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
                return resolve(request.result.image);
            } else {
                storeImageInCache(db, optimalUrl);
            }
            request.onerror = () => reject("Failed to retrieve image from cache");
            storeImageInCache(db, optimalUrl);
        };
    });
};

const storeImageInCache = async (
    db: IDBDatabase,
    optimalUrl: string,
    blob?: Blob | Promise<Blob>
): Promise<void> => {
    blob = blob || (await fetch(optimalUrl).then((response) => response.blob()));
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(["images"], "readwrite");
        const objectStore = transaction.objectStore("images");
        const request = objectStore.add({ url: optimalUrl, image: blob });
        const response = Promise.allSettled([request]);
        response.then((results) => {
            if (results[0].status === "fulfilled") {

                resolve();
            } else {
                console.error("Failed to store image in cache:", optimalUrl);
                reject();
            }
        });
    });
};

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

async function getTransformationSettings(settings: ImageSettings) {
    const transformationSettings = new Map<string, string>();
    for (const [key, value] of Object.entries(settings)) {
        if (key.startsWith("transform") || key === "transition") {
            transformationSettings.set(key, value);
        }
    }
    return transformationSettings;
};

async function setStyles(img: HTMLImageElement, settings: ImageSettings) {
    for (const [key, value] of Object.entries(settings)) {
        if ((value && key !== "colors") || key.startsWith("transform" || key === "transition")) {
            img.style.setProperty(key, value.toString());
        }
    }
    img.style.opacity = "0";
    img.style.transition = "opacity .5s ease-in";
    return img;
}

async function applyTransformation(img: HTMLImageElement, transformationSettings: Map<string, string>) {
    img.style.transform = "none";
    requestAnimationFrame(() => {
        img.style.transition += transformationSettings.get("transition");
        transformationSettings.forEach((value, key) => {
            if (key !== "transition") {
                img.style.setProperty(key, value);
            }
        });
    });
};
const createImageElement = async (
    imageData: ImageDataType,
    firstImage?: boolean
): Promise<HTMLImageElement | void> => {
    try {
        console.log("Creating image element for:", imageData.imageName);
        const db = await openDB();
        const optimalWidth = determineOptimalWidth();
        const optimalUrl = `${imageData.baseUrl}_${optimalWidth}.webp`;
        const result = getImageFromCache(db, optimalUrl);
        const imageBlob = (await Promise.any([result, fetch(optimalUrl).then((response) => response.blob())])) as Blob;

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
        const styledImg = await setStyles(img, imageData.settings);

        styledImg.onload = () => {
            setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);
            requestAnimationFrame(() => {
                styledImg.style.transition = "opacity .5s ease-in";
                styledImg.style.opacity = "1";
            });
            return styledImg;
        };

        styledImg.onerror = (error: any) => {
            console.error("Image failed to load:", imageData.imageName, error);
        };

        return styledImg;
    } catch (error) {
        console.error("Error in createImageElement:", error);
    }
};

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

async function getFirstImage(imageDatum: ImageDataType, parallaxLayer: HTMLElement): Promise<HTMLImageElement | void> {
    updateColors(imageDatum.settings.colors);
    const results = createImageElement(imageDatum, true);

    const imageElement = (await Promise.allSettled([results])).filter(
        (p) => p.status === "fulfilled"
    )[0].value;

    if (!imageElement) {
        console.error("Failed to create image element");
        console.error(results);
        return;
    }
    const transformationSettings = await getTransformationSettings(imageDatum.settings);
    parallaxLayer.appendChild(imageElement);
    if (transformationSettings) {
        applyTransformation(imageElement, transformationSettings);
        imageElement.style.opacity = "1";
    }
};

async function transitionImages(lastImage: HTMLImageElement, nextImage: HTMLImageElement, transformationSettings?: Map<string, string>): Promise<void> {
    lastImage.style.transition = "opacity 1s ease-out";
    lastImage.style.opacity = "0";
    if (transformationSettings) {
        applyTransformation(nextImage, transformationSettings);
    }
    nextImage.style.opacity = "1";

    lastImage.addEventListener('transitionend', () => {
        lastImage.remove();
    });
};
async function cycleNextImage(
    imageDatum: ImageDataType,
    parallaxLayer: HTMLElement
): Promise<void> {
    const preLoad = await createImageElement(imageDatum);
    if (!preLoad) {
        console.error("Failed to preload image:", imageDatum.imageName);
        return;
    }
    const lastImage = parallaxLayer.getElementsByTagName('img')[0] as HTMLImageElement;

    preLoad.style.opacity = "0";
    parallaxLayer.appendChild(preLoad);

    // Wait for the new image to load before starting the transition
    preLoad.onload = async () => {
        const transformationSettings = await getTransformationSettings(imageDatum.settings);
        await transitionImages(lastImage, preLoad, transformationSettings);
        updateColors(imageDatum.settings.colors);
    };

    preLoad.onerror = (error) => {
        console.error("Image failed to load:", imageDatum.imageName, error);
    };
}
const cycleImages = async (firstImage = true): Promise<void> => {

    const imageData = await getImageData();
    const parallaxLayer = document.getElementsByClassName(
        "hero-parallax__layer"
    )[0] as HTMLElement;

    if (firstImage) {
        const firstLoad = imageData[Object.keys(imageData)[0]];
        await getFirstImage(firstLoad, parallaxLayer);
        firstImage = false;
    }
    const remainingKeys = Object.keys(imageData).slice(1);
    const remainingImages = remainingKeys.map((key) => imageData[key]);

    const cycleNext = async (index: number) => {
        if (index >= remainingImages.length) {
            index = 0; // Restart the cycle
        }
        await delay(1000 * 30);
        console.log("Cycling to next image:", remainingImages[index].imageName);
        await cycleNextImage(remainingImages[index], parallaxLayer);
        cycleNext(index + 1);
    };

    cycleNext(0);
};

cycleImages();

const imageLayer = document.getElementsByClassName('hero-parallax__layer')[0] as HTMLElement;
const imageInserted = document.getElementsByTagName('img')[0] as HTMLImageElement;
const imageVisible = imageInserted && imageInserted.style.opacity === '1';

const imageResize = async function (event: Event) {
    if (event instanceof Event) {
        cycleImages();
    }
};

let { useCapture } = window.addEventListener.arguments;

window.addEventListener('orientationchange', imageResize, useCapture = true);
window.addEventListener('pageshow', imageResize);
window.addEventListener('pagereveal', imageResize);
