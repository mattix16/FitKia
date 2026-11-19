// Il progetto Android (cartella android/): qui non si può compilare (serve Android Studio), quindi si controllano a macchina gli errori
// più probabili: nomi che non combaciano, risorse che puntano a file inesistenti, colori diversi da quelli dell'app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = join(ROOT, 'android');
const MAIN = join(ANDROID, 'app', 'src', 'main');
const RES = join(MAIN, 'res');
const LIBRARY_RES = join(ROOT, 'node_modules', '@capacitor', 'android', 'capacitor', 'src', 'main', 'res');   // colori e stili definiti da Capacitor
const skip = !existsSync(ANDROID) && 'cartella android/ assente (si crea con "npx cap add android")';

const read = (...parts) => readFileSync(join(...parts), 'utf8');
const config = JSON.parse(read(ROOT, 'capacitor.config.json'));
const withoutComments = xml => xml.replace(/<!--[\s\S]*?-->/g, '');
const listDir = dir => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []);
const xmlFiles = dir => listDir(dir).flatMap(entry => (entry.isDirectory() ? xmlFiles(join(dir, entry.name)) : entry.name.endsWith('.xml') ? [join(dir, entry.name)] : []));

test('capacitor.config.json: cartella web www, schema https (cambiarlo azzererebbe i dati degli utenti: localStorage è legato all\'origine)', () => {
  assert.equal(config.webDir, 'www');
  assert.equal(config.server.androidScheme, 'https');
  assert.match(read(ROOT, '.gitignore'), /^www\/$/m);                                                // www/ si rigenera: non si committa
});

test('l\'appId è lo stesso in capacitor.config.json, build.gradle, strings.xml e MainActivity', { skip }, () => {
  const gradle = read(ANDROID, 'app', 'build.gradle');
  assert.match(config.appId, /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/);
  assert.ok(gradle.includes(`applicationId "${config.appId}"`), 'applicationId diverso');
  assert.ok(gradle.includes(`namespace = "${config.appId}"`), 'namespace diverso');
  assert.ok(read(RES, 'values', 'strings.xml').includes(`<string name="package_name">${config.appId}</string>`));
  const activity = join(MAIN, 'java', ...config.appId.split('.'), 'MainActivity.java');
  assert.ok(existsSync(activity), `MainActivity.java non è in java/${config.appId.replaceAll('.', '/')}`);
  assert.ok(read(activity).startsWith(`package ${config.appId};`));
});

test('il backup automatico di Android è disattivato: i dati restano sul dispositivo (promessa di privacy dell\'app)', { skip }, () => {
  assert.match(withoutComments(read(MAIN, 'AndroidManifest.xml')), /android:allowBackup="false"/);
});

test('MainActivity attiva lo schermo intero PRIMA di super.onCreate (come chiede la documentazione di Capacitor 8)', { skip }, () => {
  const source = read(MAIN, 'java', ...config.appId.split('.'), 'MainActivity.java');
  const edgeToEdge = source.indexOf('EdgeToEdge.enable(this);');
  assert.ok(edgeToEdge > 0 && edgeToEdge < source.indexOf('super.onCreate('));
  assert.ok(source.includes('import androidx.activity.EdgeToEdge;'));
});

test('il tema di avvio non ha la barra del titolo: da Android 12 Theme.SplashScreen la riattiva e, a tutto schermo, copre la pagina e dimezza lo spazio sopra la tastiera', { skip }, () => {
  const launch = withoutComments(read(RES, 'values', 'styles.xml')).match(/<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/)?.[0] ?? '';
  assert.match(launch, /<item name="android:windowActionBar">false<\/item>/);
  assert.match(launch, /<item name="android:windowNoTitle">true<\/item>/);
});

