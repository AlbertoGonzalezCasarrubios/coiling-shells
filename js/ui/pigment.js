/**
 * The pigment tab: Meinhardt's models computed along the growing margin (in a
 * Web Worker, or on the main thread if workers are unavailable), the space–time
 * record (in time or unrolled), the margin profile, the pattern gallery with its
 * thumbnails, the simple and advanced controls, and the texture that paints the
 * shell. The pattern state also goes into the page address (patternHash).
 */
import * as THREE from 'three';
import { t, tPattern } from '../i18n/i18n.js';
import { PROFILE_WIDTH, simulatePattern } from '../model/meinhardt.js';
import { DEFAULT_PATTERN, MODEL_DEFAULTS, PATTERN_PRESETS } from '../model/presets.js';
import { downloadImage } from './export-dialog.js';
import { formulaView, openInfo, scheduleFormula } from './formulas.js';
import { innerMat, renderer, solidMat } from './scene.js';
import { fromHash, state, writeHash } from './state.js';
import { $, hexRgb, sig } from './util.js';

// Provided by main.js through init()
let applyMode, capturePointer, controlsByKey, createParam, setFill;

// Pigmentation (Meinhardt's reaction–diffusion models)
// ---------------------------------------------------------------------------

export const PATTERN_ROWS = 2048;   // rows of the space–time record (apex → aperture)
const PATTERN_WIDTH = 1024;  // texture columns (once around the aperture)
export const PATTERN_CELLS = 256;   // margin cells at the aperture (size ×1)
// Half-width of the pigmentation threshold: pigment is laid down where the
// activator exceeds a threshold, as in Meinhardt's simulations, with sharp edges
const PIGMENT_EDGE = 0.12;
const THUMB = { rows: 144, width: 256 }; // one-cell lines must not be lost when downscaling

const PATTERN_KEYS = ['model', 'Da', 'D2', 'ra', 'r2', 'kappa', 'ba', 'b2', 'noise', 'globalCtl', 'T', 'insertion', 'base', 'pigment', 'size', 'amount'];
const PATTERN_DEFAULTS = { size: 1, amount: 0.5 };

export const pickPattern = (p) => Object.fromEntries(PATTERN_KEYS.map((k) => [k, p[k] ?? PATTERN_DEFAULTS[k]]));

export const pattern = { on: false, preset: DEFAULT_PATTERN, seed: 7, ...pickPattern(PATTERN_PRESETS[DEFAULT_PATTERN]) };
let patternState = 'pattern'; // 'pattern' | 'uniform' | 'extinct'

// Pattern state in the URL: pg=1 and the parameters prefixed with p
const PATTERN_HASH = { pm: 'model', pDa: 'Da', pD2: 'D2', pra: 'ra', pr2: 'r2', pk: 'kappa', pba: 'ba', pb2: 'b2', pn: 'noise', pgc: 'globalCtl', pT: 'T', ps: 'seed', pz: 'size', pa: 'amount' };
export function patternHash(q) {
  q.set('pg', pattern.on ? '1' : '0');
  if (!pattern.on) return;
  q.set('pp', pattern.preset);
  for (const [short, key] of Object.entries(PATTERN_HASH)) q.set(short, key === 'model' ? pattern.model : String(+Number(pattern[key]).toFixed(4)));
  q.set('pi', pattern.insertion ? '1' : '0');
  q.set('pcb', pattern.base.slice(1));
  q.set('pcp', pattern.pigment.slice(1));
}

// Texture and canvas with the space–time record (row 0 = apex, like v = 0 on the mesh)
const patternPixels = new Uint8Array(PATTERN_WIDTH * PATTERN_ROWS * 4);
const patternTex = new THREE.DataTexture(patternPixels, PATTERN_WIDTH, PATTERN_ROWS, THREE.RGBAFormat);
export const patternCanvas = document.createElement('canvas');
const patternImage = new ImageData(new Uint8ClampedArray(patternPixels.buffer), PATTERN_WIDTH, PATTERN_ROWS);
const spacetime = $('spacetime');

