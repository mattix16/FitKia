// src/native.js: il ponte con l'app Android. Nei test `Capacitor` è un finto che registra le chiamate ai plugin (Filesystem, Share, App).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNativeApp, shareTextFile, onHardwareBack } from '../src/native.js';
import { exportBackup, backupDoneMessage, BACKUP_FAILED_MESSAGE } from '../src/ui/settings.js';
import { getState, resetAll, saveProfile } from '../src/store.js';

/** Un Capacitor finto, installato su globalThis per la durata di `run`. `calls` elenca le chiamate ai plugin, in ordine. */
async function withCapacitor(options, run) {
  const { native = true, files = [], readdirFails = false, shareError = null } = options;
  const calls = [];
  const listeners = {};
  const Filesystem = {
    readdir: async args => { calls.push(['readdir', args]); if (readdirFails) throw new Error('nessuna cartella'); return { files }; },
    deleteFile: async args => { calls.push(['deleteFile', args]); },
    writeFile: async args => { calls.push(['writeFile', args]); return { uri: `file:///cache/${args.path}` }; },
  };
  const Share = { share: async args => { calls.push(['share', args]); if (shareError) throw shareError; return { activityType: 'com.google.android.apps.docs' }; } };
  const App = { addListener: (name, listener) => { calls.push(['addListener', name]); listeners[name] = listener; return Promise.resolve({}); }, exitApp: async () => { calls.push(['exitApp']); } };
  globalThis.Capacitor = { isNativePlatform: () => native, Plugins: { Filesystem, Share, App } };
  try { return await run({ calls, listeners }); } finally { delete globalThis.Capacitor; }
}

const names = calls => calls.map(([name]) => name);

test('isNativeApp: vero solo dentro Capacitor; nel browser (senza Capacitor) o con la web build è falso', async () => {
  assert.equal(isNativeApp(), false);                                                  // browser: window.Capacitor non esiste
  await withCapacitor({ native: true }, () => assert.equal(isNativeApp(), true));
  await withCapacitor({ native: false }, () => assert.equal(isNativeApp(), false));    // Capacitor c'è ma gira sul web
  globalThis.Capacitor = {};
  try { assert.equal(isNativeApp(), false); } finally { delete globalThis.Capacitor; }
});

test('shareTextFile: pulisce i vecchi backup, scrive il file nella cache e apre "Condividi" (in quest\'ordine)', async () => {
  const files = [{ name: 'fitkia-backup-2026-11-12.json' }, { name: 'foto.jpg' }, { name: 'fitkia-backup-2026-11-18.json' }, { name: 'fitkia-backup-x.txt' }];
  await withCapacitor({ files }, async ({ calls }) => {
    assert.equal(await shareTextFile('fitkia-backup-2026-11-19.json', '{"app":"fitkia"}'), 'shared');
    assert.deepEqual(names(calls), ['readdir', 'deleteFile', 'deleteFile', 'writeFile', 'share']);
    assert.deepEqual(calls.filter(([n]) => n === 'deleteFile').map(([, a]) => a.path), ['fitkia-backup-2026-11-12.json', 'fitkia-backup-2026-11-18.json']);   // solo i backup, non gli altri file
    assert.ok(calls.filter(([n]) => n === 'deleteFile').every(([, a]) => a.directory === 'CACHE'));
    assert.deepEqual(calls.find(([n]) => n === 'writeFile')[1], { path: 'fitkia-backup-2026-11-19.json', data: '{"app":"fitkia"}', directory: 'CACHE', encoding: 'utf8' });
    const share = calls.find(([n]) => n === 'share')[1];
    assert.deepEqual(share.files, ['file:///cache/fitkia-backup-2026-11-19.json']);   // l'uri restituito da writeFile
    assert.ok(share.dialogTitle && share.title === 'fitkia-backup-2026-11-19.json');
  });
});

