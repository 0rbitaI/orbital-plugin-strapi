import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
await build({ entryPoints: ['server/src/index.ts'], outfile: 'dist/server/index.js', bundle: true, platform: 'node', format: 'cjs', target: 'node20', packages: 'external', sourcemap: true });
await build({ entryPoints: ['admin/src/index.ts'], outfile: 'dist/admin/index.mjs', bundle: true, platform: 'browser', format: 'esm', target: 'es2022', packages: 'external', loader: { '.svg': 'dataurl' }, sourcemap: true });
