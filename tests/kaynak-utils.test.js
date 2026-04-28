import test from 'node:test';
import assert from 'node:assert/strict';

import { filterResources, getDomainFromUrl, normalizeHttpUrl } from '../js/shared/utils.js';

test('normalizeHttpUrl prepends https and validates protocol', () => {
  assert.equal(normalizeHttpUrl('openai.com/docs'), 'https://openai.com/docs');
  assert.throws(() => normalizeHttpUrl('javascript:alert(1)'), /Sadece http/);
});

test('getDomainFromUrl returns clean hostname', () => {
  assert.equal(getDomainFromUrl('https://www.openai.com/research'), 'openai.com');
});

test('filterResources can filter favorites and query', () => {
  const items = [
    { title: 'OpenAI Docs', url: 'https://openai.com', category: 'AI', tags: ['api'], note: 'ok', favorite: true },
    { title: 'Kanun', url: 'https://mevzuat.gov.tr', category: 'Hukuk', tags: ['kanun'], note: '', favorite: false },
  ];

  assert.equal(filterResources(items, '', 'Favoriler').length, 1);
  assert.equal(filterResources(items, 'kanun', 'Tümü').length, 1);
  assert.equal(filterResources(items, 'docs', 'AI').length, 1);
});
