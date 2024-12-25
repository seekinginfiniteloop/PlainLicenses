/**
 * Image loader for hero carousel with responsive image handling
 *
 * @module loader
 * @description Manages dynamic image loading, responsive sizing, and performance optimization
 * @features
 * - Singleton pattern image loading
 * - Responsive image selection
 * - Uses existing cache (through getAssets) for caching and performance
 * - Error handling and retry logic
 *
 * @requires rxjs
 * @requires ./types (carousel)
 * @requires ~/types // anything prefixed with `~` is root level
 * @requires ~/utilities/cache
 * @requires ../state/store
 * @requires ./heroImages
 * @requires ~/log
 * @exports ImageLoader
 *
 * @license Plain-Unlicense
 * @copyright No rights reserved.
 */


import { BehaviorSubject, Observable, Subscription, defer, distinctUntilChanged, from, map, mergeMap, of, retry, switchMap, tap } from 'rxjs'
import { HeroImage, RangeMap } from './types'
import { getAssets } from '~/utilities/cache'
import { HeroStore } from '../state/store'
import { heroImages } from './heroImages'
import { logger } from '~/log'
import { ImageOptions, ImageWidths } from '~/types'

// Defines max widths for responsive image loading with the panning animation
const sizeRanges: RangeMap[] = [
  { range: [0, 1024], value: 1280 },
  { range: [1024, 1600], value: 1920 },
  { range: [1600, 2048], value: 2560 },
  { range: [2048, 3840], value: 3840 }
]

/**
 * Manages responsive and performant hero image loading with advanced RxJS techniques.
 *
 * @class ImageLoader
 * @description Manages loading of hero images with smart source selection and error handling, using cached assets for performance (via `~/cache/getAssets`).
 *
 * @singleton
 *
 * @property {BehaviorSubject<number[]>} maxWidths - Tracks responsive image width breakpoints
 *
 * @method getInstance - @static Provides global access to the singleton instance
 * @method loadImage - Loads a hero image with advanced source selection and error handling
 * @method destroy - Cleans up subscriptions and resets the singleton instance
 *
 * @remarks Supports responsive images, reduced motion preferences, and dynamic image loading
 */
export class ImageLoader {

  private static instance?: ImageLoader

  private store = HeroStore.getInstance()

  public maxWidths = new BehaviorSubject<number[]>(this.getMaxWidths())

  private widthSubscription = new Subscription()

  // constructor is private to enforce singleton pattern
  private constructor(private heroes: HeroImage[] = heroImages) {
    this.initWidthWatcher()
    this.heroes = heroes
  }

  /**
   * @method getInstance
   * Singleton instance getter for ImageLoader
   * @returns {ImageLoader} Singleton instance of ImageLoader
   */
  public static getInstance(): ImageLoader {
    return this.instance ??= new ImageLoader()
  }

  /**
   * @method initWidthWatcher
   * Creates an observable that monitors the user's preference for reduced motion
   * to determine the maximum widths for responsive image loading.
   * If the user prefers reduced motion, our panning animation is disabled,
   * so we don't need image overflow like we do for panning.
  */
  private initWidthWatcher(): void {
    const widths$ = this.store.state$.pipe(
      map(({ prefersReducedMotion }) => prefersReducedMotion),
      distinctUntilChanged(),
      switchMap(() => of(this.getMaxWidths())),
      tap((widths) => this.maxWidths.next(widths))
    )
    this.widthSubscription.add(widths$.subscribe())
  }

  /**
   * @method getMaxWidths
   * Determines the maximum widths for responsive image loading based on user preference
   * @returns {number[]} Array of maximum widths for responsive image loading
   */
  private getMaxWidths(): number[] {
    const { prefersReducedMotion } = this.store.state$.value
    const widthArray = prefersReducedMotion ? sizeRanges.map((obj => obj.value)) : sizeRanges.map((obj => obj.range[1]))
    return widthArray.slice(0, -1)
  }

