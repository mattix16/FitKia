// Logica PURA sul profilo. Serve a una cosa sola: un profilo "vecchio" o rovinato non deve mai rompere l'app.
import { GOALS, ACTIVITY, DEFAULT_SETTINGS, RATES, DEFAULT_RATE, LIMITS } from './config.js';

/** Restituisce una copia del profilo con obiettivo, attività, ritmo e peso obiettivo sempre validi (altrimenti i valori di default:
 *  ritmo proposto per l'obiettivo, nessun peso obiettivo). È la rete di sicurezza della migrazione v1 -> v2 di storage.js. */
export function normalizeProfile(profile) {
  if (!profile) return null;
  const goal = GOALS.includes(profile.goal) ? profile.goal : DEFAULT_SETTINGS.goal;
  const target = profile.targetWeightKg === null || profile.targetWeightKg === '' ? NaN : Number(profile.targetWeightKg);
  return {
    ...profile,
    goal,
    activity: Object.hasOwn(ACTIVITY, profile.activity) ? profile.activity : DEFAULT_SETTINGS.activity,
    weeklyRateKg: RATES.includes(profile.weeklyRateKg) ? profile.weeklyRateKg : (DEFAULT_RATE[goal] ?? DEFAULT_RATE.lose),
    targetWeightKg: Number.isFinite(target) && target >= LIMITS.weightKg.min && target <= LIMITS.weightKg.max ? target : null,
  };
}
