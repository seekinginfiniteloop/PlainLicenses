import eslint from "@eslint/js"
import stylisticTs from "@stylistic/eslint-plugin-ts"
import jsdoc from "eslint-plugin-jsdoc"
import { parser, configs } from "typescript-eslint"
import esLintConfigPrettier from "eslint-config-prettier"

export default [{
  languageOptions: {
    parser,
    ecmaVersion: "latest",
    sourceType: "module",

    parserOptions: {
      project: [
        "tsconfig.json",
      ],
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  }
},
  jsdoc.configs["flat/recommended-typescript"],
  jsdoc.configs["flat/logical-typescript"],
  jsdoc.configs["flat/requirements-typescript"],
  jsdoc.configs["flat/stylistic-typescript"],
  jsdoc.configs["flat/contents-typescript"],
  eslint.configs.recommended,
  {
    files: ["**/*.ts", "*.ts", "eslint.config.mjs, commitlint.config.ts"],
    plugins: {
      jsdoc
    },
    rules: {
      "jsdoc/require-example": "off",
      "jsdoc/match-description": "off",
      "jsdoc/require-description": "warn",
      "jsdoc/check-indentation": "warn",
      "jsdoc/sort-tags": "warn"
    }
  },
  {
    ignores: [
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
      "**/.cache"
    ],
    plugins: {
      "@stylistic/ts": stylisticTs
    },
    rules: {
      "array-bracket-spacing": "warn",
      "arrow-parens": ["warn", "as-needed"],
      "block-spacing": "warn",

      "brace-style": ["warn", "1tbs", {
        allowSingleLine: true
      }],

      "comma-dangle": ["error", "never"],
      "comma-spacing": "warn",
      "comma-style": "error",
      "computed-property-spacing": "warn",
      "curly": "off",
      "eqeqeq": ["error", "smart"],
      "func-call-spacing": "warn",
      "keyword-spacing": "warn",

      "lines-around-comment": ["error", {
        allowBlockStart: true,
        allowBlockEnd: true,
        beforeBlockComment: true,
        ignorePattern: "@ts-ignore"
      }],

      "lines-between-class-members": "warn",
      "max-classes-per-file": "error",
      "new-parens": "error",
      "no-caller": "error",
      "no-case-declarations": "off",
      "no-console": "error",
      "no-duplicate-imports": "error",
      "no-eval": "error",
      "no-extra-bind": "error",

      "no-multiple-empty-lines": ["error", {
        max: 1
      }],

      "no-new-func": "error",
      "no-new-wrappers": "error",

      "no-restricted-globals": ["error", {
        name: "fdescribe",
        message: "Did you mean 'describe'?"
      }, {
        name: "xdescribe",
        message: "Did you mean 'describe'?"
      }, {
        name: "fit",
        message: "Did you mean 'it'?"
      }, {
        name: "xit",
        message: "Did you mean 'xit'?"
      }],

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

      "quotes": ["error", "double", {
        avoidEscape: true
      }],

      "radix": "error",
      "semi": "off",

      "sort-imports": ["error", {
        ignoreDeclarationSort: true
      }],

      "space-before-blocks": "warn",

      "space-before-function-paren": ["warn", {
        anonymous: "always",
        named: "never",
        asyncArrow: "always"
      }],

      "space-in-parens": "warn",
      "space-infix-ops": "warn",
      "space-unary-ops": "warn",
      "spaced-comment": "warn",
      "switch-colon-spacing": "warn",
      "template-tag-spacing": "warn",

      "@stylistic/ts/indent": ["warn", 2, {
        FunctionDeclaration: {
          parameters: 1,
          body: 1
        },

        FunctionExpression: {
          parameters: 1,
          body: 1
        },

        MemberExpression: "off",
        ObjectExpression: 1,
        SwitchCase: 1,
        ignoreComments: true,

        ignoredNodes: [
          "ArrowFunctionExpression > *",
          "CallExpression > ObjectExpression",
          "ConditionalExpression > ConditionalExpression",
          "TSTypeReference > *"
        ],

        offsetTernaryExpressions: true
      }],

      "@stylistic/ts/member-delimiter-style": ["error", {
        multiline: {
          delimiter: "none"
        },

        singleline: {
          delimiter: "comma",
          requireLast: false
        }
      }],
      "@stylistic/ts/semi": ["error", "never"],
      "@stylistic/ts/type-annotation-spacing": "error"
    }
  },
  {
  ...configs.stylisticTypeChecked,
    languageOptions: {
    parser,
    ecmaVersion: "latest",
    sourceType: "module",

    parserOptions: {
      project: [
        "tsconfig.json",
      ],
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },

  files: ['*.js', '*.mjs'],
  ...configs.disableTypeChecked,
  },
  esLintConfigPrettier
]
