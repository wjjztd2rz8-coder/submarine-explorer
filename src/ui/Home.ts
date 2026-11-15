import {
  nextSite,
  siteComplete,
  siteFinds,
  tourJournal,
  TOUR_ORDER,
  type TourProgress,
} from '../game/Tour.js';
import type { DiscoveryReader, JournalSite } from '../game/JournalData.js';

export function homeTourModel(
  progress: TourProgress,
  store: DiscoveryReader,
  sites: JournalSite[],
  lastSite: string | null = null,
) {
  const continuing =
    !!lastSite && TOUR_ORDER.some((id) => id === lastSite) && !siteComplete(lastSite, progress);
  const siteId = continuing ? lastSite : nextSite(progress);
  const site = sites.find((s) => s.id === siteId);
  const counts = sites
    .filter((s) => TOUR_ORDER.some((id) => id === s.id))
    .map((s) => siteFinds(s, store));
  return {
    siteId,
    label: siteId
      ? `${continuing ? 'Continue' : 'Dive'}: ${site?.name ?? siteId.replaceAll('-', ' ')}`
      : 'Dive sites',
    progress: `${TOUR_ORDER.filter((id) => siteComplete(id, progress)).length} of ${TOUR_ORDER.length} sites explored · ${counts.reduce((n, c) => n + c.found, 0)} of ${counts.reduce((n, c) => n + c.total, 0)} discoveries`,
  };
}

import { APP_NAME, APP_TAGLINE } from '../core/Brand.js';
import mark from '../../public/bathyline-mark.svg?raw';
import { FocusTrap, observeOverlayOpen } from './FocusTrap.js';
import { ModeSelector, type GameplaySettingsSource } from './ModeSelector.js';

interface HomeActions {
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
  /** The Arcade / Realistic selector, Advanced beside the segments (with a settings source). */
  readonly modeSelector: ModeSelector | null;
  private tourSites: JournalSite[] = [];
  private refreshTour: (() => void) | null = null;
  private tourDive: (() => void) | null = null;
  private readonly tourProgress: HTMLParagraphElement;
  private readonly dailyCard: HTMLButtonElement;
  private readonly diveSitesButton: HTMLButtonElement;
  private readonly menu: HTMLElement;
  private readonly moreButton: HTMLButtonElement;
  private readonly morePanel: HTMLElement;
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
    copy.className = 'home-copy is-compact';
    copy.append(kicker, brand, sub, desc);

