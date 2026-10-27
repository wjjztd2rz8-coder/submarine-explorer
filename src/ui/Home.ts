import { APP_NAME, APP_TAGLINE } from '../core/Brand.js';
import mark from '../../public/bathyline-mark.svg?raw';
import { FocusTrap, observeOverlayOpen } from './FocusTrap.js';
import { ModeSelector, type GameplaySettingsSource } from './ModeSelector.js';

export interface HomeActions {
  /** The one primary action: first run opens the opening briefing, afterwards the last mission. */
  dive(): void;
  journal(): void;
  subScreen(): void;
  settings(): void;
  controls(): void;
}

const SCENE_FALLBACK = 'Expedition preview';
/** Decorative inline Bathyline mark (public/bathyline-mark.svg geometry; currentColor outline). */
function brandMark(): HTMLElement {
  const box = document.createElement('span');
  box.className = 'home-mark-box';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = mark.replace(
    '<svg',
    '<svg class="home-mark" aria-hidden="true" focusable="false"',
  );
  return box;
}

/** Title screen; the globe is mounted in `globeSlot` by the app. */
export class Home {
  readonly root: HTMLDivElement;
  readonly globeSlot: HTMLDivElement;
  readonly sitesSlot: HTMLDivElement;
  readonly diveButton: HTMLButtonElement;
  /** The Arcade / Realistic selector with Advanced above the menu (with a settings source). */
  readonly modeSelector: ModeSelector | null;
  private readonly dailyCard: HTMLButtonElement;
  private readonly diveSitesButton: HTMLButtonElement;
  private readonly menu: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly freeDiveButton: HTMLButtonElement;
  private readonly sceneCaption: HTMLSpanElement;
  private sitesOrigin: HTMLButtonElement | null = null;
  private readonly sites: HTMLElement;
  private readonly grab: HTMLButtonElement;
  /** The last pointer gesture was a swipe, so the click that follows it must not toggle again. */
  private swiped = false;
  private sheetSwipe: { target: HTMLElement; id: number; y: number } | null = null;
  private readonly disposers: Array<() => void> = [];
  private readonly trap: FocusTrap;

  constructor(
    actions: HomeActions,
    parent: HTMLElement = document.body,
    gameplay?: GameplaySettingsSource,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'home-screen';
    this.root.hidden = true;
    this.root.setAttribute('aria-label', `${APP_NAME} home`);

    // Decorative scene band / plate. Package E draws the title scene behind it.
    const hero = document.createElement('div');
    hero.className = 'home-hero';
    const plate = document.createElement('p');
    plate.className = 'home-scene-plate';
    this.sceneCaption = document.createElement('span');
    this.sceneCaption.className = 'home-scene-caption';
    this.sceneCaption.textContent = SCENE_FALLBACK;
    plate.append(this.sceneCaption);
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
    title.textContent = APP_NAME;
    brand.append(brandMark(), title);
    const sub = document.createElement('p');
    sub.className = 'home-tagline';
    sub.textContent = APP_TAGLINE;
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
    // DOM order is the Tab order: Dive, Dive sites, Free dive, Daily dive,
    // mode, Journal, Your sub, Settings, Controls.
    this.diveButton = entry('Dive', actions.dive);
    this.diveButton.className = 'home-primary';
    this.diveSitesButton = entry('Dive sites', () => this.showSites(false, this.diveSitesButton));
    this.freeDiveButton = entry('Free dive', () => this.showSites(true, this.freeDiveButton));
    this.dailyCard = document.createElement('button');
    this.dailyCard.type = 'button';
    this.dailyCard.className = 'daily-card';
    this.dailyCard.hidden = true;
    menu.append(this.dailyCard);
    this.modeSelector = gameplay ? new ModeSelector('is-home', gameplay) : null;
    if (this.modeSelector) menu.append(this.modeSelector.root);
    entry('Journal', actions.journal);
    entry('Your sub', actions.subScreen);
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
    // Narrow screens show the list as a bottom sheet over the globe (CSS); the grab bar and a swipe on
    // the header both toggle it. Elsewhere the grab bar is hidden and the list is always open.
    const grab = document.createElement('button');
    grab.type = 'button';
    grab.className = 'home-sites-grab';
    grab.setAttribute('aria-label', 'Show all sites');
    grab.addEventListener('click', (event) => {
      // A swipe suppresses its trailing pointer click; keyboard activation
      // (detail zero) must keep working before the next pointer gesture.
      if (!this.swiped || event.detail === 0)
        this.setSheetOpen(this.sites.classList.contains('is-collapsed'));
    });
    this.grab = grab;
    this.sites.append(grab, sitesHead, this.sitesSlot);
    this.bindSheetSwipe(sitesHead);
    this.bindSheetSwipe(grab);
    const cancel = (): void => this.cancelSheetSwipe();
    const onVisibility = (): void => {
      if (document.hidden) cancel();
    };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onVisibility);
    this.disposers.push(
      observeOverlayOpen(cancel),
      () => window.removeEventListener('blur', cancel),
      () => document.removeEventListener('visibilitychange', onVisibility),
    );

