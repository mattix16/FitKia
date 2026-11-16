import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDay, makeEntry, addEntry, removeEntry, sumEntries, dayTotals, mealTotals, defaultMealId } from '../src/log.js';
import { recentFoods, copyMeal, normalizeLogs } from '../src/log.js';

const food = { id: 'banana', name: 'Banana', per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } };

test('addEntry non modifica il giorno originale', () => {
  const day = emptyDay();
  const next = addEntry(day, 'snack', makeEntry(food, 100));
  assert.equal(day.snack.length, 0);
  assert.equal(next.snack.length, 1);
});

test('removeEntry toglie solo la voce indicata', () => {
  const a = makeEntry(food, 100), b = makeEntry(food, 50);
  const day = addEntry(addEntry(emptyDay(), 'snack', a), 'snack', b);
  assert.deepEqual(removeEntry(day, 'snack', a.id).snack, [b]);
});

test('sumEntries e totali del giorno', () => {
  const day = addEntry(addEntry(emptyDay(), 'snack', makeEntry(food, 100)), 'lunch', makeEntry(food, 200));
  assert.equal(sumEntries([]).kcal, 0);
  assert.equal(mealTotals(day, 'snack').kcal, 89);
  assert.equal(dayTotals(day).kcal, 89 + 178);
});

test('pasto proposto in base all\'ora', () => {
  assert.equal(defaultMealId(8), 'breakfast');
  assert.equal(defaultMealId(13), 'lunch');
  assert.equal(defaultMealId(21), 'dinner');
});

// ---------- V4.2 ----------

const banana = { id: 'banana', name: 'Banana', per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } };
const mela = { id: 'mela', name: 'Mela', per100g: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } };

test('recentFoods: i più ricorrenti per primi, con la porzione dell\'ultima volta', () => {
  const logs = {
    '2026-11-12': addEntry(addEntry(emptyDay(), 'snack', makeEntry(mela, 120)), 'breakfast', makeEntry(banana, 100)),
    '2026-11-11': addEntry(emptyDay(), 'snack', makeEntry(banana, 150)),
    '2026-09-01': addEntry(emptyDay(), 'snack', makeEntry(mela, 999)),          // troppo vecchio: fuori dai 30 giorni
  };
  const list = recentFoods(logs, 5, '2026-11-12', 30);
  assert.deepEqual(list.map(f => [f.foodId, f.count]), [['banana', 2], ['mela', 1]]);
  assert.equal(list[0].grams, 100);   // la porzione del giorno più recente
  assert.equal(recentFoods(logs, 1, '2026-11-12').length, 1);
});

test('copyMeal copia con id nuovi e non modifica gli originali', () => {
  const source = addEntry(emptyDay(), 'lunch', makeEntry(banana, 100));
  const today = emptyDay();
  const next = copyMeal(today, source, 'lunch');
  assert.equal(next.lunch.length, 1);
  assert.notEqual(next.lunch[0].id, source.lunch[0].id);
  assert.equal(today.lunch.length, 0);
  assert.equal(copyMeal(today, undefined, 'lunch').lunch.length, 0);     // ieri senza dati
});

test('normalizeLogs scarta giorni e voci rovinati', () => {
  const good = makeEntry(banana, 100);
  const logs = normalizeLogs({ '2026-11-12': { lunch: [good, { id: 1 }, null] }, 'boh': {}, '2026-11-13': 'x' });
  assert.deepEqual(Object.keys(logs), ['2026-11-12']);
  assert.deepEqual(logs['2026-11-12'].lunch, [good]);
  assert.deepEqual(logs['2026-11-12'].dinner, []);
  assert.deepEqual(normalizeLogs(null), {});
});
