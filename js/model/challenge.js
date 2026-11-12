/**
 * The "match the shell" challenge: how alike two shells look, and which
 * parameter to change to get closer.
 *
 * Likeness is measured on silhouettes, compared the way the eye compares them.
 * Both shells are built with Raup's model, projected along the three axes
 * (front, side and top) and filled into a grid. Each silhouette is then centred
 * on its centre of mass and scaled by its own size (radius of gyration), so an
 * extra tiny whorl at the apex does not rescale the whole shell, and blurred a
 * little, so a small shift of the outline is a small difference rather than a
 * failure. The overlap of two silhouettes is the sum of their minimum over the
 * sum of their maximum (a soft intersection over union); the side and top views
 * are also compared mirrored, because a shell and its mirror image look alike.
 * The score maps the mean overlap to a percentage with a calibration measured on
 * real shells (see tests/challenge.test.mjs), and a wrong coiling direction
 * costs a fifth of it. Hints point at the parameter furthest from the target.
 *
 * Pure module (no Three.js, no DOM): it runs in the browser and in Node.
 */
import { buildShell } from './raup.js';
import { ORNAMENT_DEFAULTS, ORNAMENT_NEEDS, ornamentResolution } from './ornament.js';
import { PRESETS, ORNAMENT_PRESETS, PATTERN_PRESETS } from './presets.js';

const SIZE = 4;
/** Coordinates kept by each projection: front (x, y), side (z, y), top (x, z). */
const VIEWS = [
  [0, 1],
  [2, 1],
  [0, 2],
];
/** Side of the grid on which silhouettes are filled, and blur radius in cells. */
export const GRID = 128;
const BLUR = 2;
/** Radius of gyration of a normalised silhouette, as a fraction of the grid. */
const SPREAD = 0.2;

/** Shape parameters of the challenge, and the ornament ones of its last level. */
export const SHAPE_KEYS = ['W', 'D', 'T', 'S', 'turns', 'hand'];
export const ORNAMENT_KEYS = ['ribN', 'ribH', 'cordN', 'cordH', 'spineN', 'spineH'];
/** The colour level: the kind of pattern and the simple controls of the pigment tab. */
export const COLOUR_KEYS = ['patternPreset', 'patternSize', 'patternT', 'patternNoise', 'patternAmount', 'patternBase', 'patternPigment'];

/**
 * A shell of the challenge: Raup's shape, the relief and, in the colour level,
 * the pattern (a preset of presets.js and its simple controls).
 * @typedef {import('./raup.js').ShellShape & import('./ornament.js').OrnamentParams & {
 *   patternPreset?: string, patternSize?: number, patternT?: number, patternNoise?: number, patternAmount?: number,
 *   patternBase?: string, patternPigment?: string }} ChallengeShell
 */

/**
 * Silhouettes of a shell along the three axes, normalised and blurred.
 * @param {ChallengeShell} p
 * @returns {Float32Array[]} one GRID × GRID image per view, values 0–1
 */
export function silhouettes(p) {
  return masks(p, GRID).map((m) => blur(normalise(m, GRID), GRID, BLUR));
}

/**
 * Raw silhouettes: the shell at its normalised size, filled into a grid.
 * @param {ChallengeShell} p
 * @param {number} res side of the grid
 * @returns {Uint8Array[]} one res × res mask per view (1 = shell)
 */
export function masks(p, res) {
  const orn = ornamentResolution(p);
  const boost = Math.max(1, Math.log10(Math.max(p.W, 1)));
  const shell = buildShell({
    ...ORNAMENT_DEFAULTS,
    ...p,
    grow: 1,
    segPerTurn: Math.min(240, Math.round(Math.max(48, orn.perTurn) * boost)),
    segPhi: Math.min(96, Math.max(24, orn.phi)),
    spiralLines: 0,
    ringsPerTurn: 0,
    size: SIZE,
  });
  return VIEWS.map(([a, b]) => rasterize(shell.positions, shell.indices, a, b, res));
}

/**
 * Fills the triangles of a mesh, projected on two of its coordinates, into a grid.
 * A triangle smaller than a cell marks the cell it falls in, so thin parts are not lost.
 */
