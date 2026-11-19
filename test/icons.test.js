// scripts/make-icons.mjs: le icone (PWA e Android) generate da un unico disegno. Si controllano misure, trasparenze e "zona sicura".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { makeIcons, COLORS } from '../scripts/make-icons.mjs';

/** Una cartella di progetto temporanea (con o senza la cartella android/) in cui generare le icone. */
async function inTemp(run, { android = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'fitkia-icons-'));
  if (android) mkdirSync(join(root, 'android', 'app', 'src', 'main', 'res'), { recursive: true });
  try { return await run(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

const res = root => join(root, 'android', 'app', 'src', 'main', 'res');
const pixels = async path => { const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, width: info.width, height: info.height }; };
const alphaAt = ({ data, width }, x, y) => data[(y * width + x) * 4 + 3];
const hex = ({ data, width }, x, y) => '#' + [0, 1, 2].map(i => data[(y * width + x) * 4 + i].toString(16).padStart(2, '0')).join('').toUpperCase();

/** Distanza fra due colori "#RRGGBB" nello spazio RGB (0 = uguali, ~441 = nero contro bianco). */
const distance = (a, b) => Math.hypot(...[1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)));

test('le icone PWA: 192 e 512 (anche maskable), a tutto campo e con i colori della sfumatura agli angoli', () => inTemp(async root => {
  await makeIcons(root);
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['maskable-512.png', 512]]) {
    const path = join(root, 'icons', file);
    const { width, height } = await sharp(path).metadata();
    assert.deepEqual([width, height], [size, size], file);
    const image = await pixels(path);
    for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) assert.equal(alphaAt(image, x, y), 255, `${file}: l'angolo ${x},${y} deve essere pieno (a tutto campo)`);
    assert.ok(distance(hex(image, 0, 0), COLORS.start) < 80, `${file}: in alto a sinistra ${hex(image, 0, 0)} è lontano da ${COLORS.start}`);
    assert.ok(distance(hex(image, size - 1, size - 1), COLORS.end) < 80, `${file}: in basso a destra ${hex(image, size - 1, size - 1)} è lontano da ${COLORS.end}`);
  }
}));

test('Android: tutte le densità hanno icona classica, tonda, primo piano e sfondo della misura giusta (48 dp e 108 dp)', () => inTemp(async root => {
  await makeIcons(root);
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [density, scale] of Object.entries(densities)) {
    for (const [file, dp] of [['ic_launcher.png', 48], ['ic_launcher_round.png', 48], ['ic_launcher_foreground.png', 108], ['ic_launcher_background.png', 108]]) {
      const { width, height } = await sharp(join(res(root), `mipmap-${density}`, file)).metadata();
      assert.deepEqual([width, height], [Math.round(dp * scale), Math.round(dp * scale)], `${density}/${file}`);
    }
  }
}));

test('Android: il disegno del primo piano sta nella ZONA SICURA delle icone adattive (cerchio di 72 dp su 108), qualunque maschera applichi il telefono', () => inTemp(async root => {
  await makeIcons(root);
  const foreground = await pixels(join(res(root), 'mipmap-xxxhdpi', 'ic_launcher_foreground.png'));   // 432 px = 108 dp x 4
  const center = foreground.width / 2;
  const safeRadius = 36 * 4;                                                                          // 72 dp di diametro, a 4 px per dp
  let farthest = 0, opaque = 0;
  for (let y = 0; y < foreground.height; y++) {
    for (let x = 0; x < foreground.width; x++) {
      if (alphaAt(foreground, x, y) > 0) { opaque++; farthest = Math.max(farthest, Math.hypot(x + 0.5 - center, y + 0.5 - center)); }
    }
  }
  assert.ok(opaque > 5000, `primo piano quasi vuoto (${opaque} pixel)`);
  assert.ok(farthest <= safeRadius, `il disegno arriva a ${farthest.toFixed(1)} px dal centro: oltre la zona sicura (${safeRadius} px), verrebbe tagliato`);
  assert.ok(farthest > safeRadius * 0.8, 'il disegno è troppo piccolo rispetto alla zona sicura');
  assert.equal(alphaAt(foreground, 0, 0), 0, 'il primo piano deve avere lo sfondo trasparente (lo sfondo è un livello a parte)');
}));

test('Android: l\'icona tonda e quella classica hanno gli angoli trasparenti; lo sfondo dell\'icona adattiva è tutto opaco e va dalla sfumatura di inizio a quella di fine', () => inTemp(async root => {
  await makeIcons(root);
  const round = await pixels(join(res(root), 'mipmap-xxxhdpi', 'ic_launcher_round.png'));
  const classic = await pixels(join(res(root), 'mipmap-xxxhdpi', 'ic_launcher.png'));
  assert.equal(alphaAt(round, 0, 0), 0);
  assert.equal(alphaAt(round, round.width / 2, round.height / 2), 255);
  assert.equal(alphaAt(classic, 0, 0), 0);                                                            // angoli arrotondati
  assert.equal(alphaAt(classic, classic.width / 2, 5), 255);                                          // ma il bordo al centro è pieno
  const background = await pixels(join(res(root), 'mipmap-xxxhdpi', 'ic_launcher_background.png'));  // 432 px = 108 dp x 4: il livello sotto, tutto pieno
  for (const [x, y] of [[0, 0], [431, 0], [0, 431], [431, 431], [216, 216]]) assert.equal(alphaAt(background, x, y), 255, `sfondo trasparente in ${x},${y}`);
  assert.ok(distance(hex(background, 0, 0), COLORS.start) < 80, 'in alto a sinistra lo sfondo non è il colore di inizio della sfumatura');
  assert.ok(distance(hex(background, 431, 431), COLORS.end) < 80, 'in basso a destra lo sfondo non è il colore di fine della sfumatura');
  assert.equal(existsSync(join(res(root), 'values', 'ic_launcher_background.xml')), false, 'il colore unico dello sfondo non serve più');
}));

test('senza la cartella android/ si scrivono solo le icone PWA', () => inTemp(async root => {
  const written = await makeIcons(root);
  assert.equal(written.length, 3);
  assert.ok(written.every(file => file.startsWith('/icons/')));
}, { android: false }));
