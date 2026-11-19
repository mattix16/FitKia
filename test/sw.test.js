// sw.js: il precache è l'elenco dei file che servono per aprire l'app SENZA rete. Una voce dimenticata = un pezzo dell'app che offline manca;
// una voce a un file inesistente = l'installazione del service worker fallisce (cache.addAll rifiuta tutto). Qui si controlla l'elenco.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
const precache = [...sw.match(/const PRECACHE = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);

const jsFiles = dir => readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => (entry.isDirectory() ? jsFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : []));

test('il precache elenca solo file che esistono, senza doppioni', () => {
  assert.ok(precache.length > 30);
  assert.equal(new Set(precache).size, precache.length, 'voci doppie');
  for (const entry of precache.filter(item => item !== './')) assert.ok(existsSync(join(ROOT, entry)), `${entry} non esiste`);
});

test('il precache include ogni modulo di src/ (altrimenti offline manca un pezzo dell\'app)', () => {
  const modules = jsFiles(join(ROOT, 'src')).map(file => './' + file.slice(ROOT.length + 1).replace(/\\/g, '/'));
  assert.deepEqual(modules.filter(module => !precache.includes(module)), []);
});

test('il precache include pagina, stili, manifest e tutte le icone del manifest', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  for (const needed of ['./', './index.html', './app.css', './manifest.webmanifest', ...manifest.icons.map(icon => './' + icon.src)]) {
    assert.ok(precache.includes(needed), `manca nel precache: ${needed}`);
  }
});

test('il service worker non dipende da altre origini (nessun CDN)', () => {
  assert.doesNotMatch(sw, /https?:\/\//);
});
