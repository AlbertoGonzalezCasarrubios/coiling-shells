/**
 * Approximate values of Raup's parameters for real forms. They are estimates
 * within Raup's (1966) morphospace, not measurements of particular specimens.
 * `mirror` adds the mirror valve (bivalves). `name` and `group` are the
 * original Spanish labels; the displayed names come from i18n.js.
 */
export const PRESETS = {
  caracol: {
    group: 'Gasterópodos',
    name: 'Caracol de jardín (Cornu aspersum)',
    W: 2.4,
    D: 0.08,
    T: 1.6,
    S: 1.0,
    turns: 4.5,
    hand: 1,
    mirror: false,
  },
  turritella: {
    group: 'Gasterópodos',
    name: 'Turritella',
    W: 1.3,
    D: 0.1,
    T: 6.5,
    S: 1.0,
    turns: 14,
    hand: 1,
    mirror: false,
  },
  trochus: {
    group: 'Gasterópodos',
    name: 'Trompo (Trochus)',
    W: 1.45,
    D: 0.0,
    T: 3.0,
    S: 0.6,
    turns: 9,
    hand: 1,
    mirror: false,
  },
  planorbis: {
    group: 'Gasterópodos',
    name: 'Planorbis (planispiral)',
    W: 2.1,
    D: 0.3,
    T: 0.15,
    S: 1.0,
    turns: 5,
    hand: -1,
    mirror: false,
  },
  physa: {
    group: 'Gasterópodos',
    name: 'Physa (sinistral)',
    W: 2.6,
    D: 0.0,
    T: 3.0,
    S: 1.5,
    turns: 4.5,
    hand: -1,
    mirror: false,
  },
  peringia: {
    group: 'Gasterópodos',
    name: 'Peringia (Peringia ulvae)',
    W: 1.8,
    D: 0.0,
    T: 3.8,
    S: 1.2,
    turns: 6.5,
    hand: 1,
    mirror: false,
  },
  nautilus: {
    group: 'Cefalópodos',
    name: 'Nautilus (Nautilus pompilius)',
    W: 3.2,
    D: 0.02,
    T: 0.0,
    S: 0.85,
    turns: 4,
    hand: 1,
    mirror: false,
  },
  ammonite: {
    group: 'Cefalópodos',
    name: 'Ammonite evoluto (Dactylioceras)',
    W: 1.9,
    D: 0.45,
    T: 0.0,
    S: 0.9,
    turns: 7,
    hand: 1,
    mirror: false,
  },
  almeja: {
    group: 'Bivalvos',
    name: 'Almeja (Venus)',
    W: 1000,
    D: 0.0,
    T: 0.35,
    S: 1.1,
    turns: 1,
    hand: 1,
    mirror: true,
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
    // Meinhardt (2009, §4.1 and §4.5, Fig. 4.8): an oscillating
    // activator–substrate system. Each cell fires when enough substrate has
    // built up, uses it and waits; strong saturation (κ) makes each burst last
    // longer, so the stripes are about as wide as the gaps. A graded signal makes
    // the outer side of the whorl run faster (substrate production, activator
    // decay and source density alike, his Fig. 4.2): it oscillates about twice as
    // fast as the inner side and acts as a pacemaker. Weak activator diffusion
    // keeps neighbouring cells only partly in step, so the lines stay continuous
    // where they can, bend, and merge or end towards the umbilicus, as on the
    // real shell, which has about 8 lines a year at the periphery and 4 inside.
    // Parameters tuned on the shell (the book does not give them).
    model: 'AS',
    Da: 0.007,
    D2: 0,
    ra: 0.3,
    r2: 0,
    kappa: 20,
    ba: 0.001,
    b2: 0.045,
    noise: 0.2,
    globalCtl: 0,
    grad: 1,
    T: 12000,
    insertion: true,
    amount: 0.85,
    base: '#f1e7d6',
    pigment: '#9c4a1f',
  },
  cepaea: {
    // Stable peaks (long-range lateral inhibition) → spiral bands
    model: 'AI',
    Da: 0.02,
    D2: 12,
    ra: 0.01,
    r2: 0.015,
    kappa: 0.4,
    ba: 0.005,
    b2: 0,
    noise: 0.05,
    globalCtl: 0,
    T: 3000,
    insertion: false,
    base: '#ecc95a',
    pigment: '#3a2216',
  },
  naticarius: {
    // Both mechanisms at once: an inhibitor of medium range keeps the peaks apart
    // along the margin, as in the bands, and outlives the activator, so each peak
    // switches on and off, as in the flames. Every peak blinks in place and leaves
    // a spiral row of spots, like the moon snails Naticarius (N. onca). The spots
    // are short in time because, near the aperture, one unit of time covers a long
    // stretch of shell: on the shell they come out round.
    model: 'AI',
    Da: 0.05,
    D2: 4,
    ra: 0.2,
    r2: 0.1,
    kappa: 0,
    ba: 0.05,
    b2: 0,
    noise: 0.1,
    globalCtl: 0,
    T: 3000,
    insertion: true,
    size: 1.6,
    amount: 0.65,
    base: '#f4ead8',
    pigment: '#8b4a24',
  },
  oliva: {
    // Meinhardt & Klingler (1987, Fig. 8) and Meinhardt (2009, eq. 6.1), with the
    // constants of Meinhardt's own program for Oliva porphyria (OLIVA.BAS, from
    // the book's CD and his web page): D_a 0.015, r_a 0.1, κ 0.25, r_h 0.014,
    // D_h 0, hormone 0.1, ±4 % source density, no basal production. Activation
    // travels as waves that draw oblique lines and die when they meet. A hormone
    // shared by the whole margin (global control) counts the waves: when few are
    // left, the inhibitor is removed quickly, the active cells stay active and
    // start backward waves. Many lines branch at once, opening the tent-shaped
    // triangles; phases of large triangles alternate with phases of small ones
    // and of dense parallel lines. His 630 cells cover one side of the shell; the
    // whole margin has 853 (size 0.3), and the long growth time keeps the
    // triangles about as tall as they are wide, as in his figures. With cell
    // insertion they keep their size as the shell grows; a high pigment amount
    // draws the lines about as thick as on the real shell.
    model: 'AI',
    Da: 0.015,
    D2: 0,
    ra: 0.1,
    r2: 0.014,
    kappa: 0.25,
    ba: 0,
    b2: 0,
    noise: 0.04,
    globalCtl: 0.1,
    T: 55000,
    insertion: true,
    size: 0.3,
    amount: 0.8,
    base: '#f1dcd6',
    pigment: '#4b1f2c',
  },
  conus: {
    // Meinhardt & Klingler (1987, Fig. 9). Activator–substrate: waves travel and
    // die when they meet, as in the oblique lines. The hormone (global control)
    // slows the production of substrate; when few waves are left, there is more
    // substrate and the active cells switch to a steady activation, low but above
    // the pigment threshold. The region between two branches stays pigmented,
    // which leaves white triangles on a dark background. The paper gives neither
    // the activator diffusion nor the basal production: 0.005 and 0.001 reproduce
    // its figure. Its saturation (κ = 3) ends up in stripes on a whole shell, with
    // many more cells than its 69; 2.5 keeps the triangles with any seed. A high pigment amount (low threshold) is what makes the steady
    // activation show; growth time and cell size are set so that the triangles
    // are about as long as they are wide on the shell.
    // Meinhardt (2009, ch. 7) later explained this shell with a separate
    // extinguishing reaction instead; this preset keeps the model of 1987.
    model: 'AS',
    Da: 0.005,
    D2: 0,
    ra: 0.1,
    r2: 0.005,
    kappa: 2.5,
    ba: 0.001,
    b2: 0.038,
    noise: 0.05,
    globalCtl: 0.05,
    T: 45000,
    insertion: true,
    size: 0.8,
    amount: 0.85,
    base: '#f7f1e6',
    pigment: '#3b2116',
  },
};

