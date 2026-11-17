import js from "@eslint/js";
import tseslint from "typescript-eslint";

const restrictedPattern = {
  group: ["three", "three/*", "idb-keyval"],
  message:
    "core and data modules must not import three or idb-keyval directly. Use the engine/storage abstraction instead.",
};

export default tseslint.config(
  {
    ignores: ["node_modules", "dist"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/core/**/*.ts", "src/data/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [restrictedPattern] }],
    },
  },
);
