import { exec } from 'child_process';
import * as crypto from "crypto";
import * as esbuild from "esbuild";
import * as fs from 'fs/promises';
import * as path from 'path';
import { from, Observable } from "rxjs";
import { optimize } from "svgo";
import { baseProject, heroImages, heroParents, webConfig } from "./config/index.js";
import { buildJson, esbuildOutputs, FileHashes, HeroImage, Project } from "./types.ts";

import globby from 'globby';

const cssSrc = "src/assets/stylesheets/bundle.css";

// TODO: Refactor to use esbuild's transform API and reduce the number of file reads and writes

let noScriptImage: HeroImage = {
  imageName: '',
  parent: '',
  widths: {},
  srcset: '',
}

/**
 * Strips a file hash from a full path to a file.
 * Handles the format: filename.hash.ext or filename.hash.min.ext
 * @param fullPath - the full path to the file
 * @returns the file hash
 */

/**
 * Strips a file hash from a full path to a file.
 * @param fullPath - the full path to the file
 * @returns the file hash
 */
async function getFileHash(fullPath: string): Promise<string> {
  if (!fullPath || typeof fullPath !== 'string' || !fullPath.includes('.')) {
    return '';
  }

  const parts = fullPath.split('/');
  const fileName = parts[parts.length - 1];
  const fileNameParts = fileName.split('.');

  if (fileNameParts.length < 3) {
    return '';
  }

  return fileNameParts[fileNameParts.length - 2] === 'min'
    ? fileNameParts[fileNameParts.length - 3]
    : fileNameParts[fileNameParts.length - 2];
}

/**
 * minifies an SVG file
 * @param data - SVG data
 * @returns the minified SVG data
 */
function minsvg(data: string): string {
  if (!data.startsWith("<")) {
    return data;
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
  });

  return result.data;
}

/**
 * Generates an MD5 hash for a file and appends it to the file name
 * @param filePath - the path to the file
 * @returns new filename with the hash appended
 */
async function getmd5Hash(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8');
  const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
  const parts = filePath.split('.');
  const ext = parts.pop();
  return parts.join('.') + '.' + hash + '.' + ext;
}

/**
 * Exports the processed hero images to a TypeScript file
 * @param images - the processed hero images
 */
async function exportImagesToTS(images: HeroImage[]) {
  const fileContent = `
// This file is auto-generated by the build script.
export interface HeroImage {
  imageName: string
  parent: string
  widths: {
    [key: number]: string
  }
  srcset: string
  src?: string
}

/**
 * Replaces the 'docs' part of the path with the current location's protocol and host
 * @param src - the source path
 * @returns the updated path
 */
function replaceDocs(src: string): string {
  const protocol = location.protocol === 'http:' ? 'http:' : 'https:'
  const { host } = location
  return src.replace(/docs/g, \`\${protocol}//\${host}\`)
}

const rawHeroImages: HeroImage[] = ${JSON.stringify(images, null, 2)} as const

export const heroImages = rawHeroImages.map(image => ({
  imageName: image.imageName,
  src: image.src ? replaceDocs(image.src) : undefined,
  widths: Object.fromEntries(Object.entries(image.widths).map(([key, value]) => [key, replaceDocs(value)])),
  srcset: replaceDocs(image.srcset),
  parent: replaceDocs(image.parent)
}))
`;

  const outputPath = path.join('src', 'assets', 'javascripts', 'hero', 'imageshuffle', 'data', 'index.ts');

  const runLint = async () => {
    await fs.writeFile(outputPath, fileContent);
    console.log('Hero images data exported to heroImages.ts');

    // Run ESLint on the generated file to strip the quotes from keys
    exec('eslint --cache src/assets/javascripts/hero/imageshuffle/data/index.ts --fix', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running ESLint: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`ESLint stderr: ${stderr}`);
        return;
      }
      console.log(`ESLint stdout: ${stdout}`);
    });
  }
  await runLint();
}
/**
 * Processes the hero images for the landing page. Facilitates hashing, copying, updating paths, and sending them to get written to a typescript file.
 */
