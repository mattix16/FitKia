// Lo store ha stato in memoria e scrive su localStorage: qui si prova con un localStorage finto (Node non ce l'ha).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hydrate, getState, setState, saveProfile, addWater, persistAll, resetAll,
  markBackupDone, snoozeBackupReminder, dismissInstallHint, setWeightRange,
  getViewedDay, isViewingToday, setViewedDay, getDayLog, getPreviousDayLog, previousDayCount,
  addFood, removeFood, updateEntry, replaceEntry, repeatPreviousDay } from '../src/store.js';
import { waterOn } from '../src/habits.js';
import { todayKey, shiftDayKey } from '../src/log.js';
import { buildBackup } from '../src/backup.js';
import { emptyMeta } from '../src/meta.js';
import { STORAGE_KEYS } from '../src/config.js';

const PROFILE = { name: 'Ada', age: 30, weightKg: 80, heightCm: 180, sex: 'male', goal: 'lose', activity: 'light' };

/** localStorage finto, in memoria. `failWrites` simula quota piena o navigazione privata. */
function freshStore() {
  const items = new Map();
  const stub = {
    items,
    failWrites: false,
    getItem: key => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => { if (stub.failWrites) throw new Error('QuotaExceededError'); items.set(key, String(value)); },
    removeItem: key => { items.delete(key); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
  resetAll();
  return stub;
}

test('saveFailed: falso quando il salvataggio riesce', () => {
  const stub = freshStore();
  saveProfile(PROFILE);
  assert.equal(getState().saveFailed, false);
  assert.ok(stub.items.has(STORAGE_KEYS.profile));
});

test('saveFailed: vero se la scrittura fallisce (i dati restano in memoria) e si spegne col primo salvataggio riuscito', () => {
  const stub = freshStore();
  stub.failWrites = true;
  addWater(250);
  assert.equal(getState().saveFailed, true);
  assert.equal(waterOn(getState().habits, todayKey()), 250);          // l'app continua a funzionare
  stub.failWrites = false;
  addWater(250);
  assert.equal(getState().saveFailed, false);
  assert.equal(waterOn(getState().habits, todayKey()), 500);
});

test('un cambio che non salva nulla (la vista) lascia l\'avviso com\'è', () => {
  const stub = freshStore();
  stub.failWrites = true;
  saveProfile(PROFILE);
  setState({ view: 'diary' });
  assert.equal(getState().saveFailed, true);
  assert.equal(getState().view, 'diary');
  stub.failWrites = false;
  setState({ view: 'home' });
  assert.equal(getState().saveFailed, true);                          // finché non si salva davvero qualcosa
});

test('persistAll: riscrive tutte le chiavi e spegne l\'avviso quando lo spazio torna', () => {
  const stub = freshStore();
  stub.failWrites = true;
  saveProfile(PROFILE);
  persistAll();
  assert.equal(getState().saveFailed, true);                          // ancora senza spazio: resta acceso
  stub.failWrites = false;
  persistAll();
  assert.equal(getState().saveFailed, false);
  for (const key of Object.values(STORAGE_KEYS)) assert.ok(stub.items.has(key), key);
});

test('meta: le azioni si salvano e hydrate le rilegge', () => {
  freshStore();
  saveProfile(PROFILE);
  markBackupDone();
  snoozeBackupReminder();
  dismissInstallHint();
  setWeightRange('all');
  const before = getState().meta;
  assert.ok(before.lastBackupAt && before.backupSnoozedUntil && before.installHintDismissed);
  assert.equal(before.weightRange, 'all');
  hydrate();
  assert.deepEqual(getState().meta, before);
});

test('resetAll cancella anche meta e spegne l\'avviso', () => {
  const stub = freshStore();
  saveProfile(PROFILE);
  markBackupDone();
  stub.failWrites = true;
  addWater(250);
  assert.equal(getState().saveFailed, true);
  stub.failWrites = false;
  resetAll();
  assert.equal(stub.items.has(STORAGE_KEYS.meta), false);
  assert.deepEqual(getState().meta, emptyMeta());
  assert.equal(getState().saveFailed, false);
});

// ---------- A5: il giorno mostrato (viewedDay) ----------
const food = { id: 'banana', name: 'Banana', per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } };
const daysAgo = n => shiftDayKey(todayKey(), -n);

test('viewedDay: di default è oggi (null), non si salva su disco e resetAll lo azzera', () => {
  const stub = freshStore();
  assert.equal(getState().viewedDay, null);
  assert.equal(getViewedDay(), todayKey());
  assert.equal(isViewingToday(), true);
  assert.equal(setViewedDay(daysAgo(1)), true);
  assert.equal(getViewedDay(), daysAgo(1));
  assert.equal(isViewingToday(), false);
  assert.equal(stub.items.size, 0);                                    // scegliere un giorno non scrive nulla
  resetAll();
  assert.equal(getState().viewedDay, null);
});

test('setViewedDay: rifiuta formati sbagliati, date inesistenti e giorni futuri; oggi o null = oggi', () => {
  freshStore();
  const bad = [shiftDayKey(todayKey(), 1), '2999-01-01', '2026-02-31', '2026-13-01', 'ieri', '2026-1-5', 20261119, undefined, {}];
  for (const date of bad) assert.equal(setViewedDay(date), false, String(date));
  assert.equal(getState().viewedDay, null);
  setViewedDay(daysAgo(1));
  assert.equal(setViewedDay(todayKey()), true);                        // oggi = null: segue la mezzanotte
  assert.equal(getState().viewedDay, null);
  setViewedDay(daysAgo(1));
  assert.equal(setViewedDay(null), true);
  assert.equal(getState().viewedDay, null);
});

test('addFood scrive nel giorno mostrato (o in quello indicato), mai in oggi per sbaglio', () => {
  freshStore();
  setViewedDay(daysAgo(1));
  addFood('lunch', food, 100);
  assert.equal(getDayLog(daysAgo(1)).lunch.length, 1);
  assert.equal(getDayLog(todayKey()).lunch.length, 0);
  addFood('snack', food, 50, todayKey());                              // data esplicita: vince sul giorno mostrato
  assert.equal(getDayLog(todayKey()).snack.length, 1);
  assert.equal(getDayLog(daysAgo(1)).snack.length, 0);
});

test('l\'annulla con la data catturata agisce sul giorno giusto anche se nel frattempo si cambia giorno', () => {
  freshStore();
  const monday = daysAgo(3);
  setViewedDay(monday);
  const entry = addFood('lunch', food, 100, monday);
  setViewedDay(daysAgo(1));                                            // si cambia giorno prima di premere "Annulla"
  removeFood('lunch', entry.id, monday);                               // l'annulla ripassa la data catturata
  assert.equal(getDayLog(monday).lunch.length, 0);
  const again = addFood('lunch', food, 100, monday);
  assert.equal(removeFood('lunch', again.id), null);                   // senza data si agirebbe su ieri (il giorno mostrato): voce non trovata
  assert.equal(getDayLog(monday).lunch.length, 1);
});

test('repeatPreviousDay copia dal giorno prima di quello mostrato, non da "ieri"', () => {
  freshStore();
  const first = daysAgo(5), second = daysAgo(4);
  addFood('breakfast', food, 100, first);
  addFood('breakfast', food, 120, first);
  setViewedDay(second);
  assert.equal(previousDayCount('breakfast'), 2);
  assert.equal(getPreviousDayLog().breakfast.length, 2);
  const copies = repeatPreviousDay('breakfast');
  assert.equal(copies.length, 2);
  assert.equal(getDayLog(second).breakfast.length, 2);
  assert.equal(getDayLog(first).breakfast.length, 2);                  // l'originale resta
  assert.notEqual(copies[0].id, getDayLog(first).breakfast[0].id);
  assert.equal(getDayLog(todayKey()).breakfast.length, 0);
  assert.equal(previousDayCount('breakfast', todayKey()), 0);          // ieri è vuoto
});

test('updateEntry e replaceEntry lavorano sul giorno mostrato; acqua e peso restano di oggi', () => {
  freshStore();
  const day = daysAgo(1);
  setViewedDay(day);
  const entry = addFood('dinner', food, 100);
  const previous = updateEntry('dinner', entry.id, 200);
  assert.equal(previous.grams, 100);
  assert.equal(getDayLog(day).dinner[0].grams, 200);
  replaceEntry('dinner', previous);
  assert.equal(getDayLog(day).dinner[0].grams, 100);
  addWater(250);                                                       // l'acqua è sempre di oggi, anche guardando un altro giorno
  assert.equal(waterOn(getState().habits, todayKey()), 250);
  assert.equal(waterOn(getState().habits, day), 0);
});

test('meta e saveFailed non entrano nel file di backup', () => {
  freshStore();
  saveProfile(PROFILE);
  markBackupDone();
  const backup = buildBackup(getState());
  assert.equal('meta' in backup, false);
  assert.equal('saveFailed' in backup, false);
});
