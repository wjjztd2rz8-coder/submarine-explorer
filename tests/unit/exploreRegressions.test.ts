import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { EventBus } from '../../src/core/EventBus.js';
import { Scanner } from '../../src/game/Scanner.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Journal } from '../../src/ui/Journal.js';
import { buildJournalSite } from '../../src/game/JournalData.js';
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
    trap: { activate: vi.fn() },
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
