process.env.TZ = 'Europe/Rome'; // le date sono in ora LOCALE: la proviamo con un fuso con l'ora legale
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shiftDayKey, recentDays, emptyDay, addEntry, makeEntry } from '../src/log.js';

test('shiftDayKey attraversa mesi, anni e cambi di ora legale', () => {
  assert.equal(shiftDayKey('2026-03-01', -1), '2026-02-28');
  assert.equal(shiftDayKey('2027-01-01', -1), '2026-12-31');
  assert.equal(shiftDayKey('2026-10-26', -1), '2026-10-25');   // giorno in cui finisce l'ora legale
  assert.equal(shiftDayKey('2026-03-29', 1), '2026-03-30');    // giorno in cui inizia
});

test('recentDays: oggi per primo, giorni senza dati a zero', () => {
  const food = { id: 'x', name: 'X', per100g: { kcal: 100, protein: 1, carbs: 2, fat: 3 } };
  const logs = { '2026-11-11': addEntry(emptyDay(), 'lunch', makeEntry(food, 200)) };
  const days = recentDays(logs, 3, '2026-11-12');
  assert.deepEqual(days.map(d => d.date), ['2026-11-12', '2026-11-11', '2026-11-10']);
  assert.deepEqual(days.map(d => d.kcal), [0, 200, 0]);
});
