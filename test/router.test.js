import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewFromHash } from '../src/router.js';

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
