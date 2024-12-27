/* eslint-disable no-unused-vars */
/**
 * @module types (animations)
 * @description Types for the Hero feature animations.
 *
 * @dependencies
 * - {@link module:heroImages} - {@link heroImages} - Hero image data
 *
 * @requires gsap
 *
 * @exports @enum {AnimationState}
 * @exports @type {ImageKey}
 * @exports @type {PanningKey}
 * @exports @type {AnimationType}
 * @exports @type {Animations}
 * @exports @type {HeroKey}
 * @exports @type {HeroValue}
 * @exports @interface TimelineData
 * @exports @interface ParticleConfig
 * @exports @interface PageDimensions
 * @exports @interface OriginDimensions
 * @exports @interface MaxDistance
 * @exports @interface Debris
 * @exports @interface Rect
 * @exports @interface ImpactLetter
 * @exports @type {ImpactLetters}
 * @exports @interface GsapMatchMediaConditions
 * @exports @type {DebrisAnimationConfig}
 * @exports @type {LetterAnimationConfig}
 * @exports @interface ImpactTimeline
 * @exports @type {Section}
 */

import gsap from 'gsap'
import { HeroState } from "../state/types"
import { heroImages } from "../imageCarousel/heroImages"

/**
 * @exports @enum {AnimationState}
 * @description Animation states for the Hero feature.
 * @enum {string} AnimationState
 */
export enum AnimationState {
  Playing = "playing",
  Error = "error",
  Idle = "idle",
  Paused = "paused",
  Disabled = "disabled"
}

/**
 * @exports @type {ImageKey}
 * @description Image key for the Hero feature.
 * @type {string}
 */
type ImageKey = typeof heroImages[number]["imageName"]

/**
 * @exports @type {PanningKey}
 * @description Panning key for the Hero feature.
 * @type {string}
 */
type PanningKey = `panning-${ImageKey}`

/**
 * @exports @type {AnimationType}
 * @description Animation types for the Hero feature.
 * @type {string}
 */
export type AnimationType = "transition" | "scrollTrigger" | "scrollTo" | "impact" | PanningKey | "mainTimeline"

/**
 * @exports @type {Animations}
 * @description Animations for the Hero feature.
 * @type {Map<symbol, gsap.core.Timeline>}
 */
export type Animations = Map<symbol, gsap.core.Timeline>

/**
 * @exports @type {HeroKey}
 * @description Hero key for the Hero feature.
 * @type {keyof HeroState}
 */
export type HeroKey = keyof HeroState

/**
 * @exports @type {HeroValue}
 * @description Hero value for the Hero feature.
 * @type {HeroState[HeroKey]}
 */
export type HeroValue = HeroState[HeroKey]

/**
 * @exports @interface TimelineData
 * @description Timeline data for the Hero feature.
 * @interface TimelineData
 */
export interface TimelineData extends gsap.TimelineVars {
  canImpact: boolean
  hasImpact?: boolean
  impactDuration?: number
  canCycle: boolean
  canPan: boolean
  hasPan: boolean
  panDuration?: number
}

/** ========================================================================
 *                           Impact Types
 *========================================================================**/

/**
 * @exports @interface ParticleConfig
 * @description Particle configuration for the impact animation.
 * @interface ParticleConfig
 * @property {string} backgroundColor - The background color of the particle.
 * @property {string} borderRadius - The border radius of the particle.
 * @property {string} className - The class name of the particle.
 * @property {string} display - The display property of the particle.
 * @property {string} height - The height of the particle.
 * @property {number} opacity - The opacity of the particle.
 * @property {string} pointerEvents - The pointer events property of the particle.
 * @property {string} position - The position property of the particle.
 * @property {string} transform - The transform property of the particle.
 * @property {string} width - The width of the particle.
 * @property {string} willChange - The will-change property of the particle.
 * @property {number} zIndex - The z-index of the particle.
 */
export interface ParticleConfig {
  backgroundColor: string
  borderRadius: string
  className: string
  display: string
  height: string
  opacity: number
  pointerEvents: string
  position: string
  transform: string
  width: string // string with unit
  willChange: string
  zIndex: number
}

/**
 * @exports @interface PageDimensions
 * @description Page dimensions for the impact animation.
 * @interface PageDimensions
 * @property {number} adjustedHeight - The adjusted height of the page.
 * @property {number} headerHeight - The height of the header.
 * @property {number} height - The height of the page.
 * @property {number} width - The width of the page.
 */
export interface PageDimensions {
  adjustedHeight: number
  headerHeight: number
  height: number
  width: number
}

