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
 * @property {HTMLInputElement} input - The hidden input element for the tab
 * @property {HTMLLabelElement} label - The visible label element for the tab
 * @property {HTMLAnchorElement} labelAnchor - The anchor element for the label -- for ARIA, this is the tab element
 * @property {HTMLAnchorElement} iconAnchor - The anchor element for the icon -- for ARIA, this is the tab element
 * @property {SVGElement} iconSVG - The SVG element for the icon
 * @property {HTMLDivElement} contentElement - The content element for the tab -- for ARIA, this is the tab panel
 * @property {HTMLDivElement} tablistElement - The ARIA tablist element for the tabs (parent element)
 */
export interface TabElement {
  input: HTMLInputElement
  label: HTMLLabelElement
  labelAnchor: HTMLAnchorElement
  iconAnchor: HTMLAnchorElement
  iconSVG: SVGElement
  contentElement: HTMLDivElement
  tablistElement: HTMLDivElement
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

/**
 * @description Some of the tab panels have disclaimer tabs that are not part of the main tab set. These are mostly handled by the overall Material for MKdocs scripts, but we manage their ARIA states here.
 * @property {HTMLAnchorElement} labelAnchor - The anchor element for the label -- for ARIA, this is the tab element
 * @property {HTMLInputElement} input - The hidden input element for the tab
 */
export interface ChildTabs {
  labelAnchor: HTMLAnchorElement
  input: HTMLInputElement
}
