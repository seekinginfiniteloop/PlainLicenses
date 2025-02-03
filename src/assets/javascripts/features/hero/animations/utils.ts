/**
 * @module animations/utils
 * @description Utility functions for animations
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @copyright No rights reserved.
 */

import gsap from "gsap"
import { HeroStore } from "~/state"
import { ReducedMotionCondition } from "./types"

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
  const viewport = store.getStateValue("viewport")
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
export function getMatchMediaInstance(scope?: Element | string | object | null) {
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
  edge: "top" | "right" | "bottom" | "left" = "bottom",
) {
  const rect = target.getBoundingClientRect()
  const { viewport } = store.state$.getValue()
  const distanceMap = {
    top: rect.top,
    right: viewport.offset.x - rect.right,
    bottom: viewport.offset.y - rect.bottom,
    left: rect.left,
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
    (el) => el !== element && (el.innerHTML.trim() !== "" || el instanceof SVGElement),
  )
}

/**
 * Attempts to retrieve an object's values as elements.
 * @param obj - The object to retrieve values from.
 * @returns The object's values as elements.
 */
function tryObject(obj: any) {
  if (obj === null || typeof obj !== "object") {
    return null
  }
  const values = Object.values(obj)
  const newValues = []
  for (const value of values) {
    if (value === null || value === undefined) {
      newValues.push(null)
    } else if (value instanceof Element) {
      newValues.push(value)
    } else if (typeof value === "string") {
      newValues.push(document.querySelector(value))
    }
    return newValues
  }
  return null
}

/**
 * Retrieves the targets array from a TweenTarget.
 * @param targets - The TweenTarget to retrieve the targets array from.
 * @returns The targets array.
 */
export function getTargetsArray(targets: gsap.TweenTarget): Element[] {
  return gsap.utils
    .toArray(targets)
    .map((target) =>
      target instanceof Element ? target
      : typeof target === "string" ? document.querySelector(target)
      : tryObject(target),
    )
    .map((target) => {
      return target instanceof Element ? target : null
    })
    .filter((target) => target !== null)
}

/**
 * Modifies the duration of a tween for reduced motion.
 * @param duration - The duration to modify.
 * @returns The modified duration.
 */
export function modifyDurationForReducedMotion(
  duration: gsap.TweenValue,
): number | gsap.TweenValue {
  let newDuration: number | gsap.TweenValue = duration
  getMatchMediaInstance().add(
    { reducedMotion: "(prefers-reduced-motion: reduce)" },
    (context: gsap.Context) => {
      const { reducedMotion } = context.conditions as ReducedMotionCondition
      if (reducedMotion) {
        switch (typeof duration) {
          case "number":
            newDuration = duration * 2
            break
          case "string":
            newDuration = parseFloat(duration) * 2
            break
          default:
            newDuration = duration
        }
      } else {
        newDuration = duration
      }
    },
  )
  return newDuration
}

/**
 * Splits text or text within an element into divs for individual letter animations.
 * Appends the divs to a document fragment.
 * @param el - The element or text to split into divs.
 * @returns A document fragment containing the divs.
 */
export function wordsToLetterDivs(el: HTMLElement | string): DocumentFragment {
  const docFragment = document.createDocumentFragment()
  let text = ""
  if (typeof el === "string") {
    text = el
  } else {
    text = el.innerText
  }
  const letters = text.trim().split("")
  letters.forEach((letter, idx) => {
    if (idx === 0 && (letter === " " || letter === "\n")) {
      return
    }
    const textNode = document.createTextNode(letter)
    if (letter === " " || letter === "\n") {
      const lastEl = docFragment.lastChild
      lastEl?.appendChild(textNode)
    }
    const newDiv = document.createElement("div")
    newDiv.appendChild(textNode)
    newDiv.classList.add("hero__letter")
    docFragment.appendChild(newDiv)
  })
  if (el instanceof HTMLElement) {
    gsap.set(el, { innerText: "" })
  }
  gsap.set(docFragment.querySelectorAll("div"), { display: "inline-block", autoAlpha: 0 })
  return docFragment
}
