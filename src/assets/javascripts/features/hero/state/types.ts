/* eslint-disable no-unused-vars */
/**
 * @module types (state)
 * @description Types for the Hero feature state management.
 *
 * @type {@link module:~/components} - {@link Header} - Header component
 *
 * @exports @interface HeroState
 * @exports @enum {AnimationComponent} - AnimationComponent - Animation component types
 * @exports @type {StatePredicate}
 * @exports @type {CarouselState}
 * @exports @type {ImpactState}
 * @exports @type {PanningState}
 * @exports @type {ScrollState}
 * @exports @interface LandingPermissions
 * @exports @type {ComponentState}
 * @exports @type {ComponentUpdateFunction}
 */

import { Header } from "~/components"

/**
 * @exports HeroState
 * @interface HeroState
 * @property {boolean} atHome - Whether the user is at the home page
 * @property {boolean} landingVisible - Whether the landing element is visible
 * @property {boolean} pageVisible - Whether the page is visible
 * @property {boolean} eggActive - Whether the egg is active
 * @property {boolean} prefersReducedMotion - Whether the user prefers reduced motion
 * @property {boolean} newToHome - Whether the user is new to the home page
 * @property {Viewport} viewport - Viewport dimensions
 * @property {Header} header - Header component
 * @property {number} parallaxHeight - Parallax height
 * @property {URL} location - URL location
 * @property {boolean} tearDown - Flag for teardown
 */
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

/**
 * @enum {AnimationComponent}
 * @description Animation component types
 */
export enum AnimationComponent {
  Carousel = 'carousel',
  Impact = 'impact',
  Panning = 'panning',
  ScrollTrigger = 'scrollTrigger'
}

/**
 * @exports StatePredicate
 * @type {StatePredicate}
 * @description State predicate type
 */
export type StatePredicate = (_state: HeroState) => boolean

/**
 * @exports CarouselState
 * @type {CarouselState}
 * @description Carousel state
 */
export type CarouselState = { canPlay: boolean }

/**
 * @exports ImpactState
 * @type {ImpactState}
 * @description Impact state
 */
export type ImpactState = { canPlay: boolean }

/**
 * @exports PanningState
 * @type {PanningState}
 * @description Panning state
 */
export type PanningState = { canPan: boolean }

/**
 * @exports ScrollState
 * @type {ScrollState}
 * @description Scroll state
 */
export type ScrollState = { canTrigger: boolean }

/**
 * @exports LandingPermissions
 * @interface LandingPermissions
 * @property {boolean} canPan - Whether the user can pan
 * @property {boolean} canCycle - Whether the user can cycle
 * @property {boolean} canImpact - Whether the user can impact
 * @description Interface that's broadcasted for signaling landing component permissions
 */
export interface LandingPermissions {
  canPan: boolean
  canCycle: boolean
  canImpact: boolean
}

/**
 * @exports ComponentState
 * @type {ComponentState}
 * @description Component state
 */
export type ComponentState = CarouselState | ImpactState | PanningState

/**
 * @exports ComponentUpdateFunction
 * @type {ComponentUpdateFunction}
 * @description Component update function
 */
export type ComponentUpdateFunction = (_state: ComponentState) => void // updates the component state but there's no return value
