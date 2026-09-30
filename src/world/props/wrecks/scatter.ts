import type { WreckBuilt } from './assemble.js';
import type { WreckDetail } from './detail.js';
import type { LocalHeightFn } from './shared.js';
import type { WreckScatterId } from './variants.js';
import { buildTitanicBow } from './titanicBow.js';

export function buildWreckScatter(
  _id: WreckScatterId,
  dims: readonly [number, number, number],
  seed: number,
  detail: WreckDetail,
  _h?: LocalHeightFn,
): WreckBuilt {
  return buildTitanicBow(dims, seed, detail);
}
