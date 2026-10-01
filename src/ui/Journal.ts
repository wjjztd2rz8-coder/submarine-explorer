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
 * All content is untrusted JSON, so it is only ever assigned via textContent;
 * URLs were already filtered to http(s)/site-relative by Guide.ts.
 *
 * It keeps the FieldGuide surface Discovery drives (`setContent`, `focus`,
 * `refresh`, `setFooter`, `open`, `toggle`, `isOpen`), so `ui/FieldGuide.ts`
 * re-exports this class under its old name.
 */

import type { GameEvents } from '../core/EventBus.js';
import type { GuideEntry } from '../game/Guide.js';
import {
  isEntryUnlocked,
  isSiteUnlocked,
  lifeDiscoveryId,
  loadJournalSites,
  siteProgress,
  wildlifeProgress,
  type DiscoveryReader,
  type JournalEntry,
  type JournalSite,
} from '../game/JournalData.js';
import { formatDepthRange, OBIS_HOME_URL, obisTaxonUrl, type SpeciesDoc } from '../game/Species.js';
import { FocusTrap } from './FocusTrap.js';
// --- D-PHOTO begin ---
import { PhotoGallery } from './PhotoGallery.js';
import { PHOTO_LIMIT, type PhotoStore } from '../game/PhotoStore.js';
// --- D-PHOTO end ---

export interface GuideEmitter {
  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void;
}

/** What Discovery pushes for the current dive (the old FieldGuide content). */
export interface FieldGuideContent {
  landmarkName: string;
  memorialNote?: string;
  entries: GuideEntry[];
  isUnlocked(entryId: string): boolean;
}

/** The statement the front page makes once, instead of per-entry caveats. */
export const JOURNAL_HONESTY =
  'The seabed in every dive is real survey data. Wrecks, structures and markers are ' +
  'recreations placed from published sources; their entries carry a Recreation tag. ' +
  'Species lists are OBIS occurrence records for each survey area.';

type View =
  | { kind: 'front' }
  | { kind: 'photos' }
  | { kind: 'site'; siteId: string }
  | { kind: 'entry'; key: string };

/** Site and POI entries come from the guide (and fire `guide:opened`); species and wildlife do not. */
const isGuideEntry = (e: JournalEntry): boolean => e.kind === 'site' || e.kind === 'poi';

