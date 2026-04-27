import test from 'node:test';
import assert from 'node:assert/strict';

import { toMonthKey, monthLabel } from '../js/shared/utils.js';

test('toMonthKey formats month key with zero padding', () => {
  const d = new Date('2026-04-15T10:00:00Z');
  assert.equal(toMonthKey(d), '2026-04');
});

test('monthLabel formats Turkish month names', () => {
  assert.equal(monthLabel('2026-01'), 'Ocak 2026');
  assert.equal(monthLabel('2026-12'), 'Aralık 2026');
});
