/* eslint-disable no-unused-vars */
/**
 * @module types (animations)
 * @description Types for the Hero feature animations.
 *
 */

import gsap from 'gsap'
import { HeroState } from "../../../state/types"
import { heroVideos } from "../imageCarousel/heroVideos"

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
 * @exports @type {VideoKey}
 * @description Image key for the Hero feature.
 * @type {string}
 */
export type VideoKey = typeof heroVideos[number]["imageName"]

/**
 * @exports @type {AnimationType}
 * @description Animation types for the Hero feature.
 * @type {string}
 */
export type AnimationType = "video" | "scrollTrigger"

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
  canPlay: boolean
  video: HTMLVideoElement
}

export interface ReducedMotionCondition extends gsap.Conditions {
  reducedMotion: boolean
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
  readonly outerWrapper: Element
  readonly innerWrapper: Element
  readonly bg: Element
  readonly content: Element[]
  animation?: gsap.core.Timeline
}