const NO_STORE: DiscoveryReader = { isDiscovered: () => false };

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function link(url: string, text: string): HTMLAnchorElement {
  const a = el('a', undefined, text);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

export class Journal {
  readonly root: HTMLDivElement;
  private readonly crumbEl: HTMLSpanElement;
  private readonly countEl: HTMLSpanElement;
  private readonly spoilerBox: HTMLInputElement;
  private readonly nav: HTMLElement;
  private readonly body: HTMLDivElement;
  private readonly footer: HTMLDivElement;
  private readonly trap: FocusTrap;

  private store: DiscoveryReader = NO_STORE;
  private sites: JournalSite[] = [];
  private loading: Promise<void> | null = null;
  private currentSiteId: string | null = null;
  private homeMode = false;
  private spoilers_ = false;
  private view: View = { kind: 'front' };
  private pendingFocus: string | null = null;
  private open_ = false;
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
    const heading = el('div', 'jr-heading');
    heading.append(el('span', 'jr-kicker', 'JOURNAL'));
    this.crumbEl = el('span', 'jr-crumb');
    heading.append(this.crumbEl);
    this.countEl = el('span', 'jr-count');
    const spoiler = el('label', 'jr-spoilers');
    this.spoilerBox = el('input');
    this.spoilerBox.type = 'checkbox';
    this.spoilerBox.addEventListener('change', () => this.setSpoilers(this.spoilerBox.checked));
    spoiler.append(this.spoilerBox, el('span', undefined, 'Show undiscovered entries (spoilers)'));
    const close = el('button', 'jr-close', 'ESC  CLOSE');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    header.append(heading, this.countEl, spoiler, close);

    const main = el('div', 'jr-main');
    this.nav = el('nav', 'jr-nav');
    this.nav.setAttribute('aria-label', 'Journal contents');
    this.body = el('div', 'jr-body');
    main.append(this.nav, this.body);
    this.footer = el('div', 'jr-footer');
    panel.append(header, main, this.footer);
    this.root.append(panel);
    parent.appendChild(this.root);
    this.trap = new FocusTrap(this.root);
  }

  get isOpen(): boolean {
    return this.open_;
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
  setContent(_content: FieldGuideContent): void {
    this.refresh();
  }

  /** Species arrive with the site content; kept for the FieldGuide surface. */
  setSpecies(_doc: SpeciesDoc | null): void {
    this.refresh();
  }

  /** Re-read unlock state (after a discovery). */
  refresh(): void {
    if (this.open_) this.render();
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
    this.loading ??= loadJournalSites(this.currentSiteId ? [this.currentSiteId] : []).then(
      (sites) => {
        this.sites = sites;
        this.refresh();
      },
    );
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
    this.open_ = true;
    this.root.hidden = false;
    this.render();
    this.trap.activate();
    void this.load().then(() => {
      if (focus && site) this.fixEntryKey(site, focus);
      this.refresh();
    });
  }

  close(): void {
    this.open_ = false;
    this.root.hidden = true;
    this.trap.deactivate();
  }

  toggle(): void {
    if (this.open_) this.close();
    else this.open();
  }

  /** Show the front page, a site page (site id) or an entry (entry key). */
  show(target: 'front' | string): void {
    if (target === 'front') this.view = { kind: 'front' };
    else if (target === 'photos') this.view = { kind: 'photos' };
    else if (this.sites.some((s) => s.id === target)) this.view = { kind: 'site', siteId: target };
    else this.view = { kind: 'entry', key: target };
    this.render();
    this.announce();
    this.body.scrollTop = 0;
  }

  /** The focus id may be a site-level entry rather than a POI one. */
  private fixEntryKey(siteId: string, id: string): void {
    const site = this.sites.find((s) => s.id === siteId);
    const e = site?.entries.find((x) => isGuideEntry(x) && x.id === id);
    if (e) this.view = { kind: 'entry', key: e.key };
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
    this.renderNav(sites, site, entry);

    this.body.replaceChildren();
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
  ): HTMLLIElement {
    const li = el('li');
    const b = el('button', `jr-nav-item ${cls}`);
    b.type = 'button';
    b.dataset.target = target;
    b.classList.toggle('is-selected', on);
    b.append(el('span', 'jr-nav-title', label));
    if (meta) b.append(el('span', 'jr-nav-meta', meta));
    b.addEventListener('click', () => this.show(target));
    li.append(b);
    return li;
  }

  private renderNav(
    sites: JournalSite[],
    open: JournalSite | null,
    entry: JournalEntry | null,
  ): void {
    const scrollTop = this.nav.scrollTop;
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
      const li = this.navButton(
        s.name,
        `${cur ? 'THIS DIVE · ' : ''}${p.logged}/${p.total}`,
        'is-site',
        s.id,
        this.view.kind === 'site' && s.id === open?.id,
      );
      li.classList.toggle('is-locked', !isSiteUnlocked(s, this.store));
      ul.append(li);
      if (s === open) li.append(this.siteEntryList(s, entry));
    }
    this.nav.replaceChildren(ul);
    this.nav.scrollTop = scrollTop;
  }

  /** The open site's entries, grouped, under its nav item. */
  private siteEntryList(site: JournalSite, current: JournalEntry | null): HTMLElement {
    const box = el('div', 'jr-site-entries');
    const groups: Array<[string, JournalEntry[]]> = [
      ['About the site', site.entries.filter((e) => e.kind === 'site')],
      ['Points of interest', site.entries.filter((e) => e.kind === 'poi')],
      ['Species', site.entries.filter((e) => e.kind === 'species')],
      ['Wildlife', site.entries.filter((e) => e.kind === 'life')],
    ];
    for (const [label, list] of groups) {
      if (!list.length) continue;
      box.append(el('h3', 'jr-group', label));
      const ul = el('ul');
      let hidden = 0;
      for (const e of list) {
        const open = isEntryUnlocked(site, e, this.store);
        if (!open && !this.spoilers_ && (e.kind === 'species' || e.kind === 'life')) {
          hidden++;
          continue;
        }
        const title = open || this.spoilers_ ? e.title : 'Undiscovered';
        const li = this.navButton(title, '', `is-entry is-${e.kind}`, e.key, e === current);
        li.classList.toggle('is-locked', !open);
        ul.append(li);
      }
      box.append(ul);
      if (hidden) {
        box.append(
          el(
            'p',
            'jr-hidden-note',
            label === 'Wildlife'
              ? `${hidden} animals not yet scanned. Hold the scan key on one during a dive.`
              : `${hidden} species not yet identified. Show spoilers to read the survey list.`,
          ),
        );
      }
    }
    return box;
  }

  private renderFront(sites: JournalSite[]): void {
    const b = this.body;
    b.append(el('h2', 'jr-title', 'Dive journal'));
    b.append(el('p', 'jr-honesty', JOURNAL_HONESTY));
    const visited = sites.filter((s) => isSiteUnlocked(s, this.store)).length;
    b.append(
      el(
        'p',
        'jr-lead',
        `Scan wrecks, vents and landforms during a dive to log them here. ` +
          `${visited} of ${sites.length} sites visited.`,
      ),
    );
    const grid = el('div', 'jr-site-grid');
    for (const s of sites) {
      const p = siteProgress(s, this.store);
      const card = el('button', 'jr-site-card');
      card.type = 'button';
      card.dataset.target = s.id;
      card.classList.toggle('is-locked', !isSiteUnlocked(s, this.store));
      card.append(el('span', 'jr-card-name', s.name));
      const meta = [s.region, s.depthM === null ? '' : `${s.depthM.toLocaleString('en-US')} m`]
        .filter(Boolean)
        .join(' · ');
      if (meta) card.append(el('span', 'jr-card-meta', meta));
      const bar = el('span', 'jr-card-bar');
      const fill = el('span', 'jr-card-fill');
      fill.style.width = `${p.total ? Math.round((100 * p.logged) / p.total) : 0}%`;
      bar.append(fill);
      card.append(bar, el('span', 'jr-card-count', `${p.logged} of ${p.total} entries logged`));
      card.addEventListener('click', () => this.show(s.id));
      grid.append(card);
    }
    b.append(grid);
  }

  private renderSite(site: JournalSite): void {
    const b = this.body;
    const unlocked = isSiteUnlocked(site, this.store);
    const titleRow = el('div', 'jr-title-row');
    titleRow.append(el('h2', 'jr-title', site.name));
    if (!unlocked) titleRow.append(el('span', 'jr-tag is-undiscovered', 'Not visited'));
    b.append(titleRow);
    const meta = [
      site.region,
      site.depthM === null ? '' : `about ${site.depthM.toLocaleString('en-US')} m deep`,
      site.missionTitle ? `Mission: ${site.missionTitle}` : '',
    ].filter(Boolean);
    if (meta.length) b.append(el('p', 'jr-meta', meta.join(' · ')));
    if (site.memorialNote) b.append(el('p', 'jr-memorial', site.memorialNote));
    const p = siteProgress(site, this.store);
    const wl = wildlifeProgress(site, this.store);
    b.append(
      el(
        'p',
        'jr-progress',
        `${p.logged} of ${p.total} entries logged · ${p.species} of ${p.speciesTotal} species identified` +
          (wl.total ? ` · ${wl.scanned} of ${wl.total} animals scanned` : ''),
      ),
    );
    if (!unlocked && !this.spoilers_) {
      b.append(
        el('p', 'jr-locked', 'Dive here and scan anything to open this page. Or show spoilers.'),
      );
      return;
    }
    if (site.summary) b.append(el('p', 'jr-para', site.summary));
    if (site.facts.length) {
      const ul = el('ul', 'jr-facts-list');
      for (const f of site.facts) ul.append(el('li', undefined, f));
      b.append(ul);
    }
    const firstPoi = site.entries.find((e) => e.kind === 'poi');
    if (firstPoi) {
      const go = el('button', 'jr-next', 'Read the entries →');
      go.type = 'button';
      go.addEventListener('click', () => {
        const first =
          site.entries.find((e) => isGuideEntry(e) && isEntryUnlocked(site, e, this.store)) ??
          firstPoi;
        this.show(first.key);
      });
      b.append(go);
    }
    this.renderSources(site.links);
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
            ? 'Find this animal during a dive and hold the scanner on it to log it. Or show spoilers.'
            : entry.kind === 'species'
              ? 'Scan the place this species is recorded at to identify it. Or show spoilers.'
              : 'Find this target during a dive and hold the scanner on it to log it. Or show spoilers.',
        ),
      );
      this.renderEntryPhotos(site, entry);
      return;
    }
    const titleRow = el('div', 'jr-title-row');
    const title = el('h2', 'jr-title', entry.title);
    if (entry.kind === 'species' && !entry.species?.commonName) title.classList.add('is-latin');
    titleRow.append(title);
    if (entry.recreation) titleRow.append(el('span', 'jr-tag is-recreation', 'Recreation'));
    if (!open) titleRow.append(el('span', 'jr-tag is-undiscovered', 'Undiscovered'));
    b.append(titleRow);
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
  private renderEntryPhotos(site: JournalSite, entry: JournalEntry): void {
    if ((entry.kind !== 'poi' && entry.kind !== 'life') || !this.photoGallery || !this.photos)
      return;
    const ids = entry.kind === 'life' ? [lifeDiscoveryId(entry.id)] : entry.poiIds;
    const photos = this.photos.photos.filter(
      (photo) => photo.siteId === site.id && photo.poiId !== null && ids.includes(photo.poiId),
    );
    if (!photos.length) return;
    const section = el('section', 'jr-entry-photos');
    this.body.append(section);
    this.photoGallery.render(
      section,
      photos,
      entry.kind === 'life' ? 'Photos of this animal' : 'Photos of this place',
    );
  }
  // --- D-PHOTO end ---

  /** A scanned animal (F2-LIFE): its text, a few facts and one source. */
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

  private renderSources(list: ReadonlyArray<{ title: string; url?: string }>): void {
    if (!list.length) return;
    this.body.append(el('h3', 'jr-sources-title', 'SOURCES'));
    const ol = el('ol', 'jr-sources');
    for (const s of list) {
      const li = el('li');
      if (s.url) li.append(link(s.url, s.title));
      else li.textContent = s.title;
      ol.append(li);
    }
    this.body.append(ol);
  }

  dispose(): void {
    this.trap.deactivate();
    this.root.remove();
  }
}
