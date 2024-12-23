/**
 * @module types (licenses)
 *
 * @description Types for the licenses feature.
 *
 * @exports
 * --------------------
 * @interface TabElement
 * @interface TabState
 * @type {TabStateType}
 *
 * @license Plain-Unlicense (Public Domain)
 * @copyright No rights reserved.
 */

export interface TabElement {
  input: HTMLInputElement
  label: HTMLLabelElement
  iconAnchor: HTMLAnchorElement
  iconSVG: SVGElement
}

export type TabStateType = "normal" | "hover" | "focus" | "focus-visible"

export interface TabState {
  isSelected: boolean
  state: TabStateType
}
