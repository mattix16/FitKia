import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOODS, searchFoods, findFood, makeCustomFood, normalizeCustomFoods, foldText, stemWord, matchFoods } from '../src/data/foods.js';
import { isPlausibleFood } from '../src/nutrition.js';
import { LIMITS } from '../src/config.js';

// Le kcal di birra e vino vengono anche dall'alcol (7 kcal/g), che l'app non traccia: 4P + 4C + 9F non può tornare.
const ALCOHOLIC = ['birra', 'vino-rosso', 'vino-bianco'];

test('id univoci e nomi univoci', () => {
  assert.equal(new Set(FOODS.map(f => f.id)).size, FOODS.length);
  assert.equal(new Set(FOODS.map(f => f.name.toLowerCase())).size, FOODS.length);
  assert.equal(new Set(FOODS.map(f => foldText(f.name))).size, FOODS.length);   // anche senza accenti
});

test('ogni voce del dizionario è plausibile (macro <= 100 g, kcal coerenti), tranne le bevande alcoliche', () => {
  assert.deepEqual(FOODS.filter(f => !ALCOHOLIC.includes(f.id) && !isPlausibleFood(f.per100g)).map(f => f.name), []);
});

test('bevande alcoliche: esenti dal controllo 4P+4C+9F, ma con valori sensati', () => {
  for (const id of ALCOHOLIC) {
    const { kcal, protein, carbs, fat } = findFood(id).per100g;
    assert.ok(kcal > 0 && kcal <= 100 && protein + carbs + fat <= 100, id);
  }
});

test('isPlausibleFood: respinge i valori impossibili', () => {
  assert.equal(isPlausibleFood({ kcal: 200, protein: 27, carbs: 45, fat: 88 }), false); // macro > 100 g
  assert.equal(isPlausibleFood({ kcal: 600, protein: 5, carbs: 5, fat: 5 }), false);    // kcal che non tornano
  assert.equal(isPlausibleFood({ kcal: 59, protein: 10, carbs: 3.6, fat: 0.4 }), true);
});

test('porzioni a pezzi: etichetta non vuota, grammi interi nei limiti, etichette uniche per alimento', () => {
  const withPortions = FOODS.filter(f => 'portions' in f);
  assert.ok(withPortions.length >= 30);
  for (const food of withPortions) {
    assert.ok(Array.isArray(food.portions) && food.portions.length > 0, food.id);
    for (const { label, grams } of food.portions) {
      assert.ok(typeof label === 'string' && label.trim() !== '', `${food.id}: etichetta`);
      assert.ok(Number.isInteger(grams) && grams >= LIMITS.grams.min && grams <= LIMITS.grams.max, `${food.id}: ${grams} g`);
    }
    assert.equal(new Set(food.portions.map(p => p.label)).size, food.portions.length, `${food.id}: etichette doppie`);
  }
  assert.deepEqual(findFood('uovo').portions, [{ label: '1 uovo', grams: 60 }]);
});

test('alias: solo testi non vuoti', () => {
  for (const food of FOODS.filter(f => 'aliases' in f)) {
    assert.ok(Array.isArray(food.aliases) && food.aliases.length > 0 && food.aliases.every(a => typeof a === 'string' && a.trim() !== ''), food.id);
  }
});

// ---------- Ricerca ----------
const mk = name => ({ id: name, name, per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 } });
const names = (query, foods = FOODS) => matchFoods(query, foods).map(f => f.name);

test('foldText: minuscolo, senza accenti, senza spazi ai bordi', () => {
  assert.equal(foldText('  Caffè '), 'caffe');
  assert.equal(foldText('PERCHÉ'), 'perche');
  assert.equal(foldText("Fiocchi d'avena"), "fiocchi d'avena");
});

test('stemWord: singolare e plurale coincidono, le parole corte restano intere', () => {
  assert.equal(stemWord('uova'), stemWord('uovo'));
  assert.equal(stemWord('spaghetti'), stemWord('spaghetto'));
  assert.equal(stemWord('arancia'), stemWord('arance'));
  assert.equal(stemWord('uva'), 'uva');
  assert.equal(stemWord('yogurt'), 'yogurt');
});

