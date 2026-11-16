// Stato dell'app + pub/sub. La UI NON legge mai localStorage: passa da qui.
import { STORAGE_KEYS } from './config.js';
import { load, save, remove } from './storage.js';
import { normalizeProfile } from './profile.js';
import { emptyDay, addEntry, removeEntry, makeEntry, copyMeal, normalizeLogs, shiftDayKey, todayKey } from './log.js';
import { makeCustomFood, normalizeCustomFoods } from './data/foods.js';
import { emptyHabits, normalizeHabits, addWater as addWaterTo, addWeight, removeWeight,
  addSupplement, removeSupplement, toggleSupplement as toggleSupplementOn } from './habits.js';

const listeners = new Set();
// logs:   { '2026-11-12': { breakfast: [...], ... } }   habits: acqua, peso, integratori (vedi habits.js)
const initialState = () => ({ profile: null, logs: {}, habits: emptyHabits(), customFoods: [], view: 'home' });
let state = initialState();

export const getState = () => state;
export const getToday = () => state.logs[todayKey()] ?? emptyDay();

export function hydrate() {
  // Ogni lettura passa da un "normalize": profili e dati salvati da versioni precedenti non rompono l'app.
  state = {
    ...state,
    profile: normalizeProfile(load(STORAGE_KEYS.profile)),
    logs: normalizeLogs(load(STORAGE_KEYS.logs, {})),
    habits: normalizeHabits(load(STORAGE_KEYS.habits)),
    customFoods: normalizeCustomFoods(load(STORAGE_KEYS.customFoods, [])),
  };
}

const PERSISTED = ['profile', 'logs', 'habits', 'customFoods']; // le chiavi dello stato che finiscono su disco (non `view`)

export function setState(patch) {
  state = { ...state, ...patch };                       // nuovo oggetto: mai modificare lo stato "sul posto"
  PERSISTED.forEach(key => { if (key in patch) save(STORAGE_KEYS[key], state[key]); });
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn); // funzione di "unsubscribe"
}

// ---------- profilo ----------
/** Unico punto in cui un profilo entra nello stato: sempre "normalizzato". */
export function saveProfile(profile) {
  setState({ profile: normalizeProfile(profile) });
}

/** Cambia solo alcuni campi del profilo (es. { goal, activity }), tenendo gli altri. */
export function updateProfile(patch) {
  saveProfile({ ...state.profile, ...patch });
}

// ---------- diario pasti ----------
const setToday = day => setState({ logs: { ...state.logs, [todayKey()]: day } });

/** Restituisce la voce creata: serve a chi vuole poterla annullare. */
export function addFood(mealId, food, grams) {
  const entry = makeEntry(food, grams);
  setToday(addEntry(getToday(), mealId, entry));
  return entry;
}

/** Restituisce la voce rimossa (o null): serve a chi vuole poterla ripristinare. */
export function removeFood(mealId, entryId) {
  const removed = getToday()[mealId]?.find(entry => entry.id === entryId) ?? null;
  setToday(removeEntry(getToday(), mealId, entryId));
  return removed;
}

/** Rimette una voce già esistente (annulla di una rimozione). */
export const restoreEntry = (mealId, entry) => setToday(addEntry(getToday(), mealId, entry));

/** Copia in oggi gli alimenti di ieri per quel pasto. Restituisce le voci create (per poterle annullare). */
export function repeatYesterday(mealId) {
  const before = getToday()[mealId];
  const next = copyMeal(getToday(), state.logs[shiftDayKey(todayKey(), -1)], mealId);
  setToday(next);
  return next[mealId].slice(before.length);
}

// ---------- alimenti personali ----------
export const addCustomFood = value => setState({ customFoods: [...state.customFoods, makeCustomFood(value)] });
export const deleteCustomFood = id => setState({ customFoods: state.customFoods.filter(food => food.id !== id) });

// ---------- abitudini (acqua, peso, integratori): la logica è in habits.js, qui si applica allo stato ----------
const setHabits = habits => setState({ habits });

export const addWater = ml => setHabits(addWaterTo(state.habits, todayKey(), ml));
export const deleteWeight = date => setHabits(removeWeight(state.habits, date));
export const addSupplementItem = name => setHabits(addSupplement(state.habits, name));
export const deleteSupplement = id => setHabits(removeSupplement(state.habits, id));
export const toggleSupplement = id => setHabits(toggleSupplementOn(state.habits, todayKey(), id));

/** Registra il peso di oggi E aggiorna quello del profilo: i target (BMR, macro, acqua) si ricalcolano da soli.
 *  Un solo setState con due campi = un solo salvataggio per chiave e un solo render. */
export function logWeight(kg) {
  setState({
    habits: addWeight(state.habits, todayKey(), kg),
    profile: normalizeProfile({ ...state.profile, weightKg: kg }),
  });
}

// ---------- ripristino da backup ----------
/** `data` arriva da parseBackup (già pulito). Un solo setState: un solo render e un solo salvataggio per chiave. */
export function restoreAll({ profile, logs, habits, customFoods }) {
  setState({ profile: normalizeProfile(profile), logs, habits, customFoods });
}

// ---------- cancellazione ----------
/** Cancella TUTTI i dati dell'utente (disco e memoria): l'app riparte dall'onboarding. */
export function resetAll() {
  Object.values(STORAGE_KEYS).forEach(remove);
  state = initialState();
  listeners.forEach(fn => fn(state));
}
