/**
 * End-of-dive log: scanned subjects, a Journal fact and the next tour destination. The mission
 * router (D-FLOW) opens it when the player surfaces and passes its own
 * actions (Keep exploring, Dive again, Dive sites, Home, Journal);
 * `?debrief=1` opens the free-dive variant for screenshots.
 */

import { nextSiteAfter, siteFinds, tourJournal } from '../game/Tour.js';
import type { DiscoveryReader, JournalSite } from '../game/JournalData.js';
import { PhotoStore, type Photo } from '../game/PhotoStore.js';
import { el } from './dom.js';

import { Progress, type DiveRating } from '../game/Progress.js';
import { missionUrl } from './MissionSelect.js';
import type { DebriefStats } from '../game/Objectives.js';
import { FocusTrap } from './FocusTrap.js';

/** One debrief button. `id` becomes `data-action` (stable for tests and CSS). */
export interface DebriefAction {
  id: string;
  label: string;
  primary?: boolean;
  siteId?: string;
  run: () => void;
}

export interface ExplorationSummary {
  found: number;
  total: number;
  secrets: string[];
  samples: string[];
  events: string[];
}

export interface DebriefContext {
  siteId: string;
  primaryIds: string[];
  store: DiscoveryReader;
}

/** Pure content model: only this dive's fixed targets and scanned wildlife become tiles. */
export function debriefModel(
  stats: DebriefStats,
  site?: JournalSite,
  store?: DiscoveryReader,
  photos: readonly Photo[] = [],
  primaryIds: readonly string[] = [],
) {
  const finds = [
    ...new Map(
      stats.discoveries
        .filter((d) => d.poiId.startsWith('life:') || !d.poiId.includes(':'))
        .map((d) => [d.poiId, d]),
    ).values(),
  ].map((d) => {
    const entry = site?.entries.find(
      (e) =>
        (e.kind === 'poi' || e.kind === 'life') &&
        (e.kind === 'life' ? `life:${e.id}` === d.poiId : e.poiIds.includes(d.poiId)),
    );
    const image =
      photos.find((p) => p.siteId === site?.id && p.poiId === d.poiId)?.image ??
      entry?.guide?.image?.url;
    return { ...d, image, text: entry?.guide?.paragraphs[0] ?? entry?.life?.info.text };
  });
  const fact = [...finds]
    .sort((a, b) => Number(primaryIds.includes(b.poiId)) - Number(primaryIds.includes(a.poiId)))
    .find((d) => d.text)?.text;
  const sentence = fact?.match(/^.*?[.!?](?=\s|$)|^.+$/s)?.[0];
  const counts = site && store ? siteFinds(site, store) : null;
  return {
    title:
      stats.objectives &&
      stats.objectives.total > 0 &&
      stats.objectives.completed === stats.objectives.total
        ? 'Dive complete'
        : 'Dive ended',
    finds,
    fact: sentence
      ? sentence.length > 200
        ? sentence.slice(0, 197).trimEnd() + '…'
        : sentence
      : null,
    progress: counts
      ? `Found ${counts.found} of ${counts.total} at ${stats.landmarkName ?? site?.name}`
      : null,
  };
}

export function primaryDebriefAction(actions: DebriefAction[]): DebriefAction | undefined {
  return (
    actions.find((a) => a.id === 'next-dive') ??
    actions.find((a) => a.id === 'dive-sites') ??
    actions.find((a) => a.primary && a.id !== 'dive-again') ??
    actions.find((a) => a.id !== 'dive-again')
  );
}

interface DebriefOptions {
  context?: DebriefContext;
  /** Default: reload the same URL. Used when `show()` gets no actions. */
  onDiveAgain?: () => void;
  /** Opens the Journal. Used when `show()` gets no actions. */
  onFieldGuide?: () => void;
  parent?: HTMLElement;
}

export class Debrief {
  readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private sites: JournalSite[] = [];
  private photos: PhotoStore | null = null;
  private escape: (() => void) | null = null;
  /** Read when shown, so both free dives and mission debriefs include curiosity. */
  exploration: (() => ExplorationSummary) | null = null;
  /** The stats last shown, exposed for tests. */
  last: DebriefStats | null = null;
  /** Tab stays inside the debrief while it is open. */
  private readonly trap: FocusTrap;

  constructor(private readonly options: DebriefOptions = {}) {
    this.root = el('div', 'debrief');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Dive debrief');
    this.root.setAttribute('aria-modal', 'true');
    this.panel = el('div', 'debrief-panel');
    this.root.append(this.panel);
    (options.parent ?? document.body).appendChild(this.root);
    this.trap = new FocusTrap(this.root, { onEscape: () => this.escape?.() });
  }

  get isOpen(): boolean {
    return this.trap.active;
  }

