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
   
  UP = -1, // toward the top of the page
   
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

export interface EmphasisConfig extends gsap.TweenVars {
  blinkConfig: gsap.TweenVars
  jumpConfig: gsap.TweenVars
  scaleUpConfig: gsap.TweenVars
}

export interface FadeEffectConfig extends gsap.TweenVars {
  out?: boolean
  direction?: Direction
  fromConfig?: gsap.TweenVars
  toConfig?: gsap.TweenVars
}

export interface TransitionConfig extends gsap.TweenVars {
  direction: Direction
  section: Section
}

export interface AnimateMessageConfig extends gsap.TweenVars {
  message?: string
  entranceFromVars?: gsap.TweenVars
  entranceToVars?: gsap.TweenVars
  exitVars?: gsap.TweenVars
}
