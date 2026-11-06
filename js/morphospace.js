/**
 * Theoretical morphospace of Raup's model in the W–D plane.
 *
 * For a planispiral shell (T = 0) the inner edge of a whorl lies at distance
 * g·D from the axis and the outer edge of the previous whorl at g/W, so
 * successive whorls just touch when D = 1/W, for any aperture shape S.
 *
 * Pure module (no Three.js): it can be tested in Node.
 */

/** Value of D at which successive whorls of a planispiral shell just touch. */
export const contactD = (W) => 1 / W;

/**
 * Regions occupied by each group, in (log10 W, D) coordinates. They are
 * approximate (after Raup, 1966, 1967) and start at D = 0, where many real
 * shells lie. The plane is a section of Raup's W–D–T cube: the groups differ
 * mainly in T, so each region states the T at which it exists (`tOk`).
 * Clicking a group's name loads a typical shell of that group (`preset`).
 */
export const halfEllipse = (cx, rx, ry) =>
  Array.from({ length: 41 }, (_, i) => {
    const a = (Math.PI * i) / 40;
    return [cx + rx * Math.cos(a), ry * Math.sin(a)];
  });
export const MORPHO_REGIONS = [
  {
    key: 'bivalves', preset: 'almeja', color: '#8a5cb8', tOk: (T) => T <= 1,
    poly: halfEllipse(2.8, 1.6, 0.3), label: [2.75, 0.13, 'center'],
  },
  {
    key: 'gastropods', preset: 'caracol', color: '#3f7fbf', tOk: () => true,
    poly: halfEllipse(0.3, 0.29, 0.42), label: [0.64, 0.4, 'left'], labelNear: [0.98, 0.5, 'right'],
  },
  {
    // Ammonoids and nautiloids: whorls in contact or overlapping (below D = 1/W)
    key: 'ammonoids', preset: 'ammonite', color: '#c77d2e', tOk: (T) => T <= 0.25,
    poly: (() => {
      const pts = [];
      for (let lw = 0.146; lw <= 0.6021; lw += 0.01) pts.push([lw, Math.min(1, 10 ** -lw + 0.02)]);
      for (let lw = 0.6021; lw >= 0.146; lw -= 0.01) pts.push([lw, Math.max(0, 10 ** -lw - 0.3)]);
      return pts;
    })(),
    label: [0.36, 0.66, 'left'], labelNear: [0.98, 0.3, 'right'],
  },
];


/** Point-in-polygon test (even–odd rule) in (log10 W, D) coordinates. */
export function inRegion(region, W, D) {
  const x = Math.log10(W), y = D;
  let inside = false;
  const poly = region.poly;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Keys of the regions that contain the point (W, D). */
export function regionsAt(W, D) {
  return MORPHO_REGIONS.filter((r) => inRegion(r, W, D)).map((r) => r.key);
}