test('shareTextFile: un menu chiuso senza scegliere è "canceled"; ogni altro errore si propaga', async () => {
  await withCapacitor({ shareError: new Error('Share canceled') }, async () => assert.equal(await shareTextFile('b.json', '{}'), 'canceled'));
  const busy = new Error("Can't share while sharing is in progress");
  await withCapacitor({ shareError: busy }, async () => { await assert.rejects(shareTextFile('b.json', '{}'), error => error === busy); });
});

test('shareTextFile: se la pulizia della cache fallisce il backup si fa lo stesso', async () => {
  await withCapacitor({ readdirFails: true }, async ({ calls }) => {
    assert.equal(await shareTextFile('b.json', '{}'), 'shared');
    assert.deepEqual(names(calls), ['readdir', 'writeFile', 'share']);
  });
});

test('shareTextFile: senza i plugin (browser) lancia un errore chiaro invece di fallire in silenzio', async () => {
  await assert.rejects(shareTextFile('b.json', '{}'), /non disponibile/);
});

test('onHardwareBack: nel browser non registra nulla; in Android ascolta "backButton" ed esce solo se il gestore non ha gestito', async () => {
  onHardwareBack(() => true);                                                           // niente Capacitor: nessun errore
  await withCapacitor({ native: false }, ({ calls }) => { onHardwareBack(() => true); assert.deepEqual(calls, []); });

  await withCapacitor({}, ({ calls, listeners }) => {
    onHardwareBack(() => true);
    assert.deepEqual(calls, [['addListener', 'backButton']]);
    listeners.backButton({ canGoBack: false });
    assert.equal(names(calls).includes('exitApp'), false);                              // gestito: l'app resta aperta
  });
  await withCapacitor({}, ({ calls, listeners }) => {
    onHardwareBack(() => false);
    listeners.backButton({ canGoBack: false });
    assert.equal(names(calls).at(-1), 'exitApp');                                       // non gestito: si esce
  });
  await withCapacitor({}, ({ calls, listeners }) => {
    onHardwareBack(() => { throw new Error('bug'); });
    listeners.backButton({ canGoBack: false });
    assert.equal(names(calls).at(-1), 'exitApp');                                       // un errore nel gestore non blocca l'utente
  });
});

// ---------- exportBackup nell'app Android (il percorso browser, con Blob e link, si prova nel browser) ----------
function freshStore() {
  const items = new Map();
  const stub = { items, getItem: key => (items.has(key) ? items.get(key) : null), setItem: (key, value) => { items.set(key, String(value)); }, removeItem: key => { items.delete(key); } };
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
  resetAll();
  saveProfile({ name: 'Ada', age: 30, weightKg: 80, heightCm: 180, sex: 'male', goal: 'lose', activity: 'light' });
}

test('exportBackup (Android): condivide il JSON, ricorda la data e restituisce il nome del file', async () => {
  freshStore();
  assert.equal(getState().meta.lastBackupAt, null);
  await withCapacitor({}, async ({ calls }) => {
    const name = await exportBackup();
    assert.match(name, /^fitkia-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const written = calls.find(([n]) => n === 'writeFile')[1];
    const backup = JSON.parse(written.data);
    assert.equal(backup.app, 'fitkia');
    assert.equal(backup.profile.name, 'Ada');
    assert.equal('meta' in backup, false);                                              // meta non entra nel backup
    assert.ok(getState().meta.lastBackupAt);
    assert.match(backupDoneMessage(name), /^Backup condiviso: /);
  });
  assert.match(backupDoneMessage('x.json'), /^Backup scaricato: /);                    // fuori da Android il file si scarica
});

test('exportBackup (Android): menu chiuso senza scegliere = nessun backup e la data NON cambia; un errore non la cambia', async () => {
  freshStore();
  await withCapacitor({ shareError: new Error('Share canceled') }, async () => {
    assert.equal(await exportBackup(), null);
    assert.equal(getState().meta.lastBackupAt, null);
  });
  await withCapacitor({ shareError: new Error('Unsupported url') }, async () => {
    await assert.rejects(exportBackup(), /Unsupported/);
    assert.equal(getState().meta.lastBackupAt, null);
  });
  assert.ok(BACKUP_FAILED_MESSAGE.length > 0);
});
