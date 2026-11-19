import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfile } from '../src/profile.js';

const old = { name: 'Mattia', age: 30, weightKg: 80, heightCm: 180, sex: 'male' }; // profilo salvato prima di M3

test('un profilo vecchio riceve i valori di default', () => {
  const p = normalizeProfile(old);
  assert.equal(p.goal, 'lose');
  assert.equal(p.activity, 'sedentary');
  assert.equal(p.name, 'Mattia');
});

test('i valori validi restano, quelli rovinati tornano al default', () => {
  assert.equal(normalizeProfile({ ...old, goal: 'gain', activity: 'active' }).goal, 'gain');
  assert.equal(normalizeProfile({ ...old, goal: 'boh', activity: 'x' }).activity, 'sedentary');
});

test('un profilo vecchio riceve il ritmo predefinito dell\'obiettivo e nessun peso obiettivo', () => {
  assert.equal(normalizeProfile(old).weeklyRateKg, 0.5);              // obiettivo di default: lose
  assert.equal(normalizeProfile(old).targetWeightKg, null);
  assert.equal(normalizeProfile({ ...old, goal: 'gain' }).weeklyRateKg, 0.25);
});

test('ritmo e peso obiettivo validi restano; quelli rovinati tornano al default', () => {
  const p = normalizeProfile({ ...old, goal: 'gain', weeklyRateKg: 0.75, targetWeightKg: 85 });
  assert.equal(p.weeklyRateKg, 0.75);
  assert.equal(p.targetWeightKg, 85);
  for (const weeklyRateKg of [0.4, 'x', null, 1]) assert.equal(normalizeProfile({ ...old, weeklyRateKg }).weeklyRateKg, 0.5, String(weeklyRateKg));
  for (const targetWeightKg of [5, 301, 'boh', null, '', undefined, NaN]) assert.equal(normalizeProfile({ ...old, targetWeightKg }).targetWeightKg, null, String(targetWeightKg));
  assert.equal(normalizeProfile({ ...old, targetWeightKg: '72' }).targetWeightKg, 72);   // un numero salvato come testo torna un numero
});

test('nessun profilo -> null, e l\'originale non viene modificato', () => {
  assert.equal(normalizeProfile(null), null);
  normalizeProfile(old);
  assert.equal('goal' in old, false);
});
