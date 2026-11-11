// Tests for the "match the shell" challenge (js/model/challenge.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID,
  LEVELS,
  PASS,
  bestHint,
  levelScore,
  makeTarget,
  overlap,
  scoreFromOverlap,
  silhouettes,
  startShell,
} from '../js/model/challenge.js';
import { ORNAMENT_DEFAULTS } from '../js/model/ornament.js';
import { ORNAMENT_PRESETS, PRESETS } from '../js/model/presets.js';

const SHAPES = ['caracol', 'turritella', 'trochus', 'planorbis', 'physa', 'peringia', 'nautilus', 'ammonite'];
const shape = (k) => {
  const { W, D, T, S, turns, hand, mirror } = PRESETS[k];
  return { ...ORNAMENT_DEFAULTS, W, D, T, S, turns, hand, mirror };
};
const score = (a, b) => scoreFromOverlap(overlap(silhouettes(a), silhouettes(b)));
const seeded = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test('silhouettes: three filled views of the normalised shell', () => {
  const sil = silhouettes(shape('caracol'));
  assert.equal(sil.length, 3);
  for (const view of sil) {
    assert.equal(view.length, GRID * GRID);
    const filled = view.reduce((n, v) => n + v, 0) / view.length;
    // The largest dimension spans the grid, so a view is well filled but not full
    assert.ok(filled > 0.15 && filled < 0.95, `filled ${filled}`);
  }
  // A sinistral shell is the mirror image of the dextral one
  const d = silhouettes(shape('caracol')),
    s = silhouettes({ ...shape('caracol'), hand: -1 });
  assert.ok(overlap(d, s) < 1, 'the coiling direction changes the silhouette');
});

test('the score: 100 for the same shell, high for near matches, low for other groups', () => {
  for (const k of SHAPES) assert.equal(score(shape(k), shape(k)), 100, k);
  // Near matches: one parameter slightly off
  for (const k of SHAPES) {
    const s = shape(k);
    assert.ok(score({ ...s, W: s.W * 1.03 }, s) >= 65, `${k} W +3 %`);
    assert.ok(score({ ...s, D: s.D + 0.02 }, s) >= 75, `${k} D + 0.02`);
  }
  // Shells of different groups: a tower against a planispiral, a snail against a tower
  assert.ok(score(shape('turritella'), shape('ammonite')) < 10);
  assert.ok(score(shape('turritella'), shape('caracol')) < 10);
  assert.ok(score(shape('planorbis'), shape('physa')) < 30);
  // Monotonic in the mismatch
  assert.ok(scoreFromOverlap(0.99) > scoreFromOverlap(0.95) && scoreFromOverlap(0.95) > scoreFromOverlap(0.8));
  assert.equal(scoreFromOverlap(0.4), 0);
});

test('the relief level scores the relief itself, not the outline', () => {
  const p = ORNAMENT_PRESETS.epitonium;
  const t = { ...ORNAMENT_DEFAULTS, ...p.shape, ...p.orn };
  const keys = LEVELS[4].keys;
  assert.equal(levelScore(5, t, t), 100);
  // The smooth shell has nearly the same outline, but not the same relief
  assert.ok(score({ ...t, ribN: 0 }, t) > 70, 'silhouettes barely see the ribs');
  assert.ok(levelScore(5, { ...t, ribN: 0 }, t) < 60, 'the relief score does');
  assert.ok(levelScore(5, { ...t, ribN: t.ribN + 1 }, t) >= PASS, 'one rib more is still a match');
  assert.ok(levelScore(5, { ...t, ribN: t.ribN + 4 }, t) < PASS);
  assert.equal(bestHint({ ...t, ribN: t.ribN + 4 }, t, keys).key, 'ribN');
});

test('every level starts away from its target', () => {
  for (const L of LEVELS) {
    const targets = L.ornament
      ? Object.keys(ORNAMENT_PRESETS)
          .filter((k) => ORNAMENT_PRESETS[k].shape)
          .map((k) => ({ ...ORNAMENT_DEFAULTS, ...ORNAMENT_PRESETS[k].shape, ...ORNAMENT_PRESETS[k].orn }))
      : SHAPES.map(shape);
    for (const t of targets) {
      const start = startShell(L.id, t);
      assert.ok(bestHint(start, t, L.keys), `level ${L.id}: there is something to change`);
      assert.ok(levelScore(L.id, start, t) < PASS, `level ${L.id}: the start does not pass already`);
      // Only the free parameters differ
      for (const k of Object.keys(t)) if (!L.keys.includes(k)) assert.equal(start[k], t[k], `level ${L.id}: ${k} is given`);
    }
  }
});

test('following the hints with the sliders always passes the level', () => {
  // A player who moves the hinted parameter one slider step at a time
  const STEP = { D: 0.005, T: 0.05, S: 0.01, turns: 0.25, ribN: 1, ribH: 0.01, cordN: 1, cordH: 0.01, spineN: 1, spineH: 0.01 };
  const snap = (k, v) => (k === 'W' ? +v.toFixed(2) : Math.round(v / STEP[k]) * STEP[k]);
  const rand = seeded(3);
  for (const L of LEVELS) {
    for (let i = 0; i < 12; i++) {
      const { name, shell: target } = makeTarget(L.id, rand);
      let g = startShell(L.id, target);
      for (const k of L.keys) if (k !== 'hand') g[k] = snap(k, g[k]);
      let steps = 0;
      for (let h = bestHint(g, target, L.keys); h && steps < 3000; h = bestHint(g, target, L.keys), steps++) {
        const sign = h.dir === 'up' ? 1 : -1;
        const v = h.key === 'hand' ? -g.hand : h.key === 'W' ? g.W + sign * 0.01 : g[h.key] + sign * STEP[h.key];
        g = { ...g, [h.key]: h.key === 'hand' ? v : snap(h.key, v) };
      }
      assert.equal(bestHint(g, target, L.keys), null, `level ${L.id} ${name}: the hints come to an end`);
      assert.ok(levelScore(L.id, g, target) >= PASS, `level ${L.id} ${name}: ${levelScore(L.id, g, target)}`);
    }
  }
});

test('targets: real shells, sometimes varied within their kind', () => {
  const rand = seeded(9);
  let varied = 0;
  for (let i = 0; i < 40; i++) {
    const level = 1 + (i % 4);
    const t = makeTarget(level, rand);
    assert.ok(SHAPES.includes(t.name));
    const real = shape(t.name);
    if (t.varied) varied++;
    else assert.deepEqual(t.shell, real);
    assert.ok(Math.abs(Math.log(t.shell.W / real.W)) < Math.log(1.16) && t.shell.W > 1.1);
    assert.ok(t.shell.D >= 0 && t.shell.D <= 0.6);
  }
  assert.ok(varied > 5 && varied < 35, `${varied} variants of 40`);
  const orn = makeTarget(5, rand);
  assert.ok(ORNAMENT_PRESETS[orn.name]?.shape, 'the last level uses ornamented shells');
});
