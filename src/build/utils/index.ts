/* eslint-disable no-console */
import * as crypto from "crypto"
import globby from "globby"
import * as fs from "fs/promises"
import { HERO_VIDEO_TEMPLATE, basePath, cssLocs, fontLoc, imageTypes, placeholderMap, videoCodecs, videoExtensions, widthPattern } from "../config"
import type { CodecVariants, FileHashes, HeroFile, HeroFiles, HeroImage, HeroPaths, ImageType, PlaceholderMap, VideoCodec, VideoWidth } from "../types"
import { optimize } from "svgo"
import path from "path"

const basePosterObj = HERO_VIDEO_TEMPLATE.poster

/**
 * Generates a regular expression pattern for matching hero file names.
 * Matches hero image or video filenames, optionally including a hash.
 * @param {boolean} isVideo Whether to generate a pattern for video files. Defaults to false.
 * @param {sep} sep The separator to use. Defaults to "|". Can be set to "," for globby bash-style patterns.
 * @returns {string} The generated regular expression pattern.
 */
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
 * @param filePath - the path to the file
 * @returns {string} new filename with the hash appended
 * @description Generates an MD5 hash for a file
 */
export async function getmd5Hash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8')
  const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8)
  const parts = filePath.split('.')
  const ext = parts.pop()
  return `${parts.join('.')}.${hash}.${ext}`
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
 * Retrieves and categorizes hero image and video files.
 * Finds all image and video files, parses their names, calculates hashes, and groups them by type.
 * @returns {Promise<HeroFiles>} A promise that resolves to an object containing arrays of image and video hero files.
 */
