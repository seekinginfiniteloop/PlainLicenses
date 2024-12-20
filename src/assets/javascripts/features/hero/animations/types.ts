/* eslint-disable no-unused-vars */
/**
 * @module types (animations)
 * @description Types for the Hero feature animations.
 * @requires ../imageCarousel/heroImages
 * @exports AnimationState
 * @exports AnimationType
 * @exports Animations
 * @exports HeroKey
 * @exports HeroValue
 */

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
