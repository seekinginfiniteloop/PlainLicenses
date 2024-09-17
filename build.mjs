import * as esbuild from "esbuild";
import { cssModulesPlugin } from "@asn.aeb/esbuild-css-modules-plugin";

const materialCssDir = "mkdocs-material/src/templates/assets/stylesheets"
const plainCssDir = "src/stylesheets"

const webConfig = {
  bundle: true,
  minify: true,
  sourcemap: true,
  format: "esm",
  platform: "browser",
  target: "es2018",
  outdir: "overrides/assets/javascripts",
  loader: {
    ".ts": "ts",
    ".tsx": "tsx",
    ".css": "css",
    ".scss": "css",
    ".woff2": "file"
  },
  splitting: true,
  plugins: [cssModulesPlugin({
        emitCssBundle: {
            path: '../stylesheets',
            filename: 'bundle.css'
        }
  })],
};

const nodeConfig = {
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

const projects = [
    { //default Material theme
    entryPoints: ["mkdocs-material/src/templates/assets/javascripts/bundle.ts", `${materialCssDir}/palette.scss`, `${materialCssDir}/main.scss`],
    tsconfig: "tsconfig.material.json",
  },
  {
    // Hero landing page
    entryPoints: ["src/hero/index.ts", "src/licenses/index.ts", `${plainCssDir}/colors.css`, `${plainCssDir}/extra.css`, `${plainCssDir}/license.css`, `${plainCssDir}/home.css`],
    tsconfig: "tsconfig.json",
  },
  {
    // Build GitHub actions
    entryPoints: [".github/src/generate-changelog.ts"],
    outdir: ".github/scripts",
    tsconfig: ".github/tsconfig.json",
    platform: "node",
  },
];

async function build() {
  for (const project of projects) {
    if (project.platform && project.platform === "node") {
      const { entryPoints, outdir, tsconfig } = project;
      await esbuild.build({
        ...nodeConfig,
        entryPoints,
        outdir,
        tsconfig,
      });
    }
    else {
      const { entryPoints, tsconfig } = project;
      await esbuild.build({
        ...webConfig,
        entryPoints,
        tsconfig,
      });
    }
  }
}


await build().catch(() => process.exit(1));
