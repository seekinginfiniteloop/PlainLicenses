import { CarouselConfig } from "./types"

export const CAROUSEL_CONFIG: CarouselConfig = {
  interval: 20000,
  maxImagesInLayer: 3,
  layer: document.getElementById("parallax-layer") as HTMLElement
} as const

export const IMPACT_CONFIG = {
  // debrisOriginRatio: fraction of element width to define debris origin's radius (e.g, 0.25 means debris can originate from within the element and 25% of its width outside)
  debrisOriginRatio: 0.25,
  // particle glow settings
  glowDuration: 0.25,
  glowIntensity: 2,
  glowPulsations: 3,
  // particle settings
  minParticles: 5,
  maxParticles: 16,
  minParticleSize: 1,
  maxParticleSize: 4,
  travelSpeed: 500

} as const

export const SCROLL_TO_CONFIG = {
  firstScrollRatio: 0.4, // ratio of total duration to first scroll
  secondScrollRatio: 0.6,
  timelineVars: {
    }
} as const
