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

export type HeroPaths = Record<VideoWidth, string>

export type VideoCodec = "av1" | "vp9" | "h264"

export interface ImageFormatData {
  widths: HeroPaths
  srcset: string
  parent?: string
}

export type ImageType = "avif" | "webp" | "png"

export type MediaFileExtension = ImageType | "mp4" | "webm"

export type ImageIndex = Record<ImageType, ImageFormatData>

export type CodecVariants = Record<VideoCodec, HeroPaths>

export interface VideoResolution {
  width: VideoWidth
  height: number
}

export interface HeroVideo {
  baseName: string
  parentPath: string // Path to the parent directory of the video
  variants: CodecVariants
  poster: ImageIndex
  message?: string
}

export type VideoStatus =
  | "not_initialized"
  | "loading"
  | "loaded"
  | "playing"
  | "paused"
  | "on_delay"
