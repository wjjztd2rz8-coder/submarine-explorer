import '../styles/discovery-reveal.css';

export class DiscoveryCard {
  readonly root = document.createElement('section');
  private kicker = document.createElement('div');
  private title = document.createElement('h2');
  private text = document.createElement('p');
  private hint = document.createElement('div');
  private hintTimer = 0;
  constructor(onContinue: () => void, onRead: () => void) {
    this.root.className = 'discovery-reveal';
    this.root.hidden = true;
    this.root.setAttribute('aria-label', 'Discovery');
    this.root.setAttribute('aria-live', 'polite');
    const panel = document.createElement('div');
    panel.className = 'discovery-reveal-panel';
    this.kicker.className = 'discovery-reveal-kicker';
    const actions = document.createElement('div');
    actions.className = 'discovery-reveal-actions';
    for (const [label, callback] of [
      ['Continue', onContinue],
      ['Read more', onRead],
    ] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', callback);
      actions.append(button);
    }
    panel.append(this.kicker, this.title, this.text, actions);
    this.hint.className = 'discovery-reveal-hint';
    this.hint.textContent = 'Drag to look around';
    this.hint.hidden = true;
    this.hint.setAttribute('aria-hidden', 'true');
    this.root.append(this.hint, panel);
    document.body.append(this.root);
  }
  show(
    id: string,
    name: string,
    excerpt: string,
    count: number,
    total: number,
    site: string,
  ): void {
    this.root.dataset.poi = id;
    this.kicker.textContent = `DISCOVERY · ${count} of ${total} at ${site}`;
    this.title.textContent = name;
    this.text.textContent = excerpt;
    this.root.hidden = false;
    document.body.classList.add('is-revealing');
  }
  /**
   * The part of `view` (a viewport rect) the shown card leaves clear, as
   * fractions of it: left of a side rail, or above a bottom card.
   */
  clearRect(view: DOMRect): { x0: number; x1: number; y0: number; y1: number } | null {
    const panel = this.root.querySelector('.discovery-reveal-panel')?.getBoundingClientRect();
    if (!panel || this.root.hidden || !(view.width > 0 && view.height > 0)) return null;
    const rail = panel.left > view.left + view.width * 0.3 && panel.height > view.height * 0.7;
    if (rail) return { x0: 0, x1: clamp01((panel.left - view.left) / view.width), y0: 0, y1: 1 };
    return { x0: 0, x1: 1, y0: 0, y1: clamp01((panel.top - view.top) / view.height) };
  }
  /** A brief, quiet look-around hint over the view; fades by itself. */
  showHint(seconds = 4.5): void {
    window.clearTimeout(this.hintTimer);
    this.hint.hidden = false;
    this.hintTimer = window.setTimeout(() => this.hideHint(), seconds * 1000);
  }
  hideHint(): void {
    if (this.hint.hidden) return;
    window.clearTimeout(this.hintTimer);
    this.hint.hidden = true;
  }
  hide(): void {
    this.hideHint();
    this.root.hidden = true;
    delete this.root.dataset.poi;
    document.body.classList.remove('is-revealing');
  }
  dispose(): void {
    this.hide();
    this.root.remove();
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0.2, v));
}
