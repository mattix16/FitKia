// Dizionario di base: valori INDICATIVI per 100 g (tabelle nutrizionali comuni). Controllali sull'etichetta di ciò che compri
// e correggili: il test foods.test.js blocca valori impossibili. Per tutto il resto c'è "Aggiungi un alimento tuo".
//   portions (opzionale): porzioni a pezzi { label, grams } mostrate come chip nel pannello; nel diario resta sempre il peso in grammi.
//   aliases  (opzionale): altri nomi con cui si cerca l'alimento (es. "spaghetti" -> Pasta); servono solo alla ricerca.
import { newId } from '../id.js';

export const FOODS = [
  // Latticini e uova
  { id: 'yogurt-greco',    name: 'Yogurt greco 0%',            per100g: { kcal: 59,  protein: 10,   carbs: 3.6, fat: 0.4 }, portions: [{ label: '1 vasetto', grams: 125 }] },
  { id: 'yogurt-intero',   name: 'Yogurt bianco intero',       per100g: { kcal: 61,  protein: 3.5,  carbs: 4.7, fat: 3.3 }, portions: [{ label: '1 vasetto', grams: 125 }] },
  { id: 'latte-ps',        name: 'Latte parzialmente scremato', per100g: { kcal: 46,  protein: 3.4,  carbs: 4.9, fat: 1.6 }, portions: [{ label: '1 tazza', grams: 200 }] },
  { id: 'latte-intero',    name: 'Latte intero',               per100g: { kcal: 64,  protein: 3.3,  carbs: 4.8, fat: 3.6 }, portions: [{ label: '1 tazza', grams: 200 }] },
  { id: 'uovo',            name: 'Uovo intero',                per100g: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 }, portions: [{ label: '1 uovo', grams: 60 }] },
  { id: 'albume',          name: 'Albume',                     per100g: { kcal: 52,  protein: 10.9, carbs: 0.7, fat: 0.2 }, portions: [{ label: '1 albume', grams: 33 }] },
  { id: 'mozzarella',      name: 'Mozzarella di vacca',        per100g: { kcal: 253, protein: 18,   carbs: 1,   fat: 20 }, portions: [{ label: '1 mozzarella', grams: 125 }] },
  { id: 'ricotta',         name: 'Ricotta vaccina',            per100g: { kcal: 146, protein: 9,    carbs: 3.5, fat: 10.9 } },
  { id: 'fiocchi-latte',   name: 'Fiocchi di latte',           per100g: { kcal: 98,  protein: 11,   carbs: 3.4, fat: 4.3 } },
  { id: 'parmigiano',      name: 'Parmigiano reggiano',        per100g: { kcal: 392, protein: 36,   carbs: 0,   fat: 28 }, portions: [{ label: '1 cucchiaio', grams: 10 }] },
  { id: 'grana-padano',    name: 'Grana padano',               per100g: { kcal: 384, protein: 33,   carbs: 0,   fat: 28 }, portions: [{ label: '1 cucchiaio', grams: 10 }] },
  { id: 'scamorza',        name: 'Scamorza',                   per100g: { kcal: 334, protein: 25,   carbs: 1,   fat: 25 } },
  { id: 'stracchino',      name: 'Stracchino',                 per100g: { kcal: 300, protein: 18,   carbs: 2,   fat: 24 } },
  { id: 'skyr',            name: 'Skyr',                       per100g: { kcal: 63,  protein: 11,   carbs: 4,   fat: 0.2 }, portions: [{ label: '1 vasetto', grams: 150 }] },
  { id: 'latte-soia',      name: 'Latte di soia',              per100g: { kcal: 39,  protein: 3.3,  carbs: 2.5, fat: 1.8 }, portions: [{ label: '1 tazza', grams: 200 }] },
  // Cereali, pane e colazione
  { id: 'fiocchi-avena',   name: "Fiocchi d'avena",            per100g: { kcal: 372, protein: 13.5, carbs: 59,  fat: 7 }, portions: [{ label: '1 porzione', grams: 40 }] },
  { id: 'pane-integrale',  name: 'Pane integrale',             per100g: { kcal: 247, protein: 13,   carbs: 41,  fat: 3.4 }, portions: [{ label: '1 fetta', grams: 30 }] },
  { id: 'pane-bianco',     name: 'Pane bianco',                per100g: { kcal: 265, protein: 9,    carbs: 49,  fat: 3.2 }, portions: [{ label: '1 fetta', grams: 30 }] },
  { id: 'fette-biscottate', name: 'Fette biscottate',          per100g: { kcal: 408, protein: 11.5, carbs: 72,  fat: 6 }, portions: [{ label: '1 fetta', grams: 9 }] },
  { id: 'biscotti-secchi', name: 'Biscotti secchi',            per100g: { kcal: 430, protein: 7,    carbs: 75,  fat: 11 }, portions: [{ label: '1 biscotto', grams: 8 }] },
  { id: 'pasta',           name: 'Pasta (cruda)',              per100g: { kcal: 353, protein: 10.9, carbs: 79,  fat: 1.4 }, portions: [{ label: '1 porzione', grams: 80 }],
    aliases: ['spaghetti', 'penne', 'fusilli', 'rigatoni', 'maccheroni'] },
  { id: 'pasta-integrale', name: 'Pasta integrale (cruda)',    per100g: { kcal: 340, protein: 13,   carbs: 64,  fat: 2.5 }, portions: [{ label: '1 porzione', grams: 80 }] },
  { id: 'pasta-uovo',      name: "Pasta all'uovo (cruda)",     per100g: { kcal: 368, protein: 14,   carbs: 72,  fat: 3.5 }, portions: [{ label: '1 porzione', grams: 80 }],
    aliases: ['tagliatelle', 'tagliolini', 'fettuccine'] },
  { id: 'riso-bianco',     name: 'Riso bianco (crudo)',        per100g: { kcal: 350, protein: 7,    carbs: 78,  fat: 0.6 }, portions: [{ label: '1 porzione', grams: 80 }] },
  { id: 'riso-integrale',  name: 'Riso integrale (crudo)',     per100g: { kcal: 355, protein: 7.5,  carbs: 76,  fat: 2.7 }, portions: [{ label: '1 porzione', grams: 80 }] },
  { id: 'quinoa',          name: 'Quinoa (cruda)',             per100g: { kcal: 368, protein: 14,   carbs: 64,  fat: 6 } },
  { id: 'couscous',        name: 'Couscous (crudo)',           per100g: { kcal: 360, protein: 12.5, carbs: 72,  fat: 1.6 }, portions: [{ label: '1 porzione', grams: 80 }] },
  { id: 'farro',           name: 'Farro (crudo)',              per100g: { kcal: 338, protein: 15,   carbs: 67,  fat: 2.5 }, portions: [{ label: '1 porzione', grams: 80 }] },
  { id: 'patate',          name: 'Patate',                     per100g: { kcal: 77,  protein: 2,    carbs: 17,  fat: 0.1 } },
  { id: 'patate-dolci',    name: 'Patate dolci',               per100g: { kcal: 86,  protein: 1.6,  carbs: 20,  fat: 0.1 } },
  { id: 'gnocchi',         name: 'Gnocchi di patate',          per100g: { kcal: 150, protein: 3.5,  carbs: 33,  fat: 0.5 }, portions: [{ label: '1 porzione', grams: 150 }] },
  { id: 'piadina',         name: 'Piadina',                    per100g: { kcal: 300, protein: 8,    carbs: 49,  fat: 8 }, portions: [{ label: '1 piadina', grams: 100 }] },
  { id: 'pizza-margherita', name: 'Pizza margherita',          per100g: { kcal: 270, protein: 11,   carbs: 33,  fat: 10 }, portions: [{ label: '1 pizza', grams: 350 }],
    aliases: ['margherita'] },
  { id: 'cornetto',        name: 'Cornetto',                   per100g: { kcal: 400, protein: 8,    carbs: 45,  fat: 20 }, portions: [{ label: '1 cornetto', grams: 50 }],
    aliases: ['brioche'] },
  { id: 'crackers',        name: 'Crackers',                   per100g: { kcal: 430, protein: 10,   carbs: 70,  fat: 12 }, portions: [{ label: '1 confezione', grams: 25 }] },
  { id: 'corn-flakes',     name: 'Corn flakes',                per100g: { kcal: 375, protein: 7,    carbs: 84,  fat: 0.9 }, portions: [{ label: '1 porzione', grams: 30 }] },
  { id: 'muesli',          name: 'Muesli',                     per100g: { kcal: 365, protein: 10,   carbs: 66,  fat: 6 }, portions: [{ label: '1 porzione', grams: 40 }] },
  // Carne, pesce e salumi
  { id: 'petto-pollo',     name: 'Petto di pollo',             per100g: { kcal: 110, protein: 23,   carbs: 0,   fat: 1.2 } },
  { id: 'petto-tacchino',  name: 'Petto di tacchino',          per100g: { kcal: 104, protein: 24,   carbs: 0,   fat: 1 } },
  { id: 'manzo-magro',     name: 'Manzo magro',                per100g: { kcal: 120, protein: 21,   carbs: 0,   fat: 3.5 } },
  { id: 'macinato-manzo',  name: 'Macinato di manzo',          per100g: { kcal: 254, protein: 17,   carbs: 0,   fat: 20 } },
  { id: 'lonza-maiale',    name: 'Lonza di maiale',            per100g: { kcal: 143, protein: 22,   carbs: 0,   fat: 6 } },
  { id: 'salsiccia',       name: 'Salsiccia',                  per100g: { kcal: 316, protein: 15,   carbs: 0.5, fat: 28 }, portions: [{ label: '1 salsiccia', grams: 100 }] },
  { id: 'bresaola',        name: 'Bresaola',                   per100g: { kcal: 151, protein: 32,   carbs: 0,   fat: 2.6 } },
  { id: 'prosciutto-crudo', name: 'Prosciutto crudo',          per100g: { kcal: 250, protein: 26,   carbs: 0,   fat: 16 }, portions: [{ label: '1 fetta', grams: 15 }] },
  { id: 'prosciutto-cotto', name: 'Prosciutto cotto',          per100g: { kcal: 215, protein: 20,   carbs: 1,   fat: 14 }, portions: [{ label: '1 fetta', grams: 20 }] },
  { id: 'speck',           name: 'Speck',                      per100g: { kcal: 303, protein: 28,   carbs: 0.3, fat: 21 }, portions: [{ label: '1 fetta', grams: 15 }] },
  { id: 'tonno-naturale',  name: 'Tonno al naturale',          per100g: { kcal: 116, protein: 26,   carbs: 0,   fat: 1 } },
  { id: 'tonno-olio',      name: "Tonno sott'olio (sgocciolato)", per100g: { kcal: 192, protein: 25, carbs: 0,  fat: 10 } },
  { id: 'salmone',         name: 'Salmone',                    per100g: { kcal: 208, protein: 20,   carbs: 0,   fat: 13 } },
  { id: 'merluzzo',        name: 'Merluzzo',                   per100g: { kcal: 82,  protein: 18,   carbs: 0,   fat: 0.7 } },
  { id: 'orata',           name: 'Orata',                      per100g: { kcal: 98,  protein: 19,   carbs: 0,   fat: 2.5 } },
  { id: 'sgombro',         name: 'Sgombro',                    per100g: { kcal: 205, protein: 19,   carbs: 0,   fat: 14 } },
  { id: 'gamberi',         name: 'Gamberi',                    per100g: { kcal: 85,  protein: 18,   carbs: 0.2, fat: 1 } },
  { id: 'calamari',        name: 'Calamari',                   per100g: { kcal: 82,  protein: 15,   carbs: 1.5, fat: 1.3 } },
  // Legumi e soia
  { id: 'lenticchie',      name: 'Lenticchie (cotte)',         per100g: { kcal: 116, protein: 9,    carbs: 20,  fat: 0.4 } },
  { id: 'ceci',            name: 'Ceci (cotti)',               per100g: { kcal: 164, protein: 9,    carbs: 27,  fat: 2.6 } },
  { id: 'fagioli',         name: 'Fagioli borlotti (cotti)',   per100g: { kcal: 127, protein: 9,    carbs: 23,  fat: 0.5 } },
  { id: 'piselli',         name: 'Piselli (cotti)',            per100g: { kcal: 84,  protein: 5.4,  carbs: 15.6, fat: 0.2 } },
  { id: 'tofu',            name: 'Tofu',                       per100g: { kcal: 76,  protein: 8,    carbs: 1.9, fat: 4.8 } },
  { id: 'hummus',          name: 'Hummus',                     per100g: { kcal: 170, protein: 8,    carbs: 14,  fat: 10 }, portions: [{ label: '1 cucchiaio', grams: 15 }] },
  // Verdura
  { id: 'insalata-mista',  name: 'Insalata mista',             per100g: { kcal: 18,  protein: 1.5,  carbs: 2.5, fat: 0.2 } },
  { id: 'lattuga',         name: 'Lattuga',                    per100g: { kcal: 15,  protein: 1.4,  carbs: 2.2, fat: 0.2 } },
  { id: 'pomodori',        name: 'Pomodori',                   per100g: { kcal: 18,  protein: 0.9,  carbs: 3.9, fat: 0.2 } },
  { id: 'broccoli',        name: 'Broccoli',                   per100g: { kcal: 34,  protein: 2.8,  carbs: 7,   fat: 0.4 } },
  { id: 'zucchine',        name: 'Zucchine',                   per100g: { kcal: 17,  protein: 1.2,  carbs: 3.1, fat: 0.3 } },
  { id: 'spinaci',         name: 'Spinaci',                    per100g: { kcal: 23,  protein: 2.9,  carbs: 3.6, fat: 0.4 } },
  { id: 'carote',          name: 'Carote',                     per100g: { kcal: 41,  protein: 0.9,  carbs: 10,  fat: 0.2 } },
  { id: 'peperoni',        name: 'Peperoni',                   per100g: { kcal: 31,  protein: 1,    carbs: 6,   fat: 0.3 } },
  { id: 'cetrioli',        name: 'Cetrioli',                   per100g: { kcal: 15,  protein: 0.7,  carbs: 3.6, fat: 0.1 } },
  { id: 'funghi',          name: 'Funghi champignon',          per100g: { kcal: 22,  protein: 3.1,  carbs: 3.3, fat: 0.3 } },
  { id: 'melanzane',       name: 'Melanzane',                  per100g: { kcal: 24,  protein: 1,    carbs: 3.9, fat: 0.2 } },
  { id: 'cavolfiore',      name: 'Cavolfiore',                 per100g: { kcal: 25,  protein: 2,    carbs: 3,   fat: 0.3 } },
  { id: 'finocchi',        name: 'Finocchi',                   per100g: { kcal: 20,  protein: 1.2,  carbs: 3,   fat: 0.2 } },
  { id: 'cipolle',         name: 'Cipolle',                    per100g: { kcal: 40,  protein: 1.1,  carbs: 9,   fat: 0.1 } },
  { id: 'zucca',           name: 'Zucca',                      per100g: { kcal: 26,  protein: 1,    carbs: 6.5, fat: 0.1 } },
  { id: 'asparagi',        name: 'Asparagi',                   per100g: { kcal: 20,  protein: 2.2,  carbs: 2,   fat: 0.1 } },
  { id: 'fagiolini',       name: 'Fagiolini',                  per100g: { kcal: 31,  protein: 1.8,  carbs: 5,   fat: 0.2 } },
  // Frutta
  { id: 'banana',          name: 'Banana',                     per100g: { kcal: 89,  protein: 1.1,  carbs: 23,  fat: 0.3 }, portions: [{ label: '1 media', grams: 120 }] },
  { id: 'mela',            name: 'Mela',                       per100g: { kcal: 52,  protein: 0.3,  carbs: 14,  fat: 0.2 }, portions: [{ label: '1 media', grams: 150 }] },
  { id: 'arancia',         name: 'Arancia',                    per100g: { kcal: 47,  protein: 0.9,  carbs: 12,  fat: 0.1 }, portions: [{ label: '1 media', grams: 180 }] },
  { id: 'pera',            name: 'Pera',                       per100g: { kcal: 57,  protein: 0.4,  carbs: 15,  fat: 0.1 }, portions: [{ label: '1 media', grams: 170 }] },
  { id: 'fragole',         name: 'Fragole',                    per100g: { kcal: 32,  protein: 0.7,  carbs: 7.7, fat: 0.3 } },
  { id: 'kiwi',            name: 'Kiwi',                       per100g: { kcal: 61,  protein: 1.1,  carbs: 15,  fat: 0.5 }, portions: [{ label: '1 kiwi', grams: 75 }] },
  { id: 'uva',             name: 'Uva',                        per100g: { kcal: 69,  protein: 0.7,  carbs: 18,  fat: 0.2 } },
  { id: 'avocado',         name: 'Avocado',                    per100g: { kcal: 160, protein: 2,    carbs: 9,   fat: 15 }, portions: [{ label: '1/2 avocado', grams: 100 }] },
  { id: 'pesche',          name: 'Pesche',                     per100g: { kcal: 39,  protein: 0.9,  carbs: 9.5, fat: 0.3 }, portions: [{ label: '1 media', grams: 150 }] },
  { id: 'albicocche',      name: 'Albicocche',                 per100g: { kcal: 48,  protein: 1.4,  carbs: 11,  fat: 0.4 }, portions: [{ label: '1 albicocca', grams: 40 }] },
  { id: 'ciliegie',        name: 'Ciliegie',                   per100g: { kcal: 63,  protein: 1.1,  carbs: 16,  fat: 0.2 } },
  { id: 'anguria',         name: 'Anguria',                    per100g: { kcal: 30,  protein: 0.6,  carbs: 7.6, fat: 0.2 } },
  { id: 'melone',          name: 'Melone',                     per100g: { kcal: 34,  protein: 0.8,  carbs: 8.2, fat: 0.2 } },
  { id: 'ananas',          name: 'Ananas',                     per100g: { kcal: 50,  protein: 0.5,  carbs: 13,  fat: 0.1 } },
  { id: 'mirtilli',        name: 'Mirtilli',                   per100g: { kcal: 57,  protein: 0.7,  carbs: 14,  fat: 0.3 } },
  { id: 'mandarini',       name: 'Mandarini',                  per100g: { kcal: 53,  protein: 0.8,  carbs: 13,  fat: 0.3 }, portions: [{ label: '1 mandarino', grams: 80 }],
    aliases: ['clementine'] },
  // Frutta secca, condimenti e dolci
  { id: 'mandorle',        name: 'Mandorle',                   per100g: { kcal: 579, protein: 21,   carbs: 22,  fat: 50 }, portions: [{ label: '1 manciata', grams: 25 }] },
  { id: 'noci',            name: 'Noci',                       per100g: { kcal: 654, protein: 15,   carbs: 14,  fat: 65 }, portions: [{ label: '1 manciata', grams: 25 }] },
  { id: 'anacardi',        name: 'Anacardi',                   per100g: { kcal: 553, protein: 18,   carbs: 30,  fat: 44 }, portions: [{ label: '1 manciata', grams: 25 }] },
  { id: 'pistacchi',       name: 'Pistacchi',                  per100g: { kcal: 570, protein: 20,   carbs: 18,  fat: 46 }, portions: [{ label: '1 manciata', grams: 25 }] },
  { id: 'nocciole',        name: 'Nocciole',                   per100g: { kcal: 655, protein: 15,   carbs: 17,  fat: 60 }, portions: [{ label: '1 manciata', grams: 25 }] },
  { id: 'burro-arachidi',  name: "Burro d'arachidi",           per100g: { kcal: 588, protein: 25,   carbs: 20,  fat: 50 }, portions: [{ label: '1 cucchiaio', grams: 16 }] },
  { id: 'olio-evo',        name: 'Olio extravergine',          per100g: { kcal: 884, protein: 0,    carbs: 0,   fat: 100 }, portions: [{ label: '1 cucchiaio', grams: 10 }, { label: '1 cucchiaino', grams: 5 }] },
  { id: 'burro',           name: 'Burro',                      per100g: { kcal: 717, protein: 0.9,  carbs: 0.1, fat: 81 }, portions: [{ label: '1 noce', grams: 10 }] },
  { id: 'maionese',        name: 'Maionese',                   per100g: { kcal: 680, protein: 1,    carbs: 2,   fat: 75 }, portions: [{ label: '1 cucchiaio', grams: 15 }] },
  { id: 'passata',         name: 'Passata di pomodoro',        per100g: { kcal: 29,  protein: 1.5,  carbs: 5,   fat: 0.2 } },
  { id: 'miele',           name: 'Miele',                      per100g: { kcal: 304, protein: 0.3,  carbs: 82,  fat: 0 }, portions: [{ label: '1 cucchiaino', grams: 7 }] },
  { id: 'zucchero',        name: 'Zucchero',                   per100g: { kcal: 392, protein: 0,    carbs: 100, fat: 0 }, portions: [{ label: '1 cucchiaino', grams: 5 }] },
  { id: 'marmellata',      name: 'Marmellata',                 per100g: { kcal: 250, protein: 0.4,  carbs: 60,  fat: 0.1 }, portions: [{ label: '1 cucchiaio', grams: 20 }] },
  { id: 'crema-nocciole',  name: 'Crema di nocciole e cacao',  per100g: { kcal: 539, protein: 6.3,  carbs: 57.5, fat: 30.9 }, portions: [{ label: '1 cucchiaio', grams: 15 }],
    aliases: ['nutella'] },
  { id: 'cioccolato-fondente', name: 'Cioccolato fondente 70%', per100g: { kcal: 598, protein: 7.8,  carbs: 46,  fat: 43 }, portions: [{ label: '1 quadretto', grams: 10 }] },
  { id: 'cioccolato-latte', name: 'Cioccolato al latte',       per100g: { kcal: 535, protein: 7.7,  carbs: 59,  fat: 30 }, portions: [{ label: '1 quadretto', grams: 10 }] },
  { id: 'gelato',          name: 'Gelato alla crema',          per100g: { kcal: 200, protein: 3.5,  carbs: 24,  fat: 10 }, portions: [{ label: '1 pallina', grams: 50 }] },
  { id: 'patatine',        name: 'Patatine in sacchetto',      per100g: { kcal: 540, protein: 6.5,  carbs: 50,  fat: 35 }, portions: [{ label: '1 manciata', grams: 30 }],
    aliases: ['chips'] },
  // Bevande (per 100 g ≈ 100 ml)
  { id: 'caffe',           name: 'Caffè (espresso)',           per100g: { kcal: 2,   protein: 0.1,  carbs: 0.3, fat: 0 }, portions: [{ label: '1 tazzina', grams: 30 }],
    aliases: ['espresso'] },
  { id: 'cappuccino',      name: 'Cappuccino',                 per100g: { kcal: 40,  protein: 2,    carbs: 3.5, fat: 2 }, portions: [{ label: '1 tazza', grams: 150 }] },
  { id: 'succo-arancia',   name: "Succo d'arancia",            per100g: { kcal: 45,  protein: 0.7,  carbs: 10.4, fat: 0.2 }, portions: [{ label: '1 bicchiere', grams: 200 }] },
  { id: 'cola',            name: 'Cola',                       per100g: { kcal: 42,  protein: 0,    carbs: 10.6, fat: 0 }, portions: [{ label: '1 lattina', grams: 330 }],
    aliases: ['coca cola'] },
  // Alcol: le kcal vengono anche dall'alcol (7 kcal/g), che non è tracciato: il test del dizionario li esenta dal controllo 4P+4C+9F.
  { id: 'birra',           name: 'Birra',                      per100g: { kcal: 43,  protein: 0.5,  carbs: 3.6, fat: 0 }, portions: [{ label: '1 bicchiere', grams: 200 }, { label: '1 bottiglia', grams: 330 }] },
  { id: 'vino-rosso',      name: 'Vino rosso',                 per100g: { kcal: 85,  protein: 0.1,  carbs: 2.6, fat: 0 }, portions: [{ label: '1 calice', grams: 125 }] },
  { id: 'vino-bianco',     name: 'Vino bianco',                per100g: { kcal: 80,  protein: 0.1,  carbs: 2.6, fat: 0 }, portions: [{ label: '1 calice', grams: 125 }] },
];

