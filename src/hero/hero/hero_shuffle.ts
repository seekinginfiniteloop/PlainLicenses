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

import * as imgSettings from "./hero_image_config"

// Configuration object
const CONFIG = {
  CACHE_NAME: 'image-cache-v1',
  INTERVAL_TIME: 25000,
  ROOT_URL: "assets/images/hero"
};

const { document$, viewport$, location$ } = window

const subscriptions: Subscription[] = []

const portraitMediaQuery = window.matchMedia("(orientation: portrait)")
const isPortrait = (): boolean => !!portraitMediaQuery.matches

const parallaxLayer = document.getElementById("parallax-hero-image-layer")

// Simplified getImageSettings function
const getImageSettings = (imageName: string): Map<string, imgSettings.ImageSettings> => {
  const landscapeSettings = {
    ...imgSettings.defaultSettings,
    ...imgSettings.imageSettings[imageName]
  };
  const portraitSettings = {
    ...imgSettings.defaultSettings,
    ...imgSettings.defaultPortraitSettings,
    ...imgSettings.portraitImageSettings[imageName]
  };

  return new Map([
    ["landscape", landscapeSettings],
    ["portrait", portraitSettings]
  ]);
};

// Simplified generateImageDataType function
const generateImageDataType = (imageName: string): imgSettings.ImageDataType => {
  const combinedSettings = getImageSettings(imageName);
  const widths = ["1280", "1920", "2560", "3840"];
  const baseUrl = `${CONFIG.ROOT_URL}/${imageName}/${imageName}`;
  const srcset = widths
    .map(imgWidth => `${baseUrl}_${imgWidth}.webp ${imgWidth}w`)
    .join(", ");

  return {
    imageName,
    baseUrl,
    url: `${baseUrl}_1280.webp`,
    srcset,
    landscapeSettings: combinedSettings.get("landscape") || imgSettings.defaultSettings,
    portraitSettings: combinedSettings.get("portrait") || imgSettings.defaultPortraitSettings,
    colorSpace: "srgb",
    data: new Uint8ClampedArray(),
    imgWidth: "1280"
  };
};

// Simplified cache functions
const openCache = (): Observable<Cache> => from(caches.open(CONFIG.CACHE_NAME));

const getImage = (url: string): Observable<Response> =>
  openCache().pipe(
    mergeMap(cache =>
      from(cache.match(url)).pipe(
        mergeMap(response => response ? of(response) : fetchAndCacheImage(url, cache))
      )
    ),
    catchError(error => {
      console.error('Error in getImage:', error);
      return throwError(() => new Error('Failed to get image'));
    })
  );

const fetchAndCacheImage = (url: string, cache: Cache): Observable<Response> =>
  from(fetch(url)).pipe(
    tap(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      cache.put(url, response.clone());
    }),
    catchError(error => {
      console.error('Error fetching image:', error);
      return throwError(() => new Error('Failed to fetch and cache image'));
    })
  );

// Simplified loadImage function
export const loadImage = (imageName: string, version: string): Observable<Blob> => {
  const url = `${CONFIG.ROOT_URL}/${imageName}?v=${version}`;
  return getImage(url).pipe(
    mergeMap(response => from(response.blob())),
    catchError(error => {
      console.error('Error loading image:', error);
      return throwError(() => new Error('Failed to load image'));
    })
  );
};

// Simplified setStyles function
const setStyles = (img: HTMLImageElement, settings: imgSettings.ImageSettings): Observable<HTMLImageElement> =>
  of(img).pipe(
    tap(image => {
      Object.entries(settings).forEach(([key, value]) => {
        if (key !== "colors" && key !== "transformationSettings") {
          image.style.setProperty(key, value.toString());
        }
      });
      image.style.alignContent = "flex-start";
      image.style.alignSelf = "flex-start";
    })
  );

