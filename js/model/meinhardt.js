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
 * stripes are intercalated as the shell grows.
 *
 * Global control (Meinhardt & Klingler 1987): a hormone R made by the active
 * cells and shared by the whole margin, ∂R/∂t = g·(⟨a⟩ − R), so it measures how
 * many waves there are. When waves annihilate and few are left, R falls, the
 * active cells switch from oscillating to a steady activation and, once their
 * neighbours have recovered, start backward waves: branches. Since R is the
 * same everywhere, many lines branch at once.
 * - Activator–inhibitor (their Fig. 8, Oliva porphyria): R slows the decay of
 *   the inhibitor, which becomes r_h/R, and the activator production becomes
 *   s·(a*² + b_a)/(0.1 + h) with a*² = a²/(1 + κa²) (also in the production of h).
 *   The steady activation is high: lines branch into triangles.
 * - Activator–substrate (their Fig. 9, Conus marmoreus): R slows the production
 *   of substrate, which becomes b_b/R. The steady activation is low but above
 *   the pigment threshold: the region between two branches is pigmented, which
 *   leaves white triangles on a dark background.
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
 * @param {number} p.Da         diffusion of the activator
 * @param {number} p.D2         diffusion of the second substance (inhibitor or substrate)
 * @param {number} p.ra         decay rate of the activator
 * @param {number} p.r2         decay rate of the second substance
 * @param {number} p.kappa      saturation of the autocatalysis
 * @param {number} p.ba         basal production of the activator
 * @param {number} p.b2         basal production of the second substance
 * @param {number} p.noise      fluctuation of the source density (0–1)
 * @param {number} p.globalCtl  strength of the global control (0 = no control)
 * @param {number} p.T          total simulated time from the apex to the aperture
 * @param {number} p.seed       seed of the random cell-to-cell differences
 * @param {boolean} p.insertion cell insertion: the margin grows with the shell
 * @param {object} g  growth geometry
 * @param {number} g.W         whorl expansion rate (for the size at each row)
 * @param {number} g.turns     number of whorls
 * @param {number} g.rows       rows of the result
 * @param {number} g.width      columns of the result (the margin is resampled)
 * @param {number} g.nMax       cells at the aperture
 * @param {number} [g.refine]   definition: sub-cells per cell (1 by default)
 * @returns {{ values: Float32Array, second: Float32Array, state: 'pattern'|'uniform'|'extinct' }}
 *   values: normalised activator 0–1 (rows × width); second: inhibitor or
 *   substrate relative to its maximum (rows × PROFILE_WIDTH), for the profile
 *   viewer; state tells whether a pattern formed, the margin stayed uniform or
 *   the activator died out
 */
