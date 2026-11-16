import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBmr, calculateTargets, ringDashArray, nutrientsFor, toPercent } from '../src/nutrition.js';
import { RING_CIRCUMFERENCE } from '../src/config.js';

const man = { weightKg: 80, heightCm: 180, age: 30, sex: 'male' };

test('BMR uomo 80kg/180cm/30 anni = 1780', () => assert.equal(calculateBmr(man), 1780));
test('sesso non valido lancia un errore', () => assert.throws(() => calculateBmr({ ...man, sex: 'maschio' })));

test('target: lose < maintain < gain e lose mai sotto il BMR', () => {
  const t = calculateTargets(man);
  assert.ok(t.lose <= t.maintain && t.maintain < t.gain);
  assert.ok(t.lose >= calculateBmr(man));
});

test('anello: goal 0, eaten 0, eaten > goal', () => {
  assert.equal(ringDashArray(100, 0), `0 ${RING_CIRCUMFERENCE}`);
  assert.equal(ringDashArray(0, 2000), `0 ${RING_CIRCUMFERENCE}`);
  assert.equal(ringDashArray(5000, 2000), `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`);
});

test('nutrientsFor: 150 g di yogurt (59 kcal/100 g)', () => {
  const food = { per100g: { kcal: 59, protein: 10, carbs: 3.6, fat: 0.4 } };
  assert.deepEqual(nutrientsFor(food, 150), { kcal: 89, protein: 15, carbs: 5.4, fat: 0.6 });
});

test('toPercent: goal 0 e oltre il 100%', () => {
  assert.equal(toPercent(10, 0), 0);
  assert.equal(toPercent(50, 100), 50);
  assert.equal(toPercent(300, 100), 100);
});

test('più attività -> fabbisogno più alto', () => {
  const sedentary = calculateTargets({ ...man, activity: 'sedentary' });
  const active = calculateTargets({ ...man, activity: 'active' });
  assert.ok(active.maintain > sedentary.maintain);
});
