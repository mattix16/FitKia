import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITY, ACTIVITY_OPTIONS, GOALS, GOAL_OPTIONS } from '../src/config.js';
import { calculateTargets } from '../src/nutrition.js';

// Questi test proteggono dalla duplicazione: ACTIVITY (moltiplicatori) e ACTIVITY_OPTIONS (etichette) devono coincidere.
test('ogni livello di attività ha moltiplicatore ed etichetta', () => {
  assert.deepEqual(ACTIVITY_OPTIONS.map(o => o.id).sort(), Object.keys(ACTIVITY).sort());
});

test('GOALS deriva da GOAL_OPTIONS e calculateTargets restituisce un valore per ognuno', () => {
  assert.equal(GOALS.length, GOAL_OPTIONS.length);
  const targets = calculateTargets({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' });
  GOALS.forEach(goal => assert.ok(Number.isFinite(targets[goal]), goal));
});
