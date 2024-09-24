import { GlobbedPaths, paths, webConfig, nodeConfig, GHActions, Project, baseProject } from "./config";
import * as esbuild from "esbuild";
import { optimize } from "svgo"
import { Observable, from } from "rxjs";
import { promisify } from 'util';
import * as glob from 'glob';
import * as fs from 'fs';
import * as path from 'path';

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
 *  ~~ subject to the MIT license: https://github.com/squidfunk/mkdocs-material/LICENSE
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

function build(project: Project): Observable<void> {
  return from((async () => {
    const config = project.platform === "node" ? nodeConfig : webConfig;
    await esbuild.build({
      ...config,
      ...project
    });
  })());
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

async function filterFilePaths(filePaths: string[]) {
  const newFilePaths: string[] = [];
  filePaths.forEach((file: string) => {
    newFilePaths.push(file.replace('docs/', ''));
  })
}


  async function writeManifest(): Promise<void> {
    const manifestPath = 'docs/assets/manifest.json';
    const styleSheets = (await globPromise('docs/assets/stylesheets/*.css', { includeChildMatches: true }) as string[]);
    const scripts = await globPromise('docs/assets/javascripts/*.js', { includeChildMatches: true }) as string[];
    const fonts = await globPromise('docs/assets/fonts/*', { includeChildMatches: true }) as string[];
    const images = await globPromise('docs/assets/images/*', { includeChildMatches: true }) as string[];
    const manifest = {
      styleSheets: filterFilePaths(styleSheets),
      scripts: filterFilePaths(scripts),
      fonts: filterFilePaths(fonts),
      images: filterFilePaths(images)
    }
    const manifestJson = JSON.stringify(manifest, null, 2);
    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
    await writeFilePromise(manifestPath, manifestJson);
    console.log('Manifest written to:', manifestPath);
    }

async function buildAll() {
  await processAllMkDocs().catch(error => {
  console.error('Error processing files:', error);
});
  GHActions.forEach(async (project) => {
    build(project).subscribe({
      next: () => console.log(`Build for ${project.platform} completed successfully`),
      error: (error) => console.error(`Error building ${project.platform}:`, error),
      complete: () => console.log(`Build for ${project.platform} completed`)
    });
  });
  await clearDirs();
  await transformSvg();
  build(baseProject).subscribe({
    next: () => console.log(`Build for ${baseProject.platform} completed successfully`),
    error: (error) => console.error(`Error building ${baseProject.platform}:`, error),
    complete: () => console.log(`Build for ${baseProject.platform} completed`)
  });
  await writeManifest();
}
// Execute the file processing
await buildAll();
