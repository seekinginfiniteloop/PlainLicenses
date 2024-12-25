
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
  letterTotalDuration: number

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

export interface AnimationConfig {
  defaultParentVars: gsap.TimelineVars
  defaultChildVars: gsap.TimelineVars

}

export interface FadeConfig {
  fadeInSections: readonly string[] // selectors for fade-ins
  fadeInDuration: number // duration of fade-in
}

export interface SlideConfig {
  slideDuration: number // duration of slide
  clickPause: number // pause duration on click
  scrollPause: number // pause duration on scroll
}

export interface ObserverConfig {
  fades: FadeConfig
  slides: SlideConfig
  clickTargets: string // selector class for click targets
  ignoreTargets: string // selectors for ignored targets
}
