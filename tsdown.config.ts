import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/bot.ts"],
  outDir: "dist",
  format: "esm",
  target: "esnext",
  sourcemap: true,
  clean: true,
  dts: true,
});
