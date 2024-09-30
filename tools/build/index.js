import * as crypto from "crypto";
import * as esbuild from "esbuild";
import * as fs from 'fs/promises';
import { globby } from "globby";
import * as path from 'path';
import { from } from "rxjs";
import { optimize } from "svgo";
import { GHActions, baseProject, heroParents, nodeConfig, webConfig } from "./config/index.js";
const cssSrc = "src/stylesheets/bundle.css";
;
async function getFileHash(fullPath) {
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
function minsvg(data) {
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
async function getmd5Hash(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
    const parts = filePath.split('.');
    const ext = parts.pop();
    return parts.join('.') + '.' + hash + '.' + ext;
}
async function handleHeroImages() {
    const parents = await heroParents;
    for (const parent of parents) {
        const parentName = parent.split('/').pop();
        const filePattern = `${parentName}_{1280,1920,2560,3840}.avif`;
        const children = await globby(`${parent}/*.avif`, { cwd: './PlainLicense', onlyFiles: true });
        const heroImages = { [parent]: children };
        const hashedFileNames = await Promise.all(heroImages[parent].map(async (image) => {
            const hashedName = await getmd5Hash(image);
            return [image, hashedName.replace('src/', 'docs/assets/')];
        })).then(entries => Object.fromEntries(entries)); // Convert array of entries to an object
        for (const [src, dest] of Object.entries(hashedFileNames)) {
            if (src && dest && !(await fs.stat(dest).catch(() => false))) { // Check if the file doesn't exist
                await fs.cp(src, dest);
            }
        }
    }
}
/**
 * main esbuild build function
 * @function
 * @param project - the project to build
 * @returns an observable
 */
async function build(project) {
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
                await metaOutputMap(output);
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
    const parents = await heroParents;
    const dirs = ['docs/assets/stylesheets', 'docs/assets/javascripts', 'docs/assets/images', 'docs/assets/fonts', ...(parents)];
    for (const dir of dirs) {
        for (const file of await fs.readdir(dir)) {
            if (!dir.includes('javascripts') && !file.match(/tablesort\.js|feedback\.js|pixel\.js/)) {
                const filePath = path.join(dir, file);
                if (!(await fs.lstat(filePath)).isDirectory()) {
                    try {
                        await fs.rm(filePath);
                    }
                    catch (err) {
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
async function transformSvg() {
    const svgFiles = await globby('src/images/*.svg', { onlyFiles: true });
    for (const file of svgFiles) {
        const content = await fs.readFile(file, 'utf8');
        const minified = minsvg(content);
        await fs.writeFile(file, minified);
    }
}
/**
 *  gets the file hashes for Material for MKDocs palette and main CSS files
 * @function
 * @returns the file hashes for palette and main CSS files
 */
async function getFileHashes() {
    const fastGlobSettings = { onlyFiles: true };
    const paletteCSS = await globby('external/mkdocs-material/material/templates/assets/stylesheets/palette.*.min.css', fastGlobSettings);
    const mainCSS = await globby('external/mkdocs-material/material/templates/assets/stylesheets/main.*.min.css', fastGlobSettings);
    const paletteHash = await getFileHash(paletteCSS[0]);
    const mainHash = await getFileHash(mainCSS[0]);
    return { palette: paletteHash || '', main: mainHash || '' };
}
/**
 * Replaces placeholders in bundle.css with file hashes for Material for MKDocs palette and main CSS files
 * @function
 */
async function replacePlaceholders() {
    const { palette, main } = await getFileHashes();
    if (!palette || !main) {
        return;
    }
    try {
        let bundleCssContent = await fs.readFile('src/stylesheets/_bundle_template.css', 'utf8');
        bundleCssContent = bundleCssContent.replace('{{ palette-hash }}', palette).replace("{{ main-hash }}", main);
        await fs.writeFile(cssSrc, bundleCssContent);
    }
    catch (error) {
        console.error('Error replacing placeholders:', error);
    }
}
/**
 * builds all projects, main pipeline function
 */
async function buildAll() {
    const handleSubscription = async (project) => {
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
    }
    catch (error) {
        console.error('Error building base project:', error);
    }
    await handleHeroImages();
}
/**
 * Get the 'outputs' section of the esbuild metafile
 * @function
 * @param result - the esbuild build result
 * @returns the 'outputs' section of the esbuild metafile
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
 * Create a mapping of original file names to hashed file names
 * @function
 * @param output - the metaOutput object
 */
const metaOutputMap = async (output) => {
    const keys = Object.keys(output);
    const jsSrcKey = keys.find((key) => key.endsWith('.js'));
    const cssSrcKey = keys.find((key) => key.endsWith('.css'));
    const mapping = Object.fromEntries(Object.entries(output).map(([key, value]) => {
        if (key.endsWith(".map")) {
            return; // Skip map files
        }
        if (key === (jsSrcKey)) {
            return ['SCRIPTBUNDLE', key.replace('docs/', '')];
        }
        if (key === (cssSrcKey)) {
            return ["CSSBUNDLE", key.replace('docs/', '')];
        }
        return [key, (value).entryPoint?.replace('docs/', '') || key];
    }).filter(entry => entry !== undefined) // Filter out undefined entries
    );
    const outputMetaPath = path.join('overrides', 'buildmeta.json');
    await fs.writeFile(outputMetaPath, JSON.stringify(mapping, null, 2));
    return mapping; // Return the mapping object
};
/**
 * Write the meta.json file
 * @function
 * @param metaOutput - the metafile outputs
 */
const writeMeta = async (metaOutput) => {
    const metaJson = JSON.stringify({ metaOutput }, null, 2);
    await fs.writeFile(path.join('docs', 'meta.json'), metaJson);
};
buildAll().then(() => console.log('Build completed')).catch((error) => console.error('Error building:', error));
try {
    fs.rm(cssSrc).then(() => console.log('Temporary bundle.css removed')).catch((err) => console.error(`Error removing temporary bundle.css: ${err}`));
}
catch (err) {
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
//# sourceMappingURL=index.js.map