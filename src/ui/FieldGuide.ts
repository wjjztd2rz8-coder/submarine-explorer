/**
 * Field-guide overlay (DOM). Lists the current landmark's entries -- locked
 * ones as "Uncatalogued" -- and renders the selected entry: memorial note
 * (quietly, at the top), title, "artist's reconstruction" badge, optional
 * image with credit, paragraphs, facts table and sources.
 *
 * All content is untrusted JSON, so it is only ever assigned via textContent;
 * URLs were already filtered to http(s)/site-relative by Guide.ts.
 *
 * The game keeps running while this is open; the caller suppresses scanning.
 *
 * C1: a SPECIES tab lists the site's OBIS survey species (`species.json`,
 * game/Species.ts). It is survey data, so it is never locked; the "placement
 * is invented" disclaimer and the OBIS source link are always shown.
 */

import type { GameEvents } from '../core/EventBus.js';
import type { GuideEntry } from '../game/Guide.js';
import {
  formatDepthRange,
  OBIS_HOME_URL,
  obisTaxonUrl,
  SPECIES_DISCLAIMER,
  type SpeciesDoc,
} from '../game/Species.js';
import { FocusTrap } from './FocusTrap.js';

export interface GuideEmitter {
  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void;
}

/** Which pane the guide shows: catalogued entries or the survey species list (C1). */
export type FieldGuideTab = 'entries' | 'species';

export interface FieldGuideContent {
  landmarkName: string;
  memorialNote?: string;
  entries: GuideEntry[];
  isUnlocked(entryId: string): boolean;
}

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

export class FieldGuide {
  readonly root: HTMLDivElement;
  private readonly titleEl: HTMLSpanElement;
  private readonly countEl: HTMLSpanElement;
  private readonly list: HTMLUListElement;
  private readonly body: HTMLDivElement;
  private readonly footer: HTMLDivElement;
  // C1: species tab
  private readonly tabEntries: HTMLButtonElement;
  private readonly tabSpecies: HTMLButtonElement;
  private readonly speciesEl: HTMLDivElement;
  private species: SpeciesDoc | null = null;
  private tab_: FieldGuideTab = 'entries';
  private content: FieldGuideContent = {
    landmarkName: '',
    entries: [],
    isUnlocked: () => false,
  };
  private selected: string | null = null;
  private pendingFocus: string | null = null;
  private open_ = false;
  /** QA-B #12: Tab stays inside the guide while it is open (it stacks over a debrief). */
  private readonly trap: FocusTrap;

  constructor(
    private readonly bus: GuideEmitter | null = null,
    parent: HTMLElement = document.body,
  ) {
    this.root = el('div', 'field-guide');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Field guide');

    const panel = el('div', 'fg-panel');
    const header = el('div', 'fg-header');
    const heading = el('div', 'fg-heading');
    heading.append(el('span', 'fg-kicker', 'FIELD GUIDE'));
    this.titleEl = el('span', 'fg-landmark');
    heading.append(this.titleEl);
    this.countEl = el('span', 'fg-count');
    const close = el('button', 'fg-close', 'ESC  CLOSE');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    // C1: GUIDE / SPECIES tabs.
    const tabs = el('div', 'fg-tabs');
    tabs.setAttribute('role', 'tablist');
    this.tabEntries = el('button', 'fg-tab', 'GUIDE');
    this.tabSpecies = el('button', 'fg-tab fg-tab-species', 'SPECIES');
    for (const [b, t] of [
      [this.tabEntries, 'entries'],
      [this.tabSpecies, 'species'],
    ] as const) {
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.dataset.tab = t;
      b.addEventListener('click', () => this.showTab(t));
      tabs.append(b);
    }
    header.append(heading, tabs, this.countEl, close);

    const main = el('div', 'fg-main');
    this.list = el('ul', 'fg-list');
    this.body = el('div', 'fg-entry');
    this.speciesEl = el('div', 'fg-species');
    this.speciesEl.hidden = true;
    main.append(this.list, this.body, this.speciesEl);

    this.footer = el('div', 'fg-footer');
    panel.append(header, main, this.footer);
    this.root.append(panel);
    parent.appendChild(this.root);
    this.trap = new FocusTrap(this.root);
  }

  get isOpen(): boolean {
    return this.open_;
  }

  /** Currently displayed entry id (null when none / closed). */
  get selectedId(): string | null {
    return this.selected;
  }

  /** Which pane is showing. */
  get tab(): FieldGuideTab {
    return this.tab_;
  }

