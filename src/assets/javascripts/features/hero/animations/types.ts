/* eslint-disable no-unused-vars */
/**
 * @module types (animations)
 * @description Types for the Hero feature animations.
 *
 */

import gsap from 'gsap'

export interface ReducedMotionCondition extends gsap.Conditions {
  reducedMotion: boolean
}

/** ============================================
 *               Observer Types
 *=============================================**/

/**
 * @exports @enum {Direction}
 * @description Direction enum for the Hero Observers.
 */
export enum Direction {
  // eslint-disable-next-line no-unused-vars
  UP = -1, // toward the top of the page
  // eslint-disable-next-line no-unused-vars
  DOWN = 1, // toward the bottom of the page
}

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


export interface EmphasisConfig {
  blinkConfig: gsap.TweenVars
  jumpConfig: gsap.TweenVars
  scaleUpConfig: gsap.TweenVars
}

export interface FadeEffectConfig {
  out?: boolean
  direction?: Direction
  fromConfig?: gsap.TweenVars
  toConfig?: gsap.TweenVars
}

export interface TransitionConfig {
  direction: Direction
  section: Section
}

export interface AnimateMessageConfig extends gsap.TweenVars {
  message?: string
  entranceFromVars?: gsap.TweenVars
  entranceToVars?: gsap.TweenVars
  exitVars?: gsap.TweenVars
}

export type fadeIn = (targets: gsap.TweenTarget, config: FadeEffectConfig) => gsap.core.Timeline

export type fadeOut = (targets: gsap.TweenTarget, config: FadeEffectConfig) => gsap.core.Timeline

export type emphasize = (targets: gsap.TweenTarget, config: EmphasisConfig) => gsap.core.Timeline

export type setSection = (config: TransitionConfig) => gsap.core.Timeline

export type transitionSection = (config: TransitionConfig) => gsap.core.Timeline