export function simulatePattern(p, g) {
  const { rows, width } = g;
  // Definition: each cell of the model is split into K sub-cells that share its
  // source density, with the diffusion scaled by K² so that the coupling, and the
  // size of the pattern, stay the same; a front then advances in steps K times
  // finer. Counts below (nMax, nMin, the insertion) are in sub-cells.
  const K = Math.max(1, Math.round(g.refine ?? 1));
  const nMax = g.nMax * K;
  const Da = p.Da * K * K;
  const D2 = p.D2 * K * K;
  const rand = rng32(p.seed);
  const isAS = p.model === 'AS';
  // The hormone of Meinhardt & Klingler (global control), in either model
  const global = p.globalCtl > 0;
  const hormone = !isAS && global; // activator–inhibitor with the hormone
  // With the hormone a very short margin loses all its waves before the hormone can react
  const nMin = Math.min(nMax, (global ? 48 : 8) * K);

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
  const Dmax = Math.max(Da, D2, 1e-6);
  const rmax = Math.max(p.ra, p.r2, 1e-6);
  const dt = Math.min(0.5, 0.4 / Dmax, 0.4 / rmax);

  // State of the margin (capacity nMax; the first n cells are used)
  let n = p.insertion ? Math.max(nMin, K * Math.round(g.nMax * size[0])) : nMax;
  const a = new Float64Array(nMax);
  const b = new Float64Array(nMax);
  const s = new Float64Array(nMax);
  const na = new Float64Array(nMax);
  const nb = new Float64Array(nMax);

  const source = () => p.ra * (1 + p.noise * (2 * rand() - 1));
  const a0 = isAS ? 1 : Math.max(p.r2 / p.ra, 0.05);
  const b0 = isAS ? p.b2 / Math.max(p.r2 + p.ra, 1e-6) : a0;
  for (let i = 0; i < n; i++) {
    // A new cell every K sub-cells (the same random draws as without refinement)
    if (i % K) {
      s[i] = s[i - 1];
      a[i] = a[i - 1];
      b[i] = b[i - 1];
      continue;
    }
    s[i] = source();
    // With the hormone the margin starts at rest with a few active cells, which start the first waves
    // (at least the first one, so that a short margin at the apex also starts)
    a[i] = isAS ? (rand() < 0.08 ? 2 : 0.02) : hormone ? (i === 0 || rand() < 0.03 ? 3 : 0) : a0 * (0.5 + rand());
    b[i] = hormone ? 0 : isAS && global ? 1 : b0;
  }

  // The hormone starts high, as with many waves
  let c = isAS ? 0.5 : 1;

  const out = new Float32Array(rows * width);
  const raw = new Float32Array(rows * width); // joined by straight lines, for the scale of the record
  const second = new Float32Array(rows * PROFILE_WIDTH); // inhibitor h or substrate b
  let carry = 0;

  for (let row = 0; row < rows; row++) {
    // Cell insertion: a random cell (its K sub-cells) is duplicated, with its own source density
    if (p.insertion) {
      const target = Math.min(nMax, Math.max(nMin, K * Math.round((nMax / K) * size[row])));
      while (n < target) {
        const k = Math.floor(rand() * (n / K)) * K;
        a.copyWithin(k + K, k, n);
        b.copyWithin(k + K, k, n);
        s.copyWithin(k + K, k, n);
        s.fill(source(), k + K, k + 2 * K);
        n += K;
      }
    }

    carry += p.T / rows / dt;
    const steps = Math.floor(carry);
    carry -= steps;

    for (let step = 0; step < steps; step++) {
      let mean = 0;
      for (let i = 0; i < n; i++) mean += a[i];
      mean /= n;
      if (global) c += dt * p.globalCtl * (mean - c);
      // Inhibitor decay r_h/R, limited to what one step can remove; substrate production b_b/R
      const rh = hormone ? Math.min(p.r2 / Math.max(c, 1e-9), 1 / dt) : p.r2;
      const bb = isAS && global ? p.b2 / Math.max(c, 1e-3) : p.b2;

      for (let i = 0; i < n; i++) {
        const l = i === 0 ? n - 1 : i - 1;
        const r = i === n - 1 ? 0 : i + 1;
        const ai = a[i];
        const bi = b[i];
        const lapA = a[l] + a[r] - 2 * ai;
        const lapB = b[l] + b[r] - 2 * bi;
        const a2 = ai * ai;
        if (isAS) {
          const prod = s[i] * bi * (a2 / (1 + p.kappa * a2) + p.ba);
          na[i] = ai + dt * (prod - p.ra * ai + Da * lapA);
          nb[i] = bi + dt * (bb - prod - p.r2 * bi + D2 * lapB);
        } else if (hormone) {
          const sat = a2 / (1 + p.kappa * a2);
          na[i] = ai + dt * ((s[i] * (sat + p.ba)) / (0.1 + bi) - p.ra * ai + Da * lapA);
          nb[i] = bi + dt * (s[i] * sat - rh * bi + D2 * lapB + p.b2);
        } else {
          const prod = s[i] * (a2 / ((bi + 1e-9) * (1 + p.kappa * a2)) + p.ba);
          na[i] = ai + dt * (prod - p.ra * ai + Da * lapA);
          nb[i] = bi + dt * (s[i] * a2 - p.r2 * bi + D2 * lapB + p.b2);
        }
      }
      // Clamping so that extreme parameters cannot overflow (NaN > 0 is false → 0)
      for (let i = 0; i < n; i++) {
        a[i] = na[i] > 0 ? (na[i] < 1e4 ? na[i] : 1e4) : 0;
        b[i] = nb[i] > 1e-9 ? (nb[i] < 1e6 ? nb[i] : 1e6) : 1e-9;
      }
    }

    // Periodic resampling of the margin (n cells) to the texture width, with a
    // Gaussian of SMOOTH_CELLS cells instead of straight lines between cells: each
    // cell switches on abruptly, so a moving front jumps from one cell to the next
    // and a straight join would draw it as a staircase
    const base = row * width;
    for (let k = 0; k < width; k++) {
      const x = (k / width) * n;
      const i0 = Math.floor(x);
      const t = x - i0;
      raw[base + k] = a[i0] * (1 - t) + a[i0 + 1 === n ? 0 : i0 + 1] * t;
      let sum = 0,
        wsum = 0;
      for (let i = i0 - SMOOTH_REACH; i <= i0 + SMOOTH_REACH + 1; i++) {
        const d = x - i;
        const w = Math.exp((-d * d) / (2 * SMOOTH_CELLS * SMOOTH_CELLS));
        sum += w * a[((i % n) + n) % n];
        wsum += w;
      }
      out[base + k] = sum / wsum;
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
  // neither for the diagnosis nor for the scaling. The scale comes from the
  // unsmoothed record, so that smoothing the edges does not move the threshold.
  const state = normalize(out, Math.floor(rows / 4) * width, raw);
  scaleToMax(second, Math.floor(rows / 4) * PROFILE_WIDTH);
  return { values: out, second, state };
}

/** Smoothing of the margin when it is resampled: σ in cells, and how many cells on each side it reaches. */
const SMOOTH_CELLS = 0.6;
const SMOOTH_REACH = 2;

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
 * @param {Float32Array} v
 * @param {number} [skip]  values at the start that are left out of the statistics
 * @param {Float32Array} [ref]  the values the statistics come from (by default, v itself)
 * @returns {'pattern' | 'uniform' | 'extinct'}
 */
function normalize(v, skip = 0, ref = v) {
  const sample = [];
  const stride = Math.max(1, Math.floor((ref.length - skip) / 20000));
  for (let i = skip; i < ref.length; i += stride) sample.push(ref[i]);
  sample.sort((x, y) => x - y);
  const lo = sample[Math.floor(sample.length * 0.02)];
  const hi = sample[Math.min(sample.length - 1, Math.floor(sample.length * 0.995))];
  /** @type {'pattern' | 'uniform' | 'extinct'} */
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
