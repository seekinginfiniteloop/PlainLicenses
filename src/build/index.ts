/* eslint-disable no-console */
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


import { exec } from 'child_process'
import * as crypto from "crypto"
import * as esbuild from "esbuild"
import * as fs from 'fs/promises'
import * as path from 'path'
import { Observable, from } from "rxjs"
import { optimize } from "svgo"
import { backupImage, baseProject, cssSrc, generateVideoVariants, getHeroParents, heroImages, resKeys, resolveGlob, videoConfig, webConfig } from "./config/"
import { CodecVariants, FileHashes, HeroImage, HeroPaths, HeroVideo, ImageFormatData, ImageType, Project, VideoCodec, VideoWidth, buildJson, esbuildOutputs } from "./types"

import globby from 'globby'

// TODO: Refactor to use esbuild's transform API and reduce the number of file reads and writes

// template for the noScriptImage, which is inserted into the build output and later added to the main.html template for the <noscript> tag or used as a fallback image
const baseObj = { widths: { ...resKeys }, srcset: '' }
let noScriptImage: HeroImage = {
  imageName: '',
  parent: '',
  images: { avif: baseObj, webp: baseObj, png: baseObj },
}

let images: HeroImage[] = []
let vidParents: string[] = []

/**
 * @param {string} fullPath - the full path to the file
 * @returns {string} the file hash
 * @description Extracts the hash from a file name
 */
async function getFileHash(fullPath: string): Promise<string> {
  if (!fullPath || typeof fullPath !== 'string' || !fullPath.includes('.')) {
    return ''
  }

  const parts = fullPath.split('/')
  const fileName = parts[parts.length - 1]
  const fileNameParts = fileName.split('.')

  if (fileNameParts.length < 3) {
    return ''
  }

  return fileNameParts[fileNameParts.length - 2] === 'min'
    ? fileNameParts[fileNameParts.length - 3]
    : fileNameParts[fileNameParts.length - 2]
}

/**
 * @param {string} data - SVG data
 * @returns {string} the minified SVG data
 * @description Minifies SVG data
 */
function minsvg(data: string): string {
  if (!data.startsWith("<")) {
    return data
  }

  const result = optimize(data, {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false
          }
        }
      },
      {
        name: "removeDimensions"
      }
    ]
  })

  return result.data
}

/**
 * @param filePath - the path to the file
 * @returns {string} new filename with the hash appended
 * @description Generates an MD5 hash for a file
 */
async function getmd5Hash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8')
  const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8)
  const parts = filePath.split('.')
  const ext = parts.pop()
  return `${parts.join('.')  }.${  hash  }.${  ext}`
}

/**
 * @param {string} str - the string to convert
 * @returns {string} the title-cased string
 */
// eslint-disable-next-line no-unused-vars -- saving in case I change my mind
function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * @param {string} str - the string to convert
 * @returns {string} the enum string
 */
function toEnumString(str: string): string {
  return `${str.toUpperCase()} = "${str}"`
}

  /**
   * @returns {Promise<HeroImage[]>} the hero images
   * @description Processes the hero images for the landing page. Hashes, copies the images.
   */
async function handleHeroImages(): Promise<HeroImage[]> {
  const heroes: HeroImage[] = await heroImages()
  for (const [parentName, image] of Object.entries<HeroImage>(heroes)) {
      // Update the parent path
    const imageName = parentName
    const parent = image.parent.replace('src', 'docs')
    if (!(await fs.access(parent).catch(() => false))) {
      await fs.mkdir(parent, { recursive: true })
    }
    const newWidths: { [key: number]: string } = {}
      // Process each width
    for (const ext of Object.keys(image.images)) {
      const newIndex = image.images[ext as ImageType] as ImageFormatData
      for (const [width, src] of Object.entries(image.images[ext as ImageType].widths)) {
        const newPath = (await getmd5Hash(src as string)).replace('src', 'docs')
        newWidths[Number(width)] = newPath
        await fs.copyFile(src as string, newPath)
      }
      const srcset = newSrcSet.join(', ')
      newIndex.srcset = srcset
      newIndex.parent = parent
      newIndex.widths = newWidths as HeroPaths
    }
    images.push({ imageName, parent, images: image.images })
  }
  noScriptImage = images.find((image) => image.parent.includes(backupImage)) || images[0]
  return images
}

  /**
 * Processes the hero videos for the landing page. Hashes, copies, and exports the videos to a TypeScript file.
 * @returns {Promise<HeroVideo[]>} the hero videos
 */
