/**
 * Approximate values of Raup's parameters for real forms. They are estimates
 * within Raup's (1966) morphospace, not measurements of particular specimens.
 * `mirror` adds the mirror valve (bivalves). `name` and `group` are the
 * original Spanish labels; the displayed names come from i18n.js.
 */
export const PRESETS = {
  caracol: {
    group: 'Gasterópodos', name: 'Caracol de jardín (Cornu aspersum)',
    W: 2.4, D: 0.08, T: 1.6, S: 1.0, turns: 4.5, hand: 1, mirror: false,
  },
  turritella: {
    group: 'Gasterópodos', name: 'Turritella',
    W: 1.3, D: 0.1, T: 6.5, S: 1.0, turns: 14, hand: 1, mirror: false,
  },
  trochus: {
    group: 'Gasterópodos', name: 'Trompo (Trochus)',
    W: 1.45, D: 0.0, T: 3.0, S: 0.6, turns: 9, hand: 1, mirror: false,
  },
  planorbis: {
    group: 'Gasterópodos', name: 'Planorbis (planispiral)',
    W: 2.1, D: 0.3, T: 0.15, S: 1.0, turns: 5, hand: -1, mirror: false,
  },
  physa: {
    group: 'Gasterópodos', name: 'Physa (sinistral)',
    W: 2.6, D: 0.0, T: 3.0, S: 1.5, turns: 4.5, hand: -1, mirror: false,
  },
  peringia: {
    group: 'Gasterópodos', name: 'Peringia (Peringia ulvae)',
    W: 1.8, D: 0.0, T: 3.8, S: 1.2, turns: 6.5, hand: 1, mirror: false,
  },
  nautilus: {
    group: 'Cefalópodos', name: 'Nautilus (Nautilus pompilius)',
    W: 3.2, D: 0.02, T: 0.0, S: 0.85, turns: 4, hand: 1, mirror: false,
  },
  ammonite: {
    group: 'Cefalópodos', name: 'Ammonite evoluto (Dactylioceras)',
    W: 1.9, D: 0.45, T: 0.0, S: 0.9, turns: 7, hand: 1, mirror: false,
  },
  almeja: {
    group: 'Bivalvos', name: 'Almeja (Venus)',
    W: 1000, D: 0.0, T: 0.35, S: 1.1, turns: 1, hand: 1, mirror: true,
  },
};

export const DEFAULT_PRESET = 'caracol';

/**
 * Pigmentation patterns (Meinhardt's models) tuned to resemble well-known
 * species. Parameters are in units of margin cells (256 cells at the aperture)
 * and of the total simulated time T.
 */
export const PATTERN_PRESETS = {
  nautilus: {
    // Oscillation: the inhibitor outlives the activator, so the whole margin flashes
    // periodically and draws stripes parallel to the growth lines. Fast rates give
    // about ten stripes per whorl; strong saturation (κ) widens each stripe and weak
    // coupling between cells (D_a) makes them wavy, like the flames of Nautilus.
    model: 'AI', Da: 0.04, D2: 0, ra: 0.24, r2: 0.06, kappa: 2, ba: 0.05, b2: 0,
    noise: 0.4, globalCtl: 0, T: 3000, insertion: true, amount: 0.8, base: '#f1e7d6', pigment: '#9c4a1f',
  },
  cepaea: {
    // Stable peaks (long-range lateral inhibition) → spiral bands
    model: 'AI', Da: 0.02, D2: 12, ra: 0.01, r2: 0.015, kappa: 0.4, ba: 0.005, b2: 0,
    noise: 0.05, globalCtl: 0, T: 3000, insertion: false, base: '#ecc95a', pigment: '#3a2216',
  },
};

export const DEFAULT_PATTERN = 'nautilus';

/**
 * Constants loaded when the model is changed in the advanced controls. The
 * activator–substrate set is an excitable medium (no substrate saturation,
 * slow recovery) in which the global signal starts new waves: it draws
 * travelling waves, oblique lines and V shapes. It is not offered as a species
 * preset: this simplified model does not reproduce the full pattern of a
 * particular shell such as Oliva porphyria.
 */
