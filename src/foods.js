// Dizionario locale: valori INDICATIVI per 100 g. Un adattatore API (Open Food Facts) avrà la stessa forma:
// in futuro cambierà il corpo di searchFoods(), non chi la chiama.
export const FOODS = [
  { id: 'yogurt-greco',    name: 'Yogurt greco 0%',          per100g: { kcal: 59,  protein: 10,   carbs: 3.6, fat: 0.4 } },
  { id: 'fiocchi-avena',   name: "Fiocchi d'avena",          per100g: { kcal: 372, protein: 13.5, carbs: 59,  fat: 7 } },
  { id: 'latte-ps',        name: 'Latte parz. scremato',     per100g: { kcal: 46,  protein: 3.4,  carbs: 4.9, fat: 1.6 } },
  { id: 'pane-integrale',  name: 'Pane integrale',           per100g: { kcal: 247, protein: 13,   carbs: 41,  fat: 3.4 } },
  { id: 'uovo',            name: 'Uovo intero',              per100g: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 } },
  { id: 'pasta-integrale', name: 'Pasta integrale (cruda)',  per100g: { kcal: 340, protein: 13,   carbs: 64,  fat: 2.5 } },
  { id: 'riso-bianco',     name: 'Riso bianco (crudo)',      per100g: { kcal: 350, protein: 7,    carbs: 78,  fat: 0.6 } },
  { id: 'patate',          name: 'Patate',                   per100g: { kcal: 77,  protein: 2,    carbs: 17,  fat: 0.1 } },
  { id: 'petto-pollo',     name: 'Petto di pollo',           per100g: { kcal: 110, protein: 23,   carbs: 0,   fat: 1.2 } },
  { id: 'tonno-naturale',  name: 'Tonno al naturale',        per100g: { kcal: 116, protein: 26,   carbs: 0,   fat: 1 } },
  { id: 'salmone',         name: 'Salmone',                  per100g: { kcal: 208, protein: 20,   carbs: 0,   fat: 13 } },
  { id: 'lenticchie',      name: 'Lenticchie (cotte)',       per100g: { kcal: 116, protein: 9,    carbs: 20,  fat: 0.4 } },
  { id: 'parmigiano',      name: 'Parmigiano reggiano',      per100g: { kcal: 392, protein: 36,   carbs: 0,   fat: 28 } },
  { id: 'insalata-mista',  name: 'Insalata mista',           per100g: { kcal: 18,  protein: 1.5,  carbs: 2.5, fat: 0.2 } },
  { id: 'broccoli',        name: 'Broccoli',                 per100g: { kcal: 34,  protein: 2.8,  carbs: 7,   fat: 0.4 } },
  { id: 'pomodori',        name: 'Pomodori',                 per100g: { kcal: 18,  protein: 0.9,  carbs: 3.9, fat: 0.2 } },
  { id: 'olio-evo',        name: 'Olio extravergine',        per100g: { kcal: 884, protein: 0,    carbs: 0,   fat: 100 } },
  { id: 'banana',          name: 'Banana',                   per100g: { kcal: 89,  protein: 1.1,  carbs: 23,  fat: 0.3 } },
  { id: 'mela',            name: 'Mela',                     per100g: { kcal: 52,  protein: 0.3,  carbs: 14,  fat: 0.2 } },
  { id: 'mandorle',        name: 'Mandorle',                 per100g: { kcal: 579, protein: 21,   carbs: 22,  fat: 50 } },
];

/** Cerca per nome senza distinguere maiuscole. Async di proposito: domani sarà un fetch. */
export async function searchFoods(query) {
  const q = query.trim().toLowerCase();
  return q ? FOODS.filter(food => food.name.toLowerCase().includes(q)) : FOODS;
}
