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


/**
 * Retrieves a matchMedia instance with the specified contextFunction and optional scope.
 * @param context - The context function to use.
 * @param scope - The scope to use (defaults to document.documentElement).
 * @returns A matchMedia instance.
 */
/**
 * Retrieves a matchMedia instance with the specified contextFunction and optional scope.
 * @param context - The context function to use.
 * @param scope - The scope to use (defaults to document.documentElement).
 * @returns A matchMedia instance.
 */
export function getMatchMediaInstance(
  context: gsap.ContextFunc,
  scope?: Element | string | object) {
  return gsap.matchMedia().add(
    {
      lowMotion: 'prefers-reduced-motion: reduce',
      normalMotion: 'prefers-reduced-motion: no-preference'
    },
    context, scope || document.documentElement
  )
}

/**
 * Retrieves the distance from the target element to the viewport.
 * @param target - The target element.
 * @param edge - The edge to measure from (defaults to 'bottom'). Accepts 'top', 'right', 'bottom', 'left'.
 * @returns The distance from the target element to the viewport.
 */
export function getDistanceToViewport(
  target: Element,
  edge: 'top' | 'right' | 'bottom' | 'left' = 'bottom') {
  const rect = target.getBoundingClientRect()
  const {viewport} = store.state$.getValue()
  const distanceMap = {
    top: rect.top,
    right: viewport.offset.x - rect.right,
    bottom: viewport.offset.y - rect.bottom,
    left: rect.left
  }
  return distanceMap[edge]
}
