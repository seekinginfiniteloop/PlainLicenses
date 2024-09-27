import * as esbuild from "esbuild";
import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { Observable, from } from "rxjs";
import { optimize } from "svgo";
import { promisify } from 'util';
import { GHActions, GlobbedPaths, MetaFileOutputs, Project, baseProject, nodeConfig, paths, webConfig } from "./config";

const globPromise = promisify(glob.glob);
const readFilePromise = promisify(fs.readFile);
const writeFilePromise = promisify(fs.writeFile);
const mkdirPromise = promisify(fs.mkdir);

// Ensure that directories exist
async function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) {
    await mkdirPromise(dir, { recursive: true });
  }
}

/** ~~ from Martin Donath, (c) 2016-2023 Martin Donath ~~
 *  ~~ subject to the MIT license: https://github.com/squidfunk/mkdocs-material/blob/master/LICENSE
 * Minify SVG data
 * @param data: string
 * @returns optimized SVG string
 */
function minsvg(data: string): string {
  if (!data.startsWith("<")) {
    return data
  }

  /* Optimize SVG */
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

  /* Return minified SVG */
  return result.data
}


async function parseFiles(filePath: string, fileExtension: 'css' | 'js') {
// Remove hash and 'min' from filename
    const parsedPath = path.parse(filePath);
    return parsedPath.base
          .replace(new RegExp(`\\.(\\w+)\\.min\\.${fileExtension}$`), `.${fileExtension}`)
          .replace(new RegExp(`\\.min\\.${fileExtension}$`), `.${fileExtension}`)
          .replace(new RegExp(`\\.(\\w+)\\.${fileExtension}$`), `.${fileExtension}`);
}

// Combined function to process files
async function processMkDocsType(key: keyof GlobbedPaths, targetDir: string, fileExtension: 'css' | 'js') {
  await ensureDirExists(targetDir);

  const updatedPaths: string[] = [];

  for (const pattern of paths[key]) {
    if (pattern.includes('mkdocs-material')) {
      const files: string[] = await globPromise(pattern, { includeChildMatches: true }) as string[];
      const virtualPaths: string[] = [];
      if (files && files.length === 0) {
        console.warn(`No files found for pattern: ${pattern}`);
        continue;
      }
      for (const filePath of files) {
        const fileName = await parseFiles(filePath, fileExtension);
        const virtualFilePath = path.join(targetDir, fileName);
        const content = await readFilePromise(filePath);
        await writeFilePromise(virtualFilePath, content);

        virtualPaths.push(virtualFilePath);
      }

      // Replace the original pattern with virtual paths
      updatedPaths.push(...virtualPaths);
    } else {
      updatedPaths.push(pattern);
    }
  }

  paths[key] = updatedPaths;
}

// Main function to process all files
async function processAllMkDocs() {
  await processMkDocsType('styleSheets', 'src/stylesheets', 'css');
  await processMkDocsType('scripts', 'src/javascripts', 'js');
  console.log('Updated paths:', paths);
}

async function build(project: Project): Promise<Observable<unknown>> {
  return from((new Promise(() => {
    const config = project.platform === "node" ? nodeConfig : webConfig;
    const result = esbuild.build({
      ...config,
      ...project
    }).then(async (result) => {
      if (result && result.metafile) {
        const output = await metaOutput(result);
        if (output) {
          await writeMeta(output);
          const table = await hashTable(output);
          await writeFilePromise(path.join('docs/assets/javascripts', 'hashTable.json'), JSON.stringify(table, null, 2));
          await metaOutputMap(result);
        }
      }
    })
  })))
}

async function clearDirs() {
  const dirs = ['docs/assets/stylesheets', 'docs/assets/javascripts', 'docs/assets/fonts', 'docs/assets/images'];
  for (const dir of dirs) {
    for (const file of fs.readdirSync(dir)) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

async function transformSvg(): Promise<void> {
  const svgFiles = await globPromise('src/images/*.svg', { includeChildMatches: true }) as string[];
  for (const file of svgFiles) {
    const content = await readFilePromise(file, 'utf8');
    const minified = minsvg(content);
    await writeFilePromise(file, minified);
  }
}

async function buildAll() {
  await processAllMkDocs().catch(error => {
  console.error('Error processing files:', error);
});
  GHActions.forEach(async (project) => {
    (await (await build(project)).subscribe({
      next: () => console.log(`Build for ${project.platform} completed successfully`),
      error: (error) => console.error(`Error building ${project.platform}:`, error),
      complete: () => console.log(`Build for ${project.platform} completed`)
    }));
  });
  await clearDirs();
  await transformSvg();
  (await build(baseProject)).subscribe({
    next: () => { console.log(`Build for ${baseProject.platform} completed successfully`);
        },
    error: (error) => console.error(`Error building ${baseProject.platform}:`, error),
    complete: () => console.log(`Build for ${baseProject.platform} completed`)
  });
}

const metaOutput = async (result: esbuild.BuildResult) => {
  if (!result.metafile) {
    return {};
  }
  Object.keys(result.metafile.outputs).reduce((acc: {}, key: string) => {
    const output = result.metafile?.outputs[key];
    acc[key] = {
      bytes: output?.bytes,
      inputs: output ? Object.keys(output.inputs) : [],
      exports: output?.exports,
      entryPoint: output?.entryPoint,
    };
    return acc;
  }, {})
}

async function handleBundle(output: MetaFileOutputs, mapping: {}): Promise<{}> {
  const outputFile = Object.keys(output)[0];
  const path = outputFile.replace('docs/', '');
  const extension = path.split('.').pop() ? ('.css' ? 'css' : 'js') : '';
  if (extension === 'css') {
    mapping['CSSBUNDLE'] = path;
  } else if (extension === 'js') {
    mapping['SCRIPTBUNDLE'] = path;
  }
  return mapping;
}

const metaOutputMap = async (result: esbuild.BuildResult) => {
  const mapping = {};
  if (result && result.metafile) {
    Object.keys(result.metafile.outputs).forEach(key => {
      const output = result?.metafile?.outputs[key];
      if (!output) {
        return;
      } else if (output?.entryPoint?.endsWith(".css") || output?.entryPoint?.endsWith(".js")) {

        return handleBundle(output, mapping);
      }
      const relativePath = path.relative('assets', key);
      const originalName = path.basename(output?.entryPoint || Object.keys(output.inputs)[0]);
      mapping[originalName] = relativePath;
    }
    )
    const outputMetaPath = path.join('overrides', 'buildmeta.json');
    await writeFilePromise(outputMetaPath, JSON.stringify(mapping, null, 2));
  }
}

const writeMeta = async (metaOutput: {}) => {
  const metaJson = JSON.stringify({ metaOutput }, null, 2);
  await writeFilePromise(path.join('docs', 'meta.json'), metaJson);
}

const hashTable = async (metaOutput: {}): Promise<{}> => {
  const table = {};
  Object.keys(metaOutput).forEach((key) => {
    const baseFileName = key.split('.').slice(0, -1).join('.');
    const hash = key.split('.').pop();
    table[baseFileName] = hash;
  })
  return table;
};

// Execute the file processing
await buildAll();


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
