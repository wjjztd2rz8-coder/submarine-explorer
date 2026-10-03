import { FocusTrap } from './FocusTrap.js';
import { ModeSelector, type GameplaySettingsSource } from './ModeSelector.js';

export interface HomeActions {
  continueDive(): void;
  journal(): void;
  settings(): void;
  controls(): void;
}

/** Title screen; the C1 globe is mounted in `globeSlot` by the app. */
export class Home {
  readonly root: HTMLDivElement;
  readonly globeSlot: HTMLDivElement;
  readonly sitesSlot: HTMLDivElement;
  readonly continueButton: HTMLButtonElement;
  /** D2-PREDIVE: the Arcade / Realistic selector with Advanced above the menu (with a settings source). */
  readonly modeSelector: ModeSelector | null;
  private readonly dailyCard: HTMLButtonElement;
  private readonly diveSitesButton: HTMLButtonElement;
  private readonly menu: HTMLElement;
  private readonly sites: HTMLElement;
  private readonly trap: FocusTrap;
  private open_ = false;

  constructor(
    actions: HomeActions,
    parent: HTMLElement = document.body,
    gameplay?: GameplaySettingsSource,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'home-screen';
    this.root.hidden = true;
    this.root.setAttribute('aria-label', 'Submarine Explorer home');

    const copy = document.createElement('div');
    copy.className = 'home-copy';
    const kicker = document.createElement('p');
    kicker.className = 'home-kicker';
    kicker.textContent = 'EXPLORE THE REAL OCEAN FLOOR';
    const title = document.createElement('h1');
    title.textContent = 'Submarine Explorer';
    const sub = document.createElement('p');
    sub.className = 'home-tagline';
    sub.textContent = 'Choose a dive site. Follow what we know. Discover what lies below.';
    copy.append(kicker, title, sub);

    const menu = document.createElement('nav');
    menu.className = 'home-menu';
    menu.setAttribute('aria-label', 'Main menu');
    this.menu = menu;
    // D2-PREDIVE (playtest #3): the game mode sits right above the menu, so it
    // is seen before choosing a dive rather than hunted for in Settings.
    this.modeSelector = gameplay ? new ModeSelector('is-home', gameplay) : null;
    if (this.modeSelector) menu.append(this.modeSelector.root);
    const entry = (label: string, act: () => void): HTMLButtonElement => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', act);
      menu.append(button);
      return button;
    };
    this.dailyCard = document.createElement('button');
    this.dailyCard.type = 'button';
    this.dailyCard.className = 'daily-card';
    this.dailyCard.hidden = true;
    menu.append(this.dailyCard);
    this.continueButton = entry('Continue', actions.continueDive);
    this.continueButton.disabled = true;
    this.diveSitesButton = entry('Dive sites', () => this.showSites(false));
    entry('Free dive', () => this.showSites(true));
    entry('Journal', actions.journal);
    entry('Settings', actions.settings);
    entry('Controls', actions.controls);

    const globeWrap = document.createElement('div');
    globeWrap.className = 'home-globe-wrap';
    this.globeSlot = document.createElement('div');
    this.globeSlot.className = 'home-globe-slot';
    globeWrap.append(this.globeSlot);

    this.sites = document.createElement('section');
    this.sites.className = 'home-sites';
    this.sites.hidden = true;
    this.sites.setAttribute('aria-label', 'Dive sites');
    const sitesHead = document.createElement('div');
    sitesHead.className = 'home-sites-head';
    const sitesTitle = document.createElement('h2');
    sitesTitle.textContent = 'Dive sites';
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = 'Back to menu';
    back.addEventListener('click', () => this.closeSites());
    sitesHead.append(sitesTitle, back);
    this.sitesSlot = document.createElement('div');
    this.sitesSlot.className = 'home-sites-scroll';
    this.sites.append(sitesHead, this.sitesSlot);

    this.root.append(copy, menu, globeWrap, this.sites);
    parent.append(this.root);
    this.trap = new FocusTrap(this.root);
  }

  get isOpen(): boolean {
    return this.open_;
  }

  get sitesOpen(): boolean {
    return !this.sites.hidden;
  }

  show(): void {
    if (this.open_) return;
    this.open_ = true;
    this.root.hidden = false;
    this.trap.activate();
    this.root.querySelector<HTMLButtonElement>('.home-menu button:not(:disabled)')?.focus();
  }

  hide(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.root.hidden = true;
    this.trap.deactivate();
  }

  setContinue(missionId: string | null): void {
    this.continueButton.disabled = !missionId;
    this.continueButton.title = missionId ? `Continue ${missionId}` : 'Start a mission to continue';
  }

  setDaily(site: string, modifier: string, best: number, streak: number, launch: () => void): void {
    this.dailyCard.hidden = false;
    this.dailyCard.replaceChildren();
    const title = document.createElement('span');
    title.className = 'daily-card-title';
    title.textContent = 'Daily dive';
    const details = document.createElement('span');
    details.className = 'daily-card-details';
    details.textContent = `${site} · ${modifier}`;
    const stars = document.createElement('span');
    stars.className = 'daily-card-stars';
    stars.textContent = `${'★'.repeat(best)}${'☆'.repeat(3 - best)}${streak ? ` · ${streak} day streak` : ''}`;
    stars.setAttribute(
      'aria-label',
      `Best today: ${best} of 3 stars${streak ? ` · ${streak} day streak` : ''}`,
    );
    this.dailyCard.append(title, details, stars);
    this.dailyCard.onclick = launch;
  }

  /** No downloaded site is accessible in the selected mode. */
  clearDaily(): void {
    this.dailyCard.hidden = true;
    this.dailyCard.onclick = null;
  }

  showSites(freeDive: boolean): void {
    this.sites.hidden = false;
    this.menu.hidden = true;
    this.root.classList.add('has-sites');
    this.sites.querySelector('h2')!.textContent = freeDive ? 'Free dive' : 'Dive sites';
    this.sitesSlot.querySelector('.mission-select')?.classList.toggle('is-free-dive', freeDive);
    this.sites.querySelector<HTMLButtonElement>('.home-sites-head button')?.focus();
  }

  closeSites(): void {
    this.sites.hidden = true;
    this.menu.hidden = false;
    this.root.classList.remove('has-sites');
    this.diveSitesButton.focus();
  }
}
