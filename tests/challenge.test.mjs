// Tests for the "match the shell" challenge (js/model/challenge.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID,
  LEVELS,
  passScore,
  colourScore,
  bestHint,
  levelScore,
  makeTarget,
  overlap,
  scoreFromOverlap,
  silhouettes,
  startShell,
} from '../js/model/challenge.js';
import { ORNAMENT_DEFAULTS } from '../js/model/ornament.js';
import { ORNAMENT_PRESETS, PATTERN_PRESETS, PRESETS } from '../js/model/presets.js';

const SHAPES = ['caracol', 'turritella', 'trochus', 'planorbis', 'physa', 'peringia', 'nautilus', 'ammonite'];
const shape = (k) => {
  const { W, D, T, S, turns, hand, mirror } = PRESETS[k];
  return { ...ORNAMENT_DEFAULTS, W, D, T, S, turns, hand, mirror };
};
const score = (a, b) => scoreFromOverlap(overlap(silhouettes(a), silhouettes(b)));
const makeTargetFor = (kind) => {
  const p = PATTERN_PRESETS[kind];
  return {
    ...shape('caracol'),
    patternPreset: kind,
    patternSize: p.size ?? 1,
    patternT: p.T,
    patternNoise: p.noise,
    patternAmount: p.amount ?? 0.5,
    patternBase: p.base,
    patternPigment: p.pigment,
  };
};
/** A colour a fraction k of the way from a to b (a player nudging a colour picker). */
const mix = (a, b, k) => {
  const c = [1, 3, 5].map((i) => {
    const x = parseInt(a.slice(i, i + 2), 16),
      y = parseInt(b.slice(i, i + 2), 16);
    return Math.round(x + (y - x) * k + Math.sign(y - x));
  });
  return '#' + c.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
};
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
  assert.ok(levelScore(5, { ...t, ribN: t.ribN + 1 }, t) >= passScore(5), 'one rib more is still a match');
  assert.ok(levelScore(5, { ...t, ribN: t.ribN + 4 }, t) < passScore(5));
  assert.equal(bestHint({ ...t, ribN: t.ribN + 4 }, t, keys).key, 'ribN');
  // Without ribs their height means nothing: the hint asks for the ribs first
  assert.equal(bestHint({ ...t, ribN: 0, ribH: 0.4 }, t, keys).key, 'ribN');
  // With the shape free too, both must be right
  assert.equal(levelScore(6, t, t), 100);
  assert.ok(levelScore(6, { ...t, ribN: 0 }, t) < passScore(6), 'the right shape without the relief does not pass');
  assert.ok(levelScore(6, { ...t, W: t.W * 1.4 }, t) < passScore(6), 'the right relief on another shape does not pass');
});

test('the colour level: the kind of pattern first, then its controls', () => {
  const t = makeTargetFor('cepaea');
  assert.equal(colourScore(t, t), 100);
  assert.ok(colourScore({ ...t, patternPreset: 'nautilus' }, t) <= 35, 'another kind of pattern scores low');
  assert.ok(colourScore({ ...t, patternSize: 1.15 }, t) >= 90, 'a slightly larger pattern still matches');
  assert.ok(colourScore({ ...t, patternSize: 2, patternT: 6000 }, t) < passScore(7));
  // Colours count: other colours on the right pattern do not pass
  assert.ok(colourScore({ ...t, patternBase: '#f2d9d6', patternPigment: '#7a3550' }, t) < passScore(7));
  assert.ok(colourScore({ ...t, patternBase: '#efcc5e' }, t) >= 95, 'a nearly identical colour still matches');
  const dark = bestHint({ ...t, patternPigment: '#bbbbbb' }, t, LEVELS[6].keys);
  assert.equal(dark.key, 'patternPigment');
  assert.equal(dark.dir, 'darker');
  // The last level judges shape, relief and colour together
  const all = { ...t, ...ORNAMENT_DEFAULTS, ...ORNAMENT_PRESETS.cerithium.shape, ...ORNAMENT_PRESETS.cerithium.orn };
  assert.equal(levelScore(8, all, all), 100);
  assert.ok(levelScore(8, { ...all, patternPreset: 'nautilus' }, all) < passScore(8), 'everything but the colour does not pass');
  assert.ok(levelScore(8, { ...all, ribN: 0 }, all) < passScore(8), 'everything but the relief does not pass');
  assert.equal(bestHint({ ...t, patternPreset: 'nautilus', patternSize: 2 }, t, LEVELS[6].keys).key, 'patternPreset');
  assert.equal(
    bestHint({ ...t, patternPreset: 'nautilus', patternBase: '#ff9900' }, t, LEVELS[6].keys).key,
    'patternPreset',
    'the kind before the colours',
  );
});

