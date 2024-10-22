import typescriptEslint from "@typescript-eslint/eslint-plugin";
import stylisticTs from "@stylistic/eslint-plugin-ts";
import eslintComments from "eslint-plugin-eslint-comments";
import jsdoc from "eslint-plugin-jsdoc";
import noNull from "eslint-plugin-no-null";
import { fixupPluginRules } from "@eslint/compat";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
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
        "**/.cache",
    ],
}, ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
), {
    plugins: {
        "@typescript-eslint": typescriptEslint,
        "@stylistic/ts": stylisticTs,
        "eslint-comments": eslintComments,
        jsdoc,
        "no-null": noNull,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: [
                "tsconfig.json",
                "src/build/tsconfig.json",
                ".github/tsconfig.json",
                "package.json",
            ],
        },
    },

    settings: {
    },

    rules: {
        "array-bracket-spacing": "warn",
        "arrow-parens": ["warn", "as-needed"],
        "block-spacing": "warn",

        "brace-style": ["warn", "1tbs", {
            allowSingleLine: true,
        }],

        "comma-dangle": ["error", "never"],
        "comma-spacing": "warn",
        "comma-style": "error",
        "computed-property-spacing": "warn",
        curly: "off",
        eqeqeq: ["error", "smart"],
        "func-call-spacing": "warn",
        "keyword-spacing": "warn",

        "lines-around-comment": ["error", {
            allowBlockStart: true,
            allowBlockEnd: true,
            beforeBlockComment: true,
            ignorePattern: "@ts-ignore",
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
            max: 1,
        }],

        "no-new-func": "error",
        "no-new-wrappers": "error",

        "no-restricted-globals": ["error", {
            name: "fdescribe",
            message: "Did you mean 'describe'?",
        }, {
            name: "xdescribe",
            message: "Did you mean 'describe'?",
        }, {
            name: "fit",
            message: "Did you mean 'it'?",
        }, {
            name: "xit",
            message: "Did you mean 'xit'?",
        }],

        "no-return-await": "error",
        "no-sequences": "error",
        "no-shadow": "off",
        "no-tabs": "error",
        "no-template-curly-in-string": "error",
        "no-throw-literal": "off",
        "no-trailing-spaces": "warn",
        "no-undef-init": "error",
        "no-underscore-dangle": "error",
        "no-var": "error",
        "no-whitespace-before-property": "warn",
        "object-shorthand": "error",
        "one-var": ["error", "never"],
        "prefer-exponentiation-operator": "error",
        "prefer-object-spread": "error",
        "prefer-template": "error",
        "quote-props": ["error", "consistent-as-needed"],

        quotes: ["error", "double", {
            avoidEscape: true,
        }],

        radix: "error",
        semi: "off",

        "sort-imports": ["error", {
            ignoreDeclarationSort: true,
        }],

        "space-before-blocks": "warn",

        "space-before-function-paren": ["warn", {
            anonymous: "always",
            named: "never",
            asyncArrow: "always",
        }],

        "space-in-parens": "warn",
        "space-infix-ops": "warn",
        "space-unary-ops": "warn",
        "spaced-comment": "warn",
        "switch-colon-spacing": "warn",
        "template-tag-spacing": "warn",
        "@typescript-eslint/array-type": "off",
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/ban-types": "off",
        "@typescript-eslint/consistent-type-assertions": "error",
        "@typescript-eslint/dot-notation": "error",
        "@typescript-eslint/explicit-member-accessibility": "error",

        "@typescript-eslint/naming-convention": ["error", {
            selector: "enumMember",
            format: ["UPPER_CASE"],
        }],

        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-empty-object-type": "off",
        "@typescript-eslint/no-extraneous-class": "error",
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-parameter-properties": "off",
        "@typescript-eslint/no-floating-promises": "error",

        "@typescript-eslint/no-shadow": ["error", {
            hoist: "never",
        }],

        "@typescript-eslint/no-unnecessary-type-assertion": "error",
        "@typescript-eslint/no-unused-expressions": "error",
        "@typescript-eslint/no-unused-vars": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/only-throw-error": "error",
        "@typescript-eslint/prefer-for-of": "off",
        "@typescript-eslint/prefer-function-type": "error",
        "@typescript-eslint/triple-slash-reference": "off",
        "@typescript-eslint/unbound-method": "error",
        "@typescript-eslint/unified-signatures": "error",

        "@stylistic/ts/indent": ["warn", 2, {
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
        }],

        "@stylistic/ts/member-delimiter-style": ["error", {
            multiline: {
                delimiter: "none",
            },

            singleline: {
                delimiter: "comma",
                requireLast: false,
            },
        }],

        "@stylistic/ts/semi": ["error", "never"],
        "@stylistic/ts/type-annotation-spacing": "error",
        "eslint-comments/no-unused-disable": "error",
        "eslint-comments/no-unused-enable": "error",

        "eslint-comments/no-use": ["warn", {
            allow: ["eslint-disable-line", "eslint-disable-next-line"],
        }],

        "jsdoc/check-alignment": "warn",

        "jsdoc/check-param-names": ["warn", {
            checkDestructured: false,
        }],

        "jsdoc/check-syntax": "warn",

        "jsdoc/check-tag-names": ["warn", {
            definedTags: ["internal"],
        }],

        "jsdoc/empty-tags": "warn",
        "jsdoc/no-bad-blocks": "warn",
        "jsdoc/no-defaults": "warn",
        "jsdoc/no-types": "warn",
        "jsdoc/require-hyphen-before-param-description": "warn",
        "jsdoc/require-jsdoc": "warn",
        "jsdoc/require-param-description": "warn",
        "jsdoc/require-param-name": "warn",

        "jsdoc/require-param": ["warn", {
            checkDestructured: false,
            checkDestructuredRoots: true,
        }],

        "jsdoc/require-returns-check": "warn",
        "jsdoc/require-returns-description": "warn",

        "jsdoc/require-returns": ["warn", {
            checkGetters: false,
            forceReturnsWithAsync: true,
        }],

        "no-null/no-null": "error",
    },
}];
