/**
 * The Journal (D-FLOW): a Civilopedia-style overlay that replaces the field
 * guide. It lists every dive site, and per site its site, POI and species
 * entries (game/JournalData.ts). Entries unlock from the persistent discovery
 * store; "Show undiscovered entries (spoilers)" is an in-memory toggle.
 *
 * Reachable from home, the pause menu, the debrief and J during a dive. The
 * front page states once that the seabed is real survey data and that wrecks,
 * structures and markers are recreations; recreated entries carry a small
 * "Recreation" tag and every entry lists its sources.
 *
 * Desktop is a two-pane reader (contents tree, article). On a phone (narrow, or
 * a short touch landscape) it is a full-screen sheet with a back arrow: sites,
 * then a site page with its entry rows, then an entry. A site's facts and
 * hazards sit once in a collapsed "About this site"; its data credit is the
 * page's last line.
 *
 * All content is untrusted JSON, so it is only ever assigned via textContent;
 * URLs were already filtered to http(s)/site-relative by Guide.ts.
 *
 * It keeps the FieldGuide surface Discovery drives (`setContent`, `focus`,
 * `refresh`, `setFooter`, `open`, `toggle`, `isOpen`), so `ui/FieldGuide.ts`
 * re-exports this class under its old name.
 */

import { el } from './dom.js';
import {
  COSMETIC_CHOICES,
  cosmeticRequirement,
  discoveryCount,
  type CosmeticSlot,
} from '../game/Cosmetics.js';
import type { Progress } from '../game/Progress.js';

import type { GameEvents } from '../core/EventBus.js';
import {
  isEntryUnlocked,
  isSiteUnlocked,
  journalEntryTag,
  lifeDiscoveryId,
  loadJournalSites,
  siteProgress,
  wildlifeProgress,
  type DiscoveryReader,
  type JournalEntry,
  type JournalSite,
} from '../game/JournalData.js';
import { fetchContentJson } from '../game/ContentPath.js';
import { formatDepthRange, OBIS_HOME_URL, obisTaxonUrl, type SpeciesDoc } from '../game/Species.js';
import { publicUrl } from '../util/publicUrl.js';
import { FocusTrap } from './FocusTrap.js';
import { aboutLists, dataCreditFor } from './journalAbout.js';
// --- D-PHOTO begin ---
import { PhotoGallery } from './PhotoGallery.js';
import { PHOTO_LIMIT, type PhotoStore } from '../game/PhotoStore.js';
// --- D-PHOTO end ---

export interface GuideEmitter {
  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void;
}

/** The statement the front page makes once, instead of per-entry caveats. */
const JOURNAL_HONESTY =
  'Dives use real survey data. Recreation tags mark plausible landforms, wrecks, structures and ' +
  'scan markers based on published sources. Game addition tags mark secrets and staged animal ' +
  'encounters. Species lists use OBIS survey records: counts reflect sampling effort and recorded ' +
  'depths reflect sampled occurrences, rather than complete habitat limits.';

type View =
  | { kind: 'front' }
  | { kind: 'photos' }
  | { kind: 'site'; siteId: string }
  | { kind: 'entry'; key: string };

/** Site and POI entries come from the guide (and fire `guide:opened`); species and wildlife do not. */
const isGuideEntry = (e: JournalEntry): boolean =>
  e.kind === 'site' || e.kind === 'poi' || e.kind === 'secret';

const NO_STORE: DiscoveryReader = { isDiscovered: () => false };

/** The sheet layout: a narrow screen, or a touch device in landscape (short). */
const PHONE_QUERY = '(max-width: 760px), (max-height: 520px) and (pointer: coarse)';

/** Entry groups on a site page and in the contents tree, in reading order. */
const GROUPS: ReadonlyArray<readonly [label: string, kind: JournalEntry['kind']]> = [
  ['Overview', 'site'],
  ['Points of interest', 'poi'],
  ['Species', 'species'],
  ['Wildlife', 'life'],
  ['Finds', 'secret'],
];

/** One short line on finding the first of a hidden group's entries. */
const HOW_TO_FIND: Partial<Record<JournalEntry['kind'], string>> = {
  species: 'Scan their habitat to identify them.',
  life: 'Face an animal and hold Scan.',
  secret: 'Follow faint sonar contacts.',
};

/** `data/tiles/index.json` -> tile id to data source (for the site's data credit). */
async function loadTileSources(): Promise<Map<string, string>> {
  const doc = await fetchContentJson(publicUrl('/data/tiles/index.json'));
  const out = new Map<string, string>();
  const tiles = (doc as { tiles?: unknown } | null)?.tiles;
  if (!Array.isArray(tiles)) return out;
  for (const t of tiles as Array<{ id?: unknown; source?: unknown }>) {
    if (typeof t?.id === 'string' && typeof t.source === 'string') out.set(t.id, t.source);
  }
  return out;
}

