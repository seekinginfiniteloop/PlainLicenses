/**
 * @module types - Types for the hero image carousel
 *
 * @see {@link module:state} for the state management of the hero image carousel
 *
 * @description This module contains types for the hero image carousel.
 *
 * @exports @type {RangeMap} - A range map
 * @exports @type {ImageMap} - A map of images
 * @exports @type {FocalPoint} - A focal point
 * @exports @interface Conditions - Conditions for the hero image carousel
 * @exports @interface Point - A point
 * @exports @interface HeroImage - A hero image
 * @exports @interface ImageConfig - An image configuration
 * @exports @interface ImageFocalPoints - Focal points for an image
 */

/**
 * @exports @type {RangeMap} - A range map
 * @property {Array<number>} range - A range of resolution values
 * @property {number} value - A value
 */
export type RangeMap = {
  range: [number, number]
  value: number
}

/**
 * @exports @type {ImageMap} - A map of images
 */
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

/**
 * @exports @type {FocalPoint} - A focal point
 * @property {number} x - The x-coordinate percentage
 * @property {number} y - The y-coordinate percentage
 * @description A focal point in an image. Importantly, it is defined in decimal percentages of the image's width and height.
 */
export type FocalPoint = { x: number, y: number }

/**
 * @exports @interface HeroImage - A hero image
 * @property {string} imageName - The image name
 * @property {string} parent - The parent folder
 * @property {Record<number, string>} widths - The widths of the image mapped to urls
 * @property {string} srcset - The srcset of the image
 * @property {symbol} [symbol] - The symbol of the image
 */
export interface HeroImage {
  imageName: string
  parent: string
  widths: Record<number, string>
  srcset: string
  symbol?: symbol
  focalPoints?: ImageFocalPoints
}

/**
 * @exports @interface ImageConfig - An image configuration
 * @property {string} url - The image url
 * @property {number} width - The image width
 * @property {number} height - The image height
 * @property {ImageFocalPoints} focalPoints - The image focal points
 */
export interface ImageConfig {
  url: string
  width: number
  height: number
  focalPoints: ImageFocalPoints
}

/**
 * @exports @interface ImageFocalPoints - Focal points for an image
 * @property {FocalPoint} main - The main focal point
 * @property {FocalPoint} secondary - The secondary focal point
 */
export interface ImageFocalPoints {
  main: FocalPoint
  secondary: FocalPoint
}
