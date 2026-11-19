// Genera le icone dell'app (PWA e Android) da UN solo disegno. "npm run icons" le rigenera: per cambiare colori o forma si modifica
// QUESTO file e si rilancia il comando (poi "npm run android:sync" per portarle nell'app).
// Il disegno è l'anello delle calorie della Home: un anello con un tratto più chiaro (l'"avanzamento") e un punto al centro.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Colori dalla palette dell'app (src/styles/input.css, tema chiaro): "brand" è il blu dell'anello della Home.
export const COLORS = { background: '#7AA2F7', ring: '#FFFFFF', arc: '#CBDBFB', dot: '#FFFFFF' };

/**
 * SVG dell'icona su una tela quadrata di `size` px (il disegno è su una griglia di 1024).
 * L'anello misura il 60% della tela: sta nella "zona sicura" delle icone adattive di Android (cerchio del 66%) e di quelle
 * "maskable" delle PWA (80%), qualunque maschera applichi il telefono.
 * @param {number} size lato in pixel
 * @param {{ background?: boolean }} [options] background=false: solo il disegno, su fondo trasparente (primo piano dell'icona adattiva)
 */
export function iconSvg(size, { background = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">
  ${background ? `<rect width="1024" height="1024" fill="${COLORS.background}"/>` : ''}
  <circle cx="512" cy="512" r="270" fill="none" stroke="${COLORS.ring}" stroke-width="76"/>
  <path d="M512 242A270 270 0 0 0 246.1 558.9" fill="none" stroke="${COLORS.arc}" stroke-width="76"/>
  <circle cx="512" cy="512" r="46" fill="${COLORS.dot}"/>
</svg>`;
}

const mask = (size, radius) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`);

/** PNG dell'icona con gli angoli arrotondati di `radiusRatio` (0 = quadrata, 0.5 = cerchio). */
async function png(size, { background = true, radiusRatio = 0 } = {}) {
  let image = sharp(Buffer.from(iconSvg(size, { background })));
  if (radiusRatio > 0) image = image.composite([{ input: mask(size, size * radiusRatio), blend: 'dest-in' }]);
  return image.png({ compressionLevel: 9 }).toBuffer();
}

/** Scrive un file (creando le cartelle) e restituisce il suo percorso relativo a `root`, es. "/icons/icon-192.png". */
const writeIn = root => (path, buffer) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, buffer); return path.slice(root.length).replace(/\\/g, '/'); };

/** Scrive tutte le icone. Quelle Android solo se la cartella android/ esiste (si crea con "npx cap add android"). */
export async function makeIcons(root = ROOT) {
  const write = writeIn(root);
  const written = [];

  // PWA: icone "qualsiasi" e "maskable" (a tutto campo: il telefono applica la sua maschera)
  for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['maskable-512.png', 512]]) {
    written.push(write(join(root, 'icons', name), await png(size)));
  }

  const res = join(root, 'android', 'app', 'src', 'main', 'res');
  if (!existsSync(res)) return written;

  // Android: icona classica (Android 7.1 e precedenti), tonda, e primo piano dell'icona adattiva (Android 8+, 108 dp)
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [density, scale] of Object.entries(densities)) {
    const dir = join(res, `mipmap-${density}`);
    written.push(write(join(dir, 'ic_launcher.png'), await png(Math.round(48 * scale), { radiusRatio: 0.22 })));
    written.push(write(join(dir, 'ic_launcher_round.png'), await png(Math.round(48 * scale), { radiusRatio: 0.5 })));
    written.push(write(join(dir, 'ic_launcher_foreground.png'), await png(Math.round(108 * scale), { background: false })));
  }
  // Lo sfondo dell'icona adattiva è un colore (il primo piano è quello trasparente qui sopra)
  written.push(write(join(res, 'values', 'ic_launcher_background.xml'),
    Buffer.from(`<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${COLORS.background}</color>\n</resources>\n`)));
  return written;
}

// Eseguito direttamente (npm run icons): scrive le icone. Importato da altri file: non fa nulla.
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = await makeIcons();
  console.log(`${files.length} file scritti:\n  ${files.join('\n  ')}`);
}
