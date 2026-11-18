import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyHabits, normalizeHabits, addWater, waterOn, waterGoalMl, addWeight, removeWeight, weightHistory, weightOnOr,
  addSupplement, removeSupplement, toggleSupplement, isChecked } from '../src/habits.js';

const D1 = '2026-11-10', D2 = '2026-11-11', D3 = '2026-11-12';

test('acqua: si somma per giorno, non scende sotto 0 e non supera il massimo', () => {
  let h = addWater(emptyHabits(), D1, 250);
  h = addWater(h, D1, 500);
  assert.equal(waterOn(h, D1), 750);
  assert.equal(waterOn(h, D2), 0);
  assert.equal(waterOn(addWater(h, D1, -5000), D1), 0);
  assert.equal(waterOn(addWater(h, D1, 99999), D1), 10000);
});

test('le funzioni non modificano lo stato di partenza', () => {
  const h = emptyHabits();
  addWater(h, D1, 250); addWeight(h, D1, 80); addSupplement(h, 'Creatina');
  assert.deepEqual(h, emptyHabits());
});

test('obiettivo acqua: arrotondato a 250 ml e con limiti', () => {
  assert.equal(waterGoalMl(80), 2750);   // 80 * 35 = 2800 -> 2750
  assert.equal(waterGoalMl(30), 1500);   // minimo
  assert.equal(waterGoalMl(300), 4000);  // massimo
});

test('peso: un solo valore per giorno, ordinato per data', () => {
  let h = addWeight(emptyHabits(), D3, 80);
  h = addWeight(h, D1, 81.5);
  h = addWeight(h, D3, 79.8);            // stesso giorno: sostituisce
  assert.deepEqual(h.weight.map(e => e.date), [D1, D3]);
  assert.equal(h.weight[1].kg, 79.8);
});

test('storico peso: più recente per primo, con variazione rispetto al precedente', () => {
  let h = addWeight(addWeight(addWeight(emptyHabits(), D1, 81), D2, 80.4), D3, 80.6);
  const rows = weightHistory(h, 2);
  assert.deepEqual(rows.map(r => [r.date, r.delta]), [[D3, 0.2], [D2, -0.6]]);
  assert.equal(weightHistory(h, 10).at(-1).delta, null);   // il primo di sempre non ha un precedente
  assert.deepEqual(removeWeight(h, D2).weight.map(e => e.date), [D1, D3]);
});

test('weightOnOr: la pesata di quel giorno, altrimenti il valore di riserva', () => {
  const h = addWeight(emptyHabits(), D1, 80.4);
  assert.equal(weightOnOr(h, D1, 99), 80.4);
  assert.equal(weightOnOr(h, D2, 79.9), 79.9);        // nessuna pesata quel giorno: vale il peso del profilo
  assert.equal(weightOnOr(emptyHabits(), D1, 70), 70);
});

test('integratori: aggiungi, spunta, togli (le spunte spariscono con lui)', () => {
  let h = addSupplement(emptyHabits(), 'Creatina');
  const id = h.supplements[0].id;
  h = toggleSupplement(h, D1, id);
  assert.equal(isChecked(h, D1, id), true);
  assert.equal(isChecked(h, D2, id), false);
  assert.equal(isChecked(toggleSupplement(h, D1, id), D1, id), false);   // seconda volta: toglie la spunta
  h = removeSupplement(h, id);
  assert.deepEqual(h.supplements, []);
  assert.deepEqual(h.checks[D1], []);
});

test('normalizeHabits: dati assenti o rovinati -> struttura vuota valida', () => {
  assert.deepEqual(normalizeHabits(null), emptyHabits());
  assert.deepEqual(normalizeHabits({ water: 5, weight: 'x' }), emptyHabits());
  assert.equal(normalizeHabits({ water: { [D1]: 500 } }).water[D1], 500);
});
