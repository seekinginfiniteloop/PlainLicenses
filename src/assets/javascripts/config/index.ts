import { CarouselConfig } from "./types"

const baseColors = ['var(--atomic-tangerine)', 'var(--turkey-red)', 'var(--saffron)', 'var(--mindaro)', 'var(--burgundy)']

export const CAROUSEL_CONFIG: CarouselConfig = {
  interval: 20000,
  maxImagesInLayer: 3,
  layer: document.getElementById("parallax-layer") as HTMLElement
} as const

export const IMPACT_CONFIG = {
  // debrisOriginRadius: fraction of element width to define debris origin's radius (e.g, 1.25 means debris can originate from within the element and a radius of 25% of its width outside)
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

export const IMPACT_ELEMENT_CONFIG =
  [
    {
      id: '#CTA_header',
      axis: 'y' as const,
      textType: 'h1' as const,
    },
    {
      id: '#CTA_paragraph',
      axis: 'x' as const,
      textType: 'p' as const,
    },
    {
      id: '#hero-primary-button',
      axis: 'x' as const,
      textType: 'button' as const,
      maxParticles: 32,
      isButton: true
    }
  ] as const

export const SCROLL_TO_CONFIG = {
  firstScrollRatio: 0.4, // ratio of total duration to first scroll
  secondScrollRatio: 0.6,
  timelineVars: {
  }
} as const
