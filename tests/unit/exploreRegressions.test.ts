// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { EventBus } from '../../src/core/EventBus.js';
import { Scanner } from '../../src/game/Scanner.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Journal } from '../../src/ui/Journal.js';
import {
  buildJournalSite,
  isEntryUnlocked,
  isSiteUnlocked,
  journalEntryTag,
  loadJournalSites,
  siteProgress,
} from '../../src/game/JournalData.js';
import { DiscoveryStore, DISCOVERY_STORAGE_KEY } from '../../src/game/DiscoveryStore.js';
import { loadSecrets, parseSecrets, placeSecrets, secretProgress } from '../../src/game/Secrets.js';
import { parseMission, parseMissionIndex } from '../../src/game/Mission.js';
import type { FetchJson } from '../../src/game/ContentPath.js';
import type { TileMeta } from '../../src/util/types.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Life } from '../../src/world/life/Life.js';
import { LifeSim } from '../../src/world/life/LifeSim.js';
import { LIFE_TIERS } from '../../src/world/life/types.js';
import { SPECIES_BY_ID } from '../../src/world/life/catalogue.js';
import { parseLifeDoc } from '../../src/world/life/tables.js';
import type { SubInfo } from '../../src/world/life/agent.js';
import lifeDoc from '../../data/life/life.json';

const site = buildJournalSite({
  id: 'monterey-canyon',
  guide: null,
  pois: [],
  species: null,
  secrets: [
    { id: 'arch', kind: 'alcove', name: 'Ledge shelter', lat: 36, lon: -122, text: 'A low ledge.' },
  ],
});
/** Render/focus are DOM concerns; exercise actual Journal navigation and its async callback. */
function journalWithLoad(loading = Promise.resolve()): Journal {
  const journal = Object.create(Journal.prototype) as Journal;
  const trap = {
    active: false,
    show: vi.fn(() => {
      trap.active = true;
    }),
  };
  Object.assign(journal, {
    sites: [site],
    currentSiteId: site.id,
    expandedSites: new Map<string, boolean>(),
    expandedCategories: new Map<string, boolean>(),
    view: { kind: 'front' },
    root: { hidden: true },
    body: { scrollTop: 0 },
    render: vi.fn(),
    announce: vi.fn(),
    trap,
    load: () => loading,
  });
  return journal;
}

describe('Journal navigation after a scan', () => {
  it('does not restore scan focus after the player selects the site page', async () => {
    const journal = journalWithLoad();
    journal.focus('arch');
    journal.open();
    journal.show(site.id);
    await Promise.resolve();
    expect(journal.viewKey).toBe(site.id);
  });
  it('resolves scan focus when late content loads and no later navigation occurred', async () => {
    let finish!: () => void;
    const loading = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const journal = journalWithLoad(loading);
    Object.assign(journal, { sites: [] });
    journal.focus('arch');
    journal.open();
    Object.assign(journal, { sites: [site] });
    finish();
    await loading;
    expect(journal.viewKey).toBe(`${site.id}/secret/arch`);
  });
  it('preserves a newer front-page selection while content is loading', async () => {
    let finish!: () => void;
    const loading = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const journal = journalWithLoad(loading);
    journal.focus('arch');
    journal.open();
    journal.show('front');
    finish();
    await loading;
    expect(journal.viewKey).toBe('front');
  });
});

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const shippedIds = parseMissionIndex(readJson('data/landmarks/index.json'));
const admittedSecrets = shippedIds.flatMap((id) => {
  const path = `data/secrets/${id}.json`;
  // Optional absence and ignored rows are valid; only admitted content is scannable.
  const doc = parseSecrets(existsSync(path) ? readJson(path) : null);
  return doc.secrets.map((def) => ({ id, def }));
});
const localContentFetch: FetchJson = async (url) => {
  if (
    !/^\/data\/(?:landmarks(?:\.json|\/index\.json|\/[a-z0-9-]+\/[a-z]+\.json)|secrets\/[a-z0-9-]+\.json|life\/life\.json)$/.test(
      url,
    )
  )
    return { ok: false, text: async () => '' };
  try {
    const source = readFileSync(`.${url}`, 'utf8');
    return { ok: true, text: async () => source };
  } catch {
    return { ok: false, text: async () => '' };
  }
};
async function loadCompleteJournal() {
  // Use the default loader path: an injected Journal fetch intentionally omits life.
  vi.stubGlobal('fetch', localContentFetch);
  try {
    return await loadJournalSites();
  } finally {
    vi.unstubAllGlobals();
  }
}