async function handleHeroImages() {
  const images: HeroImage[] = [];
  const heroes = await heroImages();
  if (!heroes?.srcset) {
    throw new Error('Srcset not found in hero images');
  }
  for (const [parentName, image] of Object.entries<HeroImage>(heroes)) {
    // Update the parent path
    const imageName = parentName
    const parent = image.parent.replace('src', 'docs');
    if (!(await fs.access(parent).catch(() => false))) {
      await fs.mkdir(parent, { recursive: true });
    }
    const newWidths: { [key: number]: string } = {};
    // Process each width
    let newSrcSet: string[] = []
    for (const [width, src] of Object.entries(image.widths)) {
      const newPath = (await getmd5Hash(src)).replace('src', 'docs');
      newWidths[Number(width)] = newPath;
      newSrcSet.push(`${newPath} ${width}w`);
      await fs.copyFile(src, newPath);
    }
    const srcset = newSrcSet.join(', ');
    images.push({ imageName, parent, widths: newWidths, srcset });
    }
    noScriptImage = images.find((image) => image.parent.includes('minimal')) || images.find((image) => image.widths[1280].includes('minimal')) || images[8];
    // Export the images array to a TypeScript file
    await exportImagesToTS(images);
  }
/**
 * main esbuild build function
 * @param project - the project to build
 * @returns an observable
 */
async function build(project: Project): Promise<Observable<unknown>> {
  console.log(`Building ${project.platform}...`);
  const config = webConfig;
  const buildPromise = esbuild.build({
    ...config,
    ...project
  }).then(async (result) => {
    if (result && result.metafile) {
      const output = await metaOutput(result);
      if (output) {
        await writeMeta(output);
        await metaOutputMap(output);
      }
    }
  });

  return from(buildPromise);
}

/**
 * removes hashed files in the src directory
 */
async function removeHashedFilesInSrc() {
  const hashedFiles = await globby('src/**/*.{js,css,avif}', { onlyFiles: true, unique: true });
  const hashRegex = new RegExp(/^.+(\.[a-fA-F0-9]{8})\.(avif|js|css)/)
  for (const file of hashedFiles) {
    if (hashRegex.test(file)) {
      try {
        await fs.rm(file);
      } catch (err) {
        console.error(err);
      }
    }
  }
}

/**
 * clears assets directories of all files except for tablesort.js, feedback.js, and pixel.js
 */
async function clearDirs() {
  const parents = await heroParents;
  await removeHashedFilesInSrc();
  const destParents = parents.map((parent) => parent.replace('src/assets/', 'docs/assets/'));
  const dirs = ['docs/assets/stylesheets', 'docs/assets/javascripts', 'docs/assets/images', 'docs/assets/fonts', ...(destParents)];
  for (const dir of dirs) {
    if (!((await fs.stat(dir).catch(() => false)))) {
      continue;
    }
    for (const file of (await fs.readdir(dir))) {
      const filePath = path.join(dir, file);
      if ((await fs.stat(filePath)).isFile()) {
        try {
          await fs.rm(filePath);
        } catch (err) {
          console.error(err);
        }
      }
    }
    }
  }

/**
 * transforms SVG files in src/assets/images directory
 */
async function transformSvg(): Promise<void> {
  const svgFiles = await globby('src/assets/images/*.svg', { onlyFiles: true, unique: true });
  for (const file of svgFiles) {
    const content = await fs.readFile(file, 'utf8');
    const minified = minsvg(content);
    await fs.writeFile(file, minified);
  }
}

/**
 *  gets the file hashes for Material for MKDocs palette and main CSS files
 * @returns the file hashes for palette and main CSS files
 */
async function getFileHashes(): Promise<FileHashes> {
  const fastGlobSettings = { onlyFiles: true, unique: true };
  const paletteCSS = await globby('external/mkdocs-material/material/templates/assets/stylesheets/palette.*.min.css', fastGlobSettings);
  const mainCSS = await globby('external/mkdocs-material/material/templates/assets/stylesheets/main.*.min.css', fastGlobSettings);
  const paletteHash = await getFileHash(paletteCSS[0]);
  const mainHash = await getFileHash(mainCSS[0]);
  return { palette: paletteHash || '', main: mainHash || '' };
}

