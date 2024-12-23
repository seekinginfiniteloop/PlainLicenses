/**
 * @module types (carousel)
 * @description Types for the Hero feature image carousel.
 *
 * @exports
 * -----------------
 * @interface Conditions
 * @interface HeroImage
 * @interface ImageConfig
 * @interface ImageFocalPoints
 * @interface Point
 * @type {FocalPoint}
 * @type {ImageMap}
 * @type {RangeMap}
 */

export type RangeMap = {
  range: [number, number]
  value: number
}

export type ImageMap = Map<symbol, HeroImage>

export interface Conditions {
  canCycle: boolean
  prefersReducedMotion: boolean
  imageLoaded: boolean
  newlyArrived: boolean
  errorInPan: boolean
}

export interface Point {
  x: number
  y: number
}

// FocalPoint isn't a Point in the same sense as Point... its values are decimal percentages of the image (e.g., 0.5, 0.5 is the center of the image)
export type FocalPoint = { x: number, y: number }


export interface HeroImage {
  imageName: string
  parent: string
  widths: Record<number, string>
  srcset: string
  symbol?: symbol
  focalPoints?: ImageFocalPoints
}

export interface ImageConfig {
  url: string
  width: number
  height: number
  focalPoints: ImageFocalPoints
}
export interface ImageFocalPoints {
  main: FocalPoint
  secondary: FocalPoint
}