  /** C1: the survey species list (null or empty -> an empty-state message). */
  setSpecies(doc: SpeciesDoc | null): void {
    this.species = doc;
    if (this.open_) this.render();
    else this.renderTabs();
  }

  /** Switch between the GUIDE entries and the SPECIES list. */
  showTab(tab: FieldGuideTab): void {
    this.tab_ = tab;
    if (this.open_) this.render();
    else this.renderTabs();
  }

  setContent(content: FieldGuideContent): void {
    this.content = content;
    this.titleEl.textContent = content.landmarkName;
    if (this.open_) this.render();
  }

  /** Re-read unlock state (after a discovery). */
  refresh(): void {
    if (this.open_) this.render();
  }

  /** The next `open()` without an explicit entry shows this one. */
  focus(entryId: string): void {
    this.pendingFocus = entryId;
  }

  setFooter(text: string): void {
    if (this.footer.textContent !== text) this.footer.textContent = text;
  }

  open(entryId?: string): void {
    const entries = this.content.entries;
    // An explicit entry (a scan just catalogued it) always shows the GUIDE pane.
    if (entryId ?? this.pendingFocus) this.tab_ = 'entries';
    const want = entryId ?? this.pendingFocus ?? this.selected;
    this.pendingFocus = null;
    const exists = (id: string | null): id is string => !!id && entries.some((e) => e.id === id);
    this.selected = exists(want)
      ? want
      : (entries.find((e) => this.content.isUnlocked(e.id))?.id ?? entries[0]?.id ?? null);
    this.open_ = true;
    this.root.hidden = false;
    this.render();
    this.announce();
    this.trap.activate();
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

  select(entryId: string): void {
    this.selected = entryId;
    this.render();
    this.announce();
  }

  private announce(): void {
    if (this.tab_ !== 'entries') return;
    if (this.selected && this.content.isUnlocked(this.selected)) {
      this.bus?.emit('guide:opened', { entryId: this.selected });
    }
  }

  private render(): void {
    this.renderTabs();
    if (this.tab_ === 'species') {
      this.renderSpecies();
      return;
    }
    const { entries, isUnlocked } = this.content;
    const unlocked = entries.filter((e) => isUnlocked(e.id)).length;
    this.countEl.textContent = entries.length
      ? `${unlocked} / ${entries.length} CATALOGUED`
      : 'NO ENTRIES';

    this.list.replaceChildren();
    for (const e of entries) {
      const open = isUnlocked(e.id);
      const li = el('li');
      const btn = el('button', 'fg-item');
      btn.type = 'button';
      btn.classList.toggle('is-locked', !open);
      btn.classList.toggle('is-selected', e.id === this.selected);
      btn.append(el('span', 'fg-item-title', open ? e.title : 'Uncatalogued contact'));
      btn.append(
        el(
          'span',
          'fg-item-meta',
          open ? (e.reconstruction ? 'RECONSTRUCTION' : 'SURVEY') : 'LOCKED',
        ),
      );
      btn.addEventListener('click', () => this.select(e.id));
      li.append(btn);
      this.list.append(li);
    }

    this.body.replaceChildren();
    this.body.scrollTop = 0;
    const entry = entries.find((e) => e.id === this.selected);
    if (!entry) {
      this.body.append(
        el(
          'p',
          'fg-empty',
          'No field-guide entries for this site yet. Scan targets to catalogue them.',
        ),
      );
      return;
    }
    if (this.content.memorialNote) {
      this.body.append(el('p', 'fg-memorial', this.content.memorialNote));
    }
    if (!isUnlocked(entry.id)) {
      this.body.append(el('h2', 'fg-title', 'Uncatalogued contact'));
      this.body.append(
        el(
          'p',
          'fg-locked',
          'Locate this target and hold the scan beam on it to catalogue the entry.',
        ),
      );
      return;
    }

    const titleRow = el('div', 'fg-title-row');
    titleRow.append(el('h2', 'fg-title', entry.title));
    if (entry.reconstruction) titleRow.append(el('span', 'fg-badge', "ARTIST'S RECONSTRUCTION"));
    if (entry.confidence) {
      titleRow.append(el('span', 'fg-confidence', `CONFIDENCE ${entry.confidence.toUpperCase()}`));
    }
    this.body.append(titleRow);

    if (entry.image) {
      const fig = el('figure', 'fg-figure');
      const img = el('img');
      img.src = entry.image.url;
      img.alt = entry.image.alt ?? entry.title;
      img.loading = 'lazy';
      fig.append(img);
      const credit = [entry.image.credit, entry.image.license].filter(Boolean).join(' · ');
      if (credit) fig.append(el('figcaption', undefined, credit));
      this.body.append(fig);
    }

    for (const p of entry.paragraphs) this.body.append(el('p', 'fg-para', p));

    if (entry.facts.length) {
      const table = el('table', 'fg-facts');
      for (const f of entry.facts) {
        const tr = el('tr');
        tr.append(el('th', undefined, f.label), el('td', undefined, f.value));
        table.append(tr);
      }
      this.body.append(table);
    }

    if (entry.sources.length) {
      this.body.append(el('h3', 'fg-sources-title', 'SOURCES'));
      const ol = el('ol', 'fg-sources');
      for (const s of entry.sources) {
        const li = el('li');
        if (s.url) {
          const a = el('a', undefined, s.title);
          a.href = s.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          li.append(a);
        } else {
          li.textContent = s.title;
        }
        ol.append(li);
      }
      this.body.append(ol);
    }
  }

  private renderTabs(): void {
    const species = this.tab_ === 'species';
    this.root.classList.toggle('is-species', species);
    this.tabEntries.classList.toggle('is-active', !species);
    this.tabSpecies.classList.toggle('is-active', species);
    this.tabEntries.setAttribute('aria-selected', String(!species));
    this.tabSpecies.setAttribute('aria-selected', String(species));
    const n = this.species?.species.length ?? 0;
    this.tabSpecies.textContent = n ? `SPECIES ${n}` : 'SPECIES';
    this.list.hidden = species;
    this.body.hidden = species;
    this.speciesEl.hidden = !species;
  }

  /** C1: survey species table. Everything via textContent (untrusted JSON). */
  private renderSpecies(): void {
    const doc = this.species;
    const box = this.speciesEl;
    box.replaceChildren();
    box.scrollTop = 0;
    const list = doc?.species ?? [];
    this.countEl.textContent = list.length ? `${list.length} SURVEY SPECIES` : 'NO SURVEY SPECIES';

    const titleRow = el('div', 'fg-title-row');
    titleRow.append(el('h2', 'fg-title', 'Species recorded here'));
    titleRow.append(el('span', 'fg-badge fg-badge-survey', 'SURVEY DATA'));
    box.append(titleRow);
    box.append(el('p', 'fg-species-note', doc?.note ?? SPECIES_DISCLAIMER));

    if (!list.length) {
      box.append(
        el('p', 'fg-empty', 'No occurrence records have been exported for this site yet.'),
      );
    } else {
      const table = el('table', 'fg-species-table');
      const head = el('tr');
      for (const h of ['SPECIES', 'COMMON NAME', 'RECORDS', 'DEPTH'])
        head.append(el('th', undefined, h));
      const thead = el('thead');
      thead.append(head);
      const tbody = el('tbody');
      for (const r of list) {
        const tr = el('tr', 'fg-species-row');
        const name = el('td', 'fg-species-name');
        const i = el('i', undefined, r.scientificName);
        const taxon = obisTaxonUrl(r);
        if (taxon) {
          const a = el('a');
          a.href = taxon;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.append(i);
          name.append(a);
        } else {
          name.append(i);
        }
        if (r.group) name.append(el('span', 'fg-species-group', r.group));
        tr.append(
          name,
          el('td', 'fg-species-common', r.commonName ?? '—'),
          el('td', 'fg-species-records', r.records.toLocaleString('en-US')),
          el('td', 'fg-species-depth', formatDepthRange(r.depthRange_m)),
        );
        tbody.append(tr);
      }
      table.append(thead, tbody);
      box.append(table);
    }

    box.append(el('h3', 'fg-sources-title', 'SOURCE'));
    const src = el('p', 'fg-species-source');
    const a = el(
      'a',
      undefined,
      doc?.source_url
        ? `${doc.source} occurrence query`
        : 'OBIS — Ocean Biodiversity Information System',
    );
    a.href = doc?.source_url ?? OBIS_HOME_URL;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    src.append(a);
    const meta: string[] = [];
    if (doc?.fetched_at) meta.push(`fetched ${doc.fetched_at.slice(0, 10)}`);
    if (doc?.depth_filter_m) meta.push(`depth filter ${formatDepthRange(doc.depth_filter_m)}`);
    if (meta.length) src.append(el('span', 'fg-species-meta', ` · ${meta.join(' · ')}`));
    box.append(src);
  }

  dispose(): void {
    this.trap.deactivate();
    this.root.remove();
  }
}
