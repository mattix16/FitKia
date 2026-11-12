// Logica PURA del diario: niente DOM, niente localStorage. Un "giorno" è { breakfast: [...], lunch: [...], ... }
import { MEALS } from './config.js';
import { nutrientsFor } from './nutrition.js';

/** Chiave del giorno YYYY-MM-DD in ora LOCALE (toISOString userebbe l'UTC e di notte sbaglierebbe giorno). */
export const todayKey = () => new Date().toLocaleDateString('sv-SE');

export const emptyDay = () => Object.fromEntries(MEALS.map(meal => [meal.id, []]));

/** Pasto proposto dal pulsante "+" centrale, in base all'ora. */
export function defaultMealId(hour = new Date().getHours()) {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 18) return 'snack';
  return 'dinner';
}

/** Una voce salva uno SNAPSHOT dei valori: resta corretta anche se il dizionario o l'API cambiano. */
export function makeEntry(food, grams) {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return { id, foodId: food.id, name: food.name, grams, ...nutrientsFor(food, grams) };
}

/** Restituisce un NUOVO giorno (non modifica l'originale: lo store ragiona per sostituzione). */
export function addEntry(day, mealId, entry) {
  return { ...day, [mealId]: [...day[mealId], entry] };
}

export function removeEntry(day, mealId, entryId) {
  return { ...day, [mealId]: day[mealId].filter(entry => entry.id !== entryId) };
}

/** Somma kcal e macro di un elenco di voci. reduce: parte da un totale a zero e lo aggiorna a ogni voce. */
export function sumEntries(entries) {
  return entries.reduce(
    (total, e) => ({ kcal: total.kcal + e.kcal, protein: total.protein + e.protein, carbs: total.carbs + e.carbs, fat: total.fat + e.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export const mealTotals = (day, mealId) => sumEntries(day[mealId] ?? []);
export const dayTotals = day => sumEntries(Object.values(day).flat());
