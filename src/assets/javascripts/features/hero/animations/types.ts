/* eslint-disable no-unused-vars */
/**
 * @module types (animations)
 * @description Types for the Hero feature animations.
 * @requires ../imageCarousel/heroImages
 * @requires gsap
 *
 * @exports
 * -----------------
 * @enum {AnimationState}
 * @type {AnimationType}
 * @type {Animations}
 * @type {HeroKey}
 * @type {HeroValue}
 * @interface TimelineData
 * @interface ParticleConfig
 * @interface PageDimensions
 * @interface OriginDimensions
 * @interface MaxDistance
 * @interface Debris
 * @interface Rect
 * @interface ImpactLetter
 * @type {ImpactLetters}
 * @interface GsapMatchMediaConditions
 * @type {DebrisAnimationConfig}
 * @type {LetterAnimationConfig}
 * @interface ImpactTimeline
 */

import gsap from 'gsap'
import { HeroState } from "../state/types"
import { heroImages } from "../imageCarousel/heroImages"


export enum AnimationState {
  Playing = "playing",
  Error = "error",
  Idle = "idle",
  Paused = "paused",
  Disabled = "disabled"
}

type ImageKey = typeof heroImages[number]["imageName"]

type PanningKey = `panning-${ImageKey}`

export type AnimationType = "transition" | "scrollTrigger" | "scrollTo" | "impact" | PanningKey | "mainTimeline"

export type Animations = Map<symbol, gsap.core.Timeline>

export type HeroKey = keyof HeroState
export type HeroValue = HeroState[HeroKey]

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

export interface ParticleConfig {
  size: number
  color: string
  borderRadius: string
}

export interface PageDimensions {
  width: number
  height: number
  headerHeight: number
  adjustedHeight: number
}

export interface OriginDimensions {
  centerX: number
  centerY: number
  originArea: Rect
  pageDimensions: PageDimensions
}

export interface MaxDistance {
  maxDistanceX: number
  maxDistanceY: number
}

export interface Debris {
  container: HTMLDivElement
  letter: HTMLElement
  particles: HTMLDivElement[]
}

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

export interface ImpactLetter {
  axis: 'x' | 'y'
  buttonText?: HTMLDivElement[]
  debris: Debris
  letter: HTMLDivElement
  originRect: Rect
  textType: "h1" | "p" | "button"
  debrisTimeline?: gsap.core.Timeline
}

export type ImpactLetters = ImpactLetter[]

export interface GsapMatchMediaConditions extends gsap.Conditions {
  lowMotion: boolean
  locoLocomotion: boolean
}

export type DebrisAnimationConfig = gsap.TimelineVars & { impactLetter: ImpactLetter }

export type LetterAnimationConfig = gsap.TimelineVars & {
  impactLetters: ImpactLetters
  parentFragment: DocumentFragment
}

export interface ImpactTimeline extends gsap.core.Timeline {
  meteorTargetAnimation?: gsap.core.Timeline
  impactConfigs?: ImpactLetters
  parentFragment?: DocumentFragment
  buttonTimeline?: gsap.core.Timeline
}
