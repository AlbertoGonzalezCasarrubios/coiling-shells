// Tests for Meinhardt's pigmentation models (js/meinhardt.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePattern, PROFILE_WIDTH, rng32 } from '../js/meinhardt.js';
import { PATTERN_PRESETS, MODEL_REFERENCE } from '../js/presets.js';

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
  const extinct = simulatePattern(preset('oliva', { b2: 0, ba: 0 }), g);
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

test('each model has a reference preset of that model', () => {
  for (const [model, key] of Object.entries(MODEL_REFERENCE)) {
    assert.equal(PATTERN_PRESETS[key].model, model);
  }
});
