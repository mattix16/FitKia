// Genera le icone dell'app (PWA e Android) da UN solo disegno. "npm run icons" le rigenera: per cambiare colori o forma si modifica
// QUESTO file e si rilancia il comando (poi "npm run android:sync" per portarle nell'app).
// Il disegno è in vetro, come la tab bar "Liquid Glass" dell'app: una lastra di vetro smerigliato su una sfumatura (lilla, blu, azzurro: i colori
// "accent", "brand" e "water" di input.css) con dentro l'anello delle calorie della Home e una goccia al centro.
// Tre livelli dallo stesso SVG: SFONDO (sfumatura, riflesso e ombra della lastra), PRIMO PIANO (la lastra, l'anello, la goccia, su fondo
// trasparente) e COMPLETA (i due insieme). Android 8+ compone sfondo e primo piano da sé (icona adattiva, con la maschera del telefono).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Colori dalla palette dell'app (src/styles/input.css, tema chiaro): "accent", "brand" e "water". La sfumatura corre in diagonale, da alto a sinistra a basso a destra.
export const COLORS = { start: '#A7A0F0', middle: '#7AA2F7', end: '#7DC8F0' };

// Il disegno è su una griglia di 1024. La lastra è il 55% della tela e l'angolo più lontano dal centro sta a 321 unità: dentro la "zona sicura" delle
// icone adattive di Android (cerchio di 72 dp su 108 = 341 unità) e di quelle "maskable" delle PWA, qualunque maschera applichi il telefono.
// Nel primo piano NIENTE ombre fuori dalla lastra (ogni pixel non trasparente deve restare nella zona sicura): l'ombra sta nello sfondo.
const TILE = { x: 232, y: 232, size: 560, radius: 180 };
const RING = { cx: 512, cy: 512, r: 150, width: 58 };
const DROP = 'M512 452C546 488 556 526 538 552C526 570 498 570 486 552C468 526 478 488 512 452Z';   // la goccia, alta ~118: la scala la porta a ~150

const DEFS = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.start}"/><stop offset=".55" stop-color="${COLORS.middle}"/><stop offset="1" stop-color="${COLORS.end}"/></linearGradient>
  <radialGradient id="glow" cx=".22" cy=".12" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".16"/></linearGradient>
  <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#1E2A7A" stop-opacity="0"/><stop offset="1" stop-color="#1E2A7A" stop-opacity=".28"/></linearGradient>
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity=".55"/></linearGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="24"/></filter>`;

const background = () => `
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <rect x="${TILE.x}" y="${TILE.y + 22}" width="${TILE.size}" height="${TILE.size}" rx="${TILE.radius}" fill="#1B2670" fill-opacity=".38" filter="url(#soft)"/>`;

// Arco dell'anello: parte dall'alto e gira in senso orario per 270 gradi, fino al punto a sinistra (resta aperto in alto a sinistra, come l'anello della Home).
const ringArc = `M${RING.cx} ${RING.cy - RING.r}A${RING.r} ${RING.r} 0 1 1 ${RING.cx - RING.r} ${RING.cy}`;

const foreground = () => `
  <rect x="${TILE.x}" y="${TILE.y}" width="${TILE.size}" height="${TILE.size}" rx="${TILE.radius}" fill="url(#glass)"/>
  <rect x="${TILE.x}" y="${TILE.y}" width="${TILE.size}" height="${TILE.size}" rx="${TILE.radius}" fill="url(#depth)"/>
  <rect x="${TILE.x + 3}" y="${TILE.y + 3}" width="${TILE.size - 6}" height="${TILE.size - 6}" rx="${TILE.radius - 3}" fill="none" stroke="url(#rim)" stroke-width="6"/>
  <circle cx="${RING.cx}" cy="${RING.cy}" r="${RING.r}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="${RING.width}"/>
  <path d="${ringArc}" fill="none" stroke="#fff" stroke-width="${RING.width}" stroke-linecap="round"/>
  <path transform="translate(512 512) scale(1.3) translate(-512 -512)" d="${DROP}" fill="#fff"/>`;

/**
 * SVG dell'icona su una tela quadrata di `size` px (il disegno è su una griglia di 1024).
 * @param {number} size lato in pixel
 * @param {{ layer?: 'full' | 'background' | 'foreground' }} [options] full = sfondo + primo piano (icone PWA e classiche);
 *   background = solo la sfumatura con riflesso e ombra della lastra, tutta opaca; foreground = solo lastra, anello e goccia, su fondo trasparente
 */
export function iconSvg(size, { layer = 'full' } = {}) {
  const body = layer === 'background' ? background() : layer === 'foreground' ? foreground() : background() + foreground();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024"><defs>${DEFS}</defs>${body}</svg>`;
}

const mask = (size, radius) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`);

/** PNG dell'icona (un livello) con gli angoli arrotondati di `radiusRatio` (0 = quadrata, 0.5 = cerchio). */
async function png(size, { layer = 'full', radiusRatio = 0 } = {}) {
  let image = sharp(Buffer.from(iconSvg(size, { layer })));
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

  // Android: icona classica (Android 7.1 e precedenti), tonda, e i due livelli dell'icona adattiva (Android 8+, 108 dp): sfondo e primo piano
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [density, scale] of Object.entries(densities)) {
    const dir = join(res, `mipmap-${density}`);
    written.push(write(join(dir, 'ic_launcher.png'), await png(Math.round(48 * scale), { radiusRatio: 0.22 })));
    written.push(write(join(dir, 'ic_launcher_round.png'), await png(Math.round(48 * scale), { radiusRatio: 0.5 })));
    written.push(write(join(dir, 'ic_launcher_foreground.png'), await png(Math.round(108 * scale), { layer: 'foreground' })));
    written.push(write(join(dir, 'ic_launcher_background.png'), await png(Math.round(108 * scale), { layer: 'background' })));
  }
  return written;
}

// Eseguito direttamente (npm run icons): scrive le icone. Importato da altri file: non fa nulla.
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = await makeIcons();
  console.log(`${files.length} file scritti:\n  ${files.join('\n  ')}`);
}
