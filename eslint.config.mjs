// @ts-check
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
   // 1) Global ignores – .next and other build stuff
   {
      ignores: [
         ".next/**",
         "node_modules/**",
         "dist/**",
         "build/**",
         "coverage/**",
         "out/**",
      ],
      linterOptions: {
         reportUnusedDisableDirectives: "off",
      },
   },

   // 2) Main app/source files (TS + React + Next)
   ...tseslint.config(
      js.configs.recommended,
      ...tseslint.configs.recommended,
      {
         files: [
            "app/**/*.{js,jsx,ts,tsx}",
            "src/**/*.{js,jsx,ts,tsx}",
            "pages/**/*.{js,jsx,ts,tsx}",
            "components/**/*.{js,jsx,ts,tsx}",
         ],
         languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
               ecmaVersion: "latest",
               sourceType: "module",
               project: "./tsconfig.json",
            },
         },
         plugins: {
            react: reactPlugin,
            "react-hooks": reactHooks,
            "@next/next": nextPlugin,
         },
         settings: { react: { version: "detect" } },
         rules: {
            // Next.js recommended + Core Web Vitals
            ...nextPlugin.configs["core-web-vitals"].rules,

            // We use TS instead of PropTypes
            "react/prop-types": "off",

            // --- Stricter general JS rules ---
            "no-useless-catch": "error",
            "eqeqeq": ["error", "always"], // force === / !==
            "curly": ["error", "all"],    // always use braces
            "no-console": [
               "warn",
               { allow: ["warn", "error"] }, // console.log -> warn, console.warn/error allowed
            ],

            // --- Stricter TypeScript rules ---
            // Prefer the TS-aware unused-vars rule
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
               "error",
               {
                  argsIgnorePattern: "^_",
                  varsIgnorePattern: "^_",
                  ignoreRestSiblings: true,
               },
            ],

            // Discourage any, but still allow in edge cases
            "@typescript-eslint/no-explicit-any": "warn",

            // Catch weird empty types like `type X = {};`
            "@typescript-eslint/no-empty-object-type": "warn",

            // Discourage ts-ignore spam
            "@typescript-eslint/ban-ts-comment": "warn",

            // --- React / Hooks ---
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn", // stricter than off, but not blocking

            // --- Next.js specific ---
            // Encourage using <Image>, but as warning first
            "@next/next/no-img-element": "warn",
         },
      },

      // 3) Config / scripts: Node-style JS, no TS project needed
      {
         files: [
            "eslint.config.*",
            "next.config.*",
            "public/**/*.{js,mjs}",
            "scripts/**/*.{js,mjs}",
         ],
         languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
               project: null, // don't use tsconfig here
            },
            globals: {
               console: "readonly",
               process: "readonly",
               __dirname: "readonly",
               module: "readonly",
            },
         },
         rules: {
            "no-undef": "off",
            // a bit stricter than before for scripts too:
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "off", // allow any in build scripts
            "@typescript-eslint/no-require-imports": "off",
         },
      }
   ),
];
