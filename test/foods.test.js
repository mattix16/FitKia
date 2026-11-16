import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOODS, searchFoods, findFood, makeCustomFood, normalizeCustomFoods } from '../src/data/foods.js';
import { isPlausibleFood } from '../src/nutrition.js';

test('id univoci e nomi univoci', () => {
  assert.equal(new Set(FOODS.map(f => f.id)).size, FOODS.length);
  assert.equal(new Set(FOODS.map(f => f.name.toLowerCase())).size, FOODS.length);
});

test('ogni voce del dizionario è plausibile (macro <= 100 g, kcal coerenti)', () => {
  assert.deepEqual(FOODS.filter(f => !isPlausibleFood(f.per100g)).map(f => f.name), []);
});

test('isPlausibleFood: respinge i valori impossibili', () => {
  assert.equal(isPlausibleFood({ kcal: 200, protein: 27, carbs: 45, fat: 88 }), false); // macro > 100 g
  assert.equal(isPlausibleFood({ kcal: 600, protein: 5, carbs: 5, fat: 5 }), false);    // kcal che non tornano
  assert.equal(isPlausibleFood({ kcal: 59, protein: 10, carbs: 3.6, fat: 0.4 }), true);
});

test('searchFoods: senza distinzione di maiuscole, e gli alimenti personali vengono prima', async () => {
  const found = await searchFoods('POLLO');
  assert.ok(found.length > 0 && found.every(f => f.name.toLowerCase().includes('pollo')));
  const mine = makeCustomFood({ name: 'Pollo di Chiara', per100g: { kcal: 100, protein: 20, carbs: 0, fat: 2 } });
  assert.equal((await searchFoods('pollo', [mine]))[0].id, mine.id);
});

test('findFood trova sia i cibi di base sia quelli personali (e null se non esiste)', () => {
  const mine = makeCustomFood({ name: 'X', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } });
  assert.equal(findFood('banana').name, 'Banana');
  assert.equal(findFood(mine.id, [mine]).name, 'X');
  assert.equal(findFood('boh'), null);
});

test('normalizeCustomFoods scarta le voci rovinate', () => {
  const good = makeCustomFood({ name: 'Ok', per100g: { kcal: 10, protein: 1, carbs: 1, fat: 0 } });
  assert.deepEqual(normalizeCustomFoods([good, { id: 5 }, null, { id: 'a', name: 'b', per100g: { kcal: 'x' } }]).map(f => f.id), [good.id]);
  assert.deepEqual(normalizeCustomFoods('boh'), []);
});
