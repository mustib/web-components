import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { defineConfig } from "rollup";
import path from "node:path";
import { getDirname } from "@mustib/utils/node";
import { readdirSync, rmSync, statSync } from "node:fs";
import dts from "rollup-plugin-dts";
import { copyBuildFiles } from "./scripts/copyBuildFiles.js";

const __dirname = getDirname(import.meta.url);
const componentsDir = path.join(__dirname, "src", "web-components");
const outDir = path.join(__dirname, "dist");

rmSync(outDir, { recursive: true, force: true });

const componentsEntries = readdirSync(componentsDir, {
  recursive: true,
  encoding: "utf8",
}).reduce(
  (result, _path) => {
    const parsed = path.parse(_path);
    const fullPath = path.join(componentsDir, _path);
    if (
      statSync(fullPath).isFile() &&
      parsed.name !== "index" &&
      parsed.ext === ".ts"
    ) {
      result[path.join("components", parsed.name)] = fullPath;
    }
    return result;
  },
  {
    index: path.join(componentsDir, "index.ts"),
    decorators: path.join(__dirname, "src", "decorators", "index.ts"),
  }
);

export default defineConfig([
  {
    input: componentsEntries,
    output: {
      dir: outDir,
      format: "esm",
      sourcemap: false,
    },
    external: [/^lit/],
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: path.join(__dirname, "tsconfig.json"),
        compilerOptions: {
          outDir,
        },
      }),
      {
        name: "build-end",
        writeBundle() {
          copyBuildFiles(outDir);
        },
      },
    ],
  },
  {
    input: componentsEntries,
    output: {
      dir: outDir,
      format: "esm",
    },
    plugins: [nodeResolve(), dts()],
  },
]);
