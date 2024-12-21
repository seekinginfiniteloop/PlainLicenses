
export interface CarouselConfig {
  interval: number
  maxImagesInLayer: number
  layer: HTMLElement
}

export interface ImpactConfig {
  // debrisOriginRatio: fraction of element width to define debris origin's radius (e.g, 0.25 means debris can originate from within the element and 25% of its width outside)
  debrisOriginRatio: number
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
