// Tests for the image export helpers (js/imagefile.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { encodeTIFF, fitFrame, slugify, plateLayout, FIXED_SIZES, MAX_SIDE } from '../js/imagefile.js';

/** Minimal reader for the TIFF files written by encodeTIFF. */
function readTIFF(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), 'II');
  assert.equal(v.getUint16(2, true), 42);
  const ifd = v.getUint32(4, true);
  const n = v.getUint16(ifd, true);
  const tags = {};
  let last = 0;
  for (let k = 0; k < n; k++) {
    const p = ifd + 2 + 12 * k;
    const tag = v.getUint16(p, true), type = v.getUint16(p + 2, true), count = v.getUint32(p + 4, true);
    assert.ok(tag > last, 'tags in ascending order');
    last = tag;
    const value = type === 3 && count === 1 ? v.getUint16(p + 8, true) : v.getUint32(p + 8, true);
    const many = (at) => Array.from({ length: count }, (_, i) => v.getUint32(at + 4 * i, true));
    tags[tag] = count > 1 && type === 4 ? many(value) : count > 1 && type === 3
      ? Array.from({ length: count }, (_, i) => v.getUint16(value + 2 * i, true)) : value;
  }
  const width = tags[256], height = tags[257];
  const offsets = [].concat(tags[273]), counts = [].concat(tags[279]);
  assert.deepEqual(tags[258], [8, 8, 8]);
  assert.equal(tags[259], 8);
  assert.equal(tags[317], 2);
  const rgb = new Uint8Array(width * height * 3);
  let o = 0;
  for (let s = 0; s < offsets.length; s++) {
    const raw = inflateSync(bytes.subarray(offsets[s], offsets[s] + counts[s]));
    for (let r = 0; r < raw.length; r += width * 3) {
      // Undo the horizontal predictor
      for (let x = 0; x < width * 3; x++) rgb[o + x] = (raw[r + x] + (x >= 3 ? rgb[o + x - 3] : 0)) & 255;
      o += width * 3;
    }
  }
  assert.equal(o, rgb.length);
  return { width, height, rgb };
}

test('TIFF round trip: flat areas, noise and several strips', async () => {
  for (const [w, h] of [[1, 1], [7, 3], [300, 5], [400, 700]]) {
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const flat = i % w < w / 2;
      rgba[4 * i] = flat ? 200 : (i * 37) & 255;
      rgba[4 * i + 1] = flat ? 180 : (i * 91) & 255;
      rgba[4 * i + 2] = flat ? 160 : (i * 13) & 255;
      rgba[4 * i + 3] = 255;
    }
    const img = readTIFF(await encodeTIFF(w, h, rgba));
    assert.equal(img.width, w);
    assert.equal(img.height, h);
    for (let i = 0; i < w * h; i++) {
      for (let c = 0; c < 3; c++) assert.equal(img.rgb[3 * i + c], rgba[4 * i + c]);
    }
  }
});

test('TIFF compresses a flat coloured background', async () => {
  const w = 1000, h = 50;
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) rgba.set([244, 240, 230, 255], 4 * i);
  assert.ok((await encodeTIFF(w, h, rgba)).length < (w * h * 3) / 50);
});

test('a wider or taller image keeps the whole screen view', () => {
  // Same aspect: nothing changes
  assert.deepEqual(fitFrame(35, 1.5, 1.5), { fov: 35, scale: 1 });
  // Wider: same vertical field
  assert.equal(fitFrame(35, 1.5, 16 / 9).fov, 35);
  // Taller: the horizontal field is kept, so the vertical one grows
  const tall = fitFrame(35, 1.5, 9 / 16);
  const tan = (deg) => Math.tan((deg * Math.PI) / 360);
  assert.ok(Math.abs(tan(tall.fov) * (9 / 16) - tan(35) * 1.5) < 1e-12);
  assert.ok(tall.scale < 1);
});

test('the plate of views fits any format', () => {
  // Landscape screens: three columns; portrait phones: two; very long strips: one row or column
  assert.equal(plateLayout(3840, 2160).cols, 3);
  assert.equal(plateLayout(1080, 1920).cols, 2);
  assert.equal(plateLayout(6000, 900).cols, 6);
  assert.equal(plateLayout(500, 5000).cols, 1);
  for (const [W, H] of [[3840, 2160], [1080, 1920], [2048, 2048], [3440, 1440], [1290, 2796]]) {
    const { cols, rows, tile, x0, y0 } = plateLayout(W, H);
    const gridH = rows * (tile + Math.round(tile * 0.1));
    assert.ok(x0 >= 0 && y0 >= 0, `${W}x${H}`);
    assert.ok(x0 + cols * tile <= W && y0 + gridH <= H, `${W}x${H}`);
    assert.equal(cols * rows, 6);
  }
});

test('file names from free text', () => {
  assert.equal(slugify('Mi caracol rosa'), 'Mi_caracol_rosa');
  assert.equal(slugify('  Ñandú/«concha»  '), 'Nandu_concha');
  assert.equal(slugify('***'), '');
});

test('fixed sizes stay within the largest side', () => {
  for (const s of FIXED_SIZES) assert.ok(Math.max(s.w, s.h) <= MAX_SIDE, s.key);
});
