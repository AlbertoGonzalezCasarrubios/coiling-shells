/**
 * Printable mesh: turns Raup's surface (which has no thickness) into a closed
 * solid with a real wall thickness, in millimetres, and writes it as STL or 3MF.
 *
 * - The wall is built inwards: each vertex of the outer surface is offset along
 *   the normal. The thickness of each ring is capped at a fraction of the tube
 *   radius, so the tube is solid near the apex.
 * - The tube is closed with a ring at the aperture and another at the apex.
 * - Print coordinates: z = coiling axis pointing up (apex up, as in the
 *   equation), base at z = 0, centred in x and y.
 *
 * Pure module (no Three.js): it can be tested in Node.
 */
import { buildShell } from './raup.js';

// Print resolution: fine but bounded (about 350,000 triangles at most)
const PRINT_QUALITY = { segPerTurn: 160, segPhi: 96, maxRows: 900 };
// Stretch of tube next to each end where the inner wall is clipped (see below)
const END_WINDOW = Math.PI / 3;

/**
 * @param {object} shape  W, D, T, S, turns, hand, mirror and, optionally, the ornament (ribN, ribH…)
 * @param {object} opt    size (mm, largest dimension), wall (mm)
 * @returns {{ positions: Float32Array, indices: Uint32Array, dims: number[] }}
 */
