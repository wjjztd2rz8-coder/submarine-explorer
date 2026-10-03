import { FocusTrap } from './FocusTrap.js';
import { ModeSelector, type GameplaySettingsSource } from './ModeSelector.js';

export interface HomeActions {
  continueDive(): void;
  journal(): void;
  settings(): void;
  controls(): void;
}

const SCENE_FALLBACK = 'Expedition preview';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Decorative inline Bathyline mark (public/bathyline-mark.svg geometry; currentColor ring). */
function brandMark(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'home-mark');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const paths: Array<[string, string, string?]> = [
    ['M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Z', ''],
    ['M7 17h4v-3h3c3 0 4-2 4-4s-2-4-5-4H8', 'contour'],
    ['M6 13h2v-3h3c1 0 2-.5 2-1', 'contour inner-contour'],
  ];
  for (const [d, cls] of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    if (cls) path.setAttribute('class', cls);
    svg.append(path);
  }
  return svg;
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
  private readonly panel: HTMLElement;
  private readonly freeDiveButton: HTMLButtonElement;
  private readonly sceneCaption: HTMLSpanElement;
  private sitesOrigin: HTMLButtonElement | null = null;
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
    this.root.setAttribute('aria-label', 'Bathyline home');

    // Decorative scene band / plate. Package E draws the title scene behind it.
    const hero = document.createElement('div');
    hero.className = 'home-hero';
    const plate = document.createElement('p');
    plate.className = 'home-scene-plate';
    this.sceneCaption = document.createElement('span');
    this.sceneCaption.className = 'home-scene-caption';
    this.sceneCaption.textContent = SCENE_FALLBACK;
    const caveat = document.createElement('span');
    caveat.className = 'home-scene-caveat';
    caveat.textContent = 'Vehicle and lighting are illustrative.';
    plate.append(this.sceneCaption, caveat);
    hero.append(plate);

    const panel = document.createElement('div');
    panel.className = 'home-panel';
    const copy = document.createElement('div');
    copy.className = 'home-copy';
    const kicker = document.createElement('p');
    kicker.className = 'home-kicker';
    kicker.textContent = 'A CINEMATIC OCEAN EXPLORATION GAME';
    const brand = document.createElement('div');
    brand.className = 'home-brand';
    const title = document.createElement('h1');
    title.textContent = 'Bathyline';
    brand.append(brandMark(), title);
    const sub = document.createElement('p');
    sub.className = 'home-tagline';
    sub.textContent = 'Explore the real deep.';
    const desc = document.createElement('p');
    desc.className = 'home-desc';
    desc.textContent = 'Real terrain, simple controls, discoveries worth finding.';
    copy.append(kicker, brand, sub, desc);

    const body = document.createElement('div');
    body.className = 'home-body';
    const menu = document.createElement('nav');
    menu.className = 'home-menu';
    menu.setAttribute('aria-label', 'Main menu');
    this.menu = menu;
    const entry = (label: string, act: () => void): HTMLButtonElement => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', act);
      menu.append(button);
      return button;
    };
    // DOM order is the Tab order: Continue, Dive sites, Free dive, Daily dive,
    // mode, Journal, Settings, Controls (Upgrades is appended after by progress).
    this.continueButton = entry('Continue', actions.continueDive);
    this.continueButton.disabled = true;
    this.continueButton.classList.add('home-primary');
    this.diveSitesButton = entry('Dive sites', () => this.showSites(false, this.diveSitesButton));
    this.diveSitesButton.classList.add('home-primary');
    this.freeDiveButton = entry('Free dive', () => this.showSites(true, this.freeDiveButton));
    this.freeDiveButton.classList.add('home-wide');
    this.dailyCard = document.createElement('button');
    this.dailyCard.type = 'button';
    this.dailyCard.className = 'daily-card';
    this.dailyCard.hidden = true;
    menu.append(this.dailyCard);
    this.modeSelector = gameplay ? new ModeSelector('is-home', gameplay) : null;
    if (this.modeSelector) menu.append(this.modeSelector.root);
    entry('Journal', actions.journal);
    entry('Settings', actions.settings);
    entry('Controls', actions.controls);

    const notes = document.createElement('div');
    notes.className = 'home-notes';
    const note1 = document.createElement('p');
    note1.textContent = 'Play in your browser';
    const note2 = document.createElement('p');
    note2.textContent = 'Touch, keyboard or controller';
    notes.append(note1, note2);
    body.append(menu, notes);
    panel.append(copy, body);

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

    this.root.append(globeWrap, panel, hero, this.sites);
    parent.append(this.root);
    this.trap = new FocusTrap(this.root);
    this.panel = panel;
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
    // First focus: Continue when enabled, otherwise Dive sites.
    (this.continueButton.disabled ? this.diveSitesButton : this.continueButton).focus();
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

  /** Terrain-ready caption (package E): real crop vs the honest fallback. */
  setSceneCaption(terrainReady: boolean): void {
    this.sceneCaption.textContent = terrainReady
      ? 'Monterey Canyon · Real GMRT bathymetry'
      : SCENE_FALLBACK;
  }

  showSites(freeDive: boolean, origin?: HTMLButtonElement): void {
    this.sitesOrigin = origin ?? (freeDive ? this.freeDiveButton : this.diveSitesButton);
    this.sites.hidden = false;
    this.panel.classList.add('is-sites');
    this.menu.hidden = true;
    this.root.classList.add('has-sites');
    this.sites.querySelector('h2')!.textContent = freeDive ? 'Free dive' : 'Dive sites';
    this.sitesSlot.querySelector('.mission-select')?.classList.toggle('is-free-dive', freeDive);
    this.sites.querySelector<HTMLButtonElement>('.home-sites-head button')?.focus();
  }

  closeSites(): void {
    this.sites.hidden = true;
    this.panel.classList.remove('is-sites');
    this.menu.hidden = false;
    this.root.classList.remove('has-sites');
    (this.sitesOrigin ?? this.diveSitesButton).focus();
    this.sitesOrigin = null;
  }
}