function rasterize(P, I, a, b, res) {
  const mask = new Uint8Array(res * res);
  const gx = (k) => (P[3 * k + a] / SIZE + 0.5) * res;
  const gy = (k) => (0.5 - P[3 * k + b] / SIZE) * res;
  for (let t = 0; t < I.length; t += 3) {
    const x0 = gx(I[t]),
      y0 = gy(I[t]);
    const x1 = gx(I[t + 1]),
      y1 = gy(I[t + 1]);
    const x2 = gx(I[t + 2]),
      y2 = gy(I[t + 2]);
    const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    const i0 = Math.max(0, Math.floor(Math.min(x0, x1, x2))),
      i1 = Math.min(res - 1, Math.floor(Math.max(x0, x1, x2)));
    const j0 = Math.max(0, Math.floor(Math.min(y0, y1, y2))),
      j1 = Math.min(res - 1, Math.floor(Math.max(y0, y1, y2)));
    if (i0 > i1 || j0 > j1) continue;
    if ((i0 === i1 && j0 === j1) || Math.abs(area) < 1e-9) {
      mask[j0 * res + i0] = 1;
      continue;
    }
    for (let j = j0; j <= j1; j++) {
      const y = j + 0.5;
      for (let i = i0; i <= i1; i++) {
        const x = i + 0.5;
        const w0 = (x1 - x) * (y2 - y) - (x2 - x) * (y1 - y);
        const w1 = (x2 - x) * (y0 - y) - (x0 - x) * (y2 - y);
        const w2 = (x0 - x) * (y1 - y) - (x1 - x) * (y0 - y);
        if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) mask[j * res + i] = 1;
      }
    }
  }
  return mask;
}

/** Centres a mask on its centre of mass and scales it so its radius of gyration is SPREAD·res. */
function normalise(m, res) {
  let n = 0,
    cx = 0,
    cy = 0;
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) if (m[j * res + i]) (n++, (cx += i), (cy += j));
  const out = new Float32Array(res * res);
  if (!n) return out;
  cx /= n;
  cy /= n;
  let rg = 0;
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) if (m[j * res + i]) rg += (i - cx) ** 2 + (j - cy) ** 2;
  const k = Math.sqrt(rg / n) / (SPREAD * res) || 1;
  for (let j = 0; j < res; j++)
    for (let i = 0; i < res; i++) {
      const x = Math.round(cx + (i - res / 2) * k),
        y = Math.round(cy + (j - res / 2) * k);
      if (x >= 0 && x < res && y >= 0 && y < res) out[j * res + i] = m[y * res + x];
    }
  return out;
}

/** Box blur of radius r, done along rows and then along columns. */
function blur(m, res, r) {
  const tmp = new Float32Array(res * res),
    out = new Float32Array(res * res);
  const at = (v) => Math.min(res - 1, Math.max(0, v));
  for (let j = 0; j < res; j++)
    for (let i = 0; i < res; i++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += m[j * res + at(i + d)];
      tmp[j * res + i] = s / (2 * r + 1);
    }
  for (let j = 0; j < res; j++)
    for (let i = 0; i < res; i++) {
      let s = 0;
      for (let d = -r; d <= r; d++) s += tmp[at(j + d) * res + i];
      out[j * res + i] = s / (2 * r + 1);
    }
  return out;
}

/** Soft intersection over union of two images; with `flip`, also of the first one mirrored. */
function softOverlap(a, b, res, flip) {
  const one = (get) => {
    let lo = 0,
      hi = 0;
    for (let j = 0; j < res; j++)
      for (let i = 0; i < res; i++) {
        const x = get(i, j),
          y = b[j * res + i];
        lo += Math.min(x, y);
        hi += Math.max(x, y);
      }
    return hi ? lo / hi : 1;
  };
  const direct = one((i, j) => a[j * res + i]);
  if (!flip) return direct;
  const mirrored = flip === 'h' ? one((i, j) => a[j * res + res - 1 - i]) : one((i, j) => a[(res - 1 - j) * res + i]);
  return Math.max(direct, mirrored);
}

/**
 * Mean overlap of two sets of silhouettes, 0–1. The front view is compared as it
 * is; the side and top views also mirrored (left–right and top–bottom), where a
 * shell and its mirror image differ.
 * @param {Float32Array[]} A
 * @param {Float32Array[]} B
 */
export function overlap(A, B) {
  const flips = [null, 'h', 'v'];
  let sum = 0;
  for (let v = 0; v < A.length; v++) sum += softOverlap(A[v], B[v], GRID, flips[v]);
  return sum / A.length;
}

