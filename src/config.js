// Versione della FORMA dei dati salvati. 2 = il profilo ha anche targetWeightKg e weeklyRateKg (passo 1 -> 2 in storage.js).
// I campi opzionali che non cambiano la forma di ciò che c'è già NON alzano la versione (vedi `favorites` e `meta` sotto).
export const SCHEMA_VERSION = 2;
export const STORAGE_KEYS = { profile: 'fitkia:v1:profile', logs: 'fitkia:v1:logs', habits: 'fitkia:v1:habits', customFoods: 'fitkia:v1:foods', favorites: 'fitkia:v1:favorites',
  meta: 'fitkia:v1:meta' };
// Una chiave nuova = dati OPZIONALI: chi aggiorna l'app trova [] al posto dei preferiti (o i valori vuoti di `meta`) e nient'altro cambia (SCHEMA_VERSION resta 1).
// `meta` = promemoria del dispositivo (ultimo backup, suggerimenti già chiusi): non fa parte del backup (vedi meta.js).

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

// Ritmo di peso: kg a settimana -> kcal al giorno. ~7700 kcal per kg è una regola pratica, una STIMA e non una prescrizione.
// Gli id (0.25, 0.5, 0.75) si salvano nel profilo (weeklyRateKg); label e hint servono solo alla UI.
export const KCAL_PER_KG = 7700;
export const RATE_OPTIONS = [
  { id: 0.25, label: 'Lento',  hint: '0,25 kg a settimana' },
  { id: 0.5,  label: 'Medio',  hint: '0,5 kg a settimana' },
  { id: 0.75, label: 'Veloce', hint: '0,75 kg a settimana' },
];
export const RATES = RATE_OPTIONS.map(option => option.id);          // derivato: non si può disallineare
export const DEFAULT_RATE = { lose: 0.5, gain: 0.25 };               // ritmo proposto per obiettivo ('maintain' non ha ritmo)

export const LIMITS = {                                                    // altezza in CM
  age: { min: 16, max: 100 },
  weightKg: { min: 30, max: 300 },
  heightCm: { min: 100, max: 250 },
  grams: { min: 1, max: 2000 },
  supplementName: { min: 1, max: 30 },
  customFood: { nameMax: 40, kcalMax: 900, macroMax: 100 },
  favoriteName: { min: 1, max: 30 },
};

// Diario (M3)
export const HISTORY_DAYS = 7;          // giorni di calorie mostrati nella card "Ultimi 7 giorni"
export const TARGET_BAND = { min: 0.85, max: 1.05 };   // "giorno in target" = kcal tra l'85% e il 105% dell'obiettivo
export const WEIGHT_HISTORY_SHOWN = 7;  // pesi mostrati nell'elenco
// Periodi del grafico peso (giorni di CALENDARIO; null = tutto lo storico). L'id si salva in meta.weightRange.
export const WEIGHT_RANGES = [
  { id: '30', label: '30g', days: 30 },
  { id: '90', label: '90g', days: 90 },
  { id: 'all', label: 'Tutto', days: null },
];
export const DEFAULT_WEIGHT_RANGE = '30';
export const WEIGHT_TREND_DAYS = 28;         // finestra con cui si misura il ritmo reale (kg a settimana)
export const MIN_TREND_KG_PER_WEEK = 0.05;   // sotto questa velocità il trend è "fermo": non si stima una data
export const MAX_ETA_WEEKS = 104;            // oltre 2 anni non si stima una data
export const TARGET_SCALE_GAP_KG = 6;        // il peso obiettivo entra nella scala del grafico solo se dista meno di così dai dati
export const MOVING_AVERAGE_DAYS = 7;   // finestra (giorni di CALENDARIO) della media mobile del peso
export const WEIGHT_CHART = { width: 320, height: 150, padding: 30 }; // area SVG del grafico (viewBox); il margine sinistro ospita le etichette in kg
export const MAX_SUPPLEMENTS = 10;
export const MAX_CUSTOM_FOODS = 50;
export const MAX_FAVORITES = 20;        // pasti preferiti salvati
export const MAX_FAVORITE_ITEMS = 30;   // alimenti in un pasto preferito
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

// Promemoria backup (meta.js): dopo quanti giorni si ricorda, per quanto si rimanda, e quanti giorni di diario servono per chiedere il primo.
export const BACKUP_REMINDER_DAYS = 14;
export const BACKUP_SNOOZE_DAYS = 3;
export const BACKUP_MIN_DATA_DAYS = 3;

// Backup (export/import). I limiti rifiutano file enormi o costruiti ad arte PRIMA che tocchino lo stato.
export const BACKUP = {
  appId: 'fitkia',
  maxBytes: 5 * 1024 * 1024, // 5 MB: anni di diario stanno in poche centinaia di KB
  maxDays: 3650,             // giorni di diario accettati (10 anni)
  maxEntriesPerMeal: 100,
  maxWeights: 3650,
  maxTextLength: 120,        // nomi e id
};
