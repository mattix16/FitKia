// Stato dell'app + pub/sub. La UI NON legge mai localStorage: passa da qui.
import { STORAGE_KEYS } from './config.js';
import { load, save, remove } from './storage.js';
import { normalizeProfile } from './profile.js';
import { emptyDay, addEntry, removeEntry, replaceEntry as replaceEntryIn, scaleEntry, makeEntry, copyMeal, normalizeLogs, shiftDayKey, todayKey,
  makeFavorite, applyFavorite, normalizeFavorites } from './log.js';
import { makeCustomFood, normalizeCustomFoods } from './data/foods.js';
import { emptyHabits, normalizeHabits, addWater as addWaterTo, addWeight, removeWeight, weightOnOr,
  addSupplement, removeSupplement, toggleSupplement as toggleSupplementOn } from './habits.js';

const listeners = new Set();
// logs:   { '2026-11-12': { breakfast: [...], ... } }   habits: acqua, peso, integratori (vedi habits.js)
const initialState = () => ({ profile: null, logs: {}, habits: emptyHabits(), customFoods: [], favorites: [], view: 'home' });
let state = initialState();

export const getState = () => state;
export const getToday = () => state.logs[todayKey()] ?? emptyDay();
export const getYesterday = () => state.logs[shiftDayKey(todayKey(), -1)] ?? emptyDay();
/** Selettore: quanti alimenti ha ieri il pasto `mealId` (0 = niente da copiare). */
export const yesterdayCount = mealId => getYesterday()[mealId]?.length ?? 0;

export function hydrate() {
  // Ogni lettura passa da un "normalize": profili e dati salvati da versioni precedenti non rompono l'app.
  state = {
    ...state,
    profile: normalizeProfile(load(STORAGE_KEYS.profile)),
    logs: normalizeLogs(load(STORAGE_KEYS.logs, {})),
    habits: normalizeHabits(load(STORAGE_KEYS.habits)),
    customFoods: normalizeCustomFoods(load(STORAGE_KEYS.customFoods, [])),
    favorites: normalizeFavorites(load(STORAGE_KEYS.favorites, [])),   // chiave assente (utenti v3) -> []
  };
}

const PERSISTED = ['profile', 'logs', 'habits', 'customFoods', 'favorites']; // le chiavi dello stato che finiscono su disco (non `view`)

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

/** Salva i dati personali (value = esito di validateProfile). Se il peso è cambiato rispetto a quello che l'app conosce per oggi
 *  (la pesata di oggi, o in mancanza il peso del profilo) registra anche la pesata: grafico e profilo restano sincronizzati.
 *  addWeight tiene UNA pesata per giorno, quindi non nascono doppioni. Un solo setState: un solo salvataggio e un solo render.
 *  Restituisce true se ha registrato una pesata. */
export function savePersonalData(value) {
  const today = todayKey();
  const kg = Math.round(value.weightKg * 10) / 10;                 // come validateWeightInput: 1 decimale
  const weightChanged = kg !== weightOnOr(state.habits, today, state.profile.weightKg);
  const profile = normalizeProfile({ ...state.profile, ...value, weightKg: kg });
  setState(weightChanged ? { profile, habits: addWeight(state.habits, today, kg) } : { profile });
  return weightChanged;
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

/** Cambia i grammi di una voce di oggi (kcal e macro si scalano in proporzione). Restituisce la voce COM'ERA prima
 *  (serve all'annulla), o null se la voce non esiste o i grammi non sono validi: in quel caso non cambia nulla. */
export function updateEntry(mealId, entryId, grams) {
  const day = getToday();
  const previous = day[mealId]?.find(entry => entry.id === entryId) ?? null;
  const next = previous && scaleEntry(previous, grams);
  if (!next) return null;
  setToday(replaceEntryIn(day, mealId, next));
  return previous;
}

/** Rimette una voce com'era (annulla di updateEntry): lo snapshot ESATTO, senza ricalcoli, quindi nessun arrotondamento perso. */
export const replaceEntry = (mealId, entry) => setToday(replaceEntryIn(getToday(), mealId, entry));

/** Copia in oggi gli alimenti di ieri per quel pasto. Restituisce le voci create (per poterle annullare). */
export function repeatYesterday(mealId) {
  const before = getToday()[mealId];
  const next = copyMeal(getToday(), getYesterday(), mealId);
  setToday(next);
  return next[mealId].slice(before.length);
}

// ---------- pasti preferiti ----------
/** Salva gli alimenti ATTUALI di oggi per `mealId` come preferito. `name` arriva già validato (validateFavoriteName). */
export function saveFavorite(name, mealId) {
  const favorite = makeFavorite(name, mealId, getToday()[mealId] ?? []);
  setState({ favorites: [...state.favorites, favorite] });
  return favorite;
}

export const deleteFavorite = id => setState({ favorites: state.favorites.filter(f => f.id !== id) });

/** Mette in oggi gli alimenti del preferito. Restituisce le voci create (per l'annulla). */
export function addFavoriteToMeal(mealId, favoriteId) {
  const favorite = state.favorites.find(f => f.id === favoriteId);
  if (!favorite) return [];
  const before = getToday()[mealId].length;
  const next = applyFavorite(getToday(), mealId, favorite);
  setToday(next);
  return next[mealId].slice(before);
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
/** `data` = value di validateBackup (già controllato e ripulito). Chiamare SOLO se ok === true.
 *  Un solo setState: un solo render e un solo salvataggio per chiave. I normalize sono una seconda rete di sicurezza. */
export function restoreAll({ profile, logs, habits, customFoods, favorites = [] }) {
  setState({
    profile: normalizeProfile(profile),
    logs: normalizeLogs(logs),
    habits: normalizeHabits(habits),
    customFoods: normalizeCustomFoods(customFoods),
    favorites: normalizeFavorites(favorites),
  });
}

// ---------- cancellazione ----------
/** Cancella TUTTI i dati dell'utente (disco e memoria): l'app riparte dall'onboarding. */
export function resetAll() {
  Object.values(STORAGE_KEYS).forEach(remove);
  state = initialState();
  listeners.forEach(fn => fn(state));
}
