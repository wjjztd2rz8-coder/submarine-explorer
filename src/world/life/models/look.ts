/** Typed readers for a species' free-form `look` record. */

import { rgb, type RGB } from './kit.js';

export type Look = Record<string, number | string | boolean | number[]>;

export const num = (l: Look, k: string, d: number): number => {
  const v = l[k];
  return typeof v === 'number' ? v : d;
};
export const col = (l: Look, k: string, d: number): RGB => {
  const v = l[k];
  return rgb(typeof v === 'number' ? v : d);
};
export const str = (l: Look, k: string, d: string): string => {
  const v = l[k];
  return typeof v === 'string' ? v : d;
};
