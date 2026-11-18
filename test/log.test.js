import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDay, makeEntry, addEntry, removeEntry, sumEntries, dayTotals, mealTotals, defaultMealId } from '../src/log.js';
import { recentFoods, copyMeal, normalizeLogs, scaleEntry, replaceEntry } from '../src/log.js';

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

// ---------- Pacchetto A: modifica grammi, recenti per pasto ----------

test('scaleEntry: kcal e macro dello snapshot scalati in proporzione, stesso id, originale intatto', () => {
  const entry = makeEntry(banana, 100);                              // 89 kcal · P 1,1 · C 23 · G 0,3
  assert.deepEqual(scaleEntry(entry, 200), { ...entry, grams: 200, kcal: 178, protein: 2.2, carbs: 46, fat: 0.6 });
  const odd = scaleEntry(entry, 33);                                 // 29,37 kcal -> 29; macro a 1 decimale
  assert.deepEqual([odd.kcal, odd.protein, odd.carbs, odd.fat], [29, 0.4, 7.6, 0.1]);
  assert.equal(odd.id, entry.id);
  assert.equal(odd.foodId, 'banana');
  assert.equal(entry.grams, 100);                                    // non modifica la voce di partenza
  assert.equal(entry.kcal, 89);
});

test('scaleEntry: grammi non validi o voce senza grammi validi -> null', () => {
  const entry = makeEntry(banana, 100);
  for (const grams of [0, -5, NaN, Infinity, undefined, '50']) assert.equal(scaleEntry(entry, grams), null, String(grams));
  assert.equal(scaleEntry({ ...entry, grams: 0 }, 50), null);        // niente divisione per zero
  assert.equal(scaleEntry({ ...entry, grams: NaN }, 50), null);
});

test('scaleEntry: scalando avanti e indietro la deriva resta entro 1 kcal (per questo l\'annulla rimette lo snapshot esatto)', () => {
  const entry = makeEntry(banana, 100);
  const back = scaleEntry(scaleEntry(entry, 33), 100);
  assert.ok(Math.abs(back.kcal - entry.kcal) <= 1, `${back.kcal} vs ${entry.kcal}`);
});

test('replaceEntry: sostituisce nella stessa posizione e non modifica il giorno originale', () => {
  const a = makeEntry(banana, 100), b = makeEntry(mela, 120), c = makeEntry(banana, 50);
  const day = [a, b, c].reduce((d, entry) => addEntry(d, 'snack', entry), emptyDay());
  const next = replaceEntry(day, 'snack', scaleEntry(b, 60));
  assert.deepEqual(next.snack.map(e => e.id), [a.id, b.id, c.id]);
  assert.equal(next.snack[1].grams, 60);
  assert.equal(day.snack[1].grams, 120);
  assert.equal(next.lunch, day.lunch);                               // gli altri pasti non si toccano
});

test('replaceEntry: id assente = stesso giorno', () => {
  const day = emptyDay();
  assert.equal(replaceEntry(day, 'snack', makeEntry(banana, 100)), day);
});

test('recentFoods con mealId: prima gli alimenti di quel pasto, con la porzione usata in quel pasto', () => {
  const logs = {
    '2026-11-12': addEntry(addEntry(addEntry(emptyDay(), 'breakfast', makeEntry(banana, 100)), 'snack', makeEntry(mela, 120)), 'snack', makeEntry(banana, 999)),
    '2026-11-11': addEntry(addEntry(addEntry(emptyDay(), 'breakfast', makeEntry(banana, 110)), 'snack', makeEntry(mela, 130)), 'snack', makeEntry(mela, 140)),
    '2026-11-10': addEntry(emptyDay(), 'snack', makeEntry(mela, 90)),
  };
  // senza mealId: invariato (mela 4 volte, banana 3; porzione = la più recente in assoluto)
  assert.deepEqual(recentFoods(logs, 5, '2026-11-12').map(f => [f.foodId, f.count, f.grams]), [['mela', 4, 120], ['banana', 3, 100]]);
  // colazione: la banana (2 colazioni) passa avanti alla mela (0), con la porzione della colazione
  assert.deepEqual(recentFoods(logs, 5, '2026-11-12', 30, 'breakfast').map(f => [f.foodId, f.grams]), [['banana', 100], ['mela', 120]]);
  // snack: la mela resta prima; la banana, usata una volta come snack, propone i 999 g di quello snack
  assert.deepEqual(recentFoods(logs, 5, '2026-11-12', 30, 'snack').map(f => [f.foodId, f.grams]), [['mela', 120], ['banana', 999]]);
  assert.equal(recentFoods(logs, 1, '2026-11-12', 30, 'breakfast').length, 1);
});
