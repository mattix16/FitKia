import { SEX_OFFSET, ACTIVITY, RING_CIRCUMFERENCE, MOVING_AVERAGE_DAYS, WEIGHT_CHART } from './config.js';

export function calculateBmr({ weightKg, heightCm, age, sex }) {
  if (!(sex in SEX_OFFSET)) throw new Error(`Sesso non valido: ${sex}`);
  return 10 * weightKg + 6.25 * heightCm - 5 * age + SEX_OFFSET[sex];
}

export function calculateTargets(profile) {
  const bmr = calculateBmr(profile);
  const tdee = bmr * ACTIVITY[profile.activity ?? 'sedentary']; // di default sedentario se non specificato, sintassi strana me l'ha consigliata gemini non la sepevo...
  return {
    lose: Math.max(Math.round(tdee - 500), Math.round(bmr)), // il valore minimo mai sotto il BMR, allora non si sopravvive ); e non si può scendere sotto il BMR
    maintain: Math.round(tdee),
    gain: Math.round(tdee + 300),
  };
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
 * @param {{ width?: number, height?: number, padding?: number, windowDays?: number }} [options]
 * @returns {{ points: { date: string, kg: number, avgKg: number, x: number, y: number, avgY: number }[],
 *   weightLine: string, averageLine: string, minKg: number | null, maxKg: number | null, grid: { kg: number, y: number }[] }}
 *   weightLine/averageLine sono già nel formato dell'attributo `points` ("x,y x,y"); vuoti se c'è meno di 2 pesate.
 */
export function weightTrendChart(entries, { width = WEIGHT_CHART.width, height = WEIGHT_CHART.height,
  padding = WEIGHT_CHART.padding, windowDays = MOVING_AVERAGE_DAYS } = {}) {
  const series = weightMovingAverage(entries, windowDays);
  if (series.length === 0) return { points: [], weightLine: '', averageLine: '', minKg: null, maxKg: null, grid: [] };

  const values = series.flatMap(p => [p.kg, p.avgKg]);
  let minKg = Math.min(...values);
  let maxKg = Math.max(...values);
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
  return { points, weightLine: line('y'), averageLine: line('avgY'), minKg: round1(minKg), maxKg: round1(maxKg), grid };
}
