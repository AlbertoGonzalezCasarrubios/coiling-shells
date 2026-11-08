// Tests for the printable mesh and the STL / 3MF writers (js/export3d.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { buildPrintMesh, checkClosed, signedVolume, toSTL, to3MF } from '../js/export/export3d.js';
import { PRESETS, ORNAMENT_PRESETS } from '../js/model/presets.js';

const base = { W: 2.4, D: 0.08, T: 1.6, S: 1, turns: 4.5, hand: 1, mirror: false };

function assertPrintable(mesh, size, label) {
  assert.equal(checkClosed(mesh), 0, `${label}: closed and consistently oriented`);
  assert.ok(signedVolume(mesh) > 0, `${label}: outward-facing`);
  assert.ok(mesh.positions.every(Number.isFinite), `${label}: finite`);
  assert.ok(Math.abs(Math.max(...mesh.dims) - size) < 1e-3, `${label}: exact size`);
  let zMin = Infinity;
  for (let k = 2; k < mesh.positions.length; k += 3) zMin = Math.min(zMin, mesh.positions[k]);
  assert.ok(Math.abs(zMin) < 1e-3, `${label}: base at z = 0`);
}

test('every shape preset gives a closed, outward, correctly sized solid', () => {
  for (const [key, p] of Object.entries(PRESETS)) {
    assertPrintable(buildPrintMesh(p, { size: 80, wall: 1.2 }), 80, key);
  }
});

test('ornamented shells (ribs, cords, nodules, varices, spines, keel) give valid solids', () => {
  const ornaments = [
    { ribN: 16, ribH: 0.14, ribW: 0.3 },
    { cordN: 9, cordH: 0.07, cordW: 0.45 },
    { ribN: 22, ribH: 0.06, ribW: 0.3, cordN: 12, cordH: 0.06, cordW: 0.3 },
    { ribN: 14, ribH: 0.12, ribW: 0.5, cordN: 5, cordH: 0.1, cordW: 0.6, nodules: true },
    { ribN: 3, ribH: 0.4, ribW: 0.12, ribSkew: 0.6, cordN: 14, cordH: 0.4, cordW: 0.4 },
    { ribN: 12, ribH: 0.1, ribW: 0.4, spineN: 12, spineH: 0.55, spineW: 0.35, spinePos: 0.12, spineBoth: true },
    { keelH: 0.14, keelW: 0.08, cordN: 7, cordH: 0.04, ornGrowth: -0.8 },
  ];
  for (const key of ['caracol', 'turritella', 'nautilus']) {
    for (const o of ornaments) {
      assertPrintable(buildPrintMesh({ ...PRESETS[key], ...o }, { size: 80, wall: 1.2 }), 80, `${key} ${JSON.stringify(o)}`);
    }
  }
  for (const [key, p] of Object.entries(ORNAMENT_PRESETS)) {
    if (!p.shape) continue;
    assertPrintable(buildPrintMesh({ ...p.shape, ...p.orn }, { size: 80, wall: 1.2 }), 80, `ornament preset ${key}`);
  }
});

test('extreme parameters, walls and sizes still give valid solids', () => {
  const cases = [
    { W: 1.01, turns: 20 }, { W: 10000, turns: 0.5 }, { D: 0.9 }, { T: 10 },
    { S: 0.5 }, { S: 2 }, { turns: 0.25 }, { W: 1000, D: 0, T: 0.35, turns: 1, mirror: true },
    { hand: -1, mirror: true },
  ];
  for (const c of cases) {
    for (const [wall, size] of [[0.4, 30], [6, 250]]) {
      assertPrintable(buildPrintMesh({ ...base, ...c }, { size, wall }), size, JSON.stringify({ ...c, wall, size }));
    }
  }
});

test('the wall thickness only changes the volume, not the outer shape', () => {
  const thin = buildPrintMesh(base, { size: 80, wall: 0.8 });
  const thick = buildPrintMesh(base, { size: 80, wall: 2 });
  assert.ok(signedVolume(thick) > 1.8 * signedVolume(thin));
  thin.dims.forEach((d, a) => assert.ok(Math.abs(d - thick.dims[a]) < 1e-3));
});

test('binary STL has the right header, triangle count and length', () => {
  const mesh = buildPrintMesh(base, { size: 80, wall: 1.2 });
  const stl = toSTL(mesh, 'test');
  const view = new DataView(stl.buffer);
  const n = mesh.indices.length / 3;
  assert.equal(view.getUint32(80, true), n);
  assert.equal(stl.length, 84 + 50 * n);
  assert.match(new TextDecoder().decode(stl.slice(0, 20)), /^Theoretical Shells/);
});

test('3MF is a valid ZIP package with the model in millimetres', async () => {
  const mesh = buildPrintMesh(base, { size: 80, wall: 1.2 });
  const zip = await to3MF(mesh, 'Test shell');
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // End of central directory
  const eocd = zip.length - 22;
  assert.equal(dv.getUint32(eocd, true), 0x06054b50);
  const entries = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let i = 0; i < entries; i++) {
    assert.equal(dv.getUint32(p, true), 0x02014b50);
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const local = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.slice(p + 46, p + 46 + nameLen));
    const localName = dv.getUint16(local + 26, true);
    const data = zip.slice(local + 30 + localName, local + 30 + localName + csize);
    files[name] = new TextDecoder().decode(method === 8 ? inflateRawSync(data) : data);
    p += 46 + nameLen;
  }
  assert.deepEqual(Object.keys(files).sort(), ['3D/3dmodel.model', '[Content_Types].xml', '_rels/.rels']);
  const model = files['3D/3dmodel.model'];
  assert.match(model, /unit="millimeter"/);
  assert.equal((model.match(/<vertex /g) || []).length, mesh.positions.length / 3);
  assert.equal((model.match(/<triangle /g) || []).length, mesh.indices.length / 3);
});
