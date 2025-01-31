import * as crypto from "crypto"
import globby from "globby"
import * as fs from "fs/promises"
import {
  HERO_VIDEO_TEMPLATE,
  allExtensions,
  basePath,
  cssLocs,
  fontLoc,
  hashPattern,
  imageTypes,
  mediaExtensionPattern,
  namePattern,
  placeholderMap,
  resolutions,
  videoCodecs,
  videoExtensions,
} from "../config"
import type {
  CodecVariants,
  HeroFile,
  HeroFiles,
  HeroImage,
  HeroPaths,
  HeroVideo,
  ImageType,
  MediaFileExtension,
  PlaceholderMap,
  VideoCodec,
  VideoWidth,
} from "../types"
import { optimize } from "svgo"
import path from "path"
import { exec } from "child_process"

const basePosterObj = HERO_VIDEO_TEMPLATE.poster

const getVideoPath = (file: HeroFile, replaceSrc: boolean = true): string => {
  const parentPath = replaceSrc ? file.parentPath.replace("src", "docs") : file.parentPath
  return `${parentPath}/${file.baseName}_${file.codec}_${file.width}.${file.hash}.${file.extension}`
}

/**
 * Extracts the base name from a filename.
 * Splits the filename by '.', removes extensions, resolutions, and codecs, and returns the remaining base name.
 * @param filename - The filename to extract the base name from.
 * @returns The base name of the file.
 */
const getBaseName = (filename: string): string => {
  const stem = filename.split(".")[0]
  const nameRegex = new RegExp(namePattern)
  const match = nameRegex.exec(stem)
  return match ? match[0] : stem
}

/**
 * Extracts the video width from a filename.
 * Parses the filename to find a number matching the video resolutions and returns it as a VideoWidth.
 * @param filename - The filename to extract the width from.
 * @returns The width of the video, or an empty string if not found.
 */
const getWidth = (filename: string): VideoWidth => {
  const widthValue = parseInt(
    filename.split("_").find((name) => {
      return !!name.match(/\d{3,4}/)
    }),
    10,
  )
  return (widthValue && resolutions.includes(widthValue) ? widthValue : "") as VideoWidth
}

/**
 * Validates the input filename and extension.
 * Checks if the filename and extension are valid and if the extension matches the media extension pattern.
 * Throws an error if the input is invalid.
 * @param filename - The filename to validate.
 * @param ext - The extension to validate.
 * @returns True if the input is valid, otherwise throws an error.
 */
const validatePathInput = (filename: string, ext: string): boolean => {
  const isEmpty = (s: string) => s === "" || s === undefined || s === null
  const isValid =
    !isEmpty(filename) &&
    !isEmpty(ext) &&
    filename.includes(ext) &&
    new RegExp(mediaExtensionPattern()).test(ext)
  if (!isValid) {
    console.error(`Invalid input: ${filename} or ${ext}`)
    throw new Error("Invalid input")
  }
  return isValid
}

/**
 * @param filePath - the path to the file
 * @returns {string} new filename with the hash appended
 * @description Generates an MD5 hash for a file
 */
export async function getmd5Hash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, "utf8")
  const hash = crypto.createHash("md5").update(content).digest("hex").slice(0, 8)
  const parts = filePath.split(".")
  const ext = parts.pop()
  return `${parts.join(".")}.${hash}.${ext}`
}

/**
 * Deconstructs a file path string into a HeroFile object.
 * Parses the path to extract information such as filename, extension, width, codec, and hash, and returns a structured HeroFile object.
 * @param pathStr - The file path string to deconstruct.
 * @returns A Promise that resolves to a HeroFile object containing the extracted information.
 */
export async function deconstructPath(pathStr: string): Promise<HeroFile> {
  const filename = pathStr.split("/").pop() || ""
  const ext = filename.split(".").pop() || ""
  validatePathInput(filename, ext)
  return {
    parts: pathStr.split("/"),
    get parentPath() {
      return this.parts.slice(0, -2).join("/")
    },
    filename,
    baseName: getBaseName(filename),
    width: getWidth(filename),
    extension: ext.match(mediaExtensionPattern())[0] as MediaFileExtension,
    srcPath: pathStr,
    mini: filename.includes("min") ? "min" : "",
    hash: filename.match(hashPattern) ? filename.match(hashPattern)[0] : await getmd5Hash(pathStr),
    codec: videoCodecs.find((c) => filename.includes(c)) || "",
    get type() {
      return videoExtensions.includes(this.extension) ? "video" : "image"
    },
    get destPath() {
      return this.type === "video"
        ? `${this.parentPath.replace("src", "docs")}/${this.baseName}_${this.codec}_${this.width}.${this.hash}.${this.extension}`
        : `${this.parentPath.replace("src", "docs")}/${this.baseName}_${this.width}.${this.hash}.${this.extension}`
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
 * Retrieves and categorizes hero image and video files.
 * Orchestrates retrieving all hero files, deconstructing their paths, and categorizing them into image and video files.
 * @returns {Promise<HeroFiles>} A promise that resolves to an object containing arrays of image and video hero files.
 */
export async function getHeroFiles(): Promise<HeroFiles> {
  const files = await resolveGlob(`${basePath}/**`, {
    onlyFiles: true,
    unique: true,
    expandDirectories: { extensions: [...imageTypes, ...videoExtensions] },
  })
  const heroFiles = await Promise.all(files.map((file) => deconstructPath(file)))
  let images: HeroFile[] = []
  let videos: HeroFile[] = []
  for (const file of heroFiles) {
    file.type === "image" ? images.push(file) : videos.push(file)
  }
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
    }),
  )
  return entries.join(", ")
}

/**
 * @param {string} fullPath - the full path to the file
 * @returns {string} the file hash
 * @description Extracts the hash from a file name
 */
