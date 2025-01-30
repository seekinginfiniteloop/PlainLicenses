/**
 * @module @types video
 * @description Animation types for the Hero feature.
 * @type {string}
 */
export type AnimationType = "video" | "scrollTrigger"

/**
 * @exports @type {Animations}
 * @description Animations for the Hero feature.
 * @type {Map<symbol, gsap.core.Timeline>}
 */
export type Animations = Map<symbol, gsap.core.Timeline>

export type VideoWidth = 426 | 640 | 854 | 1280 | 1920 | 2560 | 3840
export type VideoCodec = "av1" | "vp9" | "h264"
export type ImageType = "avif" | "webp" | "png"

export type HeroPaths = {
  [_key in VideoWidth]: string
}

export type ImageIndex = {
  [_key in ImageType]: { widths: HeroPaths; srcset: string }
}

export interface HeroImage {
  imageName: string
  parent: string
  images: ImageIndex
}

export type CodecVariants = {
  [_key in VideoCodec]: HeroPaths
}

export interface VideoResolution {
  width: VideoWidth
  height: number
}

export interface HeroVideo {
  baseName: string
  parent: string // Path to the parent directory of the video
  variants: CodecVariants[]
  poster: HeroImage
  message?: string
}

export type VideoStatus =
  | "not_initialized"
  | "loading"
  | "loaded"
  | "playing"
  | "paused"
  | "on_delay"
