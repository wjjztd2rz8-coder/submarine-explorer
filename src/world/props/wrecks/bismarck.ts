import type { WreckBuilt } from './assemble.js';
import type { WreckDetail } from './detail.js';
import { buildTitanicBow } from './titanicBow.js';

export function buildBismarck(dims: readonly [number, number, number], seed: number, detail: WreckDetail): WreckBuilt {
  return buildTitanicBow(dims, seed, detail);
}
