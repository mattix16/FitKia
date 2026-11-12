// Stato dell'app + pub/sub. La UI NON legge mai localStorage: passa da qui.
import { STORAGE_KEYS } from './config.js';
import { load, save } from './storage.js';
import { emptyDay, addEntry, removeEntry, makeEntry, todayKey } from './log.js';

const listeners = new Set();
// logs: { '2026-11-12': { breakfast: [...], lunch: [...], ... } }  (un giorno per chiave)
let state = { profile: null, goal: 'lose', logs: {} };

export const getState = () => state;
export const getToday = () => state.logs[todayKey()] ?? emptyDay();

export function hydrate() {
  state = { ...state, profile: load(STORAGE_KEYS.profile), logs: load(STORAGE_KEYS.logs, {}) };
}

export function setState(patch) {
  state = { ...state, ...patch };                       // nuovo oggetto: mai modificare lo stato "sul posto"
  if ('profile' in patch) save(STORAGE_KEYS.profile, state.profile);
  if ('logs' in patch) save(STORAGE_KEYS.logs, state.logs);
  listeners.forEach(fn => fn(state));
}

export function addFood(mealId, food, grams) {
  const day = addEntry(getToday(), mealId, makeEntry(food, grams));
  setState({ logs: { ...state.logs, [todayKey()]: day } });
}

export function removeFood(mealId, entryId) {
  const day = removeEntry(getToday(), mealId, entryId);
  setState({ logs: { ...state.logs, [todayKey()]: day } });
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn); // funzione di "unsubscribe"
}
