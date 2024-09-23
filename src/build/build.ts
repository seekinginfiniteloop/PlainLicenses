import { cssModulesPlugin } from "@asn.aeb/esbuild-css-modules-plugin";
import * as crypto from "crypto";
import * as esbuild from "esbuild";
import * as fs from "fs";
import { glob } from "glob";
import path from "path";
import { exit } from "process";
import { forkJoin, Observable, from, of, lastValueFrom } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

type ManifestKeys = "styleSheets" | "scripts" | "fonts" | "images";

type GlobbedPaths = {
  [key in ManifestKeys]: string[];
} & {
  [key: string]: string[]; // Add index signature
};

function readFileObservable(filePath: string): Observable<string> {
  return from(fs.promises.readFile(filePath, 'utf8'));
}

function globObservable(pattern: string): Observable<string[]> {
  return from(new Promise<string[]>((resolve, reject) => {
    glob(pattern, { nodir: true }).then(matches => {
      resolve(matches);
    }).catch(err => {
      reject(err);
    });
  }));
}

function parseJsonFile(jsonFilePath: string): Observable<GlobbedPaths> {
  return readFileObservable(jsonFilePath).pipe(
    map(data => JSON.parse(data) as GlobbedPaths),
    catchError(error => {
      console.error('Error parsing JSON file:', error);
      return of({} as GlobbedPaths);
    })
  );
}

function expandPaths(jsonData: GlobbedPaths): Observable<GlobbedPaths> {
  const observables = Object.entries(jsonData).map(([key, patterns]) => {
    return forkJoin((patterns as string[]).map(pattern => globObservable(pattern))).pipe(
      map(results => [key, results.flat()])
    );
  });
  return forkJoin(observables).pipe(
    map(results => {
      const expandedPaths: GlobbedPaths = {"styleSheets": [], "scripts": [], "fonts": [], "images": []};
      results.forEach(([key, paths]) => {
        expandedPaths[key as string] = (paths as string[]).flat();
      });
      return expandedPaths;
    }),
    catchError(error => {
      console.error('Error expanding paths:', error);
      return of({} as GlobbedPaths);
    })
  );
}

function parseJsonWithGlobs(jsonFilePath: string): Observable<GlobbedPaths> {
  return parseJsonFile(jsonFilePath).pipe(
    mergeMap(jsonData => expandPaths(jsonData))
  );
}

function computeHash(filePath: string): Observable<string> {
  return readFileObservable(filePath).pipe(
    map(data => crypto.createHash('md5').update(data).digest('base64url')),
    map(hash => hash.slice(0, 8))
  );
}

function handleError(action: string) {
  return (err: Error | null) => {
    if (err) {
      console.error(`Error ${action}:`, err);
    } else {
      console.log(`Completed ${action}`);
    }
  };
}

function handleFileUpdate(filePath: string, originalFilePath: string, hash: string, newHash: string): Observable<void> {
  return from((async () => {
    if (newHash !== hash) {
      await fs.promises.unlink(filePath).catch(handleError('deleting file'));
      const newFileName = originalFilePath.replace('.', `.${newHash}.`);
      await fs.promises.rename(originalFilePath, path.join(filePath, newFileName)).catch(handleError(`renaming file ${originalFilePath}`));
      const docsFilePath = filePath.replace('src', 'docs/assets');
      await fs.promises.unlink(docsFilePath).catch(handleError('deleting file in docs'));
    }
  })());
}

function handleMkDocsMaterial(filePath: string): Observable<string> {
  return from((async () => {
    const fileName = path.basename(filePath);
    let newPath: string;
    if (fileName.endsWith(".css")) {
      newPath = `src/assets/stylesheets/${fileName}`;
    } else {
      newPath = `src/assets/javascripts/${fileName}`;
    }
    const itExists = await fs.promises.access(newPath, fs.constants.F_OK).then(() => true).catch(() => false);
    if (itExists) {
      return newPath;
    } else {
      const files = await fs.promises.readdir(newPath, { encoding: 'utf-8' });
      const similarFile = files.find(file => file.includes(fileName.split('.')[0]));
      if (similarFile && similarFile !== fileName) {
        const parentDir = newPath.substring(0, newPath.lastIndexOf(path.sep));
        await fs.promises.unlink(path.join(parentDir, similarFile));
      }
      if (filePath !== newPath) {
        await fs.promises.copyFile(filePath, newPath).catch(handleError(`copying file ${filePath}`));
        await fs.promises.unlink(filePath).catch(handleError(`deleting file ${filePath}`));
      }
      return newPath;
    }
  })());
}

function retrieveHashedFiles(paths: string[]): Observable<string[]> {
  const observables = paths.map(filePath => {
    const parentPath = filePath.substring(0, filePath.lastIndexOf(path.sep));
    if (filePath.includes('mkdocs-material')) {
      return handleMkDocsMaterial(filePath);
    } else {
      const fileName = path.basename(filePath);
      const matches = fileName.match(/\.([a-f0-9]{8})\./);
      if (matches) {
        const hash = matches[1];
        const originalFileName = fileName.replace(`.${hash}.`, '.');
        const originalFilePath = path.join(parentPath, originalFileName);
        return computeHash(originalFilePath).pipe(
          mergeMap(newHash => handleFileUpdate(filePath, originalFilePath, hash, newHash)),
          map(() => filePath)
        );
      } else {
        return computeHash(filePath).pipe(
          mergeMap(hash => {
            const newFileName = fileName.replace('.', `.${hash}.`);
            return from(fs.promises.rename(filePath, path.join(parentPath, newFileName)).then(() => path.join(parentPath, newFileName)));
          })
        );
      }
    }
  });

  return forkJoin(observables).pipe(
    catchError(error => {
      console.error('Error processing files:', error);
      return of([]);
    })
  );
}

