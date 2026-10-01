import { PROGRESS_CONFIG, UPGRADES } from '../core/config/progress.js';
import type { Progress } from '../game/Progress.js';
import { FocusTrap } from './FocusTrap.js';
import '../styles/upgrades.css';

/** A single scrollable workshop, with native buttons for touch and keyboard. */
export class Upgrades {
  readonly root = document.createElement('div');
  private readonly panel = document.createElement('section');
  private readonly trap: FocusTrap;
  private readonly off: () => void;
  private previous: HTMLElement | null = null;
  constructor(private readonly progress: Progress) {
    this.root.className = 'upgrades';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Upgrades');
    this.panel.className = 'upgrades-panel';
    this.root.append(this.panel);
    document.body.append(this.root);
    this.trap = new FocusTrap(this.root);
    this.off = progress.onChange(() => {
      if (this.isOpen) this.render();
    });
    window.addEventListener('keydown', this.key, true);
  }
  get isOpen(): boolean {
    return !this.root.hidden;
  }
  open(): void {
    this.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.exitPointerLock?.();
    this.render();
    this.root.hidden = false;
    this.trap.activate();
    this.panel.querySelector<HTMLButtonElement>('.upgrades-close')?.focus();
  }
  close(): void {
    this.root.hidden = true;
    this.trap.deactivate();
    this.previous?.focus();
  }
  private readonly key = (event: KeyboardEvent): void => {
    if (!this.isOpen || event.code !== 'Escape') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.close();
  };
  private render(): void {
    const focus = (document.activeElement as HTMLElement | null)?.dataset.upgrade;
    const scroll = this.panel.scrollTop;
    this.panel.replaceChildren();
    const head = document.createElement('header');
    const title = document.createElement('h1');
    title.textContent = 'Research workshop';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'upgrades-close';
    close.textContent = 'Back';
    close.onclick = () => this.close();
    head.append(title, close);
    const balance = document.createElement('p');
    balance.className = 'upgrades-balance';
    balance.setAttribute('aria-live', 'polite');
    balance.textContent = `${this.progress.points} RP available · ${this.progress.lifetime} RP earned`;
    const hint = document.createElement('p');
    hint.className = 'upgrades-hint';
    hint.textContent =
      'Scan new discoveries, photograph new subjects and finish dives to earn research points.';
    const hulls = document.createElement('div');
    hulls.className = 'upgrades-hulls';
    for (const hull of PROGRESS_CONFIG.hulls) {
      const card = document.createElement('p');
      card.className = this.progress.lifetime >= hull.threshold ? 'is-unlocked' : '';
      card.textContent = `Class ${hull.id} · ${hull.depthM.toLocaleString('en-US')} m · ${this.progress.lifetime >= hull.threshold ? 'Unlocked' : `${hull.threshold} lifetime RP`}`;
      hulls.append(card);
    }
    const note = document.createElement('p');
    note.className = 'upgrades-hint';
    note.textContent = 'Hull classes unlock automatically. Spending RP keeps your hull progress.';
    const tracks = document.createElement('div');
    tracks.className = 'upgrades-tracks';
    for (const track of ['Lights', 'Sonar', 'Power', 'Propulsion']) {
      const section = document.createElement('section');
      const heading = document.createElement('h2');
      heading.textContent = track;
      section.append(heading);
      for (const upgrade of UPGRADES.filter((u) => u.track === track)) {
        const row = document.createElement('div');
        row.className = 'upgrade-card';
        const name = document.createElement('h3');
        name.textContent = upgrade.name;
        const level = document.createElement('small');
        level.textContent = `Level ${this.progress.level(upgrade.id)} / ${upgrade.costs.length}`;
        const effect = document.createElement('p');
        effect.textContent = `${upgrade.effect} per level`;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.upgrade = upgrade.id;
        const cost = this.progress.cost(upgrade.id);
        button.textContent = cost === null ? 'Fully upgraded' : `Upgrade · ${cost} RP`;
        button.disabled =
          cost === null || this.progress.points < cost || this.progress.save.readOnly;
        button.onclick = () => this.progress.buy(upgrade.id);
        row.append(name, level, effect, button);
        section.append(row);
      }
      tracks.append(section);
    }
    this.panel.append(head, balance, hint, hulls, note, tracks);
    if (focus) this.panel.querySelector<HTMLButtonElement>(`[data-upgrade="${focus}"]`)?.focus();
    this.panel.scrollTop = scroll;
  }
  dispose(): void {
    this.off();
    window.removeEventListener('keydown', this.key, true);
    this.trap.deactivate();
    this.root.remove();
  }
}
