
/**
 * Represents the settings for transforming an element's appearance.
 *
 * This interface defines optional properties that can be used to specify
 * various CSS transformation settings, including transition effects,
 * transformation origin, and style behavior
 *
 */
export interface TransformationSettings {
  transition?: string // The CSS transition property for smooth changes.
  transitionBehavior?: string // The behavior of the transition (e.g., ease, linear).
  transform?: string // The CSS transform property to apply transformations.
  transformOrigin?: string // The origin point for the transformation.
  transformStyle?: string // The style of the transformation (e.g., flat, preserve-3d).
}

/**
 * Settings for an image element.
 */
export interface ImageSettings {
  [imageName: string]: HeroImage
}

export interface HeroImageBase {
  parent: string
  widths: {
    [key: number]: string
  }
}

export interface WidthMap {
  [key: string]: string
  [key: number]: string
}

declare global {
  export type T = Type["T"]
  export type R = Type["R"]
}
