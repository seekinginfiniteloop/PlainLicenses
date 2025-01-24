/**
 * @module predicates
 * @description A collection of state predicates for HeroState and its sub-states. This
 * probably looks sad; it's a remnant of a much more complicated state system. Here
 * until the next refactor.
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved
 */

import { HeroState } from './types'

/**
 * @param {HeroState} state - Hero state
 * @returns {boolean} Whether the hero is fully visible
 * @description Checks if the hero is fully visible
 */
export const isFullyVisible = (state: HeroState): boolean =>
  state.atHome && state.landingVisible && state.pageVisible

export const noVideo = (state: HeroState): boolean => state.prefersReducedMotion

/** ======================
 **   COMPONENT PREDICATES
 *========================**/
// there used to be a lot more, but, we simplified it by moving to the video.

/**
 * @param {HeroState} state - Hero state
 * @returns {VideoState} Carousel state predicate
 * @description Predicates for the carousel component
*/
export const videoPredicate = {
  canPlay: (state: HeroState): boolean =>
    isFullyVisible(state) && !noVideo(state),
}
