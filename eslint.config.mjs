import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".agents/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
  {
    rules: {
      // ── TypeScript ────────────────────────────────────────────────────────
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // ── Quality / SonarQube-aligned ───────────────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-alert": "error",
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],

      // ── React ─────────────────────────────────────────────────────────────
      "react/self-closing-comp": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // TanStack Table v8 is not compatible with React Compiler — components
      // using useReactTable should opt out via "use no memo". Disabling the
      // lint rule globally because the opt-out is handled at the code level.
      "react-hooks/incompatible-library": "off",
    },
  },
]);

export default eslintConfig;
