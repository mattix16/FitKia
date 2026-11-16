// Logica PURA sul profilo. Serve a una cosa sola: un profilo "vecchio" o rovinato non deve mai rompere l'app.
import { GOALS, ACTIVITY, DEFAULT_SETTINGS } from './config.js';

/** Restituisce una copia del profilo con obiettivo e attività sempre validi (altrimenti i valori di default). */
export function normalizeProfile(profile) {
  if (!profile) return null;
  return {
    ...profile,
    goal: GOALS.includes(profile.goal) ? profile.goal : DEFAULT_SETTINGS.goal,
    activity: Object.hasOwn(ACTIVITY, profile.activity) ? profile.activity : DEFAULT_SETTINGS.activity,
  };
}
