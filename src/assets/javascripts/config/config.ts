/**
 * @module config
 * @description Main configuration file for the application; you should set up any changes to the application here.
 *
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 */

import type { CacheConfig, FadeInConfig, ObserverConfig } from "./types"

/**
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
    },
    video: {
      cacheable: true,
      contentType: 'video'
    }
  }
} as const

const FADE_IN_CONFIG: FadeInConfig = {
  prefersReducedMotion: {
    from: {
      autoAlpha: 0,
      duration: 0.75,
      y: 0,
    },
    to: {
      autoAlpha: 1,
      duration: 0.75,
      y: 0,
    }
  },
  normal: {
    from: {
      autoAlpha: 0,
      y: 75,
    },
    to: {
      autoAlpha: 1,
      duration: 0.5,
      y: 0,
    }
  },
  defaults: {
    autoAlpha: 0,
    ease: 'power1.inOut',
    repeat: 0,
    paused: true,
  }
} as const

/**
 * @type {ObserverConfig} OBSERVER_CONFIG
 * @description Configuration for the observer
 */
export const OBSERVER_CONFIG: ObserverConfig = {
  fades: {
    fadeInSections: Array.from(document.getElementsByTagName('section')),
    fadeInDuration: 0.5,
    fadeInConfig: FADE_IN_CONFIG
  },
  slides: {
    slideDuration: 1.25,
    clickPause: 5,
    scrollPause: 10
  },
  clickTargets: 'hero-target-selector',
  ignoreTargets: 'a, button, clickTargets, header, navigation, md-tabs'
} as const

/**
 * Minimum widths for video source media queries
 * Keys are the width of the video
 * Values are the minimum width of the viewport
 */
export const MAX_WIDTHS = {
  426: '426',
  640: '640',
  854: '854',
  1280: '1280',
  1920: '1920',
  2560: '2560',
  3840: '3840'
} as const
