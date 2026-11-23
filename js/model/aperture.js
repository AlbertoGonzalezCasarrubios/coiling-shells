/**
 * Siphonal canal: the channel at the base of the aperture, next to the
 * columella, through which many gastropods (whelks, spindle shells, murexes,
 * fig shells) put out their siphon. The canal comes out of the aperture and is
 * built by its margin as the shell grows, so here it is part of the generating
 * curve: the ellipse of Raup's model is replaced, below, by the outline of a
 * real aperture, and the whole outline is swept along the spiral as usual
 * (Fowler, Meinhardt & Prusinkiewicz 1992 also used free-form generating curves).
 *
 * The outline, in the plane of the aperture (r from the axis, z along it),
 * going round the margin from the periphery (φ = 0) over the top:
 *
 *   ellipse     Raup's aperture, from the shoulder φ_s round to the columella φ_c
 *   columella   from φ_c down to the axis, at the top of the canal (r = 0, z = −b)
 *   inner wall  down the axis, a length ℓ = L·a
 *   tip         a half-circle across the canal
 *   outer wall  up again, at r = 2ρ(z) from the axis, ρ = (w·a/2)·(1 − n·(1 − u))
 *   shoulder    a curve tangent to both, from the top of the outer wall up to the
 *               ellipse at φ_s = 3π/2 + t·(π/2)·0.9
 *
 *   t (shoulder)  where the base of the body whorl starts to taper into the canal:
 *                 0, just at its base (a round whorl with a neck, spindle shells);
 *                 1, at the periphery (a long cone, fig and pear shells)
 *   u             0 at the tip of the canal, 1 at its top
 *
 * The inner wall lies on the axis, so as the outline turns with the whorls the
 * canal is a straight tube along the axis, and the canals of earlier whorls,
 * smaller and higher, stay inside it, as the columella. Real canals are not
 * coiled.
 *
 * The opening: the canal closes in front by turning its walls forwards along the
 * spiral, as if they had grown a little further, by up to (1 − o)·0.6π: not at
 * all at the inner wall (on the axis), fully at the outer wall. Along the canal
 * the turn depends only on the distance from the axis (r / 2ρ), so the canal
 * does not twist; along the shoulder it fades out. o = 1 leaves the canal open
 * in front as a groove, o = 0 an almost closed tube.
 *
 * The notch: most short canals are not drawn out but cut into the lip (dog
 * whelks, whelks, helmet shells): the outer lip curves back at the base of the
 * aperture. The notch k moves the points of the canal back along the spiral, by
 * k·π/2 radians of θ, fading out on either side over an arc of 1.2·a. Such a
 * point is placed where the margin was earlier in its growth (with its scale as
 * well as its turn: see raup.js), so it lies on the same surface and only the
 * rim of the aperture is cut back. A notch alone (L = 0) is a notch with no canal.
 *
 * The columella and the inner wall of the canal are smooth, as in real shells:
 * the ornament fades out on them.
 *
 * The bend: in many whelks and helmet shells the canal is recurved, bent
 * backwards, away from the aperture. That is a bend in space below the body
 * whorl (see bendCanal), not a coiling.
 *
 * With L = 0 and no notch the shell is exactly Raup's. Pure module (no Three.js): it can be
 * tested in Node.
 */

/** Where the columella leaves the ellipse: a little below its inner side. */
export const COLUMELLA_PHI = Math.PI + 0.35;
/** How far the outer wall of a closed canal turns forwards along the spiral. */
const MAX_WRAP = 0.6 * Math.PI;

/**
 * @typedef {object} CanalParams
 * @property {number} [canalL]  length, in units of the aperture radius (0 = none)
 * @property {number} [canalW]  width at its top, in units of the aperture radius
 * @property {number} [canalOpen]  0: an almost closed tube; 1: a groove open in front
 * @property {number} [canalNarrow]  how much it narrows towards its tip, 0 to 0.9
 * @property {number} [canalTaper]  where the body whorl starts to taper into it: 0 at its base, 1 at the periphery
 * @property {number} [canalBend]  bend of the canal: + backwards (recurved), − forwards
 * @property {number} [canalNotch]  how deep the siphonal notch cuts back the margin, 0 to 1
 */

/** @type {Required<CanalParams>} */
export const CANAL_DEFAULTS = {
  canalL: 0,
  canalW: 0.4,
  canalOpen: 0.6,
  canalNarrow: 0.4,
  canalTaper: 0.3,
  canalBend: 0,
  canalNotch: 0,
};
export const CANAL_KEYS = /** @type {(keyof CanalParams)[]} */ (Object.keys(CANAL_DEFAULTS));