export function buildPrintMesh(shape, { size = 80, wall = 1.2 } = {}) {
  const boost = Math.max(1, Math.log10(Math.max(shape.W, 1)));
  const shell = buildShell({
    ...shape,
    grow: 1,
    // Ornament needs about eight segments per rib and per cord
    segPhi: Math.min(256, Math.max(PRINT_QUALITY.segPhi, 8 * (shape.cordN || 0))),
    segPerTurn: Math.min(
      Math.max(Math.round(PRINT_QUALITY.segPerTurn * boost), 8 * (shape.ribN || 0)),
      Math.floor(PRINT_QUALITY.maxRows * (shape.ribN ? 2 : 1) / Math.max(shape.turns, 0.25))),
    spiralLines: 0,
    ringsPerTurn: 0,
    size,
  });
  const { rows, cols, copies, count } = shell.grid;
  const U = cols - 1; // without the repeated seam column
  const P = shell.positions;

  // Three.js (X, Y = z, Z = −y)  →  print (x, y, z) with z up
  const src = (c, i, j) => {
    const k = (c * count + i * cols + j) * 3;
    return [P[k], -P[k + 2], P[k + 1]];
  };

  const nPer = rows * U;
  const pos = new Float32Array(copies * nPer * 2 * 3);
  const tris = [];
  const outer = (c, i, j) => c * nPer * 2 + i * U + ((j + U) % U);
  const inner = (c, i, j) => outer(c, i, j) + nPer;

  for (let c = 0; c < copies; c++) {
    const O = [];
    for (let i = 0; i < rows; i++) {
      const ring = [];
      for (let j = 0; j < U; j++) ring.push(src(c, i, j));
      O.push(ring);
    }
    // Outward normals and thickness per ring
    for (let i = 0; i < rows; i++) {
      const ring = O[i];
      const ctr = [0, 0, 0];
      for (const p of ring) { ctr[0] += p[0] / U; ctr[1] += p[1] / U; ctr[2] += p[2] / U; }
      let minR = Infinity;
      for (const p of ring) minR = Math.min(minR, Math.hypot(p[0] - ctr[0], p[1] - ctr[1], p[2] - ctr[2]));
      const t = Math.min(wall, 0.45 * minR);
      const prev = O[Math.max(0, i - 1)], next = O[Math.min(rows - 1, i + 1)];
      // Normal of the ring plane (Newell's method), only at the ends
      let planeN = null;
      if (i === 0 || i === rows - 1) {
        const nn = [0, 0, 0];
        for (let j = 0; j < U; j++) {
          const p = ring[j], q = ring[(j + 1) % U];
          nn[0] += (p[1] - q[1]) * (p[2] + q[2]);
          nn[1] += (p[2] - q[2]) * (p[0] + q[0]);
          nn[2] += (p[0] - q[0]) * (p[1] + q[1]);
        }
        planeN = norm(nn);
        if (!planeN[0] && !planeN[1] && !planeN[2]) planeN = null;
      }
      for (let j = 0; j < U; j++) {
        const p = ring[j];
        const dT = sub(next[j], prev[j]);
        const dP = sub(ring[(j + 1) % U], ring[(j - 1 + U) % U]);
        let n = norm(cross(dT, dP));
        const away = sub(p, ctr);
        if (dot(n, away) < 0) n = [-n[0], -n[1], -n[2]];
        if (!Number.isFinite(n[0]) || (n[0] === 0 && n[1] === 0 && n[2] === 0)) n = norm(away);
        // At the end rings the wall is offset within the plane of the ring, so the
        // lip of the aperture and the cap at the apex are flat and the inner wall
        // does not stick out past the edge (the tube widens as it grows)
        if (planeN) {
          const along = dot(n, planeN);
          const inPlane = norm([n[0] - along * planeN[0], n[1] - along * planeN[1], n[2] - along * planeN[2]]);
          if (inPlane[0] || inPlane[1] || inPlane[2]) n = inPlane;
        }
        const o = outer(c, i, j) * 3, q = inner(c, i, j) * 3;
        pos[o] = p[0]; pos[o + 1] = p[1]; pos[o + 2] = p[2];
        pos[q] = p[0] - n[0] * t; pos[q + 1] = p[1] - n[1] * t; pos[q + 2] = p[2] - n[2] * t;
      }
    }

    // Because the tube widens, near the ends the inner wall would cross the planes
    // of the apex and of the aperture: it is clipped against them so it does not
    // stick out. Only in the stretch of tube closest to each end (END_WINDOW
    // radians): those planes contain the coiling axis and cut through the other
    // whorls, which must not be touched.
    const centroid = (ring) => [0, 1, 2].map((a) => ring.reduce((s, p) => s + p[a], 0) / U);
    const newell = (ring) => {
      const nn = [0, 0, 0];
      for (let j = 0; j < U; j++) {
        const p = ring[j], q = ring[(j + 1) % U];
        nn[0] += (p[1] - q[1]) * (p[2] + q[2]);
        nn[1] += (p[2] - q[2]) * (p[0] + q[0]);
        nn[2] += (p[0] - q[0]) * (p[1] + q[1]);
      }
      return norm(nn);
    };
    if (rows > 2) {
      const near = Math.min(rows - 1, Math.ceil(END_WINDOW / ((2 * Math.PI * Math.max(shape.turns, 0.01)) / (rows - 1))));
      for (const [end, inside, from, to] of [[0, 1, 0, near], [rows - 1, rows - 2, rows - 1 - near, rows - 1]]) {
        const c0 = centroid(O[end]);
        let pn = newell(O[end]);
        if (!pn[0] && !pn[1] && !pn[2]) continue;
        // The normal points out of the solid (away from the neighbouring ring)
        if (dot(pn, sub(centroid(O[inside]), c0)) > 0) pn = pn.map((v) => -v);
        for (let i = from; i <= to; i++) {
          for (let j = 0; j < U; j++) {
            const q = inner(c, i, j) * 3;
            const d = (pos[q] - c0[0]) * pn[0] + (pos[q + 1] - c0[1]) * pn[1] + (pos[q + 2] - c0[2]) * pn[2];
            if (d > 0) {
              pos[q] -= d * pn[0];
              pos[q + 1] -= d * pn[1];
              pos[q + 2] -= d * pn[2];
            }
          }
        }
      }
    }

    // Faces with a consistent orientation by construction: every edge is shared
    // by two triangles traversing it in opposite directions, also where the outer
    // wall, the inner wall and the rings at the aperture and the apex meet.
    const start = tris.length;
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < U; j++) {
        tris.push(outer(c, i, j), outer(c, i + 1, j), outer(c, i, j + 1));
        tris.push(outer(c, i, j + 1), outer(c, i + 1, j), outer(c, i + 1, j + 1));
        tris.push(inner(c, i, j), inner(c, i, j + 1), inner(c, i + 1, j));
        tris.push(inner(c, i, j + 1), inner(c, i + 1, j + 1), inner(c, i + 1, j));
      }
    }
    const last = rows - 1;
    for (let j = 0; j < U; j++) {
      // aperture
      tris.push(outer(c, last, j + 1), outer(c, last, j), inner(c, last, j));
      tris.push(outer(c, last, j + 1), inner(c, last, j), inner(c, last, j + 1));
      // apex
      tris.push(outer(c, 0, j), outer(c, 0, j + 1), inner(c, 0, j + 1));
      tris.push(outer(c, 0, j), inner(c, 0, j + 1), inner(c, 0, j));
    }
    // If the faces point inwards (it depends on the handedness and the reflection), flip them all
    const part = { positions: pos, indices: tris.slice(start) };
    if (signedVolume(part) < 0) {
      for (let k = start; k < tris.length; k += 3) {
        const tmp = tris[k + 1];
        tris[k + 1] = tris[k + 2];
        tris[k + 2] = tmp;
      }
    }
  }

  // Base at z = 0, centred in x and y
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < pos.length; k += 3) {
    for (let a = 0; a < 3; a++) {
      if (pos[k + a] < min[a]) min[a] = pos[k + a];
      if (pos[k + a] > max[a]) max[a] = pos[k + a];
    }
  }
  // With very thick walls on strongly curved surfaces the inner wall can stick out
  // slightly from the outer one: the mesh is rescaled so that its largest
  // dimension is exactly the requested size
  const fit = size / Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const off = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, min[2]];
  for (let k = 0; k < pos.length; k += 3) for (let a = 0; a < 3; a++) pos[k + a] = (pos[k + a] - off[a]) * fit;

  return { positions: pos, indices: new Uint32Array(tris), dims: [0, 1, 2].map((a) => (max[a] - min[a]) * fit) };
}

