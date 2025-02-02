/**
 * @module config
 * @description Main configuration file for the application; you should set up any changes to the application here.
 *
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 */
import gsap from "gsap"
import { EmphasisConfig } from "~/features"
import type { FadeInConfig, ObserverConfig } from "./types"

// tags to exclude from animation
export const EXCLUDED_TAGS = ["STYLE", "SCRIPT", "NOSCRIPT"] as const

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
    },
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
    },
  },
  defaults: {
    autoAlpha: 0,
    ease: "power1.inOut",
    repeat: 0,
    paused: true,
  },
} as const

/**
 * @type {ObserverConfig} OBSERVER_CONFIG
 * @description Configuration for the observer
 */
export const OBSERVER_CONFIG: ObserverConfig = {
  fades: {
    fadeInSections: gsap.utils.toArray("section"),
    fadeInDuration: 0.5,
    fadeInConfig: FADE_IN_CONFIG,
    fadeInIgnore: ".cta__container--header, .cta__container--subtitle",
  },
  slides: {
    sections: gsap.utils.toArray("section"),
    slideDuration: 1.25,
    clickPause: 5,
    scrollPause: 10,
  },
  clickTargets: ".cta__container--target-selector",
  ignoreTargets: "a, button, header, navigation, .md-tabs",
  emphasisTargets: {
    subtle: ".cta__container--target-selector>button",
    strong: ".cta__container--down-indicator",
  },
} as const

/**
 * Minimum widths for video source media queries
 * Keys are the width of the video
 * Values are the minimum width of the viewport
 */
export const MAX_WIDTHS = {
  426: "426",
  640: "640",
  854: "854",
  1280: "1280",
  1920: "1920",
  2560: "2560",
  3840: "3840",
} as const

export const SUBTLE_EMPHASIS_CONFIG: EmphasisConfig = {
  blinkConfig: {
    startAt: { filter: "brightness(1.1)" },
    autoAlpha: 0.4,
    duration: 1,
    ease: "power1.inOut",
    repeat: -1,
    yoyo: true,
    repeatDelay: 0.5,
    filter: "brightness(1.1)",
  },
  jumpConfig: {
    y: -2,
    duration: 0.5,
    ease: "elastic",
    repeatDelay: 4,
    repeat: -1,
    yoyoEase: "elastic",
  },
  scaleUpConfig: { scale: 1.1, duration: 1, repeatDelay: 4, repeat: -1, ease: "power1.inOut" },
} as const

export const STRONG_EMPHASIS_CONFIG: EmphasisConfig = {
  blinkConfig: { yoyoEase: "power1.in", repeat: -1, repeatDelay: 0.5, autoAlpha: 0.4 },
  jumpConfig: {},
  scaleUpConfig: { duration: 1 },
} as const