export let patternValues = null;
let patternSecond = null; // inhibitor or substrate (rows × PROFILE_WIDTH), relative to its maximum
export let profileRow = null;    // moment chosen for the profile (null = the aperture)
const profileCanvas = $('profile');

/**
 * Turns the activator (0–1) into colour: pigment where it exceeds the threshold,
 * with a short smoothstep transition so edges are sharp but not jagged. The
 * pigment amount shifts the threshold.
 */
function colorize(values, base, pigment, amount, out) {
  const b = hexRgb(base);
  const p = hexRgb(pigment);
  const lo = 1 - amount - PIGMENT_EDGE;
  const span = 2 * PIGMENT_EDGE;
  for (let i = 0, k = 0; i < values.length; i++, k += 4) {
    let x = (values[i] - lo) / span;
    x = x < 0 ? 0 : x > 1 ? 1 : x;
    const t = x * x * (3 - 2 * x);
    out[k] = b[0] + (p[0] - b[0]) * t;
    out[k + 1] = b[1] + (p[1] - b[1]) * t;
    out[k + 2] = b[2] + (p[2] - b[2]) * t;
    out[k + 3] = 255;
  }
}

export function paintPattern() {
  if (!patternValues) return;
  colorize(patternValues, pattern.base, pattern.pigment, pattern.amount, patternPixels);
  patternVersion++;
  patternTex.needsUpdate = true;
  patternCanvas.getContext('2d').putImageData(patternImage, 0, 0);
  drawSpacetime();
  applyShellMaterial();
  updatePatternMessage();
}


export let stView = 'time';
let stRect = { ox: 0, oy: 0, dw: 1, dh: 1 }; // drawn area, in CSS pixels
let patternVersion = 0;
let unrolledCache = { key: '', canvas: null };

/** Proportions of the unrolled shell and relative size of the apex (g0). */
function unrolledGeometry() {
  const W = Math.max(state.W, 1.0001), N = state.turns;
  const k = Math.log(W) / (2 * Math.PI);
  const rc = (1 + state.D) / 2, a = (1 - state.D) / 2, b = state.S * a;
  // Aperture perimeter (Ramanujan's approximation) and advance of its centre per radian
  const P = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const v = rc * Math.sqrt(1 + k * k * (1 + state.T * state.T));
  const g0 = Math.exp(-2 * Math.PI * N * k);
  return { k, N, g0, aspect: (v * (1 - g0)) / (k * P) };
}

/** Record row → vertical position (0 = apex, 1 = aperture) in the current view. */
function rowToFrac(row) {
  if (stView === 'time') return (row + 0.5) / PATTERN_ROWS;
  const { k, N, g0 } = unrolledGeometry();
  const g = Math.exp(-2 * Math.PI * N * k * (1 - row / (PATTERN_ROWS - 1)));
  return (g - g0) / (1 - g0);
}

function fracToRow(f) {
  if (stView === 'time') return Math.round(f * (PATTERN_ROWS - 1));
  const { k, N, g0 } = unrolledGeometry();
  const g = g0 + f * (1 - g0);
  const row = Math.round((PATTERN_ROWS - 1) * (1 + Math.log(g) / (2 * Math.PI * N * k)));
  return Math.min(PATTERN_ROWS - 1, Math.max(0, row));
}