export async function getFileHash(fullPath: string): Promise<string> {
  if (!fullPath || typeof fullPath !== "string" || !fullPath.includes(".")) {
    return ""
  }
  const parts = fullPath.split("/")
  const fileName = parts[parts.length - 1]
  const fileNameParts = fileName.split(".")
  if (fileNameParts.length < 3) {
    return ""
  }
  return fileNameParts[fileNameParts.length - 2] === "min" ?
      fileNameParts[fileNameParts.length - 3]
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
            removeViewBox: false,
          },
        },
      },
      {
        name: "removeDimensions",
      },
    ],
  })

  return result.data
}

/**
 * @param {string} str - the string to convert
 * @returns {string} the title-cased string
 */

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

/**
 * @param {string} str - the string to convert
 * @returns {string} the title-cased string
 */
export async function makeDir(dir: string): Promise<void> {
  if (!(await fs.stat(dir).catch(() => false))) {
    await fs.mkdir(dir, { recursive: true })
  }
}

/**
 * @param {string} src - the source file
 * @param src - the source file
 * @param dest - the destination file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await makeDir(path.dirname(dest))
  if (!(await fs.access(dest).catch(() => false))) {
    await fs.copyFile(src, dest)
  }
}

/**
 * Generates a picture element for the hero image
 * @param image - the hero image
 * @param className - the class name
 * @returns {string} the picture element
 */
export const generatePictureElement = (
  image: HeroImage,
  className: string = "hero__poster",
): string => {
  console.log("Generating picture element")
  const { images } = image
  const { avif, webp, png } = images
  const alt = "hero image"
  const sortedImages = { avif, webp, png }
  image.images = sortedImages
  const sources = Object.entries(sortedImages)
    .map(([ext, { srcset }]) => `<source type="image/${ext}" srcset="${srcset}">`)
    .join("\n")
  const sizes = Object.keys(png.widths)
    .map((width) => {
      if (width !== "3840") {
        return `(max-width: ${width}px) ${width}px`
      } else {
        return `${width}px`
      }
    })
    .join(", ")
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
  const { imageName, parent, images } = {
    ...basePosterObj,
    imageName: posterImages[0].baseName,
    parent: posterImages[0].parentPath.replace("src", "docs"),
  }
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
  videoFiles.forEach((video) => {
    const { codec, srcPath, destPath, width } = video
    copyFile(srcPath, destPath)
    variants[codec as VideoCodec][width] = destPath
  })
  return variants
}

/**
 * @description Removes hashed files in the src directory
 */
export async function removeHashedFilesInSrc() {
  const hashedFiles = await resolveGlob("src/assets/*", {
    onlyFiles: true,
    unique: true,
    expandDirectories: {
      extensions: allExtensions,
    },
  })
  const extPat = allExtensions.join("|")
  const testPattern = new RegExp(`.+\\.${hashPattern}\\.(${extPat}|min\\.${extPat})$`)
  for (const file of hashedFiles) {
    if (testPattern.test(file)) {
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
      resolvedPlaceholders[template] = {
        ...resolvedPlaceholders[template],
        [placeholder]: hash,
      }
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
  const fontkey = Object.keys(placeholderMap).find((key) => key.includes("font"))
  const resolvedPlaceholders: Partial<PlaceholderMap> = {}
  const files = await resolveGlob(fontGlob, { onlyFiles: true, unique: true })
  files.forEach(async (file) => {
    const filename = path.basename(file)
    const hash = await getmd5Hash(file)
    const newFilename = filename.replace(/\.(woff2?)^/, `.${hash}.$1`)
    const newPath = file.replace("src", "docs").replace(filename, newFilename)
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
      const replacedContent = await fs.readFile(file, "utf8").then((data) => {
        for (const [placeholder, value] of Object.entries(placeholders)) {
          data = data.replace(new RegExp(placeholder, "g"), value)
          return data
        }
      })
      const parts = file.split("/")
      const oldFilename = parts.pop()
      const newFilename = oldFilename.replace(/$_/, "").replace(/_template/, "")
      const newPath =
        parts.includes(oldFilename) ?
          parts.join().replace(oldFilename, newFilename)
        : parts.join("/") + newFilename
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
export async function generatePlaceholderMap(): Promise<{
  [key: string]: string
}> {
  const cssHashMap = await resolveCssFiles()
  const fontHashMap = await resolveFontFiles()
  const newContent = { ...cssHashMap, ...fontHashMap }
  replacePlaceholders(newContent)
  const mapping = {}
  Array.from(Object.values(fontHashMap)).forEach((_key, val) => {
    Object.values(val).forEach((v: string) => {
      const keyParts = v.split(".")
      const ext = keyParts.pop()
      const name = keyParts[0]
      mapping[`${name}.${ext}`] = v
    })
  })
  return mapping
}

// Write the file to the output ts file
const tsFileOutputPath = path.join(
  "src",
  "assets",
  "javascripts",
  "features",
  "hero",
  "videos",
  "data.ts",
)

/**
 * Exports the hero videos to a TypeScript file
 */
export async function exportVideosToTS(videos: HeroVideo[], noScriptImage: HeroImage) {
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
    ${videos.map((video) => toEnumString(video.baseName)).join(",\n    ")}
    }

export backupImage = "${noScriptImage}";
`

  await fs.writeFile(tsFileOutputPath, fileContent)

  /**
   * @description Runs ESLint on the generated file to strip the quotes from keys
   */
  const runLint = async () => {
    await fs.writeFile(tsFileOutputPath, fileContent)
    console.log("Hero images data exported to heroImages.ts")
    if (!tsFileOutputPath) {
      console.error("No output path provided")
      return
    }
    const paths = [tsFileOutputPath]
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
