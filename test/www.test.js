// scripts/build-www.mjs: la cartella www/ che Capacitor mette dentro l'app Android. Qui si prova in una cartella temporanea.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { buildWww, WEB_FILES, WEB_DIRS } from '../scripts/build-www.mjs';

/** Esegue `run(outDir)` con una cartella temporanea che sparisce alla fine. */
function inTemp(run) {
  const dir = mkdtempSync(join(tmpdir(), 'fitkia-www-'));
  try { return run(join(dir, 'www'), dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

const jsFiles = dir => readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => (entry.isDirectory() ? jsFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : []));

test('www/ contiene SOLO i file dell\'app: niente service worker, test, docs né progetto Android', () => inTemp(out => {
  buildWww(out);
  assert.deepEqual(readdirSync(out).sort(), [...WEB_FILES, ...WEB_DIRS].sort());
  for (const unwanted of ['sw.js', 'test', 'docs', 'node_modules', 'android', 'package.json', 'e2e', 'scripts']) {
    assert.equal(existsSync(join(out, unwanted)), false, unwanted);
  }
}));

test('ogni file che index.html carica esiste in www, e nessuno è esterno (niente CDN: l\'app deve funzionare senza rete)', () => inTemp(out => {
  buildWww(out);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/<(?:link|script|img)\b[^>]*?\b(?:href|src)="([^"]+)"/g)].map(match => match[1]);
  assert.ok(refs.includes('app.css') && refs.includes('src/main.js'), `riferimenti trovati: ${refs.join(', ')}`);
  for (const ref of refs) {
    assert.equal(/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(ref), false, `risorsa esterna in index.html: ${ref}`);
    assert.ok(existsSync(join(out, ref)), `index.html carica ${ref}, ma manca in www`);
  }
}));

test('le icone del manifest esistono in www', () => inTemp(out => {
  buildWww(out);
  const manifest = JSON.parse(readFileSync(join(out, 'manifest.webmanifest'), 'utf8'));
  assert.ok(manifest.icons.length >= 3);
  for (const icon of manifest.icons) assert.ok(existsSync(join(out, icon.src)), icon.src);
}));

test('ogni modulo che il codice importa con un percorso relativo esiste in www (nessun import rotto)', () => inTemp(out => {
  buildWww(out);
  const pattern = /(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let checked = 0;
  for (const file of jsFiles(join(out, 'src'))) {
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
      const specifier = match[1] ?? match[2] ?? match[3];
      if (!specifier.startsWith('.')) assert.fail(`${file}: import "${specifier}" non relativo: senza bundler il browser non lo risolve`);
      assert.ok(existsSync(resolve(dirname(file), specifier)), `${file.replace(out, 'www')}: manca ${specifier}`);
      checked++;
    }
  }
  assert.ok(checked > 40, `controllati solo ${checked} import`);
}));

test('buildWww riparte da zero: un file che non esiste più nel progetto sparisce anche da www', () => inTemp(out => {
  buildWww(out);
  writeFileSync(join(out, 'vecchio.js'), '// file di una build precedente');
  mkdirSync(join(out, 'src', 'vecchia-cartella'), { recursive: true });
  buildWww(out);
  assert.equal(existsSync(join(out, 'vecchio.js')), false);
  assert.equal(existsSync(join(out, 'src', 'vecchia-cartella')), false);
}));

test('senza app.css la build si ferma con un messaggio che dice cosa fare', () => inTemp((out, dir) => {
  assert.throws(() => buildWww(out, dir), /build:css/);                       // `dir` è una cartella senza app.css
}));
