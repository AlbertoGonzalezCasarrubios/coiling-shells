/**
 * Simplified mechanical model of spiral cords (antimarginal ornament), after
 * Moulton, Goriely & Chirat (2012).
 *
 * The mantle edge that secretes the shell is treated as an elastic rod of
 * bending stiffness B lying along the aperture margin (length L₀). It is
 * attached to the shell it has just built, which acts as an elastic
 * foundation of stiffness k (a Winkler foundation). If the mantle edge grows
 * faster than the margin it must follow, it is compressed by a force P.
 * A sinusoidal wrinkle of wavenumber q costs bending energy (∝ B q²) and
 * foundation energy (∝ k / q²), so the compression needed to buckle into
 * that wave is
 *
 *   P(q) = B q² + k / q²,  minimum  P_c = 2 √(k B)  at  q* = (k / B)^¼.
 *
 * In dimensionless form, with Λ = k L₀⁴ / B and n = q L₀ / 2π waves around
 * the margin:
 *
 *   P(n) / P_c = ½ [ (n / n*)² + (n* / n)² ],   n* = Λ^¼ / 2π.
 *
 * Below P_c the margin stays smooth. Above it, the first wave to appear has
 * n* crests (the integer closest in load), and the shell records it as n
 * spiral cords. Near the threshold the amplitude grows as the square root of
 * the excess (a supercritical pitchfork): A ∝ √(η − 1), with η = P / P_c.
 * The linear theory does not give the constant; the app uses A = 0.08 a √(η − 1).
 *
 * Pure module: it can be tested in Node.
 */

/** Waves around the margin at the minimum of the buckling load (not rounded). */
export const criticalWaves = (lambda) => Math.pow(lambda, 0.25) / (2 * Math.PI);

/** Stiffness ratio Λ that puts the minimum at n waves. */
export const lambdaForWaves = (n) => Math.pow(2 * Math.PI * n, 4);

/** Compression needed to buckle into n waves, relative to the critical load. */
export function loadRatio(n, lambda) {
  const r = n / criticalWaves(lambda);
  return 0.5 * (r * r + 1 / (r * r));
}

/** The whole number of waves (≥ 2) that buckles first: the lowest load. */
export function firstMode(lambda) {
  const c = criticalWaves(lambda);
  let best = 2;
  for (let n = Math.max(2, Math.floor(c) - 1); n <= Math.ceil(c) + 1; n++) {
    if (loadRatio(n, lambda) < loadRatio(best, lambda)) best = n;
  }
  return best;
}

/** Range of wave numbers that are unstable under a load η = P / P_c (empty below 1). */
export function unstableBand(lambda, eta) {
  if (eta <= 1) return null;
  // ½ (r² + 1/r²) = η  →  r² = η ± √(η² − 1)
  const c = criticalWaves(lambda);
  const s = Math.sqrt(eta * eta - 1);
  return { from: c * Math.sqrt(eta - s), to: c * Math.sqrt(eta + s) };
}

/** Cord height (relative to the aperture radius) for a load η. */
export const cordAmplitude = (eta) => Math.min(0.35, 0.08 * Math.sqrt(Math.max(0, eta - 1)));

/**
 * Ornament produced by the model: n spiral cords with a sinusoidal profile
 * (w = 1, the buckling mode is a smooth wave), or none below the threshold.
 */
export function mechanicalCords(lambda, eta) {
  const h = cordAmplitude(eta);
  return { cordN: h > 0 ? firstMode(lambda) : 0, cordH: h, cordW: 1 };
}
