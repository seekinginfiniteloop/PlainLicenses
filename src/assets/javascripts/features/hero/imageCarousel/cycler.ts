/**
 * @module cycler
 * @description Manages dynamic hero image cycling with RxJS-driven transitions and animations
 *

 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @license Plain-Unlicense
 * @copyright This work is in the public domain. No rights reserved.
 */

import { BehaviorSubject, EMPTY, Observable, Subscription, catchError, filter, fromEvent, interval, map, race, single, skipUntil, switchMap, take, tap, timer } from "rxjs"
import gsap from "gsap"
import { ImageLoader } from "./loader"
import { CAROUSEL_CONFIG } from "~/config/config"
import { heroImages } from "./heroImages"
import type { HeroImage } from "./types"
import { HeroStore } from "../state/store"
import type { HeroState, VideoState } from "../state/types"
import { logger } from "~/utils/log"
import { AnimationState } from "../animations/types"

/**
 * @exports ImageCycler - Singleton image cycler class
 * @class ImageCycler
 * @singleton
 *  @description Cycles images on the hero landing, managing the parallax layer and calls for animations and images from AnimationManager and ImageLoader.
 *
 * @property {BehaviorSubject<HeroState>} state$ - Tracks the current state of the hero landing
 * @property {BehaviorSubject<AnimationState>} carousel$ - Tracks the current animation state of the carousel
 * @property {BehaviorSubject<number>} layerStatus$ - Monitors the number of images in the parallax layer
 *
 * @method getInstance - Provides global access to the singleton instance
 * @method cycleImage - Triggers the transition to the next image in the sequence
 * @method destroy - Cleans up subscriptions and removes excess images
 * @method getLayerMap - Retrieves a map of symbols to image elements in the parallax layer
 */
export class ImageCycler {
    // singleton
  private static instance: ImageCycler | undefined = undefined

  // config constants

  private readonly config = CAROUSEL_CONFIG

  // injected dependencies
  private store: HeroStore = HeroStore.getInstance()

  private loader: ImageLoader = ImageLoader.getInstance()

  // state
  private readonly state$: BehaviorSubject<HeroState> = this.store.state$

  public readonly carousel$: BehaviorSubject<AnimationState> = new BehaviorSubject<AnimationState>(AnimationState.Idle)

  public readonly layerStatus$ = new BehaviorSubject<number>(this.config.layer.getElementsByTagName("img").length)

  private shuffledHeroes: HeroImage[] = gsap.utils.shuffle(heroImages)

  private currentIndex: number = 0

  private subscriptions = new Subscription()

  private imageMap: Map<symbol, HeroImage>

  private hasImage: boolean = false

  /**
   * @constructor
   * @private
   * @description Initializes the ImageCycler singleton instance.
   */
  private constructor() {
    this.state$ = this.store.state$
    this.initSubscriptions()

    this.imageMap = new Map()
    this.shuffledHeroes.forEach((heroImage, idx) => {
      const sym = Symbol.for(heroImage.imageName)
      heroImage.symbol = sym
      heroImages[idx].symbol = sym
      this.imageMap.set(sym, heroImage)
      if (idx === 0 && !this.hasImage) {
        // go ahead and load the first image regardless of state
        // we don't insert it unless the state is correct
        this.loader.loadImage(sym).subscribe()
      }
    })
  }

  /**
   * @method getInstance
   * @static
   * @public
   * @returns {ImageCycler} The singleton instance of the ImageCycler
   * @description Provides global access to the singleton instance.
   */
  public static getInstance(): ImageCycler {
    return this.instance ??= new ImageCycler()
  }

  /**
   * @method initSubscriptions
   * @private
   * @description Initializes subscriptions to state changes and image cycling.
   */
  private initSubscriptions(): void {
    // subscribe to state changes
    this.subscriptions.add(this.state$.subscribe())

    const baseObservable = this.store.carouselState$.pipe(
      map((state: VideoState) => state.canPlay)
    )

    const firstImage$ = baseObservable.pipe(
      single(val => val === true),
      switchMap(() => this.initializeFirstImage()),
      catchError(this.handleFirstImageError.bind(this))
    )

    const cycle$ = baseObservable.pipe(
      skipUntil(firstImage$),
      switchMap(() => this.createCycleObservable(baseObservable))
    )

    const layerBouncer$ = this.layerStatus$.pipe(
      filter((layerStatus) => layerStatus > this.config.maxImagesInLayer),
      tap(() => {
        const layerImages = this.getLayerImages()
        const imagesToRemove = layerImages.slice(this.config.maxImagesInLayer - 1)
        imagesToRemove.forEach(image => {
          this.config.layer.removeChild(image)
        })
    this.layerStatus$.next(this.layerCount())
      }))

    this.subscriptions.add(cycle$.subscribe({
      next: (): void => logger.info("Image cycled successfully."),
      error: (err: any): void => logger.error("Cycle observable encountered an error:", err),
    }))

    this.subscriptions.add(layerBouncer$.subscribe())

  }

  /**
   * @method layerCount
   * @private
   * @returns {number} The number of images in the parallax layer
   * @description Gets the number of images in the parallax layer.
   */
  private layerCount = (): number => this.config.layer.getElementsByTagName("img").length

