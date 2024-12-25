/**
 * @module predicates
 * @description A collection of state predicates for HeroState and its sub-states
 *
 * @requires ./types (state)
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

/** ======================
 **   COMPONENT PREDICATES
 *========================**/

export const carouselPredicates = {
  canPlay: (state: HeroState): boolean =>
    isFullyVisible(state) && !state.eggActive
}

export const impactPredicates = {
  canPlay: (state: HeroState): boolean =>
    isFullyVisible(state) &&
    state.newToHome &&
    !state.eggActive
}

export const panningPredicates = {
  canPan: (state: HeroState): boolean =>
    isFullyVisible(state) && !state.eggActive,
}

export const scrollPredicates = {
  canTrigger: (state: HeroState): boolean =>
    !state.eggActive,
}
