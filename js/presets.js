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
