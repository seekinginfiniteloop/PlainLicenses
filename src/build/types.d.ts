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

export interface WidthMap {
  [key: string]: string
  [key: number]: string
}
export interface HeroImage {
  imageName: string
  parent: string
  widths: {
    [key: number]: string
  }
  srcset: string
}

export interface HeroImageBase {
  parent: string
  widths: {
    [key: number]: string
  }
}
export interface esbuildOutputs {
  [k: string]:
  {
    bytes: number
    inputs: string[] | []
    exports: string[] | []
    entryPoint?: string
  }
}
export interface FileHashes {
  palette: string
  main: string
}
export interface MetaFileOutputs {
  bytes: number
  inputs: { [path: string]: { bytesInOutput: number } }
  exports: string[]
  entryPoint?: string
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

export interface VideoResolution {
  width: number
  height: number
}

export interface VideoVariant {
  codec: 'av1' | 'vp9'
  path: string
  width: number
  height: number
}

export interface HeroVideo {
  baseName: string
  parent: string
  variants: {
    av1: { [key: number]: string }
    vp9: { [key: number]: string }
  }
  poster: HeroImage
}

export interface VideoConfig {
  resolutions: VideoResolution[]
  codecs: ('av1' | 'vp9')[]
  baseDir: string
}
