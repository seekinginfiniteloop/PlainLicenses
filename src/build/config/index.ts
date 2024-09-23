import * as esbuild from "esbuild";
import { cssModulesPlugin } from "@asn.aeb/esbuild-css-modules-plugin";


export type GlobbedPaths = {
  [key in "styleSheets" | "scripts" | "fonts" | "images"]: string[];
} ;

export const paths: GlobbedPaths =
{
  "styleSheets": [
    "external/mkdocs-material/material/templates/assets/stylesheets/palette.*.min.css",
    "external/mkdocs-material/material/templates/assets/stylesheets/main.*.min.css",
    "src/stylesheets/colors.css",
    "src/stylesheets/extra.css",
    "src/stylesheets/license.css",
    "src/stylesheets/home.css"
  ],
  "scripts": [
    "external/mkdocs-material/material/templates/assets/javascripts/bundle.*.min.js",
    "src/javascripts/*.ts"
  ],
  "fonts": [
    "src/fonts/*.woff",
    "src/fonts/*.woff2",
  ],
  "images": [
    "src/images/hero/**/*.webp",
    "src/images/*.svg",
    "src/images/*.png"
  ]
}

export const webConfig: esbuild.BuildOptions = {
  bundle: true,
  minify: true,
  sourcemap: true,
  format: "esm",
  platform: "browser",
  target: "es2018",
  outbase: "docs/assets/",
  chunkNames: "chunks/[name].[hash]",
  outdir: "src",
  loader: {
    ".js": "js",
    ".ts": "ts",
    ".tsx": "tsx",
    ".css": "css",
    ".woff": "file",
    ".woff2": "file",
    ".png": "file",
    ".svg": "file",
    ".webp": "file",
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

export const nodeConfig: esbuild.BuildOptions = {
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

export interface Project {
  entryPoints: string[];
  entryNames?: string;
  outdir?: string;
  tsconfig: string;
  platform?: "node" | "browser";
}

export const GHActions: Project[] = [
  {
    // Build GitHub actions
    entryPoints: [".github/src/generate-changelog.ts"],
    entryNames: "[dir]/[name]",
    outdir: ".github/scripts",
    tsconfig: ".github/tsconfig.json",
    platform: "node",
  },
];

export const baseProject: Project = {
  entryPoints: [],
  tsconfig: "tsconfig.json",
  entryNames: "[dir]/[name].[hash]",
  platform: "browser",
  outdir: "docs/assets",
};
