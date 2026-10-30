/**
 * Modelo geométrico de enrollamiento de conchas de D. M. Raup (1962, 1966).
 *
 * La concha se genera desplazando una curva generadora (una elipse, la
 * "apertura") a lo largo de una espiral logarítmica alrededor de un eje fijo.
 * En cada revolución completa (Δθ = 2π) la curva generadora se escala por W.
 *
 * Convención (eje de enrollamiento = eje z matemático = eje Y de Three.js):
 *
 *   g(θ)  = W^(θ / 2π)                       factor de crecimiento
 *   r_c   = (1 + D) / 2                       distancia del centro de la apertura al eje
 *   a     = (1 − D) / 2                       semieje radial de la elipse
 *   b     = S · a                             semieje axial de la elipse
 *
 *   x(θ,φ) = g · (r_c + a cos φ) · cos θ
 *   y(θ,φ) = g · (r_c + a cos φ) · sin θ · h  (h = ±1, dextral / sinistral)
 *   z(θ,φ) = g · (−T · r_c + b sin φ)
 *
 * Así, en la apertura final (θ = 0, g = 1) el borde interno queda a distancia
 * D del eje y el externo a distancia 1, por lo que D = r_interno / r_externo,
 * tal y como lo define Raup. T es el desplazamiento axial del centro de la
 * curva generadora relativo a su desplazamiento radial.
 * θ recorre [−2π·N, 0]; el ápice (θ → −∞) está en el origen.
 */

/**
 * @param {object} p
 * @param {number} p.W  tasa de expansión de la espiral (> 1)
 * @param {number} p.D  distancia relativa de la curva generadora al eje [0, 1)
 * @param {number} p.T  tasa de traslación a lo largo del eje
 * @param {number} p.S  forma de la curva generadora (b / a)
 * @param {number} p.turns        número de vueltas
 * @param {number} p.hand         +1 dextral, −1 sinistral
 * @param {number} p.segPerTurn   segmentos en θ por vuelta
 * @param {number} p.segPhi       segmentos en φ alrededor de la apertura
 * @param {number} p.spiralLines  nº de líneas espirales (a lo largo de θ)
 * @param {number} p.ringsPerTurn nº de líneas de crecimiento por vuelta
 * @param {number} p.size         tamaño máximo tras normalizar
 */
export function buildShell(p) {
  const W = Math.max(p.W, 1.0001);
  const { D, T, S, hand } = p;
  const segPhi = p.segPhi;
  const nTheta = Math.max(2, Math.round(p.turns * p.segPerTurn));
  const thetaMin = -2 * Math.PI * p.turns;

  const rc = (1 + D) / 2;
  const a = (1 - D) / 2;
  const b = S * a;

  const rows = nTheta + 1;
  const count = rows * segPhi;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const cosPhi = new Float32Array(segPhi);
  const sinPhi = new Float32Array(segPhi);
  for (let j = 0; j < segPhi; j++) {
    const phi = (j / segPhi) * Math.PI * 2;
    cosPhi[j] = Math.cos(phi);
    sinPhi[j] = Math.sin(phi);
  }

  const logW = Math.log(W);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < rows; i++) {
    const theta = thetaMin + (i / nTheta) * (-thetaMin);
    const g = Math.exp((theta / (2 * Math.PI)) * logW);
    const ct = Math.cos(theta);
    const st = Math.sin(theta) * hand;
    // Bandas de crecimiento (solo afectan al color en modo sólido)
    const growth = 0.5 + 0.5 * Math.cos(theta * 3.0);
    for (let j = 0; j < segPhi; j++) {
      const R = g * (rc + a * cosPhi[j]);
      const x = R * ct;
      const z = R * st;          // y matemático → z de Three.js
      const y = g * (-T * rc + b * sinPhi[j]); // z matemático → y de Three.js
      const k = (i * segPhi + j) * 3;
      positions[k] = x;
      positions[k + 1] = y;
      positions[k + 2] = z;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;

      const spiral = 0.5 + 0.5 * Math.cos(j / segPhi * Math.PI * 2 * 6);
      const shade = 1 - 0.22 * Math.pow(growth, 6) - 0.08 * spiral * growth;
      colors[k] = shade;
      colors[k + 1] = shade * 0.97;
      colors[k + 2] = shade * 0.93;
    }
  }

  // Normalizar: centrar en el origen y escalar a un tamaño fijo, para que la
  // cámara no tenga que reencuadrar al cambiar los parámetros.
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const scale = p.size / extent;
  for (let k = 0; k < positions.length; k += 3) {
    positions[k] = (positions[k] - cx) * scale;
    positions[k + 1] = (positions[k + 1] - cy) * scale;
    positions[k + 2] = (positions[k + 2] - cz) * scale;
  }

  // Triángulos de la superficie (la apertura es una curva cerrada en φ)
  const indices = new Uint32Array(nTheta * segPhi * 6);
  let t = 0;
  for (let i = 0; i < nTheta; i++) {
    for (let j = 0; j < segPhi; j++) {
      const j1 = (j + 1) % segPhi;
      const v00 = i * segPhi + j, v01 = i * segPhi + j1;
      const v10 = (i + 1) * segPhi + j, v11 = (i + 1) * segPhi + j1;
      indices[t++] = v00; indices[t++] = v10; indices[t++] = v01;
      indices[t++] = v01; indices[t++] = v10; indices[t++] = v11;
    }
  }

  // Líneas: espirales (φ fija) y líneas de crecimiento (θ fija)
  const lineIdx = [];
  const nSpiral = Math.min(p.spiralLines, segPhi);
  const usedPhi = new Set();
  for (let m = 0; m < nSpiral; m++) usedPhi.add(Math.round((m * segPhi) / nSpiral) % segPhi);
  for (const j of usedPhi) {
    for (let i = 0; i < nTheta; i++) lineIdx.push(i * segPhi + j, (i + 1) * segPhi + j);
  }
  const usedTheta = new Set([nTheta]);
  const totalRings = p.ringsPerTurn > 0 ? Math.floor(p.turns * p.ringsPerTurn) : 0;
  for (let m = 1; m <= totalRings; m++) {
    // contar desde la apertura hacia el ápice para que la apertura siempre tenga anillo
    const i = nTheta - Math.round((m * p.segPerTurn) / p.ringsPerTurn);
    if (i >= 0) usedTheta.add(i);
  }
  for (const i of usedTheta) {
    for (let j = 0; j < segPhi; j++) lineIdx.push(i * segPhi + j, i * segPhi + ((j + 1) % segPhi));
  }

  return {
    positions,
    colors,
    indices,
    lineIndices: new Uint32Array(lineIdx),
    // Eje de enrollamiento en coordenadas normalizadas
    axis: { x: -cx * scale, z: -cz * scale, yTop: (maxY - cy) * scale, yBottom: (minY - cy) * scale },
    derived: { rc, a, b },
    stats: { vertices: count, triangles: indices.length / 3 },
  };
}
