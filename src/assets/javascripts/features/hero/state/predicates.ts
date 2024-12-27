/**
 * @module predicates
 * @description A collection of state predicates for HeroState and its sub-states
 *
 * @exports isFullyVisible
 * @exports carouselPredicates
 * @exports impactPredicates
 * @exports panningPredicates
 * @exports scrollPredicates
 *
 * @type {@link module:./types} - {@link HeroState} - Hero state structure
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */


import { HeroState } from './types'

/**
 * @exports isFullyVisible
 * @function isFullyVisible
 * @param {HeroState} state - Hero state
 * @returns {boolean} Whether the hero is fully visible
 * @description Checks if the hero is fully visible
 */
export const isFullyVisible = (state: HeroState): boolean =>
  state.atHome && state.landingVisible && state.pageVisible

/** ======================
 **   COMPONENT PREDICATES
 *========================**/

/**
 * @exports carouselPredicates
 * @function carouselPredicates
 * @param {HeroState} state - Hero state
 * @returns {CarouselState} Carousel state predicate
 * @description Predicates for the carousel component
*/
export const carouselPredicates = {
  canPlay: (state: HeroState): boolean =>
    isFullyVisible(state) && !state.eggActive
}

/**
 * @exports impactPredicates
 * @function impactPredicates
 * @param {HeroState} state - Hero state
 * @returns {ImpactState} Impact state predicates
 * @description Predicates for the impact component
*/
export const impactPredicates = {
  canPlay: (state: HeroState) =>
    isFullyVisible(state) &&
    state.newToHome &&
    !state.eggActive
}

/**
 * @exports panningPredicates
 * @function panningPredicates
 * @param {HeroState} state - Hero state
 * @returns {PanningState} Panning state predicates
 * @description Predicates for the panning component
*/
export const panningPredicates = {
  canPan: (state: HeroState): boolean =>
    isFullyVisible(state) && !state.eggActive,
}

/**
 * @exports scrollPredicates
 * @function scrollPredicates
 * @param {HeroState} state - Hero state
 * @returns {ScrollState} Scroll state predicates
 * @description Predicates for the scroll trigger component
*/
export const scrollPredicates = {
  canTrigger: (state: HeroState): boolean =>
    !state.eggActive,
}
