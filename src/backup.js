// Logica PURA dell'export: cosa finisce nel file e come si chiama. Scaricarlo (Blob, link) è compito della UI.
import { SCHEMA_VERSION } from './config.js';

export function buildBackup(state, now = new Date()) {
  return {
    app: 'fitkia',
    schema: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profile: state.profile,
    logs: state.logs,
    habits: state.habits,
  };
}

export const backupFileName = (now = new Date()) => `fitkia-backup-${now.toLocaleDateString('sv-SE')}.json`;