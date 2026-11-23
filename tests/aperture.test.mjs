// Tests for the siphonal canal (js/model/aperture.js) and its place in the shell (raup.js, export3d.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CANAL_DEFAULTS, apertureCurve, bendCanal, canalOutline } from '../js/model/aperture.js';
import { buildShell } from '../js/model/raup.js';
import { buildPrintMesh, checkClosed, signedVolume } from '../js/export/export3d.js';
import { PRESETS } from '../js/model/presets.js';

const base = {
  W: 1.7,
  D: 0.02,
  T: 3.5,
  S: 1.4,
  turns: 8,
  hand: 1,
  mirror: false,
  grow: 1,
  segPhi: 64,
  segPerTurn: 96,
  spiralLines: 16,
  ringsPerTurn: 24,
  size: 4,
};
const g = { a: 0.49, b: 0.69, rc: 0.51, segPhi: 64 };

test('without a canal the shell is exactly the same', () => {
  const plain = buildShell(base);
  const zero = buildShell({ ...base, ...CANAL_DEFAULTS });
  assert.deepEqual(zero.positions, plain.positions);
  assert.deepEqual(zero.uvs, plain.uvs);
  assert.deepEqual(zero.indices, plain.indices);
});

test('the outline is the ellipse above and a canal below, with its inner wall on the axis', () => {
  const L = 3,
    w = 0.6;
  const o = canalOutline({ canalL: L, canalW: w, canalNarrow: 0 }, g);
  // It starts at the periphery of the ellipse
  assert.ok(Math.abs(o.r[0] - (g.rc + g.a)) < 1e-9 && Math.abs(o.z[0]) < 1e-9);
  // Its top, level with the base of the ellipse, and its length
  assert.equal(o.top, -g.b);
  assert.ok(Math.abs(o.ell - L * g.a) < 1e-12);
  // Below the top, every point lies between the axis and the outer wall
  const low = o.z.map((z, k) => [o.r[k], z]).filter(([, z]) => z < o.top - 1e-9);
  assert.ok(low.length > 0);
  for (const [r] of low) assert.ok(r >= 0 && r <= w * g.a + 1e-9);
  // Both walls are there, all along: on the axis and at the canal's width
  assert.ok(low.filter(([r]) => r < 1e-9).length > 100);
  assert.ok(low.filter(([r]) => Math.abs(r - w * g.a) < 1e-9).length > 100);
  // The tip: a half-circle below the canal
  const zMin = Math.min(...o.z);
  assert.ok(Math.abs(zMin - (o.top - o.ell - (w * g.a) / 2)) < 1e-3);
  // The columns follow the arc length, and their normals are unit vectors
  const c = apertureCurve({ canalL: L, canalW: w }, g);
  for (let j = 1; j <= g.segPhi; j++) assert.ok(c.arcU[j] > c.arcU[j - 1]);
  for (let j = 0; j < g.segPhi; j++) assert.ok(Math.abs(Math.hypot(c.nR[j], c.nZ[j]) - 1) < 1e-9);
  // At the periphery the normal points outwards
  assert.ok(c.nR[0] > 0.99);
});

test('the shoulder sets how high the body whorl starts to taper into the canal', () => {
  // Width of the outline at a height in the lower half of the aperture
  const widthAt = (h, z) => {
    const o = canalOutline({ canalL: 2, canalW: 0.6, canalTaper: h }, g);
    let best = 0;
    for (let k = 1; k < o.z.length; k++) {
      if ((o.z[k - 1] - z) * (o.z[k] - z) <= 0) best = Math.max(best, o.r[k]);
    }
    return best;
  };
  const z = -0.6 * g.b;
  assert.ok(widthAt(1, z) < widthAt(0, z) - 0.05, 'a high shoulder makes a cone');
  // The upper half of the aperture is untouched
  assert.ok(Math.abs(widthAt(1, 0.5 * g.b) - widthAt(0, 0.5 * g.b)) < 1e-6);
});

