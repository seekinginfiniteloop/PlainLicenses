import * as crypto from "crypto"
import globby from "globby"
import * as fs from "fs/promises"
import {
  HERO_VIDEO_TEMPLATE,
  allExtensions,
  basePath,
  cssLocs,
  cssSrc,
  fontLoc,
  hashPattern,
  imageTypes,
  mediaExtensionPattern,
  placeholderMap,
  resPattern,
  tsTemplate,
  videoCodecs,
  videoExtensions,
} from "../config"
import type {
  CodecVariants,
  HeroFile,
  HeroFiles,
  HeroPaths,
  HeroVideo,
  ImageIndex,
  MediaFileExtension,
  PlaceholderMap,
  VideoWidth,
} from "../types"
import { optimize } from "svgo"
import path, { ParsedPath } from "path"
import { exec } from "child_process"

const basePosterObj = HERO_VIDEO_TEMPLATE.poster

/**
 * Replace the src path with the docs path.
 * @param srcPath - The source path to convert.
 * @returns {string} The corresponding docs path.
 */
export function srcToDocs(srcPath: string): string {
  return srcPath.replace("src", "docs")
}

/**
 * Checks if a file exists at the given path.
 * @param filePath - The path to the file to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return await fs
    .access(filePath)
    .then(() => true)
    .catch(() => false)
}

/**
 * Compares two HeroPath-based arrays based on their width as numbers in descending order.
 * @param a - The first array
 * @param b - The second array
 * @returns {number} A negative number if a's width is greater than b's, positive if b, else 0.
 */
function sortWidths(a: [string, unknown], b: [string, unknown]): number {
  const widthA = parseInt(a[0], 10)
  const widthB = parseInt(b[0], 10)
  return widthB - widthA
}

/**
 * Extracts the base name from a filename.
 * Splits the filename by '.', removes extensions, resolutions, and codecs, and returns the remaining base name.
 * @param filename - The filename to extract the base name from.
 * @returns The base name of the file.
 */
export const getBaseName = (parsed: ParsedPath): string => {
  const splitIt = (p: string) => {
    return p.split("/").pop()
  }
  const { name, dir, ext } = parsed
  if (ext !== "" && ext !== undefined) {
    if (dir.includes("poster")) {
      return splitIt(path.parse(dir).dir)
    } else {
      return splitIt(dir)
    }
  } else if (name === "poster") {
    return splitIt(dir)
  } else {
    return name
  }
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
 * @returns {string} new hash for the file
 * @description Generates an MD5 hash for a file
 */
export async function getmd5Hash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, "utf8")
  return crypto.createHash("md5").update(content).digest("hex").slice(0, 8)
}

/**
 * Deconstructs a file path string into a HeroFile object.
 * Parses the path to extract information such as filename, extension, width, codec, and hash, and returns a structured HeroFile object.
 * @param pathStr - The file path string to deconstruct.
 * @returns A Promise that resolves to a HeroFile object containing the extracted information.
 */
