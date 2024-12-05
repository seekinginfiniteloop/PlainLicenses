import { ImageTransformCalculator, Mat3, ScaleCalculator } from './index'
import { describe, expect, it } from '@jest/globals'
import { CssCalculations, FocalPoints, ImageSize, ViewportSize } from '../globals'

describe('ImageTransformCalculator', () => {
  it('should set default configuration', () => {
    const calculator = new ImageTransformCalculator()
    expect(calculator.config.minTranslation).toBe(100)
    expect(calculator.config.maxScale).toBe(1.2)
  })

  it('should set custom configuration', () => {
    const calculator = new ImageTransformCalculator({ minTranslation: 50, maxScale: 1.5 })
    expect(calculator.config.minTranslation).toBe(50)
    expect(calculator.config.maxScale).toBe(1.5)
  })

  it('should calculate space transforms correctly', () => {
    const calculator = new ImageTransformCalculator()
    const imageSize = { width: 800, height: 600 }
    const viewportSize = { width: 1024, height: 768 }
    const headerHeight = 50

    const transforms = calculator.calculateSpaceTransforms(imageSize, viewportSize, headerHeight)
    expect(transforms.viewportToNorm.values).toEqual([
      1 / 1024, 0, 0,
      0, 1 / (768 - 50), -50 / (768 - 50),
      0, 0, 1
    ])
    expect(transforms.imageToNorm.values).toEqual([
      1 / 800, 0, 0,
      0, 1 / 600, 0,
      0, 0, 1
    ])
  })

  it('should calculate safe bounds correctly', () => {
    const calculator = new ImageTransformCalculator()
    const imageSize = { width: 800, height: 600 }
    const viewportSize = { width: 1024, height: 768 }
    const headerHeight = 50

    const bounds = calculator.calculateSafeBounds(imageSize, viewportSize, headerHeight)
    expect(bounds.minX).toBeLessThan(bounds.maxX)
    expect(bounds.minY).toBeLessThan(bounds.maxY)
  })

  it('should generate target position with variance', () => {
    const calculator = new ImageTransformCalculator()
    const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 }
    const focalPoint = { x: 0.5, y: 0.5 }

    const position = calculator.generateTargetPosition(bounds, focalPoint, 0.2)
    expect(position.x).toBeGreaterThanOrEqual(bounds.minX)
    expect(position.x).toBeLessThanOrEqual(bounds.maxX)
    expect(position.y).toBeGreaterThanOrEqual(bounds.minY)
    expect(position.y).toBeLessThanOrEqual(bounds.maxY)
  })

  it('should calculate animation transforms correctly', () => {
    const calculator = new ImageTransformCalculator()
    const imageSize = { width: 800, height: 600 }
    const viewportSize = { width: 1024, height: 768 }
    const headerHeight = 50
    const focalPoints = { main: { x: 0.5, y: 0.5 }, secondary: { x: 0.2, y: 0.2 } }

    const transforms = calculator.calculateAnimationTransforms(imageSize, viewportSize, headerHeight, focalPoints)
    expect(transforms.start).toBeInstanceOf(Mat3)
    expect(transforms.end).toBeInstanceOf(Mat3)
  })
})

