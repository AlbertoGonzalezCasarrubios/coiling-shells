/**
 * Ornament: a relief added to Raup's surface along the outward normal n(φ) of
 * the generating curve, in units of the aperture radius a, so it grows with
 * the shell like the rest of the aperture:
 *
 *   P*(θ,φ) = P(θ,φ) + g · a · δ(θ,φ) · n(φ)
 *
 *   δ = f(s) · [ h_r R(θ) + h_c C(u) + h_k K(u) + h_s Σ(θ,u) ]     (reticulate)
 *   δ = f(s) · [ (h_r + h_c) R(θ) C(u) + h_k K(u) + h_s Σ(θ,u) ]   (nodules)
 *
 *   R   axial ribs: n_r per whorl along θ, counted from the final aperture.
 *       A skew k makes each rib steep on the side of the aperture and gentle
 *       behind, like the varices left by old lips.
 *   C   spiral cords: n_c around the margin (u = arc length, 0–1 from the
 *       periphery, φ = 0).
 *   K   keel: a single cord at position u_k.
 *   Σ   spines: cones on n_s positions per whorl, in one row at u_s or in two
 *       rows at ±u_s; their base covers a fraction w_s of the spacing. A spine
 *       is only drawn when it lies whole on the shell: not across the lip of
 *       the aperture (it would open the lip into a funnel) and not on the
 *       first whorls (one, or 30 % of them), where spines would be specks.
 *   f   change with growth: f(s) = clamp(1 + c (2s − 1), 0, 2), with s the
 *       fraction of growth (0 apex, 1 aperture). c < 0: ornament fades towards
 *       the aperture; c > 0: it appears late.
 *
 * Profiles are cos² bumps covering a fraction w of each period (w = 1: a
 * smooth wave). This is a descriptive model of ornament (Fowler, Meinhardt &
 * Prusinkiewicz, 1992; Cortie, 1993); the mechanical model that explains the
 * spacing of cords lives in mechanics.js.
 *
 * Pure module (no Three.js): it can be tested in Node.
 */

/** Neutral values: a smooth shell. */
export const ORNAMENT_DEFAULTS = {
  ribN: 0, ribH: 0.12, ribW: 0.35, ribSkew: 0,
  cordN: 0, cordH: 0.08, cordW: 0.45,
  nodules: false,
  keelH: 0, keelW: 0.06, keelPos: 0,
  spineN: 0, spineH: 0.5, spineW: 0.35, spinePos: 0.12, spineBoth: false,
  ornGrowth: 0,
};

/**
 * Periodic bump of height 1: cos² over a fraction `w` of each period, zero
 * elsewhere. `t` is measured in periods; bumps are centred on whole numbers.
 * `skew` in (−1, 1) narrows the front half (t above the centre) and widens the
 * back half, keeping the total width.
 */
export function bump(t, w, skew = 0) {
  const d = t - Math.round(t); // signed distance to the nearest centre, −0.5–0.5
  const half = Math.max(w, 1e-3) / 2;
  const side = d >= 0 ? half * (1 - skew) : half * (1 + skew);
  const x = Math.abs(d) / Math.max(side, 1e-4);
  if (x >= 1) return 0;
  const c = Math.cos((Math.PI / 2) * x);
  return c * c;
}

/** Cone of height 1 and unit base radius, at normalised distance r from its axis. */
export const cone = (r) => (r >= 1 ? 0 : 1 - r);

/** Change of the ornament with growth, s = 0 at the apex and 1 at the aperture. */
export const growthFactor = (c, s) => Math.min(2, Math.max(0, 1 + c * (2 * s - 1)));

/** True when the parameters ask for some relief. */
export function hasOrnament(p) {
  return (p.ribN > 0 && p.ribH > 0) || (p.cordN > 0 && p.cordH > 0) ||
    p.keelH > 0 || (p.spineN > 0 && p.spineH > 0);
}

/** Wrapped distance between two positions on a circle of period 1. */
const circDist = (u, v) => {
  const d = Math.abs(u - v) % 1;
  return Math.min(d, 1 - d);
};

/**
 * Prepares the relief of a shell: per-column normals and profiles, so that
 * `delta(theta, s, j)` costs a few operations per vertex.
 *
 * @param {object} p      ornament parameters (missing keys take the defaults)
 * @param {object} g      geometry: a, b, rc (aperture), cols, cosPhi, sinPhi, arcU, perimeter (in units of a)
 * @returns {{active: boolean, nR: Float64Array, nZ: Float64Array, delta: (theta: number, s: number, j: number) => number}}
 */
