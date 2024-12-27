/**
 * @module types (licenses)
 * @description Types for the licenses feature.
 *
 * @exports @interface TabElement
 * @exports @interface TabState
 * @exports @type {TabStateType}
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved.
 */

/**
 * @exports TabElement
 * @interface TabElement
 * @property {HTMLInputElement} input - Tab input element
 * @property {HTMLLabelElement} label - Tab label element
 * @property {HTMLAnchorElement} iconAnchor - Tab icon anchor element
 * @property {SVGElement} iconSVG - Tab icon SVG element
 * @description Tab element structure for license tabs. Each tab is an input element that's hidden, a label element that's visible (the tab you click), and in the right sidebar, an icon anchor element with an SVG icon. We use this interface to keep these in sync.
 */
export interface TabElement {
  input: HTMLInputElement
  label: HTMLLabelElement
  iconAnchor: HTMLAnchorElement
  iconSVG: SVGElement
}

/**
 * @exports TabStateType
 * @type {TabStateType}
 * @description Tab state type for license tabs. We use this type track the state of each tab: normal, hover, focus, or focus-visible.
 */
export type TabStateType = "normal" | "hover" | "focus" | "focus-visible"

/**
 * @exports TabState
 * @interface TabState
 * @property {boolean} isSelected - Whether the tab is selected
 * @property {TabStateType} state - The state of the tab
 * @description Tab state for license tabs. We use this interface for state management.
 */
export interface TabState {
  isSelected: boolean
  state: TabStateType
}
