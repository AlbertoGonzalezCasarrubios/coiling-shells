// Tests for Meinhardt's pigmentation models (js/meinhardt.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePattern, PROFILE_WIDTH, rng32 } from '../js/model/meinhardt.js';
import { PATTERN_PRESETS, MODEL_DEFAULTS } from '../js/model/presets.js';

const g = { W: 2.4, turns: 4.5, rows: 256, width: 256, nMax: 256 };
const preset = (k, extra = {}) => ({ ...PATTERN_PRESETS[k], seed: 7, ...extra });

test('the random generator is deterministic and uniform in [0, 1)', () => {
  const a = rng32(42), b = rng32(42);
  let sum = 0;
  for (let i = 0; i < 10000; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
    sum += x;
  }
  assert.ok(Math.abs(sum / 10000 - 0.5) < 0.02);
});

test('every pattern preset forms a pattern, with values in [0, 1]', () => {
  for (const key of Object.keys(PATTERN_PRESETS)) {
    const r = simulatePattern(preset(key), g);
    assert.equal(r.state, 'pattern', key);
    assert.equal(r.values.length, g.rows * g.width);
    assert.equal(r.second.length, g.rows * PROFILE_WIDTH);
    for (const arr of [r.values, r.second]) {
      for (const v of arr) assert.ok(v >= 0 && v <= 1 && Number.isFinite(v), key);
    }
  }
});

test('the same seed gives the same pattern; another seed a different one', () => {
  const a = simulatePattern(preset('nautilus'), g).values;
  const b = simulatePattern(preset('nautilus'), g).values;
  const c = simulatePattern(preset('nautilus', { seed: 8 }), g).values;
  assert.deepEqual(a, b);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - c[i]);
  assert.ok(diff / a.length > 0.01);
});

test('no pattern is reported instead of rescaling tiny differences', () => {
  // Without substrate the activator dies out
  const extinct = simulatePattern({ ...MODEL_DEFAULTS.AS, seed: 7, b2: 0, globalCtl: 0 }, g);
  assert.equal(extinct.state, 'extinct');
  assert.ok(extinct.values.every((v) => v === 0));
  // Strong diffusion without noise keeps the margin uniform
  const uniform = simulatePattern(preset('cepaea', { Da: 0.5, D2: 0, noise: 0 }), g);
  assert.equal(uniform.state, 'uniform');
});

test('bands are stable in time; oscillations change along time', () => {
  // Column-wise variation over the last half of the record
  const temporalVariation = (values) => {
    let s = 0, n = 0;
    for (let r = g.rows / 2 + 1; r < g.rows; r++) {
      for (let x = 0; x < g.width; x += 4) {
        s += Math.abs(values[r * g.width + x] - values[(r - 1) * g.width + x]);
        n++;
      }
    }
    return s / n;
  };
  const bands = temporalVariation(simulatePattern(preset('cepaea'), g).values);
  const flames = temporalVariation(simulatePattern(preset('nautilus'), g).values);
  assert.ok(flames > 3 * bands, `flames ${flames} vs bands ${bands}`);
});

test('the default constants of each model form a pattern of that model', () => {
  for (const [model, p] of Object.entries(MODEL_DEFAULTS)) {
    assert.equal(p.model, model);
    assert.equal(simulatePattern({ ...p, seed: 7 }, g).state, 'pattern', model);
  }
});

test('the activator–substrate defaults draw travelling waves (oblique lines)', () => {
  // A travelling wave shifts sideways from one row to the next: the activator
  // peak of a row is close to, but not at, the peak of a row a little earlier.
  const { values } = simulatePattern({ ...MODEL_DEFAULTS.AS, seed: 7 }, g);
  let shifted = 0, rowsWithPeaks = 0;
  for (let r = g.rows / 2; r < g.rows; r++) {
    const row = values.subarray(r * g.width, (r + 1) * g.width);
    const prev = values.subarray((r - 2) * g.width, (r - 1) * g.width);
    const peak = row.indexOf(Math.max(...row));
    if (row[peak] < 0.5) continue;
    rowsWithPeaks++;
    if (prev[peak] < row[peak] * 0.9) shifted++;
  }
  assert.ok(rowsWithPeaks > 20);
  assert.ok(shifted / rowsWithPeaks > 0.3, `${shifted} / ${rowsWithPeaks}`);
});

test('the Naticarius preset draws many separate spots, not stripes or bands', () => {
  // Pigmented patches in the second half of the record (the last whorls), at the preset's threshold
  const patches = (key) => {
    const p = preset(key);
    const G = { W: 2.6, turns: 5, rows: 512, width: 256, nMax: Math.round(256 / (p.size ?? 1)) };
    const v = simulatePattern(p, G).values;
    const r0 = G.rows / 2, H = G.rows - r0, Wd = G.width;
    const on = new Uint8Array(H * Wd);
    for (let i = 0; i < on.length; i++) on[i] = v[r0 * Wd + i] > 1 - (p.amount ?? 0.5);
    const seen = new Uint8Array(on.length);
    const sizes = [];
    for (let s = 0; s < on.length; s++) {
      if (!on[s] || seen[s]) continue;
      let n = 0;
      const stack = [s];
      seen[s] = 1;
      while (stack.length) {
        const q = stack.pop();
        n++;
        const i = Math.floor(q / Wd), k = q % Wd;
        for (const [ii, kk] of [[i + 1, k], [i - 1, k], [i, (k + 1) % Wd], [i, (k + Wd - 1) % Wd]]) {
          const t = ii * Wd + kk;
          if (ii >= 0 && ii < H && on[t] && !seen[t]) { seen[t] = 1; stack.push(t); }
        }
      }
      sizes.push(n);
    }
    return { count: sizes.length, largest: Math.max(0, ...sizes) / on.length };
  };
  const spots = patches('naticarius');
  assert.ok(spots.count > 60, `spots: ${spots.count}`);
  assert.ok(spots.largest < 0.005, `largest spot ${spots.largest}`);
  // Bands and flames are long connected patches
  for (const key of ['cepaea', 'nautilus']) assert.ok(patches(key).largest > 5 * spots.largest, key);
});
