/**
 * Build Configuration Module
 * @module config/index
 * @description
 * Core build system configuration for Plain License project.
 * Handles esbuild setup, configuration, constants.
 *
 * Features:
 * - Dynamic esbuild configuration with plugins
 * - Video and image configuration
 *
 * @see {@link https://esbuild.github.io/}
 * @see {@link https://github.com/sindresorhus/globby}
 *
 * @license Plain-Unlicense
 * @author Adam Poulemanos adam<at>plainlicense<dot>org
 * @copyright No rights reserved.
 */

import { cssModulesPlugin } from "@asn.aeb/esbuild-css-modules-plugin"
// @ts-ignore
import * as esbuild from "esbuild"
import { tsconfigPathsPlugin } from "esbuild-plugin-tsconfig-paths"
// import { copy } from 'esbuild-plugin-copy'

import type {
  HeroPaths,
  HeroVideo,
  ImageIndex,
  ImageType,
  PlaceholderMap,
  Project,
  Separator,
  VideoCodec,
  VideoConfig,
  VideoResolution,
} from "../types.ts"

export const placeholderMap: PlaceholderMap = {
  "src/assets/stylesheets/_bundle_template.css": {
    "{{ palette-hash }}": "",
    "{{ main-hash }}": "",
  },
}

export const cssLocs = {
  "src/assets/stylesheets/_bundle_template.css": {
    "{{ palette-hash }}":
      "external/mkdocs-material/material/templates/assets/stylesheets/palette.*.min.css",
    "{{ main-hash }}":
      "external/mkdocs-material/material/templates/assets/stylesheets/main.*.min.css",
  },
}

export const fontLoc = "src/assets/fonts/*"
export const cacheMetaPath = "cache_meta.json"
export const noDelete = [
  "fonts",
  "images",
  "videos",
  "javascripts",
  "stylesheets",
  "workers",
  "poster",
  "meta",
]

export const videoConfig = {
  resolutions: [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
    { width: 854, height: 480 },
    { width: 640, height: 360 },
    { width: 426, height: 240 },
  ] as VideoResolution[],
  codecs: ["av1", "vp9", "h264"] as VideoCodec[],
  baseDir: "src/assets/videos/hero",
} as VideoConfig

export const imageTypes = ["avif", "webp", "png"] as ImageType[]
export const videoExtensions = ["webm", "mp4"]
export const otherExtensions = ["woff", "woff2", "svg", "css", "js", "jpg", "jpeg", "gif", "ico"]
export const allExtensions = [...imageTypes, ...videoExtensions, ...otherExtensions]
export const videoCodecs = videoConfig.codecs

export const backupImage = "break_free"
export const cssSrc = "src/assets/stylesheets/bundle.css"
export const basePath = videoConfig.baseDir

export const resKeys: HeroPaths = Object.fromEntries(
  videoConfig.resolutions.map((res) => [res.width, ""]),
) as HeroPaths
export const resolutions = Object.keys(resKeys).map((key) => {
  return parseInt(key, 10)
})
const resolutionWidths = Object.keys(resKeys).map((key) => {
  return key.toString()
})
export const resPattern = resolutionWidths.join("|")

const heroPathsTemplate = Object.fromEntries(
  videoConfig.resolutions.map((res) => [res.width, ""]),
) as HeroPaths

export const HERO_VIDEO_TEMPLATE = {
  variants: {
    av1: { ...heroPathsTemplate },
    vp9: { ...heroPathsTemplate },
    h264: { ...heroPathsTemplate },
  },
  poster: {
    avif: { widths: { ...heroPathsTemplate }, srcset: "" },
    webp: { widths: { ...heroPathsTemplate }, srcset: "" },
    png: { widths: { ...heroPathsTemplate }, srcset: "" },
  },
} as Partial<HeroVideo>

export const basePosterObj = HERO_VIDEO_TEMPLATE.poster

/**
 * @description Get the separator for the pattern
 * @param {boolean} isRegex - Whether the pattern is a regex (true) or a minimatch (false)
 * @returns {string} - The separator for the pattern
 */

