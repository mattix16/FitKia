import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, load, save, remove, requestPersistence } from '../src/storage.js';
import { SCHEMA_VERSION, STORAGE_KEYS } from '../src/config.js';

/** localStorage finto, in memoria: Node non ce l'ha. `failWrites` simula quota piena o navigazione privata. */
function installStorage() {
  const items = new Map();
  const stub = {
    items,
    failWrites: false,
    getItem: key => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => { if (stub.failWrites) throw new Error('QuotaExceededError'); items.set(key, String(value)); },
    removeItem: key => { items.delete(key); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
  return stub;
}

// ---------- migrate (pura) ----------
test('migrate: una busta non valida dà { ok: false }', () => {
  const invalid = [null, undefined, 'x', 5, [], {}, { v: 1 }, { data: 1 }, { v: '1', data: 1 }, { v: 0, data: 1 }, { v: -1, data: 1 }, { v: 1.5, data: 1 }];
  for (const raw of invalid) assert.deepEqual(migrate(raw), { ok: false, reason: 'invalid' }, JSON.stringify(raw));
});

test('migrate: alla versione corrente i dati restano gli stessi (stesso riferimento)', () => {
  const data = { a: 1 };
  const result = migrate({ v: SCHEMA_VERSION, data });
  assert.deepEqual(result, { ok: true, data, from: SCHEMA_VERSION, to: SCHEMA_VERSION, future: false });
  assert.equal(result.data, data);
});

test('migrate: dati di una versione futura si leggono così come sono, mai scartati', () => {
  const data = { nuovo: true };
  const result = migrate({ v: SCHEMA_VERSION + 5, data });
  assert.equal(result.ok, true);
  assert.equal(result.future, true);
  assert.equal(result.data, data);
  assert.equal(result.from, SCHEMA_VERSION + 5);
});

test('migrate: i passi si applicano in ordine, ognuno riceve la chiave, e l\'input non cambia', () => {
  const calls = [];
  const steps = {
    1: (data, key) => { calls.push(['1', key]); return { ...data, due: true }; },
    2: (data, key) => { calls.push(['2', key]); return { ...data, tre: true }; },
  };
  const input = { v: 1, data: { uno: true } };
  const result = migrate(input, 'fitkia:v1:profile', steps, 3);
  assert.deepEqual(result, { ok: true, data: { uno: true, due: true, tre: true }, from: 1, to: 3, future: false });
  assert.deepEqual(calls, [['1', 'fitkia:v1:profile'], ['2', 'fitkia:v1:profile']]);
  assert.deepEqual(input, { v: 1, data: { uno: true } });
  assert.deepEqual(migrate({ v: 2, data: {} }, null, steps, 3).data, { tre: true });   // da v2 parte solo il passo 2
});

test('migrate: un passo assente vale come identità; stesso input = stesso risultato', () => {
  const steps = { 2: data => ({ ...data, y: 2 }) };
  const input = { v: 1, data: { x: 1 } };
  assert.deepEqual(migrate(input, null, steps, 3).data, { x: 1, y: 2 });
  assert.deepEqual(migrate(input, null, steps, 3), migrate(input, null, steps, 3));
});

// ---------- la migrazione vera: v1 -> v2 (il profilo ottiene peso obiettivo e ritmo) ----------
const OLD_PROFILE = { name: 'M', age: 30, weightKg: 80, heightCm: 180, sex: 'male', goal: 'gain', activity: 'light' };

test('migrazione v1 -> v2: il profilo riceve peso obiettivo (nessuno) e il ritmo proposto per il suo obiettivo; l\'input non cambia', () => {
  assert.equal(SCHEMA_VERSION, 2);
  const result = migrate({ v: 1, data: OLD_PROFILE }, STORAGE_KEYS.profile);
  assert.deepEqual(result, { ok: true, data: { ...OLD_PROFILE, targetWeightKg: null, weeklyRateKg: 0.25 }, from: 1, to: 2, future: false });
  assert.equal('targetWeightKg' in OLD_PROFILE, false);
  assert.equal(migrate({ v: 1, data: { ...OLD_PROFILE, goal: 'lose' } }, STORAGE_KEYS.profile).data.weeklyRateKg, 0.5);
  assert.equal(migrate({ v: 1, data: { ...OLD_PROFILE, goal: 'boh' } }, STORAGE_KEYS.profile).data.weeklyRateKg, 0.5);   // obiettivo rovinato: predefinito di lose
});

test('migrazione v1 -> v2: non tocca valori già presenti, profili rovinati né le altre chiavi', () => {
  const set = { ...OLD_PROFILE, targetWeightKg: 72, weeklyRateKg: 0.75 };
  assert.deepEqual(migrate({ v: 1, data: set }, STORAGE_KEYS.profile).data, set);
  for (const broken of [null, 'x', 5, []]) assert.deepEqual(migrate({ v: 1, data: broken }, STORAGE_KEYS.profile).data, broken, String(broken));
  const logs = { '2026-11-12': {} };
  for (const key of [STORAGE_KEYS.logs, STORAGE_KEYS.habits, STORAGE_KEYS.customFoods, STORAGE_KEYS.favorites, STORAGE_KEYS.meta, null]) {
    assert.equal(migrate({ v: 1, data: logs }, key).data, logs, String(key));      // stesso riferimento: nessuna copia
  }
  assert.equal(migrate({ v: 2, data: OLD_PROFILE }, STORAGE_KEYS.profile).data, OLD_PROFILE);   // già v2: nessun passo
});

test('load: un profilo salvato in v1 si legge migrato; uno salvato ora resta com\'è', () => {
  const stub = installStorage();
  stub.items.set(STORAGE_KEYS.profile, JSON.stringify({ v: 1, data: OLD_PROFILE }));
  assert.deepEqual(load(STORAGE_KEYS.profile), { ...OLD_PROFILE, targetWeightKg: null, weeklyRateKg: 0.25 });
  assert.equal(stub.items.get(STORAGE_KEYS.profile), JSON.stringify({ v: 1, data: OLD_PROFILE }));   // la lettura non riscrive: succede al prossimo salvataggio
  save(STORAGE_KEYS.profile, { ...OLD_PROFILE, targetWeightKg: 90, weeklyRateKg: 0.25 });
  assert.equal(JSON.parse(stub.items.get(STORAGE_KEYS.profile)).v, 2);
  assert.equal(load(STORAGE_KEYS.profile).targetWeightKg, 90);
});

// ---------- load / save / remove ----------
test('save + load: giro completo con la busta { v, data }', () => {
  const stub = installStorage();
  assert.equal(save('k', { a: [1, 2] }), true);
  assert.deepEqual(JSON.parse(stub.items.get('k')), { v: SCHEMA_VERSION, data: { a: [1, 2] } });
  assert.deepEqual(load('k'), { a: [1, 2] });
  remove('k');
  assert.equal(load('k', 'nulla'), 'nulla');
});

test('load: chiave assente, JSON rovinato, busta non valida o data vuoto -> fallback', () => {
  const stub = installStorage();
  stub.items.set('rotto', '{non json');
  stub.items.set('vuota', '{}');
  stub.items.set('senzadata', '{"v":1}');
  stub.items.set('nulla', JSON.stringify({ v: 1, data: null }));
  for (const key of ['manca', 'rotto', 'vuota', 'senzadata', 'nulla']) assert.equal(load(key, 'F'), 'F', key);
  assert.equal(load('manca'), null);
});

test('load: una busta di una versione futura si legge comunque', () => {
  const stub = installStorage();
  stub.items.set('f', JSON.stringify({ v: SCHEMA_VERSION + 1, data: { x: 1 } }));
  assert.deepEqual(load('f'), { x: 1 });
});

test('save: false se la scrittura fallisce (quota piena, navigazione privata) e non lascia scritture a metà', () => {
  const stub = installStorage();
  stub.failWrites = true;
  assert.equal(save('k', 1), false);
  assert.equal(stub.items.has('k'), false);
});

test('senza localStorage nessuna funzione lancia: save dà false, load il fallback', () => {
  Object.defineProperty(globalThis, 'localStorage', { value: undefined, configurable: true, writable: true });
  assert.equal(save('k', 1), false);
  assert.equal(load('k', 'F'), 'F');
  remove('k');
});

// ---------- requestPersistence ----------
test('requestPersistence: già attiva, concessa, negata, API assente o che lancia', async () => {
  const calls = [];
  const manager = (persisted, grant) => ({ persisted: async () => persisted, persist: async () => { calls.push('persist'); return grant; } });
  assert.equal(await requestPersistence(manager(true, false)), true);
  assert.deepEqual(calls, []);                                         // se è già attiva non la richiede
  assert.equal(await requestPersistence(manager(false, true)), true);
  assert.deepEqual(calls, ['persist']);
  assert.equal(await requestPersistence(manager(false, false)), false);
  assert.equal(await requestPersistence({}), false);
  assert.equal(await requestPersistence(null), false);
  assert.equal(await requestPersistence({ persisted: async () => { throw new Error('x'); }, persist: async () => true }), false);
});
