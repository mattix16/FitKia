// Logica PURA del diario: niente DOM, niente localStorage. Un "giorno" è { breakfast: [...], lunch: [...], ... }
import { MEALS } from './config.js';
import { nutrientsFor } from './nutrition.js';
import { newId } from './id.js';

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
  return { id: newId(), foodId: food.id, name: food.name, grams, ...nutrientsFor(food, grams) };
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

/** Giorno prima/dopo una chiave 'YYYY-MM-DD' (ora locale: new Date(a, m, g + delta) gestisce da solo mesi, anni e ora legale). */
export function shiftDayKey(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d + delta).toLocaleDateString('sv-SE');
}

/** Gli ultimi `count` giorni (oggi per primo) con i totali di kcal e macro; i giorni senza dati valgono 0. */
export function recentDays(logs, count, today = todayKey()) {
  return Array.from({ length: count }, (_, i) => {
    const date = shiftDayKey(today, -i);
    return { date, ...dayTotals(logs[date] ?? emptyDay()) };
  });
}

/** Gli alimenti più ricorrenti negli ultimi `days` giorni, con la porzione dell'ultima volta.
 *  Parità di conteggio: vince il più recente. Il risultato contiene solo id, nome e grammi (non i valori nutrizionali). */
export function recentFoods(logs, limit, today = todayKey(), days = 30) {
  const stats = new Map();
  for (let i = 0; i < days; i++) {                       // dal giorno più recente al più vecchio
    const day = logs[shiftDayKey(today, -i)];
    if (!day) continue;
    for (const entry of Object.values(day).flat()) {
      const found = stats.get(entry.foodId);
      if (found) found.count += 1;
      else stats.set(entry.foodId, { foodId: entry.foodId, name: entry.name, grams: entry.grams, count: 1, order: stats.size });
    }
  }
  return [...stats.values()]
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, limit)
    .map(({ foodId, name, grams, count }) => ({ foodId, name, grams, count }));
}

/** Aggiunge a `day` una COPIA (con id nuovi) degli alimenti di `mealId` presi da `sourceDay` (es. ieri). */
export function copyMeal(day, sourceDay, mealId) {
  const copies = (sourceDay?.[mealId] ?? []).map(entry => ({ ...entry, id: newId() }));
  return { ...day, [mealId]: [...day[mealId], ...copies] };
}

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isEntry = e => isObject(e) && typeof e.id === 'string' && typeof e.name === 'string'
  && ['grams', 'kcal', 'protein', 'carbs', 'fat'].every(k => Number.isFinite(e[k]));

/** Diario letto dal disco o da un backup -> solo giorni e voci ben formati (il resto viene scartato). */
export function normalizeLogs(raw) {
  if (!isObject(raw)) return {};
  const logs = {};
  for (const [date, day] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isObject(day)) continue;
    logs[date] = Object.fromEntries(MEALS.map(meal => [meal.id, (Array.isArray(day[meal.id]) ? day[meal.id] : []).filter(isEntry)]));
  }
  return logs;
}

export const mealTotals = (day, mealId) => sumEntries(day[mealId] ?? []);
export const dayTotals = day => sumEntries(Object.values(day).flat());
