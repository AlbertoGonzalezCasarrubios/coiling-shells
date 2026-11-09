/**
 * State of the shell and of its view: Raup's parameters, the ornament, the
 * render settings and the orientation, the definitions of their controls, and
 * the shareable address (#W=2.4&D=0.08…, with the pattern and the appearance)
 * that is read on load and rewritten on every change. Also the small wrapper
 * around localStorage.
 */
import { PRESETS, DEFAULT_PRESET } from '../model/presets.js';
import { hasOrnament, ORNAMENT_DEFAULTS } from '../model/ornament.js';
import { formatW } from './util.js';

// ---------------------------------------------------------------------------
// Control definitions (the texts live in i18n/)
// ---------------------------------------------------------------------------


export const RAUP_PARAMS = [
  // Linear scale 1–10 (gastropods, cephalopods) or logarithmic 1–10⁴ (bivalves)
  { key: 'W', sym: 'W', min: 1, max: 10000, linMax: 10, step: 0.01, logToggle: true, format: formatW },
  { key: 'D', sym: 'D', min: 0, max: 0.9, step: 0.005, digits: 3 },
  { key: 'T', sym: 'T', min: 0, max: 10, step: 0.05, digits: 2 },
  { key: 'S', sym: 'S', min: 0.5, max: 2, step: 0.01, digits: 2 },
];

export const GEO_PARAMS = [
  { key: 'turns', sym: 'N', min: 0.25, max: 20, step: 0.25, digits: 2 },
];

export const VIS_PARAMS = [
  { key: 'spiralLines', min: 0, max: 48, step: 1, digits: 0 },
  { key: 'ringsPerTurn', min: 0, max: 72, step: 1, digits: 0 },
  { key: 'lineWidth', min: 0.5, max: 4, step: 0.1, digits: 1 },
  { key: 'lineOpacity', min: 0.1, max: 1, step: 0.05, digits: 2 },
];

// Ornament (relief): axial ribs along the growth direction, spiral cords around
// the margin, a keel, spines, and a change of strength with growth (ornament.js)
export const ORN_PARAMS = [
  { key: 'ribN', min: 0, max: 60, step: 1, digits: 0, box: 'rib' },
  { key: 'ribH', min: 0, max: 0.4, step: 0.01, digits: 2, box: 'rib' },
  { key: 'ribW', min: 0.05, max: 1, step: 0.01, digits: 2, box: 'ribAdv' },
  { key: 'ribSkew', min: -0.8, max: 0.8, step: 0.05, digits: 2, box: 'ribAdv' },
  { key: 'cordN', min: 0, max: 48, step: 1, digits: 0, box: 'cord' },
  { key: 'cordH', min: 0, max: 0.4, step: 0.01, digits: 2, box: 'cord' },
  { key: 'cordW', min: 0.05, max: 1, step: 0.01, digits: 2, box: 'cordAdv' },
  { key: 'keelH', min: 0, max: 0.4, step: 0.01, digits: 2, box: 'keel' },
  { key: 'keelW', min: 0.02, max: 0.3, step: 0.01, digits: 2, box: 'keel' },
  { key: 'keelPos', min: -0.5, max: 0.5, step: 0.01, digits: 2, box: 'keel' },
  { key: 'spineN', min: 0, max: 40, step: 1, digits: 0, box: 'spine' },
  { key: 'spineH', min: 0, max: 1.5, step: 0.01, digits: 2, box: 'spine' },
  { key: 'spineW', min: 0.1, max: 1, step: 0.01, digits: 2, box: 'spineAdv' },
  { key: 'spinePos', min: -0.5, max: 0.5, step: 0.01, digits: 2, box: 'spineAdv' },
  { key: 'ornGrowth', min: -1, max: 1, step: 0.05, digits: 2, box: 'growth' },
];
export const ORN_KEYS = Object.keys(ORNAMENT_DEFAULTS);
export const ORN_BOOLS = ['nodules', 'spineBoth'];
export const pickOrnament = (p) => Object.fromEntries(ORN_KEYS.map((k) => [k, p[k]]));

export const QUALITY = {
  low: { segPerTurn: 48, segPhi: 24 },
  medium: { segPerTurn: 96, segPhi: 48 },
  high: { segPerTurn: 160, segPhi: 72 },
};

