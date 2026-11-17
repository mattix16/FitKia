// Logica PURA del backup: cosa finisce nel file e come si riassume. Il CONTROLLO del file importato è validateBackup
// (validation.js); scaricare e leggere il file (Blob, FileReader) è compito della UI.
import { SCHEMA_VERSION, BACKUP } from './config.js';

/** Fotografia di tutti i dati persistiti (non la vista corrente): profilo, diario, acqua/peso/integratori, alimenti, preferiti. */
export function buildBackup(state, now = new Date()) {
  return {
    app: BACKUP.appId,
    schema: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profile: state.profile,
    logs: state.logs,
    habits: state.habits,
    customFoods: state.customFoods,
    favorites: state.favorites ?? [],
  };
}

/** fitkia-backup-YYYY-MM-DD.json con la data LOCALE ('sv-SE' formatta già come ISO). */
export const backupFileName = (now = new Date()) => `fitkia-backup-${now.toLocaleDateString('sv-SE')}.json`;

/** Riassunto da mostrare prima di sovrascrivere i dati: "Mattia · 12 giorni di diario · ..." */
export function describeBackup({ profile, logs, habits, customFoods, favorites = [] }) {
  return [
    profile.name,
    `${Object.keys(logs).length} giorni di diario`,
    `${habits.weight.length} pesi`,
    `${customFoods.length} alimenti personali`,
    `${favorites.length} pasti preferiti`,
  ].join(' · ');
}
