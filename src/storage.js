// Unico file che tocca localStorage. Se domani passi a IndexedDB cambi solo questo.
import { SCHEMA_VERSION } from './config.js';

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const { v, data } = JSON.parse(raw);
    return migrate(v, data);
  } catch {
    return fallback; // JSON corrotto o storage non disponibile: l'app parte comunque
  }
}

export function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: SCHEMA_VERSION, data }));
    return true;
  } catch {
    return false; // quota piena o modalità privata
  }
}

function migrate(version, data) {
  // TODO: Mattia, quando cambierai lo schema (es. v1 -> v2) trasforma qui i vecchi dati.
  //       Idea: un `switch (version)` con fall-through, da v1 fino alla versione corrente.
  return data;
}
