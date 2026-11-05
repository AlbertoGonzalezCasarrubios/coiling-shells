// Calcula el patrón de pigmentación fuera del hilo principal para que la interfaz no se bloquee
import { simulatePattern } from './meinhardt.js';

self.onmessage = (e) => {
  const { id, p, g } = e.data;
  const v = simulatePattern(p, g);
  self.postMessage({ id, v }, [v.buffer]);
};
