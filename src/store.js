// Stato dell'app + pub/sub. La UI NON legge mai localStorage: passa da qui.
import { STORAGE_KEYS } from './config.js';
import { load, save, remove } from './storage.js';
import { normalizeProfile } from './profile.js';
import { emptyDay, addEntry, removeEntry, makeEntry, todayKey } from './log.js';
import { emptyHabits, normalizeHabits, addWater as addWaterTo, addWeight, removeWeight,
  addSupplement, removeSupplement, toggleSupplement as toggleSupplementOn } from './habits.js';

const listeners = new Set();
// logs:   { '2026-11-12': { breakfast: [...], ... } }   habits: acqua, peso, integratori (vedi habits.js)
const initialState = () => ({ profile: null, logs: {}, habits: emptyHabits(), view: 'home' });
let state = initialState();

export const getState = () => state;
export const getToday = () => state.logs[todayKey()] ?? emptyDay();

export function hydrate() {
  // Ogni lettura passa da un "normalize": profili e dati salvati da versioni precedenti non rompono l'app.
  state = {
    ...state,
    profile: normalizeProfile(load(STORAGE_KEYS.profile)),
    logs: load(STORAGE_KEYS.logs, {}),
    habits: normalizeHabits(load(STORAGE_KEYS.habits)),
  };
}

const PERSISTED = ['profile', 'logs', 'habits']; // le chiavi dello stato che finiscono su disco (non `view`)

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
export function addFood(mealId, food, grams) {
  const day = addEntry(getToday(), mealId, makeEntry(food, grams));
  setState({ logs: { ...state.logs, [todayKey()]: day } });
}

export function removeFood(mealId, entryId) {
  const day = removeEntry(getToday(), mealId, entryId);
  setState({ logs: { ...state.logs, [todayKey()]: day } });
}

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

// ---------- cancellazione ----------
/** Cancella TUTTI i dati dell'utente (disco e memoria): l'app riparte dall'onboarding. */
export function resetAll() {
  Object.values(STORAGE_KEYS).forEach(remove);
  state = initialState();
  listeners.forEach(fn => fn(state));
}