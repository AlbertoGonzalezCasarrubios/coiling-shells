// Tests for the W–D morphospace (js/morphospace.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contactD, regionsAt, MORPHO_REGIONS } from '../js/morphospace.js';
import { PRESETS } from '../js/presets.js';

test('the contact curve is D = 1/W', () => {
  for (const W of [1.5, 2, 3, 10]) assert.equal(contactD(W), 1 / W);
});

test('each shape preset lies in the region of its group', () => {
  const expected = {
    caracol: 'gastropods', turritella: 'gastropods', trochus: 'gastropods', planorbis: 'gastropods',
    physa: 'gastropods', nautilus: 'ammonoids', ammonite: 'ammonoids', almeja: 'bivalves',
  };
  for (const [key, p] of Object.entries(PRESETS)) {
    // D = 0 lies on the edge of the regions, so test just inside it
    assert.ok(regionsAt(p.W, Math.max(p.D, 0.002)).includes(expected[key]), key);
  }
});

test('freely coiled forms above the contact curve lie outside the occupied regions', () => {
  // Crioceras-like shell: W = 2.5, D = 0.5 > 1/W, whorls do not touch
  assert.deepEqual(regionsAt(2.5, 0.5), []);
});

test('each region points to an existing preset and states its range of T', () => {
  for (const r of MORPHO_REGIONS) {
    assert.ok(PRESETS[r.preset], r.key);
    assert.equal(typeof r.tOk(0), 'boolean');
  }
  // Ammonoids only exist as planispiral shells; gastropods at any T
  const by = Object.fromEntries(MORPHO_REGIONS.map((r) => [r.key, r]));
  assert.equal(by.ammonoids.tOk(0), true);
  assert.equal(by.ammonoids.tOk(1.6), false);
  assert.equal(by.gastropods.tOk(6.5), true);
});
