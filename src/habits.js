// Logica PURA delle abitudini: acqua, peso, integratori. Ogni funzione riceve lo stato "habits" e ne restituisce uno NUOVO.
//   habits = { water: { 'YYYY-MM-DD': ml }, weight: [{ date, kg }], supplements: [{ id, name }], checks: { 'YYYY-MM-DD': [id...] } }
import { WATER } from './config.js';
import { newId } from './id.js';

const round1 = n => Math.round(n * 10) / 10;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export const emptyHabits = () => ({ water: {}, weight: [], supplements: [], checks: {} });

/** Dati letti dal disco (magari vecchi o rovinati) -> sempre una forma valida. */
export function normalizeHabits(raw) {
  if (!isObject(raw)) return emptyHabits();
  return {
    water: isObject(raw.water) ? raw.water : {},
    weight: Array.isArray(raw.weight) ? raw.weight : [],
    supplements: Array.isArray(raw.supplements) ? raw.supplements : [],
    checks: isObject(raw.checks) ? raw.checks : {},
  };
}

// ---------- Acqua ----------
export const waterOn = (habits, date) => habits.water[date] ?? 0;

/** ml può essere negativo (per correggere): il totale resta tra 0 e WATER.maxMl. */
export function addWater(habits, date, ml) {
  const total = Math.min(WATER.maxMl, Math.max(0, waterOn(habits, date) + ml));
  return { ...habits, water: { ...habits.water, [date]: total } };
}

export function waterGoalMl(weightKg) {
  const rounded = Math.round((weightKg * WATER.mlPerKg) / WATER.stepMl) * WATER.stepMl;
  return Math.min(WATER.maxGoalMl, Math.max(WATER.minGoalMl, rounded));
}

// ---------- Peso ----------
/** Un solo peso per giorno: se esiste già, viene sostituito. L'elenco resta ordinato per data. */
export function addWeight(habits, date, kg) {
  const others = habits.weight.filter(entry => entry.date !== date);
  const weight = [...others, { date, kg }].sort((a, b) => a.date.localeCompare(b.date));
  return { ...habits, weight };
}

/** Il peso registrato per `date`, oppure `fallbackKg` se quel giorno non c'è una pesata (es. il peso del profilo). */
export const weightOnOr = (habits, date, fallbackKg) => habits.weight.find(entry => entry.date === date)?.kg ?? fallbackKg;

export const removeWeight = (habits, date) => ({ ...habits, weight: habits.weight.filter(entry => entry.date !== date) });

/** Ultimi `limit` pesi, il più recente per primo, con la differenza rispetto al peso precedente (null per il primo di sempre). */
export function weightHistory(habits, limit) {
  const sorted = [...habits.weight].sort((a, b) => a.date.localeCompare(b.date));
  return sorted
    .map((entry, i) => ({ ...entry, delta: i === 0 ? null : round1(entry.kg - sorted[i - 1].kg) }))
    .slice(-limit)
    .reverse();
}

// ---------- Integratori ----------
export const addSupplement = (habits, name) => ({ ...habits, supplements: [...habits.supplements, { id: newId(), name }] });

/** Toglie l'integratore E le sue spunte passate (niente id "fantasma" nei dati). */
export function removeSupplement(habits, id) {
  const checks = Object.fromEntries(Object.entries(habits.checks).map(([date, ids]) => [date, ids.filter(x => x !== id)]));
  return { ...habits, supplements: habits.supplements.filter(s => s.id !== id), checks };
}

export const isChecked = (habits, date, id) => (habits.checks[date] ?? []).includes(id);

export function toggleSupplement(habits, date, id) {
  const ids = habits.checks[date] ?? [];
  const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
  return { ...habits, checks: { ...habits.checks, [date]: next } };
}