test('the canal narrows towards its tip by the narrowing', () => {
  const outerNear = (n, depth) => {
    const o = canalOutline({ canalL: 3, canalW: 0.6, canalNarrow: n }, g);
    const z = o.top - depth * o.ell;
    let best = 0;
    for (let k = 1; k < o.z.length; k++) if ((o.z[k - 1] - z) * (o.z[k] - z) <= 0) best = Math.max(best, o.r[k]);
    return best;
  };
  assert.ok(outerNear(0.8, 0.95) < 0.5 * outerNear(0, 0.95));
  assert.ok(Math.abs(outerNear(0.8, 0.02) - outerNear(0, 0.02)) < 0.05 * g.a);
});

test('a closed canal turns its outer wall forwards, its inner wall not at all, and not the body', () => {
  const o = canalOutline({ canalL: 3, canalW: 0.6, canalOpen: 0, canalNarrow: 0.5 }, g);
  const wall = (pred) => o.t.filter((_, k) => o.z[k] < o.top - 0.1 && pred(o.r[k], k));
  const outer = wall((r) => r > 0.05);
  const inner = wall((r) => r === 0);
  assert.ok(outer.length && inner.length);
  // The outer wall: the same turn all along the canal, though it narrows (no twist)
  const straight = o.t.filter((_, k) => o.z[k] < o.top - 0.1 && o.z[k] > o.top - o.ell + 0.1 && o.r[k] > 0.05);
  assert.ok(Math.max(...straight) - Math.min(...straight) < 1e-9);
  assert.ok(straight[0] > 1.5);
  for (const t of inner) assert.equal(t, 0);
  // Above the top of the canal, the ellipse does not turn
  for (let k = 0; k < o.z.length; k++) if (o.z[k] > 0) assert.equal(o.t[k], 0);
  // An open canal does not turn at all
  const open = canalOutline({ canalL: 3, canalW: 0.6, canalOpen: 1 }, g);
  assert.ok(open.t.every((t) => t === 0));
});

test('the canal is the lowest part of the shell, below the aperture along the axis', () => {
  const plain = buildShell({ ...base, spiralLines: 0, ringsPerTurn: 0 });
  const shell = buildShell({ ...base, spiralLines: 0, ringsPerTurn: 0, canalL: 3, canalW: 0.6 });
  // Taller for its width than the shell without it (both are normalised to the same size)
  const shape = (s) => {
    let x0 = Infinity,
      x1 = -Infinity;
    for (let k = 0; k < s.positions.length; k += 3) {
      x0 = Math.min(x0, s.positions[k]);
      x1 = Math.max(x1, s.positions[k]);
    }
    return (s.axis.yTop - s.axis.yBottom) / (x1 - x0);
  };
  assert.ok(shape(shell) > shape(plain));
  // Its lowest point lies close to the coiling axis
  const lowest = (s) => {
    let low = Infinity,
      k0 = 0;
    for (let k = 0; k < s.positions.length; k += 3) {
      if (s.positions[k + 1] < low) {
        low = s.positions[k + 1];
        k0 = k;
      }
    }
    return [s.positions[k0] - s.axis.x, s.positions[k0 + 2] - s.axis.z];
  };
  const [dx, dz] = lowest(shell);
  assert.ok(Math.hypot(dx, dz) < 0.05 * base.size, `tip ${Math.hypot(dx, dz)} from the axis`);
  // Bent back, the tip moves away from the aperture (against the growth at θ = 0, −z when dextral)
  const bent = buildShell({ ...base, spiralLines: 0, ringsPerTurn: 0, canalL: 3, canalW: 0.6, canalBend: 0.4 });
  assert.ok(lowest(bent)[1] < dz - 0.1);
});

test('the bend leaves the shell above the canal untouched and moves the tip by β·ℓ', () => {
  assert.equal(bendCanal(1, 0, 2, 0.5), 0);
  assert.equal(bendCanal(0, 0, 2, 0.5), 0);
  assert.ok(Math.abs(bendCanal(-2, 0, 2, 0.5) - 1) < 1e-12);
  assert.equal(bendCanal(-2, 0, 2, 0), 0);
});

