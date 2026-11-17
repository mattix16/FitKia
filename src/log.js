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

// ---------- Pasti preferiti: un nome + gli SNAPSHOT degli alimenti (senza id: gli id nascono quando li rimetti nel diario) ----------
const snapshot = ({ foodId, name, grams, kcal, protein, carbs, fat }) => ({ foodId, name, grams, kcal, protein, carbs, fat });

/** Crea un preferito dalle voci di un pasto. favorite = { id, name, mealId, items: [{ foodId, name, grams, kcal, ... }] } */
export const makeFavorite = (name, mealId, entries) => ({ id: newId(), name, mealId, items: entries.map(snapshot) });

/** Aggiunge al pasto `mealId` di `day` una copia (id nuovi) degli alimenti del preferito. I valori restano quelli salvati. */
export function applyFavorite(day, mealId, favorite) {
  const entries = favorite.items.map(item => ({ id: newId(), ...snapshot(item) }));
  return { ...day, [mealId]: [...(day[mealId] ?? []), ...entries] };
}

/** Totale kcal di un preferito (per l'etichetta "Colazione tipo · 420 kcal"). */
export const favoriteKcal = favorite => sumEntries(favorite.items).kcal;

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Preferiti letti dal disco -> solo quelli ben formati (dati vecchi o rovinati non rompono l'app). */
export function normalizeFavorites(raw) {
  if (!Array.isArray(raw)) return [];
  const isItem = i => isObject(i) && typeof i.name === 'string' && ['grams', 'kcal', 'protein', 'carbs', 'fat'].every(k => Number.isFinite(i[k]));
  return raw
    .filter(f => isObject(f) && typeof f.id === 'string' && typeof f.name === 'string' && Array.isArray(f.items) && f.items.every(isItem))
    .map(f => ({ id: f.id, name: f.name, mealId: f.mealId ?? null, items: f.items.map(snapshot) }));
}
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

/**
 * "Prossimo passo" della home: UN solo suggerimento, il più utile adesso. Puro: riceve valori semplici, restituisce dati.
 * Priorità: pasto dell'ora ancora vuoto (copia da ieri se possibile) > peso al mattino > acqua nel pomeriggio > integratori la sera.
 * @param {{ hour: number, day: object, yesterday?: object, waterMl: number, waterGoalMl: number,
 *   hasWeightToday: boolean, supplementsLeft: number }} input
 * @returns {null | { kind: 'repeat' | 'log' | 'weight' | 'water' | 'supplements', mealId?: string, count?: number }}
 */
export function nextStep({ hour, day, yesterday = {}, waterMl, waterGoalMl, hasWeightToday, supplementsLeft }) {
  const mealId = defaultMealId(hour);
  if ((day[mealId] ?? []).length === 0) {
    const count = (yesterday[mealId] ?? []).length;
    return count > 0 ? { kind: 'repeat', mealId, count } : { kind: 'log', mealId };
  }
  if (!hasWeightToday && hour < 12) return { kind: 'weight' };
  if (hour >= 14 && waterMl < waterGoalMl / 2) return { kind: 'water' };
  if (hour >= 18 && supplementsLeft > 0) return { kind: 'supplements', count: supplementsLeft };
  return null;
}
