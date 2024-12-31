/**
 * @module config
 * @description Main configuration file for the application; you should set up any changes to the application here.
 *
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 */

import type { CacheConfig, ObserverConfig } from "./types"

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
