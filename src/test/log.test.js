import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDay, makeEntry, addEntry, removeEntry, sumEntries, dayTotals, mealTotals, defaultMealId } from '../log.js';

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
