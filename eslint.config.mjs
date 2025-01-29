import eslint from "@eslint/js"
import stylisticTs from "@stylistic/eslint-plugin-ts"
import jsdoc from "eslint-plugin-jsdoc"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import globals from "globals"
import eslintPluginUnicorn from "eslint-plugin-unicorn"
import sonarjs from "eslint-plugin-sonarjs"
import { parser } from "typescript-eslint"
// eslint-disable-next-line no-duplicate-imports
import tseslint from "typescript-eslint"

// General rules

const defaultConfig = [
  eslintPluginUnicorn, {
  name: "defaultConfig",
  languageOptions: {
    parser,
    ecmaVersion: "latest",
    sourceType: "module",
    globals: { ...globals.builtin },
  },
  ...eslint.configs.recommended,
  ...sonarjs.configs.recommended,
  plugins: { unicorn: eslintPluginUnicorn, sonarjs },
  files: ["**/*.ts", "eslint.config.mjs", "commitlint.config.ts"],
  rules: {
    "array-bracket-spacing": "warn",
    "arrow-parens": ["warn", "as-needed"],
    "block-spacing": "warn",

    "brace-style": [
      "warn",
      "1tbs",
      {
        allowSingleLine: true,
      },
    ],

    "comma-dangle": ["error", "never"],
    "comma-spacing": "warn",
    "comma-style": "error",
    "computed-property-spacing": "warn",
    curly: "off",
    eqeqeq: ["error", "smart"],
    "func-call-spacing": "warn",
    "keyword-spacing": "warn",

    "lines-around-comment": [
      "error",
      {
        allowBlockStart: true,
        allowBlockEnd: true,
        beforeBlockComment: true,
        ignorePattern: "@ts-ignore",
      },
    ],

    "lines-between-class-members": "warn",
    "max-classes-per-file": "error",
    "new-parens": "error",
    "no-caller": "error",
    "no-case-declarations": "off",
    "no-console": "error",
    "no-duplicate-imports": "error",
    "no-eval": "error",
    "no-extra-bind": "error",

    "no-multiple-empty-lines": [
      "error",
      {
        max: 1,
      },
    ],

    "no-new-func": "error",
    "no-new-wrappers": "error",

    "no-restricted-globals": [
      "error",
      {
        name: "fdescribe",
        message: "Did you mean 'describe'?",
      },
      {
        name: "xdescribe",
        message: "Did you mean 'describe'?",
      },
      {
        name: "fit",
        message: "Did you mean 'it'?",
      },
      {
        name: "xit",
        message: "Did you mean 'xit'?",
      },
    ],
    "no-unused-vars": [
      "error",
      {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
      },
    ],
    "no-return-await": "error",
    "no-sequences": "error",
    "no-shadow": "off",
    "no-tabs": "error",
    "no-template-curly-in-string": "error",
    "no-throw-literal": "off",
    "no-trailing-spaces": "warn",
    "no-undef-init": "error",
    "no-undef": "off",
    "no-underscore-dangle": "error",
    "no-var": "error",
    "no-whitespace-before-property": "warn",
    "object-shorthand": "error",
    "one-var": ["error", "never"],
    "prefer-exponentiation-operator": "error",
    "prefer-object-spread": "error",
    "prefer-template": "error",
    "quote-props": ["error", "consistent-as-needed"],

    quotes: [
      "error",
      "double",
      {
        avoidEscape: true,
      },
    ],

    radix: "error",
    semi: "off",

    "sort-imports": [
      "error",
      {
        ignoreDeclarationSort: true,
      },
    ],

    "space-before-blocks": "warn",

    "space-before-function-paren": [
      "warn",
      {
        anonymous: "always",
        named: "never",
        asyncArrow: "always",
      },
    ],

    "space-in-parens": "warn",
    "space-infix-ops": "warn",
    "space-unary-ops": "warn",
    "spaced-comment": "warn",
    "switch-colon-spacing": "warn",
    "template-tag-spacing": "warn",
  },
  ignores: [
    "*.d.ts",
    "external/**",
    "mkdocs-material/**",
    "**/node_modules",
    "**/__pycache__",
    "**/venv",
    "**/.venv",
    "**/.vscode",
    "**/docs",
    "**/build",
    "**/MANIFEST",
    "**/manifest.json",
    "**/site",
    "**/typings",
    "**/webpack.config.ts",
    "**/dist",
    "**/mkdocs_material.egg-info",
    "**/*.cpuprofile",
    "**/*.log",
    "**/*.tsbuildinfo",
    "**/.eslintcache",
    "**/tmp",
    "**/.testbuild",
    "**/.workbench",
    "**/.cache",
  ],
}]

const tseslintConfig = tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        project: ["tsconfig.json", "tsconfig.build.json"],
      },
        globals: {
      ...globals.browser,
      ...globals.builtin,
      ...globals.serviceworker,
    },

    },
  },
);

// Typescript rules
const tsConfig = tseslint.config(
  tseslint.configs.recommended,
  tseslint.configs.stylisticTypeChecked,
  tseslint.configs.strictTypeChecked, {
  name: "tsConfig",
  languageOptions: {
    parser,
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      ...globals.browser,
      ...globals.builtin,
      ...globals.serviceworker,
    },

    parserOptions: {
      project: ["tsconfig.json", "tsconfig.build.json"],
      projectService: true,
      tsconfigRootDir: "./",
    },
  },
  files: ["commitlint.config.ts", "src/**/*.ts"],
  ...jsdoc.configs["flat/recommended-typescript"],
  ...jsdoc.configs["flat/logical-typescript"],
  ...jsdoc.configs["flat/requirements-typescript"],
  ...jsdoc.configs["flat/stylistic-typescript"],
  ...jsdoc.configs["flat/contents-typescript"],
  plugins: {
    "@stylistic/ts": stylisticTs,
    tseslint,
    jsdoc,
  },
  rules: {
    "@stylistic/ts/member-delimiter-style": [
      "error",
      {
        multiline: {
          delimiter: "none",
        },

        singleline: {
          delimiter: "comma",
          requireLast: false,
        },
      },
    ],
    "@stylistic/ts/semi": ["error", "never"],
    "@stylistic/ts/type-annotation-spacing": "error",
    "@stylistic/ts/indent": [
      "warn",
      2,
      {
        FunctionDeclaration: {
          parameters: 1,
          body: 1,
        },

        FunctionExpression: {
          parameters: 1,
          body: 1,
        },

        MemberExpression: "off",
        ObjectExpression: 1,
        SwitchCase: 1,
        ignoreComments: true,

        ignoredNodes: [
          "ArrowFunctionExpression > *",
          "CallExpression > ObjectExpression",
          "ConditionalExpression > ConditionalExpression",
          "TSTypeReference > *",
        ],

        offsetTernaryExpressions: true,
      },
    ],
  },
})

const buildConfig = {
  name: "buildConfig",
  languageOptions: {
    parser,
    ecmaVersion: "latest",
    sourceType: "module",
    globals: { ...globals.node, ...globals.nodeBuiltin, ...globals.builtin },
    parserOptions: {
      project: ["tsconfig.build.json", "tsconfig.commitlint.json"],
      tsconfigRootDir: "./",
    },
  },
  files: ["commitlint.config.ts", "src/build/**"],
}

// And we actually export it.
export default [defaultConfig, tsConfig, buildConfig, eslintPluginPrettierRecommended]
