// Dizionario di base: valori INDICATIVI per 100 g (tabelle nutrizionali comuni). Controllali sull'etichetta di ciò che compri
// e correggili: il test foods.test.js blocca valori impossibili. Per tutto il resto c'è "Aggiungi un alimento tuo".
import { newId } from '../id.js';

export const FOODS = [
  // Latticini e uova
  { id: 'yogurt-greco',    name: 'Yogurt greco 0%',            per100g: { kcal: 59,  protein: 10,   carbs: 3.6, fat: 0.4 } },
  { id: 'yogurt-intero',   name: 'Yogurt bianco intero',       per100g: { kcal: 61,  protein: 3.5,  carbs: 4.7, fat: 3.3 } },
  { id: 'latte-ps',        name: 'Latte parzialmente scremato', per100g: { kcal: 46,  protein: 3.4,  carbs: 4.9, fat: 1.6 } },
  { id: 'latte-intero',    name: 'Latte intero',               per100g: { kcal: 64,  protein: 3.3,  carbs: 4.8, fat: 3.6 } },
  { id: 'uovo',            name: 'Uovo intero',                per100g: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 } },
  { id: 'albume',          name: 'Albume',                     per100g: { kcal: 52,  protein: 10.9, carbs: 0.7, fat: 0.2 } },
  { id: 'mozzarella',      name: 'Mozzarella di vacca',        per100g: { kcal: 253, protein: 18,   carbs: 1,   fat: 20 } },
  { id: 'ricotta',         name: 'Ricotta vaccina',            per100g: { kcal: 146, protein: 9,    carbs: 3.5, fat: 10.9 } },
  { id: 'fiocchi-latte',   name: 'Fiocchi di latte',           per100g: { kcal: 98,  protein: 11,   carbs: 3.4, fat: 4.3 } },
  { id: 'parmigiano',      name: 'Parmigiano reggiano',        per100g: { kcal: 392, protein: 36,   carbs: 0,   fat: 28 } },
  // Cereali, pane e colazione
  { id: 'fiocchi-avena',   name: "Fiocchi d'avena",            per100g: { kcal: 372, protein: 13.5, carbs: 59,  fat: 7 } },
  { id: 'pane-integrale',  name: 'Pane integrale',             per100g: { kcal: 247, protein: 13,   carbs: 41,  fat: 3.4 } },
  { id: 'pane-bianco',     name: 'Pane bianco',                per100g: { kcal: 265, protein: 9,    carbs: 49,  fat: 3.2 } },
  { id: 'fette-biscottate', name: 'Fette biscottate',          per100g: { kcal: 408, protein: 11.5, carbs: 72,  fat: 6 } },
  { id: 'biscotti-secchi', name: 'Biscotti secchi',            per100g: { kcal: 430, protein: 7,    carbs: 75,  fat: 11 } },
  { id: 'pasta',           name: 'Pasta (cruda)',              per100g: { kcal: 353, protein: 10.9, carbs: 79,  fat: 1.4 } },
  { id: 'pasta-integrale', name: 'Pasta integrale (cruda)',    per100g: { kcal: 340, protein: 13,   carbs: 64,  fat: 2.5 } },
  { id: 'riso-bianco',     name: 'Riso bianco (crudo)',        per100g: { kcal: 350, protein: 7,    carbs: 78,  fat: 0.6 } },
  { id: 'quinoa',          name: 'Quinoa (cruda)',             per100g: { kcal: 368, protein: 14,   carbs: 64,  fat: 6 } },
  { id: 'patate',          name: 'Patate',                     per100g: { kcal: 77,  protein: 2,    carbs: 17,  fat: 0.1 } },
  { id: 'patate-dolci',    name: 'Patate dolci',               per100g: { kcal: 86,  protein: 1.6,  carbs: 20,  fat: 0.1 } },
  // Carne e pesce
  { id: 'petto-pollo',     name: 'Petto di pollo',             per100g: { kcal: 110, protein: 23,   carbs: 0,   fat: 1.2 } },
  { id: 'petto-tacchino',  name: 'Petto di tacchino',          per100g: { kcal: 104, protein: 24,   carbs: 0,   fat: 1 } },
  { id: 'manzo-magro',     name: 'Manzo magro',                per100g: { kcal: 120, protein: 21,   carbs: 0,   fat: 3.5 } },
  { id: 'macinato-manzo',  name: 'Macinato di manzo',          per100g: { kcal: 254, protein: 17,   carbs: 0,   fat: 20 } },
  { id: 'bresaola',        name: 'Bresaola',                   per100g: { kcal: 151, protein: 32,   carbs: 0,   fat: 2.6 } },
  { id: 'tonno-naturale',  name: 'Tonno al naturale',          per100g: { kcal: 116, protein: 26,   carbs: 0,   fat: 1 } },
  { id: 'salmone',         name: 'Salmone',                    per100g: { kcal: 208, protein: 20,   carbs: 0,   fat: 13 } },
  { id: 'merluzzo',        name: 'Merluzzo',                   per100g: { kcal: 82,  protein: 18,   carbs: 0,   fat: 0.7 } },
  { id: 'gamberi',         name: 'Gamberi',                    per100g: { kcal: 85,  protein: 18,   carbs: 0.2, fat: 1 } },
  // Legumi
  { id: 'lenticchie',      name: 'Lenticchie (cotte)',         per100g: { kcal: 116, protein: 9,    carbs: 20,  fat: 0.4 } },
  { id: 'ceci',            name: 'Ceci (cotti)',               per100g: { kcal: 164, protein: 9,    carbs: 27,  fat: 2.6 } },
  { id: 'fagioli',         name: 'Fagioli borlotti (cotti)',   per100g: { kcal: 127, protein: 9,    carbs: 23,  fat: 0.5 } },
  // Verdura
  { id: 'insalata-mista',  name: 'Insalata mista',             per100g: { kcal: 18,  protein: 1.5,  carbs: 2.5, fat: 0.2 } },
  { id: 'pomodori',        name: 'Pomodori',                   per100g: { kcal: 18,  protein: 0.9,  carbs: 3.9, fat: 0.2 } },
  { id: 'broccoli',        name: 'Broccoli',                   per100g: { kcal: 34,  protein: 2.8,  carbs: 7,   fat: 0.4 } },
  { id: 'zucchine',        name: 'Zucchine',                   per100g: { kcal: 17,  protein: 1.2,  carbs: 3.1, fat: 0.3 } },
  { id: 'spinaci',         name: 'Spinaci',                    per100g: { kcal: 23,  protein: 2.9,  carbs: 3.6, fat: 0.4 } },
  { id: 'carote',          name: 'Carote',                     per100g: { kcal: 41,  protein: 0.9,  carbs: 10,  fat: 0.2 } },
  { id: 'peperoni',        name: 'Peperoni',                   per100g: { kcal: 31,  protein: 1,    carbs: 6,   fat: 0.3 } },
  { id: 'cetrioli',        name: 'Cetrioli',                   per100g: { kcal: 15,  protein: 0.7,  carbs: 3.6, fat: 0.1 } },
  { id: 'funghi',          name: 'Funghi champignon',          per100g: { kcal: 22,  protein: 3.1,  carbs: 3.3, fat: 0.3 } },
  // Frutta
  { id: 'banana',          name: 'Banana',                     per100g: { kcal: 89,  protein: 1.1,  carbs: 23,  fat: 0.3 } },
  { id: 'mela',            name: 'Mela',                       per100g: { kcal: 52,  protein: 0.3,  carbs: 14,  fat: 0.2 } },
  { id: 'arancia',         name: 'Arancia',                    per100g: { kcal: 47,  protein: 0.9,  carbs: 12,  fat: 0.1 } },
  { id: 'pera',            name: 'Pera',                       per100g: { kcal: 57,  protein: 0.4,  carbs: 15,  fat: 0.1 } },
  { id: 'fragole',         name: 'Fragole',                    per100g: { kcal: 32,  protein: 0.7,  carbs: 7.7, fat: 0.3 } },
  { id: 'kiwi',            name: 'Kiwi',                       per100g: { kcal: 61,  protein: 1.1,  carbs: 15,  fat: 0.5 } },
  { id: 'uva',             name: 'Uva',                        per100g: { kcal: 69,  protein: 0.7,  carbs: 18,  fat: 0.2 } },
  { id: 'avocado',         name: 'Avocado',                    per100g: { kcal: 160, protein: 2,    carbs: 9,   fat: 15 } },
  // Frutta secca, condimenti e dolci
  { id: 'mandorle',        name: 'Mandorle',                   per100g: { kcal: 579, protein: 21,   carbs: 22,  fat: 50 } },
  { id: 'noci',            name: 'Noci',                       per100g: { kcal: 654, protein: 15,   carbs: 14,  fat: 65 } },
  { id: 'anacardi',        name: 'Anacardi',                   per100g: { kcal: 553, protein: 18,   carbs: 30,  fat: 44 } },
  { id: 'burro-arachidi',  name: "Burro d'arachidi",           per100g: { kcal: 588, protein: 25,   carbs: 20,  fat: 50 } },
  { id: 'olio-evo',        name: 'Olio extravergine',          per100g: { kcal: 884, protein: 0,    carbs: 0,   fat: 100 } },
  { id: 'burro',           name: 'Burro',                      per100g: { kcal: 717, protein: 0.9,  carbs: 0.1, fat: 81 } },
  { id: 'miele',           name: 'Miele',                      per100g: { kcal: 304, protein: 0.3,  carbs: 82,  fat: 0 } },
  { id: 'marmellata',      name: 'Marmellata',                 per100g: { kcal: 250, protein: 0.4,  carbs: 60,  fat: 0.1 } },
  { id: 'cioccolato-fondente', name: 'Cioccolato fondente 70%', per100g: { kcal: 598, protein: 7.8,  carbs: 46,  fat: 43 } },
];

/** Dizionario + alimenti personali (quelli tuoi vengono prima). */
const allFoods = custom => [...custom, ...FOODS];

export const findFood = (id, customFoods = []) => allFoods(customFoods).find(food => food.id === id) ?? null;

/** Cerca per nome senza distinguere maiuscole. Async di proposito: domani sarà un fetch. */
export async function searchFoods(query, customFoods = []) {
  const q = query.trim().toLowerCase();
  const all = allFoods(customFoods);
  return q ? all.filter(food => food.name.toLowerCase().includes(q)) : all;
}

export const makeCustomFood = ({ name, per100g }) => ({ id: `custom-${newId()}`, name, per100g, custom: true });

/** Alimenti personali letti dal disco o da un backup -> solo quelli ben formati. */
export function normalizeCustomFoods(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(f => f && typeof f.id === 'string' && typeof f.name === 'string' && f.per100g
      && ['kcal', 'protein', 'carbs', 'fat'].every(k => Number.isFinite(f.per100g[k])))
    .map(f => ({ id: f.id, name: f.name, per100g: f.per100g, custom: true }));
}
