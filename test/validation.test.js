import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile, validateGoalSettings, validateWeightInput, validateSupplementName, validateCustomFood } from '../src/validation.js';

const ok = { name: 'Mattia', age: '30', weightKg: '72,5', heightCm: '175', sex: 'male', goal: 'lose', activity: 'sedentary' };

test('accetta la virgola decimale', () => assert.equal(validateProfile(ok).value.weightKg, 72.5));
test('rifiuta un\'altezza in metri', () => assert.ok(validateProfile({ ...ok, heightCm: '1.75' }).errors.heightCm));
test('rifiuta un sesso non valido e un nome vuoto', () => {
  const { errors } = validateProfile({ ...ok, sex: 'maschio', name: ' ' });
  assert.ok(errors.sex && errors.name);
});

test('obiettivo e attività finiscono nel profilo validato', () => {
  const { value } = validateProfile({ ...ok, goal: 'gain', activity: 'active' });
  assert.equal(value.goal, 'gain');
  assert.equal(value.activity, 'active');
});

test('un obiettivo non valido è un errore', () => {
  assert.ok(validateProfile({ ...ok, goal: 'boh' }).errors.goal);
  assert.ok(validateGoalSettings({ goal: '', activity: 'light' }).errors.goal);
});

test('un livello di attività non valido è un errore', () => {
  assert.ok(validateGoalSettings({ goal: 'lose', activity: 'extreme' }).errors.activity);
  assert.ok(validateProfile({ ...ok, activity: '' }).errors.activity);
});

test('obiettivo: senza peso obiettivo e ritmo si usano i predefiniti (nessun obiettivo, ritmo dell\'obiettivo scelto)', () => {
  assert.deepEqual(validateGoalSettings({ goal: 'lose', activity: 'light' }).value, { goal: 'lose', activity: 'light', targetWeightKg: null, weeklyRateKg: 0.5 });
  assert.equal(validateGoalSettings({ goal: 'gain', activity: 'light' }).value.weeklyRateKg, 0.25);
  assert.equal(validateGoalSettings({ goal: 'maintain', activity: 'light' }).value.weeklyRateKg, 0.5);     // valore neutro: 'maintain' non lo usa
  assert.deepEqual(validateProfile(ok).value, { name: 'Mattia', age: 30, weightKg: 72.5, heightCm: 175, sex: 'male', goal: 'lose', activity: 'sedentary', targetWeightKg: null, weeklyRateKg: 0.5 });
});

test('peso obiettivo: facoltativo, virgola, un decimale e stessi limiti del peso', () => {
  const base = { goal: 'lose', activity: 'light' };
  assert.equal(validateGoalSettings({ ...base, targetWeightKg: '72,46' }).value.targetWeightKg, 72.5);
  assert.equal(validateGoalSettings({ ...base, targetWeightKg: '  ' }).value.targetWeightKg, null);
  for (const bad of ['5', '301', 'abc']) assert.ok(validateGoalSettings({ ...base, targetWeightKg: bad }).errors.targetWeightKg, bad);
});

test('peso obiettivo dalla parte giusta: sotto il peso per dimagrire, sopra per ingrassare (solo se si passa il peso attuale)', () => {
  const check = (goal, target) => validateGoalSettings({ goal, activity: 'light', targetWeightKg: target }, { weightKg: 80 });
  assert.ok(check('lose', '85').errors.targetWeightKg);
  assert.ok(check('lose', '80').errors.targetWeightKg);
  assert.equal(check('lose', '72').ok, true);
  assert.ok(check('gain', '75').errors.targetWeightKg);
  assert.equal(check('gain', '85').ok, true);
  assert.equal(check('maintain', '90').ok, true);                                          // con "mantenere" il peso obiettivo non conta
  assert.match(check('lose', '85').errors.targetWeightKg, /80/);                           // dice rispetto a quale peso
  // onboarding, dati personali e backup non passano il peso: non devono fallire per un campo che non vedono
  assert.equal(validateGoalSettings({ goal: 'lose', activity: 'light', targetWeightKg: '85' }).ok, true);
  assert.equal(validateProfile({ ...ok, targetWeightKg: 90 }).ok, true);
});

test('ritmo: 0,25 / 0,5 / 0,75 (anche con la virgola); un altro valore è un errore', () => {
  const base = { goal: 'lose', activity: 'light' };
  assert.equal(validateGoalSettings({ ...base, weeklyRateKg: '0,75' }).value.weeklyRateKg, 0.75);
  assert.equal(validateGoalSettings({ ...base, weeklyRateKg: 0.25 }).value.weeklyRateKg, 0.25);
  assert.equal(validateGoalSettings({ ...base, weeklyRateKg: '' }).value.weeklyRateKg, 0.5);
  for (const bad of ['0.4', '1', 'veloce', '-0.5']) assert.ok(validateGoalSettings({ ...base, weeklyRateKg: bad }).errors.weeklyRateKg, bad);
  assert.ok(validateProfile({ ...ok, weeklyRateKg: '2' }).errors.weeklyRateKg);
});

test('peso del diario: virgola, arrotondamento e limiti', () => {
  assert.equal(validateWeightInput({ weightKg: '72,46' }).value.weightKg, 72.5);
  assert.ok(validateWeightInput({ weightKg: '' }).errors.weightKg);
  assert.ok(validateWeightInput({ weightKg: '5' }).errors.weightKg);
});

test('nome integratore: ripulito, senza doppioni e con un massimo', () => {
  assert.equal(validateSupplementName({ name: '  Vitamina   D ' }).value.name, 'Vitamina D');
  assert.ok(validateSupplementName({ name: '   ' }).errors.name);
  assert.ok(validateSupplementName({ name: 'creatina' }, ['Creatina']).errors.name);
  assert.ok(validateSupplementName({ name: 'x'.repeat(31) }).errors.name);
  assert.ok(validateSupplementName({ name: 'Nuovo' }, Array(10).fill('a')).errors.name);
});

test('alimento personale valido: virgole e arrotondamento', () => {
  const { ok, value } = validateCustomFood({ name: ' Pane  di Chiara ', kcal: '250', protein: '8,5', carbs: '50', fat: '1.2' });
  assert.equal(ok, true);
  assert.deepEqual(value, { name: 'Pane di Chiara', per100g: { kcal: 250, protein: 8.5, carbs: 50, fat: 1.2 } });
});

test('alimento personale: nome doppio, macro oltre 100 g, kcal che non tornano', () => {
  const base = { name: 'Nuovo', kcal: '100', protein: '10', carbs: '5', fat: '2' };
  assert.ok(validateCustomFood({ ...base, name: 'banana' }, ['Banana']).errors.name);
  assert.ok(validateCustomFood({ ...base, protein: '120' }).errors.protein);
  assert.ok(validateCustomFood({ ...base, kcal: '800' }).errors.kcal);      // 800 kcal con quei macro: impossibile
  assert.ok(validateCustomFood({ ...base, kcal: '' }).errors.kcal);
  assert.ok(validateCustomFood(base, [], 50).errors.name);                  // troppi alimenti personali
});