  /** Default: dismiss on Escape. Null keeps an aborted dive as a decision point. */
  show(
    stats: DebriefStats,
    actions?: DebriefAction[],
    rating?: DiveRating,
    onEscape?: (() => void) | null,
  ): void {
    if (this.options.context) this.photos = new PhotoStore();
    if (this.options.context && !this.sites.length) {
      void tourJournal().then((sites) => {
        if (!this.isOpen || this.last !== stats || !sites.length) return;
        this.sites = sites;
        if (!this.trap.isTop) return;
        this.show(stats, actions, rating, onEscape);
      });
    }
    const context = this.options.context;
    const site = this.sites.find((s) => s.id === context?.siteId);
    const model = debriefModel(
      stats,
      site,
      context?.store,
      this.photos?.photos,
      context?.primaryIds,
    );
    this.escape = onEscape === undefined ? () => this.hide() : onEscape;
    this.last = stats;
    const p = this.panel;
    p.replaceChildren();

    const head = el('div', 'debrief-head');
    head.append(
      el(
        'div',
        'debrief-kicker',
        stats.landmarkName ? stats.landmarkName.toUpperCase() : 'DIVE LOG',
      ),
    );
    head.append(el('h1', 'debrief-title', model.title));
    p.append(head);

    const score = el('div', 'debrief-rating debrief-score');
    if (rating) {
      const stars = el(
        'span',
        'debrief-stars',
        '★'.repeat(rating.stars) + '☆'.repeat(3 - rating.stars),
      );
      stars.setAttribute('aria-label', `${rating.stars} of 3 stars`);
      score.append(stars);
    }
    if (model.progress) score.append(el('span', 'debrief-found', model.progress));
    const finds = el('div', 'debrief-finds');
    finds.setAttribute('aria-label', 'Scanned this dive');
    for (const find of model.finds) {
      const tile = el('div', 'debrief-find');
      if (find.image) {
        const img = el('img', 'debrief-thumb');
        img.src = find.image;
        img.alt = '';
        tile.append(img);
      }
      tile.append(el('span', 'debrief-find-name', find.name));
      finds.append(tile);
    }
    if (!model.finds.length)
      finds.append(el('p', 'debrief-empty', 'No scans this dive. There is more to discover.'));
    p.append(finds, score);
    if (stats.subtitle) p.append(el('p', 'debrief-cause', stats.subtitle));
    if (model.fact) p.append(el('p', 'debrief-fact', `Did you know? ${model.fact}`));

    const row = el('div', 'debrief-actions');
    const next = context ? nextSiteAfter(context.siteId, new Progress()) : null;
    const list = actions ?? [
      ...(next
        ? [
            {
              id: 'next-dive',
              siteId: next,
              label: `Next dive: ${next.replaceAll('-', ' ')}`,
              primary: true,
              run: () => {
                window.location.href = missionUrl(window.location.href, next);
              },
            },
          ]
        : [
            {
              id: 'dive-sites',
              label: 'Choose a dive site',
              primary: true,
              run: () => {
                window.location.href = './';
              },
            },
          ]),
      {
        id: 'dive-again',
        label: 'Dive again',
        primary: false,
        run: () => {
          if (this.options.onDiveAgain) this.options.onDiveAgain();
          else window.location.reload();
        },
      },
      { id: 'journal', label: 'Journal', run: () => this.options.onFieldGuide?.() },
    ];
    const primary = primaryDebriefAction(list);
    if (primary?.id === 'next-dive') {
      const next = this.sites.find((s) => s.id === primary.siteId);
      if (next) primary.label = `Next dive: ${next.name}`;
    }
    const navigation = el('div', 'debrief-navigation');
    const secondary = el('div', 'debrief-secondary');
    const more = el('div', 'debrief-more');
    const toggle = el('button', 'debrief-more-toggle', 'More options');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    const moreBox = el('div', 'debrief-more-items');
    moreBox.hidden = true;
    toggle.addEventListener('click', () => {
      moreBox.hidden = !moreBox.hidden;
      toggle.setAttribute('aria-expanded', String(!moreBox.hidden));
    });
    more.append(toggle, moreBox);
    const rest = list.filter((a) => a !== primary);
    const quiet = [
      rest.find((a) => a.id === 'keep-exploring'),
      rest.find((a) => a.id === 'journal'),
    ];
    const mk = (a: DebriefAction, cls: string): HTMLButtonElement => {
      const b = el('button', cls, a.label);
      b.type = 'button';
      b.dataset.action = a.id;
      b.addEventListener('click', () => a.run());
      return b;
    };
    const primaryButton = primary ? mk(primary, 'debrief-btn is-primary') : null;
    if (primaryButton) navigation.append(primaryButton);
    for (const a of quiet) if (a) secondary.append(mk(a, 'debrief-btn'));
    for (const a of rest) if (!quiet.includes(a)) moreBox.append(mk(a, 'debrief-btn'));
    if (moreBox.childElementCount) secondary.append(more);
    row.append(navigation, secondary);
    p.append(row);

    this.trap.show();
    primaryButton?.focus?.();
    // Returning from Keep exploring creates a new summary in the same panel.
    p.scrollTop = 0;
  }

  hide(): void {
    this.trap.hide();
  }

  dispose(): void {
    this.trap.dispose();
    this.last = null;
    this.root.remove();
  }
}
