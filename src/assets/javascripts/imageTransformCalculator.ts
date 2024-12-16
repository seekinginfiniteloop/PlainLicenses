// ImageTransformCalculator.ts

import { clamp, lerp } from "./TransformUtils"

export interface FocalPoint {
  x: number // Percentage (0 to 1)
  y: number // Percentage (0 to 1)
}

export interface AnimationWaypoint {
  position: { x: number, y: number }
  duration: number
}

export class ImageTransformCalculator {
  private minTranslation: number

  private maxScale: number

  constructor(config = { minTranslation: 100, maxScale: 1.5 }) {
    this.minTranslation = config.minTranslation
    this.maxScale = config.maxScale
  }

  /**
   * Calculates the translation needed to center the focal point without violating constraints.
   */
  calculateCenteredTranslation(
    imageSize: { width: number, height: number },
    viewportSize: { width: number, height: number },
    headerHeight: number = 0,
    focalPoints: FocalPoint[],
    scale: number = 1.1
  ): { translateX: number, translateY: number, appliedScale: number } {
    // Assuming main focal point is the primary one for centering
    const mainFocal = focalPoints[1] // [secondary, main]

    // Calculate scaled image dimensions
    const scaledWidth = imageSize.width * scale
    const scaledHeight = imageSize.height * scale

    // Calculate the focal point's position in the image
    const focalPointImageX = imageSize.width * mainFocal.x
    const focalPointImageY = imageSize.height * mainFocal.y

    // Desired viewport position (center)
    const desiredViewportX = viewportSize.width / 2
    const desiredViewportY = (viewportSize.height - headerHeight) / 2

    // Calculate the raw translation
    let translateX = desiredViewportX - focalPointImageX * scale
    let translateY = desiredViewportY - focalPointImageY * scale

    // Calculate safe bounds
    const minX = viewportSize.width - scaledWidth + this.minTranslation
    const maxX = this.minTranslation
    const minY = viewportSize.height - scaledHeight + this.minTranslation
    const maxY = this.minTranslation

    // Clamp the translation to ensure constraints
    translateX = clamp(translateX, minX, maxX)
    translateY = clamp(translateY, minY, maxY)

    // Optionally adjust scale if needed (e.g., prevent exceeding maxScale)
    const appliedScale = clamp(scale, 1, this.maxScale)

    return { translateX, translateY, appliedScale }
  }

  /**
   * Generates animation waypoints based on centered translation.
   */
  generateAnimationWaypoints(
    imageSize: { width: number, height: number },
    viewportSize: { width: number, height: number },
    headerHeight: number,
    focalPoints: FocalPoint[],
    scale: number = 1.1
  ): AnimationWaypoint[] {
    const { translateX, translateY, appliedScale } = this.calculateCenteredTranslation(
      imageSize,
      viewportSize,
      headerHeight,
      focalPoints,
      scale
    )

    // Define waypoints with durations
    return [
      { position: { x: translateX, y: translateY }, duration: 8.5 }, // First half
      { position: { x: translateX, y: translateY }, duration: 8.5 }, // Second half (can be adjusted)
    ]
  }
}
