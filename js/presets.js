/**
 * Valores aproximados de los parámetros de Raup para formas reales.
 * Son estimaciones dentro del morfoespacio de Raup (1966), no medidas de
 * ejemplares concretos. `mirror` añade la valva especular (bivalvos).
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
    W: 1.8, D: 0.0, T: 2.5, S: 0.8, turns: 7, hand: 1, mirror: false,
  },
  planorbis: {
    group: 'Gasterópodos', name: 'Planorbis (planispiral)',
    W: 2.1, D: 0.3, T: 0.15, S: 1.0, turns: 5, hand: -1, mirror: false,
  },
  physa: {
    group: 'Gasterópodos', name: 'Physa (sinistral)',
    W: 3.5, D: 0.05, T: 2.2, S: 1.4, turns: 4, hand: -1, mirror: false,
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
  berberecho: {
    group: 'Bivalvos', name: 'Berberecho (Cerastoderma)',
    W: 60, D: 0.0, T: 0.15, S: 1.0, turns: 1, hand: 1, mirror: true,
  },
  mejillon: {
    group: 'Bivalvos', name: 'Mejillón (Mytilus)',
    W: 10000, D: 0.0, T: 1.1, S: 0.55, turns: 1, hand: 1, mirror: true,
  },
};

export const DEFAULT_PRESET = 'caracol';