/** Image of the unrolled shell (the columns covered by each pixel are averaged). */
function unrolledImage(wpx, hpx) {
  const key = `${patternVersion}|${state.W}|${state.turns}|${wpx}|${hpx}`;
  if (unrolledCache.key === key) return unrolledCache.canvas;
  const { k, N, g0 } = unrolledGeometry();
  const img = new ImageData(wpx, hpx);
  const out = img.data;
  const src = patternPixels;
  for (let y = 0; y < hpx; y++) {
    const g = g0 + ((1 - g0) * (y + 0.5)) / hpx;
    const row = Math.min(PATTERN_ROWS - 1, Math.max(0, Math.round((PATTERN_ROWS - 1) * (1 + Math.log(g) / (2 * Math.PI * N * k)))));
    const rw = wpx * g;
    const x0 = (wpx - rw) / 2;
    const xs = Math.max(0, Math.floor(x0)), xe = Math.min(wpx, Math.ceil(x0 + rw));
    for (let x = xs; x < xe; x++) {
      const u0 = Math.max(0, (x - x0) / rw), u1 = Math.min(1, (x + 1 - x0) / rw);
      if (u1 <= u0) continue;
      const c0 = Math.floor(u0 * PATTERN_WIDTH);
      const c1 = Math.max(c0 + 1, Math.min(PATTERN_WIDTH, Math.ceil(u1 * PATTERN_WIDTH)));
      let r = 0, gg = 0, bb = 0;
      for (let c = c0; c < c1; c++) {
        const si = (row * PATTERN_WIDTH + c) * 4;
        r += src[si]; gg += src[si + 1]; bb += src[si + 2];
      }
      const n = c1 - c0, di = (y * wpx + x) * 4;
      out[di] = r / n; out[di + 1] = gg / n; out[di + 2] = bb / n;
      out[di + 3] = 255 * Math.min(1, (u1 - u0) * rw); // anti-aliased fan edge
    }
  }
  const c = document.createElement('canvas');
  c.width = wpx;
  c.height = hpx;
  c.getContext('2d').putImageData(img, 0, 0);
  unrolledCache = { key, canvas: c };
  return c;
}

export function drawSpacetime() {
  // Canvas height: fixed in the time view; true proportions in the unrolled view
  let aspect = 0;
  if (stView === 'shell') {
    aspect = unrolledGeometry().aspect;
    const cw = spacetime.clientWidth;
    if (cw) spacetime.style.height = `${Math.round(Math.min(440, Math.max(170, cw * aspect)))}px`;
  } else {
    spacetime.style.height = '';
  }
  const w = spacetime.clientWidth;
  const h = spacetime.clientHeight;
  // The profile is drawn even with the tab hidden: it is also shown on the 3D view
  if (!w || !h) return drawProfile();
  const dpr = Math.min(window.devicePixelRatio, 2);
  spacetime.width = Math.round(w * dpr);
  spacetime.height = Math.round(h * dpr);
  const ctx = spacetime.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (stView === 'shell') {
    const dw = Math.min(w - 8, (h - 8) / aspect), dh = dw * aspect;
    stRect = { ox: (w - dw) / 2, oy: (h - dh) / 2, dw, dh };
  } else {
    stRect = { ox: 0, oy: 0, dw: w, dh: h };
  }
  if (patternValues) {
    const { ox, oy, dw, dh } = stRect;
    if (stView === 'shell') ctx.drawImage(unrolledImage(Math.round(dw * dpr), Math.round(dh * dpr)), ox * dpr, oy * dpr);
    else ctx.drawImage(patternCanvas, 0, 0, spacetime.width, spacetime.height);
  }
  // In the advanced view the moment of the profile is marked
  if (patternValues && $('tab-pigment').dataset.pmode === 'advanced') {
    const row = profileRow ?? PATTERN_ROWS - 1;
    const { ox, oy, dw, dh } = stRect;
    const y = Math.min(spacetime.height - 1, (oy + rowToFrac(row) * dh) * dpr);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(ox * dpr, y);
    ctx.lineTo((ox + dw) * dpr, y);
    ctx.stroke();
  }
  drawProfile();
}

