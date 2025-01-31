import eslint from "@eslint/js"
import stylisticTs from "@stylistic/eslint-plugin-ts"
import jsdoc from "eslint-plugin-jsdoc"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import globals from "globals"
import eslintPluginUnicorn from "eslint-plugin-unicorn"
import sonarjs from "eslint-plugin-sonarjs"
import { parser } from "typescript-eslint"
 
import tseslint from "typescript-eslint"

// General rules
const localConfig = {
  ts: {
    tsconfigFiles: ["tsconfig.json", "tsconfig.build.json", "tsconfig.commitlint.json"],
    tsFiles: ["**/*.ts", "commitlint.config.ts"],
    onlyBuildFiles: ["commitlint.config.ts", "src/build/**"],
    nodeGlobals: { ...globals.node, ...globals.nodeBuiltin, ...globals.builtin },
    browserGlobals: { ...globals.browser, ...globals.builtin, ...globals.serviceworker },
    parser: parser,
  },
  js: {
    jsFiles: ["**/*.js"],
  },
  languageOptions: {
    globals: { ...globals.builtin }
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
}

const jsdocConfig = {  ...jsdoc.configs["flat/recommended-typescript"],
  ...jsdoc.configs["flat/logical-typescript"],
  ...jsdoc.configs["flat/requirements-typescript"],
  ...jsdoc.configs["flat/stylistic-typescript"],
  ...jsdoc.configs["flat/contents-typescript"],
}

const baseRules = {
  ...eslint.configs.recommended,
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
  }
}

const stylisticTsConfig = {
  plugins: {
    style: stylisticTs,
  },
  rules: {
    "style/member-delimiter-style": [
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
    "style/semi": ["error", "never"],
    "style/type-annotation-spacing": "error",
    "style/indent": [
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
}

const configsForAll = [baseRules, sonarjs.configs.recommended, eslintPluginUnicorn.recommended].map((config) => {
  return { ...localConfig.baseOptions, ...config, files: [...localConfig.ts.tsFiles, ...localConfig.js.jsFiles], ignores: localConfig.ignores }
})

const allTs = tseslint.config(tseslint.configs.stylisticTypeChecked, tseslint.configs.strictTypeChecked, stylisticTsConfig, jsdocConfig).map((config) => {
  return { ...localConfig.baseOptions, ...config, files: localConfig.ts.tsFiles, ignores: localConfig.ignores, languageOptions: { parser: localConfig.ts.parser } }
})

const browserTs = allTs.map((config) => {
  return { ...config, languageOptions: { globals: localConfig.ts.browserGlobals } }
})

const buildTs = allTs.map((config) => {
  return { ...config, files: localConfig.ts.onlyBuildFiles, languageOptions: { globals: localConfig.ts.nodeGlobals } }
})

export default [...configsForAll, ...allTs, ...browserTs, ...buildTs].map((config) => {return { ...config, ...eslintPluginPrettierRecommended}})
