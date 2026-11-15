/** A page-level cache shared by reticles; attribute reads do not force layout. */
interface ControlRects {
  dirty: boolean;
  elements: HTMLElement[];
  visibility: string;
  rects: DOMRect[];
}
const caches = new WeakMap<Window, ControlRects>();

export function touchControlRects(): readonly DOMRect[] {
  let cache = caches.get(window);
  if (!cache) {
    cache = { dirty: true, elements: [], visibility: '', rects: [] };
    caches.set(window, cache);
    const current = cache;
    const invalidate = (): void => {
      current.dirty = true;
    };
    window.addEventListener('resize', invalidate);
    window.addEventListener('orientationchange', invalidate);
  }
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>('.tc-stick, .tc-slider, .tc-buttons, .tc-btn-pause'),
  );
  // Include ancestors: hidden tc-root, expanded sonar and UI scale affect these boxes.
  // Ignore feedback classes whose only effect is colour; held controls must not read layout.
  const visibility = elements
    .map((el) => {
      const attributes: string[] = [];
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        attributes.push(
          `${node.hidden}/${node.className.replace(/\b(is-held|is-ready)\b/g, '').trim()}/${node.getAttribute('style') ?? ''}`,
        );
      }
      return attributes.join('|');
    })
    .join(';');
  if (
    cache.dirty ||
    visibility !== cache.visibility ||
    elements.length !== cache.elements.length ||
    elements.some((el, i) => el !== cache.elements[i])
  ) {
    cache.elements = elements;
    cache.visibility = visibility;
    cache.rects = elements
      .filter((el) => el.checkVisibility())
      .map((el) => el.getBoundingClientRect());
    cache.dirty = false;
  }
  return cache.rects;
}
