/* eslint-disable no-unused-vars */
/**
 * @module types (state)
 * @description Types for the Hero feature state management.
 * @requires ../components
 *
 * @exports
 * -----------------
 * @enum {AnimationComponent}
 * @interface ComponentState
 * @interface HeroState
 * @interface PanningState
 * @interface ScrollState
 * @type {CarouselState}
 * @type {ComponentUpdateFunction}
 * @type {ImpactState}
 * @type {LandingPermissions}
 * @type {ScrollToState}
 * @type {ScrollTriggerState}
 * @type {StatePredicate}
 */

import { Header } from "~/components"


export interface HeroState {
  atHome: boolean
  landingVisible: boolean
  pageVisible: boolean
  eggActive: boolean
  prefersReducedMotion: boolean
  newToHome: boolean // an oddball, the impact animation will switch off when it's done; everything else is set by HeroStore
  viewport: Viewport
  header: Header
  parallaxHeight: number
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
}

export type ScrollToState = Pick<ScrollState, 'canScrollTo'>
export type ScrollTriggerState = Pick<ScrollState, 'canTrigger'>

export interface LandingPermissions {
  canPan: boolean
  canCycle: boolean
  canImpact: boolean
}

export type ComponentState = CarouselState | ImpactState | PanningState | ScrollState | ScrollToState | ScrollTriggerState

export type ComponentUpdateFunction = (_state: ComponentState) => void // updates the component state but there's no return value
