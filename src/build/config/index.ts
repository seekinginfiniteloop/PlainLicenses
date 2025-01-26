/* eslint-disable no-console */
/**
 * Build Configuration Module
 * @module BuildConfig
 * @description
 * Core build system configuration and utilities for Plain License project.
 * Handles esbuild setup, image processing, and asset management.
 *
 * Features:
 * - Dynamic esbuild configuration with plugins
 * - Automated hero image srcset generation
 * - Smart focal point mapping for responsive images
 * - Cross-platform asset processing
 * - Glob-based file resolution
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
import { tsconfigPathsPlugin } from "esbuild-plugin-tsconfig-paths"
import * as esbuild from "esbuild"
// import { copy } from 'esbuild-plugin-copy'
import globby from "globby"
import * as fs from "fs"

import type { CodecVariants, HeroFile, HeroFiles, HeroImage, HeroPaths, HeroVideo, ImageIndex, ImageType, Project, VideoCodec, VideoConfig, VideoResolution, VideoWidth } from "../types.ts"

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
  codecs: ['av1', 'vp9', 'h264'] as VideoCodec[],
  baseDir: 'src/assets/videos/hero'
} as VideoConfig

export const imageTypes = ["avif", "webp", "png"] as ImageType[]
export const videoExtensions = ["webm", "mp4"]
export const videoCodecs = ["av1", "vp9", "h264"]

export const backupImage = 'break_free'
export const cssSrc = "src/assets/stylesheets/bundle.css"
const basePath = "src/assets/videos/hero"


export const resKeys: HeroPaths = Object.fromEntries(videoConfig.resolutions.map(res => [res.width, ""])) as HeroPaths
const resolutionWidth = Object.keys(resKeys).map(key => { return key.toString() })

const widthPattern = (sep: string = "|") => { return resolutionWidth.join(sep) }

export const videoMessages = {
  "tokyo_shuffle": "Stop the Nonsense",
  "break_free": "Understanding shouldn't require a degree.",
} as Record<string, string>

export const getHeroFilePattern = (isVideo: boolean = false, sep: "|" | "," = "|") => {
  const toMatchGroup = (pattern: string, name: string, isRegex: boolean = true) => { return isRegex ? `(?<${name}>${pattern})` : `\{${pattern}\}` }
  const isRegex = !!(sep === "|")
  const extensionPattern = isVideo ? videoExtensions.join(sep) : imageTypes.join(sep)
  const baseNameGroup = toMatchGroup("[A-Za-z0-9_]*?", "baseName", isRegex)
  const widthGroup = toMatchGroup(widthPattern(sep), "width", isRegex)
  const extensionGroup = toMatchGroup(extensionPattern, "extension", isRegex)
  const hashGroup = toMatchGroup("[A-Fa-f0-9]{8}", "hash", isRegex)
  const imagePattern = sep === "|" ? `${baseNameGroup}_${widthGroup}\.${extensionGroup}|${baseNameGroup}_${widthGroup}\.${hashGroup}\.${extensionGroup}` : `${baseNameGroup}_${widthGroup}*.${extensionGroup}`
  if (!isVideo) {
    return imagePattern
  }
  const codecGroup = toMatchGroup(videoCodecs.join(sep), "codec", isRegex)
  return isRegex ? `${baseNameGroup}_${codecGroup}_${widthGroup}\.${extensionGroup}|${baseNameGroup}_${codecGroup}_${widthGroup}\.${hashGroup}\.${extensionGroup}` : `${baseNameGroup}_${codecGroup}_${widthGroup}*.${extensionGroup}`
}

/**
 * @param {string} filename The file name to parse.
 * @returns {HeroFile} The parsed hero file object.
 * @description Parses a hero file name into its constituent parts.
 */
