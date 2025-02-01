/**
 * @module BuildProcess
 * @description Comprehensive build and asset management system for Plain License
 * Handles image processing, esbuild configuration, hash breaking,
 * and metadata generation.
 *
 * It also generates a TypeScript file for hero images/videos, with all associated metadata,
 * and provides metadata used in the MKDocs build process.
 *
 * @overview
 * A build script that handles:
 * - Asset processing and optimization
 * - Image transformation and hashing
 * - SVG minification
 * - TypeScript file generation
 * - esbuild configuration and execution
 * - CSS placeholder replacement
 * - Build artifact management
 *
 * @see {@link https://esbuild.github.io/} esbuild Documentation
 * @see {@link https://rxjs.dev/} RxJS Documentation
 *
 * @author Adam Poulemanos adam<at>plainlicense<.>org
 * @license Plain-Unlicense (Public Domain)
 * @copyright No rights reserved.
 */

import * as esbuild from "esbuild"
import * as fs from "fs/promises"
import * as path from "path"
import { Observable, from } from "rxjs"
import * as utils from "./utils"
import {
  HERO_VIDEO_TEMPLATE,
  backupImage,
  basePosterObj,
  baseProject,
  cssSrc,
  metaPath,
  videoMessages,
  webConfig,
} from "./config/"
import {
  FileHashes,
  HeroFiles,
  HeroImage,
  HeroVideo,
  Project,
  buildJson,
  esbuildOutputs,
} from "./types"
import { createHash } from "crypto"

// TODO: Refactor to use esbuild's transform API and reduce the number of file reads and writes

/** ========================================================================
 **                            Templates and Working Data
 *========================================================================**/

const noScriptImage: HeroImage = {
  ...basePosterObj,
  imageName: backupImage,
  parent: `src/assets/images/${backupImage}`,
}

const heroFiles: Promise<HeroFiles> = utils.getHeroFiles()

let newFileLocs: FileHashes = {}

/**
 * Processes hero video files and associated images.
 * Retrieves hero images and videos, constructs video objects with posters and variants,
 * and updates the parent path for the documentation directory.
 * @returns {Promise<HeroVideo[]>} A promise that resolves to an array of processed hero videos.
 */
async function handleFiles(): Promise<HeroVideo[]> {
  const { images, videos } = await heroFiles
  const parentPaths = utils.getParents(videos)
  const processedVideos = Array(parentPaths.length).fill(HERO_VIDEO_TEMPLATE)
  const availableVideos = new Set(videos.map((vid) => vid.baseName))
  if (Object.keys(videoMessages).length !== availableVideos.size) {
    throw new Error(
      "Video messages do not match available videos. Did you forget to add a message?",
    )
  }
  processedVideos.map((heroVideo, index) => {
    let { baseName, parent, message, poster, variants } = heroVideo
    baseName = [...availableVideos][index]
    parent = utils.srcToDocs(parentPaths[index])
    message = videoMessages[baseName] || ""
    const filteredImages = images.filter((image) => image.baseName === baseName)
    poster = utils.constructPoster(filteredImages)
    const filteredVideos = videos.filter((vid) => vid.baseName === baseName)
    variants = utils.constructVariants(filteredVideos)
    return { baseName, parent, message, poster, variants }
  })
  return processedVideos
}

/**
 * Calculates and appends hashes to other asset files (images, fonts).
 * Retrieves files, calculates their hashes, renames them with the hash, copies to the destination, and returns a mapping of original to hashed file paths.
 * @returns {Promise<FileHashes>} A promise that resolves to a mapping of original file paths to hashed file paths.
 */