describe('shipped secret discoveries in the Journal', () => {
  it.each(admittedSecrets)(
    '$id/$def.id retains its authored entry through scan, reload and raw-ID focus',
    async ({ id, def }) => {
      const sites = await loadCompleteJournal();
      expect(sites.map((s) => s.id)).toEqual(shippedIds);
      const current = sites.find((s) => s.id === id)!;
      const doc = await loadSecrets(id, localContentFetch);
      expect(doc.secrets).toContainEqual(def);
      const mission = parseMission(readJson(`data/landmarks/${id}/mission.json`), id)!;
      const meta = readJson(`data/tiles/${mission.tile}/meta.json`) as TileMeta;
      const target = placeSecrets(doc, id, meta, () => -100).find((t) => t.def.id === def.id)!;
      const entryKey = `${id}/secret/${def.id}`;
      const entry = current.entries.find((e) => e.key === entryKey)!;
      expect(entry).toMatchObject({
        siteId: id,
        kind: 'secret',
        id: def.id,
        title: def.name,
        poiIds: [target.id],
        guide: { id: def.id, title: def.name, paragraphs: [def.text] },
      });
      expect(journalEntryTag(entry)).toBe('Game addition');
      expect(target.discoveryName).toBe(def.name);
      expect(target.name).toBe('Unidentified contact');

      const bytes = new Map<string, string>();
      const storage = {
        getItem: (key: string) => bytes.get(key) ?? null,
        setItem: vi.fn((key: string, value: string) => {
          bytes.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          bytes.delete(key);
        }),
      };
      const at = '2026-10-17T00:00:00.000Z';
      const store = new DiscoveryStore(storage, () => new Date(at));
      expect(sites.every((s) => !isSiteUnlocked(s, store))).toBe(true);
      expect(current.entries.every((e) => !isEntryUnlocked(current, e, store))).toBe(true);
      const before = siteProgress(current, store);
      const bus = new EventBus();
      const completed = vi.fn();
      bus.on('scan:complete', completed);
      const scanner = new Scanner(DEFAULT_CONFIG.scan, bus, store);
      // Isolate one admitted contact; keep placeSecrets' range, duration and identity.
      // Flat ground and a stationary sub ten metres ahead are not an approach route.
      scanner.setSupplementalTargets([target]);
      const position = target.position.clone().add(new THREE.Vector3(0, 0, 10));
      const forward = new THREE.Vector3(0, 0, -1);
      scanner.update(target.scanSeconds / 2, position, forward, true);
      expect(scanner.view.activeId).toBe(target.id);
      expect(store.keys()).toEqual([]);
      scanner.update(target.scanSeconds / 2, position, forward, true);
      expect(completed).toHaveBeenCalledExactlyOnceWith({
        landmarkId: id,
        poiId: target.id,
        firstTime: true,
      });
      expect(scanner.view.lastCompleteId).toBe(target.id);
      expect(store.keys()).toEqual([`${id}/secret:${def.id}`]);
      const archived = bytes.get(DISCOVERY_STORAGE_KEY)!;
      expect(JSON.parse(archived)).toEqual(store.snapshot());
      expect(storage.setItem).toHaveBeenCalledTimes(1);

      const reloaded = new DiscoveryStore(storage);
      const reloadedSites = await loadCompleteJournal();
      for (const [reader, content] of [
        [store, sites],
        [reloaded, reloadedSites],
      ] as const) {
        expect(reader.get(id, target.id)).toEqual({ at, count: 1 });
        expect(reader.keys()).toEqual([`${id}/secret:${def.id}`]);
        for (const s of content) {
          expect(isSiteUnlocked(s, reader), s.id).toBe(s.id === id);
          for (const e of s.entries) {
            // Site-level overview entries open with the site. POI groups, samples,
            // survey species and wildlife are read-only controls, not completion credit.
            const intended = s.id === id && (e.key === entryKey || e.kind === 'site');
            expect(isEntryUnlocked(s, e, reader), e.key).toBe(intended);
          }
        }
        const s = content.find((s) => s.id === id)!;
        expect(s.entries.find((e) => e.key === entryKey)).toEqual(entry);
        expect(secretProgress(id, doc.secrets, reader)).toEqual({
          found: 1,
          total: doc.secrets.length,
        });
        // Secret scans open overview articles without adding POI completion credit.
        expect(siteProgress(s, reader)).toEqual(before);
      }

      const journal = journalWithLoad();
      Object.assign(journal, { sites: reloadedSites, currentSiteId: id });
      journal.setStore(reloaded);
      // Explore's scan callback passes def.id, without the persisted secret: prefix.
      journal.focus(def.id);
      journal.open();
      await Promise.resolve();
      expect(journal.viewKey).toBe(entryKey);
      expect(journal.selectedId).toBe(def.id);
      expect(bytes.get(DISCOVERY_STORAGE_KEY)).toBe(archived);
      expect(storage.setItem).toHaveBeenCalledTimes(1);
      expect(storage.removeItem).not.toHaveBeenCalled();
    },
  );
});

