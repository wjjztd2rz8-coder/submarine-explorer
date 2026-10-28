// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import index from '../data/landmarks/index.json' with { type: 'json' };

export const siteIds = index.landmarks;

/** Raw declarations, before game parsers can reject or skip entries. */
export function propData(id: string): {
  props: { id: string; model: string; feature?: string }[];
} {
  return JSON.parse(readFileSync(`data/landmarks/${id}/props.json`, 'utf8'));
}

export function curiosityData(id: string): { secrets: unknown[]; samples: unknown[] } {
  return JSON.parse(readFileSync(`data/secrets/${id}.json`, 'utf8'));
}
