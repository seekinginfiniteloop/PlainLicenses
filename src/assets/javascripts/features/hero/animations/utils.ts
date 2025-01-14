/**
 * @module animations/utils
 * @description Utility functions for animations
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @copyright No rights reserved.
 */

import gsap from 'gsap'
import { HeroStore } from '../../../state/store'

const store = HeroStore.getInstance()

/**
 * Randomly selects and removes an item from an array, reshuffling if depleted.
 *
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
 * @param scope - The scope to use (defaults to document.documentElement).
 * @returns A matchMedia instance.
 */
export function getMatchMediaInstance(
  scope?: Element | string | object | null,
) {
  return gsap.matchMedia(scope || document.documentElement)
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

/**
 * Checks if a timeline has a label.
 * @param tl - The timeline to check.
 * @param label - The label to check for.
 * @returns Whether the timeline has the specified label.
 */
export function hasLabel(tl: gsap.core.Timeline, label: string): boolean {
  try {
    return tl.labels[label] !== undefined
  } catch {
    return false
  }
}

/**
 * Retrieves the content-containing elements of an element.
 * @param element - The element to retrieve content-containing elements from.
 * @returns The content-containing elements of the element.
 */
export function getContentElements(element: Element): Element[] {
  return Array.from(element.querySelectorAll("*")).filter(
      el =>
        el !== element &&
        (el.innerHTML.trim() !== "" || el instanceof SVGElement)
  )
}