test('every level starts away from its target', () => {
  for (const L of LEVELS) {
    const rand = seeded(17);
    const targets = Array.from({ length: 12 }, () => makeTarget(L.id, rand).shell);
    for (const t of targets) {
      const start = startShell(L.id, t);
      assert.ok(bestHint(start, t, L.keys), `level ${L.id}: there is something to change`);
      assert.ok(levelScore(L.id, start, t) < passScore(L.id), `level ${L.id}: the start does not pass already`);
      // Only the free parameters differ
      for (const k of Object.keys(t)) if (!L.keys.includes(k)) assert.equal(start[k], t[k], `level ${L.id}: ${k} is given`);
    }
  }
});

test('following the hints with the sliders always passes the level', () => {
  // A player who moves the hinted parameter one slider step at a time
  const STEP = {
    D: 0.005,
    T: 0.05,
    S: 0.01,
    turns: 0.25,
    ribN: 1,
    ribH: 0.01,
    cordN: 1,
    cordH: 0.01,
    spineN: 1,
    spineH: 0.01,
    patternNoise: 0.01,
    patternAmount: 0.01,
  };
  // W, the pattern size and the growth time move by small relative steps, like their sliders
  const REL = { W: 0.005, patternSize: 0.01, patternT: 0.005 };
  const kinds = Object.keys(PATTERN_PRESETS);
  // (the W slider switches to a logarithmic scale above 10, so its steps are relative)
  const snap = (k, v) => (REL[k] ? v : Math.round(v / STEP[k]) * STEP[k]);
  const rand = seeded(3);
  for (const L of LEVELS) {
    for (let i = 0; i < 12; i++) {
      const { name, shell: target } = makeTarget(L.id, rand);
      let g = startShell(L.id, target);
      for (const k of L.keys) if (!['hand', 'patternPreset', 'patternBase', 'patternPigment'].includes(k)) g[k] = snap(k, g[k]);
      let steps = 0;
      for (let h = bestHint(g, target, L.keys); h && steps < 3000; h = bestHint(g, target, L.keys), steps++) {
        const sign = h.dir === 'up' ? 1 : -1;
        let v;
        if (h.key === 'hand') v = -g.hand;
        else if (h.key === 'patternPreset') v = kinds[(kinds.indexOf(g.patternPreset) + 1) % kinds.length];
        else if (h.key === 'patternBase' || h.key === 'patternPigment') v = mix(g[h.key], target[h.key], 0.25);
        else if (REL[h.key]) v = g[h.key] * (1 + sign * REL[h.key]);
        else v = snap(h.key, g[h.key] + sign * STEP[h.key]);
        g = { ...g, [h.key]: v };
      }
      assert.equal(bestHint(g, target, L.keys), null, `level ${L.id} ${name}: the hints come to an end`);
      assert.ok(levelScore(L.id, g, target) >= passScore(L.id), `level ${L.id} ${name}: ${levelScore(L.id, g, target)}`);
    }
  }
});

test('targets: real shells, sometimes varied within their kind', () => {
  const rand = seeded(9);
  let varied = 0;
  for (let i = 0; i < 40; i++) {
    const level = 1 + (i % 3);
    const t = makeTarget(level, rand);
    assert.ok(SHAPES.includes(t.name));
    const real = shape(t.name);
    if (t.varied) varied++;
    else assert.deepEqual(t.shell, real);
    assert.ok(Math.abs(Math.log(t.shell.W / real.W)) < Math.log(1.21) && t.shell.W > 1.1);
    assert.ok(t.shell.D >= 0 && t.shell.D <= 0.6);
  }
  assert.ok(varied > 5 && varied < 35, `${varied} variants of 40`);
  // Harder levels: level 4 always varies its target, and further
  for (let i = 0; i < 10; i++) assert.equal(makeTarget(4, rand).varied, true);
  assert.ok(
    LEVELS.every((L, i) => i === 0 || L.pass >= LEVELS[i - 1].pass),
    'the pass score never goes down',
  );
  for (const k of [5, 6]) assert.ok(ORNAMENT_PRESETS[makeTarget(k, rand).name]?.shape, `level ${k} uses ornamented shells`);
  for (let i = 0; i < 20; i++) assert.ok(makeTarget(6, rand).shell.W < 10, 'level 6 leaves bivalves out');
  const c = makeTarget(7, rand);
  assert.ok(PATTERN_PRESETS[c.shell.patternPreset], 'the colour level uses a pattern preset');
  const e = makeTarget(8, rand);
  assert.ok(ORNAMENT_PRESETS[e.name] && PATTERN_PRESETS[e.pattern], 'the last level has a shape, a relief and a pattern');
  assert.deepEqual([...new Set(LEVELS.map((L) => L.block))], ['shape', 'ornament', 'colour'], 'three blocks, in order');
});
