
/**
 * TODO: programmatically import, ensuring stylesheet loads first
 * An object representing various color values used in the application.
 *
 * This object contains color definitions that can be referenced throughout the code
 * to maintain consistency in color usage.
 *
 * @type {Object}
 * @property {string} atomicOrange - The color value for atomic orange.
 * @property {string} aqua - The color value for aqua.
 * @property {string} aquamarine - The color value for aquamarine.
 * @property {string} blueBlue - The color value for blue blue.
 * @property {string} darkEmerald - The color value for dark emerald.
 * @property {string} dutchWhite - The color value for dutch white.
 * @property {string} ecru - The color value for ecru.
 * @property {string} emerald - The color value for emerald.
 * @property {string} mindaro - The color value for mindaro.
 * @property {string} white - The color value for white.
 * @property {string} zaffre - The color value for zaffre.
 */
export const colors: { [key: string]: string } = {
  atomicOrange: "var(--atomic-tangerine)",
  aqua: "var(--aqua)",
  aquamarine: "var(--aquamarine)",
  blueBlue: "var(--blue-blue)",
  darkEmerald: "var(--dark-emerald)",
  dutchWhite: "var(--dutch-white)",
  ecru: "var(--ecru)",
  emerald: "var(--emerald)",
  mindaro: "var(--mindaro)",
  white: "white",
  zaffre: "var(--zaffre)"
}

/**
 * Represents the settings for transforming an element's appearance.
 *
 * This interface defines optional properties that can be used to specify
 * various CSS transformation settings, including transition effects,
 * transformation origin, and style behavior
 *
 */
interface TransformationSettings {
  transition?: string // The CSS transition property for smooth changes.
  transitionBehavior?: string // The behavior of the transition (e.g., ease, linear).
  transform?: string // The CSS transform property to apply transformations.
  transformOrigin?: string // The origin point for the transformation.
  transformStyle?: string // The style of the transformation (e.g., flat, preserve-3d).
}

/**
 * Interface representing the settings for an image.
 *
 * This interface defines the structure of the settings object that can be applied to images,
 * including color settings, dimensions, and transformation properties.
 *
 * @interface ImageSettings
 * @property {string} versionHash - The version hash for the image.
 * @property {{ h1: string; p: string }} colors - The color settings for the image.
 * @property {string} [height] - The height of the image.
 * @property {string} [animation] - The animation settings for the image.
 * @property {string} [perspective] - The perspective setting for the image.
 * @property {string} [perspectiveOrigin] - The origin point for the perspective.
 * @property {TransformationSettings} [transformationSettings] - Settings for transoformation animations.
 * @property {string} [scale] - The scale settings for the image.
 * @property {string} [objectFit] - The fit settings for the image.
 * @property {string} [objectPosition] - The position settings for the image.
 */
export interface ImageSettings {
  versionHash?: string
  colors: { h1: string, p: string }
  height?: string
  animation?: string
  perspective?: string
  perspectiveOrigin?: string
  transformationSettings?: TransformationSettings
  transformStyle?: string
  translate?: string
  scale?: string
  objectFit?: string
  objectPosition?: string
}

/**
 * Default settings for images.
 *
 * This object contains the default settings that will be applied to images unless overridden
 * by specific settings.
 *
 * @type {ImageSettings}
 */
export const defaultSettings: ImageSettings = {
  versionHash: "v.1.0",
  colors: { h1: colors.emerald, p: colors.emerald },
  scale: "1.1",
  objectFit: "scale-down",
  perspective: "50em",
  perspectiveOrigin: "center bottom",
  objectPosition: "center bottom"
  // TODO: get translated transforms to work
}

/**
 * A record of image settings keyed by image name.
 *
 * This object holds specific settings for different images, allowing for customization
 * of each image's appearance and behavior.
 *
 * @type {Record<string, ImageSettings>}
 */
