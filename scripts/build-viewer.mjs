import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';

await build({
  entryPoints:['scripts/lectern-viewer.mjs'],
  outfile:'public/lectern-viewer.js',
  bundle:true,
  format:'esm',
  minify:true,
  target:['es2022'],
  legalComments:'eof'
});
await copyFile('node_modules/three/LICENSE','public/three-LICENSE.txt');
