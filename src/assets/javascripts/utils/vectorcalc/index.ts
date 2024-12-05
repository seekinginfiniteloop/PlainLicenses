/* eslint-disable max-classes-per-file */

import { logger } from "~/log"

/**
 * ========================================================================
 **                            VectorCalc
 *========================================================================*
 *
 *? BECAUSE LINEAR ALGEBRA IS FUN... RIGHT?
 * Matrix and vector operations for 2D transformations
 * using homogeneous coordinates. I'm not sure what that means,
 * but it sounds cool.
 * @see https://en.wikipedia.org/wiki/Homogeneous_coordinates
 *
 * Slightly more seriously, this is a set of utility classes
 * for calculating safe bounds and transforms for hero images during animations.
 *
 * After a whole lot of trying to figure out how to do this by basically
 * guessing and checking, I realized there was a whole school of math for it.
 * So I learned some of that math and wrote these.
 */


/**
 * Transform a homogeneous vector back to 2D space
 */
class Vec3 {
  constructor(public x = 0, public y = 0, public z = 1) {}

  // Convert from homogeneous coordinates back to 2D
  // because it was all downhill after Avatar
  to2D(): Point {
    return {
      x: this.x / this.z,
      y: this.y / this.z
    }
  }
}

/**
 * Matrix and vector operations for 2D transformations using homogeneous
 * coordinates
 */
class Mat3 {

  values: number[]

  constructor(values = [1, 0, 0, 0, 1, 0, 0, 0, 1]) {
    this.values = values
  }

  private static multiplyMatrices(a: number[], b: number[]): number[] {
    return [
      a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
      a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
      a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
      a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
      a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
      a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
      a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
      a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
      a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    ]
  }

  multiply(other: Mat3): Mat3 {
    return new Mat3(Mat3.multiplyMatrices(this.values, other.values))
  }

  transformPoint(point: Point) {
    const vec = new Vec3(point.x, point.y, 1)
    return new Vec3(
      this.values[0] * vec.x + this.values[1] * vec.y + this.values[2] * vec.z,
      this.values[3] * vec.x + this.values[4] * vec.y + this.values[5] * vec.z,
      this.values[6] * vec.x + this.values[7] * vec.y + this.values[8] * vec.z
    ).to2D()
  }


  private static calculateDeterminant(m: number[]): number {
    return m[0] * (m[4] * m[8] - m[7] * m[5]) -
           m[1] * (m[3] * m[8] - m[5] * m[6]) +
           m[2] * (m[3] * m[7] - m[4] * m[6])
  }

  inverse() {
    const m = this.values
    const det = Mat3.calculateDeterminant(m)

    if (Math.abs(det) < 1e-6) {
      return null
    }

    return new Mat3([
      (m[4] * m[8] - m[7] * m[5]) / det,
      (m[2] * m[7] - m[1] * m[8]) / det,
      (m[1] * m[5] - m[2] * m[4]) / det,
      (m[5] * m[6] - m[3] * m[8]) / det,
      (m[0] * m[8] - m[2] * m[6]) / det,
      (m[3] * m[2] - m[0] * m[5]) / det,
      (m[3] * m[7] - m[6] * m[4]) / det,
      (m[6] * m[1] - m[0] * m[7]) / det,
      (m[0] * m[4] - m[3] * m[1]) / det
    ])
  }

  static translation(tx: number, ty: number): Mat3 {
    return new Mat3([
      1, 0, tx,
      0, 1, ty,
      0, 0, 1
    ])
  }

  static scale(sx: number, sy: number = sx) {
    return new Mat3([
      sx, 0, 0,
      0, sy, 0,
      0, 0, 1
    ])
  }

  toCSSMatrix() {
    const m = this.values
    return `matrix(${m[0]}, ${m[3]}, ${m[1]}, ${m[4]}, ${m[2]}, ${m[5]})`
  }
}

class ImageTransformCalculator {
  config: {
    minTranslation: number
    maxScale: number
  }

  constructor(config = {}) {
    this.config = {
      minTranslation: 100,
      maxScale: 1.2,
      ...config,
    }
  }

  calculateSpaceTransforms(imageSize: ImageSize, viewportSize: ViewportSize, headerHeight = 0) {
    const viewportToNorm = Mat3.scale(
      1 / viewportSize.width,
      1 / (viewportSize.height - headerHeight)
    ).multiply(Mat3.translation(0, -headerHeight))

    const imageToNorm = Mat3.scale(
      1 / imageSize.width,
      1 / imageSize.height
    )

    return {
      viewportToNorm,
      imageToNorm,
      normToViewport: viewportToNorm.inverse(),
      normToImage: imageToNorm.inverse(),
    }
  }

  calculateSafeBounds(imageSize: ImageSize, viewportSize: ViewportSize, headerHeight = 0, scale = 1.1): FocalPointBounds {
    const { viewportToNorm, normToImage } = this.calculateSpaceTransforms(
      imageSize,
      viewportSize,
      headerHeight
    )

    const corners = [
      { x: 0, y: headerHeight },
      { x: viewportSize.width, y: headerHeight },
      { x: 0, y: viewportSize.height },
      { x: viewportSize.width, y: viewportSize.height },
    ].map(point => {
      const normPoint = viewportToNorm.transformPoint(point)
      return normToImage?.multiply(Mat3.scale(scale)).transformPoint(normPoint)
    })

    const [minX, maxX, minY, maxY] = ['x', 'y'].map((axis) => {
      const values = corners.map(p => p?.[axis as keyof typeof p] ?? 0)
      return [Math.min(...values) - this.config.minTranslation, Math.max(...values) + this.config.minTranslation]
    }).flat()

    if (maxX < this.config.minTranslation) {
      const minScaleResult = ScaleCalculator.calculateMinimumScale(imageSize, viewportSize, this.config.minTranslation, headerHeight)
      return this.calculateSafeBounds(imageSize, viewportSize, headerHeight, minScaleResult.scale)
    }

    return { minX, maxX, minY, maxY }
  }

