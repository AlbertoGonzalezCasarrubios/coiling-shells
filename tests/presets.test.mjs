// Tests for the shape presets (js/model/presets.js): real shells in valid parts of Raup's space.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS } from '../js/model/presets.js';
import { contactD } from '../js/model/morphospace.js';
import { buildShell } from '../js/model/raup.js';

test('every shape preset has valid parameters and builds a finite shell', () => {
  for (const [key, p] of Object.entries(PRESETS)) {
    assert.ok(p.W > 1 && p.D >= 0 && p.D < 1 && p.T >= 0 && p.S > 0 && p.turns > 0, key);
    assert.ok(p.hand === 1 || p.hand === -1, key);
    const s = buildShell({ ...p, grow: 1, segPhi: 32, segPerTurn: 48, spiralLines: 0, ringsPerTurn: 0, size: 4 });
    assert.ok(s.positions.every(Number.isFinite), key);
  }
});

test('the planispiral presets have T = 0 and whorls that overlap, as in the real shells', () => {
  for (const key of ['nautilus', 'ammonite']) {
    const p = PRESETS[key];
    assert.equal(p.T, 0, key);
    assert.ok(p.D < contactD(p.W), `${key}: D < 1/W`);
  }
  // Nautilus is involute (the last whorl hides the others), the ammonite evolute:
  // its whorls only just overlap, close to the contact curve
  const gap = (key) => contactD(PRESETS[key].W) - PRESETS[key].D;
  assert.ok(gap('nautilus') > 0.2 && gap('ammonite') < 0.1);
});

test('the coiling direction of the presets is that of the real shells', () => {
  assert.equal(PRESETS.physa.hand, -1, 'Physa is sinistral');
  for (const key of ['caracol', 'turritella', 'trochus', 'peringia']) assert.equal(PRESETS[key].hand, 1, `${key} is dextral`);
  // The bivalve: a very high expansion rate and two mirrored valves
  assert.ok(PRESETS.almeja.W >= 50 && PRESETS.almeja.mirror);
});

test('the presets agree with the expansion rates measured on real shells', () => {
  // Contreras-Figueroa & Aragón (2023), Table 1: their expansion rate b is
  // ln W / 2π, measured on photographs of fossils
  const W = (b) => Math.exp(2 * Math.PI * b);
  // Nautilus aff. N. cookanum, b = 0.1816
  assert.ok(Math.abs(PRESETS.nautilus.W - W(0.1816)) / W(0.1816) < 0.05);
  // The bivalves Cucullaea, Glycymerita and Indogrammatodon, b = 0.7198–0.8031
  assert.ok(PRESETS.almeja.W >= W(0.7198) && PRESETS.almeja.W <= W(0.8031));
});