const webConfig: esbuild.BuildOptions = {
  bundle: true,
  minify: true,
  sourcemap: true,
  format: "esm",
  platform: "browser",
  target: "es2018",
  outbase: "docs/assets/",
  chunkNames: "chunks/[name]-[hash]",
  outdir: "src",
  loader: {
    ".js": "js",
    ".ts": "ts",
    ".tsx": "tsx",
    ".css": "css",
    ".scss": "css",
  },
  splitting: true,
  plugins: [
    cssModulesPlugin({
      emitCssBundle: {
        path: "stylesheets",
        filename: "bundle.css",
      },
    }),
  ],
};

const nodeConfig: esbuild.BuildOptions = {
  loader: webConfig.loader,
  format: "esm",
  bundle: true,
  platform: "node",
  target: "node18",
  sourcemap: false,
  minify: false,
  splitting: false,
  plugins: [],
};

interface Project {
  entryPoints: string[];
  entryNames?: string;
  outdir?: string;
  tsconfig: string;
  platform?: "node" | "browser";
}

const GHActions: Project[] = [
  {
    // Build GitHub actions
    entryPoints: [".github/src/generate-changelog.ts"],
    entryNames: "[dir]/[name]-[hash]",
    outdir: ".github/scripts",
    tsconfig: ".github/tsconfig.json",
    platform: "node",
  },
];

function copyStaticFiles(hashedFiles: string[]): Observable<void[]> {
  const copyFileObservable = (src: string, dest: string): Observable<void> => {
    return from(fs.promises.copyFile(src, dest).catch(err => {
      console.error(`Error copying file from ${src} to ${dest}:`, err);
      throw err;
    })).pipe(
      map(() => {})
    ) as Observable<void>;
  };

  const mkdirObservable = (dir: string): Observable<void> => {
    return from(fs.promises.mkdir(dir, { recursive: true }).catch(err => {
      console.error(`Error creating directory ${dir}:`, err);
      throw err;
    })).pipe(map(() => {void 0})) as Observable<void>;
  };

  const fileExistsObservable = (filePath: string): Observable<boolean> => {
    return from(fs.promises.stat(filePath).then(() => true).catch(() => false));
  };

  const operations = hashedFiles.map(filePath => {
    const newPath = filePath.replace('src', 'docs/assets');
    const newParent = newPath.substring(0, newPath.lastIndexOf(path.sep));

    return fileExistsObservable(newParent).pipe(
      mergeMap(exists => {
        if (!exists) {
          return mkdirObservable(newParent).pipe(
            mergeMap(() => copyFileObservable(filePath, newPath))
          );
        } else {
          return fileExistsObservable(newPath).pipe(
            mergeMap(exists => {
              if (!exists) {
                return copyFileObservable(filePath, newPath).pipe(
                  map(() => {})
                );
              } else {
                return of(undefined);
              }
            })
          );
        }
      }),
      map(() => {void 0}) // Add this line to return void instead of string | undefined
    );
  });

  return forkJoin(operations).pipe(
    catchError(err => {
      console.error('Error during file operations:', err);
      throw err;
    })
  );
}

async function handleHashedFiles(hashedFiles: Observable<string[]>): Promise<string[]> {
  try {
    return await lastValueFrom(
      hashedFiles.pipe(
        mergeMap(files => {
          console.log('Completed processing hashed files.');
          return of(files);
        }),
        catchError(err => {
          console.error('Error:', err);
          return of([]);
        })
      )
    );
  } catch (err) {
    console.error('Error:', err);
    return [];
  }
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

async function runBuild(): Promise<void> {
  const jsonFilePath = path.join(__dirname, 'src/base_manifest.json');

  parseJsonWithGlobs(jsonFilePath).subscribe({
    next: async (expandedPaths: GlobbedPaths) => {
      const cssEntries = await handleHashedFiles(retrieveHashedFiles(expandedPaths.styleSheets));
      const javaScriptEntries = await handleHashedFiles(retrieveHashedFiles(expandedPaths.scripts));
      const fontEntries = await handleHashedFiles(retrieveHashedFiles(expandedPaths.fonts));
      const imageEntries = await handleHashedFiles(retrieveHashedFiles(expandedPaths.images));
      const staticFiles = fontEntries.concat(imageEntries);
      copyStaticFiles(staticFiles).subscribe({
        next: () => {
          console.log('Completed copying static files.');
        },
        error: (err: Error) => {
          console.error('Error:', err);
        },
        complete: () => {
          console.log('Completed copying static files.');
        }
      });
      // build main project
      build({ entryPoints: javaScriptEntries.concat(cssEntries), tsconfig: 'tsconfig.json' }).subscribe({
        next: () => {
          console.log('Completed building main project.');
        },
        error: (err: Error) => {
          console.error('Error:', err);
        },
        complete: () => {
          console.log('Completed building main project.');
        }
      });
      // build GitHub actions
      GHActions.forEach(project => {
        build(project).subscribe({
          next: () => {
            console.log('Completed building GitHub actions.');
          },
          error: (err: Error) => {
            console.error('Error:', err);
          },
          complete: () => {
            console.log('Completed building GitHub actions.');
          }
        });
      });
    },
    error: (err: Error) => {
      console.error('Error executing:', err);
    },
    complete: () => {
      console.log('Completed parsing and expanding paths.');
    }
  });
}

await runBuild().catch(() => exit(1));
