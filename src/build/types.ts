/**
 * @module BuildTypes
 * @description Type definitions for build process and asset management
 *
 * @overview
 * Provides TypeScript interfaces and types for:
 * - Hero image configurations
 * - esbuild build outputs
 * - Project build settings
 * - File hashing
 * - Asset metadata
 *
 * Key Features:
 * - Strongly typed image and video configurations
 * - Flexible width and srcset mappings
 * - Detailed esbuild output typing
 * - Build project configuration interfaces
 * - Focal point definitions for responsive images
 *
 * @see {@link https://esbuild.github.io/} esbuild Documentation
 */

// regex separator ("|") or minimatch separator (",")
export type Separator = "|" | ","

type EmptyString = ""

export type VideoWidth = 426 | 640 | 854 | 1280 | 1920 | 2560 | 3840

export type HeroPaths = Record<VideoWidth, string>

/** ============================================
 *               Hero Images
 *=============================================**/

export interface ImageFormatData {
  widths: HeroPaths
  srcset: string
  parent?: string
}

export type ImageType = "avif" | "webp" | "png"

export type MediaFileExtension = ImageType | "mp4" | "webm"

export type ImageIndex = Record<ImageType, ImageFormatData>

export interface HeroImage {
  imageName: string
  parent: string
  images: ImageIndex
}

/** ============================================
 *               esbuild Outputs/Meta
 *=============================================**/

export interface PlaceholderMap {
  // template path: { placeholder: replacement }
  [k: string]: { [k: string]: string }
}

export interface esbuildOutputs {
  [k: string]: {
    bytes: number
    inputs: string[] | []
    exports: string[] | []
    entryPoint?: string
  }
}
export interface FileHashes {
  [k: string]: string
}
export interface MetaFileOutputs {
  bytes: number
  inputs: { [path: string]: { bytesInOutput: number } }
  exports: string[]
  entryPoint?: string
}

// Output for cache worker's metadata
export interface CacheConfig {
  cacheName: string
  urls: string[]
  version: string
}

export interface buildJson {
  noScriptImage: string
  SCRIPTBUNDLE: string
  CSSBUNDLE: string
}

export interface Project {
  entryPoints: string[]
  entryNames?: string
  outdir?: string
  tsconfig: string
  platform?: "node" | "browser"
}

export interface tsconfigPathsPluginInterface {
  cwd: string
  tsconfig: string
  filter: RegExp
}

/** ============================================
 *               VIDEO CONFIG
 *=============================================**/

export type VideoCodec = "av1" | "vp9" | "h264"

export type CodecVariants = {
  [key in VideoCodec]: HeroPaths
}

export interface VideoResolution {
  width: VideoWidth
  height: number
}

export interface HeroVideo {
  baseName: string
  parent: string // Path to the parent directory of the video
  variants: CodecVariants
  poster: HeroImage
  message?: string
}

export interface VideoConfig {
  resolutions: VideoResolution[]
  codecs: VideoCodec[]
  baseDir: string
}

export interface HeroFiles {
  images: HeroFile[]
  videos: HeroFile[]
}

export interface HeroFile {
  baseName: string
  codec: VideoCodec | ""
  extension: MediaFileExtension
  filename: string
  srcPath: string
  destPath: string
  hash: string | EmptyString
  mini: string | EmptyString
  parentPath: string
  parts: string[]
  type: "image" | "video"
  width: VideoWidth | EmptyString
}
