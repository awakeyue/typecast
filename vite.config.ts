import { defineConfig } from "vite"
import dts from "vite-plugin-dts"

export default defineConfig({
  build: {
    lib: {
      entry: "./lib/typecast.ts",
      name: "Typecast",
      fileName: "typecast",
      formats: ["es", "iife", "umd"]
    }
  },
  plugins: [
    dts({
      include: ["lib/typecast.ts"],
      outDir: "dist"
    })
  ]
})