export const imageSettings: Record<string, ImageSettings> = {
  anime: { colors: { h1: colors.atomicOrange, p: colors.emerald } },
  artbrut: { colors: { h1: colors.atomicOrange, p: colors.aqua } },
  comic: { colors: { h1: colors.aquamarine, p: colors.white } },
  fanciful: {
    colors: { h1: colors.mindaro, p: colors.aqua },
    perspectiveOrigin: "30% 20%",
    scale: "1",
    translate: "0% -30%"
  },
  fantasy: {
    colors: { h1: colors.white, p: colors.mindaro },
    scale: "1",
    translate: "0% -20%"
  },
  farcical: {
    colors: { h1: colors.atomicOrange, p: colors.aqua },
    scale: "1",
    translate: "0% -35%"
  },
  fauvist: { colors: { h1: colors.mindaro, p: colors.white } },
  minimal: {
    colors: { h1: colors.atomicOrange, p: colors.white },
    scale: "1",
    perspective: "50rem",
    translate: "0% -25%"
  },
  mystical: {
    colors: { h1: colors.blueBlue, p: colors.white },
    scale: "1",
    perspective: "40rem",
    translate: "0% -25%"
  },
  surreal: {
    colors: { h1: colors.white, p: colors.atomicOrange },
    scale: "1",
    translate: "0% -25%"
  }
}

/**
 * Default settings for portrait images.
 *
 * This object contains the default settings that will be applied to portrait images.
 *
 * @type {ImageSettings}
 */
export const defaultPortraitSettings: ImageSettings = {
  colors: { h1: colors.emerald, p: colors.emerald },
  objectFit: "cover",
  scale: "1.4"
}

/**
 * A record of portrait image settings keyed by image name.
 *
 * This object holds specific settings for different portrait images, allowing for customization
 * of each portrait image's appearance and behavior.
 *
 * @type {Record<string, ImageSettings>}
 */
export const portraitImageSettings: Record<string, ImageSettings> = {
  anime: {
    colors: { h1: colors.atomicOrange, p: colors.white },
    perspective: "-50rem",
    scale: "1.8",
    translate: "0% 40%"
  },
  artbrut: {
    colors: { h1: colors.atomicOrange, p: colors.aqua },
    translate: "0% 20%"
  },
  comic: {
    colors: { h1: colors.atomicOrange, p: colors.aqua },
    translate: "0% 20%"
  },
  fanciful: {
    colors: { h1: colors.mindaro, p: colors.atomicOrange },
    translate: "0% 20%"
  },
  fantasy: {
    colors: { h1: colors.atomicOrange, p: colors.mindaro },
    translate: "0% 20%"
  },
  farcical: {
    colors: { h1: colors.mindaro, p: colors.aqua },
    translate: "0% 16%"
  },
  fauvist: {
    colors: { h1: colors.mindaro, p: colors.white },
    translate: "0% 18%"
  },
  minimal: {
    colors: { h1: colors.atomicOrange, p: colors.white },
    translate: "0% 20%"
  },
  mystical: {
    colors: { h1: colors.white, p: colors.aquamarine },
    translate: "0% 20%"
  },
  surreal: {
    colors: { h1: colors.white, p: colors.atomicOrange },
    translate: "0% 20%"
  }
}

/**
 * Interface representing the data structure for image information.
 *
 * This interface defines the properties that describe an image, including its name,
 * URL, settings, and other relevant data.
 *
 * @interface ImageDataType
 * @property {string} versionHash - The version hash for the image.
 * @property {string} imageName - The name of the image.
 * @property {string} baseUrl - The base URL for the image.
 * @property {string} url - The full URL for the image.
 * @property {string} srcset - The srcset attribute for responsive images.
 * @property {ImageSettings} settings - The settings associated with the image.
 * @property {PredefinedColorSpace} colorSpace - The color space of the image.
 * @property {Uint8ClampedArray} data - The image data as a Uint8ClampedArray.
 * @property {string} imgWidth - The width of the image.
 */
export interface ImageDataType {
  versionHash: string
  imageName: string
  baseUrl: string
  url: string
  srcset: string
  landscapeSettings: ImageSettings
  portraitSettings: ImageSettings
  colorSpace: PredefinedColorSpace
  data: Uint8ClampedArray
  imgWidth: string
}
