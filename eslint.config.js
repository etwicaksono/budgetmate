// @ts-check
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
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
         "react/prop-types": "off",
         "no-useless-catch": "off",
         "@typescript-eslint/no-unused-vars": ["warn"],
         "react-hooks/rules-of-hooks": "error",
         "react-hooks/exhaustive-deps": "warn",
         // optional stricter Next rules
         ...nextPlugin.configs["core-web-vitals"].rules,
      },
   }
);
