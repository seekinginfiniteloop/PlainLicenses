import { BehaviorSubject, Subscription, filter, interval, switchMap, tap } from "rxjs"

import { AnimationManager } from "../animations/animationManager"
import { ImageLoader } from "./loader"
import { heroImages } from "./heroImages"
import { HeroImage } from "./types"
import { HeroStore } from "../state/store"
import { HeroState } from "../state/types"
import { logger } from "~/log"

export class ImageCycler {
  // injected dependencies
  private store: HeroStore

  private loader: ImageLoader

  private animator: AnimationManager

  // singleton
  private static instance: ImageCycler | null = null

  // state
  private readonly state$: BehaviorSubject<HeroState>

  private shuffledHeroes: HeroImage[]

  private currentIndex: number = 0

  private subscriptions = new Subscription()

  private imageMap: Map<symbol, HeroImage>

  private firstImage: boolean = false

  private preLoadedImage: null | HTMLImageElement = null

  // constants
  private readonly INTERVAL: number = 20000

  private LAYER: HTMLElement = document.getElementById("parallax-layer") as HTMLElement

  private readonly MAX_IMAGES_IN_LAYER: number = 3

  public static getInstance(): ImageCycler {
    return this.instance ??= new ImageCycler()
  }

  private initSubscriptions(): void {
    const cycle$ = interval(this.INTERVAL).pipe(
      filter(() => this.firstImage === true),
      filter(() => this.state$.value.canCycle),
      switchMap(() => this.cycleImage())
    )

    const layerStatus = new BehaviorSubject<number>(this.LAYER.getElementsByTagName("img").length)

    const layerBouncer$ = layerStatus.pipe(
      filter((layerStatus) => layerStatus > this.MAX_IMAGES_IN_LAYER),
      tap(() => {
        const layerImages = Array.from(this.LAYER.getElementsByTagName("img"))
        const imagesToRemove = layerImages.slice(this.MAX_IMAGES_IN_LAYER - 1)
        imagesToRemove.forEach(image => this.LAYER.removeChild(image))
        layerStatus.next(this.LAYER.getElementsByTagName("img").length)
      }))

    const refresh$ = this.loader.refreshReady.pipe(
      filter(refreshReady => refreshReady === true),
      tap(() => this.refreshLayer()))

    this.subscriptions.add(refresh$.subscribe())

    this.subscriptions.add(layerBouncer$.subscribe())

    this.subscriptions.add(cycle$.subscribe({
      next: () => logger.info("Image cycled successfully."),
      error: (err) => logger.error("Cycle observable encountered an error:", err),
    }))
  }

  private constructor() {
    this.store = HeroStore.getInstance()
    this.state$ = this.store.state$
    this.loader = ImageLoader.getInstance()
    this.animator = AnimationManager.getInstance()

    this.state$ = this.store.state$
    this.shuffledHeroes = [...heroImages].sort(() => Math.random() - 0.5)
    this.initSubscriptions()

    this.imageMap = new Map()
    this.shuffledHeroes.forEach(heroImage => {
      this.imageMap.set(heroImage.symbol, heroImage)
    })

    if (!this.state$.value.atHome) {
      // request an image, but don't cycle or load it
      this.loader.loadImage(this.shuffledHeroes[0].symbol).subscribe((image => {
        this.preLoadedImage = image
      }))
    }
  }

  private getNextIndex = () => {
    if (!this.firstImage) {
      return 0
    }
    if (this.currentIndex === this.shuffledHeroes.length) {
      return 0
    }
    return (this.currentIndex + 1) % this.shuffledHeroes.length
  }

  public cycleImage(): any {
    const carouselState = this.state$.value.landing.carousel
    if (carouselState.progress > 0 && carouselState.isPaused) {
      this.animator.resumeAnimation()
    }
    const nextIndex = this.getNextIndex()
    let nextImage = this.preLoadedImage
    if (!nextImage) {
      this.loader.loadImage(this.shuffledHeroes[nextIndex].symbol).subscribe((image) => {
        nextImage = image
      })
    }
    if (nextIndex > 0) { this.preLoadedImage = null }
    const stateUpdate = {
      ...this.state$.value.landing,
      imageIndex: nextIndex,
      imageCount: this.shuffledHeroes.length,
      imagePreloaded: false,
      currentImage: this.shuffledHeroes[nextIndex].symbol,
    }
    this.currentIndex = nextIndex
    nextIndex === 0 ? this.firstImage = true : null
    const currentImage = this.LAYER.getElementsByTagName("img").length > 0 ? this.LAYER.getElementsByTagName("img")[0] : null
    this.animator.animateTransition(nextImage, currentImage)
    this.store.updateState({ landing: stateUpdate } as Partial<HeroState>)
  }

  private getLayerImages() {
    return Array.from(this.LAYER.getElementsByTagName("img"))
  }

  private getLayerMap() {
    const layerMap = new Map<symbol, HTMLImageElement>()
    this.getLayerImages().forEach(img => {
      const symbol = Symbol.for(img.id)
      layerMap.set(symbol, img)
    })
    return layerMap
  }

  public refreshLayer(): void {
    // first update imageMap with new images
    const newImages = new Map<symbol, HTMLImageElement>()
    this.imageMap.forEach((_, symbol) => {
      this.loader.loadImage(symbol).subscribe((newImg) => { newImages.set(symbol, newImg) })
    })

    const layerMap = this.getLayerMap()

    // replace images in layer with new images
    const reversedImages = Array.from(layerMap.values()).reverse()
    reversedImages.forEach(img => {
      const imageIndex = Array.from(this.LAYER.children).indexOf(img)
      const {imageName} = img.dataset
      this.LAYER.removeChild(img)
      if (imageName && newImages.has(Symbol.for(imageName))) {
        const newImage = newImages.get(Symbol.for(imageName))
        this.LAYER.insertBefore(newImage!, this.LAYER.children[imageIndex])
      }

      this.loader.refreshReady.next(false)
    })

  }

  public destroy(): void {
    this.subscriptions.unsubscribe()
    const imagesInLayer = Array.from(this.LAYER.getElementsByTagName("img")).slice(1)
    imagesInLayer.forEach(img => this.LAYER.removeChild(img))
  }

}
