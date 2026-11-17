import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weightChartPoints } from '../src/chart.js';

const area = { width: 320, height: 120, padding: 20 };

test('nessun peso -> nessun punto; un solo peso -> punto al centro', () => {
  assert.deepEqual(weightChartPoints([], area), { points: [], path: '' });
  assert.equal(weightChartPoints([{ date: '2026-11-12', kg: 80 }], area).points[0].x, 160);
});

test('più kg = più in alto (y più piccolo) e le x seguono le date', () => {
  const { points, path } = weightChartPoints([
    { date: '2026-11-10', kg: 82 }, { date: '2026-11-12', kg: 80 }, { date: '2026-11-20', kg: 81 }], area);
  assert.equal(points[0].y, 20);                       // il più pesante: in alto (margine)
  assert.equal(points[1].y, 100);                      // il più leggero: in basso (altezza - margine)
  assert.equal(points[0].x, 20);
  assert.equal(points.at(-1).x, 300);
  assert.ok(points[1].x - points[0].x < points[2].x - points[1].x);   // 2 giorni sono meno di 8 giorni
  assert.match(path, /^M20 20 L/);
});

test('i dati arrivano in qualsiasi ordine, e una variazione minima non diventa una montagna', () => {
  const { points } = weightChartPoints([{ date: '2026-11-12', kg: 80.1 }, { date: '2026-11-10', kg: 80 }], area);
  assert.deepEqual(points.map(p => p.date), ['2026-11-10', '2026-11-12']);
  assert.ok(points[0].y > 40 && points[1].y < 80);    // scala minima di 1 kg: i punti restano vicini, non agli estremi
});
