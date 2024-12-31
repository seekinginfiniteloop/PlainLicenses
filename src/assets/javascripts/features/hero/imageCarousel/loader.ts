/**
 * @module loader
 * @description Manages dynamic image loading, responsive sizing, and performance optimization
 * @features
 * - Singleton pattern image loading with {@link ImageLoader}
 * - Responsive image selection
* - Uses existing cache (through {@link getAssets}) for caching and performance
 * - Error handling and retry logic
 *
 * @requires rxjs BehaviorSubject, Observable, Subscription, defer, distinctUntilChanged, from, map, mergeMap, of, retry, switchMap, tap
 *
 * @dependencies
 * - {@link module:utils/cache} - {@link getAssets} - Caching utility
 * - {@link module:state/store} - {@link HeroStore} - State management
 * - {@link module:./heroImages} - {@link heroImages} - Hero image data
 * - {@link module:log} - {@link logger} - Logging utility
 *
 * @types {@link module:features/hero/imageCarousel/types} - {@link RangeMap} - {@link HeroImage}
 * @types {@link module:types} - {@link ImageOptions} - {@link ImageWidths}
 *
 * @exports ImageLoader - Singleton image loader class
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @copyright No rights reserved.
 */

import { BehaviorSubject, Observable, Subscription, defer, distinctUntilChanged, from, map, mergeMap, of, retry, switchMap, tap } from 'rxjs'
import { HeroImage, RangeMap } from './types'
import { getAssets } from '~/utils/cache'
import { HeroStore } from '../state/store'
import { heroImages } from './heroImages'
import { logger } from '~/utils/log'
import { ImageOptions, ImageWidths } from '~/types'

// Responsive image width breakpoints
const sizeRanges: RangeMap[] = [
  { range: [0, 1024], value: 1280 },
  { range: [1024, 1600], value: 1920 },
  { range: [1600, 2048], value: 2560 },
  { range: [2048, 3840], value: 3840 }
]

/**
 * Responsive Hero Image Loading Manager
 *
 * @class ImageLoader
 * @singleton
 * @description Manages responsive hero image loading with RxJS techniques for optimal performance. Handles smart source selection, caching, and error handling for hero carousel images.
 *
 * @features
 ** - Responsive image loading with width breakpoints
 ** - Reduced motion preference support
 ** - Dynamic source selection
 ** - Error handling and retries
 ** - Image caching via ~/cache/getAssets
 *
 * @property {BehaviorSubject<number[]>} maxWidths - Tracks responsive image width breakpoints
 *
 * @public
 * @method getInstance - Returns singleton instance
 * @method loadImage - Loads hero image with source selection
 * @method destroy - Cleanup and reset singleton
 *
 * @private
 * @method initWidthWatcher - Monitors reduced motion preferences
 * @method getMaxWidths - Calculates responsive breakpoints
 * @method setImageAttributes - Sets up image element properties
 *
 * @see {@link HeroStore} For state management
 * @see {@link getAssets} For caching implementation
 */
export class ImageLoader {

  private static instance?: ImageLoader

  private store = HeroStore.getInstance()

  public maxWidths = new BehaviorSubject<number[]>(this.getMaxWidths())

  private widthSubscription = new Subscription()

  /**
   * @constructor
   * @private
   * @param {HeroImage[]} heroes - Array of hero images to load
   * @description Creates a new ImageLoader instance
   */
  private constructor(private heroes: HeroImage[] = heroImages) {
    this.initWidthWatcher()
    this.heroes = heroes
  }

  /**
   * @method getInstance
   * @static
   * @public
   * @returns {ImageLoader} Singleton instance of ImageLoader
   * @description Returns the singleton instance of ImageLoader
   */
  public static getInstance(): ImageLoader {
    return this.instance ??= new ImageLoader()
  }

  /**
   * @method initWidthWatcher
   * @private
   * @description Creates an observable that monitors the user's preference for
   * reduced motion to determine the maximum widths for responsive image loading.
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
   * @private
   * @returns {number[]} Array of maximum widths for responsive image loading
   * @description Calculates the maximum widths for responsive image loading
   */
  private getMaxWidths(): number[] {
    const { prefersReducedMotion } = this.store.state$.value
    const widthArray = prefersReducedMotion ? sizeRanges.map((obj => obj.value)) : sizeRanges.map((obj => obj.range[1]))
    return widthArray.slice(0, -1)
  }

  /**
   * @method loadImage
   * @public
   * @param {symbol} heroSymbol - Symbol of the hero image to load
   * @returns {Observable<HTMLImageElement>} Observable that emits the loaded image
   * @description Loads the hero image with the provided symbol
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
   * @method prepareImageSource
   * @private
   * @param {HTMLImageElement} img - HTMLImageElement to load
   * @returns {Promise<string>} that resolves with the selected image source
   * @description Prepares the image source for the provided image element
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
   * @method getImageOptions
   * @private
   * @param {HeroImage} heroImage - HeroImage to load
   * @param {string} selectedSource - Selected image source
   * @returns {ImageOptions} for the selected hero image; used to precache likely image sizes
   * @description Creates the ImageOptions object for the selected hero image
   */
  private getImageOptions(heroImage: HeroImage, selectedSource: string): ImageOptions {
    return {
      widths: this.maxWidths.value as ImageWidths[],
      urls: Object.values(heroImage.widths),
      currentSrc: selectedSource
    }
  }

/**
 * @method loadImageFromSource
 * @private
 * @param {HTMLImageElement} img - HTMLImageElement to load
 * @param {HeroImage} heroImage - HeroImage to load
 * @param {string} selectedSource - Selected image source
 * @returns {Observable<HTMLImageElement>} that emits the loaded image
 * @description Loads the image from the selected source
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
   * @method finalizeImage
   * @private
   * @param {HTMLImageElement} img - HTMLImageElement to finalize
   * @param {string} source - Source of the image
   * @returns {Promise<HTMLImageElement>} that resolves with the finalized image
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
   * @method setImageAttributes
   * @private
   * @param {HTMLImageElement} img - HTMLImageElement to set attributes on
   * @param {HeroImage} heroImage - HeroImage to set attributes
   * @description Sets the image attributes for the provided image element
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
   * @method destroy
   * @public
   * @description Destroys the ImageLoader instance
   */
  public destroy(): void {
    this.widthSubscription.unsubscribe()
    ImageLoader.instance = undefined
  }
}
