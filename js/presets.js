/**
 * Valores aproximados de los parámetros de Raup para formas reales.
 * Son estimaciones dentro del morfoespacio de Raup (1966), no medidas de
 * ejemplares concretos.
 */
export const PRESETS = {
  caracol: {
    name: 'Caracol de jardín (Cornu aspersum)',
    W: 2.4, D: 0.08, T: 1.6, S: 1.0, turns: 4.5, hand: 1,
  },
  nautilus: {
    name: 'Nautilus (Nautilus pompilius)',
    W: 3.2, D: 0.02, T: 0.0, S: 0.85, turns: 4, hand: 1,
  },
  ammonite: {
    name: 'Ammonite evoluto (Dactylioceras)',
    W: 1.9, D: 0.45, T: 0.0, S: 0.9, turns: 7, hand: 1,
  },
  turritella: {
    name: 'Turritella',
    W: 1.3, D: 0.1, T: 6.5, S: 1.0, turns: 14, hand: 1,
  },
  trochus: {
    name: 'Trompo (Trochus)',
    W: 1.8, D: 0.0, T: 2.5, S: 0.8, turns: 7, hand: 1,
  },
  planorbis: {
    name: 'Planorbis (gasterópodo planispiral)',
    W: 2.1, D: 0.3, T: 0.15, S: 1.0, turns: 5, hand: -1,
  },
  physa: {
    name: 'Physa (sinistral)',
    W: 3.5, D: 0.05, T: 2.2, S: 1.4, turns: 4, hand: -1,
  },
};

export const DEFAULT_PRESET = 'caracol';
