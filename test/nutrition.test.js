import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBmr, calculateTargets, ringDashArray, nutrientsFor, toPercent, dailyEnergyDelta, weeklyRateFor, effectiveWeeklyRateKg,
  weightTrendKgPerWeek, estimateGoalDate, projectGoal, summarizeDays } from '../src/nutrition.js';
import { RING_CIRCUMFERENCE } from '../src/config.js';

const man = { weightKg: 80, heightCm: 180, age: 30, sex: 'male' };

test('BMR uomo 80kg/180cm/30 anni = 1780', () => assert.equal(calculateBmr(man), 1780));
test('sesso non valido lancia un errore', () => assert.throws(() => calculateBmr({ ...man, sex: 'maschio' })));

test('target: lose < maintain < gain e lose mai sotto il BMR', () => {
  const t = calculateTargets(man);
  assert.ok(t.lose <= t.maintain && t.maintain < t.gain);
  assert.ok(t.lose >= calculateBmr(man));
});

test('anello: goal 0, eaten 0, eaten > goal', () => {
  assert.equal(ringDashArray(100, 0), `0 ${RING_CIRCUMFERENCE}`);
  assert.equal(ringDashArray(0, 2000), `0 ${RING_CIRCUMFERENCE}`);
  assert.equal(ringDashArray(5000, 2000), `${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`);
});

test('nutrientsFor: 150 g di yogurt (59 kcal/100 g)', () => {
  const food = { per100g: { kcal: 59, protein: 10, carbs: 3.6, fat: 0.4 } };
  assert.deepEqual(nutrientsFor(food, 150), { kcal: 89, protein: 15, carbs: 5.4, fat: 0.6 });
});

test('toPercent: goal 0 e oltre il 100%', () => {
  assert.equal(toPercent(10, 0), 0);
  assert.equal(toPercent(50, 100), 50);
  assert.equal(toPercent(300, 100), 100);
});

test('più attività -> fabbisogno più alto', () => {
  const sedentary = calculateTargets({ ...man, activity: 'sedentary' });
  const active = calculateTargets({ ...man, activity: 'active' });
  assert.ok(active.maintain > sedentary.maintain);
});

// ---------- B2: ritmo, trend e data stimata ----------
const moderate = { ...man, activity: 'moderate', goal: 'lose', weeklyRateKg: 0.5 };   // BMR 1780 x 1,55 = 2759 kcal di mantenimento
// n giorni prima del 19 novembre 2026
const TODAY = '2026-11-19';
const keyOf = n => new Date(Date.UTC(2026, 10, 19) - n * 86_400_000).toISOString().slice(0, 10);
const series = (daysAgo, kgOf) => daysAgo.map(n => ({ date: keyOf(n), kg: kgOf(n) }));

test('ritmo -> kcal al giorno: 0,25 / 0,5 / 0,75 kg a settimana = 275 / 550 / 825 (7700 kcal per kg)', () => {
  assert.deepEqual([0.25, 0.5, 0.75].map(dailyEnergyDelta), [275, 550, 825]);
});

test('target: il deficit/surplus viene dal ritmo scelto, non più da -500 / +300 fissi', () => {
  assert.equal(calculateTargets(moderate).lose, 2209);                                  // 2759 - 550
  assert.equal(calculateTargets({ ...moderate, weeklyRateKg: 0.25 }).lose, 2484);        // 2759 - 275
  assert.equal(calculateTargets({ ...moderate, weeklyRateKg: 0.75 }).lose, 1934);        // 2759 - 825
  assert.equal(calculateTargets({ ...moderate, goal: 'gain', weeklyRateKg: 0.5 }).gain, 3309);   // 2759 + 550
  assert.equal(calculateTargets(moderate).maintain, 2759);
});

test('target: senza ritmo (profilo vecchio) o con un ritmo non ammesso valgono i predefiniti; il ritmo del profilo vale solo per il suo obiettivo', () => {
  const t = calculateTargets({ ...man, activity: 'moderate' });
  assert.equal(t.lose, 2209);                                                            // predefinito lose: 0,5
  assert.equal(t.gain, 3034);                                                            // predefinito gain: 0,25 -> 2759 + 275
  assert.equal(calculateTargets({ ...moderate, weeklyRateKg: 0.4 }).lose, 2209);
  assert.equal(calculateTargets({ ...moderate, weeklyRateKg: 0.75 }).gain, 3034);        // il profilo dimagrisce: il gain resta al predefinito
});

