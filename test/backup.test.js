import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, backupFileName, describeBackup } from '../src/backup.js';
import { validateBackup } from '../src/validation.js';
import { emptyHabits } from '../src/habits.js';
import { BACKUP, SCHEMA_VERSION } from '../src/config.js';

// Un profilo come lo salva l'app oggi: con peso obiettivo e ritmo (schema 2).
const profile = { name: 'Mattia', age: 30, weightKg: 80, heightCm: 180, sex: 'male', goal: 'lose', activity: 'sedentary', targetWeightKg: null, weeklyRateKg: 0.5 };
const entry = { id: 'e1', foodId: 'banana', name: 'Banana', grams: 120, kcal: 107, protein: 1.3, carbs: 27.6, fat: 0.4 };
const state = {
  profile,
  logs: { '2026-11-12': { breakfast: [entry], lunch: [], dinner: [], snack: [] } },
  habits: { water: { '2026-11-12': 1500 }, weight: [{ date: '2026-11-12', kg: 80.2 }], supplements: [{ id: 's1', name: 'Creatina' }], checks: { '2026-11-12': ['s1'] } },
  customFoods: [{ id: 'custom-1', name: 'Torta della nonna', per100g: { kcal: 380, protein: 6, carbs: 50, fat: 17 }, custom: true }],
  favorites: [{ id: 'f1', name: 'Colazione tipo', mealId: 'breakfast', items: [{ foodId: 'banana', name: 'Banana', grams: 120, kcal: 107, protein: 1.3, carbs: 27.6, fat: 0.4 }] }],
  view: 'diary',
};

test('il backup contiene tutti i dati persistiti (non la vista) e nome file con data locale', () => {
  const backup = buildBackup(state, new Date('2026-11-12T10:00:00Z'));
  assert.equal(backup.app, 'fitkia');
  assert.equal(backup.exportedAt, '2026-11-12T10:00:00.000Z');
  assert.equal('view' in backup, false);
  assert.deepEqual(backup.favorites, state.favorites);
  assert.match(backupFileName(new Date()), /^fitkia-backup-\d{4}-\d{2}-\d{2}\.json$/);
});

test('export -> import (round trip): i dati tornano identici', () => {
  const { ok, errors, value } = validateBackup(JSON.stringify(buildBackup(state)));
  assert.equal(ok, true, JSON.stringify(errors));
  assert.deepEqual(errors, {});
  assert.deepEqual(value.profile, profile);
  assert.deepEqual(value.logs, state.logs);
  assert.deepEqual(value.habits, state.habits);
  assert.deepEqual(value.customFoods, state.customFoods);
  assert.deepEqual(value.favorites, state.favorites);
  assert.equal(describeBackup(value), 'Mattia · 1 giorni di diario · 1 pesi · 1 alimenti personali · 1 pasti preferiti');
});

test('retrocompatibilità: un backup vecchio (senza goal/activity, customFoods, favorites) è accettato', () => {
  const old = { app: 'fitkia', schema: 1, profile: { name: 'M', age: 30, weightKg: 80, heightCm: 180, sex: 'male' }, logs: {}, habits: {} };
  const { ok, value } = validateBackup(old);   // accetta anche un oggetto già letto
  assert.equal(ok, true);
  assert.equal(value.profile.goal, 'lose');
  assert.equal(value.profile.weeklyRateKg, 0.5);       // un backup di schema 1 non ha il ritmo: riceve quello predefinito
  assert.equal(value.profile.targetWeightKg, null);
  assert.deepEqual(value.customFoods, []);
  assert.deepEqual(value.favorites, []);
  assert.deepEqual(value.habits, emptyHabits());
});

test('schema 2: il backup porta la versione corrente e peso obiettivo e ritmo tornano identici', () => {
  const withTarget = { ...state, profile: { ...profile, goal: 'gain', targetWeightKg: 85.5, weeklyRateKg: 0.75 } };
  const backup = buildBackup(withTarget);
  assert.equal(backup.schema, SCHEMA_VERSION);
  assert.equal(SCHEMA_VERSION, 2);
  const { ok, value } = validateBackup(JSON.stringify(backup));
  assert.equal(ok, true);
  assert.deepEqual(value.profile, withTarget.profile);
});

test('peso obiettivo o ritmo fuori scala in un backup: rifiutato tutto', () => {
  const bad = (patch) => validateBackup({ ...buildBackup(state), profile: { ...profile, ...patch } });
  assert.ok(bad({ targetWeightKg: 5 }).errors.profile);
  assert.ok(bad({ weeklyRateKg: 3 }).errors.profile);
});

test('file non validi: ok=false, value=null e un messaggio per sezione', () => {
  const cases = ['', 'non json', '[]', 'null', '{"app":"altro"}', '{"app":"fitkia","schema":99,"profile":{}}',
    JSON.stringify({ app: 'fitkia', schema: 1, profile: { name: 'M', age: 3 } })];
  for (const text of cases) {
    const result = validateBackup(text);
    assert.equal(result.ok, false, text);
    assert.equal(result.value, null);
    assert.ok(Object.values(result.errors).every(m => typeof m === 'string' && m.length > 0), text);
  }
});

test('tipi sbagliati o valori fuori scala: rifiutato TUTTO il backup (niente import parziale)', () => {
  const bad = (patch) => validateBackup({ ...buildBackup(state), ...patch });
  assert.ok(bad({ logs: { '2026-11-12': { breakfast: [{ ...entry, kcal: 'mille' }] } } }).errors.logs);
  assert.ok(bad({ logs: { 'ieri': {} } }).errors.logs);
  assert.ok(bad({ logs: [] }).errors.logs);
  assert.ok(bad({ habits: { weight: [{ date: '2026-11-12', kg: 9999 }] } }).errors.habits);
  assert.ok(bad({ habits: { water: { '2026-11-12': -5 } } }).errors.habits);
  assert.ok(bad({ customFoods: [{ id: 'x', name: 'X', per100g: { kcal: 5000, protein: 0, carbs: 0, fat: 0 } }] }).errors.customFoods);
  assert.ok(bad({ favorites: [{ id: 'f', name: 'Vuoto', items: [] }] }).errors.favorites);
  const twoErrors = bad({ logs: 5, customFoods: 'x' });
  assert.deepEqual(Object.keys(twoErrors.errors).sort(), ['customFoods', 'logs']);
});

test('file malevolo: chiavi sconosciute e __proto__ non arrivano allo store; file enorme rifiutato', () => {
  const text = JSON.stringify(buildBackup(state)).replace('"app":"fitkia"', '"app":"fitkia","__proto__":{"polluted":true},"extra":1');
  const tricky = JSON.parse(text);
  tricky.profile.isAdmin = true;
  tricky.logs['2026-11-12'].breakfast[0].onclick = 'alert(1)';
  const { ok, value } = validateBackup(tricky);
  assert.equal(ok, true);
  assert.equal('isAdmin' in value.profile, false);
  assert.equal('onclick' in value.logs['2026-11-12'].breakfast[0], false);
  assert.equal({}.polluted, undefined);
  assert.equal(validateBackup(' '.repeat(BACKUP.maxBytes + 1)).ok, false);
});
