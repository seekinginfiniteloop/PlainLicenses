"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const esbuild = __importStar(require("esbuild"));
const fs = __importStar(require("fs"));
const glob = __importStar(require("glob"));
const path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
const svgo_1 = require("svgo");
const util_1 = require("util");
//import { SourceMapConsumer } from 'source-map';
const config_1 = require("./config");
//import * as prettier from 'prettier';
const readFilePromise = (0, util_1.promisify)(fs.readFile);
const writeFilePromise = (0, util_1.promisify)(fs.writeFile);
const copyFilePromise = (0, util_1.promisify)(fs.copyFile);
const mkdirPromise = (0, util_1.promisify)(fs.mkdir);
// Ensure that directories exist
async function ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
        await mkdirPromise(dir, { recursive: true });
    }
}
let copiedFiles = [];
/** ~~ from Martin Donath, (c) 2016-2023 Martin Donath ~~
 *  ~~ subject to the MIT license: https://github.com/squidfunk/mkdocs-material/blob/master/LICENSE
 * Minify SVG data
 * @param data: string
 * @returns optimized SVG string
 */
function minsvg(data) {
    if (!data.startsWith("<")) {
        return data;
    }
    /* Optimize SVG */
    const result = (0, svgo_1.optimize)(data, {
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
    /* Return minified SVG */
    return result.data;
}
/**
async function rebuildSource(lines: string[], consumer: SourceMapConsumer): Promise<{ source: string, content: string }[]> {
  const assembledCode: { source: string, content: string }[] = [];
  const rebuiltSource: { [key: string]: string[] } = {}

  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;
    const segments = line.split(';');

    segments.forEach((segment, segmentIndex) => {
      const column = segment.length;
      const pos = {line: lineNum, column: column};
      const originalPosition = consumer.originalPositionFor(pos);

      if (originalPosition.source === null || originalPosition.name === null) {
        return;
      }

      rebuiltSource[originalPosition.source] = originalPosition.source ? [originalPosition.source] : [];

      // Replace the obfuscated name with the original name
      segments[segmentIndex] = segment.replace(/[_$][\w\d]+/g, originalPosition.name);
    });

    lines[lineIndex] = segments.join(';');
  });

  for (const source in rebuiltSource) {
    let prettyCode = lines.join('\n');

    const formattedCode = prettier.format(prettyCode, { parser: 'babel' });

    console.log(`Source: ${source}`);
    console.log('Content:', formattedCode);
    assembledCode.push({ source, content: await formattedCode });
  }
  return assembledCode
}

async function reconstructSourceMap(sourceMap: string, sourceMapFile: string) {
  const sourceMapData = await readFilePromise(sourceMap, 'utf8');
  const sourceMapObject = JSON.parse(sourceMapData);
  const consumer = await new SourceMapConsumer(sourceMapObject);
  const lines = sourceMapFile.split("\n");
  const rebuiltSource = await rebuildSource(lines, consumer);
  console.log(rebuiltSource);

  await writeFilePromise(sourceMapFile, JSON.stringify(sourceMapData, null, 2));
}
 */
/**
 * Parses filepath to remove hash and 'min' from filename
 * @param filePath - path to file
 * @param fileExtension - file extension
 * @returns

async function parseFiles(filePath: string, fileExtension: 'css' | 'js') {
// Remove hash and 'min' from filename
    const parsedPath = path.parse(filePath);
    return parsedPath.base
          .replace(new RegExp(`\\.(\\w+)\\.min\\.${fileExtension}$`), `.${fileExtension}`)
          .replace(new RegExp(`\\.min\\.${fileExtension}$`), `.${fileExtension}`)
          .replace(new RegExp(`\\.(\\w+)\\.${fileExtension}$`), `.${fileExtension}`);
}

let copiedFiles: string[] = [];
 */
/**
 * Creates virtual files for mkdocs-material compiled CSS and JS files to incorporate them into the build process
 * @param key - key of GlobbedPaths
 * @param targetDir - target directory for virtual files
 * @param fileExtension - file extension
async function processMkDocsType(key: keyof GlobbedPaths, targetDir: string, fileExtension: 'css' | 'js') {
  await ensureDirExists(targetDir);

  for (const pattern of paths[key]) {
    if (pattern.includes('mkdocs-material')) {
      console.log(`Processing pattern: ${pattern}`); // Debugging statement
      try {
        const files: string[] = await glob.glob(pattern, { includeChildMatches: true }) as string[];
        console.log(`Files found: ${files.length}`); // Debugging statement
        if (files.length === 0) {
          console.warn(`No files found for pattern: ${pattern}`);
          continue;
        }

        for (const filePath of files) {
          const fileName = await parseFiles(filePath, fileExtension);
          const newFile = path.join(targetDir, fileName);
          const mapFile = `${newFile}.map`;
          await copyFilePromise(filePath, newFile)
          await copyFilePromise(filePath, mapFile)
          console.log(`Copied ${filePath} to ${newFile}`); // Debugging statement
          fs.stat(newFile, (err, stats) => { if (err) { console.error(err); } else { console.info(stats) } });
          copiedFiles.push(newFile);
          copiedFiles.push(mapFile);
          entryPaths.push(newFile);
          //reconstructSourceMap(filePath, path.join(targetDir, fileName, '.map'));
        }

      } catch (error) {
        console.error(`Error processing pattern ${pattern}:`, error); // Error handling
      }
    } else {
      entryPaths.push(pattern);
    }
  }
}
 */
/**
 * Copies all supporting files and subdirectories from mkdocs-material to the build directory
 * @function
 * @param sourceDir - source directory
 * @param targetDir - target directory
 */
async function copyMkDocsFiles(sourceDir, targetDir) {
    await ensureDirExists(targetDir);
    const files = fs.readdirSync(sourceDir);
    for (const file of files) {
        const source = path.join(sourceDir, file);
        const target = path.join(targetDir, file);
        if (!copiedFiles.includes(target)) {
            if (fs.lstatSync(source).isDirectory()) {
                const newDir = path.join(targetDir, file);
                if (!fs.existsSync(newDir)) {
                    await mkdirPromise(newDir);
                }
                await copyMkDocsFiles(newDir, path.join(targetDir, file));
            }
            else {
                await copyFilePromise(source, target);
                copiedFiles.push(target);
            }
        }
    }
}
/**
 * Processes all mkdocs-material CSS and JS files
 */
async function processAllMkDocs() {
    const sourceDirs = ['external/mkdocs-material/src/templates/assets/stylesheets', 'external/mkdocs-material/src/templates/assets/javascripts'];
    // copy all files, subdirectories into equivalent /src directories
    for (const sourceDir of sourceDirs) {
        await copyMkDocsFiles(sourceDir, path.join('src', sourceDir.split('/').pop()));
    }
}
/**
 * main build function for esbuild
 * @param project - the project to build
 * @returns - an observable that emits when the build is complete
 */
async function build(project) {
    console.log(`Building ${project.platform}...`);
    console.log(`current working directory: ${process.cwd()}`);
    const config = project.platform === "node" ? config_1.nodeConfig : config_1.webConfig;
    const buildPromise = esbuild.build({
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
    });
    return (0, rxjs_1.from)(buildPromise);
}
/**
 * Clears directories of files that are not needed; prevents stale files from being included in the build
 * @returns - a promise that resolves when the directories are cleared
 */
async function clearDirs() {
    const dirs = ['docs/assets/stylesheets', 'docs/assets/javascripts', 'docs/assets/fonts', 'docs/assets/images'];
    for (const dir of dirs) {
        for (const file of fs.readdirSync(dir)) {
            if (!dir.includes('javascripts') && !file.match(/tablesort\.js|feedback\.js|pixel\.js/)) {
                const filePath = path.join(dir, file);
                if (!fs.lstatSync(filePath).isDirectory()) {
                    fs.rm(filePath, (err) => { console.error(err); });
                }
            }
        }
    }
}
/**
 * Transforms SVG files to minified SVG
 * @returns - a promise that resolves when all SVG files are minified
 */
async function transformSvg() {
    const svgFiles = await glob.glob('src/images/*.svg', { includeChildMatches: true });
    for (const file of svgFiles) {
        const content = await readFilePromise(file, 'utf8');
        const minified = minsvg(content);
        await writeFilePromise(file, minified);
    }
}
/**
 * Builds all projects
 * @returns - a promise that resolves when all projects are built
 * @throws - an error if any project fails to build
 */
async function buildAll() {
    try {
        await processAllMkDocs();
    }
    catch (error) {
        console.error('Error processing files:', error);
    }
    const handleSubscription = async (project) => {
        (await build(project)).subscribe({
            next: () => console.log(`Build for ${project.platform} completed successfully`),
            error: (error) => console.error(`Error building ${project.platform}:`, error),
            complete: () => console.log(`Build for ${project.platform} completed`)
        });
    };
    for (const project of config_1.GHActions) {
        await handleSubscription(project);
    }
    await clearDirs();
    await transformSvg();
    //let updatedProject = baseProject;
    //updatedProject.entryPoints = entryPaths;
    try {
        await handleSubscription(config_1.baseProject);
    }
    catch (error) {
        console.error('Error building base project:', error);
    }
}
/**
 * Separates the metafile output from the esbuild result
 * @param result
 * @returns
 */
const metaOutput = async (result) => {
    if (!result.metafile) {
        return {};
    }
    return Object.fromEntries(Object.entries(result.metafile.outputs).map(([key, output]) => [
        key,
        {
            bytes: output.bytes,
            inputs: Object.keys(output.inputs),
            exports: output.exports,
            entryPoint: output.entryPoint,
        },
    ]));
};
/**
 * Creates a mapping of the bundle files to their output paths
 * @param mapping - mapping of original file names to their output paths
 */
async function handleBundle(mapping) {
    const outputFile = mapping.keys().next().value;
    ;
    const relativePath = outputFile.replace('docs/', '');
    const extension = relativePath.split('.').pop();
    if (extension === 'css') {
        mapping.set('CSSBUNDLE', relativePath);
    }
    else if (extension === 'js') {
        mapping.set('SCRIPTBUNDLE', relativePath);
    }
}
/**
 * Creates a mapping of original file names to their output paths
 * @param result - esbuild build result
 */
const metaOutputMap = async (result) => {
    const mapping = new Map();
    if (result && result.metafile) {
        for (const [key, output] of Object.entries(result.metafile.outputs)) {
            if (!output) {
                continue;
            }
            if (output.entryPoint?.endsWith(".css") || output.entryPoint?.endsWith(".js")) {
                handleBundle(mapping);
                continue;
            }
            const relativePath = path.relative('assets', key);
            const originalName = path.basename(output.entryPoint || Object.keys(output.inputs)[0]);
            mapping.set(originalName, relativePath);
        }
        const outputMetaPath = path.join('overrides', 'buildmeta.json');
        await writeFilePromise(outputMetaPath, JSON.stringify(mapping, null, 2));
    }
};
/**
 * Writes the metafile output to a JSON file
 * @param metaOutput - metafile output from esbuild
 */
const writeMeta = async (metaOutput) => {
    const metaJson = JSON.stringify({ metaOutput }, null, 2);
    await writeFilePromise(path.join('docs', 'meta.json'), metaJson);
};
/**
 * Creates a hash table from the meta output for lookups
 * @param metaOutput - metafile output from esbuild
 * @returns
 */
const hashTable = async (metaOutput) => {
    const table = new Map();
    for (const [key] of Object.entries(metaOutput)) {
        const parts = key.split('.');
        const baseFileName = parts.slice(0, -1).join('.');
        const hash = parts.pop();
        if (baseFileName && hash) {
            table.set(baseFileName, hash);
        }
    }
    return table;
};
// Execute the file processing
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
//# sourceMappingURL=index.js.map