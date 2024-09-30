import { globby } from "globby"
import { logger } from "~/log"

export interface HeroImage {
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

export interface WidthMap {
  [key: string]: string
  [key: number]: string
}

/**
 * Resolves a glob to a single file.
 * @function
 * @param glob - The glob to resolve.
 * @returns A promise that resolves to the first file that matches the glob.
 */
async function resolveGlob(glob: string, fastGlobOptions?: {}): Promise<string[]> {
  try {
    const result = await globby(glob, fastGlobOptions)
    if (result.length === 0) {
      throw new Error(`Glob "${glob}" did not match any files`)
    } else {
      return result
    }
  } catch (error) {
    logger.error("Error resolving glob:", error)
    throw error
  }
}

/**
 * Generates the Srcset for a given image.
 * @function
 * @param image - The image to generate the Srcset for.
 * @returns A promise that resolves to the Srcset for the image.
 */
async function generateSrcset(image: HeroImageBase): Promise<string> {
  const entries = await Promise.all(
    Object.entries(image.widths).map(async ([width, src]) => {
      return `${await resolveGlob(src, { onlyFiles: true})} ${width}w`
    })
  )
  return entries.join(", ")
}

const parents = await resolveGlob("src/images/hero/*", { onlyDirectories: true })

export const heroImages: { [key: string]: HeroImage } = Object.fromEntries(
  await Promise.all(
    parents.map(async (parent: string) => {
      const key = parent.split("/").pop()
      const children = await resolveGlob(`${parent}/${key}_*.*.avif`, { onlyFiles: true, cwd: "./PlainLicense/docs" })

      const flattenedWidths: WidthMap = children.reduce<WidthMap>((acc, child) => {
        const width: number | undefined = [1280, 1920, 2560, 3840].find((w: number) => child.includes(w.toString()))
        if (width) {
          acc[width] = child // Now TypeScript knows acc is of type WidthMap
        }
        return acc
      }, {} as WidthMap) // Initialize acc as an empty WidthMap

      const srcset = await generateSrcset({ parent, widths: flattenedWidths })
      return [key, { parent, widths: flattenedWidths, srcset }]
    })
  )
)
