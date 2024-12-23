/**
 * @module animations/utils
 * @description Utility functions for animations
 */

import gsap from 'gsap'

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
