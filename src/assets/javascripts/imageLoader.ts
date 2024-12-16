// ImageLoader.ts

import { Observable, from, of, throwError } from "rxjs"
import { catchError, map, switchMap, tap } from "rxjs/operators"
import { logger } from "~/log"

export interface HeroImage {
  imageName: string
  widths: Record<number, string>
  srcset: string
  focalPoints?: ImageFocalPoints
}

export interface ImageFocalPoints {
  main: [number, number]
  secondary: [number, number]
}

export class ImageLoader {
  private loadedImages = new Map<string, HTMLImageElement>()

  constructor(private getAsset$: (url: string, cache: boolean) => Observable<Response>) {}

  loadImage(imageUrl: string, imageName: string): Observable<HTMLImageElement> {
    // Return cached image if available
    if (this.loadedImages.has(imageName)) {
      return of(this.loadedImages.get(imageName)!)
    }

    return this.getAsset$(imageUrl, true).pipe(
      switchMap(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`)
        }
        return from(response.blob())
      }),
      map(blob => {
        const img = new Image()
        img.src = URL.createObjectURL(blob)
        img.draggable = false
        img.loading = "lazy"
        img.alt = "" // Since images are decorative
        return img
      }),
      switchMap(img => this.waitForImageLoad(img)),
      tap(img => {
        if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
          throw new Error(`Image failed validation: ${img.src}`)
        }
        // Cache the loaded image
        this.loadedImages.set(imageName, img)
      }),
      catchError(error => {
        logger.error("Error loading image:", error, { imageUrl, imageName })
        // Optionally, implement a fallback image here
        return throwError(() => error)
      })
    )
  }

  private waitForImageLoad(img: HTMLImageElement): Observable<HTMLImageElement> {
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return of(img)
    }

    return new Observable<HTMLImageElement>((observer) => {
      const onLoad = () => {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          observer.next(img)
          observer.complete()
        } else {
          observer.error(new Error(`Image has invalid dimensions: ${img.src}`))
        }
      }
      const onError = () => {
        observer.error(new Error(`Failed to load image: ${img.src}`))
      }

      img.addEventListener("load", onLoad)
      img.addEventListener("error", onError)

      // Cleanup on unsubscribe
      return () => {
        img.removeEventListener("load", onLoad)
        img.removeEventListener("error", onError)
      }
    })
  }

  getCachedImage(imageName: string): HTMLImageElement | undefined {
    return this.loadedImages.get(imageName)
  }

  clearCache(): void {
    this.loadedImages.forEach(img => {
      if (img.src.startsWith("blob:")) {
        URL.revokeObjectURL(img.src)
      }
    })
    this.loadedImages.clear()
  }
}