describe('ScaleCalculator', () => {
  describe('calculateMinimumScale', () => {
    it('should calculate the minimum scale based on width and height', () => {
      const imageSize: ImageSize = { width: 800, height: 600 }
      const viewportSize: ViewportSize = { width: 1000, height: 800 }
      const minOverflow = 100
      const headerHeight = 50

      const result = ScaleCalculator.calculateMinimumScale(imageSize, viewportSize, minOverflow, headerHeight)

      expect(result.scale).toBeCloseTo(1.4167, 4)
      expect(result.scaledDimensions.width).toBeCloseTo(1133.33, 2)
      expect(result.scaledDimensions.height).toBeCloseTo(850, 2)
      expect(result.actualOverflow.horizontal).toBeCloseTo(66.67, 2)
      expect(result.actualOverflow.vertical).toBeCloseTo(50, 2)
      expect(result.constrainedBy).toBe('height')
    })

    it('should handle zero header height', () => {
      const imageSize: ImageSize = { width: 500, height: 400 }
      const viewportSize: ViewportSize = { width: 600, height: 500 }
      const minOverflow = 50
      const headerHeight = 0

      const result = ScaleCalculator.calculateMinimumScale(imageSize, viewportSize, minOverflow, headerHeight)

      expect(result.scale).toBeCloseTo(1.375, 3)
      expect(result.scaledDimensions.width).toBeCloseTo(687.5, 1)
      expect(result.scaledDimensions.height).toBeCloseTo(550, 1)
      expect(result.actualOverflow.horizontal).toBeCloseTo(43.75, 2)
      expect(result.actualOverflow.vertical).toBeCloseTo(25, 2)
      expect(result.constrainedBy).toBe('height')
    })
  })

  describe('calculateOptimalTransformation', () => {
    it('should calculate optimal transformations based on focal points', () => {
      const imageSize: ImageSize = { width: 1200, height: 800 }
      const viewportSize: ViewportSize = { width: 1000, height: 700 }
      const focalPoints: FocalPoints = {
        main: { x: 0.5, y: 0.5 },
        secondary: { x: 0.3, y: 0.7 },
      }
      const minOverflow = 100
      const headerHeight = 50

      const result = ScaleCalculator.calculateOptimalTransformation(
        imageSize,
        viewportSize,
        focalPoints,
        minOverflow,
        headerHeight
      )

      expect(result.scale).toBeCloseTo(0.9375, 4)
      expect(result.scaledDimensions.width).toBeCloseTo(1125, 1) // 1200 * 0.9375 = 1125
      expect(result.scaledDimensions.height).toBeCloseTo(750, 2) // 800 * 0.9375 = 750
      expect(result.actualOverflow.horizontal).toBeCloseTo(62.5, 2) // (1125 - 1000)/2 = 62.5
      expect(result.actualOverflow.vertical).toBeCloseTo(50, 2) // (750 - 650)/2 = 50
      expect(result.bounds.x.min).toBeCloseTo(-62.5, 2)
      expect(result.bounds.x.max).toBeCloseTo(62.5, 2)
      expect(result.bounds.y.min).toBeCloseTo(-50, 2)
      expect(result.bounds.y.max).toBeCloseTo(50, 2)

      expect(result.transforms.start).toBeDefined()
      expect(result.transforms.end).toBeDefined()
    })

    it('should return correct transformations when focal points are at edges', () => {
      const imageSize: ImageSize = { width: 1600, height: 900 }
      const viewportSize: ViewportSize = { width: 1280, height: 720 }
      const focalPoints: FocalPoints = {
        main: { x: 1, y: 1 },
        secondary: { x: 0, y: 0 },
      }
      const minOverflow = 100
      const headerHeight = 0

      const result = ScaleCalculator.calculateOptimalTransformation(
        imageSize,
        viewportSize,
        focalPoints,
        minOverflow,
        headerHeight
      )

      expect(result.scale).toBeCloseTo(0.9111, 4)
      expect(result.scaledDimensions.width).toBeCloseTo(1457.78, 1) // 1600 * 0.9111 ≈ 1457.78
      expect(result.scaledDimensions.height).toBeCloseTo(820, 1) // 900 * 0.9111 ≈ 820
      expect(result.actualOverflow.horizontal).toBeCloseTo(88.89, 2) // (1457.78 -1280)/2 ≈ 88.89
      expect(result.actualOverflow.vertical).toBeCloseTo(50, 2) // (820 -720)/2 = 50
      expect(result.bounds.x.min).toBeCloseTo(-88.89, 2)
      expect(result.bounds.x.max).toBeCloseTo(88.89, 2)
      expect(result.bounds.y.min).toBeCloseTo(-50, 2)
      expect(result.bounds.y.max).toBeCloseTo(50, 2)

      expect(result.transforms.start).toBeDefined()
      expect(result.transforms.end).toBeDefined()
    })
  })

  describe('generateCSSProperties', () => {
    it('should generate correct CSS properties from calculations', () => {
      const calculations: CssCalculations = {
        scale: 1.3,
        scaledDimensions: { width: 1040, height: 780 },
        actualOverflow: { horizontal: 20, vertical: 10 },
      }

      const cssProps = ScaleCalculator.generateCSSProperties(calculations)

      expect(cssProps['--scale']).toBe(1.3)
      expect(cssProps['--min-width']).toBe('1040px')
      expect(cssProps['--min-height']).toBe('780px')
      expect(cssProps['--x-overflow']).toBe('20px')
      expect(cssProps['--y-overflow']).toBe('10px')
    })

    it('should handle zero overflow correctly', () => {
      const calculations: CssCalculations = {
        scale: 1.0,
        scaledDimensions: { width: 800, height: 600 },
        actualOverflow: { horizontal: 0, vertical: 0 },
      }

      const cssProps = ScaleCalculator.generateCSSProperties(calculations)

      expect(cssProps['--scale']).toBe(1.0)
      expect(cssProps['--min-width']).toBe('800px')
      expect(cssProps['--min-height']).toBe('600px')
      expect(cssProps['--x-overflow']).toBe('0px')
      expect(cssProps['--y-overflow']).toBe('0px')
    })
  })
})
