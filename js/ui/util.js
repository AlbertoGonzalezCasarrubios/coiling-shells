/**
 * Small helpers shared by the interface modules.
 */

export const $ = (id) => document.getElementById(id);

/** W with as many decimals as make sense for its range. */
export const formatW = (v) => v.toFixed(v < 100 ? 2 : v < 1000 ? 1 : 0);

/** Fixed decimals. */
export const f = (v, d) => Number(v).toFixed(d);

/** Two significant figures (0 stays 0; large values without decimals). */
export const sig = (v) => (v === 0 ? '0' : v >= 100 ? v.toFixed(0) : String(+Number(v).toPrecision(2)));

/** '#rrggbb' → [r, g, b] in 0–255. */
export function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance of a '#rrggbb' colour (0 black – 1 white). */
export const luminance = (hex) => {
  const [r, g, b] = hexRgb(hex).map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
