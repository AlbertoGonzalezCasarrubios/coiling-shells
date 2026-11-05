/**
 * Pigmentación de conchas con los modelos de reacción-difusión de H. Meinhardt
 * (Meinhardt & Klingler 1987; Meinhardt, "The Algorithmic Beauty of Sea Shells").
 *
 * El pigmento se deposita solo en el borde de la apertura mientras la concha
 * crece: es un sistema 1D (x a lo largo del borde, periódico) cuya historia
 * queda grabada en la concha. Cada fila del resultado es el estado del borde en
 * un instante; la fila 0 es el ápice y la última, la apertura.
 *
 * Activador-inhibidor (picos estables, oscilaciones, ondas):
 *   ∂a/∂t = s·(a²/(h·(1 + κa²)) + b_a) − r_a·a + D_a·∂²a/∂x²
 *   ∂h/∂t = s·a² − r_h·h + D_h·∂²h/∂x² + b_h
 *
 * Activador-sustrato (ondas viajeras: el sustrato agotado tarda en recuperarse):
 *   ∂a/∂t = s·b·(a²/(1 + κa²) + b_a) − r_a·a + D_a·∂²a/∂x²
 *   ∂b/∂t = b_b − s·b·(a²/(1 + κa²) + b_a) − r_b·b + D_b·∂²b/∂x²
 *
 * s = r_a·(1 ± ruido) es la densidad de fuente de cada célula (heterogeneidad
 * celular). Con inserción de células, el borde gana células en proporción al
 * tamaño de la concha, así que los rasgos del patrón mantienen su tamaño absoluto
 * y aparecen rayas nuevas intercaladas a medida que la concha crece. Control global (solo activador-sustrato): una señal c, común a todo
 * el borde, sigue la actividad media; cuando las ondas se aniquilan y la
 * actividad cae, c baja y favorece el disparo de ondas nuevas, que es el
 * mecanismo de ramificación de los triángulos de Oliva porphyria.
 */

export const MODELS = ['AI', 'AS'];

