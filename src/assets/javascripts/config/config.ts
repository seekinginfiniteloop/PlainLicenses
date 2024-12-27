/**
 * @module config
 * @description Main configuration file for the application; you should set up any changes to the application here.
 *
 * @exports CACHE_CONFIG - Configuration for the cache
 * @exports CAROUSEL_CONFIG - Configuration for carousel images
 * @exports IMPACT_CONFIG - Configuration for impact animations
 * @exports IMPACT_ELEMENT_CONFIG - Configuration for impact animation elements
 *
 * @type {@link module:./types} - {@link CacheConfig} - Configuration for the cache
 * @type {@link module:./types} - {@link CarouselConfig} - Configuration for carousel images
 * @type {@link module:./types} - {@link ImpactConfig} - Configuration for impact animations
 * @type {@link module:./types} - {@link ImpactElementConfig} - Configuration for impact animation elements
 * @type {@link module:./types} - {@link ObserverConfig} - Configuration for the observer
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 */

import type { CacheConfig, CarouselConfig, ImpactConfig, ImpactElementConfig, ObserverConfig } from "./types"

/**
 * @exports CACHE_CONFIG
 * @constant
 * @type {CacheConfig} CACHE_CONFIG
 * @description Configuration for the cache
 */
export const CACHE_CONFIG: CacheConfig = {
  cacheName: "static-assets-cache-v1",
  rootUrl: "assets/",
  assetTypes: {
    image: {
      cacheable: true,
      contentType: 'image'
    },
    font: {
      cacheable: true,
      contentType: 'font'
    },
    style: {
      cacheable: true,
      contentType: 'text/css'
    },
    script: {
      cacheable: true,
      contentType: 'application/javascript'
    }
  }
} as const

/**
 * @exports CAROUSEL_CONFIG
 * @constant
 * @type {CarouselConfig} CAROUSEL_CONFIG
 * @description Configuration for carousel images
 */
export const CAROUSEL_CONFIG: CarouselConfig = {
  interval: 20000,
  maxImagesInLayer: 3,
  layer: document.getElementById("parallax-layer") as HTMLElement
} as const

const baseColors = ['var(--atomic-tangerine)', 'var(--turkey-red)', 'var(--saffron)', 'var(--mindaro)', 'var(--burgundy)']

/**
 * @exports IMPACT_CONFIG
 * @constant
 * @type {ImpactConfig} IMPACT_CONFIG
 * @description Configuration for impact animations
 */
export const IMPACT_CONFIG: ImpactConfig = {
  debrisOriginRadius: 1.25,
  // particle glow settings
  glowDuration: 0.25,
  glowIntensity: 2,
  glowPulsations: 3,
  // particle settings
  minParticles: 5,
  maxParticles: 16,
  minParticleSize: 1,
  maxParticleSize: 4,
  debrisTravelSpeed: 500,
  letterTravelSpeed: 50,
  letterTotalDuration: 1.5,
  baseColors,
  extendedColors: [
    ...baseColors,
    'var(--mauve)',
    'var(--ecru)',
    'var(--emerald)',
    'var(--cherry-blossom-pink)',
    'var(--shamrock-green)',
    'var(--aqua)',
    'var(--aquamarine)',
    'var(--castleton-green)',
    'var(--blue-blue)',
  ]
} as const

/**
 * @exports IMPACT_ELEMENT_CONFIG
 * @constant
 * @type {ImpactElementConfig} IMPACT_ELEMENT_CONFIG
 */
export const IMPACT_ELEMENT_CONFIG: ImpactElementConfig[] =
  [
    {
      id: '#CTA_header',
      axis: 'y' as "x" | "y",
      textType: 'h1' as "h1" | "p" | "button",
    },
    {
      id: '#CTA_paragraph',
      axis: 'x' as "x" | "y",
      textType: 'p' as "h1" | "p" | "button",
    },
    {
      id: '#hero-primary-button',
      axis: 'x' as "x" | "y",
      textType: 'button' as "h1" | "p" | "button",
      maxParticles: 32,
      isButton: true
    }
  ] as ImpactElementConfig[]

/**
 * @exports OBSERVER_CONFIG
 * @constant
 * @type {ObserverConfig} OBSERVER_CONFIG
 * @description Configuration for the observer
 */
export const OBSERVER_CONFIG: ObserverConfig = {
  fades: {
    fadeInSections: ['.hero__parallax', '#pt2-hero-content-section', '#pt3-hero-content-section'],
    fadeInDuration: 0.5
  },
  slides: {
    slideDuration: 1.25,
    clickPause: 5,
    scrollPause: 10
  },
  clickTargets: 'hero-target-selector',
  ignoreTargets: 'a, button, clickTargets, #the-egg, header, navigation, md-tabs'
} as const
