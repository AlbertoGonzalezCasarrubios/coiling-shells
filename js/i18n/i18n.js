/**
 * Interface strings in English (default) and Spanish.
 * In the HTML: data-i18n (text), data-i18n-html (HTML), data-i18n-title (title + aria-label),
 * data-i18n-label (optgroup label), data-i18n-placeholder.
 *
 * en.js / es.js       short interface strings, parameter names, preset names
 * theory-en/es.js     the long About pages (theory, controls, credits)
 * tex.js              formulas and reference lists, shared by both languages
 */
import EN from './en.js';
import ES from './es.js';
import THEORY_EN from './theory-en.js';
import THEORY_ES from './theory-es.js';

export const STRINGS = {
  en: { ...EN, ...THEORY_EN },
  es: { ...ES, ...THEORY_ES },
};

export { GENERAL_TEX, DEFS_TEX, MIRROR_TEX, AI_TEX, AS_TEX, GLOBAL_TEX, HORMONE_TEX } from './tex.js';

let current = 'en';

export function setLang(lang) {
  current = STRINGS[lang] ? lang : 'en';
  return current;
}

export function getLang() {
  return current;
}

/** String for the given key; function values are called with the extra arguments. */
export function t(key, ...args) {
  const v = STRINGS[current][key] ?? STRINGS.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

export function tParam(key) {
  return STRINGS[current].params[key] || {};
}

export function tPattern(key) {
  return STRINGS[current].patterns[key] || key;
}

export function tPreset(key) {
  return STRINGS[current].presets[key] || key;
}

/**
 * Applies the translations to static elements with data-i18n* attributes.
 * @param {ParentNode} [root]
 */
export function applyStatic(root = document) {
  /** @type {(sel: string) => NodeListOf<HTMLElement & { label: string, placeholder: string }>} */
  const all = (sel) => root.querySelectorAll(sel);
  all('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  all('[data-i18n-html]').forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
  all('[data-i18n-label]').forEach((el) => (el.label = t(el.dataset.i18nLabel)));
  all('[data-i18n-placeholder]').forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
  all('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
    // groups and buttons without visible text need an accessible name
    if (!el.textContent.trim() || el.getAttribute('role')) el.setAttribute('aria-label', el.title);
  });
  document.documentElement.lang = current;
  document.title = t('doc.title');
}
