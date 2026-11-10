/**
 * The ornament tab: ornamented examples (shape and relief together), the
 * simple and advanced controls of ribs, cords, keel, spines and change with
 * growth (folded sections, opened when the shell has that relief), and the
 * panel of the mechanical model of the cords.
 */
import { t } from '../i18n/i18n.js';
import { criticalWaves, firstMode, lambdaForWaves, loadRatio, mechanicalCords, unstableBand } from '../model/mechanics.js';
import { ORNAMENT_DEFAULTS, hasOrnament } from '../model/ornament.js';
import { ORNAMENT_PRESETS } from '../model/presets.js';
import { openInfo } from './formulas.js';
import { ORN_BOOLS, ORN_KEYS, ORN_PARAMS, SHAPE_KEYS, state } from './state.js';
import { $, f, qsa } from './util.js';

// Provided by main.js through init()
let applyMode, applyShape, controlsByKey, createParam, markDirty;

// Ornament tab
export const ornPresetSel = $('ornPreset');
export function buildOrnPresetOptions() {
  const v = ornPresetSel.value;
  ornPresetSel.innerHTML = '';
  for (const key of [...Object.keys(ORNAMENT_PRESETS), 'custom']) {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = t(`orn.p.${key}`);
    // "No ornament" and "custom" are states, not examples to choose
    if (key === 'custom' || key === 'smooth') o.hidden = true;
    ornPresetSel.append(o);
  }
  ornPresetSel.value = v || ornPresetKey();
}

/** The ornament preset matching the current shape and relief, or "custom". */
export function ornPresetKey() {
  const same = (a, b) => (typeof a === 'boolean' || typeof b === 'boolean' ? !!a === !!b : Math.abs(a - b) < 1e-9);
  return (
    Object.keys(ORNAMENT_PRESETS).find((k) => {
      const p = ORNAMENT_PRESETS[k];
      const orn = { ...ORNAMENT_DEFAULTS, ...p.orn };
      if (!ORN_KEYS.every((key) => same(orn[key], state[key]))) return false;
      return !p.shape || SHAPE_KEYS.every((key) => same(p.shape[key], state[key]));
    }) ?? 'custom'
  );
}

export function syncOrnamentControls() {
  for (const d of ORN_PARAMS) controlsByKey[d.key].set(state[d.key]);
  for (const k of ORN_BOOLS) $(k).checked = !!state[k];
  ornPresetSel.value = ornPresetKey();
  openActiveDrawers();
}

/**
 * Ribs, cords, spines, keel and change with growth are folded sections of equal
 * rank; when the relief is replaced (an example, undo, removing it) the ones the
 * shell has are opened and the rest folded. Moving a slider never folds a section.
 */
function openActiveDrawers() {
  const s = state;
  $('ribDrawer').open = s.ribN > 0 && s.ribH > 0;
  $('cordDrawer').open = (s.cordN > 0 && s.cordH > 0) || !!s.nodules;
  $('spineDrawer').open = s.spineN > 0 && s.spineH > 0;
  $('keelDrawer').open = s.keelH > 0;
  $('growthDrawer').open = s.ornGrowth !== 0 && hasOrnament(s);
}