async function handleHeroVideos(): Promise<HeroVideo[]> {
  await handleHeroImages()
  const videos: HeroVideo[] = []

  for (const parent of vidParents) {
    const baseName = path.basename(parent)
    const video = await generateVideoVariants(baseName, images)

    // Hash and copy video files
    const newVariants = Object.fromEntries(videoConfig.codecs.map(codec => [codec, Object.fromEntries(videoConfig.resolutions.map(res => [res.width, ""]))])) as CodecVariants
    for (const [_, variants] of Object.entries(video.variants)) {
      for (const [codec, paths] of Object.entries(variants)) {
        for (const [width, src] of Object.entries(paths)) {
          const newPath = (await getmd5Hash(src)).replace('src', 'docs')
          newVariants[codec as VideoCodec][parseInt(width, 10) as VideoWidth] = newPath
          await fs.copyFile(src, newPath)
        }
      }
    }

    const newImage = images.find((image) => image.imageName === baseName) || { imageName: '', parent: '', images: {} } as HeroImage
    const poster = newImage

    videos.push({
      ...video,
      parent,
      variants: newVariants,
      poster
    })
  }
  return videos
}

  // Write the file to the output pathnoScriptImageParent
const outputPath = path.join('src', 'assets', 'javascripts', 'features', 'hero', 'videos', 'data.ts')

/**
 * Exports the hero videos to a TypeScript file
 */
