import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewFromHash, backAction } from '../src/router.js';

test('hash noti -> vista corrispondente', () => {
  assert.equal(viewFromHash('#diary'), 'diary');
  assert.equal(viewFromHash('#settings'), 'settings');
});

test('hash vuoto, sconosciuto o #profile -> home', () => {
  assert.equal(viewFromHash(''), 'home');
  assert.equal(viewFromHash(undefined), 'home');
  assert.equal(viewFromHash('#profile'), 'home');
  assert.equal(viewFromHash('#../etc'), 'home');
});

// ---------- tasto "indietro" di Android ----------
test('indietro: una finestra aperta si chiude per prima, in qualunque pagina e su qualunque giorno', () => {
  for (const view of ['home', 'diary', 'settings']) {
    for (const viewedDay of [null, '2026-11-16']) assert.equal(backAction({ hasOpenDialog: true, view, viewedDay }), 'close-dialog', `${view} ${viewedDay}`);
  }
});

test('indietro: da Progressi e Impostazioni si torna alla Home; in Home su un giorno passato si torna a oggi', () => {
  assert.equal(backAction({ view: 'diary' }), 'go-home');
  assert.equal(backAction({ view: 'settings', viewedDay: '2026-11-16' }), 'go-home');     // prima la pagina, poi il giorno
  assert.equal(backAction({ view: 'home', viewedDay: '2026-11-16' }), 'go-today');
});

test('indietro: dalla Home di oggi, senza finestre, si esce dall\'app; senza dati vale lo stesso', () => {
  assert.equal(backAction({ view: 'home', viewedDay: null }), 'exit');
  assert.equal(backAction({}), 'exit');
  assert.equal(backAction(), 'exit');
});