export async function deconstructPath(pathStr: string): Promise<HeroFile> {
  const { base, ext, dir, name, root } = path.parse(pathStr)
  const baseName = getBaseName({ base, dir, ext, name, root })
  const width = parseInt(new RegExp(resPattern).exec(base)[0], 10) as VideoWidth
  const hash = name.match(hashPattern) ? name.match(hashPattern)[0] : await getmd5Hash(pathStr)
  const type = videoExtensions.includes(ext.slice(1)) ? "video" : "image"
  const codec = type === "video" ? videoCodecs.find((c) => base.includes(c)) : undefined
  const parentPath = srcToDocs(dir)
  validatePathInput(base, ext)
  return {
    baseName,
    extension: ext.slice(1) as MediaFileExtension,
    hash,
    width,
    srcPath: pathStr,
    type,
    ...(codec && { codec }), // omits codec if type is "image"
    parentPath,
    get destPath(): string {
      const assembled =
        this.type === "video" ?
          `${this.baseName}_${this.codec}_${this.width}.${this.hash}.${this.extension}`
        : `${this.baseName}_${this.width}.${this.hash}.${this.extension}`
      return `${srcToDocs(this.parentPath)}/${assembled}`
    },
    get parsed(): path.ParsedPath {
      return path.parse(this.destPath)
    },
    get filename() {
      return this.parsed.base
    },
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
    file.codec ? videos.push(file) : images.push(file)
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
    Object.entries(paths)
      .sort(sortWidths)
      .map(async ([width, src]) => {
        return `${src.replace("src/", "").replace("docs/", "")} ${width}w`
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
  const parsed = path.parse(fullPath)
  const fileName = parsed.name
  const hash = fileName.match(hashPattern)
  return hash ? hash[0] : ""
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
 * @param {string} dir - the string to convert
 * @returns {string} the title-cased string
 */
export async function makeDir(dir: string): Promise<void> {
  if (
    !(await fs
      .stat(dir)
      .then(() => true)
      .catch(() => false))
  ) {
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
  if (!(await fileExists(dest))) {
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
  image: ImageIndex,
  className: string = "hero__poster",
): string => {
  console.log("Generating picture element")
  const { avif, webp, png } = image
  const sortedImages = { avif, webp, png }
  const sources = Object.entries(sortedImages)
    .filter(([ext, _]) => ext !== "png")
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
  const img = `<img src="${png.widths[1280]}" class="${className}--image" draggable="false", fetchpriority="high", loading="eager", sizes="${sizes}", srcset="${png.srcset}">`

  return `<picture class="nojs ${className}" role="presentation">${sources}\n${img}</picture>`
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
export async function constructPoster(posterImages: HeroFile[]): Promise<ImageIndex> {
  let imageIndex: ImageIndex = { ...basePosterObj }
  posterImages.forEach(async (imageFile) => {
    const { destPath, srcPath, width, extension } = imageFile
    await copyFile(srcPath, destPath)
    const destPathValue = destPath.replace("docs/", "")
    let { widths } = imageIndex[extension]
    widths[width] = destPathValue
    const widthValues = [...Object.entries(imageIndex[extension].widths)].sort(sortWidths)
    if (widthValues.every(([_, v]) => v !== "")) {
      const sortedWidths = Object.fromEntries(widthValues.map(([k, v]) => [parseInt(k, 10), v]))
      imageIndex[extension]["srcset"] = await generateSrcset(sortedWidths as HeroPaths)
      widths = sortedWidths
    }
    imageIndex[extension].widths = widths
  })

  return imageIndex
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
    const destPathValue = destPath.replace("docs/", "")
    variants[codec][width] = destPathValue
  })
  videoCodecs.forEach((codec) => {
    const codecVariants = variants[codec]
    const sorted = Array.from(Object.entries(codecVariants))
      .sort(sortWidths)
      .map(([k, v]) => [parseInt(k, 10), v])
    const sortedVariants = Object.fromEntries(sorted)
    variants[codec] = sortedVariants
  })
  return variants
}

/**
 * @description Removes hashed files in the src directory. This shouldn't happen, but
 * sometimes in dev, it does -- so this is a failsafe.
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
  const testPattern = new RegExp(`.+\\.${hashPattern}\\.(${extPat}|min\\`)
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
  const placeholders = await Promise.all(
    Object.entries(cssLocs).map(async ([key, value]) => {
      const entries = await Promise.all(
        Object.entries(value).map(async ([placehold, v]) => {
          const file = await resolveGlob(v, {
            onlyFiles: true,
            unique: true,
            expandDirectories: false,
          })
          const newloc = await getFileHash(file[0])
          return {
            [placehold]: newloc,
          }
        }),
      )
      return {
        [key]: Object.assign({}, ...entries),
      }
    }),
  )
  return Object.assign({}, ...(await Promise.all(placeholders)))
}

/**
 * Replaces placeholders in template files with their corresponding values.
 * Reads each template file, replaces placeholders with values from the provided map, and writes the updated content to a new file. Removes "_template" from the filename.
 * @param {PlaceholderMap} newContent A map of template file paths to placeholder names and their corresponding values.
 * @returns {Promise<void>}
 */
async function replacePlaceholders(newContent: PlaceholderMap): Promise<void> {
  const mapping = Object.fromEntries(
    Object.entries(newContent).filter(([k, _v]) => k.includes("bundle")),
  )
  for (const [file, placeholders] of Object.entries(mapping)) {
    try {
      const parsedPath = path.parse(file)
      const targetDir = parsedPath.dir
      await fs.mkdir(targetDir, { recursive: true })
      let content = await fs.readFile(file, "utf8")
      if (placeholders) {
        for (const [placeholder, value] of Object.entries(placeholders)) {
          const re = new RegExp(placeholder, "g")
          content = content.replace(re, value)
        }
      }
      const newFilename = parsedPath.base.replace(/^_/, "").replace(/_template/, "")
      const newPath = path.join(targetDir, newFilename)
      console.log(`Writing CSS bundle to ${newPath}`)
      await fs.writeFile(newPath, content, "utf8")
    } catch (err) {
      console.error(`Failed to process ${file}:`, err)
      throw err // Re-throw to handle in main build
    }
  }
}

export async function verifyBundleCreated(): Promise<void> {
  if (!(await fileExists(cssSrc))) {
    throw new Error("CSS bundle was not created")
  }
}

/**
 * Generates a map of placeholder names to their corresponding file names.
 * Retrieves CSS files, calculates their hashes, and creates a map of placeholders to the new filenames.
 */
export async function generatePlaceholderMap(): Promise<void> {
  const cssHashMap = await Promise.resolve(resolveCssFiles())
  //const fontHashMap = await resolveFontFiles()
  const newContent = cssHashMap
  await replacePlaceholders(newContent)
}

// Write the file to the output ts file
const tsFileOutputPath = path.join(
  "src",
  "assets",
  "javascripts",
  "features",
  "hero",
  "video",
  "data.ts",
)

/**
 * Exports the hero videos to a TypeScript file
 */
export async function exportVideosToTS(videos: HeroVideo[], noScriptImage: ImageIndex) {
  const fileContent = tsTemplate(videos, noScriptImage)

  if (!(await fileExists(tsFileOutputPath))) {
    await fs.mkdir(path.dirname(tsFileOutputPath), { recursive: true })
  }
  await fs.writeFile(tsFileOutputPath, fileContent, "utf8")

  const runLint = async () => {
    // Run ESLint on the generated file to strip the quotes from keys
    try {
      exec(`bunx --bun eslint --cache --fix ${tsFileOutputPath}`, (error, stdout, stderr) => {
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
    } catch (err) {
      console.error(err)
      return
    }
  }
  await runLint()
}
