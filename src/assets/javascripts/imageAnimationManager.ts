// AnimationManager.ts

import gsap from "gsap"
import { HeroImage, ImageFocalPoints } from "./ImageLoader"
import { AnimationWaypoint, ImageTransformCalculator } from "./ImageTransformCalculator"
import { logger } from "~/log"

export class AnimationManager {
  private transformCalculator = new ImageTransformCalculator()

  constructor(private parallaxLayer: HTMLElement) {}

  createImageAnimation(
    img: HTMLImageElement,
    focalPoints: ImageFocalPoints,
    viewportSize: { width: number, height: number },
    headerHeight: number,
    scale: number = 1.1 // Default scale; can be parameterized as needed
  ): gsap.core.Timeline {
    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: "sine.inOut" },
      smoothChildTiming: true,
    })

    // Initial fade-in
    tl.to(img, {
      opacity: 1,
      duration: 1.5,
      ease: "power2.inOut",
    }, 0)

    try {
      const imageSize = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      }

      const waypoints: AnimationWaypoint[] = this.transformCalculator.generateAnimationWaypoints(
        imageSize,
        viewportSize,
        headerHeight,
        [focalPoints.secondary, focalPoints.main],
        scale
      )

      waypoints.forEach((waypoint, index) => {
        if (Number.isFinite(waypoint.position.x) &&
            Number.isFinite(waypoint.position.y) &&
            Number.isFinite(waypoint.duration)) {
          tl.to(img, {
            x: waypoint.position.x,
            y: waypoint.position.y,
            duration: waypoint.duration,
            ease: "sine.inOut",
          }, ">")
        } else {
          logger.warn('Invalid waypoint:', waypoint)
        }
      })
    } catch (error) {
      logger.error('Error calculating animation waypoints:', error)
      // Fallback animation if waypoints fail
      tl.to(img, {
        x: 0,
        y: 0,
        duration: 5,
      }, ">")
    }

    return tl
  }

  // Optional: Method to reverse or kill animations if needed
  killAnimation(timeline: gsap.core.Timeline): void {
    timeline.kill()
  }
}
