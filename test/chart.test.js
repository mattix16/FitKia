// Trend del peso: media mobile a 7 giorni + coordinate del grafico SVG (funzioni pure in nutrition.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weightMovingAverage, weightTrendChart } from '../src/nutrition.js';

const area = { width: 320, height: 120, padding: 20 };

test('media mobile: finestra di 7 giorni di CALENDARIO, non "ultime 7 pesate"', () => {
  const series = weightMovingAverage([
    { date: '2026-11-01', kg: 80 }, { date: '2026-11-02', kg: 82 }, { date: '2026-11-07', kg: 81 },
    { date: '2026-11-08', kg: 79 },   // l'1 novembre è fuori finestra (8 - 1 = 7 giorni)
    { date: '2026-11-20', kg: 77 },   // dopo una pausa lunga la media riparte dal solo valore
  ]);
  assert.deepEqual(series.map(p => p.avgKg), [80, 81, 81, 80.7, 77]);
  assert.deepEqual(series.map(p => p.samples), [1, 2, 3, 3, 1]);
});

test('media mobile: ordine qualsiasi, un peso per giorno (vince l\'ultimo), cambio mese e ora legale', () => {
  const series = weightMovingAverage([
    { date: '2026-10-31', kg: 81 }, { date: '2026-10-24', kg: 90 }, { date: '2026-10-25', kg: 80 }, { date: '2026-10-25', kg: 82 },
  ]);
  assert.deepEqual(series.map(p => p.date), ['2026-10-24', '2026-10-25', '2026-10-31']);
  assert.equal(series[1].kg, 82);
  assert.equal(series[2].avgKg, 81.5);   // 25 ott (ora legale) -> 31 ott = 6 giorni: dentro; il 24 è fuori
  assert.deepEqual(weightMovingAverage([]), []);
});

test('grafico: 0 pesate -> niente da disegnare; 1 pesata -> punto al centro e nessuna linea', () => {
  assert.deepEqual(weightTrendChart([], area), { points: [], weightLine: '', averageLine: '', minKg: null, maxKg: null, grid: [], target: null });
  const single = weightTrendChart([{ date: '2026-11-12', kg: 80 }], area);
  assert.equal(single.points.length, 1);
  assert.equal(single.points[0].x, 160);
  assert.equal(single.points[0].y, 60);   // scala minima di 1 kg centrata sul valore: sta a metà altezza
  assert.equal(single.weightLine, '');
  assert.equal(single.averageLine, '');
});

test('grafico: più kg = più in alto, x proporzionale alle date, polyline pronte per l\'attributo points', () => {
  const { points, weightLine, averageLine, grid } = weightTrendChart([
    { date: '2026-11-10', kg: 82 }, { date: '2026-11-12', kg: 80 }, { date: '2026-11-20', kg: 81 }], area);
  assert.equal(points[0].y, 20);                          // il più pesante: in alto (margine)
  assert.equal(points[1].y, 100);                         // il più leggero: in basso (altezza - margine)
  assert.equal(points[0].x, 20);
  assert.equal(points.at(-1).x, 300);
  assert.ok(points[1].x - points[0].x < points[2].x - points[1].x);   // 2 giorni sono meno di 8 giorni
  assert.match(weightLine, /^20,20 \d/);
  assert.equal(weightLine.split(' ').length, 3);
  assert.equal(averageLine.split(' ').length, 3);
  assert.equal(points[1].avgKg, 81);                      // media di 82 e 80
  assert.ok(points.every(p => p.avgY >= 20 && p.avgY <= 100)); // la media resta dentro l'area
  assert.deepEqual(grid.map(g => g.y), [20, 60, 100]);
});

test('grafico: una variazione minima non diventa una montagna', () => {
  const { points } = weightTrendChart([{ date: '2026-11-12', kg: 80.1 }, { date: '2026-11-10', kg: 80 }], area);
  assert.deepEqual(points.map(p => p.date), ['2026-11-10', '2026-11-12']);
  assert.ok(points[0].y > 40 && points[1].y < 80);
});

// ---------- B3: periodo mostrato ----------
const TODAY = '2026-11-19';
const longRun = [
  { date: '2026-09-20', kg: 95 },   // molto prima
  { date: '2026-10-20', kg: 90 },   // 30 giorni fa: appena fuori da una finestra di 30 giorni (oggi + i 29 prima)
  { date: '2026-10-21', kg: 80 },   // 29 giorni fa: dentro
  { date: '2026-11-19', kg: 79 },
];

test('periodo: 30 giorni = oggi e i 29 prima; Tutto (null) li mostra tutti; senza `today` non si taglia', () => {
  assert.deepEqual(weightTrendChart(longRun, { ...area, rangeDays: 30, today: TODAY }).points.map(p => p.date), ['2026-10-21', '2026-11-19']);
  assert.equal(weightTrendChart(longRun, { ...area, rangeDays: 90, today: TODAY }).points.length, 4);       // il 20 settembre è 60 giorni fa: dentro i 90
  assert.equal(weightTrendChart(longRun, { ...area, rangeDays: null, today: TODAY }).points.length, 4);
  assert.equal(weightTrendChart(longRun, { ...area, rangeDays: 30 }).points.length, 4);
  assert.deepEqual(weightTrendChart(longRun, { ...area, rangeDays: 7, today: TODAY }).points.map(p => p.date), ['2026-11-19']);
  assert.deepEqual(weightTrendChart([{ date: '2026-01-01', kg: 80 }], { ...area, rangeDays: 30, today: TODAY }).points, []);   // nessuna pesata nel periodo
});

test('periodo: la media mobile si calcola su TUTTE le pesate e poi si taglia (il primo punto del periodo ha la sua media vera)', () => {
  const { points } = weightTrendChart(longRun, { ...area, rangeDays: 30, today: TODAY });
  assert.equal(points[0].avgKg, 85);       // 90 (20 ott, fuori periodo) e 80 (21 ott): la finestra di 7 giorni li include entrambi
  assert.equal(points[1].avgKg, 79);       // il 19 novembre è solo: la pausa azzera la media
});

// ---------- B2: linea del peso obiettivo ----------
const near = [{ date: '2026-11-10', kg: 80 }, { date: '2026-11-12', kg: 81 }];

test('peso obiettivo vicino ai dati: entra nella scala (la distanza si vede) e non è "clamped"', () => {
  const { target, points } = weightTrendChart(near, { ...area, targetKg: 78 });
  assert.deepEqual(target, { kg: 78, y: 100, clamped: false, direction: null });       // è il punto più basso: in fondo all'area
  assert.equal(points[1].y, 20);                                                       // 81 resta il più alto
  assert.ok(points[0].y > 20 && points[0].y < 100);
});

test('peso obiettivo lontano (oltre 6 kg dai dati): sta sul bordo e NON schiaccia la scala dei pesi', () => {
  const without = weightTrendChart(near, area);
  const below = weightTrendChart(near, { ...area, targetKg: 60 });
  assert.deepEqual(below.target, { kg: 60, y: 110, clamped: true, direction: 'below' });   // nel margine sotto l'area dei dati (120 - 20/2)
  assert.deepEqual(below.points, without.points);                                      // la curva è identica a quella senza obiettivo
  assert.deepEqual(weightTrendChart(near, { ...area, targetKg: 100 }).target, { kg: 100, y: 10, clamped: true, direction: 'above' });   // nel margine sopra
});

test('peso obiettivo assente o non valido -> nessuna linea', () => {
  for (const targetKg of [null, undefined, NaN]) assert.equal(weightTrendChart(near, { ...area, targetKg }).target, null);
});
