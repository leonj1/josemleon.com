import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  { ignores: ["dist/**", "metrics-ingest/**", "src/lib/explorer.js"] },
  {
    files: ["src/**/*.js", "tests/**/*.js", "*.config.js"],
    ...pluginJs.configs.recommended,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
];