/** Dizionario + alimenti personali (quelli tuoi vengono prima). */
const allFoods = custom => [...custom, ...FOODS];

export const findFood = (id, customFoods = []) => allFoods(customFoods).find(food => food.id === id) ?? null;

// ---------- Ricerca (PURA: niente DOM, niente storage) ----------
/** Minuscolo, senza accenti e senza spazi ai bordi: "Caffè " -> "caffe". NFD separa la lettera dal suo accento, poi si toglie l'accento. */
export const foldText = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** "Radice" grossolana: toglie le vocali finali (almeno 3 lettere restano) così singolare e plurale coincidono:
 *  uovo/uova -> "uov", spaghetti/spaghetto -> "spaghett", arancia/arance -> "aranc". */
export function stemWord(word) {
  let stem = word;
  while (stem.length > 3 && /[aeiou]$/.test(stem)) stem = stem.slice(0, -1);
  return stem;
}

const wordsOf = text => foldText(text).split(/[^a-z0-9]+/).filter(Boolean);
const stemsOf = text => wordsOf(text).map(stemWord);

/** Livello di corrispondenza (più alto = meglio):
 *  4 = parole intere e la prima parola del nome è la prima cercata ("mela" -> Mela);
 *  3 = parole intere in un altro punto del nome o in un alias, oppure il nome INIZIA con la query scritta a metà ("mela" -> Melanzane);
 *  2 = la query inizia a un confine di parola; 1 = la query sta dentro un nome; 0 = niente. */
