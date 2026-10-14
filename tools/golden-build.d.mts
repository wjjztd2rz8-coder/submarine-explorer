import type { Plugin } from 'vite';

export function goldenBuild(): Plugin;
export function readGoldenBuild(html: string): { sha: string; dirty: boolean; buildMode: string };
