import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import prettierPlugin from "eslint-plugin-prettier";
import unicorn from "eslint-plugin-unicorn";
import sonarjs from "eslint-plugin-sonarjs";
import etc from "eslint-plugin-etc";
import esLintConfigPrettier from "eslint-config-prettier";
import jsdoc from "eslint-plugin-jsdoc";
import { parser } from "typescript-eslint";

const defaultConfig = {
  name: "defaultConfig",
  languageOptions: {
    parser,
    ecmaVersion: "latest",
    sourceType: "module",
  },
  ...eslint.configs.recommended,
  files: ["**/*.ts", "eslint.config.mjs", "commitlint.config.ts"],
  plugins: {
    prettier: prettierPlugin,
    unicorn,
    sonarjs,
    etc,
  },
  rules: {
    // Prettier rules
    "prettier/prettier": "error",

    // Opinionated rules
    "unicorn/prevent-abbreviations": "off", // Avoid overly strict abbreviation rules
    "unicorn/no-array-reduce": "warn",
    "unicorn/no-null": "warn",
    "sonarjs/cognitive-complexity": ["warn", 15], // Highlights overly complex functions
    "sonarjs/no-duplicate-string": "warn",
    "sonarjs/prefer-immediate-return": "warn",
    "etc/no-deprecated": "warn",
    "etc/no-misused-generics": "warn",

    // Stylistic rules
    "array-bracket-spacing": "warn",
    "arrow-parens": ["warn", "as-needed"],
    "block-spacing": "warn",
    "brace-style": ["warn", "1tbs", { allowSingleLine: true }],
    "comma-dangle": ["error", "never"],
    "comma-spacing": "warn",
    "func-call-spacing": "warn",
    "lines-between-class-members": "warn",
    "no-console": "error",
    "no-duplicate-imports": "error",
    "no-unused-vars": [
      "error",
      { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
    ],
    "object-shorthand": "error",
    "prefer-template": "error",
    "space-before-function-paren": [
      "warn",
      { anonymous: "always", named: "never", asyncArrow: "always" },
    ],
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
    "**/dist",
    "**/*.log",
  ],
};

const tsConfig = {
  name: "tsConfig",
  languageOptions: {
    parser,
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      project: ["tsconfig.json", "tsconfig.build.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
  files: ["commitlint.config.ts", "src/**/*.ts"],
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  ...jsdoc.configs["flat/recommended-typescript"],
  plugins: {
    "@stylistic/ts": stylisticTs,
    jsdoc,
  },
  rules: {
    "@stylistic/ts/member-delimiter-style": [
      "error",
      {
        multiline: { delimiter: "none" },
        singleline: { delimiter: "comma", requireLast: false },
      },
    ],
    "@stylistic/ts/semi": ["error", "never"],
    "@stylistic/ts/type-annotation-spacing": "error",
    "@stylistic/ts/indent": [
      "warn",
      2,
      {
        FunctionDeclaration: { parameters: 1, body: 1 },
        FunctionExpression: { parameters: 1, body: 1 },
        ObjectExpression: 1,
        SwitchCase: 1,
      },
    ],
  },
};

export default [defaultConfig, tsConfig, esLintConfigPrettier];