export const MODEL_DEFAULTS = {
  AI: PATTERN_PRESETS.nautilus,
  AS: {
    model: 'AS', Da: 0.01, D2: 0, ra: 0.05, r2: 0.002, kappa: 0, ba: 0, b2: 0.02,
    noise: 0.4, globalCtl: 0.02, T: 8000, insertion: false, amount: 0.6, base: '#efe3cf', pigment: '#5a2d1e',
  },
};

/**
 * Ornamented shells. Ornament is part of the shape, so each preset sets Raup's
 * parameters of a real shell together with its relief (`shape: null` keeps the
 * current shape). Shells whose form Raup's model cannot draw are left out: for
 * example *Murex*, whose long siphonal canal is not a coiled tube.
 */
const SHAPE = (k, extra = {}) => ({ ...pick(PRESETS[k]), ...extra });
function pick(p) {
  const { W, D, T, S, turns, hand, mirror } = p;
  return { W, D, T, S, turns, hand, mirror };
}
export const ORNAMENT_PRESETS = {
  smooth: { shape: null, orn: {} },
  // Wentletrap (Epitonium clathrus): a tall spire of convex whorls that just
  // touch, crossed by thin lamellar ribs (costae) that line up from whorl to whorl
  epitonium: {
    shape: { W: 1.4, D: 0.15, T: 5.2, S: 1, turns: 10, hand: 1, mirror: false },
    orn: { ribN: 10, ribH: 0.25, ribW: 0.12, ribSkew: 0.3 },
  },
  // Tower shell: spiral cords along the whorls
  turritella: { shape: SHAPE('turritella'), orn: { cordN: 5, cordH: 0.1, cordW: 0.5 } },
  // Top shell with a peripheral keel and fine cords
  calliostoma: { shape: SHAPE('trochus'), orn: { cordN: 7, cordH: 0.04, cordW: 0.4, keelH: 0.14, keelW: 0.08, keelPos: 0 } },
  // Nutmeg shell: ribs and cords of similar strength, a reticulate pattern
  cancellaria: {
    shape: { W: 2.1, D: 0.05, T: 2.6, S: 1.3, turns: 6, hand: 1, mirror: false },
    orn: { ribN: 18, ribH: 0.07, ribW: 0.3, cordN: 10, cordH: 0.06, cordW: 0.3 },
  },
  // Horn shell: a tall spire with rows of nodules
  cerithium: {
    shape: { W: 1.55, D: 0.05, T: 5, S: 1.15, turns: 11, hand: 1, mirror: false },
    orn: { ribN: 12, ribH: 0.16, ribW: 0.45, cordN: 6, cordH: 0.12, cordW: 0.5, nodules: true },
  },
  // Sun shell (Astraea heliotropium): a low cone whose periphery carries
  // triangular spines, so it looks like a star from above
  astraea: {
    shape: { W: 2.2, D: 0.02, T: 1.6, S: 0.7, turns: 4.5, hand: 1, mirror: false },
    orn: { ribN: 16, ribH: 0.04, ribW: 0.3, spineN: 10, spineH: 0.9, spineW: 0.35, spinePos: 0 },
  },
  // Ribbed ammonite
  dactylioceras: { shape: SHAPE('ammonite'), orn: { ribN: 34, ribH: 0.12, ribW: 0.4 } },
  // Ammonite with ribs ending in a pair of spines on the flanks of the venter
  spinyAmmonite: {
    shape: { W: 2.3, D: 0.3, T: 0, S: 1.15, turns: 5, hand: 1, mirror: false },
    orn: { ribN: 12, ribH: 0.1, ribW: 0.4, spineN: 12, spineH: 0.55, spineW: 0.35, spinePos: 0.12, spineBoth: true },
  },
  // Cockle: radial ribs, which run along the growth direction (spiral cords in Raup's terms)
  cerastoderma: { shape: SHAPE('almeja'), orn: { cordN: 24, cordH: 0.07, cordW: 0.7 } },
};
