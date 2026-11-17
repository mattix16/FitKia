export const SCHEMA_VERSION = 1;
export const STORAGE_KEYS = { profile: 'fitkia:v1:profile', logs: 'fitkia:v1:logs', habits: 'fitkia:v1:habits', customFoods: 'fitkia:v1:foods' };

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
  supplementName: { min: 1, max: 30 },
  customFood: { nameMax: 40, kcalMax: 900, macroMax: 100 },
};

// Diario (M3)
export const HISTORY_DAYS = 3;          // giorni di calorie mostrati nello storico
export const WEIGHT_HISTORY_SHOWN = 7;  // pesi mostrati nell'elenco
export const WEIGHT_CHART_POINTS = 30;  // ultimi pesi disegnati nel grafico
export const MAX_SUPPLEMENTS = 10;
export const MAX_CUSTOM_FOODS = 50;
export const RECENT_FOODS_SHOWN = 8;  // chip "Recenti" nel pannello
export const RECENT_DAYS = 30;         // quanti giorni indietro cercare i cibi ricorrenti
// Acqua: valori INDICATIVI (regola pratica ~35 ml per kg, arrotondata a 250 ml), non una prescrizione medica.
export const WATER = { stepMl: 250, maxMl: 10000, minGoalMl: 1500, maxGoalMl: 4000, mlPerKg: 35 };

export const MAX_RESULTS = 80; // risultati mostrati nella ricerca alimenti

export const RING_RADIUS = 64;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;               // ~402.1

// I pasti: id stabili (si salvano), etichette solo per la UI. Un posto solo, usato da UI, log e test.
export const MEALS = [
  { id: 'breakfast', label: 'Colazione', empty: 'Aggiungi la colazione' },
  { id: 'lunch',     label: 'Pranzo',    empty: 'Aggiungi il pranzo' },
  { id: 'dinner',    label: 'Cena',      empty: 'Aggiungi la cena' },
  { id: 'snack',     label: 'Snack',     empty: 'Aggiungi uno snack' },
];