/**
 * From overlap to score: 0 at the overlap `floor`, 100 for identical shells,
 * with a concave curve in between. Calibrated on real shells so that the score
 * agrees with the eye: variants with every shape parameter a little off (W ± 2.5 %,
 * D ± 0.015, T ± 4 %, S ± 3 %, a quarter of a whorl) score about 93 (80–99), and
 * different shells score 0, except pairs that do look alike (Peringia and Trochus,
 * Planorbis and Nautilus: below 60). See tests/challenge.test.mjs.
 */
export const CALIBRATION = { floor: 0.76, power: 0.45 };

/**
 * Score of a guess against a target, 0–100.
 * @param {number} ov mean overlap of their silhouettes
 */
export function scoreFromOverlap(ov) {
  const x = Math.max(0, (ov - CALIBRATION.floor) / (1 - CALIBRATION.floor));
  return Math.round(100 * x ** CALIBRATION.power);
}

/** Factor applied to the score when the coiling direction is wrong (the hint asks to flip it). */
export const WRONG_HAND = 0.8;

/**
 * How far a parameter is from the target, in a scale of its own: 1 is a clear,
 * visible difference. Below `tol` the parameter counts as right. W is compared
 * on a logarithmic scale, because a 10 % change matters equally at any W.
 */
const SCALE = {
  W: { d: (a, b) => Math.abs(Math.log(a / b)) / Math.log(1.3), tol: 0.01 / Math.log(1.3) },
  D: { d: (a, b) => Math.abs(a - b) / 0.1, tol: 0.1 },
  T: { d: (a, b) => Math.abs(a - b) / 0.8, tol: 0.03 / 0.8 },
  S: { d: (a, b) => Math.abs(a - b) / 0.25, tol: 0.12 },
  turns: { d: (a, b) => Math.abs(a - b) / 2, tol: 0.075 },
  hand: { d: (a, b) => (a === b ? 0 : 3), tol: 0.5 },
  ribN: { d: (a, b) => Math.abs(a - b) / 4, tol: 0.2 },
  ribH: { d: (a, b) => Math.abs(a - b) / 0.06, tol: 0.2 },
  cordN: { d: (a, b) => Math.abs(a - b) / 3, tol: 0.2 },
  cordH: { d: (a, b) => Math.abs(a - b) / 0.04, tol: 0.25 },
  spineN: { d: (a, b) => Math.abs(a - b) / 3, tol: 0.2 },
  spineH: { d: (a, b) => Math.abs(a - b) / 0.2, tol: 0.25 },
  // The kind of pattern comes first: its settings and colours mean little on another kind
  patternPreset: { d: (a, b) => (a === b ? 0 : 100), tol: 0.5 },
  patternSize: { d: (a, b) => Math.abs(Math.log(a / b)) / Math.log(1.4), tol: 0.02 / Math.log(1.4) },
  patternT: { d: (a, b) => Math.abs(Math.log(a / b)) / Math.log(1.4), tol: 0.015 / Math.log(1.4) },
  patternNoise: { d: (a, b) => Math.abs(a - b) / 0.1, tol: 0.06 },
  patternAmount: { d: (a, b) => Math.abs(a - b) / 0.12, tol: 0.05 },
  // Colours: distance in RGB, as a fraction of the whole range; matched by eye, so the tolerance is wider
  patternBase: { d: (a, b) => colourDistance(a, b) / 0.12, tol: 0.5 },
  patternPigment: { d: (a, b) => colourDistance(a, b) / 0.12, tol: 0.5 },
};

/** '#rrggbb' → [r, g, b] in 0–1. */
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
/** Euclidean distance between two colours in RGB, 0 (same) to 1 (black and white). */
export function colourDistance(a, b) {
  const [x, y] = [rgb(a), rgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) / Math.sqrt(3);
}
/** Relative luminance of a colour (Rec. 709 weights on the 0–1 channels). */
const lightness = (hex) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * The most useful change: the free parameter that is furthest from the target
 * (in its own scale), with the direction to move it. The tolerances are about
 * half a step of each slider, so a right answer can always be set exactly. Null when every free
 * parameter is right. A hint based on the silhouette alone would not do: with
 * several parameters wrong, setting one of them right can make the shells look
 * less alike, and the player would be left without guidance.
 * @param {ChallengeShell} guess
 * @param {ChallengeShell} target
 * @param {string[]} keys parameters the player can change
 * @returns {{ key: string, dir: 'up' | 'down' | 'flip' | 'change' | 'lighter' | 'darker' | 'hue', far: boolean } | null}
 *   far: the parameter is still well off (more than one visible step)
 */
