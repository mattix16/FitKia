import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyMeta, normalizeMeta, markBackupDone, snoozeBackupReminder, dismissInstallHint, setWeightRange, backupReminder,
  isIosSafariTab, shouldShowInstallHint } from '../src/meta.js';

const NOW = new Date('2026-11-19T10:00:00.000Z');
const daysAgo = n => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const daysAhead = n => daysAgo(-n);

test('normalizeMeta: dati assenti o rovinati -> valori vuoti; date non valide scartate', () => {
  for (const raw of [null, undefined, 'x', 5, []]) assert.deepEqual(normalizeMeta(raw), emptyMeta(), String(raw));
  assert.deepEqual(normalizeMeta({ lastBackupAt: 'ieri', backupSnoozedUntil: 5, installHintDismissed: 'sì' }), emptyMeta());
  const good = { lastBackupAt: daysAgo(3), backupSnoozedUntil: daysAhead(1), installHintDismissed: true, weightRange: '90' };
  assert.deepEqual(normalizeMeta({ ...good, extra: 1 }), good);        // i campi sconosciuti non passano
});

test('periodo del grafico peso: 30 giorni di default, solo gli id noti si accettano', () => {
  assert.equal(emptyMeta().weightRange, '30');
  assert.equal(normalizeMeta({ lastBackupAt: daysAgo(1) }).weightRange, '30');       // meta salvata prima del selettore
  assert.equal(normalizeMeta({ weightRange: 'tutto' }).weightRange, '30');
  for (const id of ['30', '90', 'all']) assert.equal(setWeightRange(emptyMeta(), id).weightRange, id);
  const meta = emptyMeta();
  assert.equal(setWeightRange(meta, '7'), meta);                                      // id sconosciuto: nulla cambia
  assert.equal(setWeightRange(meta, 90), meta);
  assert.equal(setWeightRange(meta, 'all') === meta, false);                          // meta nuovo
  assert.equal(meta.weightRange, '30');
});

test('le azioni restituiscono un meta nuovo e non modificano quello di partenza', () => {
  const meta = emptyMeta();
  const done = markBackupDone(meta, NOW);
  assert.deepEqual(meta, emptyMeta());
  assert.equal(done.lastBackupAt, NOW.toISOString());
  assert.equal(snoozeBackupReminder(meta, NOW).backupSnoozedUntil, daysAhead(3));      // BACKUP_SNOOZE_DAYS
  assert.equal(snoozeBackupReminder(meta, NOW, 7).backupSnoozedUntil, daysAhead(7));
  assert.equal(dismissInstallHint(meta).installHintDismissed, true);
  assert.equal(meta.installHintDismissed, false);
});

test('un backup appena fatto cancella il "Più tardi"', () => {
  const snoozed = snoozeBackupReminder(emptyMeta(), NOW);
  assert.equal(markBackupDone(snoozed, NOW).backupSnoozedUntil, null);
});

test('backupReminder: nessun backup mai fatto, solo con abbastanza giorni di diario', () => {
  assert.equal(backupReminder({ meta: emptyMeta(), dataDays: 0, now: NOW }), null);
  assert.equal(backupReminder({ meta: emptyMeta(), dataDays: 2, now: NOW }), null);
  assert.deepEqual(backupReminder({ meta: emptyMeta(), dataDays: 3, now: NOW }), { kind: 'never' });
});

test('backupReminder: con un backup si ricorda solo oltre i 14 giorni interi', () => {
  const at = n => ({ ...emptyMeta(), lastBackupAt: daysAgo(n) });
  assert.equal(backupReminder({ meta: at(0), dataDays: 50, now: NOW }), null);
  assert.equal(backupReminder({ meta: at(14), dataDays: 50, now: NOW }), null);
  assert.deepEqual(backupReminder({ meta: at(15), dataDays: 1, now: NOW }), { kind: 'stale', days: 15 });
  assert.deepEqual(backupReminder({ meta: at(40), dataDays: 1, now: NOW }), { kind: 'stale', days: 40 });
});

test('backupReminder: il "Più tardi" attivo silenzia, scaduto no; una data nel futuro non dà promemoria', () => {
  const never = { ...emptyMeta(), backupSnoozedUntil: daysAhead(2) };
  assert.equal(backupReminder({ meta: never, dataDays: 30, now: NOW }), null);
  const expired = { ...emptyMeta(), backupSnoozedUntil: daysAgo(1) };
  assert.deepEqual(backupReminder({ meta: expired, dataDays: 30, now: NOW }), { kind: 'never' });
  const stale = { ...emptyMeta(), lastBackupAt: daysAgo(30), backupSnoozedUntil: daysAhead(1) };
  assert.equal(backupReminder({ meta: stale, dataDays: 30, now: NOW }), null);
  assert.equal(backupReminder({ meta: { ...emptyMeta(), lastBackupAt: daysAhead(5) }, dataDays: 30, now: NOW }), null);
});

// ---------- Safari su iOS in una scheda del browser ----------
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1';
const IPHONE_FIREFOX = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/124.0 Mobile/15E148 Safari/605.1.15';
const IPHONE_EDGE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/124.0 Mobile/15E148 Safari/605.1.15';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';

test('isIosSafariTab: iPhone Safari in una scheda sì; altri browser iOS, Android e Mac no', () => {
  assert.equal(isIosSafariTab({ userAgent: IPHONE_SAFARI, platform: 'iPhone', maxTouchPoints: 5 }), true);
  for (const userAgent of [IPHONE_CHROME, IPHONE_FIREFOX, IPHONE_EDGE]) assert.equal(isIosSafariTab({ userAgent, platform: 'iPhone', maxTouchPoints: 5 }), false, userAgent);
  assert.equal(isIosSafariTab({ userAgent: ANDROID_CHROME, platform: 'Linux armv81', maxTouchPoints: 5 }), false);
  assert.equal(isIosSafariTab({ userAgent: MAC_SAFARI, platform: 'MacIntel', maxTouchPoints: 0 }), false);
});

test('isIosSafariTab: l\'app aperta dalla Home (standalone) no; iPadOS con user agent da Mac sì; senza dati no', () => {
  assert.equal(isIosSafariTab({ userAgent: IPHONE_SAFARI, platform: 'iPhone', maxTouchPoints: 5, standalone: true }), false);
  assert.equal(isIosSafariTab({ userAgent: MAC_SAFARI, platform: 'MacIntel', maxTouchPoints: 5 }), true);
  assert.equal(isIosSafariTab(), false);
  assert.equal(isIosSafariTab({}), false);
});

test('shouldShowInstallHint: solo su iOS Safari e solo se non è già stato chiuso', () => {
  const env = { userAgent: IPHONE_SAFARI, platform: 'iPhone', maxTouchPoints: 5 };
  assert.equal(shouldShowInstallHint(emptyMeta(), env), true);
  assert.equal(shouldShowInstallHint(dismissInstallHint(emptyMeta()), env), false);
  assert.equal(shouldShowInstallHint(emptyMeta(), { userAgent: ANDROID_CHROME }), false);
});