export const SHAPE_KEYS = ['W', 'D', 'T', 'S', 'turns', 'hand', 'mirror'];
export const SHELL_SIZE = 4;
export const MODES = ['lines', 'solid', 'both'];

export const state = {
  ...pickShape(PRESETS[DEFAULT_PRESET]),
  grow: 1,
  quality: 'medium',
  mode: 'lines',
  spiralLines: 16,
  ringsPerTurn: 24,
  lineWidth: 1.2,
  lineOpacity: 0.9,
  axisWidth: 1,
  ...ORNAMENT_DEFAULTS,
  orient: 'vertical',
};

export function pickShape(p) {
  return Object.fromEntries(SHAPE_KEYS.map((k) => [k, p[k]]));
}

// ---------------------------------------------------------------------------
// Shareable state in the URL: #W=2.4&D=0.08&T=1.6&S=1&N=4.5&h=1&v=0&m=lines
// ---------------------------------------------------------------------------

export const HASH_KEYS = { W: 'W', D: 'D', T: 'T', S: 'S', N: 'turns', h: 'hand' };

export const fromHash = new URLSearchParams(location.hash.slice(1));
export const hasHashShape = [...fromHash.keys()].some((k) => k in HASH_KEYS);
for (const [short, key] of Object.entries(HASH_KEYS)) {
  const v = parseFloat(fromHash.get(short));
  if (Number.isFinite(v)) state[key] = key === 'hand' ? Math.sign(v) || 1 : v;
}
if (fromHash.has('v')) state.mirror = fromHash.get('v') === '1';
if (MODES.includes(fromHash.get('m'))) state.mode = fromHash.get('m');
export const ORN_HASH = {
  rn: 'ribN', rh: 'ribH', rw: 'ribW', rk: 'ribSkew', cn: 'cordN', ch: 'cordH', cw: 'cordW',
  kh: 'keelH', kw: 'keelW', kp: 'keelPos', sn: 'spineN', sh: 'spineH', sw: 'spineW', sp: 'spinePos', og: 'ornGrowth',
};
for (const [short, key] of Object.entries(ORN_HASH)) {
  const v = parseFloat(fromHash.get(short));
  if (Number.isFinite(v)) state[key] = v;
}
if (fromHash.has('nd')) state.nodules = fromHash.get('nd') === '1';
if (fromHash.has('sb')) state.spineBoth = fromHash.get('sb') === '1';
export const ORIENT_HASH = { v: 'vertical', h: 'horizontal', f: 'free' };
if (ORIENT_HASH[fromHash.get('o')]) state.orient = ORIENT_HASH[fromHash.get('o')];

// Small wrapper around localStorage: it can be unavailable (private mode, blocked
// site data), and then the app simply does not remember anything
export const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* not remembered */ }
  },
};
export const LANG_KEY = 'coiling-shells.lang';
export const WELCOME_KEY = 'coiling-shells.welcome';


let hashTimer = 0;
// Other parts add to the address (the pattern, the appearance) or listen to every change (undo)
const hooks = { patternHash: () => {}, lookHash: () => {}, noteChange: () => {} };
export function setHashHooks(h) {
  Object.assign(hooks, h);
}

/** Every change of the shell goes through here: the address is updated shortly after. */
export function writeHash() {
  hooks.noteChange();
  clearTimeout(hashTimer);
  hashTimer = setTimeout(writeHashNow, 250);
}

export function writeHashNow() {
  clearTimeout(hashTimer);
  const q = new URLSearchParams();
  for (const [short, key] of Object.entries(HASH_KEYS)) q.set(short, String(+Number(state[key]).toFixed(3)));
  q.set('v', state.mirror ? '1' : '0');
  q.set('m', state.mode);
  if (hasOrnament(state)) {
    for (const [short, key] of Object.entries(ORN_HASH)) {
      if (state[key] !== ORNAMENT_DEFAULTS[key]) q.set(short, String(+Number(state[key]).toFixed(3)));
    }
    if (state.nodules) q.set('nd', '1');
    if (state.spineBoth) q.set('sb', '1');
  }
  if (state.orient !== 'vertical') q.set('o', state.orient[0]);
  hooks.patternHash(q);
  hooks.lookHash(q);
  history.replaceState(null, '', `#${q}`);
}
