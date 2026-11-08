// Tests for the ornament (js/ornament.js) and its mechanical model (js/mechanics.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bump, cone, growthFactor, hasOrnament, makeOrnament, ornamentResolution, ORNAMENT_DEFAULTS } from '../js/ornament.js';
import { criticalWaves, lambdaForWaves, loadRatio, firstMode, unstableBand, cordAmplitude, mechanicalCords } from '../js/mechanics.js';
import { ORNAMENT_PRESETS, PRESETS } from '../js/presets.js';
import { regionsAt } from '../js/morphospace.js';

test('bumps: centred, periodic, with a width and an asymmetry', () => {
  assert.equal(bump(0, 0.5), 1);
  assert.equal(bump(7, 0.5), 1);
  assert.equal(bump(0.3, 0.5), 0);
  assert.ok(Math.abs(bump(0.5, 1)) < 1e-12); // w = 1: a smooth wave
  // Skew > 0: steep in front (t > centre), gentle behind; same total width
  assert.ok(bump(0.1, 0.5, 0.6) < bump(-0.1, 0.5, 0.6));
  assert.equal(bump(0.11, 0.5, 0.6), 0);
  assert.ok(bump(-0.3, 0.5, 0.6) > 0);
});

test('cones and change with growth', () => {
  assert.equal(cone(0), 1);
  assert.equal(cone(1), 0);
  assert.equal(cone(0.25), 0.75);
  assert.equal(growthFactor(0, 0.3), 1);
  assert.equal(growthFactor(-1, 1), 0); // fades completely at the aperture
  assert.equal(growthFactor(-1, 0), 2);
  assert.equal(growthFactor(1, 0), 0);  // absent at the apex
});

test('no relief unless some term is switched on', () => {
  assert.ok(!hasOrnament(ORNAMENT_DEFAULTS));
  assert.ok(hasOrnament({ ...ORNAMENT_DEFAULTS, keelH: 0.1 }));
  assert.ok(hasOrnament({ ...ORNAMENT_DEFAULTS, spineN: 6 }));
  assert.ok(!hasOrnament({ ...ORNAMENT_DEFAULTS, spineN: 6, spineH: 0 }));
  assert.deepEqual(ornamentResolution(ORNAMENT_DEFAULTS), { perTurn: 0, phi: 0 });
});

/** Geometry of a circular aperture sampled in `cols` columns. */
function geometry(cols = 65) {
  const cosPhi = new Float64Array(cols), sinPhi = new Float64Array(cols), arcU = new Float64Array(cols);
  for (let j = 0; j < cols; j++) {
    const phi = (j / (cols - 1)) * 2 * Math.PI;
    cosPhi[j] = Math.cos(phi); sinPhi[j] = Math.sin(phi); arcU[j] = j / (cols - 1);
  }
  return { a: 0.45, b: 0.45, rc: 0.55, cols, cosPhi, sinPhi, arcU, perimeter: 2 * Math.PI };
}

test('spines rise at their positions and nowhere else', () => {
  const g = geometry();
  const o = makeOrnament({ spineN: 4, spineH: 0.8, spineW: 0.4, spinePos: 0 }, g);
  assert.ok(o.active);
  // On a spine (θ = 0, u = 0): full length; between spines or away from the row: nothing
  assert.ok(Math.abs(o.delta(0, 0.5, 0) - 0.8) < 1e-9);
  assert.equal(o.delta(Math.PI / 4, 0.5, 0), 0);
  assert.equal(o.delta(0, 0.5, 32), 0);
  // Two symmetric rows
  const two = makeOrnament({ spineN: 4, spineH: 0.8, spineW: 0.4, spinePos: 0.25, spineBoth: true }, g);
  assert.ok(two.delta(0, 0.5, 16) > 0.79 && two.delta(0, 0.5, 48) > 0.79);
  assert.equal(two.delta(0, 0.5, 0), 0);
});

test('nodules only where ribs and cords cross; keel at its position', () => {
  const g = geometry();
  const o = makeOrnament({ ribN: 4, ribH: 0.1, ribW: 0.3, cordN: 4, cordH: 0.1, cordW: 0.3, nodules: true }, g);
  assert.ok(Math.abs(o.delta(0, 0.5, 0) - 0.2) < 1e-9);       // crossing
  assert.equal(o.delta(0, 0.5, 8), 0);                         // on a rib, between cords
  const k = makeOrnament({ keelH: 0.2, keelW: 0.1, keelPos: 0.25 }, g);
  assert.ok(Math.abs(k.delta(1, 0.5, 16) - 0.2) < 1e-9);
  assert.equal(k.delta(1, 0.5, 0), 0);
});

test('mechanics: the critical load is the minimum, at n* waves', () => {
  for (const n of [3, 9, 20]) {
    const L = lambdaForWaves(n);
    assert.ok(Math.abs(criticalWaves(L) - n) < 1e-9);
    assert.ok(Math.abs(loadRatio(n, L) - 1) < 1e-12);
    assert.ok(loadRatio(n - 1, L) > 1 && loadRatio(n + 1, L) > 1);
    assert.equal(firstMode(L), n);
  }
  // Non-integer optimum: the whole number with the lowest load
  const L = lambdaForWaves(7.4);
  assert.equal(firstMode(L), 7);
});

test('mechanics: threshold, unstable band and amplitude', () => {
  const L = lambdaForWaves(10);
  assert.equal(unstableBand(L, 0.9), null);
  const band = unstableBand(L, 1.5);
  assert.ok(band.from < 10 && band.to > 10);
  assert.ok(Math.abs(loadRatio(band.from, L) - 1.5) < 1e-9 && Math.abs(loadRatio(band.to, L) - 1.5) < 1e-9);
  assert.equal(cordAmplitude(0.8), 0);
  assert.ok(Math.abs(cordAmplitude(2) - 0.08) < 1e-12);
  assert.deepEqual(mechanicalCords(L, 0.5), { cordN: 0, cordH: 0, cordW: 1 });
  assert.equal(mechanicalCords(L, 2).cordN, 10);
});

test('ornamented presets use real shapes inside the morphospace', () => {
  for (const [key, p] of Object.entries(ORNAMENT_PRESETS)) {
    if (!p.shape) continue;
    for (const k of ['W', 'D', 'T', 'S', 'turns', 'hand', 'mirror']) assert.ok(k in p.shape, `${key}.${k}`);
    assert.ok(regionsAt(p.shape.W, Math.max(p.shape.D, 0.002)).length > 0, key);
    assert.ok(hasOrnament({ ...ORNAMENT_DEFAULTS, ...p.orn }), key);
  }
  assert.ok(PRESETS.ammonite && PRESETS.almeja);
});
