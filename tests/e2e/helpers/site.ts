// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import type { SiteManifest } from '../../../src/core/SiteManifest.js';
const ids: string[] = JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')).landmarks;

/** Read authored expectations without importing the browser's Vite manifest loader. */
export function siteData(id: string): SiteManifest {
  return JSON.parse(readFileSync(`data/landmarks/${id}/site.json`, 'utf8'));
}

export const missionApproachRanges: Readonly<Record<string, number>> = Object.fromEntries(
  ids.map((id) => [id, siteData(id).opening!.mission!.rangeM]),
);
