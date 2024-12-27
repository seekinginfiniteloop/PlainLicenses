/**
 * @module config/types
 * @description Types for configuration objects
 *
 * @exports AssetTypeConfig
 * @exports CacheConfig
 * @exports CarouselConfig
 * @exports ImpactConfig
 * @exports ImpactElementConfig
 * @exports AnimationConfig
 * @exports FadeConfig
 * @exports SlideConfig
 * @exports ObserverConfig
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */

/**
 * @exports AssetTypeConfig
 * @interface AssetTypeConfig
 * @description Configuration for cacheable asset types
 */
interface AssetTypeConfig {
  cacheable: boolean
  contentType?: string
}

/**
 * @exports CacheConfig
 * @interface CacheConfig
 * @description Configuration for cache
 * @property {string} cacheName - name of the cache
 * @property {Record<string, AssetTypeConfig>} assetTypes - asset types for the cache
 */
export interface CacheConfig {
  cacheName: string
  rootUrl: string
  assetTypes: Record<string, AssetTypeConfig>
}

/**
 * @exports CarouselConfig
 * @interface CarouselConfig
 * @description Configuration for carousel images
 * @property {number} interval - interval between carousel slides
 * @property {number} maxImagesInLayer - maximum number of images in a layer
 * @property {HTMLElement} layer - the image layer for carousel images
 */
export interface CarouselConfig {
  interval: number
  maxImagesInLayer: number
  layer: HTMLElement
}

/**
 * @exports ImpactConfig
 * @interface ImpactConfig
 * @description Configuration for impact animations
 * @property {number} debrisOriginRadius - fraction of element width to define debris origin's radius (e.g, 0.25 means debris can originate from within the element and 25% of its width outside)
 * @property {number} glowDuration - duration of particle glow
 * @property {number} glowIntensity - intensity of particle glow
 * @property {number} glowPulsations - number of pulsations in particle glow
 * @property {number} minParticles - minimum number of particles
 * @property {number} maxParticles - maximum number of particles
 * @property {number} minParticleSize - minimum particle size
 * @property {number} maxParticleSize - maximum particle size
 * @property {number} debrisTravelSpeed - speed of debris travel
 * @property {number} letterTravelSpeed - speed of letter travel
 * @property {number} letterTotalDuration - total duration of letter travel
 * @property {string[]} baseColors - base colors for particles
 * @property {string[]} extendedColors - extended colors for particles
 */
export interface ImpactConfig {
  debrisOriginRadius: number
  // particle glow settings
  glowDuration: number
  glowIntensity: number
  glowPulsations: number
  // particle settings
  minParticles: number
  maxParticles: number
  minParticleSize: number
  maxParticleSize: number
  debrisTravelSpeed: number
  letterTravelSpeed: number
  letterTotalDuration: number

  baseColors: string[]
  extendedColors: string[]
}

/**
 * @exports ImpactElementConfig
 * @interface ImpactElementConfig
 * @description Configuration for impact elements
 * @property {string} id - element ID for impact
 * @property {"x" | "y"} axis - axis of impact
 * @property {"h1" | "p" | "button"} textType - type of text element
 * @property {number} maxParticles - maximum number of particles
 * @property {boolean} isButton - whether element is a button
 */
export interface ImpactElementConfig {
  id: string
  axis: "x" | "y"
  textType: "h1" | "p" | "button"
  maxParticles?: number
  isButton?: boolean
}

/**
 * @exports AnimationConfig
 * @interface AnimationConfig
 * @description Configuration for animations, extends gsap.TimelineVars to include default variables for parent and child elements
 * @property {gsap.TimelineVars} defaultParentVars - default timeline variables for parent elements
 * @property {gsap.TimelineVars} defaultChildVars - default timeline variables for child elements
 */
export interface AnimationConfig {
  defaultParentVars: gsap.TimelineVars
  defaultChildVars: gsap.TimelineVars
}

/**
 * @exports FadeConfig
 * @interface FadeConfig
 * @description Configuration for Observer fade-in animations
 * @property {readonly string[]} fadeInSections - selectors for fade-ins; these are the sections that we will get elements from for the fade-in effect
 * @property {number} fadeInDuration - duration of fade-in
 */
export interface FadeConfig {
  fadeInSections: readonly string[]
  fadeInDuration: number
}

/**
 * @exports SlideConfig
 * @interface SlideConfig
 * @description Configuration for Observer slide animations
 * @property {number} slideDuration
 * @property {number} clickPause
 * @property {number} scrollPause
 */
export interface SlideConfig {
  slideDuration: number // duration of slide
  clickPause: number // pause duration on click
  scrollPause: number // pause duration on scroll
}

/**
 * @exports ObserverConfig
 * @interface ObserverConfig
 * @description Configuration for Observer animations
 * @property {FadeConfig} fades - configuration for fade-in animations
 * @property {SlideConfig} slides - configuration for slide animations
 * @property {string} clickTargets - selector class for click targets
 * @property {string} ignoreTargets - selectors for ignored targets
 */
export interface ObserverConfig {
  fades: FadeConfig
  slides: SlideConfig
  clickTargets: string
  ignoreTargets: string
}