async function handleImageHashes(): Promise<FileHashes> {
  const destPath = (parsed: path.ParsedPath, hash: string) => {
    return `${utils.srcToDocs(parsed.dir)}/${parsed.name}.${hash}${parsed.ext}`
  }
  const files = await utils.resolveGlob("src/assets/images/**/*.{svg,png,jpg,jpeg,webp,avif}")
  if (!files) {
    return {}
  }
  const processed = []
  for (const file of files) {
    const parsed = path.parse(file)
    const { ext } = parsed
    let hash = await utils.getmd5Hash(file)
    let dest = destPath(parsed, hash)
    if (ext === ".svg") {
      const content = await fs.readFile(file, "utf8")
      const minified = utils.minsvg(content)
      hash = createHash("md5").update(minified).digest("hex").slice(0, 8)
      dest = destPath(parsed, hash)
      if (!(await utils.fileExists(dest))) {
        await fs.writeFile(dest, minified)
      }
    } else if (!(await utils.fileExists(dest))) {
      await utils.copyFile(file, dest)
    }
    processed.push([file, dest])
  }
  return Object.fromEntries(processed)
}

/**
 * @param {Project} project - the project to build
 * @returns {Observable<Promise<void>>} an observable
 */
async function build(project: Project): Promise<Observable<unknown>> {
  console.log(`Building ${project.platform}...`)
  const config = webConfig
  try {
    const buildPromise = esbuild
      .build({
        ...config,
        ...project,
      })
      .then(async (result) => {
        if (result && result.metafile) {
          const output = await metaOutput(result)
          if (output) {
            await cacheMeta(output)
            await writeMeta(output)
            await metaOutputMap(output)
          }
        }
      })
    return from(buildPromise)
  } catch (error) {
    console.error(`Error building ${project.platform}:`, error)
  }
}

/**
 * @function clearDirs
 * @description Clears the directories in the docs folder
 */
async function clearDirs() {
  const files = await heroFiles
  const parents = utils.getParents(files.videos)
  const destParents = parents.map((parent) => utils.srcToDocs(parent))
  const dirs = [
    "docs/assets/stylesheets",
    "docs/assets/javascripts",
    "docs/assets/images",
    "docs/assets/fonts",
    "docs/assets/videos",
    ...destParents,
  ]
  for (const dir of dirs) {
    if (!(await fs.stat(dir).catch(() => false))) {
      continue
    }
    for (const file of await fs.readdir(dir)) {
      if ((await fs.stat(`${dir}/${file}`)).isFile()) {
        try {
          await fs.rm(`${dir}/${file}`)
        } catch (err) {
          console.error(err)
        }
      }
    }
  }
}

/**
 * @param {esbuild.BuildResult} result - the esbuild build result
 * @returns {esbuild.BuildResult.esbuildOutputs} the 'outputs' section of the esbuild metafile
 * @description Gets the 'outputs' section of the esbuild metafile
 */
const metaOutput = async (result: esbuild.BuildResult): Promise<esbuildOutputs> => {
  if (!result.metafile) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(result.metafile.outputs).map(([key, output]) => [
      key,
      {
        bytes: output.bytes,
        inputs: Object.keys(output.inputs),
        exports: output.exports,
        entryPoint: output.entryPoint,
      },
    ]),
  )
}

/**
 * Checks if cached assets have changed, and returns the current cache version accordingly.
 * If the cached URLs are empty or different from the new URLs, it returns the current timestamp.
 * Otherwise, it returns the cached version.
 * @param output - The esbuild outputs containing information about generated files.
 * @returns {Promise<number>} The cache version, either a timestamp or the cached version.
 */
const checkCacheVersion = async (output: esbuildOutputs): Promise<number> => {
  const lastCacheMeta = await fs.readFile(metaPath, "utf8").catch(() => {
    return "{}"
  })
  const lastCache = JSON.parse(lastCacheMeta)
  const lastUrls = lastCache.urls || []
  if (lastUrls.length === 0) {
    return Date.now()
  } else {
    const keys = Object.keys(output)
    const newUrls = keys
      .filter((key) => key.endsWith(".js") || key.endsWith(".css") || key.endsWith(".woff2"))
      .map((key) => key.replace("docs/", ""))
    const urlsChanged = !(
      lastUrls.length === newUrls.length && lastUrls.every((v, i) => v === newUrls[i])
    )
    if (urlsChanged) {
      return Date.now()
    } else {
      return lastCache.version
    }
  }
}

