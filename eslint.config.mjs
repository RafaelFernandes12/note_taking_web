import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist/**", ".next/**"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat["recommended-latest"] ?? reactHooks.configs.flat.recommended,
    ],
    languageOptions: { globals: globals.browser },
  },
  {
    // Código do template do Tiptap (gerado pela CLI deles): usa padrões que as
    // regras do React Compiler reclamam. O código do app (src/app, src/routes)
    // continua com as regras completas.
    files: ["src/components/**", "src/hooks/**"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/use-memo": "off",
      "no-useless-assignment": "off",
    },
  },
]);