    this.root.append(panel, hero, globeWrap, this.sites);
    parent.append(this.root);
    this.trap = new FocusTrap(this.root, {
      onEscape: () => {
        document.exitPointerLock?.();
        if (this.sitesOpen) this.closeSites();
      },
    });
    this.panel = panel;
  }

  get isOpen(): boolean {
    return this.trap.active;
  }

  get isTop(): boolean {
    return this.trap.isTop;
  }

  get sitesOpen(): boolean {
    return !this.sites.hidden;
  }

  /** Names the primary action's site ("Dive: Titanic"); plain "Dive" while the catalogue loads. */
  setDiveSite(title: string | null): void {
    this.diveButton.textContent = title ? `Dive: ${title}` : 'Dive';
  }

  show(): void {
    if (this.isOpen) return;
    this.trap.show();
    this.diveButton.focus();
  }

  hide(): void {
    this.cancelSheetSwipe();
    if (!this.isOpen) return;
    this.trap.hide();
  }

  dispose(): void {
    this.hide();
    for (const dispose of this.disposers.splice(0)) dispose();
    this.trap.dispose();
    this.modeSelector?.dispose();
    this.root.remove();
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
    this.cancelSheetSwipe();
    this.sitesOrigin = origin ?? (freeDive ? this.freeDiveButton : this.diveSitesButton);
    this.sites.hidden = false;
    this.setSheetOpen(false);
    this.panel.classList.add('is-sites');
    this.menu.hidden = true;
    this.root.classList.add('has-sites');
    this.root.dispatchEvent(new Event('home:sites'));
    this.sites.querySelector('h2')!.textContent = freeDive ? 'Free dive' : 'Dive sites';
    this.sitesSlot.querySelector('.mission-select')?.classList.toggle('is-free-dive', freeDive);
    this.sites.querySelector<HTMLButtonElement>('.home-sites-head button')?.focus();
  }

  private setSheetOpen(open: boolean): void {
    this.sites.classList.toggle('is-collapsed', !open);
    this.grab.setAttribute('aria-expanded', String(open));
    this.grab.setAttribute('aria-label', open ? 'Hide site list' : 'Show all sites');
  }

  /** A vertical swipe of at least 24 px opens (up) or collapses (down) the sheet. */
  private bindSheetSwipe(target: HTMLElement): void {
    target.addEventListener('pointerdown', (e) => {
      if (this.sheetSwipe || !this.isOpen || !this.sitesOpen || document.hidden) return;
      if ((e.target as HTMLElement).closest('.home-sites-head button')) return;
      this.sheetSwipe = { target, id: e.pointerId, y: e.clientY };
      this.swiped = false;
      target.setPointerCapture(e.pointerId);
    });
    target.addEventListener('pointerup', (e) => {
      const swipe = this.sheetSwipe;
      if (!swipe || swipe.target !== target || swipe.id !== e.pointerId) return;
      const dy = e.clientY - swipe.y;
      this.cancelSheetSwipe();
      this.swiped = Math.abs(dy) >= 24;
      if (this.swiped) this.setSheetOpen(dy < 0);
    });
    const cancel = (e: PointerEvent): void => {
      if (this.sheetSwipe?.id === e.pointerId) this.cancelSheetSwipe();
    };
    target.addEventListener('pointercancel', cancel);
    target.addEventListener('lostpointercapture', cancel);
  }

  private cancelSheetSwipe(): void {
    const swipe = this.sheetSwipe;
    this.sheetSwipe = null;
    if (swipe?.target.hasPointerCapture(swipe.id)) swipe.target.releasePointerCapture(swipe.id);
  }

  closeSites(): void {
    this.cancelSheetSwipe();
    this.sites.hidden = true;
    this.panel.classList.remove('is-sites');
    this.menu.hidden = false;
    this.root.classList.remove('has-sites');
    this.root.dispatchEvent(new Event('home:sites'));
    (this.sitesOrigin ?? this.diveSitesButton).focus();
    this.sitesOrigin = null;
  }
}