export function bestHint(guess, target, keys) {
  let best = null,
    worst = 0;
  for (const key of keys) {
    // A height means nothing without ribs, cords or spines to carry it: the count comes first
    if (ORNAMENT_NEEDS[key] && !(guess[ORNAMENT_NEEDS[key]] > 0)) continue;
    const { d, tol } = SCALE[key];
    const e = d(guess[key], target[key]);
    if (e > tol && e > worst) {
      worst = e;
      let dir;
      if (key === 'hand') dir = 'flip';
      else if (key === 'patternPreset') dir = 'change';
      else if (key === 'patternBase' || key === 'patternPigment') {
        // A colour is lighter, darker or of another hue
        const dl = lightness(target[key]) - lightness(guess[key]);
        dir = Math.abs(dl) > 0.06 ? (dl > 0 ? 'lighter' : 'darker') : 'hue';
      } else dir = target[key] > guess[key] ? 'up' : 'down';
      best = { key, dir, far: e > 1 };
    }
  }
  return best;
}

/**
 * How near a parameter is, 0–1, from its distance in its own scale: gentle near
 * the target (a difference the eye barely sees costs almost nothing) and steep
 * further away (1 − (d/2.5)², so one scale unit off is 0.84 and 2.5 is 0).
 * @param {number} d
 */
const nearness = (d) => Math.max(0, 1 - (d / 2.5) ** 2);

/**
 * Score of the relief, 0–100, for the last level. Ribs and cords barely change
 * the outline of a shell, so silhouettes cannot judge them. Instead, each kind
 * of relief present in either shell (ribs, cords, spines) scores how close its
 * number and its height are to the target's, the two multiplied: the right
 * height is worth nothing without the ribs. A rib more or a slightly different
 * height scores about 97.
 * @param {ChallengeShell} guess
 * @param {ChallengeShell} target
 */
export function reliefScore(guess, target) {
  const close = (k) => nearness(SCALE[k].d(guess[k], target[k]));
  const kinds = [
    ['ribN', 'ribH'],
    ['cordN', 'cordH'],
    ['spineN', 'spineH'],
  ].filter(([n]) => guess[n] > 0 || target[n] > 0);
  if (!kinds.length) return 100;
  const sum = kinds.reduce((acc, [n, h]) => acc + close(n) * close(h), 0);
  return Math.round((100 * sum) / kinds.length);
}

/**
 * Score of the colour, 0–100: how close the pattern settings and the two colours
 * are to the target's, each in its own scale; the wrong kind of pattern keeps
 * only a third of it, because size or time cannot make bands look like flames.
 * @param {ChallengeShell} guess
 * @param {ChallengeShell} target
 */
export function colourScore(guess, target) {
  const keys = ['patternSize', 'patternT', 'patternNoise', 'patternAmount', 'patternBase', 'patternPigment'];
  const close = keys.map((k) => nearness(SCALE[k].d(guess[k], target[k])));
  const mean = close.reduce((a, b) => a + b, 0) / keys.length;
  return Math.round(100 * mean * (guess.patternPreset === target.patternPreset ? 1 : 0.35));
}

/**
 * Score of a guess for a level: silhouettes for the shape, relief parameters for
 * the relief, pattern settings and colours for the colour. When a level frees
 * several of them, the score is the lowest of them, so none can be skipped.
 * @param {number} level
 * @param {ChallengeShell} guess
 * @param {ChallengeShell} target
 * @param {Float32Array[]} [targetSil] silhouettes of the target, if already computed
 */
export function levelScore(level, guess, target, targetSil) {
  const { parts } = LEVELS[level - 1];
  const scores = parts.map((part) => {
    if (part === 'relief') return reliefScore(guess, target);
    if (part === 'colour') return colourScore(guess, target);
    // The outline judges the shape only: the guess is drawn with the target's relief, so a
    // difference of relief is counted once, by the relief score
    const asShape = parts.includes('relief') ? { ...guess, ...Object.fromEntries(ORNAMENT_KEYS.map((k) => [k, target[k]])) } : guess;
    const shape = scoreFromOverlap(overlap(silhouettes(asShape), targetSil ?? silhouettes(target)));
    return guess.hand === target.hand ? shape : Math.round(shape * WRONG_HAND);
  });
  return Math.min(...scores);
}

