import { rmSync } from 'node:fs';
import path from 'node:path';
import { getDirname } from '@mustib/utils/node';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';
import { copyBuildFiles } from './scripts/copyBuildFiles.js';

const __dirname = getDirname(import.meta.url);
const componentsDir = path.join(__dirname, 'src', 'web-components');
const outDir = path.join(__dirname, 'dist');

rmSync(outDir, { recursive: true, force: true });

/**
 * Array of entry path relative to `componentsDir` and export path
 */
const exportedPaths = [
  ['index.ts', 'index'],
  ['mu-element.ts', 'components/mu-element'],
  ['mu-icon.ts', 'components/mu-icon'],
  ['mu-trigger.ts', 'components/mu-trigger'],
  ['mu-transparent.ts', 'components/mu-transparent'],
  ['mu-range/mu-range.ts', 'components/mu-range'],
  ['mu-range/mu-range-fill.ts', 'components/mu-range-fill'],
  ['mu-range/mu-range-thumb.ts', 'components/mu-range-thumb'],
  ['mu-range/mu-range-thumb-value.ts', 'components/mu-range-thumb-value'],
  ['mu-select/mu-select.ts', 'components/mu-select'],
  ['mu-select/mu-select-item.ts', 'components/mu-select-item'],
  ['mu-select/mu-select-items.ts', 'components/mu-select-items'],
  ['mu-select/mu-select-label.ts', 'components/mu-select-label'],
  [
    'mu-select/mu-select-label-content.ts',
    'components/mu-select-label-content',
  ],
  ['mu-sortable/mu-sortable.ts', 'components/mu-sortable'],
  ['mu-sortable/mu-sortable-trigger.ts', 'components/mu-sortable-trigger'],
  ['mu-sortable/mu-sortable-item.ts', 'components/mu-sortable-item'],
  ['mu-toast/mu-toast.ts', 'components/mu-toast'],
  ['mu-toast/mu-toast-item.ts', 'components/mu-toast-item'],
  ['mu-toast/Toast.ts', 'utils/Toast'],
  ['mu-toast/ToastController.ts', 'utils/ToastController'],
];

const componentsEntries = exportedPaths.reduce(
  (result, [entry, exportPath]) => {
    result[exportPath] = path.join(componentsDir, entry);
    return result;
  },
  {},
);

export default defineConfig([
  {
    input: componentsEntries,
    output: {
      dir: outDir,
      format: 'esm',
      sourcemap: false,
    },
    external: [/^lit/],
    plugins: [
      nodeResolve(),
      typescript({
        tsconfig: path.join(__dirname, 'tsconfig.json'),
        compilerOptions: {
          outDir,
        },
      }),
      {
        name: 'build-end',
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
      format: 'esm',
    },
    plugins: [nodeResolve(), dts()],
  },
]);