export async function getHeroFiles(): Promise<HeroFiles> {
  const files = await resolveGlob(`${basePath}/**`, { onlyFiles: true, unique: true, expandDirectories: { extensions: [...imageTypes, ...videoExtensions] } })
  const heroFiles = files.map(parseHeroFileName)
  let images: HeroFile[] = []
  let videos: HeroFile[] = []
  heroFiles.forEach(async file => {
    file.hash = await getmd5Hash(file.filename)
    if (file.type === "image") {
      images.push(file)
    } else {
      videos.push(file)
    }
  })
  return { images, videos }
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
 * @param {string} fullPath - the full path to the file
 * @returns {string} the file hash
 * @description Extracts the hash from a file name
 */
export async function getFileHash(fullPath: string): Promise<string> {
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
export function minsvg(data: string): string {
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
export function toEnumString(str: string): string {
  return `${str.toUpperCase()} = "${str}"`
}

export async function makeDir(dir: string): Promise<void> {
  if (!((await fs.stat(dir).catch(() => false)))) {
    await fs.mkdir(dir, { recursive: true })
  }
}

export async function copyFile(src: string, dest: string): Promise<void> {
  await makeDir(path.dirname(dest))
  if (!((await fs.access(dest).catch(() => false)))) {
    await fs.copyFile(src, dest)
  }
}

/**
 * Generates a picture element for the hero image
 * @param image - the hero image
 * @param className - the class name
 * @returns {string} the picture element
 */
export const generatePictureElement = (image: HeroImage, className: string = "hero__poster"): string => {
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
 * Extracts unique parent paths from an array of HeroFile objects.
 * Creates a set of parent paths to ensure uniqueness and then converts it back to an array.
 * @param {HeroFile[]} files An array of HeroFile objects.
 * @returns {string[]} An array of unique parent paths.
 */
export function getParents(files: HeroFile[]): string[] {
  const parents = new Set(files.map((file) => file.parentPath))
  return Array.from(parents)
}


/**
 * Constructs a HeroImage object from an array of HeroFile objects.
 * Copies image files, generates srcset properties, and populates the HeroImage object.
 * @param {HeroFile[]} posterImages An array of HeroFile objects representing poster images.
 * @returns {HeroImage} The constructed HeroImage object.
 */
export function constructPoster(posterImages: HeroFile[]): HeroImage {
  const { imageName, parent, images } = { ...basePosterObj, imageName: posterImages[0].baseName, parent: posterImages[0].parentPath.replace('src', 'docs') }
  posterImages.map((image) => {
    const { extension, baseName, filename, hash, width } = image
    const newPath = `${parent}/${baseName}_${width}.${hash}.${extension}`
    copyFile(filename, newPath)
    images[extension as ImageType].widths[width] = newPath
  })
  imageTypes.forEach(async (t) => {
    images[t]["srcset"] = await generateSrcset(images[t].widths)
  })
  return { imageName, parent, images }
}


/**
 * Constructs a CodecVariants object from an array of HeroFile objects.
 * Copies video files and populates the CodecVariants object.
 * @param {HeroFile[]} videoFiles An array of HeroFile objects representing video files.
 * @returns {CodecVariants} The constructed CodecVariants object.
 */
export function constructVariants(videoFiles: HeroFile[]): CodecVariants {
  const { variants } = HERO_VIDEO_TEMPLATE
  const parent = videoFiles[0].parentPath.replace('src', 'docs')
  videoFiles.map((video) => {
    const { codec, extension, filename, hash, width } = video
    const newPath = `${parent}/${video.baseName}_${codec}_${width}.${hash}.${extension}`
    copyFile(filename, newPath)
    variants[codec as VideoCodec][width] = newPath
  })
  return variants
}

  /**
   * @description Removes hashed files in the src directory
   */
export async function removeHashedFilesInSrc() {
  const hashedFiles = await resolveGlob('src/assets/*', {
    onlyFiles: true, unique: true, expandDirectories: {
      extensions: [
        'avif',
        'css',
        'js',
        'mp4',
        'png',
        'svg',
        'webm',
        'webp',
        'woff',
        'woff2'
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
 * Resolves CSS files and generates a map of placeholders to their hashed filenames.
 * Retrieves CSS files, calculates their hashes, and creates a map of placeholders to the new filenames.
 * @returns {Promise<Partial<PlaceholderMap>>} A promise that resolves to a partial PlaceholderMap containing CSS file information.
 */
async function resolveCssFiles(): Promise<Partial<PlaceholderMap>> {
  const locs = cssLocs
  const resolvedPlaceholders: Partial<PlaceholderMap> = {}
  Object.entries(locs).forEach(async ([template, mapping]) => {
    Object.entries(mapping).forEach(async ([placeholder, glob]) => {
      const file = await resolveGlob(glob, { onlyFiles: true, unique: true })
      const hash = await getFileHash(file[0])
      resolvedPlaceholders[template] = { ...resolvedPlaceholders[template], [placeholder]: hash }
    })
  })
  return resolvedPlaceholders
}

/**
 * Resolves font files and generates a map of placeholders to their hashed filenames.
 * Retrieves font files, calculates their hashes, copies them to the destination directory with updated filenames, and creates a map of placeholders to the new filenames.
 * @returns {Promise<Partial<PlaceholderMap>>} A promise that resolves to a partial PlaceholderMap containing font file information.
 */
async function resolveFontFiles(): Promise<Partial<PlaceholderMap>> {
  const fontGlob = fontLoc
  const fontkey = Object.keys(placeholderMap).find(key => key.includes('font'))
  const resolvedPlaceholders: Partial<PlaceholderMap> = {}
  const files = await resolveGlob(fontGlob, { onlyFiles: true, unique: true })
  files.forEach(async (file) => {
    const filename = path.basename(file)
    const hash = await getmd5Hash(file)
    const newFilename = filename.replace(/\.(woff2?)^/, `.${hash}.$1`)
    const newPath = file.replace('src', 'docs').replace(filename, newFilename)
    await copyFile(file, newPath)
    const placeholder = `{{ ${filename} }}`
    resolvedPlaceholders[fontkey][placeholder] = newFilename
  })
  return resolvedPlaceholders
}


/**
 * Replaces placeholders in template files with their corresponding values.
 * Reads each template file, replaces placeholders with values from the provided map, and writes the updated content to a new file. Removes "_template" from the filename.
 * @param {PlaceholderMap} newContent A map of template file paths to placeholder names and their corresponding values.
 * @returns {Promise<void>}
 */
async function replacePlaceholders(newContent: PlaceholderMap): Promise<void> {
  for (const [file, placeholders] of Object.entries(newContent)) {
    try {
      const replacedContent = await fs.readFile(file, 'utf8').then((data) => {
        for (const [placeholder, value] of Object.entries(placeholders)) {
          data = data.replace(new RegExp(placeholder, 'g'), value)
          return data
        }
      })
      const parts = file.split('/')
      const oldFilename = parts.pop()
      const newFilename = oldFilename.replace(/$_/, '').replace(/_template/, '')
      const newPath = parts.includes(oldFilename) ? parts.join().replace(oldFilename, newFilename) : parts.join('/') + newFilename
      await fs.writeFile(newPath, replacedContent)
    } catch (err) {
      console.error(err)
    }
  }
}

/**
 * Generates a map of placeholder names to their corresponding file names.
 * Resolves CSS and font files, replaces placeholders in templates, and returns a map of font file names.
 * @returns {Promise<{[key: string]: string}>} A promise that resolves to a map of placeholder names to file names.
 */
export async function generatePlaceholderMap(): Promise<{[key: string]: string}> {
  const cssHashMap = await resolveCssFiles()
  const fontHashMap = await resolveFontFiles()
  const newContent = { ...cssHashMap, ...fontHashMap }
  replacePlaceholders(newContent)
  return Array.from(Object.values(fontHashMap)).reduce((acc, val) => {
    Object.values(val).forEach((v: string) => {
      const keyParts = v.split('.')
      const ext = keyParts.pop()
      const name = keyParts[0]
      acc[`${name}.${ext}`] = v
    })
  }, {})
}