export function makeOrnament(p, { a, b, rc, cols, cosPhi, sinPhi, arcU, perimeter }) {
  const o = { ...ORNAMENT_DEFAULTS, ...p };
  const active = hasOrnament(o);
  const nR = new Float64Array(cols), nZ = new Float64Array(cols);
  if (!active) return { active, nR, nZ, delta: () => 0 };

  const ribH = o.ribN > 0 ? o.ribH : 0;
  const cordH = o.cordN > 0 ? o.cordH : 0;
  const nodules = o.nodules && ribH + cordH > 0;
  const spineH = o.spineN > 0 ? o.spineH : 0;

  // Column profiles: cords, keel and the distance to the spine rows
  const cord = new Float64Array(cols), keel = new Float64Array(cols), spineU = new Float64Array(cols);
  // Spines are round: their half-width around the margin (in u) matches their
  // half-width along the spiral, measured at the outer edge of the whorl
  const halfTheta = o.spineN > 0 ? (o.spineW / 2) * (2 * Math.PI / o.spineN) : 0;
  const halfU = Math.max(1e-3, (halfTheta * (rc + a)) / (perimeter * a));
  // The centre of each row is moved to the nearest column, so the tip of every spine is a vertex
  const snap = (u) => {
    let best = arcU[0];
    for (let j = 0; j < cols; j++) if (circDist(arcU[j], u) < circDist(best, u)) best = arcU[j];
    return best;
  };
  const rows = (o.spineBoth && o.spinePos !== 0 ? [o.spinePos, -o.spinePos] : [o.spinePos]).map((u) => snap(((u % 1) + 1) % 1));
  // Spines centred between these angles are drawn whole (θ = 0 is the final aperture)
  const nTurns = p.turns ?? 1;
  // The first whorls stay smooth (at least one, or 30 % of the whorls)
  const spineFirst = -2 * Math.PI * Math.max(0, nTurns - Math.max(1, 0.3 * nTurns));
  const spineLast = -halfTheta;
  for (let j = 0; j < cols; j++) {
    const len = Math.hypot(b * cosPhi[j], a * sinPhi[j]) || 1;
    nR[j] = (b * cosPhi[j]) / len;
    nZ[j] = (a * sinPhi[j]) / len;
    const u = arcU[j];
    cord[j] = o.cordN > 0 ? bump(u * o.cordN, o.cordW) : nodules ? 1 : 0;
    keel[j] = o.keelH > 0 ? bump(u - o.keelPos, o.keelW) : 0;
    spineU[j] = Math.min(...rows.map((r) => circDist(u, r))) / halfU;
  }

  const delta = (theta, s, j) => {
    const turns = theta / (2 * Math.PI);
    const rib = o.ribN > 0 ? bump(turns * o.ribN, o.ribW, o.ribSkew) : nodules ? 1 : 0;
    let d = nodules ? (ribH + cordH) * rib * cord[j] : ribH * rib + cordH * cord[j];
    d += o.keelH * keel[j];
    if (spineH > 0 && spineU[j] < 1) {
      const t = turns * o.spineN;
      const centre = (Math.round(t) / o.spineN) * 2 * Math.PI;
      if (centre >= spineFirst && centre <= spineLast) {
        const dt = Math.abs(t - Math.round(t)) / (o.spineW / 2); // distance along the spiral, in base radii
        d += spineH * cone(Math.hypot(dt, spineU[j]));
      }
    }
    return d * growthFactor(o.ornGrowth, s);
  };
  return { active, nR, nZ, delta };
}

/** Segments needed to draw the relief: about eight per rib, cord and spine base. */
export function ornamentResolution(p) {
  const o = { ...ORNAMENT_DEFAULTS, ...p };
  if (!hasOrnament(o)) return { perTurn: 0, phi: 0 };
  let perTurn = 0, phi = 0;
  if (o.ribN > 0 && o.ribH > 0) perTurn = Math.max(perTurn, (8 * o.ribN) / Math.max(o.ribW * (1 - Math.abs(o.ribSkew)), 0.15));
  if (o.spineN > 0 && o.spineH > 0) {
    perTurn = Math.max(perTurn, (8 * o.spineN) / Math.max(o.spineW, 0.1));
    phi = Math.max(phi, 64 / Math.max(o.spineW, 0.1));
  }
  if (o.cordN > 0 && o.cordH > 0) phi = Math.max(phi, (8 * o.cordN) / Math.max(o.cordW, 0.25));
  if (o.keelH > 0) phi = Math.max(phi, 8 / Math.max(o.keelW, 0.02));
  return { perTurn: Math.ceil(perTurn), phi: Math.ceil(phi / 4) * 4 };
}