/**
 * Replaces placeholders in bundle.css with file hashes for Material for MKDocs palette and main CSS files
 */
async function replacePlaceholders(): Promise<void> {
  const { palette, main } = await getFileHashes();
  if (!palette || !main) {
    throw new Error('Palette or main CSS file hash not found');
  }
  try {
    if (await fs.access(cssSrc).catch(() => false)) {
      const cssContent = await fs.readFile(cssSrc, 'utf8');
      if (cssContent.includes(palette) && cssContent.includes(main)) {
        return;
      }
    }
    let bundleCssContent = await fs.readFile('src/assets/stylesheets/_bundle_template.css', 'utf8');
    bundleCssContent = bundleCssContent.replace('{{ palette-hash }}', palette).replace("{{ main-hash }}", main);
    await fs.writeFile(cssSrc, bundleCssContent);
  } catch (error) {
    console.error('Error replacing CSS placeholders:', error);
  }
}

/**
 * builds all projects, main pipeline function
 */
async function buildAll() {
  const handleSubscription = async (project: any) => {
    (await build(project)).subscribe({
      next: () => console.log(`Build for ${project.platform} completed successfully`),
      error: (error) => console.error(`Error building ${project.platform}:`, error),
      complete: () => console.log(`Build for ${project.platform} completed`)
    });
  };

  await clearDirs();
  console.log('Directories cleared');
  await handleHeroImages();
  await transformSvg();
  await replacePlaceholders();
  try {
    await handleSubscription(baseProject);
  } catch (error) {
    console.error('Error building base project:', error);
  }
}

/**
 * Get the 'outputs' section of the esbuild metafile
 * @param result - the esbuild build result
 * @returns the 'outputs' section of the esbuild metafile
 */
const metaOutput = async (result: esbuild.BuildResult) => {
  if (!result.metafile) {
    return {};
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
  );
}

/**
 * Create a mapping of original file names to hashed file names
 * @param output - the metaOutput object
 */
const metaOutputMap = async (output: esbuildOutputs): Promise<buildJson> => {
  const keys = Object.keys(output);
  const jsSrcKey = keys.find((key) => key.endsWith('.js'));
  const cssSrcKey = keys.find((key) => key.endsWith('.css') && key.includes("bundle") && !key.includes("javascripts"));
  let noScriptImageContent =`
  <img srcset="${noScriptImage.srcset}" alt="hero image" class="hero-parallax__image hero-parallax__image--minimal" src="${noScriptImage.widths[1280]}" alt="hero image"
  sizes="(max-width: 1280px) 1280px, (max-width: 1920px) 1920px, (max-width: 2560px) 2560px, 3840px" loading="eager" fetchpriority="high" draggable="false"
  style="align-content:flex-start;align-self:flex-start">
  `;

  const mapping = {
    noScriptImage: noScriptImageContent,
    SCRIPTBUNDLE: jsSrcKey?.replace('docs/', '') || '',
    CSSBUNDLE: cssSrcKey?.replace('docs/', '') || '',
  }
  const outputMetaPath = path.join('overrides', 'buildmeta.json');
  await fs.writeFile(outputMetaPath, JSON.stringify(mapping, null, 2));

  return mapping; // Return the mapping object
}

/**
 * Write the meta.json file
 * @param metaOutput - the metafile outputs
 */
const writeMeta = async (metaOutput: {}) => {
  const metaJson = JSON.stringify({ metaOutput }, null, 2);
  await fs.writeFile(path.join('docs', 'meta.json'), metaJson);
}

buildAll().then(() => console.log('Build completed')).catch((error) => console.error('Error building:', error));

try {
      fs.rm(cssSrc).then(() => console.log('Temporary bundle.css removed')).catch((err) => console.error(`Error removing temporary bundle.css: ${err}`));
    } catch (err) {
      console.error(`Error removing temporary bundle.css: ${err}`);
    }


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