test('matchFoods: accenti e plurali non contano', () => {
  assert.ok(names('uova').includes('Uovo intero'));
  assert.ok(names('caffè').includes('Caffè (espresso)'));
  assert.deepEqual(names('caffe'), names('caffè'));
  assert.ok(names('pomodori').includes('Pomodori'));
  assert.equal(names('banane')[0], 'Banana');
  assert.equal(names('CAFFÈ')[0], 'Caffè (espresso)');
});

test('matchFoods: gli alias portano all\'alimento giusto', () => {
  assert.deepEqual(names('spaghetti'), ['Pasta (cruda)']);
  assert.ok(names('nutella').includes('Crema di nocciole e cacao'));
  assert.ok(names('espresso').includes('Caffè (espresso)'));
});

test('matchFoods: i termini che prima non trovavano nulla ora trovano qualcosa', () => {
  for (const query of ['uova', 'caffè', 'spaghetti', 'pizza', 'prosciutto', 'prosciutto crudo', 'prosciutto cotto', 'zucchero', 'birra', 'vino']) {
    assert.ok(matchFoods(query, FOODS).length > 0, query);
  }
  assert.deepEqual(names('prosciutto cotto'), ['Prosciutto cotto']);
});

test('matchFoods: parola intera prima delle sottostringhe ("mela" non porta Melanzane in cima)', () => {
  const found = names('mela');
  assert.equal(found[0], 'Mela');
  assert.ok(found.indexOf('Melanzane') > found.indexOf('Mela'));       // c'è, ma dopo
  assert.ok(!names('latte').includes('Lattuga'));
});

test('matchFoods: chi inizia con la query viene prima delle sottostringhe interne', () => {
  const foods = ['Torta allo yogurt', 'Biscotto', 'Yogurt greco', 'Fragole e yogurt'].map(mk);
  assert.deepEqual(names('yogu', foods), ['Yogurt greco', 'Torta allo yogurt', 'Fragole e yogurt']);   // inizia con, poi inizio di parola
  assert.deepEqual(names('ogurt', foods), ['Torta allo yogurt', 'Yogurt greco', 'Fragole e yogurt']);  // tutte dentro: ordine di partenza
});

test('matchFoods: query vuota = tutti nello stesso ordine; nessuna corrispondenza = niente', () => {
  assert.deepEqual(matchFoods('   ', FOODS), FOODS);
  assert.deepEqual(matchFoods('xyzzy', FOODS), []);
});

test('searchFoods: senza distinzione di maiuscole, e gli alimenti personali vengono prima', async () => {
  const found = await searchFoods('POLLO');
  assert.ok(found.length > 0 && found.every(f => f.name.toLowerCase().includes('pollo')));
  const mine = makeCustomFood({ name: 'Pollo di Chiara', per100g: { kcal: 100, protein: 20, carbs: 0, fat: 2 } });
  assert.equal((await searchFoods('pollo', [mine]))[0].id, mine.id);
  assert.ok((await searchFoods('uova')).some(f => f.id === 'uovo'));
});

test('findFood trova sia i cibi di base sia quelli personali (e null se non esiste)', () => {
  const mine = makeCustomFood({ name: 'X', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } });
  assert.equal(findFood('banana').name, 'Banana');
  assert.equal(findFood(mine.id, [mine]).name, 'X');
  assert.equal(findFood('boh'), null);
});

test('normalizeCustomFoods scarta le voci rovinate', () => {
  const good = makeCustomFood({ name: 'Ok', per100g: { kcal: 10, protein: 1, carbs: 1, fat: 0 } });
  assert.deepEqual(normalizeCustomFoods([good, { id: 5 }, null, { id: 'a', name: 'b', per100g: { kcal: 'x' } }]).map(f => f.id), [good.id]);
  assert.deepEqual(normalizeCustomFoods('boh'), []);
});