function setStView(view) {
  stView = view;
  document.querySelectorAll('#stView [data-stview]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.stview === view)));
  for (const [id, base] of [['stCapX', 'pig.axis.x'], ['stCapT', 'pig.axis.t'], ['stNote', 'pig.st.note']]) {
    const el = $(id);
    el.dataset.i18n = id === 'stNote' ? `${base}.${view}` : view === 'shell' ? `${base}.shell` : base;
    el.textContent = t(el.dataset.i18n);
  }
  drawSpacetime();
}
/**
 * Profile along the margin at one moment: the activator and the second substance
 * (inhibitor or substrate), each relative to its maximum, and the pigment threshold.
 */
export function drawProfile() {
  const row = profileRow ?? PATTERN_ROWS - 1;
  const label = `${t('pig.profile.time')} ${Math.round((100 * row) / (PATTERN_ROWS - 1))} %`;
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim();
  // The activator uses the text colour (readable with any pigment and theme); the pigmented area uses the pigment colour
  document.querySelectorAll('.lg-a').forEach((el) => el.style.setProperty('--lg', css.getPropertyValue('--text').trim()));
  document.querySelectorAll('.lg-b').forEach((el) => el.style.setProperty('--lg', accent));
  $('profileTime').textContent = label;
  drawProfileOn(profileCanvas, row, css);

  // Overlay version on the 3D view: only meaningful with a pattern applied
  if ($('ovProfile').hidden) return;
  const has = pattern.on && !!patternValues;
  $('ovProfileBody').hidden = !has;
  $('ovProfileEmpty').hidden = has;
  $('ovProfileTime').textContent = has ? label : '';
  $('ovProfileRow').value = Math.round((1000 * row) / (PATTERN_ROWS - 1));
  setFill($('ovProfileRow'));
  if (has) drawProfileOn($('profileOv'), row, css);
}

/** @param {object} [off] for off-screen drawing (PDF): { width, height, scale, colors } */
export function drawProfileOn(canvas, row, css, off) {
  const w = off ? off.width : canvas.clientWidth;
  const h = off ? off.height : canvas.clientHeight;
  if (!w || !h) return;
  const dpr = off ? off.scale : Math.min(window.devicePixelRatio, 2);
  const col = (name) => off?.colors?.[name] ?? css.getPropertyValue(name).trim();
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!patternValues || !patternSecond) return;

  const pad = 8;
  const x = (k) => (k / (PROFILE_WIDTH - 1)) * w;
  const y = (v) => pad + (1 - v) * (h - 2 * pad);
  const aAt = (k) => patternValues[row * PATTERN_WIDTH + Math.floor((k / PROFILE_WIDTH) * PATTERN_WIDTH)];
  const threshold = 1 - pattern.amount;

  // Pigmented area: activator above the threshold
  ctx.fillStyle = pattern.pigment;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(0, y(threshold));
  for (let k = 0; k < PROFILE_WIDTH; k++) ctx.lineTo(x(k), y(Math.max(threshold, aAt(k))));
  ctx.lineTo(w, y(threshold));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Pigment threshold
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = col('--muted');
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, y(threshold));
  ctx.lineTo(w, y(threshold));
  ctx.stroke();

  // Second substance (dashed) and activator
  const line = (get, color, width, dash) => {
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k < PROFILE_WIDTH; k++) ctx[k ? 'lineTo' : 'moveTo'](x(k), y(get(k)));
    ctx.stroke();
  };
  line((k) => patternSecond[row * PROFILE_WIDTH + k], col('--accent'), 1.6, [5, 3]);
  line(aAt, col('--text'), 1.8, []);
  ctx.setLineDash([]);
}
// Choose the moment of the profile on the space–time record (advanced view)
function pickProfileRow(e) {
  if ($('tab-pigment').dataset.pmode !== 'advanced' || !patternValues) return;
  const r = spacetime.getBoundingClientRect();
  const f = Math.min(1, Math.max(0, (e.clientY - r.top - stRect.oy) / stRect.dh));
  profileRow = fracToRow(f);
  drawSpacetime();
}
/** If the current values form no pattern, explain it instead of showing a blank shell. */
export function updatePatternMessage() {
  const msg = $('patternMsg');
  msg.hidden = patternState === 'pattern';
  if (!msg.hidden) msg.textContent = t(`pig.state.${patternState}`);
}