/**
 * Checks that the mesh is closed and consistently oriented: every directed edge
 * appears exactly once and its reverse appears exactly once.
 * @returns {number} number of offending edges (0 for a valid mesh)
 */
export function checkClosed({ indices }) {
  const edges = new Map();
  for (let t = 0; t < indices.length; t += 3) {
    for (let e = 0; e < 3; e++) {
      const a = indices[t + e], b = indices[t + ((e + 1) % 3)];
      const key = `${a},${b}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  let bad = 0;
  for (const [key, n] of edges) {
    const [a, b] = key.split(',');
    if (n !== 1 || edges.get(`${b},${a}`) !== 1) bad++;
  }
  return bad;
}

/** Signed volume (mm³): positive if the faces point outwards. */
export function signedVolume({ positions: p, indices: ix }) {
  let v = 0;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    v += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1])
       - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c])
       + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return v / 6;
}

/** Binary STL. */
export function toSTL({ positions: p, indices: ix }, name = 'shell') {
  const n = ix.length / 3;
  const buf = new ArrayBuffer(84 + n * 50);
  const dv = new DataView(buf);
  const header = `Theoretical Shells: ${name}`.slice(0, 79);
  for (let i = 0; i < header.length; i++) dv.setUint8(i, header.charCodeAt(i) & 0x7f);
  dv.setUint32(80, n, true);
  let o = 84;
  for (let t = 0; t < ix.length; t += 3) {
    const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3;
    const nrm = norm(cross(
      [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]],
      [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]]
    ));
    for (const x of [...nrm.map((v) => (Number.isFinite(v) ? v : 0)),
      p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2]]) {
      dv.setFloat32(o, x, true);
      o += 4;
    }
    o += 2; // attribute byte count
  }
  return new Uint8Array(buf);
}

/**
 * 3MF (a ZIP package with the model in millimetres). Asynchronous: the model
 * is compressed when the runtime supports CompressionStream.
 */
export async function to3MF({ positions: p, indices: ix }, name = 'Shell') {
  const v = [];
  for (let k = 0; k < p.length; k += 3) v.push(`<vertex x="${r(p[k])}" y="${r(p[k + 1])}" z="${r(p[k + 2])}"/>`);
  const t = [];
  for (let k = 0; k < ix.length; k += 3) t.push(`<triangle v1="${ix[k]}" v2="${ix[k + 1]}" v3="${ix[k + 2]}"/>`);
  const esc = (s) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">${esc(name)}</metadata>
<metadata name="Application">Theoretical Shells: Form and Colour</metadata>
<resources><object id="1" type="model" name="${esc(name)}"><mesh>
<vertices>${v.join('')}</vertices>
<triangles>${t.join('')}</triangles>
</mesh></object></resources>
<build><item objectid="1"/></build>
</model>`;
  const types = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;
  return zip([
    ['[Content_Types].xml', types],
    ['_rels/.rels', rels],
    ['3D/3dmodel.model', model],
  ]);
}

const r = (x) => +x.toFixed(4);

// ---------------------------------------------------------------------------
// Minimal ZIP writer (deflate via CompressionStream when available, otherwise stored)
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function deflateRaw(data) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

export async function zip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameB = enc.encode(name);
    const data = typeof content === 'string' ? enc.encode(content) : content;
    const crc = crc32(data);
    const packed = await deflateRaw(data);
    const method = packed ? 8 : 0;
    const body = packed || data;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, method, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, body.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameB.length, true);
    parts.push(new Uint8Array(local.buffer), nameB, body);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(10, method, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, body.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, nameB.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nameB);
    offset += 30 + nameB.length + body.length;
  }
  const cdSize = central.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, b) => s + b.length, 0));
  let o = 0;
  for (const b of all) { out.set(b, o); o += b.length; }
  return out;
}

// ---------------------------------------------------------------------------

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]); return l ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; }