async function exportVideosToTS(videos: HeroVideo[]) {
  const fileContent = `
/**
 *! NOTE: The build process generates this file.
 *! DO NOT EDIT THIS FILE DIRECTLY.
 * Edit the build script instead (src/build/index.ts).
 *
 * @module data
 * @description A collection of hero videos for the landing page.
 */

export const rawHeroVideos = ${JSON.stringify(videos, null, 2)} as const;

export enum HeroName {
    ${videos.map(video => toEnumString(video.baseName)).join(',\n    ')}
    }

export backupImage = "${noScriptImage}";

`

  await fs.writeFile(outputPath, fileContent)

  /**
   * @description Runs ESLint on the generated file to strip the quotes from keys
   */
  const runLint = async () => {
    await fs.writeFile(outputPath, fileContent)
    console.log('Hero images data exported to heroImages.ts')
    if (!outputPath) {
      console.error('No output path provided')
      return
    }
    const paths = [outputPath]
    // Run ESLint on the generated file to strip the quotes from keys
    paths.forEach((path) => {
      exec(`bunx --bun eslint --cache ${path} --fix`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error running ESLint: ${error.message}`)
          return
        }
        if (stderr) {
          console.error(`ESLint stderr: ${stderr}`)
          return
        }
        console.log(`ESLint stdout: ${stdout}`)
      })
    })
  }
  await runLint()
}

  /**
   * @param {Project} project - the project to build
   * @returns {Observable<Promise<void>>} an observable
   */
async function build(project: Project): Promise<Observable<unknown>> {
  console.log(`Building ${project.platform}...`)
  const config = webConfig
  const buildPromise = esbuild.build({
      ...config,
      ...project
    }).then(async (result) => {
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
   * @description Removes hashed files in the src directory
   */
async function removeHashedFilesInSrc() {
  const hashedFiles = await resolveGlob('src/assets/*', {
    onlyFiles: true, unique: true, expandDirectories: {
      extensions: [
        'avif',
        'css',
        'js',
        'mp4',
        'png',
        'webm',
        'webp'
      ]
    }
  })
  const hashRegex = new RegExp(/^.+(\.[a-fA-F0-9]{8})\.[a-z24]{2,5}/)
  for (const file of hashedFiles) {
    if (hashRegex.test(file)) {
      try {
        await fs.rm(file)
      } catch (err) {
        console.error(err)
      }
    }
  }
}

  /**
   * @function clearDirs
   * @description Clears the directories in the docs folder
   */
async function clearDirs() {
  const parents = await getHeroParents()
  vidParents = parents
  await removeHashedFilesInSrc()
  const destParents = parents.map((parent) => parent.replace('src/assets/', 'docs/assets/'))
  const dirs = ['docs/assets/stylesheets', 'docs/assets/javascripts', 'docs/assets/images', 'docs/assets/fonts', 'docs/assets/videos', ...(destParents)]
  for (const dir of dirs) {
    if (!((await fs.stat(dir).catch(() => false)))) {
      continue
    }
    for (const file of (await fs.readdir(dir))) {
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
  const svgFiles = await globby('src/assets/images/*.svg', { onlyFiles: true, unique: true })
  for (const file of svgFiles) {
    const content = await fs.readFile(file, 'utf8')
    const minified = minsvg(content)
    await fs.writeFile(file, minified)
  }
}

  /**
   * @function getFileHashes
   * @returns {FileHashes} the file hashes for palette and main CSS files
   * @description Gets the file hashes for palette and main CSS files
   */
async function getFileHashes(): Promise<FileHashes> {
  const fastGlobSettings = { onlyFiles: true, unique: true }
  const paletteCSS = await globby('external/mkdocs-material/material/templates/assets/stylesheets/palette.*.min.css', fastGlobSettings)
  const mainCSS = await globby('external/mkdocs-material/material/templates/assets/stylesheets/main.*.min.css', fastGlobSettings)
  const paletteHash = await getFileHash(paletteCSS[0])
  const mainHash = await getFileHash(mainCSS[0])
  return { palette: paletteHash || '', main: mainHash || '' }
}

  /**
   * @function replacePlaceholders
   * @returns {Promise<void>}
   * @description Replaces the CSS placeholders
   */
async function replacePlaceholders(): Promise<void> {
  const { palette, main } = await getFileHashes()
  if (!palette || !main) {
    throw new Error('Palette or main CSS file hash not found')
  }
  try {
    if (await fs.access(cssSrc).catch(() => false)) {
      const cssContent = await fs.readFile(cssSrc, 'utf8')
      if (cssContent.includes(palette) && cssContent.includes(main)) {
        return
      }
    }
    let bundleCssContent = await fs.readFile('src/assets/stylesheets/_bundle_template.css', 'utf8')
    bundleCssContent = bundleCssContent.replace('{{ palette-hash }}', palette).replace("{{ main-hash }}", main)
    await fs.writeFile(cssSrc, bundleCssContent)
  } catch (error) {
    console.error('Error replacing CSS placeholders:', error)
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
      ])
    )
  }

  /**
   * Checks if cached assets have changed, and returns the current cache version accordingly
   * @param output - the esbuild outputs
   * @returns {Promise<number>} the cache version
   */
const getCacheVersion = async (output: esbuildOutputs): Promise<number> => {
  const lastCacheMeta = await fs.readFile('docs/assets/javascripts/workers/meta.json', 'utf8').catch(() => { return '{}' })
  const lastCache = JSON.parse(lastCacheMeta)
  const lastUrls = lastCache.urls || []
  if (lastUrls.length === 0) {
    return Date.now()
  } else {
    const keys = Object.keys(output)
    const newUrls = keys.filter((key) => key.endsWith('.js') || key.endsWith('.css') || key.endsWith('.woff2')).map((key) => key.replace('docs/', ''))
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
  const keys = Object.keys(output)
  const precache_urls = keys.filter((key) => key.endsWith('.js') || key.endsWith('.css') || key.endsWith('.woff2')).map((key) => key.replace('docs/', ''))
  const cacheName = 'plain-license-v1'
  const cacheJson = JSON.stringify({ cacheName, urls: precache_urls, version: getCacheVersion(output)}, null, 2)
  const path = 'docs/assets/javascripts/workers/meta.json'
  await fs.writeFile(path, cacheJson)
}

/**
 * Generates a picture element for the hero image
 * @param image - the hero image
 * @param className - the class name
 * @returns {string} the picture element
 */
const generatePictureElement = (image: HeroImage, className: string = "hero__poster"): string => {
  console.log('Generating picture element')
  const { images } = image
  const { avif, webp, png } = images
  const alt = "hero image"
  const sortedImages = { avif, webp, png }
  image.images = sortedImages
  const sources = Object.entries(sortedImages).map(([ext, { srcset }]) => `<source type="image/${ext}" srcset="${srcset}">`).join('\n')
  const sizes = Object.keys(png.widths).map((width) => {
    if (width !== '3840') {
      return `(max-width: ${width}px) ${width}px`
    } else {
      return `${width}px`
    }
}).join(', ')
  const img = `<img src="${png.widths[1280]}" alt="${alt}" class="${className}--image" draggable="false", fetchpriority="high", loading="eager", sizes="${sizes}">`
  return `<picture class="nojs ${className}">${sources}${img}</picture>`
}

  /**
   * @param {esbuildOutputs} output - the esbuild outputs
   * @returns {Promise<buildJson>} the mapping object
   * @description Maps the metafile outputs
   */
const metaOutputMap = async (output: esbuildOutputs): Promise<buildJson> => {
    const keys = Object.keys(output)
    const jsSrcKey = keys.find((key) => key.endsWith('.js'))
    const cssSrcKey = keys.find((key) => key.endsWith('.css') && key.includes("bundle") && !key.includes("javascripts"))
    const noScriptImageContent = generatePictureElement(noScriptImage)


    const mapping = {
      noScriptImage: noScriptImageContent,
      SCRIPTBUNDLE: jsSrcKey?.replace('docs/', '') || '',
      CSSBUNDLE: cssSrcKey?.replace('docs/', '') || '',
    }
    const outputMetaPath = path.join('overrides', 'buildmeta.json')
    await fs.writeFile(outputMetaPath, JSON.stringify(mapping, null, 2))

    return mapping // Return the mapping object
  }

  /**
   * @param {Object} metaOutput - the meta output
   * @description Writes the meta output to a file
   */
const writeMeta = async (metaOutput: {}) => {
    const metaJson = JSON.stringify({ metaOutput }, null, 2)
    await fs.writeFile(path.join('docs', 'meta.json'), metaJson)
  }

  /**
   * @description Builds all projects
   * @returns {Promise<void>}
  */
async function buildAll(): Promise<void> {
  const handleSubscription = async (project: any) => {
      (await build(project)).subscribe({
        next: () => console.log(`Build for ${project.platform} completed successfully`),
        error: (error) => console.error(`Error building ${project.platform}:`, error),
        complete: () => console.log(`Build for ${project.platform} completed`)
      })
    }
  console.log('Building all projects...')
  await clearDirs()
  console.log('Directories cleared')
  console.log('retrieving hero videos')
  const videos = await handleHeroVideos()
  console.log('hero videos retrieved')
  console.log('exporting hero videos to typescript file')
  await exportVideosToTS(videos)
  console.log('hero videos exported')
  await transformSvg()
  await replacePlaceholders()
  console.log('CSS placeholders replaced; SVGS minified')
  try {
    console.log('Building base project...')
    await handleSubscription(baseProject)
  } catch (error) {
    console.error('Error building base project:', error)
  }
}

async function main() {
  console.log('Building Plain License...')
  await buildAll().then(() => console.log('Build completed')).catch((error) => console.error('Error building:', error))
  try {
    fs.rm(cssSrc).then(() => console.log('Temporary bundle.css removed')).catch((err) => console.error(`Error removing temporary bundle.css: ${err}`))
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
