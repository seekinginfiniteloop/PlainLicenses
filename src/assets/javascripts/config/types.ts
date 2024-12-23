
export interface CarouselConfig {
  interval: number
  maxImagesInLayer: number
  layer: HTMLElement
}

export interface ImpactConfig {
  // debrisOriginRadius: fraction of element width to define debris origin's radius (e.g, 0.25 means debris can originate from within the element and 25% of its width outside)
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

  baseColors: string[]
  extendedColors: string[]
}

export interface ImpactElementConfig {
  id: string
  axis: string
  textType: string
  maxParticles?: number
  isButton?: boolean
}

export interface ImpactDebrisConfig extends gsap.TimelineVars {
  originRect: DOMRect
  headerAdjust: number
}

export interface ImpactTextConfig extends gsap.TimelineVars {
  textType: string
  axis: string
}

export interface scrollToConfig {
  firstScrollRatio: number // ratio of total duration to first scroll
  secondScrollRatio: number
  timelineVars: gsap.TimelineVars
}

export interface scrollTriggerConfig {
  fadeInOne: string
  fadeInTwoDuration: number
}

export interface AnimationConfig {
  defaultParentVars: gsap.TimelineVars
  defaultChildVars: gsap.TimelineVars

}
