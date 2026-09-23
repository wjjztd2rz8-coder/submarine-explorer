/** Resolve a root-relative public asset path under Vite's deployment base. */
export function publicUrl(path: string, base = import.meta.env.BASE_URL): string {
  return `${base}${path.replace(/^\//, '')}`;
}
