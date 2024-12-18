// src/features/hero/components/imageCarousel/loader.ts
import { BehaviorSubject, Observable, Subscription, distinctUntilChanged, firstValueFrom, from, map, mergeMap, of, retry, switchMap, tap } from 'rxjs'
import { HeroImage } from './types'
import { getAssets } from '~/cache'
import { HeroStore } from '../state/store'
import { heroImages } from './heroImages'
import { logger } from '~/log'
import { ImageOptions, ImageWidths } from '~/types'

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

  public maxWidths = new BehaviorSubject<number[]>(this.getMaxWidths())

  private widthSubscription = new Subscription()

  private constructor(private heroes: HeroImage[] = heroImages) {
    this.initWidthWatcher()
    this.heroes = heroes
  }

  public static getInstance(): ImageLoader {
    return this.instance ??= new ImageLoader()
  }

  private initWidthWatcher(): void {
    const widths$ = this.store.state$.pipe(
      map(({ prefersReducedMotion }) => prefersReducedMotion),
      distinctUntilChanged(),
      switchMap(() => of(this.getMaxWidths())),
      tap((widths) => this.maxWidths.next(widths))
    )
    this.widthSubscription.add(widths$.subscribe())
  }

  private getMaxWidths(): number[] {
    const { prefersReducedMotion } = this.store.state$.value
    const widthArray = prefersReducedMotion ? sizeRanges.map((obj => obj.value)) : sizeRanges.map((obj => obj.range[1]))
    return widthArray.slice(0, -1)
  }

  public loadImage(heroSymbol: symbol): Observable<HTMLImageElement> {
    const heroImage = this.heroes.find(hero => Symbol.for(hero.imageName) === heroSymbol) as HeroImage

    if (this.cache.has(heroSymbol)) {
      return of(this.cache.get(heroSymbol)) as Observable<HTMLImageElement>
    }

    return new Observable<HTMLImageElement>(observer => {
    const img = new Image()
    this.setImageAttributes(img, heroImage)

    // Let browser pick the best source based on srcset/sizes
    requestAnimationFrame(() => {
      const selectedSource = img.currentSrc
      const options: ImageOptions = {
        widths: this.maxWidths.value as ImageWidths[],
        urls: Object.values(heroImage.widths),
        currentSrc: selectedSource
      }
      getAssets(selectedSource, true, options).pipe(
        mergeMap(async response => {
          const blob = await response.blob()
          img.src = URL.createObjectURL(blob)
          return firstValueFrom(from(this.finalizeImage(img, heroImage, selectedSource)))
        }),
        retry(3)
      ).subscribe({
        next: (finalImg) => observer.next(finalImg),
        error: (err) => observer.error(err),
        complete: () => observer.complete()
      })
    })
  })
  }

  private async finalizeImage(
    img: HTMLImageElement,
    heroImage: HeroImage,
    source: string
  ): Promise<HTMLImageElement> {
    try {
      await img.decode()
      this.cache.set(Symbol.for(heroImage.imageName), img)
      return img
    } catch (error) {
      const loadError = new Error(`Failed to load image: ${source}, error: ${error}`)
      logger.error(loadError.message)
      this.store.updateState({})
      throw loadError
    }
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

  public destroy(): void {
    this.cache.clear()
    this.widthSubscription.unsubscribe()
    ImageLoader.instance = undefined
  }
}