test('i commenti dei file XML sono validi: due trattini consecutivi dentro un commento fanno fallire la build di Gradle', { skip }, () => {
  let comments = 0;
  for (const file of [join(MAIN, 'AndroidManifest.xml'), ...xmlFiles(RES)]) {
    for (const [, body] of readFileSync(file, 'utf8').matchAll(/<!--([\s\S]*?)-->/g)) {
      assert.equal(body.includes('--'), false, `${file.replace(ROOT, '')}: il commento contiene "--" (es. un nome come --canvas): "${body.trim().slice(0, 70)}"`);
      assert.equal(body.endsWith('-'), false, `${file.replace(ROOT, '')}: un commento non può finire con un trattino`);
      comments++;
    }
  }
  assert.ok(comments >= 3, `trovati solo ${comments} commenti`);
});

test('ogni risorsa Android a cui il manifest e i file XML fanno riferimento esiste', { skip }, () => {
  const defined = { color: new Set(), string: new Set(), style: new Set() };
  for (const file of [...xmlFiles(RES), ...xmlFiles(LIBRARY_RES)].filter(f => /[\\/]values[^\\/]*[\\/]/.test(f))) {
    for (const [, tag, name] of withoutComments(readFileSync(file, 'utf8')).matchAll(/<(color|string|style)\b[^>]*?\bname="([^"]+)"/g)) defined[tag].add(name);
  }
  const fileNames = type => new Set(listDir(RES).filter(entry => entry.isDirectory() && (entry.name === type || entry.name.startsWith(`${type}-`)))
    .flatMap(entry => listDir(join(RES, entry.name)).map(file => parse(file.name).name)));
  const available = { ...defined, drawable: fileNames('drawable'), mipmap: fileNames('mipmap'), xml: fileNames('xml'), layout: fileNames('layout') };
  // un colore può anche essere un file in color/ (non lo usiamo, ma è lecito)
  for (const name of fileNames('color')) available.color.add(name);

  let checked = 0;
  for (const file of [join(MAIN, 'AndroidManifest.xml'), ...xmlFiles(RES)]) {
    for (const [, type, name] of withoutComments(readFileSync(file, 'utf8')).matchAll(/@(color|string|style|drawable|mipmap|xml|layout)\/([A-Za-z0-9_.]+)/g)) {
      assert.ok(available[type].has(name), `${file.replace(ROOT, '')}: @${type}/${name} non esiste`);
      checked++;
    }
  }
  assert.ok(checked >= 10, `controllati solo ${checked} riferimenti`);
});

test('lo sfondo dell\'app (avvio e dietro la pagina) è quello del tema dell\'app, chiaro e scuro', { skip }, () => {
  const toHex = rgb => '#' + rgb.trim().split(/\s+/).map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  const canvas = [...read(ROOT, 'src', 'styles', 'input.css').matchAll(/--canvas:\s*([\d ]+);/g)].map(match => toHex(match[1]));
  assert.equal(canvas.length, 2, 'attesi due --canvas (chiaro e scuro) in input.css');
  const color = dir => read(RES, dir, 'colors.xml').match(/<color name="app_background">(#[0-9A-Fa-f]{6})<\/color>/)?.[1].toUpperCase();
  assert.equal(color('values'), canvas[0]);
  assert.equal(color('values-night'), canvas[1]);
  const styles = read(RES, 'values', 'styles.xml');
  assert.ok(styles.includes('@color/app_background'));
  assert.equal(styles.includes('@drawable/splash'), false, 'lo splash con il logo di Capacitor non deve tornare');
});

test('le icone Android sono quelle di scripts/make-icons.mjs: quattro PNG per densità, e l\'icona adattiva usa lo sfondo a immagine (la sfumatura)', { skip }, () => {
  for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    for (const file of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png', 'ic_launcher_background.png']) {
      assert.ok(existsSync(join(RES, `mipmap-${density}`, file)), `${density}/${file}: lancia "npm run icons"`);
    }
  }
  for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const adaptive = withoutComments(read(RES, 'mipmap-anydpi-v26', file));
    assert.ok(adaptive.includes('<background android:drawable="@mipmap/ic_launcher_background"/>'), `${file}: lo sfondo deve essere il PNG`);
    assert.equal(adaptive.includes('@color/ic_launcher_background'), false, `${file}: il colore unico dello sfondo non c'è più`);
  }
  assert.equal(existsSync(join(RES, 'values', 'ic_launcher_background.xml')), false, 'il colore unico dello sfondo non serve più: toglilo');
});
