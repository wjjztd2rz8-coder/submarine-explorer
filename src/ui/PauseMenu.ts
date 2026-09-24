import { FocusTrap } from './FocusTrap.js';

export interface PauseObjective {
  title: string;
  hint: string;
  complete: boolean;
  primary: boolean;
}

export interface PauseActions {
  resume(): void;
  journal(): void;
  settings(): void;
  controls(): void;
  quit(): void;
  objectives(): PauseObjective[];
}

export class PauseMenu {
  readonly root: HTMLDivElement;
  readonly sitesSlot: HTMLDivElement;
  private readonly menu: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly title: HTMLElement;
  private readonly list: HTMLElement;
  private readonly trap: FocusTrap;
  private open_ = false;
  private view: 'menu' | 'objectives' | 'sites' = 'menu';

  constructor(
    private readonly actions: PauseActions,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'pause-menu';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Pause menu');
    const panel = document.createElement('div');
    panel.className = 'pause-panel';
    const kicker = document.createElement('p');
    kicker.className = 'pause-kicker';
    kicker.textContent = 'DIVE PAUSED';
    const heading = document.createElement('h1');
    heading.textContent = 'Pause menu';
    this.menu = document.createElement('nav');
    this.menu.className = 'pause-actions';
    this.menu.setAttribute('aria-label', 'Pause actions');
    const entry = (label: string, act: () => void): void => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', act);
      this.menu.append(button);
    };
    entry('Resume', actions.resume);
    entry('Objectives', () => this.showView('objectives'));
    entry('Mission select', () => this.showView('sites'));
    entry('Journal', actions.journal);
    entry('Settings', actions.settings);
    entry('Controls', actions.controls);
    entry('Quit to home', actions.quit);

    this.detail = document.createElement('section');
    this.detail.className = 'pause-detail';
    this.detail.hidden = true;
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = 'Back to pause menu';
    back.addEventListener('click', () => this.showView('menu'));
    this.title = document.createElement('h2');
    this.list = document.createElement('ul');
    this.list.className = 'pause-objectives';
    this.sitesSlot = document.createElement('div');
    this.sitesSlot.className = 'pause-sites-scroll';
    this.detail.append(back, this.title, this.list, this.sitesSlot);
    panel.append(kicker, heading, this.menu, this.detail);
    this.root.append(panel);
    parent.append(this.root);
    this.trap = new FocusTrap(this.root);
  }

  get isOpen(): boolean {
    return this.open_;
  }

  open(): void {
    if (this.open_) return;
    this.open_ = true;
    this.root.hidden = false;
    this.showView('menu');
    this.trap.activate();
    this.menu.querySelector('button')?.focus();
  }

  close(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.root.hidden = true;
    this.trap.deactivate();
  }

  escape(): void {
    if (this.view === 'menu') this.actions.resume();
    else this.showView('menu');
  }

  showView(view: 'menu' | 'objectives' | 'sites'): void {
    this.view = view;
    this.menu.hidden = view !== 'menu';
    this.detail.hidden = view === 'menu';
    this.list.hidden = view !== 'objectives';
    this.sitesSlot.hidden = view !== 'sites';
    if (view === 'objectives') {
      this.title.textContent = 'Objectives';
      const items = this.actions.objectives();
      this.list.replaceChildren();
      for (const item of items) {
        const row = document.createElement('li');
        row.className = item.complete ? 'is-complete' : '';
        const name = document.createElement('strong');
        name.textContent = `${item.complete ? '✓ ' : ''}${item.title}`;
        const kind = document.createElement('small');
        kind.textContent = item.primary ? 'Primary' : 'Secondary';
        const hint = document.createElement('p');
        hint.textContent = item.hint;
        row.append(name, kind, hint);
        this.list.append(row);
      }
      if (!items.length) this.list.textContent = 'Free dive · explore at your own pace.';
    } else if (view === 'sites') {
      this.title.textContent = 'Mission select';
    }
    if (this.open_) {
      if (view === 'menu') this.menu.querySelector('button')?.focus();
      else this.detail.querySelector('button')?.focus();
    }
  }
}
