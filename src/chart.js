// Logica PURA del grafico del peso: dai pesi alle coordinate SVG. Disegnarle è compito della UI (weight.js).
const toTime = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
const round1 = n => Math.round(n * 10) / 10;

/** entries = [{ date: 'YYYY-MM-DD', kg }]. Restituisce { points: [{ date, kg, x, y }], path } per un'area `width` x `height`.
 *  x è proporzionale alla DATA (due pesi a una settimana di distanza non sono vicini come due consecutivi);
 *  y è invertito (più kg = più in alto: in SVG l'asse y cresce verso il basso). */
export function weightChartPoints(entries, { width, height, padding = 16 }) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return { points: [], path: '' };

  const times = sorted.map(entry => toTime(entry.date));
  const first = times[0];
  const last = times.at(-1);
  let min = Math.min(...sorted.map(e => e.kg));
  let max = Math.max(...sorted.map(e => e.kg));
  if (max - min < 1) { const middle = (min + max) / 2; min = middle - 0.5; max = middle + 0.5; } // scala minima: 0,1 kg non deve sembrare una salita

  const innerWidth = width - 2 * padding;
  const innerHeight = height - 2 * padding;
  const points = sorted.map((entry, i) => ({
    date: entry.date,
    kg: entry.kg,
    x: round1(last === first ? width / 2 : padding + ((times[i] - first) / (last - first)) * innerWidth),
    y: round1(padding + (1 - (entry.kg - min) / (max - min)) * innerHeight),
  }));
  return { points, path: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') };
}