const getSep = (isRegex: boolean): Separator => {
  return isRegex ? "|" : ","
}

export const widthPattern = (isRegex: boolean = true) => {
  return resolutionWidths.join(getSep(isRegex))
}
export const codecPattern = (isRegex: boolean = true) => {
  return videoCodecs.join(getSep(isRegex))
}

export const videoExtensionPattern = (isRegex: boolean = true) => {
  return videoExtensions.join(getSep(isRegex))
}

export const imageExtensionPattern = (isRegex: boolean = true) => {
  return imageTypes.join(getSep(isRegex))
}
export const mediaExtensionPattern = (isRegex: boolean = true) => {
  return `${videoExtensionPattern(isRegex)}|${imageExtensionPattern(isRegex)}`
}
export const hashPattern = "[A-Fa-f0-9]{8}"

export const videoMessages = {
  tokyo_shuffle: "Stop the Nonsense",
  break_free: "Understanding shouldn't require a degree.",
} as Record<string, string>

const jsBanner = `/**
 * ---DO NOT EDIT THIS FILE---
 * The build process generates this file
 * You should edit the source file instead
 *
 * sources are in: src/assets/javascripts directory
 */
`
const cssBanner = `/**
  * ---DO NOT EDIT THIS FILE---
  * The build process generates this file
  * You should edit the source file instead
  *
  * sources are in: src/assets/stylesheets directory
  *
  */
`
/**
 * @description esbuild configuration for the web platform.
 */
export const webConfig: esbuild.BuildOptions = {
  bundle: true,
  minify: false,
  sourcemap: true,
  metafile: true,
  banner: { js: jsBanner, css: cssBanner },
  platform: "browser",
  target: "es2020",
  outbase: "src",
  chunkNames: "[dir]/chunks/[name].[hash]",
  assetNames: "[dir]/[name].[hash]",

  loader: {
    ".avif": "file",
    ".css": "css",
    ".js": "js",
    ".json": "copy",
    ".mp4": "file",
    ".png": "file",
    ".sass": "css",
    ".scss": "css",
    ".svg": "file",
    ".ts": "ts",
    ".tsx": "tsx",
    ".webm": "file",
    ".webp": "file",
    ".woff": "file",
    ".woff2": "file",
  },
  outExtension: { ".js": ".js", ".css": ".css" },
  splitting: false,
  plugins: [
    tsconfigPathsPlugin({
      cwd: process.cwd(),
      tsconfig: "tsconfig.json",
      filter: /src\/assets\/javascripts\/.*|src\/cache_worker.*/,
    }),
    cssModulesPlugin({
      emitCssBundle: {
        filename: "bundle.css",
      },
    }),
  ],
}

export const baseProject: Project = {
  entryPoints: [
    "src/assets/javascripts/index.ts",
    "src/assets/stylesheets/bundle.css",
    "src/cache_worker.ts",
  ],
  tsconfig: "tsconfig.json",
  entryNames: "[dir]/[name].[hash]",
  platform: "browser",
  outdir: "docs",
}

export const PROJECTS = [baseProject] as const

/**
 * @param {string} str - the string to convert
 * @returns {string} the enum string
 */
function toEnumString(str: string): string {
  return `${str.toUpperCase()} = "${str}"`
}

export const tsTemplate = (videos: HeroVideo[], noScriptImage: ImageIndex) => {
  const keyPattern = /"(\w+?)":|"[\[\](){}]|[\[\](){}]"/g
  return `
/**
 *! NOTE: The build process generates this file.
 *! DO NOT EDIT THIS FILE DIRECTLY.
 * Edit the build script instead (src/build/config/index.ts).
 *
 * @module data
 * @description A collection of hero videos for the landing page.
 */

export const rawHeroVideos = ${JSON.stringify(videos, null, 2)} as const;

export enum HeroName {
    ${videos.map((video) => toEnumString(video.baseName)).join(",\n    ")}
    }

export const backupImage = "${JSON.stringify(noScriptImage, null, 2)}" as const;
`.replace(keyPattern, (match) => {
    return match.replace(/"/g, "")
  })
}
