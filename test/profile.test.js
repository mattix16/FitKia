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

test('nessun profilo -> null, e l\'originale non viene modificato', () => {
  assert.equal(normalizeProfile(null), null);
  normalizeProfile(old);
  assert.equal('goal' in old, false);
});
