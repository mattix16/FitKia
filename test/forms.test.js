// ui/forms.js: le scelte a schede (radio veri) al posto delle <select> di sistema. choiceMarkup è pura: restituisce il markup come testo,
// quindi si prova senza DOM. Radio veri = FormData, validazione e tastiera restano quelli di prima.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choiceMarkup } from '../src/ui/forms.js';
import { ACTIVITY_OPTIONS, GOAL_OPTIONS, RATE_OPTIONS, SEX_OPTIONS } from '../src/config.js';

const radios = markup => [...markup.matchAll(/<input\b[^>]*>/g)].map(match => match[0]);
const isChecked = input => /\schecked\b/.test(input);
const valueOf = input => input.match(/value="([^"]*)"/)[1];

test('choiceMarkup: un radio per opzione, tutti con lo stesso name, uno solo selezionato', () => {
  const inputs = radios(choiceMarkup('activity', ACTIVITY_OPTIONS, 'light'));
  assert.equal(inputs.length, ACTIVITY_OPTIONS.length);
  assert.ok(inputs.every(input => input.includes('type="radio"') && input.includes('name="activity"')));
  assert.deepEqual(inputs.filter(isChecked).map(valueOf), ['light']);
});

test('choiceMarkup (lista): ogni opzione è una scheda con titolo e descrizione', () => {
  const markup = choiceMarkup('activity', ACTIVITY_OPTIONS, 'light');
  assert.equal([...markup.matchAll(/<label class="choice/g)].length, ACTIVITY_OPTIONS.length);
  for (const { label, hint } of ACTIVITY_OPTIONS) {
    assert.ok(markup.includes(label), label);
    assert.ok(markup.includes(hint), hint);
  }
});

test('choiceMarkup: neutralizza i caratteri speciali di nomi e descrizioni', () => {
  const markup = choiceMarkup('goal', [{ id: 'x', label: '<b>"A" & B</b>', hint: 'l\'<i>' }], undefined);
  assert.ok(markup.includes('&lt;b&gt;&quot;A&quot; &amp; B&lt;/b&gt;'));
  assert.equal(markup.includes('<b>'), false);
  assert.equal(markup.includes('<i>'), false);
});

test('choiceMarkup: senza selezione (il sesso nell\'onboarding) nessun radio è selezionato', () => {
  assert.equal(radios(choiceMarkup('sex', SEX_OPTIONS, undefined)).some(isChecked), false);
});

test('choiceMarkup (segmentato): gli id numerici del ritmo (0.25, 0.5, 0.75) si selezionano e la descrizione non compare', () => {
  const markup = choiceMarkup('weeklyRateKg', RATE_OPTIONS, 0.5, 'segmented');
  assert.deepEqual(radios(markup).filter(isChecked).map(valueOf), ['0.5']);
  assert.deepEqual(radios(markup).map(valueOf), ['0.25', '0.5', '0.75']);
  for (const { label, hint } of RATE_OPTIONS) {
    assert.ok(markup.includes(label), label);
    assert.equal(markup.includes(hint), false, `${hint} non va nel segmentato`);
  }
});

test('choiceMarkup: i radio sono nascosti con sr-only (restano raggiungibili con la tastiera), mai con hidden', () => {
  for (const variant of ['list', 'segmented']) {
    for (const input of radios(choiceMarkup('goal', GOAL_OPTIONS, 'lose', variant))) {
      assert.ok(/class="[^"]*\bsr-only\b/.test(input), `${variant}: ${input}`);
      assert.equal(/\bhidden\b/.test(input), false, `${variant}: ${input}`);
    }
  }
});
