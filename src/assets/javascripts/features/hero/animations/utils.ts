/**
 * @module animations/utils
 * @description Utility functions for animations
 */

import gsap from 'gsap'
import { HeroStore } from '../state/store'

const store = HeroStore.getInstance()

/**
 * Randomly selects and removes an item from an array, reshuffling if depleted.
 *
 * *Borrowed from gsap's helper functions.*
 *
 * @param {Object} array - Configuration object containing an array of eligible items.
 * @param {any[]} [array.eligible] - The array of items to select from.
 * @returns {any} A randomly selected item from the array.
 * @throws {Error} If no eligible items are available.
 *
 * @example
 * const colors = { eligible: ['red', 'blue', 'green'] };
 * const randomColor = pluckRandomFrom(colors); // Returns a random color and removes it from the array (i.e. if it returns 'red', the array will now be ['blue', 'green'])
 *
 * @link {https://gsap.com/docs/v3/HelperFunctions/helpers/pluckRandomFrom}
 */
export function pluckRandomFrom(array: { eligible?: any[] }): any {
  if (array.eligible && array.eligible.length) {
    return array.eligible.pop()
  } else if (array.eligible) {
    array.eligible = gsap.utils.shuffle(array.eligible.slice())
    return array.eligible.pop()
  }
}

/**
 * Normalizes the largest viewport dimension's offset value to a range between 0 and 1.
 *
 * @returns {number} A normalized value between 0 and 1
 *
 * @example
 *
 * @see {@link https://greensock.com/docs/v3/GSAP/Utilities/mapRange} GSAP Normalization Utility
 */
export function normalizeResolution(): number {
  const viewport = store.getStateValue('viewport')
  const resolution = Math.max(viewport.offset.y, viewport.offset.x)
  const clampedResolution = gsap.utils.clamp(320, 3840, resolution)
  return gsap.utils.mapRange(320, 3840, 0, 1, clampedResolution)
}


export function getMatchMediaInstance(func: gsap.ContextFunc, scope?: Element | string | object): gsap.MatchMedia {
  return gsap.matchMedia().add({
    lowMotion: 'prefers-reduced-motion: reduce',
    normalMotion: 'prefers-reduced-motion: no-preference'
  }, func, scope)
}
