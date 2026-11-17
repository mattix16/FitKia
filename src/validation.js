// Validation.js => riceve i valori grezzi del form e restituisce { ok, errors, value }.
import { LIMITS, SEX_OFFSET, GOALS, ACTIVITY, MAX_SUPPLEMENTS, MAX_CUSTOM_FOODS, MAX_FAVORITES, MAX_FAVORITE_ITEMS,
  DEFAULT_SETTINGS, SCHEMA_VERSION, MEALS, WATER, BACKUP } from './config.js';
import { isPlausibleFood } from './nutrition.js';

/** Funzione di integrazione "72,5" e "72.5" -> 72.5 ; stringa vuota o testo -> NaN */
export const parseNumber = s => Number(String(s).trim().replace(',', '.'));
// Funzione di verifica - Dove (n-any parameters), deve essere compreso e finito fra i limiti.
const inRange = (n, { min, max }) => Number.isFinite(n) && n >= min && n <= max;

export function validateProfile(raw) {
  const errors = {};
  const name = String(raw.name ?? '').trim();
  const age = parseNumber(raw.age);
  const heightCm = parseNumber(raw.heightCm);
  const weightKg = parseNumber(raw.weightKg);
  const sex = String(raw.sex ?? '').trim();

  if (!name) errors.name = 'Inserisci il tuo nome.';
  if (!inRange(age, LIMITS.age)) errors.age = `Età tra ${LIMITS.age.min} e ${LIMITS.age.max} anni.`;
  if (!inRange(weightKg, LIMITS.weightKg)) errors.weightKg = `Peso tra ${LIMITS.weightKg.min} e ${LIMITS.weightKg.max} kg.`;
  if (!inRange(heightCm, LIMITS.heightCm)) errors.heightCm = `Altezza tra ${LIMITS.heightCm.min} e ${LIMITS.heightCm.max} cm.`;
  if (!SEX_OFFSET.hasOwnProperty(sex)) errors.sex = 'Seleziona un sesso valido.';

  // Obiettivo e attività hanno una validazione propria: la riusa anche la pagina Impostazioni.
  const settings = validateGoalSettings(raw);
  Object.assign(errors, settings.errors);

  const ok = Object.keys(errors).length === 0;
  //operatore ternario
  return { ok, errors, value: ok ? { name, age, weightKg, heightCm, sex, ...settings.value } : null };
}

export function validateGoalSettings(raw) {
  const errors = {};
  const goal = String(raw.goal ?? '').trim();
  const activity = String(raw.activity ?? '').trim();

  if (!GOALS.includes(goal)) errors.goal = 'Seleziona un obiettivo valido.';
  if (!Object.hasOwn(ACTIVITY, activity)) errors.activity = 'Seleziona un livello di attività valido.';

  const ok = Object.keys(errors).length === 0;
  return { ok, errors, value: ok ? { goal, activity } : null };
}

/** Peso del diario: stessi limiti del profilo, arrotondato a 1 decimale. */
export function validateWeightInput(raw) {
  const kg = Math.round(parseNumber(raw.weightKg) * 10) / 10; // se non è un numero resta NaN
  if (!inRange(kg, LIMITS.weightKg)) {
    return { ok: false, errors: { weightKg: `Peso tra ${LIMITS.weightKg.min} e ${LIMITS.weightKg.max} kg.` }, value: null };
  }
  return { ok: true, errors: {}, value: { weightKg: kg } };
}

/** Nome di un integratore: testo "ripulito" (spazi doppi), né vuoto né troppo lungo, senza doppioni. */
export function validateSupplementName(raw, existingNames = []) {
  const name = String(raw.name ?? '').trim().replace(/\s+/g, ' ');
  const { min, max } = LIMITS.supplementName;
  let error = null;
  if (name.length < min) error = "Scrivi il nome dell'integratore.";
  else if (name.length > max) error = `Massimo ${max} caratteri.`;
  else if (existingNames.length >= MAX_SUPPLEMENTS) error = `Massimo ${MAX_SUPPLEMENTS} integratori.`;
  else if (existingNames.some(n => n.toLowerCase() === name.toLowerCase())) error = 'Esiste già un integratore con questo nome.';
  return { ok: !error, errors: error ? { name: error } : {}, value: error ? null : { name } };
}

