// Stato dell'app + pub/sub. La UI NON legge mai localStorage: passa da qui.
import { STORAGE_KEYS } from './config.js';
import { load, save, remove } from './storage.js';
import { normalizeProfile } from './profile.js';
import { emptyDay, addEntry, removeEntry, replaceEntry as replaceEntryIn, scaleEntry, makeEntry, copyMeal, normalizeLogs, shiftDayKey, todayKey,
  makeFavorite, applyFavorite, normalizeFavorites } from './log.js';
import { makeCustomFood, normalizeCustomFoods } from './data/foods.js';
import { emptyHabits, normalizeHabits, addWater as addWaterTo, addWeight, removeWeight, weightOnOr,
  addSupplement, removeSupplement, toggleSupplement as toggleSupplementOn } from './habits.js';
import { emptyMeta, normalizeMeta, markBackupDone as markBackupDoneOn, snoozeBackupReminder as snoozeBackupReminderOn,
  dismissInstallHint as dismissInstallHintOn, setWeightRange as setWeightRangeOn } from './meta.js';

const listeners = new Set();
// logs:   { '2026-11-12': { breakfast: [...], ... } }   habits: acqua, peso, integratori (vedi habits.js)
// meta:   promemoria del dispositivo (vedi meta.js)   saveFailed: l'ultimo salvataggio su disco non è riuscito (NON si salva)
// viewedDay: il giorno del diario che la Home mostra e modifica ('YYYY-MM-DD'), oppure null = OGGI (segue la mezzanotte da solo). NON si salva.
const initialState = () => ({ profile: null, logs: {}, habits: emptyHabits(), customFoods: [], favorites: [], meta: emptyMeta(), view: 'home', viewedDay: null, saveFailed: false });
let state = initialState();

export const getState = () => state;

// ---------- giorno mostrato (A5) ----------
/** Il giorno del diario su cui lavora la Home: quello scelto, o oggi. */
export const getViewedDay = () => state.viewedDay ?? todayKey();
export const isViewingToday = () => getViewedDay() === todayKey();
/** Il diario di un giorno (vuoto se non c'è). Senza argomento: il giorno mostrato. */
export const getDayLog = (date = getViewedDay()) => state.logs[date] ?? emptyDay();
export const getPreviousDayLog = (date = getViewedDay()) => getDayLog(shiftDayKey(date, -1));
/** Selettore: quanti alimenti ha il giorno prima il pasto `mealId` (0 = niente da copiare). */
export const previousDayCount = (mealId, date = getViewedDay()) => getPreviousDayLog(date)[mealId]?.length ?? 0;

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
/** Sceglie il giorno da mostrare. `null` o oggi = oggi. Rifiuta (false) formati sbagliati, date inesistenti (2026-02-31) e giorni futuri:
 *  nel futuro non si registra nulla. Le chiavi 'YYYY-MM-DD' si confrontano come testo. Non viene salvato. */
export function setViewedDay(date) {
  if (date === null || date === todayKey()) { setState({ viewedDay: null }); return true; }
  if (typeof date !== 'string' || !DAY_KEY.test(date) || shiftDayKey(date, 0) !== date || date > todayKey()) return false;
  setState({ viewedDay: date });
  return true;
}

export function hydrate() {
  // Ogni lettura passa da un "normalize": profili e dati salvati da versioni precedenti non rompono l'app.
  state = {
    ...state,
    profile: normalizeProfile(load(STORAGE_KEYS.profile)),
    logs: normalizeLogs(load(STORAGE_KEYS.logs, {})),
    habits: normalizeHabits(load(STORAGE_KEYS.habits)),
    customFoods: normalizeCustomFoods(load(STORAGE_KEYS.customFoods, [])),
    favorites: normalizeFavorites(load(STORAGE_KEYS.favorites, [])),   // chiave assente (utenti v3) -> []
    meta: normalizeMeta(load(STORAGE_KEYS.meta)),                      // chiave assente (utenti precedenti) -> valori vuoti
  };
}

const PERSISTED = ['profile', 'logs', 'habits', 'customFoods', 'favorites', 'meta']; // le chiavi dello stato che finiscono su disco (non `view`)

export function setState(patch) {
  const next = { ...state, ...patch };                  // nuovo oggetto: mai modificare lo stato "sul posto"
  // save() dice se ha scritto: un solo salvataggio fallito basta ad accendere l'avviso, e il primo riuscito lo spegne.
  // Un cambio che non salva nulla (es. la vista) lascia l'avviso com'è.
  const written = PERSISTED.filter(key => key in patch).map(key => save(STORAGE_KEYS[key], next[key]));
  state = { ...next, saveFailed: written.length > 0 ? written.includes(false) : state.saveFailed };
  listeners.forEach(fn => fn(state));
}