  /**
   * @method initializeFirstImage
   * @private
   * @returns {Observable<Event | null>} An observable that emits when the first image is inserted into the layer
   */
  private initializeFirstImage(): Observable<Event | null> {
    return race(
      fromEvent(this.config.layer, 'DOMNodeInserted').pipe(take(1)),
      timer(5000).pipe(take(1))
    ).pipe(
      map((value) => value instanceof Event ? value : null),
      tap((value: Event | null) => {
      if (value) {
        this.hasImage = true
        this.carousel$.next(AnimationState.Playing)
      } else {
        this.handleEmptyImageLayer()
      }
    })
    )
  }

  /**
   * @method createCycleObservable
   * @private
   * @param {Observable<boolean>} baseObservable - The observable that triggers the cycle
   * @returns {Observable<number>} An observable that cycles images at a set interval
   * @description Creates an observable that cycles images at a set interval.
   */
  private createCycleObservable(baseObservable: Observable<boolean>): Observable<unknown> {
    return interval(this.config.interval).pipe(
      switchMap(() => baseObservable.pipe(
        tap((canPlay) => this.carousel$.next(this.mapToAnimationState(canPlay))),
        filter((canPlay) => this.hasImage && canPlay),
        switchMap(() => this.cycleImage()),
        tap(() => logger.info("Image cycle completed"))
      ))
    )
  }

  /**
   * @method mapToAnimationState
   * @private
   * @param {boolean} canPlay - The boolean value to map
   * @returns {AnimationState} The mapped AnimationState
   * @description Maps a boolean value to an AnimationState.
   */
  private mapToAnimationState = (canPlay: boolean): AnimationState => {
    const currentState = this.carousel$.value
    switch (canPlay) {
      case currentState === AnimationState.Error:
        return this.hasImage ? AnimationState.Idle : AnimationState.Error
      case true:
        return AnimationState.Playing
      case false:
        return AnimationState.Paused
      default:
        return AnimationState.Idle
    }
  }

  /**
   * @method handleFirstImageError
   * @private
   * @param {Error} err - The error to handle
   * @returns {Observable<never>} An empty observable
   * @description Handles an error in the first image observable.
   */
  private handleFirstImageError(err: any): Observable<never> {
    logger.error("Error in first image observable:", err)
    logger.error("Retrying first image observable.")
    this.carousel$.next(AnimationState.Error)
    return EMPTY
  }

  /**
   * @method handleEmptyImageLayer
   * @private
   * @throws {Error} Throws an error if the image layer is empty
   * @description Handles an empty image layer.
   */
  private handleEmptyImageLayer() {
    logger.error("No images in layer... where did our image go?")
    this.carousel$.next(AnimationState.Error)
    throw new Error("Image layer is empty.")
  }

  /**
   * @method getNextIndex
   * @private
   * @returns {number} The index
   * @description Gets the index of the next image in the sequence.
   */
  private getNextIndex = (): number => {
    const reshuffle = () => {
      const initialImage = this.shuffledHeroes[0]
      do {
        this.shuffledHeroes.sort(() => Math.random() - 0.5)
      } while (this.shuffledHeroes[0].imageName === initialImage.imageName)
      this.currentIndex = 0
    }
    const atTheEnd = () => this.currentIndex === this.shuffledHeroes.length
    if (atTheEnd() || this.layerCount() === 0) {
      atTheEnd() ? reshuffle() : 0
      return 0
    }

    this.hasImage = true
    return (this.currentIndex + 1) % this.shuffledHeroes.length
  }

  /**
   * @method cycleImage
   * @public
   * @description Cycles to the next image in the sequence.
   */
  public cycleImage(): any {

    const nextIndex = this.getNextIndex()
    this.currentIndex = nextIndex
    const layerImages = this.getLayerImages()
    const currentImage = layerImages.length > 0 ? layerImages[0] : undefined
    const nextImage = this.loader.loadImage(this.shuffledHeroes[nextIndex].symbol || Symbol.for(this.shuffledHeroes[nextIndex].imageName))
    AnimationManager.getInstance().setupTransition(nextImage, currentImage)

    this.layerStatus$.next(this.layerCount())
  }

  /**
   * @method getLayerImages
   * @private
   * @returns {HTMLImageElement[]} An array of image elements in the parallax layer
   * @description Gets an array of image elements in the parallax layer.
   */
  private getLayerImages(): HTMLImageElement[] {
    return Array.from(this.config.layer.getElementsByTagName("img"))
  }

  /**
   * @method getLayerMap
   * @public
   * @returns {Map<symbol, HTMLImageElement>} A map of symbols to images
   * @description Retrieves a map of symbols to image elements in the parallax layer.
   */
  public getLayerMap(): Map<symbol, HTMLImageElement> {
    const layerMap = new Map<symbol, HTMLImageElement>()
    this.getLayerImages().forEach(img => {
      const symbol = Symbol.for(img.id)
      layerMap.set(symbol, img)
    })
    return layerMap
  }

  /**
   * @method destroy
   * @public
   * @description Cleans up subscriptions and removes excess images from the parallax layer.
   */
  public destroy(): void {
    this.subscriptions.unsubscribe()
    const imagesInLayer = this.getLayerImages().slice(1)
    imagesInLayer.forEach(img => this.config.layer.removeChild(img))
  }

}
