import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const isTest = Boolean(
  (globalThis as { process?: { env?: { VITEST?: string } } }).process?.env?.VITEST,
);

export default defineConfig({
  plugins: [react(), ...(isTest ? [] : [cloudflare()])],
  fmt: {
    ignorePatterns: ["mockups/**", "docs/specs/**", "scripts/**"],
  },
  lint: {
    ignorePatterns: ["mockups/**", "docs/specs/**", "scripts/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "typescript/no-misused-spread": "off",
    },
    options: { typeAware: true, typeCheck: true },
  },
});