/** Solid colour or pattern, depending on the chosen option. */
export function applyShellMaterial() {
  const withPattern = pattern.on && !!patternValues;
  solidMat.map = withPattern ? patternTex : null;
  solidMat.color.set(withPattern ? '#ffffff' : $('shellColor').value);
  solidMat.vertexColors = !withPattern && $('bands').checked;
  solidMat.needsUpdate = true;
  // The inside, lighter than the background colour of the outside
  innerMat.color.set(withPattern ? pattern.base : $('shellColor').value).lerp(new THREE.Color('#ffffff'), 0.55);
  const swatch = document.querySelector('.pattern-card[data-pattern="none"] .swatch');
  if (swatch) swatch.style.background = $('shellColor').value;
}

// Computed in a Web Worker, or on the main thread if workers are unavailable.
// A slider waits for the running computation and then asks for the latest values
// (schedulePattern); any other change (a preset, a seed) discards the busy worker.
let patternWorker = null;
let workerBusy = false;
let workerFailed = false;
const workerUrl = new URL('../workers/pigment-worker.js', import.meta.url);

function startWorker() {
  try {
    patternWorker = new Worker(workerUrl, { type: 'module' });
    patternWorker.onmessage = (e) => {
      workerBusy = false;
      onPatternResult(e.data);
      // A slider moved while this one was computed: compute the latest values now
      if (patternPending) {
        patternPending = false;
        computePattern();
      }
    };
    patternWorker.onerror = () => {
      patternWorker = null;
      workerBusy = false;
      workerFailed = true;
      computePattern();
    };
  } catch {
    patternWorker = null;
    workerFailed = true;
  }
}
let patternJob = 0;
let patternTimer = 0;
let patternGeomKey = '';

/** Simulation parameters from the state (global control only exists with a substrate). */
function simParams(p) {
  const { model, Da, D2, ra, r2, kappa, ba, b2, noise, globalCtl, T, seed, insertion } = p;
  return { model, Da, D2, ra, r2, kappa, ba, b2, noise, globalCtl: model === 'AS' ? globalCtl : 0, T, seed, insertion };
}

export function computePattern() {
  const id = ++patternJob;
  patternPending = false;
  const p = simParams(pattern);
  // The pattern size is the number of margin cells (fewer cells, larger elements)
  const g = { W: state.W, turns: state.turns, rows: PATTERN_ROWS, width: PATTERN_WIDTH, nMax: Math.round(PATTERN_CELLS / pattern.size) };
  patternGeomKey = `${state.W}|${state.turns}`;
  $('patternStatus').hidden = false;
  if (workerBusy && patternWorker) {
    patternWorker.terminate();
    startWorker();
  }
  if (patternWorker) {
    workerBusy = true;
    patternWorker.postMessage({ id, p, g });
  } else if (workerFailed) {
    setTimeout(() => {
      const r = simulatePattern(p, g);
      onPatternResult({ id, v: r.values, second: r.second, state: r.state });
    });
  }
}

function onPatternResult({ id, v, second, state: simState }) {
  if (id !== patternJob) return; // a stale computation arrived
  patternValues = v;
  patternSecond = second;
  patternState = simState;
  $('patternStatus').hidden = true;
  paintPattern();
}

// While a slider is dragged the pattern follows it: a new computation starts
// as soon as the previous one finishes, always with the latest values
let patternPending = false;
function requestPattern() {
  patternTimer = 0;
  if (!pattern.on) return;
  if (workerBusy && patternWorker) patternPending = true;
  else computePattern();
}

export function schedulePattern() {
  if (pattern.on && !patternTimer) patternTimer = setTimeout(requestPattern, 40);
  writeHash();
  if (formulaView === 'meinhardt') scheduleFormula();
}

// With cell insertion the pattern depends on the size of each whorl (W and N)
export function onGeometryForPattern() {
  if (pattern.insertion && pattern.on && patternGeomKey !== `${state.W}|${state.turns}`) schedulePattern();
}

// Controls. The intuitive quantities (size, time, irregularity, amount) are in
// both views; the model constants only in the advanced view.
const sub = (x, y) => `${x}<sub>${y}</sub>`;
const second = () => (pattern.model === 'AS' ? 'b' : 'h');
export const PIG_SIMPLE = [
  { key: 'size', id: 'pSize', i18n: 'pSize', log: true, min: 0.5, max: 4, digits: 2 },
  { key: 'T', id: 'pT', i18n: 'pT', log: true, min: 500, max: 12000, format: (v) => v.toFixed(0) },
  { key: 'noise', id: 'pnoise', i18n: 'pNoise', min: 0, max: 0.5, step: 0.01, digits: 2 },
  { key: 'amount', id: 'pAmount', i18n: 'pAmount', min: 0.15, max: 0.85, step: 0.01, digits: 2 },
];