/** Alimento personale: nome e valori per 100 g. `existingNames` = nomi già presenti (dizionario + tuoi). */
export function validateCustomFood(raw, existingNames = [], customCount = 0) {
  const { nameMax, kcalMax, macroMax } = LIMITS.customFood;
  const errors = {};
  const name = String(raw.name ?? '').trim().replace(/\s+/g, ' ');
  if (!name) errors.name = "Scrivi il nome dell'alimento.";
  else if (name.length > nameMax) errors.name = `Massimo ${nameMax} caratteri.`;
  else if (customCount >= MAX_CUSTOM_FOODS) errors.name = `Massimo ${MAX_CUSTOM_FOODS} alimenti personali.`;
  else if (existingNames.some(n => n.toLowerCase() === name.toLowerCase())) errors.name = 'Esiste già un alimento con questo nome.';

  const kcal = Math.round(parseNumber(raw.kcal));
  const [protein, carbs, fat] = ['protein', 'carbs', 'fat'].map(k => Math.round(parseNumber(raw[k]) * 10) / 10);
  if (!inRange(kcal, { min: 0, max: kcalMax })) errors.kcal = `Kcal tra 0 e ${kcalMax}.`;
  if (!inRange(protein, { min: 0, max: macroMax })) errors.protein = `Tra 0 e ${macroMax} g.`;
  if (!inRange(carbs, { min: 0, max: macroMax })) errors.carbs = `Tra 0 e ${macroMax} g.`;
  if (!inRange(fat, { min: 0, max: macroMax })) errors.fat = `Tra 0 e ${macroMax} g.`;

  // Controllo incrociato, solo se i singoli numeri sono validi: i valori devono "tornare" tra loro.
  if (!errors.kcal && !errors.protein && !errors.carbs && !errors.fat && !isPlausibleFood({ kcal, protein, carbs, fat })) {
    errors.kcal = `I valori non tornano: con questi macro le kcal sarebbero circa ${Math.round(4 * protein + 4 * carbs + 9 * fat)} (e i macro non possono superare 100 g).`;
  }
  const ok = Object.keys(errors).length === 0;
  return { ok, errors, value: ok ? { name, per100g: { kcal, protein, carbs, fat } } : null };
}

/** Nome di un pasto preferito: ripulito, non vuoto, non troppo lungo, senza doppioni; il pasto non deve essere vuoto. */
export function validateFavoriteName(raw, existingNames = [], itemCount = 0) {
  const name = String(raw.name ?? '').trim().replace(/\s+/g, ' ');
  const { min, max } = LIMITS.favoriteName;
  let error = null;
  if (itemCount === 0) error = 'Aggiungi almeno un alimento prima di salvarlo come preferito.';
  else if (itemCount > MAX_FAVORITE_ITEMS) error = `Massimo ${MAX_FAVORITE_ITEMS} alimenti in un preferito.`;
  else if (name.length < min) error = 'Dai un nome al pasto preferito.';
  else if (name.length > max) error = `Massimo ${max} caratteri.`;
  else if (existingNames.length >= MAX_FAVORITES) error = `Massimo ${MAX_FAVORITES} pasti preferiti.`;
  else if (existingNames.some(n => n.toLowerCase() === name.toLowerCase())) error = 'Esiste già un preferito con questo nome.';
  return { ok: !error, errors: error ? { name: error } : {}, value: error ? null : { name } };
}

// ---------------------------------------------------------------------------------------------------------------
// Backup: un file scelto dall'utente è INPUT NON FIDATO (rovinato, di un'altra app o costruito ad arte).
// validateBackup controlla struttura e tipi e restituisce una COPIA PULITA con solo i campi noti: nessuna chiave in
// più (es. "__proto__") e nessun valore fuori scala arriva allo store. O è tutto valido, o non si importa niente.
// ---------------------------------------------------------------------------------------------------------------
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_IDS = MEALS.map(meal => meal.id);
const NUTRIENTS = ['kcal', 'protein', 'carbs', 'fat'];
const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = v => typeof v === 'string' && v.trim().length > 0 && v.length <= BACKUP.maxTextLength;
const isAmount = (v, max = Infinity) => Number.isFinite(v) && v >= 0 && v <= max;
const isDateKey = key => DATE_KEY.test(key) && !Number.isNaN(new Date(`${key}T00:00:00`).getTime());
const MAX_ENTRY_KCAL = (LIMITS.customFood.kcalMax * LIMITS.grams.max) / 100;   // 900 kcal/100 g x 2000 g
const MAX_ENTRY_MACRO = (LIMITS.customFood.macroMax * LIMITS.grams.max) / 100;
const isNutrientSnapshot = e => isAmount(e.kcal, MAX_ENTRY_KCAL) && ['protein', 'carbs', 'fat'].every(k => isAmount(e[k], MAX_ENTRY_MACRO));

