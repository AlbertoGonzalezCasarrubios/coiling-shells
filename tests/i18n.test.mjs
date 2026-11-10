// Tests for the interface strings (js/i18n.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { STRINGS } from '../js/i18n/i18n.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
// All the interface code (main.js and the modules of js/ui/), read as one text
const UI_FILES = [
  '../js/main.js',
  ...readdirSync(new URL('../js/ui/', import.meta.url))
    .filter((f) => f.endsWith('.js'))
    .map((f) => `../js/ui/${f}`),
];
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

test('translation helpers: language, fallbacks and static texts', async () => {
  const { setLang, getLang, t, tParam, tPattern, tPreset, applyStatic } = await import('../js/i18n/i18n.js');
  assert.equal(setLang('fr'), 'en', 'an unknown language falls back to English');
  assert.equal(setLang('es'), 'es');
  assert.equal(getLang(), 'es');
  assert.equal(t('pig.save'), STRINGS.es['pig.save']);
  assert.equal(t('no.such.key'), 'no.such.key', 'a missing key shows itself');
  assert.equal(t('ex.dims', 1, 2, 3), STRINGS.es['ex.dims'](1, 2, 3), 'function strings take arguments');
  assert.equal(tPattern('naticarius'), STRINGS.es.patterns.naticarius);
  assert.equal(tPattern('unknown'), 'unknown');
  assert.equal(tPreset('unknown'), 'unknown');
  assert.deepEqual(tParam('unknown'), {});
  assert.ok(tParam('pT').name);
  // Static elements: text, HTML, labels, placeholders and titles (with an accessible name when there is no text)
  const el = (dataset, text = '') => ({
    dataset,
    textContent: text,
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = v;
    },
    getAttribute(k) {
      return this.attrs[k] ?? null;
    },
  });
  const nodes = {
    '[data-i18n]': [el({ i18n: 'pig.save' })],
    '[data-i18n-html]': [el({ i18nHtml: 'ex.print.tips' })],
    '[data-i18n-label]': [el({ i18nLabel: 'pig.save' })],
    '[data-i18n-placeholder]': [el({ i18nPlaceholder: 'pig.save' })],
    '[data-i18n-title]': [el({ i18nTitle: 'tb.undo' }), el({ i18nTitle: 'tb.undo' }, 'visible text')],
  };
  const root = { querySelectorAll: (sel) => nodes[sel] };
  const previous = globalThis.document;
  globalThis.document = { documentElement: {}, title: '' };
  try {
    applyStatic(root);
    assert.equal(nodes['[data-i18n]'][0].textContent, STRINGS.es['pig.save']);
    assert.equal(nodes['[data-i18n-html]'][0].innerHTML, STRINGS.es['ex.print.tips']);
    assert.equal(nodes['[data-i18n-label]'][0].label, STRINGS.es['pig.save']);
    assert.equal(nodes['[data-i18n-placeholder]'][0].placeholder, STRINGS.es['pig.save']);
    const [iconOnly, withText] = nodes['[data-i18n-title]'];
    assert.equal(iconOnly.title, STRINGS.es['tb.undo']);
    assert.equal(iconOnly.attrs['aria-label'], STRINGS.es['tb.undo'], 'icon-only controls get an accessible name');
    assert.equal(withText.attrs['aria-label'], undefined);
    assert.equal(globalThis.document.documentElement.lang, 'es');
    assert.equal(globalThis.document.title, STRINGS.es['doc.title']);
  } finally {
    globalThis.document = previous;
    setLang('en');
  }
});