export const hasCanal = (p) => (p.canalL ?? 0) > 0 || (p.canalNotch ?? 0) > 0;
/** How far back along the spiral the deepest notch cuts the margin (radians of θ). */
const MAX_NOTCH = 0.5 * Math.PI;
/** Arc length, in aperture radii, over which the notch fades out on either side of the canal. */
const NOTCH_FADE = 1.2;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Cubic Hermite curve from p0 (tangent m0) to p1 (tangent m1), at s in [0, 1]. */
function hermite(p0, m0, p1, m1, s) {
  const s2 = s * s,
    s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1,
    h10 = s3 - 2 * s2 + s,
    h01 = -2 * s3 + 3 * s2,
    h11 = s3 - s2;
  return [h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0], h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1]];
}

/**
 * The outline of an aperture with a canal, as a dense closed polyline starting
 * at the periphery, with the turn along the spiral of each point.
 * @param {CanalParams} p
 * @param {{ a: number, b: number, rc: number }} g
 * @returns {{ r: number[], z: number[], t: number[], relief: number[], back: number[], top: number, ell: number }}
 *   r, z: the points; t: their turn along the spiral; relief: how much ornament they carry;
 *   back: how far back along the spiral the notch moves them (≤ 0)
 */
export function canalOutline(p, { a, b, rc }) {
  const c = { ...CANAL_DEFAULTS, ...p };
  const ell = Math.max(0, c.canalL) * a;
  const half = 0.5 * clamp(c.canalW, 0.02, 1.2) * a;
  const narrow = clamp(c.canalNarrow, 0, 0.9);
  const wrap = (1 - clamp(c.canalOpen, 0, 1)) * MAX_WRAP;
  const phiS = 1.5 * Math.PI + clamp(c.canalTaper, 0, 1) * 0.45 * Math.PI;
  const phiC = COLUMELLA_PHI;
  const top = -b; // the top of the canal, level with the base of the aperture
  const E = (phi) => [rc + a * Math.cos(phi), b * Math.sin(phi)];
  const Et = (phi) => {
    const tr = -a * Math.sin(phi),
      tz = b * Math.cos(phi),
      l = Math.hypot(tr, tz) || 1;
    return [tr / l, tz / l];
  };
  // Half-width of the canal at u (0 at its tip, 1 at its top)
  const rho = (u) => half * (1 - narrow * (1 - u));
  const r = [],
    z = [],
    t = [],
    relief = [],
    cut = [];
  // relief: how much ornament each point carries (the columella and the inner wall are smooth)
  // cut: the share of the notch each point takes (1 on the canal, fading up its sides)
  const push = (pt, turn, rel = 1, share = 0) => {
    r.push(Math.max(0, pt[0]));
    z.push(pt[1]);
    t.push(turn);
    relief.push(rel);
    cut.push(share);
  };
  const n = 600;
  // Ellipse, from the periphery over the top to the columella
  for (let k = 0; k < n; k++) push(E((k / n) * phiC), 0);
  // Columella: from the ellipse down to the axis, arriving straight down
  {
    const p0 = E(phiC),
      p1 = [0, top];
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const m0 = Et(phiC).map((v) => v * L),
      m1 = [0, -L];
    for (let k = 0; k < n; k++) {
      const s = k / n;
      push(hermite(p0, m0, p1, m1, s), 0, 1 - smooth(s / 0.5));
    }
  }
  // Turn of a point of the canal at distance x from the axis where its half-width is w
  const turnAt = (x, w) => wrap * clamp(x / (2 * w), 0, 1);
  // Inner wall, down the axis
  const canalFrom = r.length;
  for (let k = 0; k < n; k++) push([0, top - (ell * k) / n], 0, 0, 1);
  // Tip: a half-circle from the axis across to the outer wall
  {
    const w = rho(0);
    for (let k = 0; k < n; k++) {
      const q = (k / n) * Math.PI;
      const x = w - w * Math.cos(q);
      push([x, top - ell - w * Math.sin(q)], turnAt(x, w), smooth(k / n), 1);
    }
  }
  // Outer wall, up
  for (let k = 0; k < n; k++) {
    const u = k / n;
    push([2 * rho(u), top - ell * (1 - u)], wrap, 1, 1);
  }
  const canalTo = r.length;
  // Shoulder: from the top of the outer wall up to the ellipse, tangent to both;
  // the turn of a closed canal fades out along it
  {
    const p0 = [2 * rho(1), top],
      p1 = E(phiS);
    const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const m0 = [0, L],
      m1 = Et(phiS).map((v) => v * L);
    // Where the shoulder widens, the same angle would be a long flap: the turn shrinks
    // so that the wall never reaches further forwards than at the top of the canal
    for (let k = 0; k < n; k++) {
      const s = k / n;
      const pt = hermite(p0, m0, p1, m1, s);
      const reach = (p0[0] / Math.max(pt[0], p0[0])) ** 2;
      push(pt, wrap * reach * (1 - smooth(s / 0.6)));
    }
  }
  // Ellipse again, from the shoulder to the periphery
  for (let k = 0; k < n; k++) push(E(phiS + ((2 * Math.PI - phiS) * k) / n), 0);
  // The notch: the margin cut back along the spiral (radians of θ, negative), fully
  // along the canal and less and less on either side of it, over an arc of NOTCH_FADE·a
  const notch = -clamp(c.canalNotch, 0, 1) * MAX_NOTCH;
  const N = r.length;
  const fadeOut = (from, step) => {
    let d = 0;
    for (let k = from; ; k += step) {
      const q = (k + N) % N,
        prev = (q - step + N) % N;
      d += Math.hypot(r[q] - r[prev], z[q] - z[prev]);
      const share = 1 - smooth(d / (NOTCH_FADE * a));
      if (share <= 0 || (q >= canalFrom && q < canalTo)) break;
      cut[q] = share;
    }
  };
  fadeOut(canalFrom - 1, -1);
  fadeOut(canalTo, 1);
  const back = cut.map((share) => (share ? notch * share : 0));
  return { r, z, t, relief, back, top, ell };
}