function link(url: string, text: string): HTMLAnchorElement {
  const a = el('a', undefined, text);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

/** A reference link's text: its site, not the whole URL. */
function linkLabel(l: { title: string; url?: string }): string {
  if (l.title !== l.url || !l.url) return l.title;
  try {
    return new URL(l.url).hostname.replace(/^www\./, '');
  } catch {
    return l.title;
  }
}

export class Journal {
  readonly root: HTMLDivElement;
  private readonly crumbEl: HTMLSpanElement;
  private readonly countEl: HTMLSpanElement;
  private readonly spoilerBox: HTMLInputElement;
  private readonly spoilerEl: HTMLLabelElement;
  private readonly backBtn: HTMLButtonElement;
  private readonly nav: HTMLElement;
  private readonly navList: HTMLDivElement;
  private readonly navFoot: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly footer: HTMLDivElement;
  private readonly trap: FocusTrap;
  private readonly phoneMq: MediaQueryList | null;
  private readonly onPhoneChange = (): void => this.refresh();

  private progress: Progress | null = null;
  setProgress(progress: Progress): void {
    this.progress = progress;
  }

  private store: DiscoveryReader = NO_STORE;
  private sites: JournalSite[] = [];
  private tileSources = new Map<string, string>();
  private loading: Promise<void> | null = null;
  private currentSiteId: string | null = null;
  private homeMode = false;
  private spoilers_ = false;
  private phone = false;
  private readonly expandedSites = new Map<string, boolean>();
  private readonly expandedCategories = new Map<string, boolean>();
  private view: View = { kind: 'front' };
  private pendingFocus: string | null = null;
  private opened = false;
  // --- D-PHOTO begin ---
  private photos: PhotoStore | null = null;
  private photoGallery: PhotoGallery | null = null;
  // --- D-PHOTO end ---

  constructor(
    private readonly bus: GuideEmitter | null = null,
    parent: HTMLElement = document.body,
  ) {
    // `field-guide` keeps the shell's stacking rules (styles.css, D-SHELL).
    this.root = el('div', 'field-guide journal');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Journal');

    const panel = el('div', 'jr-panel');
    const header = el('div', 'jr-header');
    this.backBtn = el('button', 'jr-back');
    this.backBtn.type = 'button';
    this.backBtn.setAttribute('aria-label', 'Back');
    this.backBtn.append(this.glyph('\u2190'));
    this.backBtn.addEventListener('click', () => this.back());
    const heading = el('div', 'jr-heading');
    heading.append(el('span', 'jr-kicker', 'Journal'));
    this.crumbEl = el('span', 'jr-crumb');
    heading.append(this.crumbEl);
    const close = el('button', 'jr-close');
    close.type = 'button';
    close.title = 'Close Journal (Esc)';
    close.setAttribute('aria-label', 'Close Journal');
    close.append(this.glyph('\u00d7'));
    close.addEventListener('click', () => this.close());
    header.append(this.backBtn, heading, close);

    this.spoilerEl = el('label', 'jr-spoilers');
    this.spoilerBox = el('input');
    this.spoilerBox.type = 'checkbox';
    this.spoilerBox.setAttribute('role', 'switch');
    this.spoilerBox.addEventListener('change', () => this.setSpoilers(this.spoilerBox.checked));
    this.spoilerEl.append(this.spoilerBox, el('span', undefined, 'Show spoilers'));
    this.countEl = el('span', 'jr-count');

    const main = el('div', 'jr-main');
    this.nav = el('nav', 'jr-nav');
    this.nav.id = 'journal-contents';
    this.nav.setAttribute('aria-label', 'Journal contents');
    this.navList = el('div', 'jr-nav-scroll');
    // The count and the spoilers switch live under the tree, off the header.
    this.navFoot = el('div', 'jr-nav-foot');
    this.navFoot.append(this.countEl, this.spoilerEl);
    this.nav.append(this.navList, this.navFoot);
    this.body = el('div', 'jr-body');
    this.body.tabIndex = -1;
    this.body.setAttribute('role', 'region');
    this.body.setAttribute('aria-label', 'Journal article');
    main.append(this.nav, this.body);
    this.footer = el('div', 'jr-footer');
    panel.append(header, main, this.footer);
    this.root.append(panel);
    parent.appendChild(this.root);
    this.trap = new FocusTrap(this.root, { onEscape: () => this.close() });
    this.phoneMq = typeof window.matchMedia === 'function' ? window.matchMedia(PHONE_QUERY) : null;
    // Rotating a phone swaps the layout under an open Journal.
    this.phoneMq?.addEventListener?.('change', this.onPhoneChange);
  }

  /** An icon character the screen reader skips (the button carries the label). */
  private glyph(char: string): HTMLSpanElement {
    const g = el('span', 'jr-glyph', char);
    g.setAttribute('aria-hidden', 'true');
    return g;
  }

  get isOpen(): boolean {
    return this.trap.active;
  }

  get isTop(): boolean {
    return this.trap.isTop;
  }

  get spoilers(): boolean {
    return this.spoilers_;
  }

  /** The guide entry id on screen when it belongs to the current dive's site, else null. */
  get selectedId(): string | null {
    const e = this.view.kind === 'entry' ? this.entryByKey(this.view.key) : null;
    return e && e.siteId === this.currentSiteId && isGuideEntry(e) ? e.id : null;
  }

  /** What is on screen: 'front', a site id, or an entry key (for tests). */
  get viewKey(): string {
    const v = this.view;
    return v.kind === 'front' || v.kind === 'photos'
      ? v.kind
      : v.kind === 'site'
        ? v.siteId
        : v.key;
  }

  // --- D-PHOTO begin ---
  setPhotoGallery(store: PhotoStore, gallery: PhotoGallery): void {
    this.photoGallery?.dispose();
    this.photos = store;
    this.photoGallery = gallery;
    this.refresh();
  }

  /** The catalogue name of a site, or its id in title case until the catalogue loads. */
  siteName(id: string): string {
    return (
      this.sites.find((site) => site.id === id)?.name ??
      id
        .replace(/[-_]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }
  // --- D-PHOTO end ---

  /** The persistent discovery store the unlocks read. */
  setStore(store: DiscoveryReader): void {
    this.store = store;
    this.refresh();
  }

  /** The current dive's content folder (listed first, and the default page in a dive). */
  setCurrentSite(id: string | null): void {
    this.currentSiteId = id;
  }

  /** On the home screen the Journal opens on its front page. */
  setHomeMode(home: boolean): void {
    this.homeMode = home;
  }

  setSpoilers(on: boolean): void {
    this.spoilers_ = on;
    this.spoilerBox.checked = on;
    this.refresh();
  }

  /** Discovery's current-site content. The Journal loads its own; this only refreshes. */
  setContent(): void {
    this.refresh();
  }

  /** Species arrive with the site content; kept for the FieldGuide surface. */
  setSpecies(_doc: SpeciesDoc | null): void {
    this.refresh();
  }

  /** Re-read unlock state (after a discovery). */
  refresh(): void {
    if (this.isOpen) this.render();
  }

  /** The next `open()` without an explicit entry shows this current-site entry. */
  focus(entryId: string): void {
    this.pendingFocus = entryId;
  }

  setFooter(text: string): void {
    if (this.footer.textContent !== text) this.footer.textContent = text;
  }

  /** Load every site's content once. Resolves when the Journal can render it. */
  load(): Promise<void> {
    this.loading ??= Promise.all([
      loadJournalSites(this.currentSiteId ? [this.currentSiteId] : []),
      loadTileSources(),
    ]).then(([sites, sources]) => {
      this.sites = sites;
      this.tileSources = sources;
      this.refresh();
    });
    return this.loading;
  }

  /**
   * Open on `entryId` (a current-site guide entry), else on the entry a scan
   * just logged, else the front page from home, else the current site's page.
   */
  open(entryId?: string): void {
    const focus = entryId ?? this.pendingFocus;
    this.pendingFocus = null;
    const site = this.currentSiteId;
    if (focus && site) {
      this.view = { kind: 'entry', key: `${site}/poi/${focus}` };
      this.fixEntryKey(site, focus);
    } else if (this.homeMode || !site) {
      this.view = { kind: 'front' };
    } else if (!this.opened || this.view.kind === 'front') {
      this.view = { kind: 'site', siteId: site };
    }
    this.opened = true;
    this.revealView();
    // Reveal the scroll container before rendering/resetting its scroll position.
    if (!this.trap.active && typeof document !== 'undefined') document.exitPointerLock?.();
    this.trap.show();
    this.render();
    // A newly focused scan must start at its heading, not the previous entry's scroll.
    this.body.scrollTop = 0;
    const openingView = this.view;
    void this.load().then(() => {
      // A later click/show owns navigation, even when this load was already resolved.
      if (focus && site && this.view === openingView) this.fixEntryKey(site, focus);
      this.refresh();
    });
  }

  close(): void {
    this.trap.hide();
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Show the front page, a site page (site id) or an entry (entry key). */
  show(target: 'front' | string): void {
    if (target === 'front') this.view = { kind: 'front' };
    else if (target === 'photos') this.view = { kind: 'photos' };
    else if (this.sites.some((s) => s.id === target)) this.view = { kind: 'site', siteId: target };
    else this.view = { kind: 'entry', key: target };
    this.revealView();
    this.render();
    this.announce();
    this.body.scrollTop = 0;
  }

  /** One level up: an entry to its site, a site or the photos to the front page. */
  private back(): void {
    const v = this.view;
    const entry = v.kind === 'entry' ? this.entryByKey(v.key) : null;
    this.show(entry ? entry.siteId : 'front');
    this.body.focus({ preventScroll: true });
  }

  /** The focus id may be a site-level entry rather than a POI one. */
  private fixEntryKey(siteId: string, id: string): void {
    const site = this.sites.find((s) => s.id === siteId);
    const e = site?.entries.find((x) => isGuideEntry(x) && x.id === id);
    if (e) {
      this.view = { kind: 'entry', key: e.key };
      this.revealView();
    }
  }

  /** Direct navigation (including a newly scanned entry) reveals its contents. */
  private revealView(): void {
    const entry = this.view.kind === 'entry' ? this.entryByKey(this.view.key) : null;
    const siteId = this.view.kind === 'site' ? this.view.siteId : entry?.siteId;
    if (siteId) this.expandedSites.set(siteId, true);
    if (entry) this.expandedCategories.set(`${entry.siteId}/${entry.kind}`, true);
  }

  private entryByKey(key: string): JournalEntry | null {
    for (const s of this.sites) {
      const e = s.entries.find((x) => x.key === key);
      if (e) return e;
    }
    return null;
  }

  private announce(): void {
    const e = this.view.kind === 'entry' ? this.entryByKey(this.view.key) : null;
    if (!e || !isGuideEntry(e) || e.siteId !== this.currentSiteId) return;
    const site = this.sites.find((s) => s.id === e.siteId);
    if (site && isEntryUnlocked(site, e, this.store)) {
      this.bus?.emit('guide:opened', { entryId: e.id });
    }
  }

  /** Current site first during a dive, then the mission index order. */
  private orderedSites(): JournalSite[] {
    if (this.homeMode || !this.currentSiteId) return this.sites;
    const cur = this.sites.filter((s) => s.id === this.currentSiteId);
    return [...cur, ...this.sites.filter((s) => s.id !== this.currentSiteId)];
  }

  private render(): void {
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = focused?.dataset.target;
    const category = focused?.dataset.category;
    const row = focused?.dataset.row;
    const cosmetic = focused?.dataset.cosmetic;
    const inside = !!focused && this.root.contains(focused);
    this.renderContent();
    // Moving the switch between the tree and the page drops its focus.
    if (focused === this.spoilerBox && document.activeElement !== focused) {
      this.spoilerBox.focus({ preventScroll: true });
      return;
    }
    if (inside && !focused?.isConnected) {
      // Cosmetics stay on the front page; phone site navigation instead focuses the article.
      if (this.phone && !cosmetic && category !== 'cosmetics') {
        this.body.focus({ preventScroll: true });
        return;
      }
      // Use the trap's visibility rules, including collapsed native details.
      const controls = this.trap.focusables();
      const replacement = controls.find((control) =>
        target
          ? control.dataset.target === target
          : cosmetic
            ? control.dataset.cosmetic === cosmetic
            : row
              ? control.dataset.row === row
              : !!category && control.dataset.category === category,
      );
      (
        replacement ??
        controls.find((control) => control.classList.contains('is-selected')) ??
        this.root.querySelector<HTMLButtonElement>('.jr-close')
      )?.focus();
    }
  }

  private renderContent(): void {
    this.phone = !!this.phoneMq?.matches;
    this.root.classList.toggle('is-phone', this.phone);
    this.root.classList.toggle('at-front', this.view.kind === 'front');
    const sites = this.orderedSites();
    let logged = 0;
    let total = 0;
    for (const s of sites) {
      const p = siteProgress(s, this.store);
      logged += p.logged;
      total += p.total;
    }
    this.countEl.textContent = sites.length ? `${logged} / ${total} LOGGED` : '';
    this.root.classList.toggle('has-spoilers', this.spoilers_);

    const v = this.view;
    const entry = v.kind === 'entry' ? this.entryByKey(v.key) : null;
    const siteId = v.kind === 'site' ? v.siteId : (entry?.siteId ?? null);
    const site = sites.find((s) => s.id === siteId) ?? null;
    this.crumbEl.textContent = site ? site.name : v.kind === 'photos' ? 'Photos' : 'All dive sites';
    // The sheet has no tree: its contents are the front page, its rows the site page.
    if (this.phone) this.navList.replaceChildren();
    else this.renderNav(sites, site, entry);

    this.body.replaceChildren();
    this.renderBody(sites, site, entry);
    // On a phone the switch sits at the end of the pages that can be locked.
    const locked = !!entry && !!site && !isEntryUnlocked(site, entry, this.store);
    const home =
      this.phone && (v.kind === 'front' || v.kind === 'site' || locked) ? this.body : this.navFoot;
    if (this.spoilerEl.parentElement !== home || home === this.body) home.append(this.spoilerEl);
  }

  private renderBody(sites: JournalSite[], site: JournalSite | null, entry: JournalEntry | null) {
    const v = this.view;
    // --- D-PHOTO begin ---
    if (v.kind === 'photos' && this.photoGallery) {
      const list = this.photos?.photos ?? [];
      this.photoGallery.render(this.body, list, `Photos · ${list.length} of ${PHOTO_LIMIT}`);
      return;
    }
    // --- D-PHOTO end ---
    if (!this.sites.length) {
      this.body.append(el('p', 'jr-empty', 'Loading the Journal…'));
      return;
    }
    if (entry && site) this.renderEntry(site, entry);
    else if (site) this.renderSite(site);
    else this.renderFront(sites);
  }

  private navButton(
    label: string,
    meta: string,
    cls: string,
    target: string,
    on: boolean,
    run: () => void = () => this.show(target),
  ): HTMLLIElement {
    const li = el('li');
    const b = el('button', `jr-nav-item ${cls}`);
    b.type = 'button';
    b.dataset.target = target;
    b.classList.toggle('is-selected', on);
    if (on) b.setAttribute('aria-current', 'page');
    b.append(el('span', 'jr-nav-title', label));
    if (meta) b.append(el('span', 'jr-nav-meta', meta));
    b.addEventListener('click', run);
    li.append(b);
    return li;
  }

  private renderNav(
    sites: JournalSite[],
    open: JournalSite | null,
    entry: JournalEntry | null,
  ): void {
    const scrollTop = this.navList.scrollTop;
    const ul = el('ul', 'jr-nav-list');
    ul.append(this.navButton('Front page', '', 'is-front', 'front', this.view.kind === 'front'));
    // --- D-PHOTO begin ---
    if (this.photoGallery)
      ul.append(
        this.navButton(
          'Photos',
          String(this.photos?.photos.length ?? 0),
          'is-photos',
          'photos',
          this.view.kind === 'photos',
        ),
      );
    // --- D-PHOTO end ---
    for (const s of sites) {
      const p = siteProgress(s, this.store);
      const cur = s.id === this.currentSiteId && !this.homeMode;
      const expanded = this.expandedSites.get(s.id) ?? s.id === this.currentSiteId;
      const li = this.navButton(
        s.name,
        `${cur ? 'THIS DIVE · ' : ''}${p.logged}/${p.total}`,
        'is-site',
        s.id,
        this.view.kind === 'site' && s.id === open?.id,
        () => {
          // A site row remains a route back from an entry/front/photos page.
          // Only a second activation on its overview collapses the group.
          if (expanded && (this.view.kind !== 'site' || this.view.siteId !== s.id)) {
            this.show(s.id);
            return;
          }
          this.expandedSites.set(s.id, !expanded);
          if (!expanded) this.show(s.id);
          else this.render();
        },
      );
      li.classList.toggle('is-locked', !isSiteUnlocked(s, this.store));
      const button = li.querySelector<HTMLButtonElement>('button')!;
      const entriesId = `journal-entries-${s.id}`;
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-controls', entriesId);
      const entries = expanded ? this.siteEntryList(s, entry) : el('div', 'jr-site-entries');
      entries.id = entriesId;
      entries.hidden = !expanded;
      ul.append(li);
      li.append(entries);
    }
    this.navList.replaceChildren(ul);
    this.navList.scrollTop = scrollTop;
  }

  /**
   * One group's rows. Locked species, animals and secrets are only counted
   * (their names would spoil them); locked targets collapse into one quiet
   * "more to find" count; spoilers show everything.
   */
  private groupRows(
    site: JournalSite,
    label: string,
    list: JournalEntry[],
  ): {
    rows: Array<{ entry: JournalEntry; open: boolean; title: string }>;
    unscanned: number;
    hidden: number;
    note: string;
  } {
    const rows: Array<{ entry: JournalEntry; open: boolean; title: string }> = [];
    let hidden = 0;
    let unscanned = 0;
    for (const e of list) {
      const open = isEntryUnlocked(site, e, this.store);
      if (
        !open &&
        !this.spoilers_ &&
        (e.kind === 'species' || e.kind === 'life' || e.kind === 'secret')
      ) {
        hidden++;
        continue;
      }
      if (!open && !this.spoilers_ && e.kind === 'poi') {
        unscanned++;
        continue;
      }
      rows.push({ entry: e, open, title: open || this.spoilers_ ? e.title : 'Undiscovered' });
    }
    const note = !hidden
      ? ''
      : label === 'Finds'
        ? `${hidden} finds remain. Follow faint nearby sonar contacts.`
        : label === 'Wildlife'
          ? `${hidden} animals unscanned. Face one and hold Scan during a dive.`
          : `${hidden} species not yet identified. Show spoilers to read the survey list.`;
    return { rows, unscanned, hidden, note };
  }

  /** The open site's entries, grouped, under its nav item. */
  private siteEntryList(site: JournalSite, current: JournalEntry | null): HTMLElement {
    const box = el('div', 'jr-site-entries');
    for (const [label, kind] of GROUPS) {
      const list = site.entries.filter((e) => e.kind === kind);
      if (!list.length) continue;
      const key = `${site.id}/${kind}`;
      const group = el('details', 'jr-category');
      group.dataset.category = key;
      group.open = this.expandedCategories.get(key) ?? kind === 'poi';
      const logged = list.filter((e) => isEntryUnlocked(site, e, this.store)).length;
      const summary = el('summary', 'jr-group');
      summary.dataset.category = key;
      summary.append(
        el('span', undefined, label),
        el('span', 'jr-nav-meta', `${logged}/${list.length}`),
      );
      group.append(summary);
      group.addEventListener('toggle', () => {
        if (group.isConnected) this.expandedCategories.set(key, group.open);
      });
      box.append(group);
      const ul = el('ul');
      const { rows, unscanned, note } = this.groupRows(site, label, list);
      for (const { entry, open, title } of rows) {
        const li = this.navButton(
          title,
          '',
          `is-entry is-${entry.kind}`,
          entry.key,
          entry === current,
        );
        li.classList.toggle('is-locked', !open);
        ul.append(li);
      }
      group.append(ul);
      if (unscanned) group.append(el('p', 'jr-more-to-find', `${unscanned} more to find`));
      if (note) group.append(el('p', 'jr-hidden-note', note));
    }
    return box;
  }

  /** A row of small progress chips ("3/8 entries"). */
  private chips(items: ReadonlyArray<string>, cls = ''): HTMLUListElement {
    const ul = el('ul', `jr-chips ${cls}`.trim());
    for (const text of items) ul.append(el('li', 'jr-chip', text));
    return ul;
  }

  /** A single picker in the existing Journal front page; sub choices apply on the next dive. */
  private renderCosmetics(): void {
    const progress = this.progress;
    if (!progress) return;
    const found = discoveryCount(progress.snapshot());
    const next = Math.min(
      ...Object.values(COSMETIC_CHOICES).flatMap((defs) =>
        defs.flatMap((def) =>
          def.reward.kind === 'discoveries' && !progress.ownsCosmetic(def)
            ? [def.reward.total]
            : [],
        ),
      ),
    );
    const section = el('details', 'jr-category');
    section.dataset.category = 'cosmetics';
    section.open = this.expandedCategories.get('cosmetics') ?? false;
    section.addEventListener('toggle', () => {
      if (section.isConnected) this.expandedCategories.set('cosmetics', section.open);
    });
    const summary = el('summary', 'jr-group', 'Cosmetics');
    summary.dataset.category = 'cosmetics';
    section.append(summary);
    section.append(
      el(
        'p',
        'jr-empty',
        `${found} discoveries${Number.isFinite(next) ? ` · next unlock at ${next}` : ''} · sub changes next dive`,
      ),
    );
    for (const [slot, label] of [
      ['paint', 'Sub paint'],
      ['trim', 'Lamp trim'],
      ['decal', 'Sub decal'],
      ['frame', 'Photo frame'],
    ] as const) {
      const row = el('label', 'jr-group jr-cosmetic', label);
      const select = el('select', 'jr-nav-item');
      const swatch = el('span', 'jr-swatch');
      const tint = (id: string): string => {
        const def: { id: string; swatch?: string; color?: unknown } | undefined = COSMETIC_CHOICES[
          slot
        ].find((choice) => choice.id === id);
        const color = def?.swatch ?? def?.color;
        return typeof color === 'string' ? color : 'transparent';
      };
      select.setAttribute('aria-label', label);
      select.dataset.cosmetic = slot;
      select.disabled = progress.save.readOnly;
      for (const def of COSMETIC_CHOICES[slot]) {
        const available = progress.ownsCosmetic(def);
        const option = el(
          'option',
          undefined,
          available ? def.name : `${def.name} · ${cosmeticRequirement(def)}`,
        );
        option.value = def.id;
        option.disabled = !available;
        select.append(option);
      }
      select.value = progress.cosmetics[slot];
      swatch.style.background = tint(select.value);
      select.addEventListener('change', () => {
        progress.selectCosmetic(slot as CosmeticSlot, select.value);
        swatch.style.background = tint(select.value);
      });
      const pick = el('span', 'jr-cosmetic-pick');
      pick.append(swatch, select);
      row.append(pick);
      section.append(row);
    }
    this.body.append(section);
  }

  private renderFront(sites: JournalSite[]): void {
    const b = this.body;
    b.append(el('h2', 'jr-title', 'Dive journal'));
    this.renderCosmetics();
    let logged = 0;
    let total = 0;
    for (const s of sites) {
      const p = siteProgress(s, this.store);
      logged += p.logged;
      total += p.total;
    }
    const scanned = sites.filter((s) => isSiteUnlocked(s, this.store)).length;
    b.append(
      this.chips(
        [`${logged}/${total} entries`, `${scanned}/${sites.length} sites scanned`],
        'jr-lead',
      ),
    );
    const grid = el('div', 'jr-site-grid');
    for (const s of sites) {
      const p = siteProgress(s, this.store);
      const card = el('button', 'jr-site-card');
      card.type = 'button';
      card.dataset.target = s.id;
      card.setAttribute('aria-label', `${s.name}, ${p.logged} of ${p.total} entries logged`);
      card.classList.toggle('is-locked', !isSiteUnlocked(s, this.store));
      const top = el('span', 'jr-card-top');
      top.append(el('span', 'jr-card-name', s.name));
      if (s.id === this.currentSiteId && !this.homeMode)
        top.append(el('span', 'jr-card-tag', 'This dive'));
      top.append(el('span', 'jr-card-count jr-badge', `${p.logged}/${p.total}`));
      card.append(top);
      const meta = [s.region, s.depthM === null ? '' : `${s.depthM.toLocaleString('en-US')} m`]
        .filter(Boolean)
        .join(' · ');
      if (meta) card.append(el('span', 'jr-card-meta', meta));
      const bar = el('span', 'jr-card-bar');
      const fill = el('span', 'jr-card-fill');
      fill.style.width = `${p.total ? Math.round((100 * p.logged) / p.total) : 0}%`;
      bar.append(fill);
      card.append(bar);
      card.addEventListener('click', () => this.show(s.id));
      grid.append(card);
    }
    b.append(grid);
    // The sheet has no tree, so the photos get a row here.
    if (this.phone && this.photoGallery) {
      const photos = el('button', 'jr-row is-photos');
      photos.type = 'button';
      photos.dataset.target = 'photos';
      photos.append(
        el('span', 'jr-row-title', 'Photos'),
        el('span', 'jr-badge', String(this.photos?.photos.length ?? 0)),
      );
      photos.addEventListener('click', () => this.show('photos'));
      b.append(photos);
    }
    b.append(el('p', 'jr-honesty', JOURNAL_HONESTY));
  }

  private renderSite(site: JournalSite): void {
    // Three blocks, so a short landscape screen can put the entries beside the text.
    const b = el('div', 'jr-site-top');
    const foot = el('div', 'jr-site-foot');
    this.body.append(b);
    const unlocked = isSiteUnlocked(site, this.store);
    const open = unlocked || this.spoilers_;
    const titleRow = el('div', 'jr-title-row');
    titleRow.append(el('h2', 'jr-title', site.name));
    if (!unlocked) titleRow.append(el('span', 'jr-tag is-undiscovered', 'No scans logged'));
    b.append(titleRow);
    const meta = [
      site.region,
      site.depthM === null ? '' : `about ${site.depthM.toLocaleString('en-US')} m deep`,
      site.missionTitle ? `Mission: ${site.missionTitle}` : '',
    ].filter(Boolean);
    if (meta.length) b.append(el('p', 'jr-meta', meta.join(' · ')));
    if (site.memorialNote) b.append(el('p', 'jr-memorial', site.memorialNote));
    // The mission overview reads before the first scan; the catalogue text after.
    const summary = open ? site.summary || site.briefing?.summary : site.briefing?.summary;
    if (summary) b.append(el('p', 'jr-para', summary));

    const p = siteProgress(site, this.store);
    const wl = wildlifeProgress(site, this.store);
    const secrets = site.entries.filter((e) => e.kind === 'secret');
    const found = secrets.filter((e) => isEntryUnlocked(site, e, this.store)).length;
    const chips = [`${p.logged}/${p.total} entries`];
    if (p.speciesTotal) chips.push(`${p.species}/${p.speciesTotal} species`);
    if (wl.total) chips.push(`${wl.scanned}/${wl.total} animals`);
    if (secrets.length) chips.push(`${found}/${secrets.length} secrets`);
    b.append(this.chips(chips, 'jr-progress'));

    if (!open) {
      b.append(el('p', 'jr-locked', 'Scan a target here to open this page, or show spoilers.'));
    } else {
      this.body.append(this.entryRows(site));
    }
    this.body.append(foot);
    this.renderAbout(site, open, summary ?? '', foot);
    const credit = dataCreditFor(this.tileSources.get(site.id));
    if (credit) {
      const line = el('p', 'jr-credit', `${credit.label}: `);
      credit.links.forEach(([text, href], i) => {
        if (i) line.append(' · ');
        line.append(link(href, text));
      });
      foot.append(line);
    }
  }

  /** The site page's entries as large rows, grouped under quiet headings. */
  private entryRows(site: JournalSite): HTMLElement {
    const box = el('div', 'jr-entries');
    for (const [label, kind] of GROUPS) {
      const list = site.entries.filter((e) => e.kind === kind);
      if (!list.length) continue;
      const { rows, unscanned, hidden } = this.groupRows(site, label, list);
      const logged = list.filter((e) => isEntryUnlocked(site, e, this.store)).length;
      const section = el('section', 'jr-entry-group');
      const head = el('h3', 'jr-group-title');
      head.setAttribute('aria-label', `${label}, ${logged} of ${list.length} logged`);
      const text = el('span', undefined, label);
      text.setAttribute('aria-hidden', 'true');
      const badge = el('span', 'jr-badge', `${logged}/${list.length}`);
      badge.setAttribute('aria-hidden', 'true');
      head.append(text, badge);
      section.append(head);
      if (rows.length) {
        const ul = el('ul', 'jr-rows');
        for (const { entry, open, title } of rows) {
          const li = el('li');
          const b = el('button', `jr-row is-${entry.kind}`);
          b.type = 'button';
          b.dataset.row = entry.key;
          b.classList.toggle('is-locked', !open);
          b.append(el('span', 'jr-row-title', title), this.glyph('›'));
          b.addEventListener('click', () => this.show(entry.key));
          li.append(b);
          ul.append(li);
        }
        section.append(ul);
      }
      // Locked names stay hidden: a count, plus how to find the first one.
      const more = unscanned + hidden;
      if (more) {
        const how = HOW_TO_FIND[kind];
        section.append(
          el(
            'p',
            'jr-row-note',
            rows.length || !how ? `${more} more to find` : `${more} more to find. ${how}`,
          ),
        );
      }
      box.append(section);
    }
    return box;
  }

  /** Facts, hazards and references: one collapsed disclosure, nothing said twice. */
  private renderAbout(
    site: JournalSite,
    catalogue: boolean,
    shown: string,
    into: HTMLElement,
  ): void {
    const { overview, facts, hazards } = aboutLists(site, catalogue, shown);
    const links = catalogue ? site.links : [];
    if (!overview && !facts.length && !hazards.length && !links.length) return;
    const more = el('details', 'jr-site-more');
    const summary = el('summary', undefined, 'About this site');
    summary.setAttribute('aria-expanded', 'false');
    more.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(more.open)));
    more.append(summary);
    if (overview) more.append(el('p', 'jr-para', overview));
    for (const [title, items] of [
      ['FACTS', facts],
      ['HAZARDS', hazards],
    ] as const) {
      if (!items.length) continue;
      more.append(el('h3', 'jr-sources-title', title));
      const list = el('ul', 'jr-facts-list');
      for (const item of items) list.append(el('li', undefined, item));
      more.append(list);
    }
    this.renderSources(
      links.map((l) => ({ ...l, title: linkLabel(l) })),
      more,
    );
    into.append(more);
  }

  private renderEntry(site: JournalSite, entry: JournalEntry): void {
    const b = this.body;
    const open = isEntryUnlocked(site, entry, this.store);
    if (!open && !this.spoilers_) {
      b.append(el('h2', 'jr-title', 'Undiscovered'));
      b.append(
        el(
          'p',
          'jr-locked',
          entry.kind === 'life'
            ? 'Face this animal and hold Scan to log it, or show spoilers.'
            : entry.kind === 'species'
              ? 'Scan its linked habitat to identify this species, or show spoilers.'
              : 'Face this target and hold Scan to log it, or show spoilers.',
        ),
      );
      this.renderEntryHero(site, entry);
      this.renderEntryPhotos(site, entry);
      return;
    }
    const titleRow = el('div', 'jr-title-row');
    const title = el('h2', 'jr-title', entry.title);
    if (entry.kind === 'species' && !entry.species?.commonName) title.classList.add('is-latin');
    titleRow.append(title);
    const provenance = journalEntryTag(entry);
    if (provenance)
      titleRow.append(
        el('span', provenance === 'Recreation' ? 'jr-tag is-recreation' : 'jr-tag', provenance),
      );
    if (!open) titleRow.append(el('span', 'jr-tag is-undiscovered', 'Undiscovered'));
    b.append(titleRow);
    this.renderEntryHero(site, entry);
    if (entry.kind === 'life' && entry.life) {
      this.renderLife(entry);
      this.renderEntryPhotos(site, entry);
      return;
    }
    if (entry.kind === 'species' && entry.species) {
      this.renderSpecies(site, entry);
      return;
    }
    const g = entry.guide;
    if (!g) {
      this.renderEntryPhotos(site, entry);
      return;
    }
    if (site.memorialNote && entry.kind === 'poi')
      b.append(el('p', 'jr-memorial', site.memorialNote));
    if (g.image) {
      const fig = el('figure', 'jr-figure');
      const img = el('img');
      img.src = g.image.url;
      img.alt = g.image.alt ?? g.title;
      img.loading = 'lazy';
      fig.append(img);
      const credit = [g.image.credit, g.image.license].filter(Boolean).join(' · ');
      if (credit) fig.append(el('figcaption', undefined, credit));
      b.append(fig);
    }
    for (const para of g.paragraphs) b.append(el('p', 'jr-para', para));
    if (g.facts.length) {
      const table = el('table', 'jr-facts');
      for (const f of g.facts) {
        const tr = el('tr');
        tr.append(el('th', undefined, f.label), el('td', undefined, f.value));
        table.append(tr);
      }
      b.append(table);
    }
    this.renderSources(g.sources);
    this.renderEntryPhotos(site, entry);
  }

  // --- D-PHOTO begin ---
  /** Photos of this entry's place or animal, newest first. */
  private entryPhotos(site: JournalSite, entry: JournalEntry) {
    if ((entry.kind !== 'poi' && entry.kind !== 'life') || !this.photoGallery || !this.photos)
      return [];
    const ids = entry.kind === 'life' ? [lifeDiscoveryId(entry.id)] : entry.poiIds;
    return this.photos.photos.filter(
      (photo) => photo.siteId === site.id && photo.poiId !== null && ids.includes(photo.poiId),
    );
  }

  /** The newest photo of the entry, large under the title: the picture of what was scanned. */
  private renderEntryHero(site: JournalSite, entry: JournalEntry): void {
    const photo = this.entryPhotos(site, entry)[0];
    if (!photo) return;
    const fig = el('figure', 'jr-figure jr-hero');
    const img = el('img');
    img.src = photo.image;
    img.alt = photo.poiName ?? entry.title;
    fig.append(img);
    this.body.append(fig);
  }

  /** The full set, when there is more than the hero to browse. */
  private renderEntryPhotos(site: JournalSite, entry: JournalEntry): void {
    const photos = this.entryPhotos(site, entry);
    if (photos.length < 2 || !this.photoGallery) return;
    const section = el('section', 'jr-entry-photos');
    this.body.append(section);
    this.photoGallery.render(
      section,
      photos,
      entry.kind === 'life' ? 'Photos of this animal' : 'Photos of this place',
    );
  }
  // --- D-PHOTO end ---

  /** A scanned animal: its text, a few facts and one source. */
  private renderLife(entry: JournalEntry): void {
    const b = this.body;
    const { def, info, rare } = entry.life!;
    const name = el('p', 'jr-latin');
    name.append(el('i', undefined, def.scientific), el('span', 'jr-group-tag', def.group));
    if (rare) name.append(el('span', 'jr-group-tag', 'Rare sighting'));
    b.append(name);
    b.append(el('p', 'jr-para', info.text));
    if (info.facts) {
      const table = el('table', 'jr-facts');
      for (const [k, v] of Object.entries(info.facts)) {
        const tr = el('tr');
        tr.append(el('th', undefined, k), el('td', undefined, v));
        table.append(tr);
      }
      b.append(table);
    }
    this.renderSources([
      { title: info.sourceTitle, ...(info.sourceUrl ? { url: info.sourceUrl } : {}) },
    ]);
  }

  private renderSpecies(site: JournalSite, entry: JournalEntry): void {
    const b = this.body;
    const r = entry.species!;
    const name = el('p', 'jr-latin');
    name.append(el('i', undefined, r.scientificName));
    if (r.group) name.append(el('span', 'jr-group-tag', r.group));
    b.append(name);
    const table = el('table', 'jr-facts');
    const row = (k: string, v: string): void => {
      const tr = el('tr');
      tr.append(el('th', undefined, k), el('td', undefined, v));
      table.append(tr);
    };
    if (r.commonName) row('Common name', r.commonName);
    row('Survey records here', r.records.toLocaleString('en-US'));
    row('Recorded depth', formatDepthRange(r.depthRange_m));
    b.append(table);
    const linked = entry.linkedEntryIds
      .map((id) => site.entries.find((e) => e.kind === 'poi' && e.id === id))
      .filter((e): e is JournalEntry => !!e);
    if (linked.length) {
      const p = el('p', 'jr-linked', 'Described in: ');
      linked.forEach((e, i) => {
        const a = el('button', 'jr-inline-link', e.title);
        a.type = 'button';
        a.addEventListener('click', () => this.show(e.key));
        if (i) p.append(', ');
        p.append(a);
      });
      b.append(p);
    }
    const sources: Array<{ title: string; url?: string }> = [];
    const taxon = obisTaxonUrl(r);
    if (taxon) sources.push({ title: `OBIS taxon ${r.aphiaID}`, url: taxon });
    const doc = site.species;
    sources.push({
      title: doc?.source_url ? `${doc.source} occurrence query` : 'OBIS',
      url: doc?.source_url ?? OBIS_HOME_URL,
    });
    this.renderSources(sources);
  }

  private renderSources(
    list: ReadonlyArray<{ title: string; url?: string }>,
    into: HTMLElement = this.body,
  ): void {
    if (!list.length) return;
    into.append(el('h3', 'jr-sources-title', 'SOURCES'));
    const ol = el('ol', 'jr-sources');
    for (const s of list) {
      const li = el('li');
      if (s.url) li.append(link(s.url, s.title));
      else li.textContent = s.title;
      ol.append(li);
    }
    into.append(ol);
  }

  dispose(): void {
    this.photoGallery?.dispose();
    this.phoneMq?.removeEventListener?.('change', this.onPhoneChange);
    this.trap.dispose();
    this.root.remove();
  }
}