  /**
   * @method loadImage
   * Loads a hero image based on the provided hero symbol
   * @param {symbol} heroSymbol - Symbol of the hero image to load
   * @returns {Observable<HTMLImageElement>} Observable that emits the loaded image
   */
  public loadImage(heroSymbol: symbol): Observable<HTMLImageElement> {
    const heroImage = this.heroes.find(hero => Symbol.for(hero.imageName) === heroSymbol) as HeroImage

    return defer(() => {
    const img = new Image()
    this.setImageAttributes(img, heroImage)

    return from(this.prepareImageSource(img)).pipe(
      mergeMap(selectedSource => this.loadImageFromSource(img, heroImage, selectedSource)),
      retry(3)
    )
  })
  }

  /**
   * Prepares the image source for loading, identifying the width the browser will select
   * @param img - HTMLImageElement to load
   * @returns Promise that resolves with the selected image source
   */
  private prepareImageSource(img: HTMLImageElement): Promise<string> {
    return new Promise(resolve => {
    requestAnimationFrame(() => {
      const selectedSource = img.currentSrc
      resolve(selectedSource)
    })
  })
  }

  /**
   * Gets the image options for the selected image source
   * @param heroImage - HeroImage to load
   * @param selectedSource - Selected image source
   * @returns ImageOptions for the selected hero image; used to precache likely image sizes
   */
  private getImageOptions(heroImage: HeroImage, selectedSource: string): ImageOptions {
    return {
      widths: this.maxWidths.value as ImageWidths[],
      urls: Object.values(heroImage.widths),
      currentSrc: selectedSource
    }
  }

/**
 * Loads the image from the selected source
 * @param img - HTMLImageElement to load
 * @param heroImage - HeroImage to load
 * @param selectedSource - Selected image source
 * @returns Observable that emits the loaded image
 */
  private loadImageFromSource(
    img: HTMLImageElement,
    heroImage: HeroImage,
    selectedSource: string
  ): Observable<HTMLImageElement> {
    const options = this.getImageOptions(heroImage, selectedSource)
    return from(getAssets(selectedSource, true, options)).pipe(
      mergeMap(async response => {
      const blob = await response.blob()
      img.src = URL.createObjectURL(blob)
      return this.finalizeImage(img, selectedSource)
    })
    )
  }

  /**
   * Finalizes the image loading process, ensuring the image has been decoded
   * @param img - HTMLImageElement to finalize
   * @param source - Source of the image
   * @returns Promise that resolves with the finalized image
   */
  private async finalizeImage(
    img: HTMLImageElement,
    source: string
  ): Promise<HTMLImageElement> {
    try {
      await img.decode()
      return img
    } catch (error) {
      const loadError = new Error(`Failed to load image: ${source}`)
      logger.error(loadError.message, error)
      throw loadError
    }
  }


  /**
   * Sets the image attributes for the provided hero image
   * @param img - HTMLImageElement to set attributes on
   * @param heroImage - HeroImage to set attributes for
  */
  private setImageAttributes(img: HTMLImageElement, heroImage: HeroImage): void {
    const { imageName, focalPoints, srcset } = heroImage
    const maxWidths = this.maxWidths.value
    const layer = document.getElementById("parallax-layer") as HTMLElement
    const layerEmpty = () => layer.getElementsByTagName("img").length === 0

    logger.info(`Setting image attributes for ${imageName}`)

    img.srcset = srcset
    img.sizes = `(max-width: ${maxWidths[0]}px) 1280px, (max-width: ${maxWidths[1]}px) 1920px, (max-width: ${maxWidths[2]}px) 2560px, 3840px`
    img.alt = ""
    img.classList.add("hero-parallax__image", `hero-parallax__image--${imageName}`)
    img.draggable = false
    img.loading = layerEmpty() && this.store.state$.value.atHome ? "eager" : "lazy"

    if (focalPoints) {
      img.dataset.imageName = imageName
      img.dataset.focusMainX = focalPoints.main.x.toString()
      img.dataset.focusMainY = focalPoints.main.y.toString()
      img.dataset.focusSecondaryX = focalPoints.secondary.x.toString()
      img.dataset.focusSecondaryY = focalPoints.secondary.y.toString()
    }
  }

  /**
   * Destroys the ImageLoader instance
   */
  public destroy(): void {
    this.widthSubscription.unsubscribe()
    ImageLoader.instance = undefined
  }
}
