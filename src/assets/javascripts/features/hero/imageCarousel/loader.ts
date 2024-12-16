// src/features/hero/components/imageCarousel/loader.ts
import { BehaviorSubject, Observable, catchError, debounceTime, distinctUntilChanged, filter, firstValueFrom, from, map, mergeMap, of, retry, switchMap, tap } from 'rxjs'
import { HeroImage } from './types'
import { getAsset$ } from '~/cache'
import { HeroStore } from '../state/store'
import { HeroState } from '../state/types'
import { heroImages } from './heroImages'
import { logger } from '~/log'

type RangeMap = {
  range: [number, number]
  value: number
}

const sizeRanges: RangeMap[] = [
  { range: [0, 1024], value: 1280 },
  { range: [1024, 1600], value: 1920 },
  { range: [1600, 2048], value: 2560 },
  { range: [2048, 3840], value: 3840 }
]

export class ImageLoader {
  private static instance?: ImageLoader

  private store = HeroStore.getInstance()

  private cache = new Map<symbol, HTMLImageElement>()

  public refreshReady = new BehaviorSubject<boolean>(false)

  public optimalWidth = new BehaviorSubject<number>(this.getOptimalWidth(this.store.state$.value.viewport.size.width))

  public maxWidths = new BehaviorSubject<number[]>(this.getMaxWidths())

  private constructor(private heroes: HeroImage[] = heroImages) {
    this.initOptimalWidthSubscription()
    this.heroes = heroes
  }

  public static getInstance(): ImageLoader {
    return this.instance ??= new ImageLoader()
  }

  private getMaxWidths(): number[] {
    const { prefersReducedMotion } = this.store.state$.value
    const widthArray = prefersReducedMotion ? sizeRanges.map((obj => obj.value)) : sizeRanges.map((obj => obj.range[1]))
    return widthArray.slice(0, -1)
  }

  private getOptimalWidth(width: number): number {
    return this.store.state$.value.prefersReducedMotion === true ? sizeRanges.find(((range) => range.value <= width))?.value ?? 3840
      : sizeRanges.find(({ range }) => width >= range[0] && width < range[1])?.value ?? 3840
  }

  private initOptimalWidthSubscription() {
    this.store.state$.pipe(
      map((state: HeroState) => ({
        optimalWidth: this.getOptimalWidth(state.viewport.size.width),
        prefersReducedMotion: state.prefersReducedMotion
      })),
      debounceTime(50),
      distinctUntilChanged(),
      tap((state) => {
        this.optimalWidth.next(state.optimalWidth)
        this.maxWidths.next(this.getMaxWidths())
        this.refreshCachedImages()
      }),
      map((state) => state.prefersReducedMotion),
      distinctUntilChanged(),
      tap(() => this.refreshReady.next(true))
    ).subscribe()
  }

  public loadImage(heroSymbol: symbol, refresh = false): Observable<HTMLImageElement> {
    const heroImage = this.heroes.find(hero => Symbol.for(hero.imageName) === heroSymbol) as HeroImage
    const srcImageUrl = heroImage.widths[this.optimalWidth.value]

    if (!refresh && this.cache.has(heroSymbol)) {
      return of(this.cache.get(heroSymbol)) as Observable<HTMLImageElement>
    }

    return getAsset$(srcImageUrl, true).pipe(
      mergeMap(async response => {
        const blob = await response.blob()
        return firstValueFrom(
          from(this.createImageElement(
            heroImage, blob, srcImageUrl, refresh)))
      }),
      retry(3),
      catchError(() => {
        logger.error(`Failed to load image: ${srcImageUrl}`)
        return of(null)
      }),
      filter((img): img is HTMLImageElement => img !== null),
      map(img => { return img })
    )
  }

  private createImageElement(
    heroImage: HeroImage,
    blob: Blob,
    srcImageUrl: string,
    refresh: boolean
  ) {
    const awaitLoad = async () => {
      try {
        await img.decode()
        this.cache.set(Symbol.for(heroImage.imageName), img)
        return img
      } catch (error) {
        const loadError = new Error(`Failed to load image: ${srcImageUrl}, error: ${error}`)
        logger.error(loadError.message)
        this.store.updateState({ error: loadError })
        throw loadError
      }
    }

    const img = new Image()
    img.src = URL.createObjectURL(blob)

    this.setImageAttributes(img, heroImage)
    img.loading = (refresh || this.cache.size > 0) ? "lazy" : "eager"
    return awaitLoad()
  }

  private setImageAttributes(img: HTMLImageElement, heroImage: HeroImage): void {
    const { imageName, focalPoints, srcset } = heroImage
    const maxWidths = this.maxWidths.value

    logger.info(`Setting image attributes for ${imageName}`)

    img.srcset = srcset
    img.sizes = `(max-width: ${maxWidths[0]}px) 1280px, (max-width: ${maxWidths[1]}px) 1920px, (max-width: ${maxWidths[2]}px) 2560px, 3840px`
    img.alt = ""
    img.classList.add("hero-parallax__image", `hero-parallax__image--${imageName}`)
    img.draggable = false

    if (focalPoints) {
      img.dataset.imageName = imageName
      img.dataset.focusMainX = focalPoints.main.x.toString()
      img.dataset.focusMainY = focalPoints.main.y.toString()
      img.dataset.focusSecondaryX = focalPoints.secondary.x.toString()
      img.dataset.focusSecondaryY = focalPoints.secondary.y.toString()
    }
  }

  private refreshCachedImages(): void {
    this.cache.forEach((image, srcImageUrl) => {
      const {imageName} = image.dataset

      if (imageName) {
        this.cache.delete(srcImageUrl)
        this.loadImage(Symbol.for(imageName), true).subscribe()
      }
    })
  }

  public destroy(): void {
    this.cache.clear()
    this.optimalWidth.complete()
    ImageLoader.instance = undefined
  }
}
