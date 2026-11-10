// Tests for the interface strings (js/i18n.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { STRINGS } from '../js/i18n/i18n.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
// All the interface code (main.js and the modules of js/ui/), read as one text
const UI_FILES = ['../js/main.js', ...readdirSync(new URL('../js/ui/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `../js/ui/${f}`)];
const main = UI_FILES.map((f) => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');

test('English and Spanish have the same keys', () => {
  assert.deepEqual(Object.keys(STRINGS.es).sort(), Object.keys(STRINGS.en).sort());
  for (const group of ['params', 'patterns', 'presets']) {
    assert.deepEqual(Object.keys(STRINGS.es[group]).sort(), Object.keys(STRINGS.en[group]).sort(), group);
  }
});

test('every key used in the HTML and in main.js exists', () => {
  const keys = new Set(Object.keys(STRINGS.en));
  const used = [
    ...[...html.matchAll(/data-i18n(?:-html|-title)?="([^"]+)"/g)].map((m) => m[1]),
    ...[...main.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]),
  ];
  assert.ok(used.length > 100);
  const missing = used.filter((k) => !keys.has(k));
  assert.deepEqual(missing, []);
});

test('strings contain no control characters (e.g. from broken TeX escapes)', () => {
  for (const lang of ['en', 'es']) {
    for (const [key, value] of Object.entries(STRINGS[lang])) {
      // eslint-disable-next-line no-control-regex -- the test looks precisely for control characters
      if (typeof value === 'string') assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value), `${lang}.${key}`);
    }
  }
});

test('element ids used in main.js exist in the HTML', () => {
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const used = new Set([...main.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]));
  const missing = [...used].filter((id) => !ids.has(id));
  assert.deepEqual(missing, []);
});
