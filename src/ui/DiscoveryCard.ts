import '../styles/discovery-reveal.css';

export class DiscoveryCard {
  readonly root = document.createElement('section');
  private kicker = document.createElement('div');
  private title = document.createElement('h2');
  private text = document.createElement('p');
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
    this.root.append(panel);
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
  hide(): void {
    this.root.hidden = true;
    delete this.root.dataset.poi;
    document.body.classList.remove('is-revealing');
  }
  dispose(): void {
    this.hide();
    this.root.remove();
  }
}
