/**
 * @module config/types
 * @description Types for configuration objects
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */

/**
 * @description Configuration for cacheable asset types
 */
interface AssetTypeConfig {
  cacheable: boolean
  contentType?: string
}

/**
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
 * @description Configuration for fade-in animations
 */
export interface FadeInConfig {
  prefersReducedMotion: {
    from: gsap.TweenVars
    to: gsap.TweenVars
  }
  normal: {
    from: gsap.TweenVars
    to: gsap.TweenVars
  }
  defaults: gsap.TimelineVars
}

/**
 * @description Configuration for Observer fade-in animations
 * @property {HTMLElement[]} fadeInSections - array of sections to fade in
 * @property {number} fadeInDuration - duration of fade-in
 */
export interface FadeConfig {
  fadeInSections: HTMLElement[]
  fadeInDuration: number
  fadeInConfig: FadeInConfig
}

/**
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