export const parseHeroFileName = (filename: string): HeroFile => {
  let pattern: RegExp
  let pathname: string = ""
  let parent: string = ""
  const parts = filename.split('/')
  if (videoExtensions.includes(filename.split(".").pop() || "")) {
    pattern = new RegExp(getHeroFilePattern(true))
    if (parts.length > 0) {
      parent = parts[parts.length - 2]
      pathname = parts.slice(0, -1).join('/')
    }
  } else {
    pattern = new RegExp(getHeroFilePattern())
    if (parts.length > 0) {
      parent = parts[parts.length - 3]
      pathname = parts.slice(0, -2).join('/')
    }
  }
  const match = pattern.exec(filename)
  if (match && match.groups) {
    return {
      codec: (match.groups.codec as VideoCodec) ?? ("" as ""),
      extension: match.groups.extension as ImageType | "mp4" | "webm",
      filename,
      hash: match.groups.hash ?? "",
      baseName: match.groups.baseName || parent,
      parentPath: pathname || `${basePath}/${match.groups.baseName || parent}`,
      type: videoExtensions.includes(match.groups.extension) ? "video" : "image",
      width: parseInt(match.groups.width, 10) as VideoWidth,
    }
  }
}


/**
 * @param {string} glob The glob to resolve.
 * @param {globby.GlobbyOptions} fastGlobOptions Options to pass to fast-glob.
 * @returns {Promise<string[]>} A promise that resolves to the first file that matches the glob.
 */
export async function resolveGlob(glob: string, fastGlobOptions?: {}): Promise<string[]> {
  try {
    const result = await Promise.resolve(globby(glob, fastGlobOptions)).then((files) => files)
    if (result.length === 0) {
      throw new Error(`Glob "${glob}" did not match any files`)
    } else {
      return result
    }
  } catch (error) {
    console.error("Error resolving glob:", error)
    throw error
  }
}


/**
 * @returns {Promise<string[]>} Directory paths containing hero videos
 */
export async function getVideoParents(): Promise<string[]> {
  return resolveGlob("src/assets/videos/hero/*", { onlyDirectories: true, unique: true })
}

/**
 * @param {string} baseName The base name of the video
 * @param {string} codec The codec of the video
 * @param {number} width The width of the video
 * @returns {string} Constructed video file path
 */
export function buildVideoPath(baseName: string, codec: string, width: number): string {
  const extension = codec === "h264" ? "mp4" : "webm"
  return `${basePath}/${baseName}/${baseName}_${codec}_${width}.${extension}`
}

/**
 * @param {string} baseName The base name of the video
 * @returns {Promise<HeroVideo>} A promise that resolves to the hero video object
 */
export async function generateVideoVariants(baseName: string, images: HeroImage[]): Promise<HeroVideo> {
  // @ts-ignore
  const variants: CodecVariants = {
    av1: { ...resKeys },
    vp9: { ...resKeys },
    h264: { ...resKeys },
  }
  const imageVariants = {
    avif: { widths: { ...resKeys }, srcset: "", parent: "" },
    webp: { widths: { ...resKeys }, srcset: "", parent: "" },
    png: { widths: { ...resKeys }, srcset: "", parent: "" },
  }

  for (const resolution of videoConfig.resolutions) {
    for (const codec of videoConfig.codecs) {
      const path = buildVideoPath(baseName, codec, resolution.width)
      if (await fs.promises.access(path).catch(() => false) && Object.keys(variants[codec]).length > 0) {
        variants[codec][resolution.width] = path
      }
    }
  }

  // Get matching poster image
  const poster = images.find((image) => image.imageName === baseName)
  return {
    baseName,
    parent: `src/assets/videos/hero/${baseName}`,
    variants,
    poster: poster || { parent: "", imageName: "", images: imageVariants },
  }
}

export async function getFiles(): Promise<HeroFiles> {
  const files = await resolveGlob(`${basePath}/**`, { onlyFiles: true, unique: true, expandDirectories: { extensions: [...imageTypes, ...videoExtensions] } })
  const heroFiles = files.map(parseHeroFileName)
  return heroFiles.reduce((acc, file) => {
    if (file.type === "image") {
      acc.images.push(file)
    } else {
      acc.videos.push(file)
    }
    return acc
  }, { images: [] as HeroFile[], videos: [] as HeroFile[] })
}

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
  format: "esm",
  platform: "browser",
  target: "es2020",
  outbase: "src",
  chunkNames: "[dir]/assets/javascripts/chunks/[name].[hash]",
  assetNames: "[dir]/[name].[hash]",

  loader: {
    ".avif": "file",
    ".css": "css",
    ".js": "js",
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
  outExtension: {".js": ".js", ".css": ".css"},
  splitting: false,
  plugins: [
    tsconfigPathsPlugin({
      cwd: process.cwd(),
      tsconfig: "tsconfig.json",
      filter: /src\/assets\/javascripts\/index.ts/
    }),
    cssModulesPlugin({
      emitCssBundle: {
        filename: "bundle.css",
      },
    }),
    /**
     * Taking this offline for now; will revisit later
    copy({
      watch: true,
      verbose: true,
      resolveFrom: "cwd",
      globbyOptions: { gitignore: true, extglob: true, unique: true, expandDirectories: { extensions: ["svg", "woff", "woff2"]} },
      assets: [
        { from: "./src/assets/images/**", to: "./docs/assets/images" },
        { from: "./src/assets/fonts/**", to: "./docs/assets/fonts" },

      ],
    }),
      */
  ],
}

