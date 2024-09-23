import { GlobbedPaths, paths, webConfig, nodeConfig, GHActions, Project } from "./config";
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

// Execute the file processing
processAllMkDocs().catch(error => {
  console.error('Error processing files:', error);
});
