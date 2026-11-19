// Unico file che parla con l'app Android (Capacitor), come storage.js è l'unico che tocca localStorage.
// Nel browser e nella PWA ogni funzione ha un ripiego o non fa nulla: lo stesso codice gira ovunque.
//
// L'app non usa un bundler, quindi i plugin Capacitor NON si importano: li inietta il ponte nativo in `window.Capacitor.Plugins`
// (Filesystem, Share e App, installati con npm e registrati da "npx cap sync"). `Capacitor` si legge al momento della CHIAMATA,
// mai all'import: nel browser non esiste, e nei test lo si sostituisce con un finto.

const capacitor = () => globalThis.Capacitor;
const plugin = name => capacitor()?.Plugins?.[name] ?? null;

/** true solo dentro l'app Android (Capacitor); false nel browser, nella PWA e nei test. */
export const isNativeApp = () => Boolean(capacitor()?.isNativePlatform?.());

const BACKUP_FILE = /^fitkia-backup-.*\.json$/;

/**
 * Toglie dalla cache i backup condivisi in passato: contengono dati di salute e non devono accumularsi.
 * Si chiama PRIMA di scrivere il nuovo, mai dopo la condivisione: l'app che lo riceve potrebbe non aver ancora letto il file.
 * Best effort: un errore qui non blocca il backup.
 */
async function removeOldBackups(Filesystem) {
  try {
    const { files } = await Filesystem.readdir({ path: '', directory: 'CACHE' });
    await Promise.all(files.filter(file => BACKUP_FILE.test(file.name)).map(file => Filesystem.deleteFile({ path: file.name, directory: 'CACHE' })));
  } catch { /* niente da pulire */ }
}

/**
 * Salva `text` in un file e apre il menu "Condividi" di Android (Drive, e-mail, Telegram...): da lì l'utente lo salva dove vuole.
 * Serve perché il download con Blob + link, che nel browser funziona, nella WebView di Android non scarica nulla.
 * @param {string} filename es. "fitkia-backup-2026-11-19.json"
 * @param {string} text contenuto del file (UTF-8)
 * @returns {Promise<'shared' | 'canceled'>} 'canceled' se l'utente chiude il menu senza scegliere. Gli altri errori si propagano.
 */
export async function shareTextFile(filename, text) {
  const Filesystem = plugin('Filesystem');
  const Share = plugin('Share');
  if (!Filesystem || !Share) throw new Error('Condivisione non disponibile su questo dispositivo.');
  await removeOldBackups(Filesystem);
  const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: 'CACHE', encoding: 'utf8' });
  try {
    await Share.share({ title: filename, dialogTitle: 'Salva o invia il backup', files: [uri] });
    return 'shared';
  } catch (error) {
    if (/cancel/i.test(String(error?.message ?? error))) return 'canceled';   // Android: "Share canceled"
    throw error;
  }
}

/**
 * Tasto "indietro" di Android. `handler()` ritorna true se ha gestito il tocco (chiudere una finestra, tornare alla Home...);
 * se ritorna false l'app si chiude, come ogni app Android alla fine della navigazione.
 * Senza un ascoltatore Android farebbe "indietro" nella cronologia della WebView, ignorando le finestre aperte.
 * Nel browser non fa nulla.
 */
export function onHardwareBack(handler) {
  const App = plugin('App');
  if (!isNativeApp() || !App) return;
  App.addListener('backButton', () => {
    let handled = false;
    try { handled = handler(); } catch { /* un errore nel gestore non deve lasciare l'utente bloccato nell'app */ }
    if (!handled) App.exitApp();
  });
}
