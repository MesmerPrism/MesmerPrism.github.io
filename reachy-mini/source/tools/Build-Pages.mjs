import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import crypto from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length && !(args.length === 2 && args[0] === '--out-dir')) throw Error('Usage: node tools/Build-Pages.mjs [--out-dir directory]');
const outDir = path.resolve(args[1] || path.join(root, 'local/pages'));
const result = await build({ configFile: false, root: path.join(root, 'public-site'), base: '/reachy-mini/', publicDir: false, esbuild: { jsx: 'automatic' }, build: { outDir, emptyOutDir: false }, worker: { format: 'es' } });
const files = new Set((Array.isArray(result) ? result : [result]).flatMap(bundle => bundle.output.map(item => item.fileName)));
// Remove only this builder's obsolete hashed chunks. Never empty a supplied
// output directory or touch the separate source/download release inventory.
const assets = path.join(outDir, 'assets');
for (const file of await fs.readdir(assets, { withFileTypes: true })) {
  if (file.isFile() && /^(?:index|RobotModel|head-tracker(?:\.worker)?|vision_bundle|demo-sdk|reachy-mini-sdk)-[\w-]+\.(?:js|css)$/.test(file.name) && !files.has(`assets/${file.name}`)) await fs.unlink(path.join(assets, file.name));
}
// Explicitly copy only reviewed Apache-2.0 webcam resources, never private CAD/config.
for (const name of ['mediapipe', 'models']) await fs.cp(path.join(root, 'public', name), path.join(outDir, name), { recursive: true });
const manifest = [];
for (const name of [...files].sort()) {
  const bytes=await fs.readFile(path.join(outDir,name));
  manifest.push({path:name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile(path.join(outDir,'build-manifest.json'),JSON.stringify({version:'0.1.0',files:manifest},null,2)+'\n');
console.log('Built static browser controller; no local server or configuration is bundled.');