export const baseProject: Project = {
  entryPoints: ["src/assets/javascripts/index.ts",
    "src/assets/javascripts/workers/cache_worker.ts",
    "src/assets/stylesheets/bundle.css"
  ],
  tsconfig: "tsconfig.json",
  entryNames: "[dir]/[name].[hash]",
  platform: "browser",
  outdir: "docs",
}


/**
 * @param {HeroPaths} paths to generate a Srcset for.
 * @returns {Promise<string>} A promise that resolves to the Srcset for the image.
 * @description Generates a Srcset property for the provided image index information.
 */
export async function generateSrcset(paths: HeroPaths): Promise<string> {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([width, src]) => {
      return `${src} ${width}w`
    })
  )
  return entries.join(", ")
}

/**
 * @param {ImageType} ext The image type to map widths for.
 * @param {string[]} files The files to map widths for.
 * @returns {HeroPaths} An object containing the mapped widths.
 * @description Maps the widths of the provided files to an object.
 */
const mapWidths = (ext: ImageType, files: string[]): HeroPaths => {
  const imageTypeIndex = { widths: { ...resKeys } }
  // we could simplify this pattern, but I want it to be clear what's happening
  const filePattern = `[a-zA-Z_]*?_(?<resolution>${widthPattern})\.(?<extension>${ext})|[a-zA-Z_]*?_(?<resolution>${widthPattern})\.(?<hash>[A-Fa-f0-9]{8})\.(?<extension>${ext})`
  const pattern = new RegExp(filePattern)
  for (const file of files) {
    const match = file.match(pattern)
    if (match && match.groups) {
      const width = parseInt(match.groups.resolution, 10)
      if (width && match.groups.extension === ext) {
        imageTypeIndex.widths[width] = file
      }
    }
  }
  return imageTypeIndex.widths
}

/**
 * @description Builds an ImageIndex for a hero image.
 * @param parent - The parent directory of the hero image.
 * @param heroFilePattern - The pattern to match hero image files.
 * @returns {Promise<ImageIndex>} A promise that resolves to the image index.
 */
export const buildHeroIndex = async (parent: string, heroFilePattern: string): Promise<ImageIndex> => {
  const pathObj = { ...resKeys }
  const imageBaseIndex: ImageIndex = {
    avif: { widths: pathObj, parent, srcset: "" },
    webp: { widths: pathObj, parent, srcset: "" },
    png: { widths: pathObj, parent, srcset: "" },
  }
  const children = await resolveGlob(`${parent}/posters/${heroFilePattern}`, { onlyFiles: true, unique: true })
  const imageTypes = Object.keys(imageBaseIndex) as ImageType[]
  imageTypes.forEach(async (ext) => {
    imageBaseIndex[ext].widths = mapWidths(ext as ImageType, children) as HeroPaths
    // srcset get generated after we hash the images
  })
  return imageBaseIndex
}

/**
 * @returns {Promise<HeroImage[]>} A promise that resolves to an array of hero images.
 * @description Generates an array of hero images with their respective image indexes.
 */
export const heroImages = async (): Promise<HeroImage[]> => {
  const parents = await resolveGlob("src/assets/videos/hero/*", { onlyDirectories: true })
  const getImageIndexes = async () => {
    return Promise.all(
      parents.map(async (parent: string) => {
        const key = parent.split("/").pop() || ""
        const widthPattern = Object.keys(resKeys).map(key => { return key.toString() }).join(",")
        const heroFilePattern = `${key}_\{${widthPattern}\}.+(avif|webp|png)`
        const index = await buildHeroIndex(parent, heroFilePattern)
        return { imageName: key, parent, images: index } as HeroImage
      }) as Promise<HeroImage>[]
    )
  }
  return getImageIndexes()
}
