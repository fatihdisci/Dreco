import test from 'node:test';
import assert from 'node:assert/strict';

import { fmtNum, fmtCompact, parseISODuration, fmtDuration } from '../js/youtube/ui.js';

test('fmtNum uses Turkish separators', () => {
  assert.equal(fmtNum(1234567), '1.234.567');
});

test('fmtCompact compacts thousands and millions', () => {
  assert.equal(fmtCompact(1500), '1,5 B');
  assert.equal(fmtCompact(2_200_000), '2,2 Mn');
});

test('parseISODuration parses h/m/s combinations', () => {
  assert.equal(parseISODuration('PT1H2M3S'), 3723);
  assert.equal(parseISODuration('PT45S'), 45);
  assert.equal(parseISODuration('PT3M'), 180);
});

test('fmtDuration renders mm:ss and hh:mm:ss', () => {
  assert.equal(fmtDuration(65), '1:05');
  assert.equal(fmtDuration(3723), '1:02:03');
});
