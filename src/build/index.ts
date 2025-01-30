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

import globby from "globby"

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
  processedVideos.map((heroVideo, index) => {
    const parent = Array.from(parentPaths)[index]
    const newParent = parent.replace("src", "docs")
    const baseName =
      videos.find((video) => video.parentPath === parent)?.baseName || parent.split("/").pop()
    const message = videoMessages[baseName] || ""
    const poster = utils.constructPoster(
      images.filter((image) => image.baseName === baseName || image.parentPath === parent),
    )
    const variants = utils.constructVariants(videos.filter((video) => video.parentPath === parent))
    processedVideos[index] = {
      ...heroVideo,
      baseName,
      parent: newParent,
      poster,
      variants,
      message,
    }
  })
  return processedVideos
}

/**
 * Calculates and appends hashes to other asset files (images, fonts).
 * Retrieves files, calculates their hashes, renames them with the hash, copies to the destination, and returns a mapping of original to hashed file paths.
 * @returns {Promise<FileHashes>} A promise that resolves to a mapping of original file paths to hashed file paths.
 */
async function handleImageHashes(): Promise<FileHashes> {
  const files = await utils.resolveGlob("src/assets/{images}/**/*.{svg,png,jpg,jpeg,webp,avif}")
  const hashes = Array.from(files).map(async (file) => {
    return { [file]: await utils.getFileHash(file) }
  })
  const allHashes = Object.assign({}, { ...(await Promise.all(hashes)) })
  const processed = Object.entries(allHashes).map(async ([file, hash]) => {
    const hashPath = file.replace("src", "docs")
    const filename = path.basename(file)
    const filenameParts = filename.split(".")
    const newFilename = `${filenameParts[0]}.${hash}.${filenameParts[1]}`
    const newPath = hashPath.replace(filename, newFilename)
    await utils.copyFile(file, newPath)
    return { [file]: newPath }
  })
  return Object.assign({}, ...(await Promise.all(processed)))
}

/**
 * @param {Project} project - the project to build
 * @returns {Observable<Promise<void>>} an observable
 */
async function build(project: Project): Promise<Observable<unknown>> {
  console.log(`Building ${project.platform}...`)
  const config = webConfig
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
}

/**
 * @function clearDirs
 * @description Clears the directories in the docs folder
 */
async function clearDirs() {
  const files = await heroFiles
  const parents = utils.getParents(files.videos)
  const destParents = parents.map((parent) => parent.replace("src/assets/", "docs/assets/"))
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
      const filePath = path.join(dir, file)
      if ((await fs.stat(filePath)).isFile()) {
        try {
          await fs.rm(filePath)
        } catch (err) {
          console.error(err)
        }
      }
    }
  }
}

/**
 * @function transformSvg
 * @returns {Promise<void>}
 * @description Transforms SVG files, minifying and writing them back to the source directory
 */
async function transformSvg(): Promise<void> {
  const svgFiles = await globby("src/assets/images/*.svg", {
    onlyFiles: true,
    unique: true,
  })
  for (const file of svgFiles) {
    const content = await fs.readFile(file, "utf8")
    const minified = utils.minsvg(content)
    await fs.writeFile(file, minified)
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
 * Checks if cached assets have changed, and returns the current cache version accordingly
 * @param output - the esbuild outputs
 * @returns {Promise<number>} the cache version
 */
const getCacheVersion = async (output: esbuildOutputs): Promise<number> => {
  const lastCacheMeta = await fs
    .readFile("docs/assets/javascripts/workers/meta.json", "utf8")
    .catch(() => {
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
    const urlsChanged = newUrls.some((url) => !lastUrls.includes(url))
    if (urlsChanged) {
      return Date.now()
    } else {
      return lastCache.version
    }
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
  const path = "docs/assets/javascripts/workers/meta.json"
  await fs.writeFile(path, cacheJson)
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
  await transformSvg()
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
  try {
    fs.rm(cssSrc)
      .then(() => console.log("Temporary bundle.css removed"))
      .catch((err) => console.error(`Error removing temporary bundle.css: ${err}`))
  } catch (err) {
    console.error(`Error removing temporary bundle.css: ${err}`)
  }
}

main()

/** For MinSVG function:
 *
 * Copyright (c) 2016-2024 Martin Donath <martin.donath@squidfunk.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.

 */
