/**
 * Erzeugt die PWA-/Apple-Icons aus public/icon.svg (sharp).
 *   node scripts/gen-icons.mjs   (npm run icons)
 */
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const outDir = path.join(publicDir, 'icons');

const svg = await readFile(path.join(publicDir, 'icon.svg'), 'utf8');
const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
const mark = svg.match(/<g id="mark">[\s\S]*?<\/g>/)?.[0];
if (!defs || !mark) throw new Error('public/icon.svg: <defs> oder <g id="mark"> nicht gefunden');

/**
 * Vollflächiges Quadrat (ohne runde Ecken – iOS/Android maskieren selbst) mit dem Logo,
 * skaliert auf `scale`, damit es in der Safe-Zone (innerer Kreis, 80 %) liegt.
 */
const fullBleed = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${defs}` +
  `<rect width="512" height="512" fill="url(#bg)"/><rect width="512" height="512" fill="url(#glow)"/>` +
  `<g transform="translate(256 256) scale(${scale}) translate(-256 -248)">${mark}</g></svg>`;

const jobs = [
  { file: 'icon-192.png', src: svg, size: 192 },
  { file: 'icon-512.png', src: svg, size: 512 },
  { file: 'maskable-512.png', src: fullBleed(0.76), size: 512, opaque: true },
  { file: 'apple-touch-icon.png', src: fullBleed(0.86), size: 180, opaque: true },
  { file: 'favicon-32.png', src: svg, size: 32 },
];

await mkdir(outDir, { recursive: true });
for (const job of jobs) {
  // Mit höherer Dichte rastern und herunterskalieren → scharfe Kanten auch bei kleinen Größen.
  let img = sharp(Buffer.from(job.src), { density: 288 }).resize(job.size, job.size, { kernel: 'lanczos3' });
  if (job.opaque) img = img.flatten({ background: '#0D111D' });
  await img.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.join(outDir, job.file));
  console.log(`✓ public/icons/${job.file} (${job.size}×${job.size})`);
}
