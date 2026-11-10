/**
 * Image export helpers: output sizes, framing of the 3D view at another aspect
 * ratio, file names and a TIFF encoder (browsers can only encode PNG and JPEG).
 *
 * Pure module (no DOM, no Three.js): it can be tested in Node.
 */

/** Fixed output sizes, grouped by aspect ratio (useful as wallpapers). */
export const FIXED_SIZES = [
  { key: '1920x1080', w: 1920, h: 1080, ratio: '16:9', label: 'Full HD' },
  { key: '2560x1440', w: 2560, h: 1440, ratio: '16:9', label: 'QHD' },
  { key: '3840x2160', w: 3840, h: 2160, ratio: '16:9', label: '4K UHD' },
  { key: '2560x1600', w: 2560, h: 1600, ratio: '16:10', label: '' },
  { key: '3440x1440', w: 3440, h: 1440, ratio: '21:9', label: '' },
  { key: '2048x1536', w: 2048, h: 1536, ratio: '4:3', label: '' },
  { key: '2048x2048', w: 2048, h: 2048, ratio: '1:1', label: '' },
  { key: '1080x1920', w: 1080, h: 1920, ratio: '9:16', label: '' },
  { key: '1290x2796', w: 1290, h: 2796, ratio: '9:19.5', label: '' },
];

/** Largest side accepted for an exported image, in pixels. */
export const MAX_SIDE = 8192;

/**
 * Framing of a perspective view rendered at another aspect ratio. The region
 * seen on screen is kept whole: a wider image shows more on the sides, a taller
 * one more above and below, so the shell is never cut.
 *
 * @param {number} fovDeg      vertical field of view on screen, in degrees
 * @param {number} aspect      screen aspect ratio (width / height)
 * @param {number} outAspect   aspect ratio of the image
 * @returns {{fov: number, scale: number}} vertical field of view of the image
 *   and, per unit of image height, how much larger the screen view appears
 *   (to keep line widths in proportion: line px = screen px · scale · outH / h)
 */
export function fitFrame(fovDeg, aspect, outAspect) {
  const ty = Math.tan((fovDeg * Math.PI) / 360);
  const tyOut = outAspect >= aspect ? ty : (ty * aspect) / outAspect;
  return { fov: (360 / Math.PI) * Math.atan(tyOut), scale: ty / tyOut };
}

/**
 * Arrangement of n square views (each with a label strip below) in an image of
 * W × H pixels: the grid among 3 × 2, 2 × 3, 6 × 1 and 1 × 6 that gives the
 * largest views, centred, with a margin of half a label strip around it.
 *
 * @param {number} W
 * @param {number} H
 * @param {number} [labelFrac=0.1]  height of the label strip per unit of view size
 * @returns {{cols: number, rows: number, tile: number, x0: number, y0: number}}
 */
export function plateLayout(W, H, labelFrac = 0.1) {
  let best = null;
  for (const [cols, rows] of [
    [3, 2],
    [2, 3],
    [6, 1],
    [1, 6],
  ]) {
    const m = labelFrac / 2; // margin, in units of the view size
    const tile = Math.floor(Math.min(W / (cols + 2 * m), H / (rows * (1 + labelFrac) + 2 * m)));
    if (!best || tile > best.tile) best = { cols, rows, tile };
  }
  const { cols, rows, tile } = best;
  const gridW = cols * tile,
    gridH = rows * (tile + Math.round(tile * labelFrac));
  return { ...best, x0: Math.floor((W - gridW) / 2), y0: Math.floor((H - gridH) / 2) };
}

/** Safe file name from a free name typed by the user ("" if nothing usable is left). */
export function slugify(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '')
    .slice(0, 80);
}

/** zlib-compressed copy of the bytes (TIFF "Adobe Deflate" compression). */
async function deflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Rows per strip: strips of about 256 KB keep memory use low in readers. */
const stripRows = (width) => Math.max(1, Math.min(512, Math.floor(262144 / (width * 3))));

/**
 * Baseline RGB TIFF, 8 bits per channel, Deflate compression with horizontal
 * differencing (predictor 2), which compresses flat backgrounds and smooth
 * shading well. Alpha is dropped (the exports have an opaque background).
 *
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array|Uint8ClampedArray} rgba  pixels, 4 bytes each, top row first
 * @param {number} [dpi=300]  resolution written in the file (for printing)
 * @returns {Promise<Uint8Array>}
 */
