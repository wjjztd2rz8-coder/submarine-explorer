/** Return to the home route while retaining device preferences across game boots. */
export function shellUrl(href: string, params = new URL(href).searchParams): string {
  const url = new URL('.', href);
  for (const key of ['tier', 'touch']) {
    const value = params.get(key);
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}
