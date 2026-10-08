import sharp from 'sharp';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const res = resolve(project, 'android', 'app', 'src', 'main', 'res');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

const logo = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#102a43"/>
  <path d="M126 130h260v54H126zM126 229h260v54H126zM126 328h164v54H126z" fill="#56d6c8"/>
</svg>`;
const foreground = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <path d="M126 130h260v54H126zM126 229h260v54H126zM126 328h164v54H126z" fill="#56d6c8"/>
</svg>`;

for (const [density, size] of Object.entries(sizes)) {
  const dir = resolve(res, `mipmap-${density}`);
  await sharp(Buffer.from(logo)).resize(size, size).png().toFile(resolve(dir, 'ic_launcher.png'));
  await sharp(Buffer.from(logo)).resize(size, size).png().toFile(resolve(dir, 'ic_launcher_round.png'));
  await sharp(Buffer.from(foreground)).resize(size * 2, size * 2).png().toFile(resolve(dir, 'ic_launcher_foreground.png'));
}
console.log('Generated Android launcher icons');