// Model constants: logarithmic scale, with the leftmost position = 0 where it makes sense
const PIG_ADVANCED = [
  { key: 'Da', id: 'pDa', sym: sub('D', 'a'), log: true, zero: true, min: 0.0005, max: 0.5, format: sig },
  { key: 'D2', id: 'pD2', sym: () => sub('D', second()), i18n: () => `D2.${pattern.model}`, log: true, zero: true, min: 0.001, max: 30, format: sig },
  { key: 'ra', id: 'pra', sym: sub('r', 'a'), log: true, min: 0.002, max: 0.3, format: sig },
  { key: 'r2', id: 'pr2', sym: () => sub('r', second()), i18n: () => `r2.${pattern.model}`, log: true, zero: true, min: 0.0005, max: 0.3, format: sig },
  { key: 'kappa', id: 'pkappa', sym: 'κ', min: 0, max: 2, step: 0.01, digits: 2 },
  { key: 'ba', id: 'pba', sym: sub('b', 'a'), log: true, zero: true, min: 0.0001, max: 0.1, format: sig },
  { key: 'b2', id: 'pb2', sym: () => sub('b', second()), i18n: () => `b2.${pattern.model}`, log: true, zero: true, min: 0.0005, max: 0.1, format: sig },
  { key: 'globalCtl', id: 'pglobal', sym: 'g', log: true, zero: true, min: 0.0005, max: 0.05, format: sig },
];
const PIG_PARAMS = [...PIG_SIMPLE, ...PIG_ADVANCED];

export const pigControls = {};
// Gallery: solid colour and one preset per pattern type, with its real thumbnail
const gallery = $('patternGallery');
const GALLERY = ['none', ...Object.keys(PATTERN_PRESETS)];

export function buildGallery() {
  for (const key of GALLERY) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'pattern-card';
    card.dataset.pattern = key;
    card.setAttribute('role', 'radio');
    if (key === 'none') {
      card.innerHTML = '<div class="swatch"></div><span></span>';
    } else {
      const c = document.createElement('canvas');
      c.width = THUMB.width;
      c.height = THUMB.rows;
      card.append(c, document.createElement('span'));
    }
    card.addEventListener('click', () => selectPattern(key));
    gallery.append(card);
  }
  updateGalleryLabels();
}

export function updateGalleryLabels() {
  gallery.querySelectorAll('.pattern-card').forEach((card) => {
    const key = card.dataset.pattern;
    card.querySelector('span').textContent = key === 'none' ? t('pig.none') : tPattern(key);
  });
}

function updateGallerySelection() {
  const selected = pattern.on ? pattern.preset : 'none';
  gallery.querySelectorAll('.pattern-card').forEach((card) => card.setAttribute('aria-checked', String(card.dataset.pattern === selected)));
}

// Thumbnails: computed once, in their own worker so they do not interfere with the main one
let thumbsDone = false;
export function computeThumbs() {
  if (thumbsDone) return;
  thumbsDone = true;
  const jobs = Object.entries(PATTERN_PRESETS).map(([key, preset]) => {
    const p = { ...pickPattern(preset), seed: 7 };
    return { id: key, p: simParams(p), g: { W: 2.4, turns: 4.5, ...THUMB, nMax: Math.round(PATTERN_CELLS / p.size) }, preset: p };
  });
  const draw = (key, values) => {
    const job = jobs.find((j) => j.id === key);
    const canvas = gallery.querySelector(`.pattern-card[data-pattern="${key}"] canvas`);
    const img = new ImageData(THUMB.width, THUMB.rows);
    colorize(values, job.preset.base, job.preset.pigment, job.preset.amount, img.data);
    canvas.getContext('2d').putImageData(img, 0, 0);
  };
  const onMainThread = () => jobs.forEach(({ id, p, g }) => setTimeout(() => draw(id, simulatePattern(p, g).values)));
  try {
    const w = new Worker(workerUrl, { type: 'module' });
    let left = jobs.length;
    w.onmessage = (e) => {
      draw(e.data.id, e.data.v);
      if (--left === 0) w.terminate();
    };
    // A worker that cannot load (or fails) does not leave the gallery blank
    w.onerror = () => {
      w.terminate();
      onMainThread();
    };
    jobs.forEach(({ id, p, g }) => w.postMessage({ id, p, g }));
  } catch {
    onMainThread();
  }
}