// Combined fetchAndSetImage function
const fetchAndSetImage = (imageDatum: imgSettings.ImageDataType, firstImage = false): Observable<HTMLImageElement> => {
  const optimalWidth = window.innerWidth <= 1280 ? "1280" :
                       window.innerWidth <= 1920 ? "1920" :
                       window.innerWidth <= 2560 ? "2560" : "3840";
  const optimalUrl = `${imageDatum.baseUrl}_${optimalWidth}.webp`;

  return loadImage(imageDatum.imageName, '1.0.0').pipe(
    mergeMap(imageBlob => {
      const img = new Image(Number(optimalWidth));
      const imageUrl = URL.createObjectURL(imageBlob);

      img.src = imageUrl;
      img.srcset = imageDatum.srcset;
      img.sizes = "(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px";
      img.alt = "";
      img.classList.add("hero-parallax__image");
      img.draggable = false;
      img.fetchPriority = firstImage ? "high" : "auto";
      img.loading = "eager";

      const settings = isPortrait() ? imageDatum.portraitSettings : imageDatum.landscapeSettings;
      return setStyles(img, settings).pipe(
        tap(styledImg => {
          styledImg.onload = () => {
            setTimeout(() => URL.revokeObjectURL(imageUrl), 60000);
            requestAnimationFrame(() => {});
          };
          styledImg.onerror = () => {};
        })
      );
    }),
    catchError(error => {
      console.error('Error in fetchAndSetImage:', error);
      return throwError(() => new Error('Failed to fetch and set image'));
    })
  );
};

// Simplified updateColors function
const updateColors = (colors: { h1: string, p: string }, transition = "color 5s ease-in"): Observable<void> =>
  of(undefined).pipe(
    tap(() => {
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
    })
  );

// Simplified getFirstImage function
const getFirstImage = (imageDatum: imgSettings.ImageDataType): Observable<void> => {
  if (!parallaxLayer || !imageDatum) {
    return EMPTY;
  }

  const settings = isPortrait() ? imageDatum.portraitSettings : imageDatum.landscapeSettings;

  return updateColors(settings.colors).pipe(
    mergeMap(() => fetchAndSetImage(imageDatum, true)),
    tap(imageElement => {
      if (imageElement instanceof HTMLImageElement) {
        imageElement.style.transition = "none";
        parallaxLayer.prepend(imageElement);
      }
    }),
    catchError(error => {
      console.error('Error in getFirstImage:', error);
      return EMPTY;
    })
  );
};

// Simplified image generator
function* imageDatumGenerator(): Generator<imgSettings.ImageDataType> {
  const imageNames = Object.keys(imgSettings.imageSettings);
  for (const imageName of imageNames) {
    yield generateImageDataType(imageName);
  }
}

// Variables for image cycling
let generatorExhausted = false;
let isPageVisible = true;
let cycleImagesSubscription: Subscription | undefined;
const imageGen = imageDatumGenerator();

const imageDatumGen = (): imgSettings.ImageDataType | undefined => {
  if (generatorExhausted) {
    return undefined;
  }
  const nextImageDatum = imageGen.next();
  if (nextImageDatum.done) {
    generatorExhausted = true;
    return undefined;
  }
  return nextImageDatum.value;
};

const stopImageCycling = (): void => {
  if (cycleImagesSubscription) {
    cycleImagesSubscription.unsubscribe();
    cycleImagesSubscription = undefined;
  }
};

const startImageCycling = (): Observable<void> => {
  const firstImage = parallaxLayer?.getElementsByTagName("img")[0];
  if (firstImage && isPageVisible) {
    stopImageCycling();

    return new Observable(subscriber => {
      cycleImagesSubscription = combineLatest([interval(CONFIG.INTERVAL_TIME), viewport$, location$])
        .pipe(
          switchMap(() => cycleImages()),
          catchError(error => {
            console.error('Error cycling images:', error);
            return EMPTY;
          })
        )
        .subscribe({
          next: () => console.log('Image cycled successfully'),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete()
        });
    });
  }
  return EMPTY;
};

