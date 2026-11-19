import { SEX_OFFSET, ACTIVITY, RING_CIRCUMFERENCE, MOVING_AVERAGE_DAYS, WEIGHT_CHART, KCAL_PER_KG, RATES, DEFAULT_RATE, TARGET_BAND,
  WEIGHT_TREND_DAYS, MIN_TREND_KG_PER_WEEK, MAX_ETA_WEEKS, TARGET_SCALE_GAP_KG } from './config.js';

export function calculateBmr({ weightKg, heightCm, age, sex }) {
  if (!(sex in SEX_OFFSET)) throw new Error(`Sesso non valido: ${sex}`);
  return 10 * weightKg + 6.25 * heightCm - 5 * age + SEX_OFFSET[sex];
}

/** Fabbisogno giornaliero totale (non arrotondato): BMR x livello di attività. */
const calculateTdee = profile => calculateBmr(profile) * ACTIVITY[profile.activity ?? 'sedentary']; // di default sedentario se non specificato

/** kcal al giorno di deficit/surplus per un ritmo in kg a settimana (0,25 / 0,5 / 0,75 -> 275 / 550 / 825 con 7700 kcal per kg). */
export const dailyEnergyDelta = rateKg => Math.round((rateKg * KCAL_PER_KG) / 7);

/** Il ritmo (kg a settimana) valido per `goal`: quello del profilo se l'obiettivo è lo stesso e il valore è ammesso, altrimenti
 *  quello proposto. 'maintain' non ha ritmo: 0. Un profilo vecchio, senza ritmo, riceve il predefinito. */
export function weeklyRateFor(profile, goal = profile.goal) {
  if (goal === 'maintain') return 0;
  return profile.goal === goal && RATES.includes(profile.weeklyRateKg) ? profile.weeklyRateKg : DEFAULT_RATE[goal];
}

export function calculateTargets(profile) {
  const bmr = calculateBmr(profile);
  const tdee = calculateTdee(profile);
  return {
    lose: Math.max(Math.round(tdee - dailyEnergyDelta(weeklyRateFor(profile, 'lose'))), Math.round(bmr)), // il valore minimo mai sotto il BMR, allora non si sopravvive ); e non si può scendere sotto il BMR
    maintain: Math.round(tdee),
    gain: Math.round(tdee + dailyEnergyDelta(weeklyRateFor(profile, 'gain'))),
  };
}

/** Il ritmo che l'obiettivo giornaliero produce DAVVERO, in kg a settimana con il segno (negativo = dimagrire). Differisce da quello
 *  scelto quando scatta il minimo (mai sotto il BMR). 0 per 'maintain'. */
export function effectiveWeeklyRateKg(profile) {
  if (profile.goal === 'maintain') return 0;
  const gap = calculateTargets(profile)[profile.goal] - calculateTdee(profile);
  return Math.round(((gap * 7) / KCAL_PER_KG) * 100) / 100;
}

/** Lunghezza dell'arco dell'anello (stroke-dasharray = `${arco} ${CIRCONFERENZA}`).
 *  Deve restare tra 0 e la circonferenza, anche se mangi più dell'obiettivo. */
export function ringDashArray(eaten, goal) {
  if (goal <= 0) {
    return `0 ${RING_CIRCUMFERENCE}`;
  }
  // Salviamo il calcolo in una variabile
  const arc = Math.min(Math.round((eaten / goal) * RING_CIRCUMFERENCE), RING_CIRCUMFERENCE);
  // Restituiamo la stringa formattata pronta per il DOM
  return `${arc} ${RING_CIRCUMFERENCE}`;
}

/** macro in grammi. Kcal per grammo: proteine 4, carboidrati 4, grassi 9. */
export function calculateMacroTargets(kcalGoal, weightKg) {
  return {
    protein: Math.round(1.8 *weightKg), // 1.8 g/kg di proteine
    fat: Math.round((0.30 * kcalGoal) / 9), // 30% delle kcal da grassi
    carbs: Math.max(0, Math.round((kcalGoal - (1.8 * weightKg * 4) - (0.30 * kcalGoal)) / 4)), // mai negativi // il resto da carboidrati
  }
}

/** Valori nutrizionali di `grams` grammi di un alimento (food.per100g è riferito a 100 g).
 *  Restituisce { kcal, protein, carbs, fat }: kcal intere, macro con 1 decimale. */