/** Una voce del diario (o di un preferito, senza id): snapshot dei valori + grammi nei limiti. null = non valida. */
function cleanEntry(e, withId = true) {
  if (!isPlainObject(e) || !isText(e.name) || !inRange(e.grams, LIMITS.grams) || !isNutrientSnapshot(e)) return null;
  if (withId && !isText(e.id)) return null;
  if (e.foodId != null && !isText(e.foodId)) return null;
  const clean = { foodId: e.foodId ?? null, name: e.name, grams: e.grams, kcal: e.kcal, protein: e.protein, carbs: e.carbs, fat: e.fat };
  return withId ? { id: e.id, ...clean } : clean;
}

function cleanProfile(raw) {
  if (!isPlainObject(raw)) return { error: 'Il backup non contiene un profilo.' };
  if (typeof raw.name !== 'string' || raw.name.length > BACKUP.maxTextLength) return { error: 'Il nome nel profilo non è valido.' };
  // Retrocompatibilità: i primi backup non avevano obiettivo e attività -> valori di default.
  const result = validateProfile({
    ...raw,
    goal: GOALS.includes(raw.goal) ? raw.goal : DEFAULT_SETTINGS.goal,
    activity: Object.hasOwn(ACTIVITY, raw.activity) ? raw.activity : DEFAULT_SETTINGS.activity,
  });
  return result.ok ? { value: result.value } : { error: `Profilo non valido: ${Object.values(result.errors)[0]}` };
}

function cleanLogs(raw = {}) {
  if (!isPlainObject(raw)) return { error: 'Il diario dei pasti ha un formato sconosciuto.' };
  const days = Object.entries(raw);
  if (days.length > BACKUP.maxDays) return { error: `Il diario contiene troppi giorni (massimo ${BACKUP.maxDays}).` };
  const logs = {};
  for (const [date, day] of days) {
    if (!isDateKey(date) || !isPlainObject(day)) return { error: `Diario: giorno non valido (${date.slice(0, 20)}).` };
    logs[date] = {};
    for (const mealId of MEAL_IDS) {
      const entries = day[mealId] ?? [];
      if (!Array.isArray(entries) || entries.length > BACKUP.maxEntriesPerMeal) return { error: `Diario: pasto non valido il ${date}.` };
      const clean = entries.map(e => cleanEntry(e));
      if (clean.includes(null)) return { error: `Diario: un alimento del ${date} ha valori non validi.` };
      logs[date][mealId] = clean;
    }
  }
  return { value: logs };
}

function cleanHabits(raw = {}) {
  if (!isPlainObject(raw)) return { error: 'Acqua, peso e integratori hanno un formato sconosciuto.' };
  const { water = {}, weight = [], supplements = [], checks = {} } = raw;
  if (!isPlainObject(water) || Object.entries(water).some(([date, ml]) => !isDateKey(date) || !isAmount(ml, WATER.maxMl))) {
    return { error: 'Acqua: valori non validi.' };
  }
  if (!Array.isArray(weight) || weight.length > BACKUP.maxWeights
    || weight.some(w => !isPlainObject(w) || !isDateKey(w.date) || !inRange(w.kg, LIMITS.weightKg))) {
    return { error: 'Peso: valori non validi.' };
  }
  if (!Array.isArray(supplements) || supplements.length > MAX_SUPPLEMENTS
    || supplements.some(s => !isPlainObject(s) || !isText(s.id) || !isText(s.name) || s.name.length > LIMITS.supplementName.max)) {
    return { error: 'Integratori: elenco non valido.' };
  }
  if (!isPlainObject(checks) || Object.entries(checks).some(([date, ids]) => !isDateKey(date) || !Array.isArray(ids) || !ids.every(isText))) {
    return { error: 'Integratori: spunte non valide.' };
  }
  const supplementIds = new Set(supplements.map(s => s.id));
  return {
    value: {
      water: Object.fromEntries(Object.entries(water)),
      // un solo peso per giorno, in ordine di data (come garantisce addWeight)
      weight: [...new Map(weight.map(w => [w.date, { date: w.date, kg: Math.round(w.kg * 10) / 10 }])).values()]
        .sort((a, b) => a.date.localeCompare(b.date)),
      supplements: supplements.map(s => ({ id: s.id, name: s.name })),
      checks: Object.fromEntries(Object.entries(checks).map(([date, ids]) => [date, ids.filter(id => supplementIds.has(id))])),
    },
  };
}

