import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { EventBus } from '../../src/core/EventBus.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EXPLORE_CONFIG } from '../../src/core/config/explore.js';
import { EventScheduler, eventKinds } from '../../src/game/Events.js';
import { parseSecrets, secretInRange, secretProgress } from '../../src/game/Secrets.js';
import { Scanner, type ScanTarget } from '../../src/game/Scanner.js';
import { Samples, type SampleTarget } from '../../src/game/Samples.js';
import { buildSecret, seatOnSeabed, disposeExploreMesh } from '../../src/game/SecretsVisual.js';
import { EventsVisual } from '../../src/game/EventsVisual.js';
import { buildJournalSite, isEntryUnlocked, isSiteUnlocked } from '../../src/game/JournalData.js';

const habitat = { site: 'lost-city', depthM: 750, altitudeM: 15 };
const contact: ScanTarget = {
  id: 'secret:arch',
  name: 'Unidentified contact',
  landmarkId: 'lost-city',
  position: new Vector3(0, 0, -20),
  radius: 45,
  scanSeconds: 3,
};

describe('local curiosity range', () => {
  it('includes the exact boundary, excludes distant and vertically separated contacts', () => {
    expect(secretInRange(new Vector3(), new Vector3(110, 0, 0))).toBe(true);
    expect(secretInRange(new Vector3(), new Vector3(110.01, 0, 0))).toBe(false);
    expect(secretInRange(new Vector3(0, 150, 0), new Vector3())).toBe(false);
  });
  it('keeps secrets separate from POIs and animals, with no hint outside scan range', () => {
    const bus = new EventBus();
    const scanner = new Scanner(DEFAULT_CONFIG.scan, bus);
    scanner.setTargets([]);
    scanner.setSupplementalTargets([contact]);
    scanner.setExtraTargets([]); // Life may replace its own pool after loading.
    scanner.update(1, new Vector3(0, 0, 100), new Vector3(0, 0, -1), false);
    expect(scanner.view.nearestId).toBeNull();
    expect(scanner.getTargets()).toEqual([]);
    const events: string[] = [];
    bus.on('scan:complete', (e) => events.push(e.poiId));
    scanner.update(3, new Vector3(), new Vector3(0, 0, -1), true);
    expect(events).toEqual(['secret:arch']);
    scanner.update(5, new Vector3(), new Vector3(0, 0, -1), true);
    expect(events).toHaveLength(1);
    scanner.resetDive();
    scanner.update(3, new Vector3(), new Vector3(0, 0, -1), true);
    expect(events).toHaveLength(2);
  });
  it('aborts a supplemental scan when the target leaves range and resumes with decay', () => {
    const scanner = new Scanner(DEFAULT_CONFIG.scan, new EventBus());
    scanner.setSupplementalTargets([contact]);
    scanner.update(1, new Vector3(), new Vector3(0, 0, -1), true);
    scanner.update(0.1, new Vector3(100, 0, 0), new Vector3(0, 0, -1), true);
    expect(scanner.view.lastAbort).toBe('range');
    expect(scanner.view.progress).toBeLessThan(1 / 3);
    scanner.update(3, new Vector3(), new Vector3(0, 0, -1), true);
    expect(scanner.isScanned('lost-city', contact.id)).toBe(true);
  });
});

describe('short rare events', () => {
  it('waits before the first event, ends it, then enforces cooldown plus a new quiet gap', () => {
    const scheduler = new EventScheduler(() => 0);
    expect(scheduler.update(69, habitat)).toBeNull();
    expect(scheduler.update(1, habitat)?.kind).toBe('snow');
    expect(scheduler.update(EXPLORE_CONFIG.eventDurationS, habitat)).toBeNull();
    expect(scheduler.active).toBeNull();
    expect(scheduler.update(EXPLORE_CONFIG.eventCooldownS + 69, habitat)).toBeNull();
    expect(scheduler.update(1, habitat)?.kind).toBe('snow');
  });
  it('does not advance while paused and never overlaps events', () => {
    const scheduler = new EventScheduler(() => 0);
    scheduler.update(70, habitat);
    scheduler.update(0, habitat);
    scheduler.update(NaN, habitat);
    expect(scheduler.active?.elapsedS).toBe(0);
    expect(scheduler.preview('plume')).toBeNull();
    scheduler.reset();
    expect(scheduler.active).toBeNull();
    expect(scheduler.update(69, habitat)).toBeNull();
  });
  it('restricts plumes, bottom silt and whales to suitable habitat', () => {
    expect(eventKinds(habitat)).toEqual(['snow', 'plume']);
    expect(eventKinds({ ...habitat, altitudeM: 100 })).toEqual(['snow']);
    expect(eventKinds({ site: 'monterey-canyon', depthM: 50, altitudeM: 12 })).toEqual([
      'snow',
      'turbidity',
      'whale',
    ]);
    expect(eventKinds({ site: 'monterey-canyon', depthM: 1000, altitudeM: 100 })).toEqual(['snow']);
    expect(eventKinds({ ...habitat, site: 'great-blue-hole' })).toEqual(['snow']);
  });
});

