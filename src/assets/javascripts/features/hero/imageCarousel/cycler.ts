/**
 * @module cycler
 * @description Module for ImageCycler class, which manages the cycling of hero images.
 * @requires rxjs
 * @requires ./loader
 * @requires ./heroImages
 * @requires ../state/store
 * @requires ../state/types
 * @requires ../animations/animationManager
 * @requires ../animations/types
 * @requires ~/log
 *
 * @exports ImageCycler
 * @license Plain-Unlicense
 * @copyright No rights reserved.
 */

import { BehaviorSubject, EMPTY, Observable, Subscription, filter, fromEvent, interval, map, race, single, skipUntil, switchMap, tap, timer } from "rxjs"
import { catchError, take } from 'rxjs/operators'

import { AnimationManager } from "../animations/animationManager"
import { ImageLoader } from "./loader"
import { heroImages } from "./heroImages"
import { HeroImage } from "./types"
import { HeroStore } from "../state/store"
import { CarouselState, HeroState } from "../state/types"
import { logger } from "~/log"
import { AnimationState } from "../animations/types"

/**
 * Manages dynamic hero image carousel with advanced RxJS-driven cycling and animation.
 *
 * @class ImageCycler
 * @description Cycles images on the hero landing, managing the parallax layer and calls for animations and images from AnimationManager and ImageLoader.
 * @singleton
 *
 * @property @static {BehaviorSubject<HeroState>} state$ - Tracks the current state of the hero landing
 * @property {BehaviorSubject<AnimationState>} carousel$ - Tracks the current animation state of the carousel
 * @property {BehaviorSubject<number>} layerStatus$ - Monitors the number of images in the parallax layer
 *
 * @method getInstance - @static Provides global access to the singleton instance
 * @method cycleImage - Triggers the transition to the next image in the sequence
 * @method destroy - Cleans up subscriptions and removes excess images
 * @method getLayerMap - Retrieves a map of symbols to image elements in the parallax layer
 */
export class ImageCycler {
    // singleton
  private static instance: ImageCycler | undefined = undefined

  // config constants

  private readonly CONFIG = {
    INTERVAL: 20000,
    MAX_IMAGES_IN_LAYER: 3,
    LAYER: document.getElementById("parallax-layer") as HTMLElement
  } as const

  // injected dependencies
  private store: HeroStore = HeroStore.getInstance()

  private loader: ImageLoader = ImageLoader.getInstance()

  // state
  private readonly state$: BehaviorSubject<HeroState> = this.store.state$

  public readonly carousel$: BehaviorSubject<AnimationState> = new BehaviorSubject<AnimationState>(AnimationState.Idle)

  public readonly layerStatus$ = new BehaviorSubject<number>(this.CONFIG.LAYER.getElementsByTagName("img").length)

  private shuffledHeroes: HeroImage[] = [...heroImages].sort(() => Math.random() - 0.5)

  private currentIndex: number = 0

  private subscriptions = new Subscription()

  private imageMap: Map<symbol, HeroImage>

  private hasImage: boolean = false

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

  public static getInstance(): ImageCycler {
    return this.instance ??= new ImageCycler()
  }

  /**
   * Initializes subscriptions to state changes and image cycling.
   */
  private initSubscriptions(): void {
    // subscribe to state changes
    this.subscriptions.add(this.state$.subscribe())

    const baseObservable = this.carouselState$.pipe(
      map((state: CarouselState) => state.canPlay)
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
      filter((layerStatus) => layerStatus > this.CONFIG.MAX_IMAGES_IN_LAYER),
      tap(() => {
        const layerImages = this.getLayerImages()
        const imagesToRemove = layerImages.slice(this.CONFIG.MAX_IMAGES_IN_LAYER - 1)
        imagesToRemove.forEach(image => {
          this.CONFIG.LAYER.removeChild(image)
        })
    this.layerStatus$.next(this.layerCount())
      }))

    this.subscriptions.add(cycle$.subscribe({
      next: (): void => logger.info("Image cycled successfully."),
      error: (err: any): void => logger.error("Cycle observable encountered an error:", err),
    }))

    this.subscriptions.add(layerBouncer$.subscribe())

  }

  // counts the number of images in the layer
  private layerCount = () => this.CONFIG.LAYER.getElementsByTagName("img").length

  // initializes the first image in the sequence
  private initializeFirstImage() {
    return race(
      fromEvent(this.CONFIG.LAYER, 'DOMNodeInserted').pipe(take(1)),
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

  // creates an observable that cycles images at a regular interval
  private createCycleObservable(baseObservable: Observable<boolean>) {
    return interval(this.CONFIG.INTERVAL).pipe(
      switchMap(() => baseObservable.pipe(
        tap((canPlay) => this.carousel$.next(this.mapToAnimationState(canPlay))),
        filter((canPlay) => this.hasImage && canPlay),
        switchMap(() => this.cycleImage()),
        tap(() => logger.info("Image cycle completed"))
      ))
    )
  }

  // maps the current state to an AnimationState
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

  // handles errors in the first image observable
  private handleFirstImageError(err: any) {
    logger.error("Error in first image observable:", err)
    logger.error("Retrying first image observable.")
    this.carousel$.next(AnimationState.Error)
    return EMPTY
  }

  // handles an empty image layer
  private handleEmptyImageLayer() {
    logger.error("No images in layer... where did our image go?")
    this.carousel$.next(AnimationState.Error)
    throw new Error("Image layer is empty.")
  }

  // gets the next index in the shuffledHeroes array
  private getNextIndex = () => {
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
   * Cycles to the next image in the sequence.
   */
  public cycleImage(): any {

    const nextIndex = this.getNextIndex()
    this.currentIndex = nextIndex
    const layerImages = this.getLayerImages()
    const currentImage = layerImages.length > 0 ? layerImages[0] : undefined
    const nextImage = this.loader.loadImage(this.shuffledHeroes[nextIndex].symbol || Symbol.for(this.shuffledHeroes[nextIndex].imageName))
    AnimationManager.animateTransition(nextImage, currentImage)

    this.layerStatus$.next(this.layerCount())
  }

  // gets the images in the layer
  private getLayerImages() {
    return Array.from(this.CONFIG.LAYER.getElementsByTagName("img"))
  }

  /**
   * @method getLayerMap
   * Gets a map of symbols to image elements in the parallax layer.
   * @returns {Map<symbol, HTMLImageElement>} A map of symbols to image elements in the parallax layer
   */
  public getLayerMap() {
    const layerMap = new Map<symbol, HTMLImageElement>()
    this.getLayerImages().forEach(img => {
      const symbol = Symbol.for(img.id)
      layerMap.set(symbol, img)
    })
    return layerMap
  }

  /**
   * @method destroy
   * Cleans up subscriptions and removes excess images from the parallax layer.
   */
  public destroy(): void {
    this.subscriptions.unsubscribe()
    const imagesInLayer = this.getLayerImages().slice(1)
    imagesInLayer.forEach(img => this.CONFIG.LAYER.removeChild(img))
  }

}
