// @ts-check
import { copyFileSync, readFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { getDirname } from "@mustib/utils/node";

const __rootDirname = path.join(getDirname(import.meta.url), "..");

const packageJson = JSON.parse(
  readFileSync(path.join(__rootDirname, "package.json"), "utf8")
);

delete packageJson.scripts;

packageJson.exports = {
  ".": {
    import: {
      types: "./index.d.ts",
      default: "./index.js",
    },
  },
  "./decorators": {
    import: {
      types: "./decorators.d.ts",
      default: "./decorators.js",
    },
  },
  "./*": {
    import: {
      types: "./*.d.ts",
      default: "./*.js",
    },
  },
};

/**
 *
 * @param {string} outDir
 */
export function copyBuildFiles(outDir) {
  appendFileSync(
    path.join(outDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
  copyFileSync(
    path.join(__rootDirname, "README.md"),
    path.join(outDir, "README.md")
  );
}
