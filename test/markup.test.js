// index.html e input.css: controlli statici (senza DOM) sugli errori più facili quando si cambia il markup:
// id che spariscono mentre il JS li cerca ancora, <dialog> che restano sempre aperte, barra in basso senza l'id su cui lavora il CSS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const css = readFileSync(join(ROOT, 'src', 'styles', 'input.css'), 'utf8');
const jsFiles = dir => readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => (entry.isDirectory() ? jsFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : []));

// Id che il JS cerca ma che NON stanno in index.html perché li crea lui stesso (scrivere qui il motivo di ognuno).
const DYNAMIC_IDS = new Set([
  'weight-guide',   // la riga guida del grafico: la disegna ui/weight.js dentro l'SVG, a ogni ridisegno
]);

test('ogni id che il JS cerca con $(\'…\') o getElementById(\'…\') esiste in index.html', () => {
  const wanted = new Set();
  for (const file of jsFiles(join(ROOT, 'src'))) {
    for (const [, id] of readFileSync(file, 'utf8').matchAll(/(?:\$|getElementById)\('([A-Za-z0-9_-]+)'\)/g)) wanted.add(id);
  }
  assert.ok(wanted.size > 40, `trovati solo ${wanted.size} id: l'espressione regolare non funziona più?`);
  assert.deepEqual([...wanted].filter(id => !DYNAMIC_IDS.has(id) && !html.includes(`id="${id}"`)), []);
});

test('nessuna <dialog> ha un display suo: flex, grid o block la terrebbero sempre aperta (si usa open:flex)', () => {
  const dialogs = [...html.matchAll(/<dialog\b[^>]*\bclass="([^"]*)"/g)].map(match => match[1].split(/\s+/));
  assert.ok(dialogs.length >= 4, `trovate solo ${dialogs.length} <dialog>`);
  for (const classes of dialogs) {
    assert.deepEqual(classes.filter(name => ['flex', 'grid', 'block', 'inline-flex', 'inline-block', 'contents'].includes(name)), []);
  }
});

test('il foglio "Aggiungi alimento" ha tre fasce in quest\'ordine: intestazione con ricerca, centro che scorre, piede con grammi e "Aggiungi"', () => {
  const order = ['food-search', 'food-scroll', 'food-results', 'custom-food-details', 'food-entries', 'favorite-form', 'food-undo', 'food-picker', 'food-grams', 'food-add'];
  const positions = order.map(id => html.indexOf(`id="${id}"`));
  assert.deepEqual(order.filter((id, index) => positions[index] < 0), [], 'id mancanti nel foglio');
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), 'le fasce non sono nell\'ordine intestazione, centro, piede');
});

test('non ci sono più <select> né fillOptions: le scelte sono schede (il menu grigio di Android non deve tornare)', () => {
  assert.equal(/<select\b/.test(html), false, 'c\'è ancora una <select> in index.html');
  const stragglers = jsFiles(join(ROOT, 'src')).filter(file => /fillOptions|new Option\(/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(stragglers.map(file => file.slice(ROOT.length + 1)), []);
});

test('la barra in basso ha id="main-nav" e il CSS la ritira quando c\'è la tastiera (html[data-keyboard])', () => {
  assert.match(html, /<nav\b[^>]*\bid="main-nav"/);
  assert.ok(css.includes('html[data-keyboard] #main-nav'));
});
