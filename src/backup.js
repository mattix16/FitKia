// Logica PURA del backup: cosa finisce nel file, come si legge e come si controlla. Scaricare/leggere il file è compito della UI.
import { SCHEMA_VERSION } from './config.js';
import { normalizeProfile } from './profile.js';
import { validateProfile } from './validation.js';
import { normalizeHabits } from './habits.js';
import { normalizeLogs } from './log.js';
import { normalizeCustomFoods } from './data/foods.js';

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

export function buildBackup(state, now = new Date()) {
  return {
    app: 'fitkia',
    schema: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profile: state.profile,
    logs: state.logs,
    habits: state.habits,
    customFoods: state.customFoods,
  };
}

export const backupFileName = (now = new Date()) => `fitkia-backup-${now.toLocaleDateString('sv-SE')}.json`;

/** Legge il testo di un file di backup. Non si fida di niente: o restituisce dati PULITI, o un messaggio d'errore. */
export function parseBackup(text) {
  const fail = error => ({ ok: false, error });
  let raw;
  try { raw = JSON.parse(text); } catch { return fail('Il file non è leggibile: non sembra un backup di Fitkia.'); }

  if (!isObject(raw) || raw.app !== 'fitkia') return fail('Questo file non è un backup di Fitkia.');
  if (!Number.isInteger(raw.schema) || raw.schema > SCHEMA_VERSION) return fail("Il backup viene da una versione più recente dell'app.");
  const profile = normalizeProfile(isObject(raw.profile) ? raw.profile : null);
  if (!profile || !validateProfile(profile).ok) return fail('Il profilo contenuto nel backup non è valido.');

  return {
    ok: true,
    data: {
      profile,
      logs: normalizeLogs(raw.logs),
      habits: normalizeHabits(raw.habits),
      customFoods: normalizeCustomFoods(raw.customFoods),
    },
  };
}

/** Riassunto da mostrare prima di sovrascrivere i dati: "Mattia · 12 giorni di diario · ..." */
export function describeBackup({ profile, logs, habits, customFoods }) {
  return [
    profile.name,
    `${Object.keys(logs).length} giorni di diario`,
    `${habits.weight.length} pesi`,
    `${customFoods.length} alimenti personali`,
  ].join(' · ');
}
