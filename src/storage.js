// Unico file che tocca localStorage. Se domani passi a IndexedDB cambi solo questo.
import { SCHEMA_VERSION, STORAGE_KEYS, DEFAULT_RATE } from './config.js';

/** v1 -> v2: il profilo ottiene il peso obiettivo (nessuno) e il ritmo settimanale (quello proposto per il suo obiettivo).
 *  Totale: un profilo rovinato (null, non un oggetto) passa invariato e se la vedrà normalizeProfile. Non modifica l'input. */
function addTargetAndRate(profile) {
  if (profile === null || typeof profile !== 'object' || Array.isArray(profile)) return profile;
  return {
    ...profile,
    targetWeightKg: profile.targetWeightKg ?? null,
    weeklyRateKg: profile.weeklyRateKg ?? DEFAULT_RATE[profile.goal] ?? DEFAULT_RATE.lose,
  };
}

/** Passi di migrazione: { [versione di partenza]: (data, key) => dati alla versione successiva }.
 *  Ogni passo è PURO (niente storage, niente DOM) e TOTALE (non lancia mai): restituisce un oggetto nuovo e non modifica l'input.
 *  Riceve anche `key` perché ogni chiave ha una forma diversa: un passo cambia solo la chiave che gli interessa e restituisce le altre invariate.
 *  Un passo assente vale come "nessun cambio di forma" (versione alzata, dati uguali). */
export const MIGRATIONS = {
  1: (data, key) => (key === STORAGE_KEYS.profile ? addTargetAndRate(data) : data),
};

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Porta una busta salvata `{ v, data }` alla versione corrente. PURA e deterministica: stessa busta = stesso risultato.
 *   - busta non valida (non è un oggetto, `v` non è un intero >= 1, manca `data`) -> { ok: false, reason: 'invalid' }
 *   - v === corrente -> dati invariati
 *   - v < corrente   -> si applicano i passi v, v+1, ... in ordine
 *   - v > corrente   -> (app vecchia con dati di una versione più nuova) i dati si leggono COSÌ COME SONO e non si scartano mai: `future: true`
 * @param {unknown} raw contenuto già letto con JSON.parse
 * @param {string | null} [key] chiave di storage (la ricevono i passi)
 * @returns {{ ok: true, data: unknown, from: number, to: number, future: boolean } | { ok: false, reason: 'invalid' }}
 */
export function migrate(raw, key = null, steps = MIGRATIONS, current = SCHEMA_VERSION) {
  if (!isPlainObject(raw) || !Number.isInteger(raw.v) || raw.v < 1 || !('data' in raw)) return { ok: false, reason: 'invalid' };
  const from = raw.v;
  if (from > current) return { ok: true, data: raw.data, from, to: from, future: true };
  let data = raw.data;
  for (let version = from; version < current; version++) {
    if (steps[version]) data = steps[version](data, key);
  }
  return { ok: true, data, from, to: current, future: false };
}

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const result = migrate(JSON.parse(raw), key);
    return result.ok && result.data != null ? result.data : fallback;   // busta rovinata o `data` vuoto: si riparte dal valore di default
  } catch {
    return fallback; // JSON corrotto o storage non disponibile: l'app parte comunque
  }
}

/** true se i dati sono stati scritti. Chi chiama NON deve ignorare il `false` (quota piena, navigazione privata): vedi `saveFailed` in store.js. */
export function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: SCHEMA_VERSION, data }));
    return true;
  } catch {
    return false; // quota piena o modalità privata
  }
}

export function remove(key) {
  try { localStorage.removeItem(key); } catch { /* storage non disponibile: niente da cancellare */ }
}

/** Chiede al browser di NON cancellare i dati di Fitkia quando serve spazio. Chrome decide da solo, senza chiedere (e senza
 *  engagement può rifiutare: si riprova a ogni avvio); Firefox può mostrare un permesso; Safari lo supporta da 15.2.
 *  Mai un errore verso l'utente: restituisce true solo se la persistenza è attiva. `manager` si può passare nei test. */
export async function requestPersistence(manager = globalThis.navigator?.storage) {
  try {
    if (!manager?.persist) return false;
    if (await manager.persisted?.()) return true;
    return Boolean(await manager.persist());
  } catch {
    return false;
  }
}
