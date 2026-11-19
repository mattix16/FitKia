// Prepara la cartella www/ per Capacitor: SOLO i file che servono all'app dentro la WebView di Android.
// Niente test, docs, node_modules né sw.js: nell'app nativa il service worker non serve (i file sono già nel pacchetto).
// Si lancia con "npm run build:www" (che prima rigenera app.css); android:sync lo fa da sé.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..');

/** I file e le cartelle dell'app che finiscono in www/. Un file nuovo fuori da queste voci NON arriva nell'app: aggiungilo qui. */
export const WEB_FILES = ['index.html', 'app.css', 'manifest.webmanifest'];
export const WEB_DIRS = ['src', 'icons'];

/**
 * Ricrea `outDir` da zero con i file dell'app. Da zero, così un file cancellato dal progetto sparisce anche dall'app.
 * @param {string} [outDir] cartella di destinazione (di default www/)
 * @param {string} [rootDir] cartella del progetto (si cambia solo nei test)
 */
export function buildWww(outDir = join(ROOT, 'www'), rootDir = ROOT) {
  if (!existsSync(join(rootDir, 'app.css'))) {
    throw new Error('Manca app.css: lancia prima "npm run build:css" (oppure usa "npm run build:www", che lo fa da solo).');
  }
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const file of WEB_FILES) cpSync(join(rootDir, file), join(outDir, file));
  for (const dir of WEB_DIRS) cpSync(join(rootDir, dir), join(outDir, dir), { recursive: true });
  return outDir;
}

// Eseguito direttamente (node scripts/build-www.mjs): fa la build. Importato dai test: non fa nulla.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = buildWww();
  console.log(`www/ pronta: ${WEB_FILES.join(', ')}, ${WEB_DIRS.map(d => d + '/').join(', ')} -> ${out}`);
}
