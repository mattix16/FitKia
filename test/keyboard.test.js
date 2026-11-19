// keyboard.js: come si capisce che la tastiera del telefono è aperta (così la barra in basso si ritira e non copre i campi).
// readKeyboard è pura: riceve le misure e dice se la tastiera è aperta; chi la usa (ui/keyboard.js) conserva la `baseline` fra una chiamata e l'altra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readKeyboard, isTextEntry } from '../src/keyboard.js';
import { KEYBOARD_MIN_SHRINK_PX } from '../src/config.js';

const PORTRAIT = { height: 914, width: 411 };                         // lo schermo dell'emulatore in pixel CSS
const shrunk = by => ({ height: PORTRAIT.height - by, width: PORTRAIT.width });

test('la soglia della tastiera è di 120 px (più di una barra degli indirizzi che si ritira, meno di qualunque tastiera)', () => {
  assert.equal(KEYBOARD_MIN_SHRINK_PX, 120);
});

test('con un campo di testo attivo e l\'altezza ridotta di 336 px la tastiera è aperta, e la misura di riferimento resta quella intera', () => {
  assert.deepEqual(readKeyboard({ typing: true, baseline: PORTRAIT, viewport: shrunk(336) }), { open: true, baseline: PORTRAIT });
});

test('tastiera chiusa con il pulsante "v" mentre il campo resta attivo: la barra deve tornare', () => {
  assert.equal(readKeyboard({ typing: true, baseline: PORTRAIT, viewport: PORTRAIT }).open, false);
});

test('senza un campo attivo non è mai aperta, e la misura di riferimento non scende (la tastiera può essere ancora in uscita)', () => {
  const state = readKeyboard({ typing: false, baseline: PORTRAIT, viewport: shrunk(336) });
  assert.equal(state.open, false);
  assert.equal(state.baseline.height, 914);
});

test('passando da un campo di testo a un altro la tastiera resta aperta: la barra non riappare nel mezzo', () => {
  let state = readKeyboard({ typing: true, baseline: PORTRAIT, viewport: shrunk(336) });
  assert.equal(state.open, true);
  state = readKeyboard({ typing: false, baseline: state.baseline, viewport: shrunk(336) });   // focusout: per un attimo nessun campo attivo
  assert.equal(state.open, false);
  state = readKeyboard({ typing: true, baseline: state.baseline, viewport: shrunk(336) });    // focusin sul campo dopo
  assert.equal(state.open, true);
});

test('un restringimento piccolo non è una tastiera: 60 e 120 px no, 121 px sì', () => {
  for (const [by, open] of [[60, false], [KEYBOARD_MIN_SHRINK_PX, false], [KEYBOARD_MIN_SHRINK_PX + 1, true]]) {
    assert.equal(readKeyboard({ typing: true, baseline: PORTRAIT, viewport: shrunk(by) }).open, open, `${by} px`);
  }
});

test('se cambia la larghezza (rotazione) la misura di riferimento si ricalcola e la tastiera non risulta aperta', () => {
  const landscape = { height: 411, width: 914 };
  assert.deepEqual(readKeyboard({ typing: true, baseline: PORTRAIT, viewport: landscape }), { open: false, baseline: landscape });
});

test('un\'altezza maggiore di quella di riferimento alza la misura di riferimento', () => {
  const taller = { height: 1000, width: 411 };
  assert.deepEqual(readKeyboard({ typing: true, baseline: PORTRAIT, viewport: taller }), { open: false, baseline: taller });
});

test('isTextEntry: vera per i campi in cui si scrive (qualunque tipo di testo, numeri compresi)', () => {
  for (const type of [undefined, 'text', 'number', 'search', 'email', 'tel', 'password', 'url']) {
    assert.equal(isTextEntry({ tagName: 'INPUT', type }), true, String(type));
  }
  assert.equal(isTextEntry({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTextEntry({ tagName: 'DIV', isContentEditable: true }), true);
});

test('isTextEntry: falsa per scelte, pulsanti, file, cursori, date e per niente', () => {
  for (const type of ['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'date']) {
    assert.equal(isTextEntry({ tagName: 'INPUT', type }), false, type);
  }
  assert.equal(isTextEntry({ tagName: 'BUTTON' }), false);
  assert.equal(isTextEntry(null), false);
  assert.equal(isTextEntry(undefined), false);
});