export const DEFAULT_PATTERN = 'nautilus';

/**
 * Constants loaded when the model is changed in the advanced controls. The
 * activator–substrate set is an excitable medium (no substrate saturation,
 * slow recovery) in which a weak hormone (global control) keeps the waves going:
 * it draws travelling waves, oblique lines and V shapes. It is not offered as a
 * species preset.
 */
export const MODEL_DEFAULTS = {
  // Oscillation: the inhibitor outlives the activator, so the whole margin flashes
  // periodically and draws stripes parallel to the growth lines; strong
  // saturation widens them and weak coupling makes them wavy, like flames.
  AI: {
    model: 'AI',
    Da: 0.04,
    D2: 0,
    ra: 0.24,
    r2: 0.06,
    kappa: 2,
    ba: 0.05,
    b2: 0,
    noise: 0.4,
    globalCtl: 0,
    T: 3000,
    insertion: true,
    amount: 0.8,
    base: '#f1e7d6',
    pigment: '#9c4a1f',
  },
  AS: {
    model: 'AS',
    Da: 0.01,
    D2: 0,
    ra: 0.05,
    r2: 0.002,
    kappa: 0,
    ba: 0,
    b2: 0.02,
    noise: 0.4,
    globalCtl: 0.02,
    T: 8000,
    insertion: false,
    amount: 0.6,
    base: '#efe3cf',
    pigment: '#5a2d1e',
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
  // Spiny venus (Pitar lupanaria): fine concentric ribs and a row of long spines along
  // the posterior margin. Spines only start once the valve is a fifth of its final size
  pitar: {
    shape: SHAPE('almeja'),
    orn: { ribN: 60, ribH: 0.025, ribW: 0.3, spineN: 36, spineH: 0.7, spineW: 0.45, spinePos: 0.25 },
  },
};
