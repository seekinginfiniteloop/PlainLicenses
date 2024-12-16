// ImageCycler.ts

import { EMPTY, Subscription, from, interval, of } from "rxjs"
import { catchError, filter, switchMap, withLatestFrom } from "rxjs/operators"
import { HeroImage, ImageLoader } from "./ImageLoader"
import { AnimationManager } from "./AnimationManager"
import { logger } from "~/log"
import { AnimationWaypoint, ImageTransformCalculator } from "./ImageTransformCalculator"

export class ImageCycler {
  private shuffledHeroes: HeroImage[]

  private currentIndex: number = 0

  private subscriptions = new Subscription()

  private panningEnabled: boolean = true // Flag to control panning

  constructor(
    private imageLoader: ImageLoader,
    private animationManager: AnimationManager,
    private parallaxLayer: HTMLElement,
    private cycleInterval: number = 20000 // 20 seconds
  ) {
    this.shuffledHeroes = this.shuffleHeroes([...heroImages]) // Assume heroImages is imported
  }

  private shuffleHeroes(heroes: HeroImage[]): HeroImage[] {
    return heroes.sort(() => Math.random() - 0.5)
  }

  startCycle(): void {
    const cycle$ = interval(this.cycleInterval).pipe(
      switchMap(() => this.cycleImage())
    )

    this.subscriptions.add(cycle$.subscribe({
      next: () => logger.info("Image cycled successfully."),
      error: (err) => logger.error("Cycle observable encountered an error:", err),
    }))
  }

  stopCycle(): void {
    this.subscriptions.unsubscribe()
    this.subscriptions = new Subscription()
  }

  /**
   * Adjusts the current image's scaling and translation based on new viewport dimensions.
   * @param viewportSize The new viewport dimensions.
   */
  adjustCurrentImage(viewportSize: { width: number, height: number }): void {
    const currentImage = this.getCurrentImage()
    if (!currentImage) {
      logger.warn("No current image to adjust.")
      return
    }

    const focalPoints = this.getFocalPoints(currentImage)
    const headerHeight = this.getHeaderHeight()

    const scale = 1.1 // Define scale as needed; could be dynamic or based on viewport

    const timeline = this.animationManager.createImageAnimation(currentImage, focalPoints, viewportSize, headerHeight, scale)
    timeline.restart() // Restart the timeline with new parameters
  }

  /**
   * Restarts the current image's animation.
   */
  restartCurrentImage(): void {
    const currentImage = this.getCurrentImage()
    if (!currentImage) {
      logger.warn("No current image to restart.")
      return
    }

    const focalPoints = this.getFocalPoints(currentImage)
    const viewportSize = { width: window.innerWidth, height: window.innerHeight }
    const headerHeight = this.getHeaderHeight()

    const scale = 1.1 // Define scale as needed

    const timeline = this.animationManager.createImageAnimation(currentImage, focalPoints, viewportSize, headerHeight, scale)
    timeline.restart()
  }

  /**
   * Disables panning animations by stopping ongoing timelines and keeping images static.
   */
  disablePanning(): void {
    this.panningEnabled = false
    const currentImage = this.getCurrentImage()
    if (currentImage) {
      gsap.killTweensOf(currentImage)
      gsap.set(currentImage, { x: 0, y: 0, scale: 1 }) // Reset transformations
    }
  }

  /**
   * Enables panning animations by allowing timelines to proceed.
   */
  enablePanning(): void {
    this.panningEnabled = true
    // Optionally, restart the current image's animation
    this.restartCurrentImage()
  }

  private getCurrentImage(): HTMLImageElement | null {
    const images = this.parallaxLayer.getElementsByTagName("img")
    return images.length > 0 ? images[0] as HTMLImageElement : null
  }

  private cycleImage(): Observable<void> {
    const nextIndex = (this.currentIndex + 1) % this.shuffledHeroes.length
    const nextImage = this.shuffledHeroes[nextIndex]
    const imageName = nextImage.imageName
    const viewportWidth = window.innerWidth // Or fetch from a reactive source if needed

    return this.imageLoader.loadImage(nextImage.widths[viewportWidth], imageName).pipe(
      switchMap(img => {
        const focalPoints = this.getFocalPoints(img)
        const viewportSize = { width: window.innerWidth, height: window.innerHeight }
        const headerHeight = this.getHeaderHeight()

        const scale = 1.1 // Define scale as needed; could be dynamic

        let timeline
        if (this.panningEnabled) {
          timeline = this.animationManager.createImageAnimation(img, focalPoints, viewportSize, headerHeight, scale)
          timeline.play()
        } else {
          // If panning is disabled, simply fade in the image
          timeline = gsap.timeline({ paused: true })
          timeline.to(img, {
            opacity: 1,
            duration: 1.5,
            ease: "power2.inOut",
          })
          timeline.play()
        }

        this.parallaxLayer.appendChild(img)
        this.removeOldImage()

        this.currentIndex = nextIndex

        return of(void 0)
      }),
      catchError(error => {
        logger.error("Error during image cycle:", error)
        // Optionally, implement a fallback mechanism here
        return EMPTY
      })
    )
  }

  private getFocalPoints(img: HTMLImageElement): ImageFocalPoints {
    return {
      main: [
        parseFloat(img.dataset.focusMainX || "0.5"),
        parseFloat(img.dataset.focusMainY || "0.5")
      ],
      secondary: [
        parseFloat(img.dataset.focusSecondaryX || "0.5"),
        parseFloat(img.dataset.focusSecondaryY || "0.5")
      ]
    }
  }

  private getHeaderHeight(): number {
    const header = document.querySelector("#header-target")
    return header ? (header as HTMLElement).offsetHeight : 0
  }

  private removeOldImage(): void {
    const images = this.parallaxLayer.getElementsByTagName("img")
    if (images.length > 1) {
      const firstImage = images[0]
      this.parallaxLayer.removeChild(firstImage)
      // Optionally, revoke object URL to free memory
      if (firstImage.src.startsWith("blob:")) {
        URL.revokeObjectURL(firstImage.src)
      }
    }
  }

  dispose(): void {
    this.stopCycle()
  }
}
