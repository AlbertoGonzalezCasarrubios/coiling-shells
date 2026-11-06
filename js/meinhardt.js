/**
 * Shell pigmentation with H. Meinhardt's reaction–diffusion models
 * (Meinhardt & Klingler 1987; Meinhardt, "The Algorithmic Beauty of Sea Shells").
 *
 * Pigment is only laid down at the margin of the aperture while the shell
 * grows: it is a 1D system (x along the margin, periodic) whose history is
 * recorded in the shell. Each row of the result is the state of the margin at
 * one moment; row 0 is the apex and the last row is the aperture.
 *
 * Activator–inhibitor (stable peaks, oscillations, waves):
 *   ∂a/∂t = s·(a²/(h·(1 + κa²)) + b_a) − r_a·a + D_a·∂²a/∂x²
 *   ∂h/∂t = s·a² − r_h·h + D_h·∂²h/∂x² + b_h
 *
 * Activator–substrate (travelling waves: depleted substrate takes time to recover):
 *   ∂a/∂t = s·b·(a²/(1 + κa²) + b_a) − r_a·a + D_a·∂²a/∂x²
 *   ∂b/∂t = b_b − s·b·(a²/(1 + κa²) + b_a) − r_b·b + D_b·∂²b/∂x²
 *
 * s = r_a·(1 ± noise) is the source density of each cell (cell-to-cell
 * heterogeneity). With cell insertion the margin gains cells in proportion to
 * the size of the shell, so pattern elements keep their absolute size and new
 * stripes are intercalated as the shell grows. Global control (activator–
 * substrate only): a signal c, shared by the whole margin, follows the mean
 * activity; when waves annihilate and activity drops, c falls and favours the
 * triggering of new waves. It is a simplified version of the mechanism that
 * Meinhardt and Klingler (1987) proposed for the triangles of Oliva porphyria;
 * in this form it gives oblique lines and V shapes, not that full pattern.
 */

export const MODELS = ['AI', 'AS'];

/** Number of columns of the returned profile of the second substance (inhibitor or substrate). */
export const PROFILE_WIDTH = 256;

