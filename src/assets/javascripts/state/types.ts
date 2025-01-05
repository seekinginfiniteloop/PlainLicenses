/* eslint-disable no-unused-vars */
/**
 * @module types (state)
 * @description Types for the Hero feature state management.
 */

import { Header } from "~/components"


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
