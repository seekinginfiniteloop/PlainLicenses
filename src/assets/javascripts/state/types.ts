/**
 * @module types (state)
 * @description Types for the Hero feature state management.
 */

import gsap from "gsap"
import { Header } from "~/components"

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
  Disabled = "disabled",
}

/**
 * @exports @interface TimelineData
 * @description Timeline data for the Hero feature.
 * @interface TimelineData
 */
export interface TimelineData extends gsap.TimelineVars {
  canPlay: boolean
  video: HTMLVideoElement
}

export interface HeroState {
  atHome: boolean
  landingVisible: boolean
  pageVisible: boolean
  prefersReducedMotion: boolean
  viewport: Viewport
  header: Header
  parallaxHeight: number
  location: URL
  tearDown: boolean
}

export enum AnimationComponent {
  Video = "video",
}

/**
 * @exports StatePredicate
 * @type {StatePredicate}
 * @description State predicate type
 */
export type StatePredicate = (_state: HeroState) => boolean

/**
 * @exports VideoState
 * @type {VideoState}
 * @description Carousel state
 */
export type VideoState = { canPlay: boolean }

/**
 * @exports ComponentUpdateFunction
 * @type {ComponentUpdateFunction}
 * @description Component update function
 */
export type ComponentStateUpdateFunction = (_state: VideoState) => void // updates the component state but there's no return value