  generateTargetPosition(bounds: FocalPointBounds, focalPoint: FocalPoint, variance = 0.2) {
    const lerp = (start: number, end: number, t: number) => start + (end - start) * t
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

    const addVariance = (target: number, min: number, max: number, variance: number) => {
      const range = max - min
      const offset = (Math.random() - 0.5) * 2 * variance * range
      return clamp(target + offset, min, max)
    }

    return {
      x: addVariance(lerp(bounds.minX, bounds.maxX, focalPoint.x), bounds.minX, bounds.maxX, variance),
      y: addVariance(lerp(bounds.minY, bounds.maxY, focalPoint.y), bounds.minY, bounds.maxY, variance),
    }
  }

  calculateAnimationTransforms(imageSize: ImageSize, viewportSize: ViewportSize, headerHeight: number | undefined, focalPoints: FocalPoints) {
    const bounds = this.calculateSafeBounds(imageSize, viewportSize, headerHeight)

    const startPos = this.generateTargetPosition(bounds, focalPoints.secondary, 0.4)
    const endPos = this.generateTargetPosition(bounds, focalPoints.main, 0.2)

    const baseScale = 1.1
    const endScale = Math.min(baseScale * 1.1, this.config.maxScale)

    return {
      start: Mat3.translation(startPos.x, startPos.y).multiply(Mat3.scale(baseScale)),
      end: Mat3.translation(endPos.x, endPos.y).multiply(Mat3.scale(endScale)),
    }
  }
}
class ScaleCalculator {
  static calculateMinimumScale(
    imageSize: ImageSize,
    viewportSize: ViewportSize,
    minOverflow = 100,
    headerHeight = 0
  ) {
    const visibleHeight = viewportSize.height - headerHeight
    logger.info('Visible Height:', visibleHeight)

    const requiredWidth = viewportSize.width + minOverflow
    const requiredHeight = visibleHeight + minOverflow
    logger.info('Required Width:', requiredWidth)
    logger.info('Required Height:', requiredHeight)

    const horizontalScale = requiredWidth / imageSize.width
    const verticalScale = requiredHeight / imageSize.height
    logger.info('Horizontal Scale:', horizontalScale)
    logger.info('Vertical Scale:', verticalScale)

    const minimumScale = Math.max(horizontalScale, verticalScale)
    logger.info('Minimum Scale:', minimumScale)

    const scaledDimensions = {
      width: imageSize.width * minimumScale,
      height: imageSize.height * minimumScale,
    }
    logger.info('Scaled Dimensions:', scaledDimensions)

    const actualOverflow = {
      horizontal: (scaledDimensions.width - viewportSize.width) / 2,
      vertical: (scaledDimensions.height - visibleHeight) / 2,
    }
    logger.info('Actual Overflow:', actualOverflow)

    return {
      scale: minimumScale,
      scaledDimensions,
      actualOverflow,
      constrainedBy: horizontalScale > verticalScale ? 'width' : 'height',
    }
  }

  static calculateOptimalTransformation(
    imageSize: ImageSize,
    viewportSize: ViewportSize,
    focalPoints: FocalPoints,
    minOverflow = 100,
    headerHeight = 0
  ) {
    const { scale, scaledDimensions, actualOverflow } = this.calculateMinimumScale(
      imageSize,
      viewportSize,
      minOverflow,
      headerHeight
    )

    const bounds = {
      x: { min: -actualOverflow.horizontal, max: actualOverflow.horizontal },
      y: { min: -actualOverflow.vertical, max: actualOverflow.vertical },
    }

    const scaleMatrix = Mat3.scale(scale)

    const focalPointPositions = (['main', 'secondary'] as const).reduce(
      (acc: Record<keyof FocalPoints, { x: number, y: number }>, key: keyof FocalPoints) => {
        acc[key] = {
          x: (focalPoints[key].x - 0.5) * scaledDimensions.width,
          y: (focalPoints[key].y - 0.5) * scaledDimensions.height,
        }
        return acc
      },
      {} as Record<keyof FocalPoints, { x: number, y: number }>
    )

    const clampedPositions = (['main', 'secondary'] as const).reduce(
      (acc: Record<keyof FocalPoints, { x: number, y: number }>, key: keyof FocalPoints) => {
        acc[key] = {
          x: Math.max(bounds.x.min, Math.min(bounds.x.max, -focalPointPositions[key].x)),
          y: Math.max(bounds.y.min, Math.min(bounds.y.max, -focalPointPositions[key].y)),
        }
        return acc
      },
      {} as Record<keyof FocalPoints, { x: number, y: number }>
    )

    return {
      scale,
      scaledDimensions,
      actualOverflow,
      bounds,
      transforms: {
        start: Mat3.translation(clampedPositions.secondary.x, clampedPositions.secondary.y).multiply(scaleMatrix),
        end: Mat3.translation(clampedPositions.main.x, clampedPositions.main.y).multiply(scaleMatrix),
      },
    }
  }

  static generateCSSProperties(calculations: CssCalculations) {
    return {
      '--scale': calculations.scale,
      '--min-width': `${calculations.scaledDimensions.width}px`,
      '--min-height': `${calculations.scaledDimensions.height}px`,
      '--x-overflow': `${calculations.actualOverflow.horizontal}px`,
      '--y-overflow': `${calculations.actualOverflow.vertical}px`,
    }
  }
}

export { Mat3, ImageTransformCalculator, ScaleCalculator }