export function nutrientsFor(food, grams) {
  const k = grams / 100;                        // proporzione: i dati sono "per 100 g"
  const n = food.per100g;
  const round1 = x => Math.round(x * 10) / 10;  // 1 decimale per i macro
  return { kcal: Math.round(n.kcal * k), protein: round1(n.protein * k), carbs: round1(n.carbs * k), fat: round1(n.fat * k) };
}

/** Percentuale intera tra 0 e 100 (per le barre dei macro). */
export const toPercent = (value, goal) => (goal <= 0 ? 0 : Math.min(100, Math.round((value / goal) * 100)));

/**
 * Riepilogo dei giorni recenti (card "Ultimi 7 giorni"). Conta solo i giorni COMPLETI: oggi è ancora in corso e abbasserebbe le medie,
 * e un giorno senza alimenti non è un giorno "a 0 kcal" ma un giorno non registrato.
 * "In target" = kcal tra TARGET_BAND.min e TARGET_BAND.max dell'obiettivo (85%-105%).
 * @param {{ date: string, kcal: number, protein: number }[]} days es. recentDays(logs, 7)
 * @param {number} goalKcal obiettivo giornaliero
 * @param {string} today 'YYYY-MM-DD'
 * @returns {{ completeDays: number, avgKcal: number | null, avgProtein: number | null, daysInTarget: number }}
 */
export function summarizeDays(days, goalKcal, today) {
  const complete = days.filter(day => day.date !== today && day.kcal > 0);
  const average = key => (complete.length === 0 ? null : Math.round(complete.reduce((sum, day) => sum + day[key], 0) / complete.length));
  const daysInTarget = complete.filter(day => day.kcal >= goalKcal * TARGET_BAND.min && day.kcal <= goalKcal * TARGET_BAND.max).length;
  return { completeDays: complete.length, avgKcal: average('kcal'), avgProtein: average('protein'), daysInTarget };
}

/** Valori per 100 g fisicamente plausibili: macro <= 100 g e kcal vicine a 4P + 4C + 9F
 *  (tolleranza per fibre, alcol e arrotondamenti). Serve a bloccare errori di battitura. */
export function isPlausibleFood({ kcal, protein, carbs, fat }) {
  const atwater = 4 * protein + 4 * carbs + 9 * fat;
  return protein + carbs + fat <= 100.5 && Math.abs(atwater - kcal) <= 0.25 * Math.max(atwater, kcal) + 15;
}

// ---------- Trend del peso: media mobile e coordinate del grafico (PURO: la UI disegna, qui si calcola) ----------
const MS_PER_DAY = 86_400_000;
const round1 = n => Math.round(n * 10) / 10;
/** 'YYYY-MM-DD' -> numero del giorno. Date.UTC evita i salti dell'ora legale (un giorno è sempre lungo 1). */
const dayNumber = key => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY); };

/** Numero del giorno -> 'YYYY-MM-DD' (l'inverso di dayNumber: stesso calendario UTC, nessun salto di ora legale). */
const dayKeyFromNumber = n => new Date(n * MS_PER_DAY).toISOString().slice(0, 10);

