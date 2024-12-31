/**
 * @module types (licenses)
 * @description Types for the licenses feature.
 *
 * @license Plain-Unlicense (Public Domain)
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved.
 */

/**
 * @description Tab element structure for license tabs. Each tab is an input element that's hidden, a label element that's visible (the tab you click), and in the right sidebar, an icon anchor element with an SVG icon. We use this interface to keep these in sync.
 */
export interface TabElement {
  input: HTMLInputElement
  label: HTMLLabelElement
  iconAnchor: HTMLAnchorElement
  iconSVG: SVGElement
}

/**
 * @description Tab state type for license tabs. We use this type track the state of each tab: normal, hover, focus, or focus-visible.
 */
export type TabStateType = "normal" | "hover" | "focus" | "focus-visible"

/**
 * @description Tab state for license tabs. We use this interface for state management.
 */
export interface TabState {
  isSelected: boolean
  state: TabStateType
}
