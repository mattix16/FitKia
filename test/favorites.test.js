// Pasti preferiti, "copia da ieri" e suggerimento "prossimo passo" (logica pura in log.js / validation.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDay, makeEntry, addEntry, copyMeal, dayTotals, makeFavorite, applyFavorite, favoriteKcal, normalizeFavorites, nextStep } from '../src/log.js';
import { validateFavoriteName } from '../src/validation.js';
import { MAX_FAVORITES } from '../src/config.js';

const banana = { id: 'banana', name: 'Banana', per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } };
const oats = { id: 'fiocchi-avena', name: "Fiocchi d'avena", per100g: { kcal: 372, protein: 13.5, carbs: 59, fat: 7 } };
const breakfast = addEntry(addEntry(emptyDay(), 'breakfast', makeEntry(banana, 120)), 'breakfast', makeEntry(oats, 50));

test('preferito: salva gli SNAPSHOT (senza id) e applicarlo crea voci nuove con gli stessi valori', () => {
  const favorite = makeFavorite('Colazione tipo', 'breakfast', breakfast.breakfast);
  assert.equal(favorite.items.length, 2);
  assert.equal('id' in favorite.items[0], false);
  assert.equal(favoriteKcal(favorite), dayTotals(breakfast).kcal);

  const today = applyFavorite(emptyDay(), 'snack', favorite);       // si può usare anche in un altro pasto
  assert.equal(today.snack.length, 2);
  assert.notEqual(today.snack[0].id, today.snack[1].id);
  assert.deepEqual(today.snack.map(({ id, ...rest }) => rest), favorite.items);
  assert.equal(dayTotals(today).kcal, favoriteKcal(favorite));      // i totali si ricalcolano dagli snapshot
});

test('copia da ieri: id nuovi, snapshot identici, il giorno di ieri non cambia', () => {
  const today = addEntry(emptyDay(), 'breakfast', makeEntry(banana, 50));
  const next = copyMeal(today, breakfast, 'breakfast');
  assert.equal(next.breakfast.length, 3);
  assert.equal(breakfast.breakfast.length, 2);
  assert.ok(next.breakfast.slice(1).every((e, i) => e.id !== breakfast.breakfast[i].id && e.kcal === breakfast.breakfast[i].kcal));
  assert.deepEqual(copyMeal(today, undefined, 'breakfast'), today);  // ieri senza dati: nessuna copia
});

test('validateFavoriteName: pasto vuoto, nome vuoto/lungo, doppioni (senza maiuscole) e limite massimo', () => {
  assert.equal(validateFavoriteName({ name: 'Ok' }, [], 0).ok, false);
  assert.equal(validateFavoriteName({ name: '   ' }, [], 2).ok, false);
  assert.equal(validateFavoriteName({ name: 'x'.repeat(31) }, [], 2).ok, false);
  assert.equal(validateFavoriteName({ name: 'colazione TIPO' }, ['Colazione tipo'], 2).ok, false);
  assert.equal(validateFavoriteName({ name: 'Nuovo' }, Array.from({ length: MAX_FAVORITES }, (_, i) => `p${i}`), 2).ok, false);
  assert.deepEqual(validateFavoriteName({ name: '  Pranzo   veloce ' }, [], 2), { ok: true, errors: {}, value: { name: 'Pranzo veloce' } });
});

test('normalizeFavorites: dati vecchi o rovinati non rompono l\'app', () => {
  assert.deepEqual(normalizeFavorites(null), []);
  assert.deepEqual(normalizeFavorites([{ id: 1 }, { id: 'a', name: 'A', items: [{ name: 'x', grams: 'tanti' }] }]), []);
  const ok = normalizeFavorites([{ id: 'a', name: 'A', items: makeFavorite('A', 'lunch', breakfast.breakfast).items }]);
  assert.equal(ok[0].mealId, null);
});

test('nextStep: un solo suggerimento, nell\'ordine di priorità', () => {
  const base = { day: emptyDay(), yesterday: emptyDay(), waterMl: 0, waterGoalMl: 2000, hasWeightToday: false, supplementsLeft: 2 };
  assert.deepEqual(nextStep({ ...base, hour: 8, yesterday: breakfast }), { kind: 'repeat', mealId: 'breakfast', count: 2 });
  assert.deepEqual(nextStep({ ...base, hour: 8 }), { kind: 'log', mealId: 'breakfast' });
  assert.deepEqual(nextStep({ ...base, hour: 9, day: breakfast }), { kind: 'weight' });
  const fed = { ...emptyDay(), ...breakfast, lunch: breakfast.breakfast, snack: breakfast.breakfast, dinner: breakfast.breakfast };
  assert.deepEqual(nextStep({ ...base, hour: 15, day: fed }), { kind: 'water' });
  assert.deepEqual(nextStep({ ...base, hour: 20, day: fed, waterMl: 1800 }), { kind: 'supplements', count: 2 });
  assert.equal(nextStep({ ...base, hour: 20, day: fed, waterMl: 1800, supplementsLeft: 0 }), null);
});
