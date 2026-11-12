// Stato dell'app + pub/sub. La UI NON legge mai localStorage: legge lo store.
import { STORAGE_KEYS } from './config.js';
import { load, save } from './storage.js';

const listeners = new Set();
let state = { profile: null, goal: 'lose' };

export const getState = () => state;

export function hydrate() {
  state = { ...state, profile: load(STORAGE_KEYS.profile) };
}

export function setState(patch) {
  state = { ...state, ...patch };
  if ('profile' in patch) save(STORAGE_KEYS.profile, state.profile);
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn); // funzione di "unsubscribe"
}

// TODO: Mattia, aggiungi i selettori che ti servono, es.
// export const selectKcalGoal = s => calculateTargets(s.profile)[s.goal];