/**
 * Levels, in three thematic blocks (shape, ornament, colour), from easier to
 * harder. `keys` are the parameters the player moves; everything else is set to
 * the target's values. `parts` are what the score judges. `pass` is the score
 * needed; `vary` how far a variant moves from the real shell, `always` that every
 * target is a variant; `vague` hints name the parameter to look at but not the
 * direction until it is close. The last level asks for everything.
 * @type {{ id: number, block: 'shape' | 'ornament' | 'colour', keys: string[], parts: ('shape' | 'relief' | 'colour')[], pass: number, vary: number, always?: boolean, vague?: boolean }[]}
 */
export const LEVELS = [
  { id: 1, block: 'shape', keys: ['W'], parts: ['shape'], pass: 85, vary: 0.15 },
  { id: 2, block: 'shape', keys: ['W', 'T'], parts: ['shape'], pass: 88, vary: 0.15 },
  { id: 3, block: 'shape', keys: ['W', 'D', 'T'], parts: ['shape'], pass: 90, vary: 0.2 },
  { id: 4, block: 'shape', keys: SHAPE_KEYS, parts: ['shape'], pass: 90, vary: 0.25, always: true, vague: true },
  { id: 5, block: 'ornament', keys: ORNAMENT_KEYS, parts: ['relief'], pass: 90, vary: 0 },
  { id: 6, block: 'ornament', keys: [...SHAPE_KEYS, ...ORNAMENT_KEYS], parts: ['shape', 'relief'], pass: 90, vary: 0.2, vague: true },
  { id: 7, block: 'colour', keys: COLOUR_KEYS, parts: ['colour'], pass: 90, vary: 0.25, always: true },
  {
    id: 8,
    block: 'colour',
    keys: [...SHAPE_KEYS, ...ORNAMENT_KEYS, ...COLOUR_KEYS],
    parts: ['shape', 'relief', 'colour'],
    pass: 90,
    vary: 0.2,
    always: true,
    vague: true,
  },
];

/** Score needed to pass a level. */
export const passScore = (level) => LEVELS[level - 1].pass;

/**
 * Where a free parameter starts: on the other side of its range from the
 * target, so that every level asks for a real change. Ornament starts smooth.
 */
const START = {
  W: (t) => (t < 2 ? 3 : t < 10 ? 1.4 : 2),
  D: (t) => (t < 0.2 ? 0.35 : 0.05),
  T: (t) => (t < 2 ? t + 3 : 0.5),
  S: (t) => (t < 1 ? 1.4 : 0.7),
  turns: (t) => (t < 6 ? t + 3 : Math.max(2, t - 4)),
  hand: () => 1,
  ribN: () => 0,
  ribH: (t) => t,
  cordN: () => 0,
  cordH: (t) => t,
  spineN: () => 0,
  spineH: (t) => t,
};

/** Shapes of the real shells that the shape levels use as targets. */
const SHAPE_TARGETS = ['caracol', 'turritella', 'trochus', 'planorbis', 'physa', 'peringia', 'nautilus', 'ammonite'];

/** The pattern settings and colours of a pattern preset (presets without size or amount use the defaults). */
function patternOf(key) {
  const p = PATTERN_PRESETS[key];
  return {
    patternPreset: key,
    patternSize: p.size ?? 1,
    patternT: p.T,
    patternNoise: p.noise,
    patternAmount: p.amount ?? 0.5,
    patternBase: p.base,
    patternPigment: p.pigment,
  };
}

/** The highest score the kind's own pattern may get against a colour target. */
const OWN_PATTERN_MAX = 75;

/**
 * The kinds of pattern of the colour levels. The ones with global control
 * (Oliva, Conus) are left out: their look comes from the balance kept by the
 * hormone, so a target with another time or size can lose its triangles.
 */
export const CHALLENGE_PATTERNS = Object.keys(PATTERN_PRESETS).filter((k) => !(PATTERN_PRESETS[k].globalCtl > 0));

/** Background and pigment colours of real shells, for colour targets. */
const SHELL_COLOURS = [
  ['#f1e7d6', '#9c4a1f'], // cream and rust
  ['#ecc95a', '#3a2216'], // yellow and dark brown
  ['#fbf3ea', '#c2551d'], // white and orange
  ['#f2d9d6', '#7a3550'], // pink and purple
  ['#e9e0c9', '#2b2a28'], // beige and black
  ['#f6efe0', '#5b6d3a'], // cream and olive
];