export function markPatternCustom() {
  pattern.preset = 'custom';
  updateGallerySelection();
}

/** Colour is seen on the surface: lines are removed and the mode switches to solid. */
export function ensureSurfaceMode() {
  if (state.mode !== 'solid') {
    state.mode = 'solid';
    applyMode();
    writeHash();
  }
}

export function setPatternOn(on) {
  pattern.on = on;
  $('pigBody').hidden = !on;
  if (on) {
    ensureSurfaceMode();
    if (!patternValues) computePattern();
  }
  applyShellMaterial();
  updateGallerySelection();
  writeHash();
  drawProfile();
}

export function selectPattern(key) {
  if (key === 'none') return setPatternOn(false);
  pattern.preset = key;
  Object.assign(pattern, pickPattern(PATTERN_PRESETS[key]));
  syncPatternControls();
  setPatternOn(true);
  computePattern();
}

/** Pushes the pattern state to all controls. */
export function syncPatternControls() {
  PIG_PARAMS.forEach((d) => pigControls[d.id].set(pattern[d.key]));
  Object.values(pigControls).forEach((c) => c.relabel());
  pigControls.pglobal.el.hidden = pattern.model !== 'AS'; // global control only exists with a substrate
  $('patternModel').value = pattern.model;
  $('patternInsertion').checked = pattern.insertion;
  $('patternSeed').value = pattern.seed;
  $('pigBase').value = pattern.base;
  $('pigColor').value = pattern.pigment;
  $('pigBody').hidden = !pattern.on;
  setSecondLabel();
  updateGallerySelection();
}

export function setSecondLabel() {
  const label = t(pattern.model === 'AS' ? 'pig.profile.b' : 'pig.profile.h');
  $('profileSecond').textContent = label;
  $('ovProfileSecond').textContent = label;
}

