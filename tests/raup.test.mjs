// Tests for Raup's coiling model (js/raup.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShell } from '../js/raup.js';

const base = {
  W: 2.4, D: 0.08, T: 1.6, S: 1, turns: 4.5, hand: 1, mirror: false, grow: 1,
  segPhi: 48, segPerTurn: 96, spiralLines: 16, ringsPerTurn: 24, size: 4,
};

/** Largest extent of a position array along x, y or z. */
function extent(positions) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < positions.length; k += 3) {
    for (let a = 0; a < 3; a++) {
      lo[a] = Math.min(lo[a], positions[k + a]);
      hi[a] = Math.max(hi[a], positions[k + a]);
    }
  }
  return Math.max(...hi.map((h, a) => h - lo[a]));
}

test('grid sizes, index ranges and derived quantities', () => {
  const s = buildShell(base);
  const { rows, cols, copies, count } = s.grid;
  assert.equal(rows, Math.round(base.turns * base.segPerTurn) + 1);
  assert.equal(cols, base.segPhi + 1);
  assert.equal(copies, 1);
  assert.equal(s.positions.length, count * 3);
  assert.equal(s.uvs.length, count * 2);
  assert.equal(s.indices.length, (rows - 1) * base.segPhi * 6);
  for (const i of s.indices) assert.ok(i >= 0 && i < count);
  assert.ok(s.positions.every(Number.isFinite));
  assert.deepEqual(s.derived, { rc: (1 + base.D) / 2, a: (1 - base.D) / 2, b: base.S * (1 - base.D) / 2 });
});

test('the shell is normalised to the requested size', () => {
  for (const W of [1.2, 2.4, 10, 1000]) {
    const s = buildShell({ ...base, W, size: 4 });
    assert.ok(Math.abs(extent(s.positions) - 4) < 1e-4, `W = ${W}`);
  }
});

test('the mirror valve doubles the mesh and reflects it', () => {
  const one = buildShell({ ...base, W: 1000, turns: 1 });
  const two = buildShell({ ...base, W: 1000, turns: 1, mirror: true });
  assert.equal(two.grid.copies, 2);
  assert.equal(two.positions.length, 2 * one.positions.length);
  assert.equal(two.indices.length, 2 * one.indices.length);
  const n = two.grid.count * 3;
  // Z of the copy is the reflection of Z of the original (about the shared centre)
  const z0 = two.positions[2], z1 = two.positions[n + 2];
  let zMin = Infinity, zMax = -Infinity;
  for (let k = 2; k < two.positions.length; k += 3) {
    zMin = Math.min(zMin, two.positions[k]);
    zMax = Math.max(zMax, two.positions[k]);
  }
  assert.ok(Math.abs(z0 + z1 - (zMin + zMax)) < 1e-4);
});

test('sinistral shells are mirror images of dextral ones', () => {
  const d = buildShell({ ...base, hand: 1 });
  const s = buildShell({ ...base, hand: -1 });
  for (let k = 0; k < d.positions.length; k += 3) {
    assert.ok(Math.abs(d.positions[k] - s.positions[k]) < 1e-5);
    assert.ok(Math.abs(d.positions[k + 1] - s.positions[k + 1]) < 1e-5);
  }
});

test('pattern u follows arc length along the aperture', () => {
  const uRow = (S) => {
    const s = buildShell({ ...base, S, segPhi: 8, segPerTurn: 8, turns: 1 });
    return Array.from({ length: 9 }, (_, j) => s.uvs[j * 2]);
  };
  // Circle: arc length is proportional to the angle
  uRow(1).forEach((u, j) => assert.ok(Math.abs(u - j / 8) < 1e-9));
  // Ellipse: monotonic from 0 to 1, symmetric, and different from the angle
  for (const S of [0.5, 1.4, 2]) {
    const u = uRow(S);
    assert.equal(u[0], 0);
    assert.ok(Math.abs(u[8] - 1) < 1e-12);
    for (let j = 1; j <= 8; j++) assert.ok(u[j] > u[j - 1]);
    assert.ok(Math.abs(u[2] - 0.25) < 1e-6 && Math.abs(u[4] - 0.5) < 1e-6);
    assert.ok(Math.abs(u[1] - 0.125) > 1e-3, `S = ${S}`);
  }
});

/** Smallest distance between the last whorl and the previous one (same meridian plane). */
function whorlGap(W, D, S, T) {
  const segPerTurn = 360, segPhi = 180;
  const s = buildShell({ ...base, W, D, S, T, turns: 2, segPerTurn, segPhi, size: 1 });
  const { cols, rows } = s.grid;
  const P = s.positions, last = rows - 1, prev = last - segPerTurn;
  let m = Infinity;
  for (let j = 0; j < segPhi; j++) {
    for (let k = 0; k < segPhi; k++) {
      const a = (last * cols + j) * 3, b = (prev * cols + k) * 3;
      m = Math.min(m, Math.hypot(P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]));
    }
  }
  return m;
}

test('planispiral whorls touch exactly at D = 1/W, for any aperture shape', () => {
  for (const [W, S] of [[2, 1], [2.5, 1], [3, 0.7], [1.5, 1.6]]) {
    const c = 1 / W;
    const below = whorlGap(W, c - 0.05, S, 0);
    const at = whorlGap(W, c, S, 0);
    const above = whorlGap(W, c + 0.05, S, 0);
    assert.ok(at < 2e-3, `touching at D = 1/W (W = ${W}, S = ${S}): ${at}`);
    assert.ok(below < 2e-3, `overlapping below the curve: ${below}`);
    assert.ok(above > 0.02, `separated above the curve: ${above}`);
  }
});

test('growth animation shows a fraction of the triangles', () => {
  const full = buildShell(base);
  const half = buildShell({ ...base, grow: 0.5 });
  assert.ok(half.indices.length < full.indices.length * 0.55);
  assert.ok(half.indices.length > full.indices.length * 0.45);
});
