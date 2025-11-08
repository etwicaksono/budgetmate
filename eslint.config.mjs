// @ts-check
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Build the TypeScript/React/Next configs
const tsConfigs = tseslint.config(
   js.configs.recommended,          // base ESLint rules
   ...tseslint.configs.recommended, // TypeScript rules
   {
      files: ["**/*.{js,jsx,ts,tsx}"],
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
         ...nextPlugin.configs["core-web-vitals"].rules,
         "react/prop-types": "off",
         "no-useless-catch": "off",
         "@typescript-eslint/no-unused-vars": "off",
         "@typescript-eslint/no-explicit-any": "off",
         "@typescript-eslint/no-empty-object-type": "off",
         "@typescript-eslint/ban-ts-comment": "off",
         "no-unused-vars": "off",
         "react-hooks/rules-of-hooks": "error",
         "react-hooks/exhaustive-deps": "off",
         "@next/next/no-img-element": "off",
         // optional stricter Next rules can go here
      },
   },
   {
      files: [
         "eslint.config.js",
         "next.config.js",
         "public/**/*.{js,mjs}",
         "scripts/**/*.{js,mjs}",
      ],
      languageOptions: {
         parser: tseslint.parser,
         parserOptions: {
            project: null,
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
         "@typescript-eslint/no-require-imports": "off",
         "@typescript-eslint/no-unused-vars": "off",
         "@typescript-eslint/no-explicit-any": "off",
      },
   }
);

export default [
   // Global ignores FIRST (so .next truly skipped)
   {
      ignores: [
         "**/.next/**",
         "**/node_modules/**",
         "**/dist/**",
         "**/build/**",
         "**/coverage/**",
         "**/out/**",
      ],
      linterOptions: {
         reportUnusedDisableDirectives: "off",
      },
   },

   // Then all the TypeScript/React/Next configs
   ...tsConfigs,
];
