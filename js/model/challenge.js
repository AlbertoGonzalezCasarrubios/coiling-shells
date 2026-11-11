/**
 * The "match the shell" challenge: how alike two shells look, and which
 * parameter to change to get closer.
 *
 * Likeness is measured on silhouettes. Both shells are built with Raup's model
 * at the same normalised size (buildShell centres them and scales their largest
 * dimension to SIZE), projected along the three axes (front, side and top) and
 * filled into a small grid; the overlap of each pair of silhouettes is their
 * intersection over their union (IoU). The score maps the mean overlap to a
 * percentage with a calibration measured on pairs of real shells (see
 * tests/challenge.test.mjs). Hints try each parameter at the target's value and
 * report the change that would improve the overlap most.
 *
 * Pure module (no Three.js, no DOM): it runs in the browser and in Node.
 */
import { buildShell } from './raup.js';
import { ORNAMENT_DEFAULTS, ornamentResolution } from './ornament.js';
import { PRESETS, ORNAMENT_PRESETS } from './presets.js';

const SIZE = 4;
/** Coordinates kept by each projection: front (x, y), side (z, y), top (x, z). */
const VIEWS = [
  [0, 1],
  [2, 1],
  [0, 2],
];
/** Side of the grid on which silhouettes are filled. */
export const GRID = 96;

/** Shape parameters of the challenge, and the ornament ones of its last level. */
export const SHAPE_KEYS = ['W', 'D', 'T', 'S', 'turns', 'hand'];
export const ORNAMENT_KEYS = ['ribN', 'ribH', 'cordN', 'cordH', 'spineN', 'spineH'];

/**
 * @typedef {import('./raup.js').ShellShape & import('./ornament.js').OrnamentParams} ChallengeShell
 */

/**
 * Silhouettes of a shell along the three axes.
 * @param {ChallengeShell} p
 * @param {number} [res] side of the grid
 * @returns {Uint8Array[]} one res × res mask per view (1 = shell)
 */