/**
 * Checks if cached assets have changed, and returns the current cache version accordingly
 * @param output - the esbuild outputs
 * @returns {Promise<number>} the cache version
 */
const getCacheVersion = async (output: esbuildOutputs): Promise<number> => {
  if (!(await utils.fileExists(metaPath))) {
    return await checkCacheVersion(output)
  } else {
    return Date.now()
  }
}

/**
 * Provides metafile output for the cache service worker
 * @param output - the esbuild outputs
 */
const cacheMeta = async (output: esbuildOutputs) => {
  let precache_urls = Object.keys(output)
    .filter((key) => key.endsWith(".js") || key.endsWith(".css"))
    .map((key) => key.replace("docs/", ""))
  precache_urls.push(...Object.values(newFileLocs))
  const cacheName = "plain-license-v1"
  const cacheJson = JSON.stringify(
    { cacheName, urls: precache_urls, version: getCacheVersion(output) },
    null,
    2,
  )
  await fs.writeFile(metaPath, cacheJson)
}

/**
 * @param {esbuildOutputs} output - the esbuild outputs
 * @returns {Promise<buildJson>} the mapping object
 * @description Maps the metafile outputs
 */
const metaOutputMap = async (output: esbuildOutputs): Promise<buildJson> => {
  const keys = Object.keys(output)
  const jsSrcKey = keys.find((key) => key.endsWith(".js"))
  const cssSrcKey = keys.find(
    (key) => key.endsWith(".css") && key.includes("bundle") && !key.includes("javascripts"),
  )
  const noScriptImageContent = utils.generatePictureElement(noScriptImage)

  const mapping = {
    noScriptImage: noScriptImageContent,
    SCRIPTBUNDLE: jsSrcKey?.replace("docs/", "") || "",
    CSSBUNDLE: cssSrcKey?.replace("docs/", "") || "",
  }
  const outputMetaPath = path.join("overrides", "buildmeta.json")
  await fs.writeFile(outputMetaPath, JSON.stringify(mapping, null, 2))

  return mapping // Return the mapping object
}

/**
 * @param {Object} metaOutput - the meta output
 * @description Writes the meta output to a file
 */
const writeMeta = async (metaOutput: {}) => {
  const metaJson = JSON.stringify({ metaOutput }, null, 2)
  await fs.writeFile(path.join("docs", "meta.json"), metaJson)
}

/**
 * @description Builds all projects
 * @returns {Promise<void>}
 */
async function buildAll(): Promise<void> {
  const handleSubscription = async (project: any) => {
    ;(await build(project)).subscribe({
      next: () => console.log(`Build for ${project.platform} completed successfully`),
      error: (error) => console.error(`Error building ${project.platform}:`, error),
      complete: () => console.log(`Build for ${project.platform} completed`),
    })
  }
  console.log("Building all projects...")
  await clearDirs()
  console.log("Directories cleared")
  console.log("retrieving hero videos")
  const videos = await handleFiles()
  console.log("hero videos retrieved")
  console.log("exporting hero videos to typescript file")
  const imageHashes = await handleImageHashes()
  await utils.exportVideosToTS(videos, noScriptImage)
  console.log("hero videos exported")
  const newFontLocs = await utils.generatePlaceholderMap()
  newFileLocs = { ...imageHashes, ...newFontLocs }
  console.log("CSS placeholders replaced; SVGS minified")
  try {
    console.log("Building base project...")
    await handleSubscription(baseProject)
  } catch (error) {
    console.error("Error building base project:", error)
  }
}

async function main() {
  console.log("Building Plain License...")
  await buildAll()
    .then(() => console.log("Build completed"))
    .catch((error) => console.error("Error building:", error))
  if (fs.stat(cssSrc).catch(() => false)) {
    try {
      fs.rm(cssSrc)
        .then(() => console.log("Temporary bundle.css removed"))
        .catch((err) => console.error(`Error removing temporary bundle.css: ${err}`))
    } catch (err) {
      console.error(`Error removing temporary bundle.css: ${err}`)
    }
  }
}

main()
