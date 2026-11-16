import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, backupFileName, parseBackup, describeBackup } from '../src/backup.js';
import { emptyHabits } from '../src/habits.js';

const profile = { name: 'Mattia', age: 30, weightKg: 80, heightCm: 180, sex: 'male', goal: 'lose', activity: 'sedentary' };
const state = { profile, logs: {}, habits: emptyHabits(), customFoods: [], view: 'diary' };

test('il backup contiene profilo, diario, abitudini e alimenti personali (non la vista)', () => {
  const backup = buildBackup(state, new Date('2026-11-12T10:00:00Z'));
  assert.equal(backup.app, 'fitkia');
  assert.deepEqual(backup.customFoods, []);
  assert.equal('view' in backup, false);
  assert.equal(backup.exportedAt, '2026-11-12T10:00:00.000Z');
});

test('nome file con la data locale', () => assert.match(backupFileName(new Date()), /^fitkia-backup-\d{4}-\d{2}-\d{2}\.json$/));

test('export -> import: i dati tornano identici', () => {
  const result = parseBackup(JSON.stringify(buildBackup(state)));
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.profile, profile);
  assert.match(describeBackup(result.data), /^Mattia · 0 giorni di diario · 0 pesi · 0 alimenti personali$/);
});

test('un backup vecchio senza customFoods e senza goal/activity è accettato', () => {
  const old = { app: 'fitkia', schema: 1, profile: { name: 'M', age: 30, weightKg: 80, heightCm: 180, sex: 'male' }, logs: {}, habits: {} };
  const result = parseBackup(JSON.stringify(old));
  assert.equal(result.ok, true);
  assert.equal(result.data.profile.goal, 'lose');
  assert.deepEqual(result.data.customFoods, []);
});

test('file sbagliati: messaggio chiaro e nessun dato', () => {
  for (const text of ['', 'non json', '[]', '{"app":"altro"}', '{"app":"fitkia","schema":99,"profile":{}}',
    JSON.stringify({ app: 'fitkia', schema: 1, profile: { name: 'M', age: 3 }, logs: {} })]) {
    const result = parseBackup(text);
    assert.equal(result.ok, false, text);
    assert.ok(result.error.length > 0);
  }
});
