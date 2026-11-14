export const SCHEMA_VERSION = 1;
export const STORAGE_KEYS = { profile: 'fitkia:v1:profile', logs: 'fitkia:v1:logs' };

export const SEX_OFFSET = { male: 5, female: -161 };                       // Mifflin-St Jeor
export const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
// Gli id si salvano e non cambiano mai; label e hint servono solo alla UI (le <select> si generano da qui).
export const GOAL_OPTIONS = [
  { id: 'lose',     label: 'Perdere peso' },
  { id: 'maintain', label: 'Mantenere il peso' },
  { id: 'gain',     label: 'Aumentare di peso' },
];
export const GOALS = GOAL_OPTIONS.map(option => option.id); // derivato: non si può disallineare

export const ACTIVITY_OPTIONS = [
  { id: 'sedentary', label: 'Sedentario', hint: 'poco o nessun esercizio' },
  { id: 'light',     label: 'Leggero',    hint: '1-3 allenamenti a settimana' },
  { id: 'moderate',  label: 'Moderato',   hint: '3-5 allenamenti a settimana' },
  { id: 'active',    label: 'Intenso',    hint: '6-7 allenamenti a settimana' },
];
export const DEFAULT_SETTINGS = { goal: 'lose', activity: 'sedentary' };

export const LIMITS = {                                                    // altezza in CM
  age: { min: 16, max: 100 },
  weightKg: { min: 30, max: 300 },
  heightCm: { min: 100, max: 250 },
  grams: { min: 1, max: 2000 },
};

export const MAX_RESULTS = 30; // risultati mostrati nella ricerca alimenti

export const RING_RADIUS = 64;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;               // ~402.1

// I pasti: id stabili (si salvano), etichette solo per la UI. Un posto solo, usato da UI, log e test.
export const MEALS = [
  { id: 'breakfast', label: 'Colazione' },
  { id: 'lunch',     label: 'Pranzo' },
  { id: 'dinner',    label: 'Cena' },
  { id: 'snack',     label: 'Snack' },
];