test('target: lose non scende mai sotto il BMR, qualunque sia il ritmo', () => {
  const sedentary = { ...man, activity: 'sedentary', goal: 'lose' };                     // mantenimento 2136, BMR 1780
  assert.equal(calculateTargets({ ...sedentary, weeklyRateKg: 0.75 }).lose, 1780);       // 2136 - 825 = 1311 -> si ferma al BMR
  assert.equal(calculateTargets({ ...sedentary, weeklyRateKg: 0.25 }).lose, 1861);       // 2136 - 275: sopra il BMR, resta
});

test('weeklyRateFor: maintain non ha ritmo; il ritmo del profilo vale solo per il suo obiettivo', () => {
  assert.equal(weeklyRateFor({ goal: 'maintain', weeklyRateKg: 0.75 }), 0);
  assert.equal(weeklyRateFor({ goal: 'lose', weeklyRateKg: 0.75 }, 'lose'), 0.75);
  assert.equal(weeklyRateFor({ goal: 'lose', weeklyRateKg: 0.75 }, 'gain'), 0.25);
  assert.equal(weeklyRateFor({ goal: 'gain' }, 'gain'), 0.25);
});

test('effectiveWeeklyRateKg: il ritmo che il piano produce davvero (con il minimo BMR), col segno', () => {
  assert.equal(effectiveWeeklyRateKg(moderate), -0.5);
  assert.equal(effectiveWeeklyRateKg({ ...moderate, goal: 'gain', weeklyRateKg: 0.75 }), 0.75);
  assert.equal(effectiveWeeklyRateKg({ ...moderate, goal: 'maintain' }), 0);
  const limited = effectiveWeeklyRateKg({ ...man, activity: 'sedentary', goal: 'lose', weeklyRateKg: 0.5 });   // 1780 invece di 1586
  assert.equal(limited, -0.32);                                                          // il minimo BMR rallenta il ritmo
});

test('weightTrendKgPerWeek: retta sulle ultime 4 settimane, col segno; null se i dati non bastano', () => {
  assert.equal(weightTrendKgPerWeek(series([14, 7, 0], n => 80 + n / 14), { today: TODAY }), -0.5);
  assert.equal(weightTrendKgPerWeek(series([20, 15, 10, 5, 0], n => 80 + 0.1 * n), { today: TODAY }), -0.7);
  assert.equal(weightTrendKgPerWeek(series([14, 7, 0], n => 80 - n / 14), { today: TODAY }), 0.5);     // sale
  assert.equal(weightTrendKgPerWeek(series([60, 10, 5, 0], n => (n === 60 ? 99 : 80 + 0.1 * n)), { today: TODAY }), -0.7);   // fuori finestra: ignorato
  assert.equal(weightTrendKgPerWeek(series([6, 3, 0], n => 80 + n), { today: TODAY }), null);          // coprono 6 giorni: meno di 7
  assert.equal(weightTrendKgPerWeek(series([20, 0], n => 80 + n), { today: TODAY }), null);             // solo 2 pesate
  assert.equal(weightTrendKgPerWeek(series([60, 50, 40], () => 80), { today: TODAY }), null);           // tutte vecchie
  assert.equal(weightTrendKgPerWeek([], { today: TODAY }), null);
});

test('estimateGoalDate: dimagrire e ingrassare, con data e settimane', () => {
  const base = { today: TODAY, currentKg: 80, targetKg: 72 };
  assert.deepEqual(estimateGoalDate({ ...base, goal: 'lose', kgPerWeek: -0.5 }), { status: 'eta', date: '2027-03-11', weeks: 16 });
  assert.deepEqual(estimateGoalDate({ goal: 'gain', currentKg: 70, targetKg: 73, kgPerWeek: 0.25, today: TODAY }), { status: 'eta', date: '2027-02-11', weeks: 12 });
});