/** Generador pseudoaleatorio con semilla (mulberry32): el mismo patrón para la misma semilla. */
export function rng32(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {object} p  parámetros del modelo
 * @param {'AI'|'AS'} p.model
 * @param {number} p.Da, p.D2   difusión del activador y de la segunda sustancia
 * @param {number} p.ra, p.r2   tasas de decaimiento
 * @param {number} p.kappa      saturación de la autocatálisis
 * @param {number} p.ba, p.b2   producción basal del activador y de la segunda sustancia
 * @param {number} p.noise      fluctuación de la densidad de fuente (0–1)
 * @param {number} p.globalCtl  intensidad del control global (0 = sin control)
 * @param {number} p.T          tiempo total simulado desde el ápice hasta la apertura
 * @param {number} p.seed
 * @param {boolean} p.insertion inserción de células: el borde crece con la concha
 * @param {object} g  geometría del crecimiento
 * @param {number} g.W, g.turns parámetros de Raup (para el tamaño en cada fila)
 * @param {number} g.rows       filas del resultado
 * @param {number} g.width      columnas del resultado (se remuestrea el borde)
 * @param {number} g.nMax       células en la apertura
 * @returns {Float32Array} pigmento normalizado 0–1, rows × width
 */
export function simulatePattern(p, g) {
  const { rows, width, nMax } = g;
  const nMin = 8;
  const rand = rng32(p.seed);
  const isAS = p.model === 'AS';

  // Tamaño relativo de la concha en cada fila (1 en la apertura)
  const lnW = Math.log(Math.max(g.W, 1.0001));
  const size = new Float64Array(rows);
  for (let i = 0; i < rows; i++) {
    const theta = -2 * Math.PI * g.turns * (1 - i / (rows - 1));
    size[i] = Math.exp((theta / (2 * Math.PI)) * lnW);
  }

  // Una espiral logarítmica recorrida a ritmo angular constante equivale a un
  // crecimiento con tasa relativa constante (exponencial): el tiempo es el mismo
  // en cada fila. Lo que cambia con el tamaño es la longitud del borde, que
  // gana células (inserción) en proporción al tamaño de la concha.

  // Paso de Euler estable: difusión (dt·D ≤ 0.4 con Δx = 1) y reacción
  const Dmax = Math.max(p.Da, p.D2, 1e-6);
  const rmax = Math.max(p.ra, p.r2, 1e-6);
  const dt = Math.min(0.5, 0.4 / Dmax, 0.4 / rmax);

  // Estado del borde (capacidad nMax; se usan las n primeras células)
  let n = p.insertion ? Math.max(nMin, Math.round(nMax * size[0])) : nMax;
  const a = new Float64Array(nMax);
  const b = new Float64Array(nMax);
  const s = new Float64Array(nMax);
  const na = new Float64Array(nMax);
  const nb = new Float64Array(nMax);

  const source = () => p.ra * (1 + p.noise * (2 * rand() - 1));
  const a0 = isAS ? 1 : Math.max(p.r2 / p.ra, 0.05);
  const b0 = isAS ? p.b2 / Math.max(p.r2 + p.ra, 1e-6) : a0;
  for (let i = 0; i < n; i++) {
    s[i] = source();
    a[i] = isAS ? (rand() < 0.08 ? 2 : 0.02) : a0 * (0.5 + rand());
    b[i] = b0;
  }

  let c = 0; // señal global (actividad media)
  const cRate = 0.02;

  const out = new Float32Array(rows * width);
  let carry = 0;

  for (let row = 0; row < rows; row++) {
    // Inserción de células: se duplica una célula al azar, con su propia fuente
    if (p.insertion) {
      const target = Math.min(nMax, Math.max(nMin, Math.round(nMax * size[row])));
      while (n < target) {
        const k = Math.floor(rand() * n);
        a.copyWithin(k + 1, k, n);
        b.copyWithin(k + 1, k, n);
        s.copyWithin(k + 1, k, n);
        s[k + 1] = source();
        n++;
      }
    }

    carry += p.T / rows / dt;
    const steps = Math.floor(carry);
    carry -= steps;

    for (let step = 0; step < steps; step++) {
      let mean = 0;
      for (let i = 0; i < n; i++) mean += a[i];
      mean /= n;
      c += dt * cRate * (mean - c);
      // Cuando la actividad global cae, aumenta la activación basal
      const baEff = p.ba + (isAS && p.globalCtl > 0 ? p.globalCtl / (1 + 40 * c) : 0);

      for (let i = 0; i < n; i++) {
        const l = i === 0 ? n - 1 : i - 1;
        const r = i === n - 1 ? 0 : i + 1;
        const ai = a[i];
        const bi = b[i];
        const lapA = a[l] + a[r] - 2 * ai;
        const lapB = b[l] + b[r] - 2 * bi;
        const a2 = ai * ai;
        if (isAS) {
          const prod = s[i] * bi * (a2 / (1 + p.kappa * a2) + baEff);
          na[i] = ai + dt * (prod - p.ra * ai + p.Da * lapA);
          nb[i] = bi + dt * (p.b2 - prod - p.r2 * bi + p.D2 * lapB);
        } else {
          const prod = s[i] * (a2 / ((bi + 1e-9) * (1 + p.kappa * a2)) + baEff);
          na[i] = ai + dt * (prod - p.ra * ai + p.Da * lapA);
          nb[i] = bi + dt * (s[i] * a2 - p.r2 * bi + p.D2 * lapB + p.b2);
        }
      }
      // Límites para que parámetros extremos no desborden (NaN > 0 es falso → 0)
      for (let i = 0; i < n; i++) {
        a[i] = na[i] > 0 ? (na[i] < 1e4 ? na[i] : 1e4) : 0;
        b[i] = nb[i] > 1e-9 ? (nb[i] < 1e6 ? nb[i] : 1e6) : 1e-9;
      }
    }

    // Remuestreo periódico del borde (n células) a la anchura de la textura
    const base = row * width;
    for (let k = 0; k < width; k++) {
      const x = (k / width) * n;
      const i0 = Math.floor(x);
      const t = x - i0;
      const i1 = i0 + 1 === n ? 0 : i0 + 1;
      out[base + k] = a[i0] * (1 - t) + a[i1] * t;
    }
  }

  normalize(out);
  return out;
}

/** Escala robusta a 0–1 usando percentiles, para que un pico aislado no apague el resto. */
function normalize(v) {
  const sample = [];
  const stride = Math.max(1, Math.floor(v.length / 20000));
  for (let i = 0; i < v.length; i += stride) sample.push(v[i]);
  sample.sort((x, y) => x - y);
  const lo = sample[Math.floor(sample.length * 0.02)];
  const hi = sample[Math.min(sample.length - 1, Math.floor(sample.length * 0.995))];
  const span = hi - lo || 1;
  for (let i = 0; i < v.length; i++) {
    const x = (v[i] - lo) / span;
    v[i] = x < 0 ? 0 : x > 1 ? 1 : x;
  }
}