const sub: SubInfo = {
  x: 0,
  y: -120,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  fx: 0,
  fy: 0,
  fz: -1,
  speed: 0,
  lightsOn: true,
  hullR: 7,
};
const env = { groundAt: () => -500 };
describe('explicit animal encounter previews', () => {
  it('recycles pool and species capacity instead of failing, without exceeding budgets', () => {
    const sim = new LifeSim({ tier: LIFE_TIERS.low, env, table: undefined });
    const hake = SPECIES_BY_ID.get('pacific-hake')!;
    sim.placeGroup(hake, null, 0, -120, -40, LIFE_TIERS.low.maxAgents, true);
    expect(sim.liveCount).toBe(LIFE_TIERS.low.maxAgents);
    const group = sim.spawnNear('comb-jelly', sub, 9, 1);
    expect(group).not.toBeNull();
    expect(group!.members).toHaveLength(1);
    expect(group!.members[0]).toMatchObject({ x: 0, y: -120, z: -9, fade: 1 });
    expect(sim.liveCount).toBeLessThanOrEqual(LIFE_TIERS.low.maxAgents);
    for (let i = 0; i < 40; i++) expect(sim.spawnNear('comb-jelly', sub, 9, 1)).not.toBeNull();
    expect(sim.countOf('comb-jelly')).toBeLessThanOrEqual(
      sim.capacityOf(SPECIES_BY_ID.get('comb-jelly')!),
    );
    sim.update(1 / 60, sub);
    expect(sim.countOf('comb-jelly')).toBeGreaterThan(0);
  });
  it('can scan and photograph a jelly after the actual low-tier Monterey population fills', () => {
    const table = parseLifeDoc(lifeDoc).sites['monterey-canyon'];
    const life = new Life({
      tier: 'low',
      env,
      table,
      scene: new THREE.Scene(),
      landmarkId: 'monterey-canyon',
      seed: 3,
    });
    const rig = new CameraRig(DEFAULT_CONFIG.camera, 1280 / 800, {
      sampleHeight: env.groundAt,
      getNormal: (_x: number, _z: number, out = new THREE.Vector3()) => out.set(0, 1, 0),
    });
    const p = new THREE.Vector3(sub.x, sub.y, sub.z);
    rig.update(p, 0, 0, 1 / 60);
    for (let i = 0; i < 60; i++) life.update(1 / 60, sub, rig.camera, 800, 0.002);
    expect(life.sim.spawnNear('comb-jelly', sub, 9, 1)).not.toBeNull();
    life.update(1 / 60, sub, rig.camera, 800, 0.002);
    expect(life.targets.some((t) => t.id === 'life:comb-jelly')).toBe(true);
    const scanner = new Scanner(DEFAULT_CONFIG.scan, new EventBus());
    scanner.setExtraTargets(life.targets);
    const forward = new THREE.Vector3(sub.fx, sub.fy, sub.fz);
    for (let i = 0; i < 180 && scanner.view.completed === 0; i++) {
      life.update(1 / 60, sub, rig.camera, 800, 0.002);
      scanner.update(1 / 60, p, forward, true);
    }
    expect(scanner.view.lastCompleteId).toBe('life:comb-jelly');
    rig.enterPhotoMode(p);
    rig.orbitRadius = 28;
    rig.update(p, 0, 0, 0);
    expect(life.sim.spawnNear('comb-jelly', sub, 14, 1)).not.toBeNull();
    life.update(0, sub, rig.camera, 800, 0.002);
    expect(life.animalInView(rig.camera)?.id).toBe('comb-jelly');
    expect(life.render.drawCalls.species + life.render.drawCalls.sparks).toBeLessThanOrEqual(5);
    const previews = life.sim.pool.filter((a) => a.alive && a.group.preview);
    for (const a of previews) a.x += 1000;
    expect(life.animalInView(rig.camera)?.id).toBe('nanomia');
    for (const a of life.sim.pool) if (a.alive) a.fade = 0;
    expect(life.animalInView(rig.camera)).toBeNull();
    life.dispose();
  });
});
