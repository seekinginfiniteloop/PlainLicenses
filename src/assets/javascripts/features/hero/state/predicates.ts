/**
 * @module predicates
 * @description A collection of state predicates for HeroState and its sub-states
 *
 * @requires ./types
 *
 * @exports isFullyVisible
 * @exports hasNoRestrictions
 * @exports carouselPredicates
 * @exports impactPredicates
 * @exports panningPredicates
 * @exports scrollPredicates
 *
 * @license Plain-Unlicense
 * @copyright No rights reserved
 */


import { HeroState } from './types'

/**
 * test if the hero landing section is fully visible
 * that the user is (1) at home, (2) the landing section is visible, and (3) the page is visible
 * @param state - the current hero state
 * @returns boolean
 */
export const isFullyVisible = (state: HeroState): boolean =>
  state.atHome && state.landingVisible && state.pageVisible

/**
 * test if the hero section has no restrictions
 * that the egg is not active and the user does not prefer reduced motion
 * @param state - the current hero state
 * @returns boolean
 */
export const hasNoRestrictions = (state: HeroState): boolean =>
  !state.eggActive && !state.prefersReducedMotion

/** ======================
 *   COMPONENT PREDICATES
 *========================**/

export const carouselPredicates = {
  canPlay: (state: HeroState): boolean =>
    isFullyVisible(state) && !state.eggActive
}

export const impactPredicates = {
  canPlay: (state: HeroState): boolean =>
    isFullyVisible(state) &&
    state.newToHome &&
    hasNoRestrictions(state)
}

export const panningPredicates = {
  canPan: (state: HeroState): boolean =>
    isFullyVisible(state) && hasNoRestrictions(state),
}

export const scrollPredicates = {
  canScrollTo: (state: HeroState): boolean =>
    !state.prefersReducedMotion,

  canTrigger: (state: HeroState): boolean =>
    !state.eggActive && !state.prefersReducedMotion,

  useReducedTriggers: (state: HeroState): boolean =>
    !state.eggActive && state.prefersReducedMotion
}
