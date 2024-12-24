import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig({
  build: {
    lib: {
      entry: "./lib/typedLine.ts",
      name: "TypedLine",
      fileName: "typedLine",
      formats: ["es", "iife", "umd"]
    }
  },
  plugins: [
    dts({
      include: ["lib/typedLine.ts"],
      outDir: "dist"
    })
  ]
})