function matchTier(food, folded, tokens) {
  const nameFolded = foldText(food.name);
  const nameStems = stemsOf(food.name);
  const pool = [...nameStems, ...(food.aliases ?? []).flatMap(stemsOf)];
  // Parole intere (anche al plurale/singolare): ogni parola cercata deve coincidere con una parola del nome o di un alias.
  if (tokens.length > 0 && tokens.every(token => pool.includes(token))) {
    return nameStems[0] === tokens[0] ? 4 : 3;
  }
  // Digitazione a metà ("yogu", "gre", "ogurt"): inizio del nome, inizio di una parola, o testo dentro il nome.
  const texts = [nameFolded, ...(food.aliases ?? []).map(foldText)];
  if (texts.some(text => (` ${text}`).includes(` ${folded}`))) return nameFolded.startsWith(folded) ? 3 : 2;
  return texts.some(text => text.includes(folded)) ? 1 : 0;
}

/** Alimenti che corrispondono a `query`, i migliori per primi. A parità di livello resta l'ordine di `foods` (i tuoi prima).
 *  Query vuota = tutti. Accenti e plurali non contano: "uova" trova "Uovo intero", "caffè" e "caffe" sono uguali. */
export function matchFoods(query, foods) {
  const folded = foldText(query);
  if (!folded) return [...foods];
  const tokens = stemsOf(query);
  return foods
    .map((food, index) => ({ food, index, tier: matchTier(food, folded, tokens) }))
    .filter(match => match.tier > 0)
    .sort((a, b) => b.tier - a.tier || a.index - b.index)
    .map(match => match.food);
}

/** Cerca per nome. Async di proposito: domani sarà un fetch. */
export async function searchFoods(query, customFoods = []) {
  return matchFoods(query, allFoods(customFoods));
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
