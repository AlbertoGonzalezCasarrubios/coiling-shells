// Computes the pigmentation pattern off the main thread so the interface does not freeze
import { simulatePattern } from '../model/meinhardt.js';

self.onmessage = (e) => {
  const { id, p, g } = e.data;
  const { values, second, state } = simulatePattern(p, g);
  self.postMessage({ id, v: values, second, state }, [values.buffer, second.buffer]);
};
