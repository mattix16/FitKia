export const SCHEMA_VERSION = 1;
export const STORAGE_KEYS = { profile: 'fitkia:v1:profile' };

export const SEX_OFFSET = { male: 5, female: -161 };                       // Mifflin-St Jeor
export const ACTIVITY = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
export const GOALS = ['lose', 'maintain', 'gain'];

export const LIMITS = {                                                    // altezza in CM
  age: { min: 16, max: 100 },
  weightKg: { min: 30, max: 300 },
  heightCm: { min: 100, max: 250 },
};

export const MEALS = [
  { id: 'breakfast', label: 'Colazione' },
  { id: 'lunch',     label: 'Pranzo' },
  { id: 'dinner',    label: 'Cena' },
  { id: 'snack',     label: 'Snack' },
];
export const RING_RADIUS = 64;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;               // ~402.1