/**
 * The generating curve of a shell with a canal, sampled in columns spaced evenly
 * along its arc length (so the canal gets vertices and the pattern, u, is spread
 * along the real margin), with the outward normal of each column for the relief.
 * @param {CanalParams} p
 * @param {{ a: number, b: number, rc: number, segPhi: number }} g
 * @returns {{ r: Float64Array, z: Float64Array, nR: Float64Array, nZ: Float64Array,
 *   dT: Float64Array, dG: Float64Array, relief: Float64Array, arcU: Float64Array, top: number, ell: number, length: number }}
 *   position in the plane of the aperture, outward normal, turn along the spiral
 *   (radians of θ), shift back along the growth spiral by the notch (radians of θ), share of the ornament (0 on the smooth columella) and u of each column; top and ell: the top of the canal and its
 *   length; length: the length of the whole margin
 */
export function apertureCurve(p, { a, b, rc, segPhi }) {
  const o = canalOutline(p, { a, b, rc });
  const N = o.r.length;
  const cum = new Float64Array(N + 1);
  for (let k = 1; k <= N; k++) {
    const q = k % N;
    cum[k] = cum[k - 1] + Math.hypot(o.r[q] - o.r[k - 1], o.z[q] - o.z[k - 1]);
  }
  const total = cum[N] || 1;
  const cols = segPhi + 1;
  const r = new Float64Array(cols),
    z = new Float64Array(cols),
    nR = new Float64Array(cols),
    nZ = new Float64Array(cols),
    dT = new Float64Array(cols),
    dG = new Float64Array(cols),
    relief = new Float64Array(cols),
    arcU = new Float64Array(cols);
  const lerp = (arr, m, f) => arr[m % N] + f * (arr[(m + 1) % N] - arr[m % N]);
  let m = 0;
  for (let j = 0; j < segPhi; j++) {
    const target = (j / segPhi) * total;
    while (m < N - 1 && cum[m + 1] < target) m++;
    const f = (target - cum[m]) / (cum[m + 1] - cum[m] || 1);
    r[j] = lerp(o.r, m, f);
    z[j] = lerp(o.z, m, f);
    dT[j] = lerp(o.t, m, f);
    dG[j] = lerp(o.back, m, f);
    relief[j] = lerp(o.relief, m, f);
    arcU[j] = j / segPhi;
  }
  r[segPhi] = r[0];
  z[segPhi] = z[0];
  dT[segPhi] = dT[0];
  dG[segPhi] = dG[0];
  relief[segPhi] = relief[0];
  arcU[segPhi] = 1;
  // Outward normals: the outline goes round anticlockwise (r out, z up)
  for (let j = 0; j < segPhi; j++) {
    const jp = (j + 1) % segPhi,
      jm = (j - 1 + segPhi) % segPhi;
    const tr = r[jp] - r[jm],
      tz = z[jp] - z[jm];
    const l = Math.hypot(tr, tz) || 1;
    nR[j] = tz / l;
    nZ[j] = -tr / l;
  }
  nR[segPhi] = nR[0];
  nZ[segPhi] = nZ[0];
  return { r, z, nR, nZ, dT, dG, relief, arcU, top: o.top, ell: o.ell, length: total };
}

/**
 * Bends the canal in space, below the body whorl: a point at depth d below the
 * top of the canal (the base of the aperture, y0) is moved along the direction
 * of growth at the aperture, backwards for a positive bend, by bend·d²/ℓ, so
 * the tip moves by bend·ℓ. The bend is a smooth deformation of space, so the
 * surface stays whole; the shell above y0 is not touched.
 * @param {number} y  height of the point
 * @param {number} y0  top of the canal
 * @param {number} ell  length of the canal
 * @param {number} bend
 * @returns {number} displacement backwards (away from the aperture)
 */
export function bendCanal(y, y0, ell, bend) {
  if (!bend || y >= y0 || ell <= 0) return 0;
  const d = y0 - y;
  return (bend * d * d) / ell;
}