/** Pesi ordinati per data, uno per giorno (a parità di data vince l'ultimo dell'array). */
function sortedWeights(entries) {
  const byDate = new Map(entries.map(entry => [entry.date, entry.kg]));
  return [...byDate].map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Media mobile del peso su una finestra di `windowDays` giorni di CALENDARIO (non "ultime N pesate"):
 * se salti dei giorni, la media usa solo le pesate che cadono davvero nella settimana precedente.
 * @param {{ date: string, kg: number }[]} entries WeightEntry in qualsiasi ordine
 * @param {number} [windowDays=MOVING_AVERAGE_DAYS]
 * @returns {{ date: string, kg: number, avgKg: number, samples: number }[]} ordinati per data; avgKg con 1 decimale
 */
export function weightMovingAverage(entries, windowDays = MOVING_AVERAGE_DAYS) {
  const sorted = sortedWeights(entries);
  const days = sorted.map(entry => dayNumber(entry.date));
  let start = 0;   // finestra scorrevole: O(n) invece di O(n²)
  let sum = 0;
  return sorted.map((entry, i) => {
    sum += entry.kg;
    while (days[i] - days[start] >= windowDays) sum -= sorted[start++].kg;
    const samples = i - start + 1;
    return { date: entry.date, kg: entry.kg, avgKg: round1(sum / samples), samples };
  });
}

/**
 * Coordinate normalizzate per un grafico SVG del peso: una <polyline> per le pesate e una per la media mobile.
 * x proporzionale alla DATA; y invertito (più kg = più in alto, in SVG l'asse y scende). Scala minima di 1 kg:
 * 0,1 kg di differenza non deve sembrare una montagna.
 * @param {{ date: string, kg: number }[]} entries
 * Periodo mostrato (`rangeDays` + `today`): la media mobile si calcola su TUTTE le pesate e solo dopo si tagliano i giorni fuori finestra,
 * così i primi punti del periodo hanno comunque una media corretta. Peso obiettivo (`targetKg`): se dista meno di TARGET_SCALE_GAP_KG
 * dai dati entra nella scala (si vede quanto manca); se è più lontano resta fuori scala e `target.clamped` dice di disegnarlo sul bordo
 * con una freccia (nel margine sotto/sopra l'area dei dati), altrimenti la curva dei pesi si schiaccerebbe in una linea piatta.
 * @param {{ date: string, kg: number }[]} entries
 * @param {{ width?: number, height?: number, padding?: number, windowDays?: number,
 *   rangeDays?: number | null, today?: string | null, targetKg?: number | null }} [options]
 * @returns {{ points: { date: string, kg: number, avgKg: number, x: number, y: number, avgY: number }[],
 *   weightLine: string, averageLine: string, minKg: number | null, maxKg: number | null, grid: { kg: number, y: number }[],
 *   target: { kg: number, y: number, clamped: boolean, direction: 'above' | 'below' | null } | null }}
 *   weightLine/averageLine sono già nel formato dell'attributo `points` ("x,y x,y"); vuoti se c'è meno di 2 pesate.
 */
export function weightTrendChart(entries, { width = WEIGHT_CHART.width, height = WEIGHT_CHART.height,
  padding = WEIGHT_CHART.padding, windowDays = MOVING_AVERAGE_DAYS, rangeDays = null, today = null, targetKg = null } = {}) {
  let series = weightMovingAverage(entries, windowDays);
  if (rangeDays && today) {
    const cutoffDay = dayNumber(today) - rangeDays + 1;                  // 30 giorni = oggi e i 29 prima
    series = series.filter(p => dayNumber(p.date) >= cutoffDay);
  }
  if (series.length === 0) return { points: [], weightLine: '', averageLine: '', minKg: null, maxKg: null, grid: [], target: null };

  const values = series.flatMap(p => [p.kg, p.avgKg]);
  let minKg = Math.min(...values);
  let maxKg = Math.max(...values);
  const hasTarget = Number.isFinite(targetKg);
  const targetInScale = hasTarget && targetKg >= minKg - TARGET_SCALE_GAP_KG && targetKg <= maxKg + TARGET_SCALE_GAP_KG;
  if (targetInScale) { minKg = Math.min(minKg, targetKg); maxKg = Math.max(maxKg, targetKg); }
  if (maxKg - minKg < 1) { const middle = (minKg + maxKg) / 2; minKg = middle - 0.5; maxKg = middle + 0.5; }

  const firstDay = dayNumber(series[0].date);
  const spanDays = dayNumber(series.at(-1).date) - firstDay;
  const innerWidth = width - 2 * padding;
  const innerHeight = height - 2 * padding;
  const toX = date => round1(spanDays === 0 ? width / 2 : padding + ((dayNumber(date) - firstDay) / spanDays) * innerWidth);
  const toY = kg => round1(padding + (1 - (kg - minKg) / (maxKg - minKg)) * innerHeight);

  const points = series.map(p => ({ date: p.date, kg: p.kg, avgKg: p.avgKg, x: toX(p.date), y: toY(p.kg), avgY: toY(p.avgKg) }));
  const line = key => (points.length < 2 ? '' : points.map(p => `${p.x},${p[key]}`).join(' '));
  const grid = [maxKg, (minKg + maxKg) / 2, minKg].map(kg => ({ kg: round1(kg), y: toY(kg) }));
  let target = null;
  if (hasTarget) {
    const below = targetKg < minKg;                                        // solo se fuori scala (clamped) ha senso "sopra/sotto"
    target = targetInScale
      ? { kg: round1(targetKg), y: toY(targetKg), clamped: false, direction: null }
      // Fuori scala: la linea sta nel MARGINE sotto (o sopra) l'area dei dati, non sul bordo della scala: così non si confonde con una griglia.
      : { kg: round1(targetKg), y: below ? height - padding / 2 : padding / 2, clamped: true, direction: below ? 'below' : 'above' };
  }
  return { points, weightLine: line('y'), averageLine: line('avgY'), minKg: round1(minKg), maxKg: round1(maxKg), grid, target };
}

// ---------- Ritmo reale e data stimata (PURO) ----------
const round2 = n => Math.round(n * 100) / 100;

/**
 * Quanti kg a settimana stai davvero perdendo (negativo) o prendendo (positivo): retta ai minimi quadrati sulle pesate delle ultime
 * `days` giornate (di CALENDARIO, oggi compreso). null se i dati non bastano: meno di 3 pesate o meno di 7 giorni coperti.
 * @param {{ date: string, kg: number }[]} entries
 * @param {{ today: string, days?: number }} options today = 'YYYY-MM-DD'
 */
export function weightTrendKgPerWeek(entries, { today, days = WEIGHT_TREND_DAYS } = {}) {
  const last = dayNumber(today);
  const points = sortedWeights(entries).map(entry => ({ x: dayNumber(entry.date), y: entry.kg })).filter(p => p.x > last - days && p.x <= last);
  if (points.length < 3 || points.at(-1).x - points[0].x < 7) return null;
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  const sxx = points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  const sxy = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
  return sxx === 0 ? null : round2((sxy / sxx) * 7);
}

/**
 * Quando si arriva al peso obiettivo se si va a `kgPerWeek` (con segno: negativo = scendere).
 *   - { status: 'reached' }: obiettivo già raggiunto (o superato; tolleranza 0,05 kg)
 *   - { status: 'stalled' }: si va nel verso sbagliato o troppo piano (< MIN_TREND_KG_PER_WEEK): niente data
 *   - { status: 'far', weeks }: servirebbero più di MAX_ETA_WEEKS settimane
 *   - { status: 'eta', date, weeks }: data 'YYYY-MM-DD' stimata
 *   - null: dati mancanti o obiettivo 'maintain'
 * @param {{ goal: string, currentKg: number, targetKg: number, kgPerWeek: number, today: string }} input
 */
export function estimateGoalDate({ goal, currentKg, targetKg, kgPerWeek, today }) {
  if (!['lose', 'gain'].includes(goal) || ![currentKg, targetKg, kgPerWeek].every(Number.isFinite) || typeof today !== 'string') return null;
  const gap = targetKg - currentKg;                                        // lose: negativo finché manca; gain: positivo
  if ((goal === 'lose' && gap >= -0.05) || (goal === 'gain' && gap <= 0.05)) return { status: 'reached' };
  const rightDirection = goal === 'lose' ? kgPerWeek < 0 : kgPerWeek > 0;
  if (!rightDirection || Math.abs(kgPerWeek) < MIN_TREND_KG_PER_WEEK) return { status: 'stalled' };
  const days = Math.ceil((Math.abs(gap) / Math.abs(kgPerWeek)) * 7);
  const weeks = round1(days / 7);
  if (weeks > MAX_ETA_WEEKS) return { status: 'far', weeks };
  return { status: 'eta', date: dayKeyFromNumber(dayNumber(today) + days), weeks };
}

/**
 * Dove porta il ritmo attuale? Usa il trend OSSERVATO (ultime 4 settimane) se c'è, è nel verso giusto e non è fermo;
 * altrimenti il ritmo del piano (effectiveWeeklyRateKg). `source` dice quale dei due: la UI lo scrive ("al ritmo attuale" / "al ritmo scelto").
 * null se non c'è un peso obiettivo o l'obiettivo è 'maintain'.
 * @returns {null | { status: string, source: 'trend' | 'plan', kgPerWeek: number, remainingKg: number, date?: string, weeks?: number }}
 */
export function projectGoal(profile, weights, today) {
  if (profile.goal === 'maintain' || !Number.isFinite(profile.targetWeightKg)) return null;
  const planned = effectiveWeeklyRateKg(profile);
  const trend = weightTrendKgPerWeek(weights, { today });
  const useTrend = trend !== null && Math.sign(trend) === Math.sign(planned) && Math.abs(trend) >= MIN_TREND_KG_PER_WEEK;
  const kgPerWeek = useTrend ? trend : planned;
  const estimate = estimateGoalDate({ goal: profile.goal, currentKg: profile.weightKg, targetKg: profile.targetWeightKg, kgPerWeek, today });
  return estimate && { ...estimate, source: useTrend ? 'trend' : 'plan', kgPerWeek, remainingKg: round1(Math.abs(profile.targetWeightKg - profile.weightKg)) };
}