/** Ornamented shells whose shape can be found with the sliders (bivalves have W of hundreds). */
const ORNAMENTED = (shapeFree) =>
  Object.keys(ORNAMENT_PRESETS).filter(
    (k) => k !== 'smooth' && ORNAMENT_PRESETS[k].shape && (!shapeFree || ORNAMENT_PRESETS[k].shape.W < 10),
  );

/**
 * A target for a level: a real shell, often varied so the same shell does not
 * always come back identical (more often and further in harder levels).
 * @param {number} level 1–8
 * @param {() => number} rand random numbers in [0, 1)
 * @returns {{ name: string, pattern?: string, shell: ChallengeShell, varied: boolean }}
 *   name: the shell (or, in the colour-only level, the pattern); pattern: the pattern, when there is one
 */
export function makeTarget(level, rand = Math.random) {
  const L = LEVELS[level - 1];
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const shapeOf = (k) => {
    const { W, D, T, S, turns, hand, mirror } = PRESETS[k];
    return { ...ORNAMENT_DEFAULTS, W, D, T, S, turns, hand, mirror };
  };
  const shapeFree = L.parts.includes('shape');
  let name, shell, pattern;
  if (L.parts.includes('relief')) {
    name = pick(ORNAMENTED(shapeFree));
    const p = ORNAMENT_PRESETS[name];
    shell = { ...ORNAMENT_DEFAULTS, ...p.shape, ...p.orn };
  } else if (L.parts.includes('shape')) {
    name = pick(SHAPE_TARGETS);
    shell = shapeOf(name);
  } else {
    shell = shapeOf(pick(SHAPE_TARGETS));
  }
  if (L.parts.includes('colour')) {
    pattern = pick(CHALLENGE_PATTERNS);
    shell = { ...shell, ...patternOf(pattern) };
    name ??= pattern;
  }
  const varied = L.vary > 0 && (L.always || rand() < 0.5);
  if (varied) {
    const free = L.keys;
    const f = L.vary;
    const nudge = (v, k = 1) => v * (1 + k * f * (2 * rand() - 1));
    if (free.includes('W') && shell.W < 10) shell.W = Math.max(1.15, nudge(shell.W));
    if (free.includes('T') && shell.T > 0) shell.T = nudge(shell.T, 1.3);
    if (free.includes('D')) shell.D = Math.min(0.6, Math.max(0, shell.D + 0.4 * f * (2 * rand() - 1)));
    if (free.includes('S')) shell.S = Math.min(1.8, Math.max(0.6, nudge(shell.S)));
    if (free.includes('patternSize')) {
      // Other settings and colours than the kind's own, far enough that choosing the
      // right kind is never enough: drawn again until the kind's own pattern scores low
      const own = { ...shell, ...patternOf(shell.patternPreset) };
      const others = SHELL_COLOURS.filter(([b, g]) => colourDistance(b, own.patternBase) + colourDistance(g, own.patternPigment) > 0.15);
      for (let i = 0; i < 50 && (i === 0 || colourScore(own, shell) >= OWN_PATTERN_MAX); i++) {
        shell.patternSize = Math.min(3, Math.max(0.6, nudge(own.patternSize, 1.6)));
        shell.patternT = nudge(own.patternT, 1.6);
        shell.patternNoise = Math.min(0.5, Math.max(0, own.patternNoise + 0.2 * f * (2 * rand() - 1)));
        shell.patternAmount = Math.min(0.85, Math.max(0.15, own.patternAmount + 0.4 * f * (2 * rand() - 1)));
        [shell.patternBase, shell.patternPigment] = pick(others);
      }
    }
  }
  return { name, pattern, shell, varied };
}

/**
 * The player's starting shell: the target's values for the fixed parameters and,
 * for the free ones, a value away from the target (START); the pattern starts as
 * another kind, with that kind's own settings and colours.
 * @param {number} level
 * @param {ChallengeShell} target
 * @returns {ChallengeShell}
 */
export function startShell(level, target) {
  const L = LEVELS[level - 1];
  const s = { ...target };
  for (const k of L.keys) if (START[k]) s[k] = START[k](target[k]);
  if (L.parts.includes('colour')) {
    const kinds = CHALLENGE_PATTERNS;
    Object.assign(s, patternOf(kinds[(kinds.indexOf(target.patternPreset) + 1) % kinds.length]));
  }
  return s;
}
