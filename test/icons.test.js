// scripts/make-icons.mjs: le icone (PWA e Android) generate da un unico disegno. Si controllano misure, trasparenze e "zona sicura".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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

test('le icone PWA: 192 e 512 (anche maskable), a tutto campo e nel colore del tema', () => inTemp(async root => {
  await makeIcons(root);
  for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['maskable-512.png', 512]]) {
    const path = join(root, 'icons', file);
    const { width, height } = await sharp(path).metadata();
    assert.deepEqual([width, height], [size, size], file);
    const image = await pixels(path);
    assert.equal(alphaAt(image, 0, 0), 255, `${file}: l'angolo deve essere pieno (a tutto campo)`);
    assert.equal(hex(image, 0, 0), COLORS.background, file);
  }
}));

test('Android: tutte le densità hanno icona classica, tonda e primo piano della misura giusta (48 dp e 108 dp)', () => inTemp(async root => {
  await makeIcons(root);
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [density, scale] of Object.entries(densities)) {
    for (const [file, dp] of [['ic_launcher.png', 48], ['ic_launcher_round.png', 48], ['ic_launcher_foreground.png', 108]]) {
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
  assert.equal(alphaAt(foreground, 0, 0), 0, 'il primo piano deve avere lo sfondo trasparente (lo sfondo è un colore a parte)');
}));

test('Android: l\'icona tonda e quella classica hanno gli angoli trasparenti; lo sfondo dell\'icona adattiva è il colore del tema', () => inTemp(async root => {
  await makeIcons(root);
  const round = await pixels(join(res(root), 'mipmap-xxxhdpi', 'ic_launcher_round.png'));
  const classic = await pixels(join(res(root), 'mipmap-xxxhdpi', 'ic_launcher.png'));
  assert.equal(alphaAt(round, 0, 0), 0);
  assert.equal(alphaAt(round, round.width / 2, round.height / 2), 255);
  assert.equal(alphaAt(classic, 0, 0), 0);                                                            // angoli arrotondati
  assert.equal(alphaAt(classic, classic.width / 2, 5), 255);                                          // ma il bordo al centro è pieno
  const background = readFileSync(join(res(root), 'values', 'ic_launcher_background.xml'), 'utf8');
  assert.match(background, new RegExp(`<color name="ic_launcher_background">${COLORS.background}</color>`));
}));

test('senza la cartella android/ si scrivono solo le icone PWA', () => inTemp(async root => {
  const written = await makeIcons(root);
  assert.equal(written.length, 3);
  assert.ok(written.every(file => file.startsWith('/icons/')));
}, { android: false }));
