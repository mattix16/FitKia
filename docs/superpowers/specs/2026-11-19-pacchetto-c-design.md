# Pacchetto C + fix 4: affidabilità dei dati locali (design doc, 2026-11-19)

Approvato dall'utente il 2026-11-19 ("Procedi con entrambi"). Step 2 di 3; lo Step 3 (`2026-11-19-pacchetto-b-a5-design.md`) usa `migrate()` e `meta`.

## Fatti verificati sul web

- Safari cancella lo storage di un sito dopo 7 giorni di uso senza interazioni con quel sito; le web app aggiunte alla Home hanno un contatore a parte. I report su `localStorage` sono discordanti e non ci sono conferme per il 2026: il suggerimento Home è prudenza, non certezza.
- `navigator.storage.persist()`: Chrome decide da solo (senza prompt, con euristiche di engagement), Firefox mostra un permesso all'utente, Safari lo supporta da 15.2 (non è chiaro se chieda o conceda da solo).
- Fonti: MDN `StorageManager.persist()`, web.dev "Persistent storage", mjtsai.com "Safari 13.1 ... 7-Day Script-Writeable Storage".

## C4: `migrate()` in `storage.js`

```js
export const MIGRATIONS = {};   // { [versione di partenza]: (data, key) => dati alla versione dopo }; passi puri e totali
export function migrate(raw, key = null, steps = MIGRATIONS, current = SCHEMA_VERSION)
//  -> { ok: true, data, from, to, future } | { ok: false, reason: 'invalid' }
```

- Busta non valida (non oggetto, `v` non intero ≥ 1, `data` assente): `{ ok: false }` e `load` ridà il fallback.
- `v === current`: dati invariati. `v < current`: si applicano `steps[v]`, `steps[v+1]`... in ordine (passo mancante = identità; ogni passo riceve `key`; non muta l'input). `v > current`: dati letti così come sono, con `future: true` (mai scartati; il salvataggio successivo riscrive la busta con la versione vecchia e perde solo i campi nuovi).
- `load` = `migrate(JSON.parse(raw), key)`, ritorna `data ?? fallback`. La migrazione avviene alla lettura, senza riscrivere subito; ogni chiave migra per conto suo.
- Rischio noto: un passo che lancia darebbe il fallback e il salvataggio successivo sovrascriverebbe l'originale. I passi devono essere totali e testati.
- `SCHEMA_VERSION` resta 1 in questo step: il meccanismo nasce senza passi.

## C3 + fix 4: avviso se `save()` fallisce

- Stato non persistito `saveFailed`. In `setState`: `written = PERSISTED.filter(k => k in patch).map(k => save(...))`; `saveFailed = written.length ? written.includes(false) : state.saveFailed`. Un salvataggio riuscito lo azzera; `resetAll` lo azzera. `persistAll()` riscrive tutte le chiavi ("Riprova").
- Banner `#storage-alert` (`role="alert"`, `sticky top-0`, primo elemento del `<body>`: nel flusso, non copre il contenuto, visibile anche in onboarding). Pulsanti "Scarica backup" (esporta lo stato in memoria) e "Riprova". Quota piena e navigazione privata non si distinguono: messaggio unico.

## C1: promemoria backup (`meta`)

- `STORAGE_KEYS.meta = 'fitkia:v1:meta'` (opzionale come `favorites`). Forma: `{ lastBackupAt, backupSnoozedUntil, installHintDismissed }`. Non entra nel file di backup né in `restoreAll`; `resetAll` la cancella.
- `src/meta.js` (puro): `emptyMeta`, `normalizeMeta`, `markBackupDone`, `snoozeBackupReminder`, `dismissInstallHint`, `backupReminder`, `isIosSafariTab`, `shouldShowInstallHint`. `log.js`: `daysWithEntries(logs)`.
- Costanti: `BACKUP_REMINDER_DAYS = 14`, `BACKUP_SNOOZE_DAYS = 3`, `BACKUP_MIN_DATA_DAYS = 3`.
- `backupReminder({ meta, dataDays, now })` → `null | { kind: 'never' } | { kind: 'stale', days }`: rinvio attivo → `null`; mai fatto un backup → `never` solo con ≥ 3 giorni di diario; backup fatto → `stale` solo con più di 14 giorni interi; date nel futuro → `null`.
- Card `#notice` in Home sotto "prossimo passo": "Scarica" (esporta direttamente) e "Più tardi" (rinvio di 3 giorni). Se ci sono sia il suggerimento iOS sia il promemoria, ne compare uno solo (precedenza all'iOS). `exportBackup()` esce da `settings.js` e chiama `markBackupDone()`; in Impostazioni compare "Ultimo backup: ...".

## C2: persistenza e suggerimento iOS

- `requestPersistence(manager = navigator.storage)` in `storage.js`: se non già persistente chiama `persist()` in un `try`. `main.js` la chiama a fine `init()`, in background, solo con un profilo presente, a ogni avvio finché non è concessa. Su Firefox può comparire un permesso.
- `isIosSafariTab({ userAgent, platform, maxTouchPoints, standalone })` (pura): iPhone/iPad/iPadOS con UA da Mac (`maxTouchPoints > 1`), UA con `Safari` e senza `CriOS|FxiOS|EdgiOS|OPiOS|GSA`, non standalone. "Ho capito" imposta `installHintDismissed`.

## File

Nuovi: `src/meta.js`, `src/ui/notices.js`, `test/storage.test.js`, `test/meta.test.js`, `test/store.test.js`. `sw.js`: `PRECACHE` + `VERSION = 'v12'`.

## Test

`storage.test.js`: `migrate` (buste non valide, versione corrente, futura, catena con passi iniettati e `key`, passo mancante, input non mutato), `load`/`save`/`remove` con stub di `localStorage`, `requestPersistence`. `meta.test.js`: normalize, `backupReminder` (tutti i casi), immutabilità, `isIosSafariTab`. `store.test.js`: `saveFailed`, `persistAll`, `meta` persistita. `log.test.js`: `daysWithEntries`.