test('a notch moves only the margin at the canal back along the spiral', () => {
  const plain = canalOutline({ canalL: 0.2, canalW: 1 }, g);
  const cut = canalOutline({ canalL: 0.2, canalW: 1, canalNotch: 0.7 }, g);
  // The outline is the same; only its points along the canal are moved back along the spiral
  assert.deepEqual(cut.r, plain.r);
  assert.deepEqual(cut.z, plain.z);
  assert.ok(plain.back.every((d) => d === 0));
  const deepest = Math.min(...cut.back);
  assert.ok(Math.abs(deepest + 0.7 * 0.5 * Math.PI) < 1e-12);
  assert.ok(cut.back.every((d) => d <= 0));
  // Fully on the canal, nothing on the top of the aperture
  for (let k = 0; k < cut.z.length; k++) {
    if (cut.z[k] < cut.top - 1e-9) assert.equal(cut.back[k], deepest);
    if (cut.z[k] > 0) assert.equal(cut.back[k], 0);
  }
  // In the shell, the last ring (the rim of the aperture) at the canal is where the
  // uncut margin was earlier in its growth: higher up, as the shell grows downwards
  const shape = { ...base, spiralLines: 0, ringsPerTurn: 0, canalL: 0.2, canalW: 1 };
  // (both are normalised to the same size: the cut shell is less tall for its width)
  const tallness = (s) => {
    let x0 = Infinity,
      x1 = -Infinity;
    for (let k = 0; k < s.positions.length; k += 3) {
      x0 = Math.min(x0, s.positions[k]);
      x1 = Math.max(x1, s.positions[k]);
    }
    return (s.axis.yTop - s.axis.yBottom) / (x1 - x0);
  };
  const b = buildShell({ ...shape, canalNotch: 0.7 });
  assert.ok(b.positions.every(Number.isFinite));
  assert.ok(tallness(b) < tallness(buildShell(shape)));
  // A notch alone, without a canal, still makes the shell take the outline
  assert.ok(buildShell({ ...base, canalNotch: 0.5 }).grid.cols - 1 >= 64);
});

test('the canal presets keep their canal, and the columns grow with its length', () => {
  for (const key of ['buccinum', 'fusinus', 'busycon', 'ficus', 'tibia']) {
    assert.ok(PRESETS[key].canalL > 0, key);
  }
  assert.ok(PRESETS.nucella.canalNotch > 0 && !PRESETS.nucella.canalL);
  const s = buildShell({ ...base, ...PRESETS.fusinus, segPhi: 64 });
  assert.ok(s.grid.cols - 1 > 64);
  assert.equal((s.grid.cols - 1) % 4, 0);
});

test('shells with a canal print as closed solids, from a short notch to a long, bent, closed tube', () => {
  const canals = [
    { canalL: 0.6, canalW: 0.8, canalOpen: 1, canalBend: 0.4 },
    { canalL: 3, canalW: 0.6, canalOpen: 0.5, canalNarrow: 0.4, canalTaper: 0.9 },
    { canalL: 5, canalW: 0.4, canalOpen: 0, canalNarrow: 0.8, canalBend: -0.3 },
    { canalL: 0, canalNotch: 1, canalW: 1.2, canalTaper: 0.4, canalNarrow: 0.8 },
    { canalL: 0.3, canalNotch: 0.6, canalW: 1, canalOpen: 0.5, canalBend: 0.3 },
  ];
  for (const key of ['caracol', 'turritella', 'physa']) {
    for (const c of canals) {
      const mesh = buildPrintMesh({ ...PRESETS[key], ...c }, { size: 80, wall: 1.2 });
      const label = `${key} ${JSON.stringify(c)}`;
      assert.equal(checkClosed(mesh), 0, `${label}: closed`);
      assert.ok(signedVolume(mesh) > 0, `${label}: outward`);
      assert.ok(mesh.positions.every(Number.isFinite), `${label}: finite`);
      assert.ok(Math.abs(Math.max(...mesh.dims) - 80) < 1e-3, `${label}: exact size`);
    }
  }
});