/**
 * @exports @interface OriginDimensions
 * @description Dimensions for the impact area of the impact animation.
 * @interface OriginDimensions
 * @property {number} centerX - The x-coordinate of the center.
 * @property {number} centerY - The y-coordinate of the center.
 * @property {Rect} originArea - The origin area.
 * @property {PageDimensions} pageDimensions - The page dimensions.
 */
export interface OriginDimensions {
  centerX: number
  centerY: number
  originArea: Rect
  pageDimensions: PageDimensions
}

/**
 * @exports @interface MaxDistance
 * @description Maximum distance for the impact animation.
 * @interface MaxDistance
 * @property {number} maxDistanceX - The maximum distance on the x-axis.
 * @property {number} maxDistanceY - The maximum distance on the y-axis.
 */
export interface MaxDistance {
  maxDistanceX: number
  maxDistanceY: number
}

/**
 * @exports @interface Debris
 * @description Debris for the impact animation.
 * @interface Debris
 * @property {HTMLDivElement} container - The debris container.
 * @property {HTMLElement} letter - The letter element (or button).
 * @property {function} retrieveParticles - The deferred function to get particles.
 * @property {function} returnParticles - The deferred function to return particles to the pool.
 */
export interface Debris {
  container: HTMLDivElement
  letter: HTMLElement
  retrieveParticles: () => HTMLDivElement[]
  returnParticles: (particles: HTMLDivElement[]) => void
}

/**
 * @exports @interface Rect
 * @description Identical to the DOMRect interface, but used for static calculations -- no live updates.
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * @exports @interface ImpactLetter
 * @description Configuration settings and calculations for an impact animation.
 * @interface ImpactLetter
 * @property {string} axis - The axis of the impact.
 * @property {HTMLDivElement[]} buttonText - The button text.
 * @property {Debris} debris - The debris.
 * @property {gsap.core.Timeline} debrisTimeline - The debris timeline.
 * @property {HTMLElement} letter - The letter or button element.
 * @property {Rect} originRect - The origin rectangle.
 * @property {string} textType - The text type.
 * @property {number} dustDuration - The duration of the dust.
 * @property {HTMLSpanElement} dustLayer - The dust layer.
 */
export interface ImpactLetter {
  axis: 'x' | 'y'
  buttonText?: HTMLDivElement[]
  debris: Debris
  debrisTimeline?: gsap.core.Timeline
  letter: HTMLElement
  originRect: Rect
  textType: "h1" | "p" | "button"
  dustDuration: number
  dustLayer: HTMLSpanElement
}

/**
 * @exports @type {ImpactLetters}
 * @description Impact letters for the impact animation.
 * @type {ImpactLetter[]}
 */
export type ImpactLetters = ImpactLetter[]

/**
 * @exports @interface GsapMatchMediaConditions
 * @description GSAP match media conditions for the impact animation.
 * @interface GsapMatchMediaConditions
 * @property {boolean} locoMotion - We can animate like crazy.
 * @property {boolean} lowMotion - User prefers reduced motion.
 */
export interface GsapMatchMediaConditions extends gsap.Conditions {
  locoMotion: boolean
  lowMotion: boolean
}

/**
 * @exports @type {DebrisAnimationConfig}
 * @description Debris animation configuration for the impact animation.
 * @type {gsap.TimelineVars & { impactLetter: ImpactLetter }}
 */
export type DebrisAnimationConfig = gsap.TimelineVars & { impactLetter: ImpactLetter }

/**
 * @exports @type {LetterAnimationConfig}
 * @description Letter animation configuration for the impact animation.
 * @type {gsap.TimelineVars & { impactLetters: ImpactLetters, parentFragment: DocumentFragment }}
 */
export type LetterAnimationConfig = gsap.TimelineVars & {
  impactLetters: ImpactLetters
  parentFragment: DocumentFragment
}

/**
 * @exports @interface ImpactTimeline
 * @description Impact timeline for the impact animation.
 * @interface ImpactTimeline
 */
export interface ImpactTimeline extends gsap.core.Timeline {
  meteorTargetAnimation?: gsap.core.Timeline
  impactConfigs?: ImpactLetters
  parentFragment?: DocumentFragment
  buttonTimeline?: gsap.core.Timeline
}


/** ============================================
 *               Observer Types
 *=============================================**/

/**
 * @exports @interface Section
 * @description Section element and content for Observer animation.
 */

export interface Section {
  readonly element: Element
  readonly content: Element[]
}