// Simple or advanced view: the advanced one also shows the model constants
function setPigMode(mode) {
  $('tab-pigment').dataset.pmode = mode;
  document.querySelectorAll('#pigMode [data-pmode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pmode === mode)));
  drawSpacetime(); // the moment marker and the profile only exist in the advanced view
}

/** Connects this part of the interface to the rest of the app. */
export function initPigment(ctx) {
  ({ applyMode, capturePointer, controlsByKey, createParam, setFill } = ctx);
  if (fromHash.get('pg') === '1') {
    pattern.on = true;
    pattern.preset = PATTERN_PRESETS[fromHash.get('pp')] ? fromHash.get('pp') : 'custom';
    // A named pattern starts from its own constants; the link may then change some of them
    if (PATTERN_PRESETS[pattern.preset]) Object.assign(pattern, pickPattern(PATTERN_PRESETS[pattern.preset]));
    for (const [short, key] of Object.entries(PATTERN_HASH)) {
      if (!fromHash.has(short)) continue;
      if (key === 'model') pattern.model = fromHash.get(short) === 'AS' ? 'AS' : 'AI';
      else if (Number.isFinite(parseFloat(fromHash.get(short)))) pattern[key] = parseFloat(fromHash.get(short));
    }
    if (fromHash.has('pi')) pattern.insertion = fromHash.get('pi') === '1';
    for (const [short, key] of [['pcb', 'base'], ['pcp', 'pigment']]) {
      if (/^[0-9a-f]{6}$/i.test(fromHash.get(short) || '')) pattern[key] = `#${fromHash.get(short)}`;
    }
  }

  patternTex.colorSpace = THREE.SRGBColorSpace;
  patternTex.wrapS = THREE.RepeatWrapping;
  patternTex.wrapT = THREE.ClampToEdgeWrapping;
  patternTex.magFilter = THREE.LinearFilter;
  patternTex.minFilter = THREE.LinearMipmapLinearFilter;
  patternTex.generateMipmaps = true;
  patternTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  patternCanvas.width = PATTERN_WIDTH;
  patternCanvas.height = PATTERN_ROWS;
  document.querySelectorAll('#stView [data-stview]').forEach((b) => b.addEventListener('click', () => setStView(b.dataset.stview)));
  new ResizeObserver(drawSpacetime).observe(spacetime);

  new ResizeObserver(drawProfile).observe(profileCanvas);

  // The moment can also be chosen with the slider of the overlaid profile
  $('ovProfileRow').addEventListener('input', (e) => {
    profileRow = Math.round((e.target.value / 1000) * (PATTERN_ROWS - 1));
    drawSpacetime();
  });

  spacetime.addEventListener('pointerdown', (e) => {
    capturePointer(spacetime, e);
    pickProfileRow(e);
  });
  spacetime.addEventListener('pointermove', (e) => {
    if (spacetime.hasPointerCapture(e.pointerId)) pickProfileRow(e);
  });

  startWorker();

  for (const [defs, container] of [[PIG_SIMPLE, 'pig-simple'], [PIG_ADVANCED, 'pig-params']]) {
    defs.forEach((d) => {
      createParam(d, $(container), {
        compact: true,
        target: pattern,
        onChange: (key) => {
          if (key === 'amount') {
            paintPattern(); // only the colouring changes, not the simulation
            writeHash();
            return;
          }
          markPatternCustom();
          schedulePattern();
        },
      });
      pigControls[d.id] = controlsByKey[d.id];
    });
  }

  document.querySelectorAll('#pigMode [data-pmode]').forEach((b) => b.addEventListener('click', () => setPigMode(b.dataset.pmode)));

  // Changing the model loads the constants of its reference preset: those of the
  // other model make no sense here (e.g. without substrate production there is no pattern)
  $('patternModel').addEventListener('change', (e) => {
    const { base, pigment, size, amount } = pattern;
    Object.assign(pattern, pickPattern(MODEL_DEFAULTS[e.target.value]), { base, pigment, size, amount });
    syncPatternControls();
    markPatternCustom();
    schedulePattern();
  });

  $('patternInsertion').addEventListener('change', (e) => {
    pattern.insertion = e.target.checked;
    markPatternCustom();
    schedulePattern();
  });

  $('patternSeed').addEventListener('change', (e) => {
    const v = Math.round(Math.min(99999, Math.max(1, parseFloat(e.target.value) || 1)));
    pattern.seed = v;
    e.target.value = v;
    schedulePattern();
  });

  $('newSeed').addEventListener('click', () => {
    pattern.seed = 1 + Math.floor(Math.random() * 99999);
    $('patternSeed').value = pattern.seed;
    schedulePattern();
  });

  for (const [id, key] of [['pigBase', 'base'], ['pigColor', 'pigment']]) {
    $(id).addEventListener('input', (e) => {
      pattern[key] = e.target.value;
      paintPattern(); // changing the colour does not require simulating again
      writeHash();
    });
  }

  $('pigTheory').addEventListener('click', () => openInfo('meinhardt'));
  $('pigClear').addEventListener('click', () => setPatternOn(false));

  $('savePattern').addEventListener('click', () => {
    if (patternValues) downloadImage(patternCanvas, `meinhardt_${pattern.preset}_seed${pattern.seed}`, $('savePatternFormat').value);
  });
  // The same format choice here and in the export window
  const formats = [$('savePatternFormat'), $('exPatternFormat')];
  formats.forEach((el) => el.addEventListener('change', () => formats.forEach((o) => (o.value = el.value))));

}
