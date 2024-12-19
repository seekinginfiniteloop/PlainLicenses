/* eslint-disable no-unused-vars */
/**
 * @module types (state)
 * @description Types for the Hero feature state management.
 * @exports HeroState
 * @exports AnimationComponent
 * @exports StatePredicate
 * @exports CarouselState
 * @exports ImpactState
 * @exports PanningState
 * @exports ScrollState
 * @exports ScrollToState
 * @exports ScrollTriggerState
 * @exports ComponentState
 * @exports ComponentUpdateFunction
 * @exports LandingPermissions
 */


export interface HeroState {
  atHome: boolean
  landingVisible: boolean
  pageVisible: boolean
  eggActive: boolean
  prefersReducedMotion: boolean
  newToHome: boolean // an oddball, the impact animation will switch off when it's done; everything else is set by HeroStore
  viewport: Viewport
  location: URL
  tearDown: boolean
}

export enum AnimationComponent {
  Carousel = 'carousel',
  Impact = 'impact',
  Panning = 'panning',
  ScrollTo = 'scrollTo',
  ScrollTrigger = 'scrollTrigger'
}

export type StatePredicate = (_state: HeroState) => boolean

export type CarouselState = {canPlay: boolean}

export type ImpactState = {canPlay: boolean}

export interface PanningState { canPan: boolean}

export interface ScrollState {
  canScrollTo: boolean
  canTrigger: boolean
  useReducedTriggers: boolean
}

export type ScrollToState = Pick<ScrollState, 'canScrollTo'>
export type ScrollTriggerState = Pick<ScrollState, 'canTrigger' | 'useReducedTriggers'>

export interface LandingPermissions {
  canPan: boolean
  canCycle: boolean
  canImpact: boolean
}

export type ComponentState = CarouselState | ImpactState | PanningState | ScrollState | ScrollToState | ScrollTriggerState

export type ComponentUpdateFunction = (_state: ComponentState) => void // updates the component state but there's no return value
