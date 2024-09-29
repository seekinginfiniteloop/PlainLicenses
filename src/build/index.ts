import * as esbuild from "esbuild";
import * as fs from 'fs/promises';
import * as glob from 'glob';
import * as path from 'path';
import { Observable, from } from "rxjs";
import { optimize } from "svgo";
import { GHActions, Project, baseProject, nodeConfig, webConfig } from "./config";

/**
 * Strips a file hash from a full path to a file.
 * Handles the format: filename.hash.ext or filename.hash.min.ext
 * @function
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
 * @function
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
 * main esbuild build function
 * @function
 * @param project - the project to build
 * @returns an observable
 */
async function build(project: Project): Promise<Observable<unknown>> {
  console.log(`Building ${project.platform}...`);
  console.log(`current working directory: ${process.cwd()}`);
  const config = project.platform === "node" ? nodeConfig : webConfig;
  const buildPromise = esbuild.build({
    ...config,
    ...project
  }).then(async (result) => {
    if (result && result.metafile) {
      const output = await metaOutput(result);
      if (output) {
        await writeMeta(output);
        const table = await hashTable(output);
        await fs.writeFile(path.join('docs/assets/javascripts', 'hashTable.json'), table);
        await metaOutputMap(result);
      }
    }
  });

  return from(buildPromise);
}

/**
 * clears assets directories of all files except for tablesort.js, feedback.js, and pixel.js
 * @function
 */
async function clearDirs() {
  const dirs = ['docs/assets/stylesheets', 'docs/assets/javascripts'];
  for (const dir of dirs) {
    for (const file of await fs.readdir(dir)) {
      if (!dir.includes('javascripts') && !file.match(/tablesort\.js|feedback\.js|pixel\.js/)) {
        const filePath = path.join(dir, file);
        if (!(await fs.lstat(filePath)).isDirectory()) {
          try {
            await fs.rm(filePath);
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
  }
}

/**
 * transforms SVG files in src/images directory
 * @function
 */
async function transformSvg(): Promise<void> {
  const svgFiles = await glob.glob('src/images/*.svg', { includeChildMatches: true });
  for (const file of svgFiles) {
    const content = await fs.readFile(file, 'utf8');
    const minified = minsvg(content);
    await fs.writeFile(file, minified);
  }
}

interface FileHashes {
  palette: string;
  main: string;
}

/**
 *  gets the file hashes for Material for MKDocs palette and main CSS files
 * @function
 * @returns the file hashes for palette and main CSS files
 */
async function getFileHashes(): Promise<FileHashes> {
  const paletteCSS = await glob.glob('external/mkdocs-material/src/overrides/assets/stylesheets/palette.*.min.css', { includeChildMatches: true });
  const mainCSS = await glob.glob('external/mkdocs-material/src/overrides/assets/stylesheets/main.*.min.css', { includeChildMatches: true });
  const paletteHash = await getFileHash(paletteCSS[0]);
  const mainHash = await getFileHash(mainCSS[0]);
  return { palette: paletteHash || '', main: mainHash || '' };
}

/**
 * Replaces placeholders in bundle.css with file hashes for Material for MKDocs palette and main CSS files
 * @function
 */
async function replacePlaceholders(): Promise<void> {
  const { palette, main } = await getFileHashes();
  if (!palette || !main) {
    return;
  }
  try {
    let bundleCssContent = await fs.readFile('src/stylesheets/bundle.css', 'utf8');
    bundleCssContent = bundleCssContent.replace('{{ palette-hash }}', palette).replace("{{ main-hash }}", main);
    await fs.cp('src/stylesheets/bundle.css', 'src/stylesheets/bundle.css.bak');
    await fs.writeFile('src/stylesheets/bundle.css', bundleCssContent);
  } catch (error) {
    console.error('Error replacing placeholders:', error);
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

  for (const project of GHActions) {
    await handleSubscription(project);
  }

  await clearDirs();
  await transformSvg();
  await replacePlaceholders();
  try {
    await handleSubscription(baseProject);
  } catch (error) {
    console.error('Error building base project:', error);
  } finally {
    try {
      await fs.unlink('src/stylesheets/bundle.css');
      await fs.rename('src/stylesheets/bundle.css.bak', 'src/stylesheets/bundle.css');
    } catch (err) {
      console.error(`Error removing temporary bundle.css or renaming it: ${err}`);
    }
  }
}

/**
 * Get the 'outputs' section of the esbuild metafile
 * @function
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

const jsSrc = "src/javascripts/index.ts";
const cssSrc = "src/stylesheets/bundle.css";

/**
 * Create a mapping of original file names to hashed file names
 * @function
 * @param result - the esbuild build result
 */
const metaOutputMap = async (result: esbuild.BuildResult) => {
  const mapping: Map<string, string> = new Map();
  if (result && result.metafile) {
    for (const [key, output] of Object.entries(result.metafile.outputs)) {
      if (!output) {
        continue;
      }

      if ((output.entryPoint?.endsWith(".css") && output.entryPoint === cssSrc) || (output.entryPoint?.endsWith(".js") && output.entryPoint === jsSrc)) {
        const newKey = output.entryPoint?.endsWith(".css") ? "CSSBUNDLE" : "SCRIPTBUNDLE";
        mapping.set(newKey, await getFileHash(key));
        continue;
      }

      const relativePath = path.relative('assets', key);
      let originalName = path.basename(Object.keys(output.inputs)[0]);

      if (output.entryPoint) {
        originalName = path.basename(output.entryPoint || Object.keys(output.inputs)[0]);
      }
      mapping.set(originalName, relativePath);
    }

    const outputMetaPath = path.join('overrides', 'buildmeta.json');
    await fs.writeFile(outputMetaPath, JSON.stringify(mapping, null, 2));
  }
}

/**
 * Write the meta.json file
 * @function
 * @param metaOutput - the metafile outputs
 */
const writeMeta = async (metaOutput: {}) => {
  const metaJson = JSON.stringify({ metaOutput }, null, 2);
  await fs.writeFile(path.join('docs', 'meta.json'), metaJson);
}

/**
 * Create a table of file names (stem + extension) to their hashes
 * @function
 * @param metaOutput - the metafile outputs
 * @returns the hash table
 */
const hashTable = async (metaOutput: { [key: string]: any }): Promise<string> => {
  const outputFiles = Object.entries(metaOutput).map(([key, output]) => ({
    destination: key,
    origin: output.entryPoint || undefined,
  }));

  const table = new Map<string, string>();
  for (const { destination, origin } of outputFiles) {
    if (origin && (origin !== jsSrc && origin !== cssSrc)) {
      const baseFileName = origin.split('/').pop();
      const hash = await getFileHash(destination);
      if (baseFileName && hash) {
        table.set(baseFileName, hash);
      }
    }
  }
  // return minified JSON string
  return JSON.stringify(table, null).replace(/ /, '').replace(/\n/,'').replace(/\t/,'');
};

buildAll().then(() => console.log('Build completed')).catch((error) => console.error('Error building:', error));


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
