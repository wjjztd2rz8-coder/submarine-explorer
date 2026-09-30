/**
 * PWA service-worker registration (F1-TOUCH). Production builds only, and
 * never under automation (`navigator.webdriver`), so the e2e suites keep
 * talking to the network. The worker lives at `<base>sw.js` (`public/sw.js`,
 * stamped by `tools/pwaPlugin.ts`), which puts its scope at the Vite base,
 * `/` or `/submarine-explorer/`.
 */

/** Should this page register the worker? Pure, for tests. */
export function shouldRegisterServiceWorker(
  prod: boolean,
  webdriver: boolean,
  hasApi: boolean,
  secure: boolean,
): boolean {
  return prod && !webdriver && hasApi && secure;
}

export function registerServiceWorker(): void {
  if (
    !shouldRegisterServiceWorker(
      import.meta.env.PROD,
      navigator.webdriver === true,
      'serviceWorker' in navigator,
      window.isSecureContext,
    )
  )
    return;
  const url = new URL(`${import.meta.env.BASE_URL}sw.js`, window.location.href);
  const register = (): void => {
    navigator.serviceWorker.register(url.href, { scope: new URL('./', url).href }).catch(() => {
      /* Offline caching is a bonus; the game runs without it. */
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
