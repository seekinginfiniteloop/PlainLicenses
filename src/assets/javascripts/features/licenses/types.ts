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