function cleanCustomFoods(raw = []) {
  const { nameMax, kcalMax, macroMax } = LIMITS.customFood;
  const isFood = f => isPlainObject(f) && isText(f.id) && isText(f.name) && f.name.length <= nameMax && isPlainObject(f.per100g)
    && isAmount(f.per100g.kcal, kcalMax) && ['protein', 'carbs', 'fat'].every(k => isAmount(f.per100g[k], macroMax));
  if (!Array.isArray(raw) || raw.length > MAX_CUSTOM_FOODS || !raw.every(isFood)) return { error: 'Alimenti personali non validi.' };
  return { value: raw.map(f => ({ id: f.id, name: f.name, per100g: Object.fromEntries(NUTRIENTS.map(k => [k, f.per100g[k]])), custom: true })) };
}

function cleanFavorites(raw = []) {
  const isFavorite = f => isPlainObject(f) && isText(f.id) && isText(f.name) && f.name.length <= LIMITS.favoriteName.max
    && (f.mealId == null || MEAL_IDS.includes(f.mealId))
    && Array.isArray(f.items) && f.items.length > 0 && f.items.length <= MAX_FAVORITE_ITEMS;
  if (!Array.isArray(raw) || raw.length > MAX_FAVORITES || !raw.every(isFavorite)) return { error: 'Pasti preferiti non validi.' };
  const favorites = raw.map(f => ({ id: f.id, name: f.name, mealId: f.mealId ?? null, items: f.items.map(item => cleanEntry(item, false)) }));
  if (favorites.some(f => f.items.includes(null))) return { error: 'Un pasto preferito contiene alimenti non validi.' };
  return { value: favorites };
}

/**
 * Valida un backup di Fitkia (testo JSON o oggetto già letto). Funzione PURA: niente DOM, niente storage.
 * Sezioni mancanti (backup di versioni precedenti) -> vuote; sezioni presenti ma sbagliate -> fallisce tutto.
 * @param {unknown} raw contenuto del file: stringa JSON oppure oggetto
 * @returns {{ ok: boolean, errors: Record<string, string>, value: null | { profile: object, logs: object,
 *   habits: object, customFoods: object[], favorites: object[], exportedAt: string | null } }}
 */
export function validateBackup(raw) {
  const fail = message => ({ ok: false, errors: { file: message }, value: null });
  let data = raw;
  if (typeof raw === 'string') {
    if (raw.length > BACKUP.maxBytes) return fail('Il file è troppo grande per essere un backup di Fitkia.');
    try { data = JSON.parse(raw); } catch { return fail('Il file non è leggibile: non sembra un backup di Fitkia.'); }
  }
  if (!isPlainObject(data) || data.app !== BACKUP.appId) return fail('Questo file non è un backup di Fitkia.');
  if (!Number.isInteger(data.schema) || data.schema < 1) return fail('Il backup non indica una versione valida.');
  if (data.schema > SCHEMA_VERSION) return fail("Il backup viene da una versione più recente dell'app: aggiorna Fitkia e riprova.");

  const sections = {
    profile: cleanProfile(data.profile),
    logs: cleanLogs(data.logs),
    habits: cleanHabits(data.habits),
    customFoods: cleanCustomFoods(data.customFoods),
    favorites: cleanFavorites(data.favorites),
  };
  const errors = Object.fromEntries(Object.entries(sections).filter(([, s]) => s.error).map(([key, s]) => [key, s.error]));
  if (Object.keys(errors).length > 0) return { ok: false, errors, value: null };

  const value = Object.fromEntries(Object.entries(sections).map(([key, s]) => [key, s.value]));
  value.exportedAt = typeof data.exportedAt === 'string' && !Number.isNaN(Date.parse(data.exportedAt)) ? data.exportedAt : null;
  return { ok: true, errors: {}, value };
}
