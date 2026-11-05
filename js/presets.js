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
};

export const DEFAULT_PRESET = 'caracol';

/**
 * Patrones de pigmentación (modelos de Meinhardt) ajustados para parecerse a
 * especies conocidas. Los parámetros están en unidades de célula del borde
 * (256 células en la apertura) y del tiempo total simulado T.
 */
export const PATTERN_PRESETS = {
  nautilus: {
    // Oscilación: el inhibidor vive más que el activador → rayas en llama paralelas al borde
    model: 'AI', Da: 0.01, D2: 0, ra: 0.08, r2: 0.02, kappa: 0.2, ba: 0.05, b2: 0,
    noise: 0.3, globalCtl: 0, T: 3000, insertion: true, base: '#f1e7d6', pigment: '#9c4a1f',
  },
  cepaea: {
    // Picos estables (inhibición lateral de largo alcance) → bandas espirales
    model: 'AI', Da: 0.02, D2: 12, ra: 0.01, r2: 0.015, kappa: 0.4, ba: 0.005, b2: 0,
    noise: 0.05, globalCtl: 0, T: 3000, insertion: false, base: '#ecc95a', pigment: '#3a2216',
  },
  oliva: {
    // Ondas viajeras por agotamiento del sustrato + control global → zigzags y triángulos
    model: 'AS', Da: 0.004, D2: 0, ra: 0.05, r2: 0, kappa: 0.5, ba: 0.0005, b2: 0.02,
    noise: 0.3, globalCtl: 0.01, T: 8000, insertion: false, base: '#e6c6b0', pigment: '#4b2a3c',
  },
};

export const DEFAULT_PATTERN = 'nautilus';
