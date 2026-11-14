// Validation.js => riceve i valori grezzi del form e restituisce { ok, errors, value }.
import { LIMITS, SEX_OFFSET, GOALS } from './config.js';

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
  // TODO: Mattia, stesso controllo per activity (deve essere una chiave di ACTIVITY in config.js) -> errors.activity

  const ok = Object.keys(errors).length === 0;
  return { ok, errors, value: ok ? { goal, activity } : null };
}