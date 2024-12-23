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
 * - Strongly typed image configurations
 * - Flexible width and srcset mappings
 * - Detailed esbuild output typing
 * - Build project configuration interfaces
 * - Focal point definitions for responsive images
 *
 * @exports
 * - HeroImage: Comprehensive hero image configuration
 * - esbuildOutputs: Build output metadata structure
 * - Project: Project build configuration
 * - FileHashes: CSS file hash tracking
 * - buildJson: Build artifact mapping
 *
 * Core Types:
 * - WidthMap: Flexible width-to-path mapping
 * - HeroImageBase: Minimal hero image configuration
 * - HeroImageFocalPoints: Image focal point definitions
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/interfaces.html} TypeScript Interfaces
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
  focalPoints: {
    main: [number, number]
    secondary: [number, number]
  }
}

export type HeroImageFocalPoints = {
  [key: string]: {
    main: [number, number]
    secondary: [number, number]
  }
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