export async function encodeTIFF(width, height, rgba, dpi = 300) {
  const rowBytes = width * 3;
  const perStrip = stripRows(width);
  const nStrips = Math.ceil(height / perStrip);
  const strips = [];
  for (let s = 0; s < nStrips; s++) {
    const y0 = s * perStrip,
      y1 = Math.min(height, y0 + perStrip);
    const raw = new Uint8Array((y1 - y0) * rowBytes);
    for (let y = y0, d = 0; y < y1; y++) {
      let pr = 0,
        pg = 0,
        pb = 0;
      for (let x = 0, k = y * width * 4; x < width; x++, k += 4) {
        // Predictor 2: each sample is stored as the difference from its left neighbour
        raw[d++] = (rgba[k] - pr) & 255;
        raw[d++] = (rgba[k + 1] - pg) & 255;
        raw[d++] = (rgba[k + 2] - pb) & 255;
        pr = rgba[k];
        pg = rgba[k + 1];
        pb = rgba[k + 2];
      }
    }
    strips.push(await deflate(raw));
  }

  const entries = 14;
  const header = 8;
  const ifdSize = 2 + entries * 12 + 4;
  const bitsAt = header + ifdSize; // BitsPerSample: 3 shorts
  const xResAt = bitsAt + 6; // two rationals
  const yResAt = xResAt + 8;
  const offAt = yResAt + 8; // strip offsets and byte counts
  const cntAt = offAt + 4 * nStrips;
  const dataAt = cntAt + 4 * nStrips;
  const total = dataAt + strips.reduce((n, b) => n + b.length, 0);

  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  out[0] = 0x49;
  out[1] = 0x49; // "II": little-endian
  v.setUint16(2, 42, true);
  v.setUint32(4, header, true);

  let p = header;
  v.setUint16(p, entries, true);
  p += 2;
  const entry = (tag, type, count, value) => {
    v.setUint16(p, tag, true);
    v.setUint16(p + 2, type, true);
    v.setUint32(p + 4, count, true);
    if (type === 3 && count === 1) v.setUint16(p + 8, value, true);
    else v.setUint32(p + 8, value, true);
    p += 12;
  };
  const SHORT = 3,
    LONG = 4,
    RATIONAL = 5;
  const single = nStrips === 1; // a single value is stored in the entry itself
  // Tags must be in ascending order
  entry(256, LONG, 1, width); // ImageWidth
  entry(257, LONG, 1, height); // ImageLength
  entry(258, SHORT, 3, bitsAt); // BitsPerSample → 8, 8, 8
  entry(259, SHORT, 1, 8); // Compression: Deflate
  entry(262, SHORT, 1, 2); // Photometric: RGB
  entry(273, LONG, nStrips, single ? dataAt : offAt); // StripOffsets
  entry(277, SHORT, 1, 3); // SamplesPerPixel
  entry(278, LONG, 1, perStrip); // RowsPerStrip
  entry(279, LONG, nStrips, single ? strips[0].length : cntAt); // StripByteCounts
  entry(282, RATIONAL, 1, xResAt); // XResolution
  entry(283, RATIONAL, 1, yResAt); // YResolution
  entry(284, SHORT, 1, 1); // PlanarConfiguration: chunky
  entry(296, SHORT, 1, 2); // ResolutionUnit: inch
  entry(317, SHORT, 1, 2); // Predictor: horizontal
  v.setUint32(p, 0, true); // no further IFD

  for (let k = 0; k < 3; k++) v.setUint16(bitsAt + 2 * k, 8, true);
  v.setUint32(xResAt, dpi, true);
  v.setUint32(xResAt + 4, 1, true);
  v.setUint32(yResAt, dpi, true);
  v.setUint32(yResAt + 4, 1, true);
  let at = dataAt;
  strips.forEach((b, s) => {
    v.setUint32(offAt + 4 * s, at, true);
    v.setUint32(cntAt + 4 * s, b.length, true);
    out.set(b, at);
    at += b.length;
  });
  return out;
}