/** Seeded pseudo-random generator (mulberry32): the same seed always gives the same pattern. */
export function rng32(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {object} p  model parameters
 * @param {'AI'|'AS'} p.model   activator–inhibitor or activator–substrate
 * @param {number} p.Da, p.D2   diffusion of the activator and of the second substance
 * @param {number} p.ra, p.r2   decay rates
 * @param {number} p.kappa      saturation of the autocatalysis
 * @param {number} p.ba, p.b2   basal production of the activator and of the second substance
 * @param {number} p.noise      fluctuation of the source density (0–1)
 * @param {number} p.globalCtl  strength of the global control (0 = no control)
 * @param {number} p.T          total simulated time from the apex to the aperture
 * @param {number} p.seed       seed of the random cell-to-cell differences
 * @param {boolean} p.insertion cell insertion: the margin grows with the shell
 * @param {object} g  growth geometry
 * @param {number} g.W, g.turns Raup's parameters (for the size at each row)
 * @param {number} g.rows       rows of the result
 * @param {number} g.width      columns of the result (the margin is resampled)
 * @param {number} g.nMax       cells at the aperture
 * @returns {{ values: Float32Array, second: Float32Array, state: 'pattern'|'uniform'|'extinct' }}
 *   values: normalised activator 0–1 (rows × width); second: inhibitor or
 *   substrate relative to its maximum (rows × PROFILE_WIDTH), for the profile
 *   viewer; state tells whether a pattern formed, the margin stayed uniform or
 *   the activator died out
 */
export function simulatePattern(p, g) {
  const { rows, width, nMax } = g;
  const nMin = 8;
  const rand = rng32(p.seed);
  const isAS = p.model === 'AS';

  // Relative size of the shell at each row (1 at the aperture)
  const lnW = Math.log(Math.max(g.W, 1.0001));
  const size = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    const theta = -2 * Math.PI * g.turns * (1 - i / (rows - 1));
    size[i] = Math.exp((theta / (2 * Math.PI)) * lnW);
  }

  // A logarithmic spiral traversed at a constant angular rate is growth at a
  // constant relative (exponential) rate: every row gets the same time. What
  // changes with size is the length of the margin, which gains cells
  // (insertion) in proportion to the size of the shell.

  // Stable explicit Euler step: diffusion (dt·D ≤ 0.4 with Δx = 1) and reaction
  const Dmax = Math.max(p.Da, p.D2, 1e-6);
  const rmax = Math.max(p.ra, p.r2, 1e-6);
  const dt = Math.min(0.5, 0.4 / Dmax, 0.4 / rmax);

  // State of the margin (capacity nMax; the first n cells are used)
  let n = p.insertion ? Math.max(nMin, Math.round(nMax * size[0])) : nMax;
  const a = new Float64Array(nMax);
  const b = new Float64Array(nMax);
  const s = new Float64Array(nMax);
  const na = new Float64Array(nMax);
  const nb = new Float64Array(nMax);

  const source = () => p.ra * (1 + p.noise * (2 * rand() - 1));
  const a0 = isAS ? 1 : Math.max(p.r2 / p.ra, 0.05);
  const b0 = isAS ? p.b2 / Math.max(p.r2 + p.ra, 1e-6) : a0;
  for (let i = 0; i < n; i++) {
    s[i] = source();
    a[i] = isAS ? (rand() < 0.08 ? 2 : 0.02) : a0 * (0.5 + rand());
    b[i] = b0;
  }

  let c = 0; // global signal (mean activity)
  const cRate = 0.02;

  const out = new Float32Array(rows * width);
  const second = new Float32Array(rows * PROFILE_WIDTH); // inhibitor h or substrate b
  let carry = 0;

  for (let row = 0; row < rows; row++) {
    // Cell insertion: a random cell is duplicated, with its own source density
    if (p.insertion) {
      const target = Math.min(nMax, Math.max(nMin, Math.round(nMax * size[row])));
      while (n < target) {
        const k = Math.floor(rand() * n);
        a.copyWithin(k + 1, k, n);
        b.copyWithin(k + 1, k, n);
        s.copyWithin(k + 1, k, n);
        s[k + 1] = source();
        n++;
      }
    }

    carry += p.T / rows / dt;
    const steps = Math.floor(carry);
    carry -= steps;

    for (let step = 0; step < steps; step++) {
      let mean = 0;
      for (let i = 0; i < n; i++) mean += a[i];
      mean /= n;
      c += dt * cRate * (mean - c);
      // When the global activity drops, the basal activation increases
      const baEff = p.ba + (isAS && p.globalCtl > 0 ? p.globalCtl / (1 + 40 * c) : 0);

      for (let i = 0; i < n; i++) {
        const l = i === 0 ? n - 1 : i - 1;
        const r = i === n - 1 ? 0 : i + 1;
        const ai = a[i];
        const bi = b[i];
        const lapA = a[l] + a[r] - 2 * ai;
        const lapB = b[l] + b[r] - 2 * bi;
        const a2 = ai * ai;
        if (isAS) {
          const prod = s[i] * bi * (a2 / (1 + p.kappa * a2) + baEff);
          na[i] = ai + dt * (prod - p.ra * ai + p.Da * lapA);
          nb[i] = bi + dt * (p.b2 - prod - p.r2 * bi + p.D2 * lapB);
        } else {
          const prod = s[i] * (a2 / ((bi + 1e-9) * (1 + p.kappa * a2)) + baEff);
          na[i] = ai + dt * (prod - p.ra * ai + p.Da * lapA);
          nb[i] = bi + dt * (s[i] * a2 - p.r2 * bi + p.D2 * lapB + p.b2);
        }
      }
      // Clamping so that extreme parameters cannot overflow (NaN > 0 is false → 0)
      for (let i = 0; i < n; i++) {
        a[i] = na[i] > 0 ? (na[i] < 1e4 ? na[i] : 1e4) : 0;
        b[i] = nb[i] > 1e-9 ? (nb[i] < 1e6 ? nb[i] : 1e6) : 1e-9;
      }
    }

    // Periodic resampling of the margin (n cells) to the texture width
    const base = row * width;
    for (let k = 0; k < width; k++) {
      const x = (k / width) * n;
      const i0 = Math.floor(x);
      const t = x - i0;
      const i1 = i0 + 1 === n ? 0 : i0 + 1;
      out[base + k] = a[i0] * (1 - t) + a[i1] * t;
    }
    const base2 = row * PROFILE_WIDTH;
    for (let k = 0; k < PROFILE_WIDTH; k++) {
      const x = (k / PROFILE_WIDTH) * n;
      const i0 = Math.floor(x);
      const t = x - i0;
      const i1 = i0 + 1 === n ? 0 : i0 + 1;
      second[base2 + k] = b[i0] * (1 - t) + b[i1] * t;
    }
  }

  // The initial transient (first quarter, the tiny whorls of the apex) counts
  // neither for the diagnosis nor for the scaling
  const state = normalize(out, Math.floor(rows / 4) * width);
  scaleToMax(second, Math.floor(rows / 4) * PROFILE_WIDTH);
  return { values: out, second, state };
}

/** Scales to 0–1 by dividing by the maximum (ignoring the initial transient). */
function scaleToMax(v, skip = 0) {
  let max = 0;
  for (let i = skip; i < v.length; i++) if (v[i] > max) max = v[i];
  const k = max > 0 ? 1 / max : 0;
  for (let i = 0; i < v.length; i++) v[i] = Math.min(1, v[i] * k);
}

/**
 * Robust scaling to 0–1 using percentiles, so that an isolated peak does not
 * dim the rest. If the activator died out or the margin stayed practically
 * uniform, nothing is rescaled: amplifying tiny differences would fabricate a
 * false pattern.
 */
function normalize(v, skip = 0) {
  const sample = [];
  const stride = Math.max(1, Math.floor((v.length - skip) / 20000));
  for (let i = skip; i < v.length; i += stride) sample.push(v[i]);
  sample.sort((x, y) => x - y);
  const lo = sample[Math.floor(sample.length * 0.02)];
  const hi = sample[Math.min(sample.length - 1, Math.floor(sample.length * 0.995))];
  let state = 'pattern';
  if (hi < 1e-4) state = 'extinct';
  else if ((hi - lo) / hi < 0.05) state = 'uniform';
  if (state !== 'pattern') {
    v.fill(0);
    return state;
  }
  const span = hi - lo;
  for (let i = 0; i < v.length; i++) {
    const x = (v[i] - lo) / span;
    v[i] = x < 0 ? 0 : x > 1 ? 1 : x;
  }
  return state;
}