test('estimateGoalDate: raggiunto, fermo, troppo lontano, dati mancanti', () => {
  assert.deepEqual(estimateGoalDate({ goal: 'lose', currentKg: 72.04, targetKg: 72, kgPerWeek: -0.5, today: TODAY }), { status: 'reached' });
  assert.deepEqual(estimateGoalDate({ goal: 'lose', currentKg: 70, targetKg: 72, kgPerWeek: 0, today: TODAY }), { status: 'reached' });   // già sotto
  assert.deepEqual(estimateGoalDate({ goal: 'gain', currentKg: 73.1, targetKg: 73, kgPerWeek: 0.25, today: TODAY }), { status: 'reached' });
  assert.deepEqual(estimateGoalDate({ goal: 'lose', currentKg: 80, targetKg: 72, kgPerWeek: 0.3, today: TODAY }), { status: 'stalled' });   // sale: verso sbagliato
  assert.deepEqual(estimateGoalDate({ goal: 'lose', currentKg: 80, targetKg: 72, kgPerWeek: -0.02, today: TODAY }), { status: 'stalled' }); // troppo piano
  assert.equal(estimateGoalDate({ goal: 'lose', currentKg: 120, targetKg: 40, kgPerWeek: -0.1, today: TODAY }).status, 'far');
  assert.equal(estimateGoalDate({ goal: 'maintain', currentKg: 80, targetKg: 72, kgPerWeek: -0.5, today: TODAY }), null);
  assert.equal(estimateGoalDate({ goal: 'lose', currentKg: 80, targetKg: NaN, kgPerWeek: -0.5, today: TODAY }), null);
  assert.equal(estimateGoalDate({ goal: 'lose', currentKg: 80, targetKg: 72, kgPerWeek: null, today: TODAY }), null);
});

test('projectGoal: usa il trend osservato se è nel verso giusto, altrimenti il ritmo del piano', () => {
  const profile = { ...moderate, weightKg: 80, targetWeightKg: 78 };
  const trending = series([14, 7, 0], n => 80 + n / 14);                                 // -0,5 kg a settimana
  assert.deepEqual(projectGoal(profile, trending, TODAY), { status: 'eta', date: '2026-12-17', weeks: 4, source: 'trend', kgPerWeek: -0.5, remainingKg: 2 });
  assert.deepEqual(projectGoal(profile, [], TODAY), { status: 'eta', date: '2026-12-17', weeks: 4, source: 'plan', kgPerWeek: -0.5, remainingKg: 2 });
  const wrongWay = series([14, 7, 0], n => 80 - n / 14);                                 // sale mentre l'obiettivo è scendere: ci si affida al piano
  assert.equal(projectGoal(profile, wrongWay, TODAY).source, 'plan');
  const flat = series([14, 7, 0], () => 80);                                             // fermo: ci si affida al piano
  assert.equal(projectGoal(profile, flat, TODAY).source, 'plan');
  assert.equal(projectGoal({ ...profile, weightKg: 77.9 }, [], TODAY).status, 'reached');
});

test('projectGoal: nessun peso obiettivo o obiettivo mantenimento -> null', () => {
  assert.equal(projectGoal({ ...moderate, weightKg: 80, targetWeightKg: null }, [], TODAY), null);
  assert.equal(projectGoal({ ...moderate, goal: 'maintain', weightKg: 80, targetWeightKg: 78 }, [], TODAY), null);
});

// ---------- B1: riepilogo degli ultimi giorni ----------
test('summarizeDays: medie sui giorni completi (oggi e i giorni vuoti esclusi) e giorni in target', () => {
  const days = [
    { date: '2026-11-19', kcal: 500, protein: 20 },      // oggi: incompleto
    { date: '2026-11-18', kcal: 2000, protein: 100 },    // in target
    { date: '2026-11-17', kcal: 2500, protein: 140 },    // oltre il 105%
    { date: '2026-11-16', kcal: 0, protein: 0 },         // non registrato
    { date: '2026-11-15', kcal: 1000, protein: 60 },     // sotto l'85%
  ];
  assert.deepEqual(summarizeDays(days, 2000, TODAY), { completeDays: 3, avgKcal: 1833, avgProtein: 100, daysInTarget: 1 });
});

test('summarizeDays: la banda è 85%-105% dell\'obiettivo; nessun giorno completo -> medie null', () => {
  const day = kcal => [{ date: '2026-11-18', kcal, protein: 50 }];
  assert.equal(summarizeDays(day(1699), 2000, TODAY).daysInTarget, 0);
  assert.equal(summarizeDays(day(1700), 2000, TODAY).daysInTarget, 1);
  assert.equal(summarizeDays(day(2099), 2000, TODAY).daysInTarget, 1);
  assert.equal(summarizeDays(day(2101), 2000, TODAY).daysInTarget, 0);
  assert.deepEqual(summarizeDays([{ date: TODAY, kcal: 900, protein: 30 }], 2000, TODAY), { completeDays: 0, avgKcal: null, avgProtein: null, daysInTarget: 0 });
  assert.deepEqual(summarizeDays([], 2000, TODAY), { completeDays: 0, avgKcal: null, avgProtein: null, daysInTarget: 0 });
});
