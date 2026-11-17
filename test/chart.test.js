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
  assert.deepEqual(weightTrendChart([], area), { points: [], weightLine: '', averageLine: '', minKg: null, maxKg: null, grid: [] });
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
