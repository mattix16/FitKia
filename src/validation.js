// Validation.js => riceve i valori grezzi del form e restituisce { ok, errors, value }.
import { LIMITS, SEX_OFFSET, GOALS, ACTIVITY, MAX_SUPPLEMENTS, MAX_CUSTOM_FOODS } from './config.js';
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
  if (!inRange(age, LIMITS.age)) errors.age = `Error: Età non compresa ${LIMITS.age.min} e ${LIMITS.age.max} anni.`;
  if (!inRange(weightKg, LIMITS.weightKg)) errors.weightKg = `Error: Peso tra ${LIMITS.weightKg.min} e ${LIMITS.weightKg.max} `;
  if (!inRange(heightCm, LIMITS.heightCm)) errors.heightCm = `Error: Altezza tra ${LIMITS.heightCm.min} e ${LIMITS.heightCm.max} `;
  if (!SEX_OFFSET.hasOwnProperty(sex)) errors.sex = 'Error: Seleziona un sesso valido.';

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