    const body = document.createElement('div');
    body.className = 'home-body';
    const menu = document.createElement('nav');
    menu.className = 'home-menu';
    menu.setAttribute('aria-label', 'Main menu');
    this.menu = menu;
    const entry = (
      label: string,
      act: () => void,
      parent: HTMLElement = menu,
    ): HTMLButtonElement => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', act);
      parent.append(button);
      return button;
    };
    // Top level: one primary dive, site picker, and a More tray for everything else.
    this.diveButton = entry('Dive', () => (this.tourDive ?? actions.dive)());
    this.diveButton.className = 'home-primary';
    this.diveSitesButton = entry('Dive sites', () => this.showSites(false, this.diveSitesButton));
    this.morePanel = document.createElement('div');
    this.morePanel.className = 'home-more';
    this.morePanel.hidden = true;
    this.morePanel.id = 'home-more-panel';
    this.moreButton = entry('More', () => this.toggleMore());
    this.moreButton.className = 'home-more-toggle';
    this.moreButton.setAttribute('aria-expanded', 'false');
    this.moreButton.setAttribute('aria-controls', 'home-more-panel');
    this.tourProgress = document.createElement('p');
    this.tourProgress.className = 'home-tour-progress';
    this.morePanel.append(this.tourProgress);
    this.freeDiveButton = entry(
      'Free dive',
      () => {
        this.setMoreOpen(false);
        this.showSites(true, this.freeDiveButton);
      },
      this.morePanel,
    );
    this.dailyCard = document.createElement('button');
    this.dailyCard.type = 'button';
    this.dailyCard.className = 'daily-card';
    this.dailyCard.hidden = true;
    this.morePanel.append(this.dailyCard);
    this.modeSelector = gameplay
      ? new ModeSelector('is-home', gameplay, undefined, undefined, true)
      : null;
    if (this.modeSelector) this.morePanel.append(this.modeSelector.root);
    entry(
      'Journal',
      () => {
        this.setMoreOpen(false);
        actions.journal();
      },
      this.morePanel,
    );
    entry(
      'Your sub',
      () => {
        this.setMoreOpen(false);
        actions.subScreen();
      },
      this.morePanel,
    );
    entry(
      'Settings',
      () => {
        this.setMoreOpen(false);
        actions.settings();
      },
      this.morePanel,
    );
    entry(
      'Controls',
      () => {
        this.setMoreOpen(false);
        actions.controls();
      },
      this.morePanel,
    );
    menu.append(this.morePanel);

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
    // Narrow screens show the list as a bottom sheet: half height over the globe, expanding to the full
    // list (CSS). The grab bar and a swipe on the header toggle it. Elsewhere the grab bar is hidden
    // and the list is always open.
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
    // Rotation changes the handles beneath a held finger; discard its old coordinates.
    for (const event of ['blur', 'resize', 'orientationchange']) {
      window.addEventListener(event, cancel);
      this.disposers.push(() => window.removeEventListener(event, cancel));
    }
    document.addEventListener('visibilitychange', onVisibility);
    this.disposers.push(observeOverlayOpen(cancel), () =>
      document.removeEventListener('visibilitychange', onVisibility),
    );

    this.root.append(panel, hero, globeWrap, this.sites);
    parent.append(this.root);
    this.trap = new FocusTrap(this.root, {
      onEscape: () => {
        document.exitPointerLock?.();
        if (this.moreOpen) this.setMoreOpen(false);
        else if (this.sitesOpen) this.closeSites();
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

  get moreOpen(): boolean {
    return !this.morePanel.hidden;
  }

  private toggleMore(): void {
    this.setMoreOpen(!this.moreOpen);
  }

  private setMoreOpen(open: boolean): void {
    if (this.morePanel.hidden === !open) return;
    this.morePanel.hidden = !open;
    this.moreButton.setAttribute('aria-expanded', String(open));
    this.root.classList.toggle('has-more', open);
    if (open) this.morePanel.querySelector<HTMLButtonElement>('button:not([hidden])')?.focus();
    else this.moreButton.focus();
  }

  /**
   * Names the primary action's site ("Dive: Titanic"); plain "Dive" while the catalogue loads. The
   * caption gives its depth, and "a good first dive" until the player has dived anywhere.
   */
  setDiveSite(title: string | null, depthM: number | null = null, firstDive = false): void {
    this.diveButton.textContent = title ? `Dive: ${title}` : 'Dive';
    const depth = depthM === null ? '' : `, ${Math.round(depthM).toLocaleString('en-US')} m`;
    this.sceneCaption.textContent = title
      ? `${title}${depth}${firstDive ? ', a good first dive' : ''}`
      : SCENE_FALLBACK;
  }

  /** Shell hook: keep the primary destination and its label derived from the same state. */
  setTour(
    progress: TourProgress,
    store: DiscoveryReader,
    lastSite: string | null,
    launch: (id: string) => void,
  ): void {
    const apply = (sites: JournalSite[]) => {
      const model = homeTourModel(progress, store, sites, lastSite);
      const site = sites.find((s) => s.id === model.siteId);
      if (site) this.setDiveSite(site.name, site.depthM, !lastSite);
      this.diveButton.textContent = model.label;
      this.tourProgress.textContent = sites.length ? model.progress : '';
      this.tourDive = () => (model.siteId ? launch(model.siteId) : this.showSites(false));
    };
    this.refreshTour = () => apply(this.tourSites);
    this.refreshTour();
    void tourJournal().then((sites) => {
      this.tourSites = sites;
      this.refreshTour?.();
    });
  }

  show(): void {
    if (this.isOpen) return;
    this.refreshTour?.();
    this.trap.show();
    this.diveButton.focus();
  }

  hide(): void {
    this.cancelSheetSwipe();
    this.setMoreOpen(false);
    if (!this.isOpen) return;
    this.trap.hide();
  }

  dispose(): void {
    this.hide();
    this.refreshTour = null;
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

  showSites(freeDive: boolean, origin?: HTMLButtonElement): void {
    this.cancelSheetSwipe();
    this.setMoreOpen(false);
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
