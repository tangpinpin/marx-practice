import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputSource = resolve(project, '..', 'outputs');
const source = await access(resolve(outputSource, 'index.html')).then(() => outputSource, () => resolve(project, '..'));
const destination = resolve(project, 'www');
const files = [
  'index.html',
  'styles.css',
  'app.js',
  'questions.js',
  'manifest.json',
  'service-worker.js',
  'icon.svg',
];

await mkdir(destination, { recursive: true });
for (const file of files) await copyFile(resolve(source, file), resolve(destination, file));
const html = await readFile(resolve(destination, 'index.html'), 'utf8');
await writeFile(resolve(destination, 'index.html'), html.replace(
  '<script src="questions.js"></script>',
  '<script type="module" src="native-export.js"></script><script src="questions.js"></script>',
));
await build({
  entryPoints: [resolve(project, 'scripts', 'native-export.mjs')],
  outfile: resolve(destination, 'native-export.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  minify: true,
});
console.log(`Copied ${files.length} web assets to ${destination}`);