export function silhouettes(p, res = GRID) {
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

/**
 * Mean overlap (intersection over union) of two sets of silhouettes, 0–1.
 * @param {Uint8Array[]} A
 * @param {Uint8Array[]} B
 */
export function overlap(A, B) {
  let sum = 0;
  for (let v = 0; v < A.length; v++) {
    let inter = 0,
      union = 0;
    for (let k = 0; k < A[v].length; k++) {
      inter += A[v][k] & B[v][k];
      union += A[v][k] | B[v][k];
    }
    sum += union ? inter / union : 1;
  }
  return sum / A.length;
}

/**
 * From overlap to score. The score falls with the mismatch d = 1 − overlap,
 * reaching 0 at d = `zero`. Calibrated on pairs of real shells: shells that the
 * eye cannot tell apart differ by d ≈ 0.02 (score ≈ 95), shells of the same
 * kind by d ≈ 0.1 (≈ 70), and shells of different groups by d = 0.3–0.8 (< 30).
 * See tests/challenge.test.mjs.
 */
export const CALIBRATION = { zero: 0.5, power: 1.4 };

/**
 * Score of a guess against a target, 0–100.
 * @param {number} iou mean overlap of their silhouettes
 */
export function scoreFromOverlap(iou) {
  const x = Math.max(0, 1 - (1 - iou) / CALIBRATION.zero);
  return Math.round(100 * x ** CALIBRATION.power);
}

/** Score needed to pass a level. */
export const PASS = 90;

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
 * @returns {{ key: string, dir: 'up' | 'down' | 'flip', far: boolean } | null}
 *   far: the parameter is still well off (more than one visible step)
 */
export function bestHint(guess, target, keys) {
  let best = null,
    worst = 0;
  for (const key of keys) {
    const { d, tol } = SCALE[key];
    const e = d(guess[key], target[key]);
    if (e > tol && e > worst) {
      worst = e;
      best = { key, dir: key === 'hand' ? 'flip' : target[key] > guess[key] ? 'up' : 'down', far: e > 1 };
    }
  }
  return best;
}

/**
 * Score of the relief, 0–100, for the last level. Ribs and cords barely change
 * the outline of a shell, so silhouettes cannot judge them. Instead, each kind
 * of relief present in either shell (ribs, cords, spines) scores how close its
 * number and its height are to the target's, the two multiplied: the right
 * height is worth nothing without the ribs. With every parameter within its
 * tolerance the score is at least 90.
 * @param {ChallengeShell} guess
 * @param {ChallengeShell} target
 */
export function reliefScore(guess, target) {
  const close = (k) => Math.max(0, 1 - SCALE[k].d(guess[k], target[k]) / 5);
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
 * Score of a guess for a level: silhouettes for the shape, relief parameters
 * for the ornament level.
 * @param {number} level
 * @param {ChallengeShell} guess
 * @param {ChallengeShell} target
 * @param {Uint8Array[]} [targetSil] silhouettes of the target, if already computed
 */
export function levelScore(level, guess, target, targetSil) {
  const L = LEVELS[level - 1];
  if (L.ornament) return reliefScore(guess, target);
  return scoreFromOverlap(overlap(silhouettes(guess), targetSil ?? silhouettes(target)));
}

/**
 * Levels: which parameters the player moves. Everything else is set to the
 * target's values, so each level teaches what its parameters do. The last one
 * gives the shape of an ornamented shell and asks for its relief.
 */
export const LEVELS = [
  { id: 1, keys: ['W'] },
  { id: 2, keys: ['W', 'T'] },
  { id: 3, keys: ['W', 'D', 'T'] },
  { id: 4, keys: SHAPE_KEYS },
  { id: 5, keys: ORNAMENT_KEYS, ornament: true },
];

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

/** Shapes of the real shells that the first four levels use as targets. */
const SHAPE_TARGETS = ['caracol', 'turritella', 'trochus', 'planorbis', 'physa', 'peringia', 'nautilus', 'ammonite'];

/**
 * A target for a level: a real shell, sometimes varied a little so the same
 * shell does not always come back identical.
 * @param {number} level 1–5
 * @param {() => number} rand random numbers in [0, 1)
 * @returns {{ name: string, shell: ChallengeShell, varied: boolean }}
 */
export function makeTarget(level, rand = Math.random) {
  const pick = (list) => list[Math.floor(rand() * list.length)];
  let name, shell;
  if (LEVELS[level - 1].ornament) {
    name = pick(Object.keys(ORNAMENT_PRESETS).filter((k) => k !== 'smooth' && ORNAMENT_PRESETS[k].shape));
    const p = ORNAMENT_PRESETS[name];
    shell = { ...ORNAMENT_DEFAULTS, ...p.shape, ...p.orn };
  } else {
    name = pick(SHAPE_TARGETS);
    const { W, D, T, S, turns, hand, mirror } = PRESETS[name];
    shell = { ...ORNAMENT_DEFAULTS, W, D, T, S, turns, hand, mirror };
  }
  // Half of the time, a variant: the free parameters move by a modest amount
  const varied = rand() < 0.5;
  if (varied) {
    const free = LEVELS[level - 1].keys;
    const nudge = (v, f) => v * (1 + f * (2 * rand() - 1));
    if (free.includes('W')) shell.W = Math.max(1.15, nudge(shell.W, 0.15));
    if (free.includes('T') && shell.T > 0) shell.T = nudge(shell.T, 0.2);
    if (free.includes('D')) shell.D = Math.min(0.6, Math.max(0, shell.D + 0.06 * (2 * rand() - 1)));
  }
  return { name, shell, varied };
}

/**
 * The player's starting shell: the target's values for the fixed parameters and,
 * for the free ones, a value away from the target (START).
 * @param {number} level
 * @param {ChallengeShell} target
 * @returns {ChallengeShell}
 */
export function startShell(level, target) {
  const s = { ...target };
  for (const k of LEVELS[level - 1].keys) s[k] = START[k](target[k]);
  return s;
}
