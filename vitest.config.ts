import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "src/**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "src/**/*.{test,spec}.{js,ts,jsx,tsx}",
      "tests/**/*.{test,spec}.{js,ts,jsx,tsx}"
    ],
    exclude: ["node_modules", "dist", "build", ".git", "coverage"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "coverage",
      exclude: [
        "src/main.ts",
        "src/App.vue",
        "**/__tests__/**",
        "**/types/**",
        "**/*.d.ts",
        "src/router/**",
        "src/utils/**",
        "src/vite-env.d.ts"
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    setupFiles: ["tests/setup.ts"],
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    threads: true
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src")
    }
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    "import.meta.env.VITE_ROUTER_HISTORY": '"hash"'
  }
});