describe('content, collection and Journal', () => {
  const def = {
    id: 'arch',
    name: 'Carbonate arch',
    kind: 'alcove',
    lat: 30,
    lon: -42,
    text: 'A quiet shelter.',
  };
  it('ignores malformed optional content and duplicate IDs', () => {
    expect(parseSecrets(null).secrets).toEqual([]);
    expect(parseSecrets({ version: 99, secrets: [def] }).secrets).toEqual([]);
    const doc = parseSecrets({
      version: 1,
      secrets: [def, def, { ...def, id: 'bad', lat: NaN }, { ...def, id: 'bad2', kind: 'fantasy' }],
      samples: [{ id: 'mud', name: 'Sediment', lat: 30, lon: -42 }],
    });
    expect(doc.secrets).toHaveLength(1);
    expect(doc.samples).toHaveLength(1);
  });
  it('unlocks a hidden Journal entry and site from a secret, and counts persistent finds', () => {
    const doc = parseSecrets({ version: 1, secrets: [def] });
    const site = buildJournalSite({
      id: 'lost-city',
      guide: null,
      pois: [],
      species: null,
      secrets: doc.secrets,
    });
    const store = { isDiscovered: (_site: string, id: string): boolean => id === 'secret:arch' };
    expect(isEntryUnlocked(site, site.entries[0], store)).toBe(true);
    expect(isSiteUnlocked(site, store)).toBe(true);
    expect(secretProgress(site.id, doc.secrets, store)).toEqual({ found: 1, total: 1 });
  });
  it('collects one sample per dive and allows it again after restarting', () => {
    const samples = new Samples();
    const target: SampleTarget = {
      ...contact,
      id: 'sample:mud',
      def: { id: 'mud', name: 'Sediment core', lat: 30, lon: -42 },
    };
    expect(samples.collect(target)).toBe(true);
    expect(samples.collect(target)).toBe(false);
    expect([...samples.collected.values()]).toEqual(['Sediment core']);
    samples.reset();
    expect(samples.collect(target)).toBe(true);
  });
});

describe('procedural visuals', () => {
  it('seats each base on the detailed seabed and merges props to one draw', () => {
    for (const kind of ['frame', 'alcove', 'seep', 'bone', 'wood', 'chain', 'rock'] as const) {
      const mesh = buildSecret(kind);
      const pos = mesh.geometry.getAttribute('position');
      const original = Array.from({ length: pos.count }, (_, i) => pos.getY(i));
      seatOnSeabed(mesh, 40, 80, (x, z) => -100 + x * 0.1 + z * 0.2);
      expect(mesh.position.y).toBeCloseTo(-80);
      for (let i = 0; i < pos.count; i++)
        expect(pos.getY(i)).toBeCloseTo(original[i] + pos.getX(i) * 0.1 + pos.getZ(i) * 0.2, 4);
      expect(mesh.geometry.getAttribute('color')).toBeDefined();
      disposeExploreMesh(mesh);
    }
  });
  it('keeps event visuals bounded and hides them when the event ends', () => {
    const visual = new EventsVisual('low');
    const event = { kind: 'plume' as const, elapsedS: 3, durationS: 9 };
    visual.begin(event, new Vector3(0, -90, 0), new Vector3(0, 0, -1), () => -100);
    expect(visual.origin.y).toBe(-94);
    visual.update(event);
    expect(visual.group.visible).toBe(true);
    expect(visual.group.children).toHaveLength(2);
    visual.update({ ...event, kind: 'whale' });
    expect(visual.group.children[1].rotation.y).toBe(-Math.PI / 2);
    visual.update(null);
    expect(visual.group.visible).toBe(false);
    visual.dispose();
  });
});
