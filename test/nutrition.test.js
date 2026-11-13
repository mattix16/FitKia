import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBmr, calculateTargets } from '../nutrition.js';

const man = { weightKg: 80, heightCm: 180, age: 30, sex: 'male' };

test('BMR uomo 80kg/180cm/30 anni = 1780', () => {
  assert.equal(calculateBmr(man), 1780);
});

test('sesso non valido lancia un errore', () => {
  assert.throws(() => calculateBmr({ ...man, sex: 'maschio' }));
});

// TODO: Mattia, scrivi i test per:
//  - calculateTargets: lose < maintain < gain, e lose >= BMR anche per persone piccole
//  - ringDashArray: goal = 0, eaten = 0, eaten > goal (mai oltre la circonferenza)
//  - validateProfile: "72,5" accettato, altezza 1.75 rifiutata (è in metri, non in cm)