export function onOrnamentChange() {
  ornPresetSel.value = ornPresetKey();
  if (state.mode === 'lines' && hasOrnament(state)) {
    state.mode = 'solid'; // relief is read on the surface
    applyMode();
  }
  markDirty();
}
function setOrnMode(mode) {
  $('tab-ornament').dataset.omode = mode;
  qsa('#ornMode [data-omode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.omode === mode)));
}
// Mechanical model of the cords: the mantle edge buckles on its elastic attachment
const mech = { lambda: lambdaForWaves(9), eta: 1.6 };
const MECH_PARAMS = [
  // The number box needs a plain number: scientific notation such as 2.4e+6
  {
    key: 'lambda',
    id: 'mechLambda',
    i18n: 'mechLambda',
    min: 1e3,
    max: 1e10,
    minLabel: '10³',
    maxLabel: '10¹⁰',
    step: 0.01,
    log: true,
    format: (v) => v.toExponential(1),
  },
  { key: 'eta', id: 'mechEta', i18n: 'mechEta', min: 0.5, max: 4, step: 0.05, digits: 2 },
];
export function drawMech() {
  const canvas = $('mechCanvas');
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const col = (n) => css.getPropertyValue(n).trim();
  const text = col('--text'),
    muted = col('--muted'),
    accent = col('--accent');
  ctx.font = `11px ${col('--font') || 'sans-serif'}`;

  const { lambda, eta } = mech;
  const nStar = criticalWaves(lambda);
  const result = mechanicalCords(lambda, eta);
  const n1 = firstMode(lambda);

  // Left: load needed to buckle into n waves, relative to the critical load
  const gw = Math.round(w * 0.58),
    pad = { l: 30, r: 8, t: 10, b: 26 };
  const nMax = Math.max(8, Math.ceil(nStar * 2.6));
  const yMax = 4;
  const X = (n) => pad.l + (n / nMax) * (gw - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - v / yMax) * (h - pad.t - pad.b);
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, h - pad.b);
  ctx.lineTo(gw - pad.r, h - pad.b);
  ctx.stroke();
  // Unstable band: modes whose load is below the applied one
  const band = unstableBand(lambda, eta);
  if (band) {
    ctx.fillStyle = `color-mix(in srgb, ${accent} 16%, transparent)`;
    ctx.fillRect(X(band.from), pad.t, X(Math.min(band.to, nMax)) - X(band.from), h - pad.t - pad.b);
  }
  ctx.strokeStyle = text;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let k = 0; k <= 200; k++) {
    const n = 0.3 + (k / 200) * (nMax - 0.3);
    const v = Math.min(yMax, loadRatio(n, lambda));
    k ? ctx.lineTo(X(n), Y(v)) : ctx.moveTo(X(n), Y(v));
  }
  ctx.stroke();
  // Applied load
  ctx.strokeStyle = accent;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(pad.l, Y(Math.min(eta, yMax)));
  ctx.lineTo(gw - pad.r, Y(Math.min(eta, yMax)));
  ctx.stroke();
  ctx.setLineDash([]);
  // First mode
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(X(n1), Y(loadRatio(n1, lambda)), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  ctx.fillText(t('mech.axis.n'), (pad.l + gw - pad.r) / 2, h - 6);
  for (const v of [0, Math.round(nMax / 2), nMax]) ctx.fillText(String(v), X(v), h - pad.b + 11);
  ctx.textAlign = 'right';
  ctx.fillText('P/Pc', pad.l - 4, pad.t + 8);
  ctx.fillText('1', pad.l - 4, Y(1) + 4);
  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.fillText('η', gw - pad.r - 8, Y(Math.min(eta, yMax)) - 4);

  // Right: the margin, smooth (dashed) and buckled into n waves (amplitude exaggerated ×3)
  const cx = gw + (w - gw) / 2,
    cy = h / 2 - 4,
    R = Math.min(w - gw, h) * 0.34;
  ctx.strokeStyle = muted;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = result.cordN ? accent : text;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const A = result.cordN ? Math.min(0.3, 3 * result.cordH) : 0;
  for (let k = 0; k <= 360; k++) {
    const ph = (k / 360) * Math.PI * 2;
    const r = R * (1 + A * Math.cos(n1 * ph));
    k ? ctx.lineTo(cx + r * Math.cos(ph), cy + r * Math.sin(ph)) : ctx.moveTo(cx + r * Math.cos(ph), cy + r * Math.sin(ph));
  }
  ctx.stroke();
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  ctx.fillText(t('mech.ring'), cx, h - 6);

  $('mechOut').textContent = result.cordN ? t('mech.out', f(nStar, 1), result.cordN, f(result.cordH, 2)) : t('mech.out.none', f(nStar, 1));
}

/** Connects this part of the interface to the rest of the app. */
export function initOrnamentTab(ctx) {
  ({ applyMode, applyShape, controlsByKey, createParam, markDirty } = ctx);
  ORN_PARAMS.forEach((d) => createParam(d, $(`${d.box}-params`), { compact: true, onChange: onOrnamentChange }));
  for (const k of ORN_BOOLS) {
    $(k).checked = !!state[k];
    $(k).addEventListener('change', (e) => {
      state[k] = e.target.checked;
      onOrnamentChange();
    });
  }
  ornPresetSel.addEventListener('change', () => {
    const p = ORNAMENT_PRESETS[ornPresetSel.value];
    if (!p) return;
    Object.assign(state, ORNAMENT_DEFAULTS, p.orn);
    if (p.shape) applyShape(p.shape);
    syncOrnamentControls();
    onOrnamentChange();
  });
  buildOrnPresetOptions();
  openActiveDrawers();
  $('ornTheory').addEventListener('click', () => openInfo('ornament'));
  $('ornClear').addEventListener('click', () => {
    Object.assign(state, ORNAMENT_DEFAULTS);
    syncOrnamentControls();
    onOrnamentChange();
  });
  qsa('#ornMode [data-omode]').forEach((b) => b.addEventListener('click', () => setOrnMode(b.dataset.omode)));

  MECH_PARAMS.forEach((d) => createParam(d, $('mech-params'), { target: mech, onChange: drawMech }));

  $('mechDrawer').addEventListener('toggle', drawMech);
  $('mechApply').addEventListener('click', () => {
    Object.assign(state, mechanicalCords(mech.lambda, mech.eta));
    syncOrnamentControls();
    onOrnamentChange();
  });
  $('mechTheory').addEventListener('click', () => {
    openInfo('ornament');
    requestAnimationFrame(() => document.getElementById('mech-theory')?.scrollIntoView({ block: 'start' }));
  });
}