const handleVisibilityChange = (): Observable<void> =>
  isPageVisible ? startImageCycling() : of(stopImageCycling());

const cycleImages = (): Observable<void> => {
  if (!parallaxLayer) {
    return EMPTY;
  }

  return new Observable(subscriber => {
    const images = parallaxLayer.getElementsByTagName("img");
    const lastImage = images[0];

    const nextDatum = generatorExhausted ? undefined : imageDatumGen();
    if (nextDatum) {
      fetchAndSetImage(nextDatum).subscribe({
        next: nextImage => {
          if (nextImage && lastImage) {
            lastImage.style.transition = lastImage.style.transition !== "none"
              ? lastImage.style.transition
              : "opacity 1.5s ease-in";
            parallaxLayer.prepend(nextImage);
          }
          subscriber.complete();
        },
        error: err => subscriber.error(err)
      });
    } else if (images.length > 1) {
      const nextImage = images[images.length - 1];
      if (nextImage && lastImage) {
        lastImage.style.transition = lastImage.style.transition !== "none"
          ? lastImage.style.transition
          : "opacity 1.5s ease-in";
        parallaxLayer.prepend(nextImage);
      }
      subscriber.complete();
    } else {
      subscriber.complete();
    }
  });
};

export const shuffle = (): Observable<void> => {
  const datum = imageDatumGen();
  return datum ? getFirstImage(datum).pipe(
    mergeMap(() => startImageCycling()),
    catchError(error => {
      console.error('Error in shuffle:', error);
      return EMPTY;
    })
  ) : EMPTY;
};

const createOrientationObservable = (mediaQuery: MediaQueryList): Observable<boolean> =>
  fromEventPattern<boolean>(
    handler => mediaQuery.addEventListener("change", handler),
    handler => mediaQuery.removeEventListener("change", handler),
    (event: MediaQueryListEvent) => event.matches
  );

const orientation$ = createOrientationObservable(portraitMediaQuery).pipe(
  filter(() => isPageVisible),
  distinctUntilChanged(),
  tap(isPortrait => {
    if (parallaxLayer) {
      const firstImage = parallaxLayer.getElementsByTagName("img")[0];
      if (firstImage) {
        const imageName = firstImage.getAttribute("data-name") || "";
        const imageDatum = generateImageDataType(imageName);
        const settings = isPortrait ? imageDatum.portraitSettings : imageDatum.landscapeSettings;
        setStyles(firstImage, settings).subscribe();
        updateColors(settings.colors, "none").subscribe();
      }
    }
  }),
  catchError(error => {
    console.error('Error in orientation observable:', error);
    return EMPTY;
  })
);

const locationChange$ = location$.pipe(
  distinctUntilChanged((a: URL, b: URL) => a.pathname === b.pathname),
  filter(loc => loc.pathname === "/" || loc.pathname === "/index.html"),
  tap(() => stopImageCycling()),
  catchError(error => {
    console.error('Error in location change observable:', error);
    return EMPTY;
  })
);

const initSubscriptions = (): void => {
  const subscribeWithErrorHandling = (observable: Observable<any>, name: string) =>
    observable.subscribe({
      next: () => console.log(`${name} change processed`),
      error: (err) => console.error(`Unhandled error in ${name} subscription:`, err),
      complete: () => console.log(`${name} subscription completed`)
    });

  subscriptions.push(
    subscribeWithErrorHandling(orientation$, 'Orientation'),
    subscribeWithErrorHandling(
      document$.pipe(
        switchMap(doc => fromEvent(doc, "visibilitychange")),
        switchMap(() => handleVisibilityChange())
      ),
      'Visibility'
    ),
    subscribeWithErrorHandling(locationChange$, 'Location')
  );
};

initSubscriptions();

window.addEventListener("beforeunload", () => {
  stopImageCycling();
  subscriptions.forEach(sub => sub.unsubscribe());
});
