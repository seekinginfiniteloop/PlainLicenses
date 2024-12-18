export interface HeroState {
  atHome: boolean
  landingVisible: boolean
  pageVisible: boolean
  eggActive: boolean
  prefersReducedMotion: boolean
  newToHome: boolean // an oddball, the impact animation will switch off when it's done; everything else is set by HeroStore
  viewport: Viewport
  location: URL
}

export type StatePredicate = (_state: HeroState) => boolean

export interface CarouselState {
  canPlay: boolean
  shouldPause: boolean
}

export interface ImpactState {
  canPlay: boolean
  shouldStop: boolean
}

export interface PanningState {
  canPan: boolean
  shouldPause: boolean
}

export interface ScrollState {
  canScrollTo: boolean
  canTrigger: boolean
  useReducedTriggers: boolean
}

export type ScrollToState = Pick<ScrollState, 'canScrollTo'>
export type ScrollTriggerState = Pick<ScrollState, 'canTrigger' | 'useReducedTriggers'>