/** Riscrive TUTTO su disco (pulsante "Riprova" dell'avviso): utile dopo aver liberato spazio. */
export function persistAll() {
  const written = PERSISTED.map(key => save(STORAGE_KEYS[key], state[key]));
  state = { ...state, saveFailed: written.includes(false) };
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
// Ogni azione lavora su `date` (ultimo parametro, di default il giorno mostrato). Chi crea un "annulla" cattura la data nel momento
// dell'azione e la ripassa: se nel frattempo si cambia giorno, l'annulla agisce comunque sul giorno giusto.
const setDay = (date, day) => setState({ logs: { ...state.logs, [date]: day } });

/** Restituisce la voce creata: serve a chi vuole poterla annullare. */
export function addFood(mealId, food, grams, date = getViewedDay()) {
  const entry = makeEntry(food, grams);
  setDay(date, addEntry(getDayLog(date), mealId, entry));
  return entry;
}

/** Restituisce la voce rimossa (o null): serve a chi vuole poterla ripristinare. */
export function removeFood(mealId, entryId, date = getViewedDay()) {
  const removed = getDayLog(date)[mealId]?.find(entry => entry.id === entryId) ?? null;
  setDay(date, removeEntry(getDayLog(date), mealId, entryId));
  return removed;
}

/** Rimette una voce già esistente (annulla di una rimozione). */
export const restoreEntry = (mealId, entry, date = getViewedDay()) => setDay(date, addEntry(getDayLog(date), mealId, entry));

/** Cambia i grammi di una voce del giorno (kcal e macro si scalano in proporzione). Restituisce la voce COM'ERA prima
 *  (serve all'annulla), o null se la voce non esiste o i grammi non sono validi: in quel caso non cambia nulla. */
export function updateEntry(mealId, entryId, grams, date = getViewedDay()) {
  const day = getDayLog(date);
  const previous = day[mealId]?.find(entry => entry.id === entryId) ?? null;
  const next = previous && scaleEntry(previous, grams);
  if (!next) return null;
  setDay(date, replaceEntryIn(day, mealId, next));
  return previous;
}

/** Rimette una voce com'era (annulla di updateEntry): lo snapshot ESATTO, senza ricalcoli, quindi nessun arrotondamento perso. */
export const replaceEntry = (mealId, entry, date = getViewedDay()) => setDay(date, replaceEntryIn(getDayLog(date), mealId, entry));

/** Copia nel giorno gli alimenti del GIORNO PRIMA per quel pasto (ieri, se il giorno è oggi). Restituisce le voci create (per l'annulla). */
export function repeatPreviousDay(mealId, date = getViewedDay()) {
  const before = getDayLog(date)[mealId];
  const next = copyMeal(getDayLog(date), getPreviousDayLog(date), mealId);
  setDay(date, next);
  return next[mealId].slice(before.length);
}

// ---------- pasti preferiti ----------
/** Salva gli alimenti ATTUALI del giorno per `mealId` come preferito. `name` arriva già validato (validateFavoriteName). */
export function saveFavorite(name, mealId, date = getViewedDay()) {
  const favorite = makeFavorite(name, mealId, getDayLog(date)[mealId] ?? []);
  setState({ favorites: [...state.favorites, favorite] });
  return favorite;
}

export const deleteFavorite = id => setState({ favorites: state.favorites.filter(f => f.id !== id) });

/** Mette nel giorno gli alimenti del preferito. Restituisce le voci create (per l'annulla). */
export function addFavoriteToMeal(mealId, favoriteId, date = getViewedDay()) {
  const favorite = state.favorites.find(f => f.id === favoriteId);
  if (!favorite) return [];
  const before = getDayLog(date)[mealId].length;
  const next = applyFavorite(getDayLog(date), mealId, favorite);
  setDay(date, next);
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

// ---------- promemoria del dispositivo (meta.js) ----------
export const markBackupDone = () => setState({ meta: markBackupDoneOn(state.meta) });
export const snoozeBackupReminder = () => setState({ meta: snoozeBackupReminderOn(state.meta) });
export const dismissInstallHint = () => setState({ meta: dismissInstallHintOn(state.meta) });
export const setWeightRange = id => setState({ meta: setWeightRangeOn(state.meta, id) });

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
