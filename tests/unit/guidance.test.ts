import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GUIDANCE_ORDER,
  pickGuidance,
  type GuidanceKind,
  type GuidanceMessage,
  type GuidanceOffer,
} from '../../src/game/Guidance.js';
import { ScanOverlay } from '../../src/ui/ScanOverlay.js';
import { Scanner, resolveScanRadius } from '../../src/game/Scanner.js';
import { Discovery } from '../../src/game/Discovery.js';
import { EventBus } from '../../src/core/EventBus.js';
import { PerspectiveCamera, Vector3 } from 'three';
import { Mission, nextScanObjective, parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { missionApproachScanRadius } from '../../src/game/Spawn.js';
import { SystemRunner, type FrameState } from '../../src/app/System.js';
import type { GameContext } from '../../src/app/context.js';
import { discoverySystem } from '../../src/app/systems/discovery.js';
import { waypointsSystem } from '../../src/app/systems/waypoints.js';
import { Waypoints } from '../../src/ui/Waypoints.js';
import type { TileMeta } from '../../src/util/types.js';
import { GuidanceSlot } from '../../src/ui/GuidanceSlot.js';
import { HULL_GAUGE_SHOW_RATIO, hullGaugeVisible } from '../../src/ui/HullGauge.js';
import { TUTORIAL_STEPS, tutorialText } from '../../src/game/Tutorial.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import sites from '../../data/landmarks/index.json';

const msg = (text: string): GuidanceMessage => ({ kicker: 'K', text, tone: 'cyan' });
const offer = (kind: GuidanceKind, text: string, since = 0): GuidanceOffer => ({
  kind,
  message: msg(text),
  since,
});

describe('guidance priority', () => {
  it('shows nothing when nothing is offered', () => {
    expect(pickGuidance([])).toBeNull();
  });

  it('ranks urgent, scan, discovery, hint, objective in that order', () => {
    expect(GUIDANCE_ORDER).toEqual(['urgent', 'scan', 'discovery', 'hint', 'objective']);
    const all = GUIDANCE_ORDER.map((kind) => offer(kind, kind));
    // Whatever order the sources offer in, the highest-ranked kind wins.
    for (let drop = 0; drop < all.length; drop += 1) {
      const rest = all.slice(drop);
      expect(pickGuidance([...rest].reverse())?.kind).toBe(GUIDANCE_ORDER[drop]);
      expect(pickGuidance(rest)?.kind).toBe(GUIDANCE_ORDER[drop]);
    }
  });

  it('lets a warning outrank a scan in progress without removing the scan offer', () => {
    const offers = [offer('scan', 'Bow section'), offer('urgent', 'SEABED PROXIMITY')];
    expect(pickGuidance(offers)?.message.text).toBe('SEABED PROXIMITY');
    expect(pickGuidance(offers.slice(0, 1))?.message.text).toBe('Bow section');
  });

  it('ranks a steering-only scan card below a result but above hints', () => {
    const soft: GuidanceOffer = {
      kind: 'scan',
      message: { ...msg('TURN 141°'), soft: true },
      since: 0,
    };
    expect(pickGuidance([soft, offer('discovery', 'NEW ENTRY')])?.kind).toBe('discovery');
    expect(pickGuidance([soft, offer('hint', 'Hold SCAN')])?.message.text).toBe('TURN 141°');
    expect(pickGuidance([offer('scan', 'Ready'), offer('discovery', 'NEW ENTRY')])?.kind).toBe(
      'scan',
    );
  });

  it('lets a tutorial step or one-shot hint preempt the standing objective', () => {
    const offers = [offer('objective', 'Stern section'), offer('hint', 'Hold SCAN')];
    expect(pickGuidance(offers)?.kind).toBe('hint');
  });

  it('within a kind the most recently changed message wins', () => {
    const offers = [offer('discovery', 'NEW ENTRY', 5), offer('discovery', 'Silt cloud', 9)];
    expect(pickGuidance(offers)?.message.text).toBe('Silt cloud');
    expect(pickGuidance([...offers].reverse())?.message.text).toBe('Silt cloud');
  });
});

// The slot needs only a small DOM fixture; layout is covered in Playwright.
class FakeElement extends EventTarget {
  children: FakeElement[] = [];
  className = '';
  hidden = false;
  textContent = '';
  type = '';
  offsetWidth = 0;
  offsetHeight = 0;
  getBoundingClientRect() {
    return { width: this.offsetWidth, height: this.offsetHeight };
  }
  dataset: Record<string, string> = {};
  style = { setProperty() {} };
  classList = { toggle() {} };
  append(...nodes: FakeElement[]) {
    this.children.push(...nodes);
  }
  appendChild(node: FakeElement) {
    this.children.push(node);
    return node;
  }
  setAttribute() {}
  remove() {}
  blur() {}
}

describe('guidance slot', () => {
  beforeEach(() => {
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '8px' }));
    vi.stubGlobal('document', {
      body: new FakeElement(),
      documentElement: { classList: { contains: () => false } },
      createElement: () => new FakeElement(),
      createElementNS: () => new FakeElement(),
      querySelectorAll: () => [],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const texts = (slot: GuidanceSlot) => {
    const root = slot.root as unknown as FakeElement;
    const text = root.children[1];
    return {
      hidden: root.hidden,
      kicker: text.children[0].textContent,
      name: text.children[1].textContent,
      detail: text.children[2].textContent,
      kind: root.dataset.kind,
    };
  };

  const target = (id: string, name: string, x: number, y: number, z: number, radius = 20) => ({
    id,
    name,
    landmarkId: 'site',
    position: new Vector3(x, y, z),
    radius,
    scanSeconds: 1,
  });

  const contactGuidance = (touch: boolean) => {
    document.documentElement.classList.contains = () => touch;
    const bus = new EventBus();
    const scanner = new Scanner(DEFAULT_CONFIG.scan, bus);
    const overlay = new ScanOverlay(DEFAULT_CONFIG.scan, document.body);
    const targets = [
      target('memorial', 'Memorial', 0, 0, -5),
      target('stern', 'Stern', -300, 0, 0),
    ];
    scanner.setTargets(targets);
    scanner.setObjective('stern');
    const position = new Vector3();
    const forward = new Vector3(0, 0, -1);
    const keys = { scan: 'G', guide: 'J' };
    bus.on('scan:complete', ({ poiId, firstTime }) =>
      overlay.showComplete(targets.find((t) => t.id === poiId)!.name, firstTime, keys),
    );
    const step = (dt = 0, held = false) => {
      scanner.update(dt, position, forward, held);
      overlay.update(scanner.view, keys, null, dt);
      return texts(overlay.slot);
    };
    return { scanner, overlay, targets, position, forward, keys, step };
  };

  it.each([false, true])(
    'offers named arrival contacts in the existing slot without a scan prompt (touch=%s)',
    (touch) => {
      const { scanner, overlay, position, forward, step } = contactGuidance(touch);
      scanner.setTargets([]);
      const contact = {
        ...target('event:plume', 'Vent plume', 0, 0, -60, 110),
        arrivalRadiusM: 40,
      };
      scanner.setSupplementalTargets([contact]);
      expect(step(1, true)).toMatchObject({
        kicker: 'OPTIONAL CONTACT',
        name: 'Vent plume',
        detail: 'APPROACH TO 40 M',
      });
      expect(scanner.view.candidateId).toBeNull();
      expect(scanner.view.phase).toBe('idle');
      forward.set(1, 0, 0);
      expect(step().detail).toContain('TURN');
      forward.set(0, 0, -1);
      position.y = -60;
      expect(step().detail).toBe('RISE TOWARD TARGET');
      overlay.slot.offer('event', 'discovery', msg('Sighting'));
      expect(texts(overlay.slot).name).toBe('Sighting');
      overlay.slot.offer('warning', 'urgent', msg('SEABED PROXIMITY'));
      expect(texts(overlay.slot).name).toBe('SEABED PROXIMITY');
      overlay.slot.offer('warning', 'urgent', null);
      expect(texts(overlay.slot).name).toBe('Sighting');
      overlay.slot.offer('event', 'discovery', null);
      expect(texts(overlay.slot).name).toBe('Vent plume');
      position.set(0, 0, 51);
      expect(step().hidden).toBe(true);
      overlay.dispose();
    },
  );

  it.each([false, true])(
    'explains the distance before offering a scan in a free dive (touch=%s)',
    (touch) => {
      document.documentElement.classList.contains = () => touch;
      const scanner = new Scanner({ ...DEFAULT_CONFIG.scan, radiusFloorM: 100 }, new EventBus());
      const overlay = new ScanOverlay(DEFAULT_CONFIG.scan, document.body);
      scanner.setTargets([target('bow', 'Bow', 0, 0, -217, 30)]);
      const position = new Vector3();
      const forward = new Vector3(0, 0, -1);
      const keys = { scan: 'G', guide: 'J' };
      scanner.update(0, position, forward, true);
      overlay.update(scanner.view, keys, null, 0);
      expect(texts(overlay.slot)).toMatchObject({
        name: 'Bow',
        kind: 'objective',
        detail: 'Get closer to scan · 217 m',
      });
      expect(scanner.isScanning).toBe(false);
      position.z = -117;
      scanner.update(0, position, forward, false);
      overlay.update(scanner.view, keys, null, 0);
      expect(texts(overlay.slot)).toMatchObject({
        name: 'Bow',
        kind: 'scan',
        detail: touch ? 'HOLD SCAN TO SCAN' : 'HOLD G TO SCAN',
      });
      scanner.update(0.2, position, forward, true);
      position.z = 0;
      scanner.update(0, position, forward, true);
      overlay.update(scanner.view, keys, null, 0);
      expect(texts(overlay.slot)).toMatchObject({
        kicker: 'SCAN INTERRUPTED',
        detail: 'Get closer to scan · 217 m',
      });
      // An interrupted scan still names its held target beyond the remote hint range.
      position.z = 800;
      scanner.update(0, position, forward, true);
      overlay.update(scanner.view, keys, null, 0);
      expect(scanner.view.nearestId).toBeNull();
      expect(texts(overlay.slot)).toMatchObject({
        name: 'Bow',
        detail: 'Get closer to scan · 1017 m',
      });
      overlay.dispose();
    },
  );

  it('shows the winner, withdraws it and falls back to the next offer', () => {
    const slot = new GuidanceSlot();
    slot.offer('objective', 'objective', msg('Stern section'));
    expect(texts(slot)).toMatchObject({ hidden: false, name: 'Stern section', kind: 'objective' });
    slot.offer('warning', 'urgent', msg('SEABED PROXIMITY'));
    expect(texts(slot)).toMatchObject({ name: 'SEABED PROXIMITY', kind: 'urgent' });
    slot.offer('warning', 'urgent', null);
    expect(texts(slot)).toMatchObject({ name: 'Stern section' });
    slot.offer('objective', 'objective', null);
    expect(texts(slot).hidden).toBe(true);
    expect(slot.kind).toBeNull();
  });

  it('runs down a timed message and returns to the standing one', () => {
    const slot = new GuidanceSlot();
    slot.offer('objective', 'objective', msg('Stern section'));
    slot.flash('complete', 'discovery', msg('Bow section'), 4);
    slot.tick(3.9);
    expect(slot.kind).toBe('discovery');
    slot.tick(0.2);
    expect(slot.kind).toBe('objective');
  });

  it.each([false, true])(
    'hands off a logged contact to the next objective after the reward (touch=%s)',
    (touch) => {
      document.documentElement.classList.contains = () => touch;
      const scanner = new Scanner(DEFAULT_CONFIG.scan, new EventBus());
      const overlay = new ScanOverlay(DEFAULT_CONFIG.scan, document.body);
      scanner.setTargets([
        {
          id: 'first',
          name: 'First contact',
          landmarkId: 'site',
          position: new Vector3(0, 0, -5),
          radius: 20,
          scanSeconds: 1,
        },
        {
          id: 'next',
          name: 'Next contact',
          landmarkId: 'site',
          position: new Vector3(100, 0, 0),
          radius: 20,
          scanSeconds: 1,
        },
      ]);
      const position = new Vector3();
      const forward = new Vector3(0, 0, -1);
      const keys = { scan: 'G', guide: 'J' };
      scanner.setObjective('first');
      scanner.update(1.1, position, forward, true);
      expect(scanner.view.completed).toBe(1);
      overlay.showComplete('First contact', true, keys);
      scanner.setObjective('next');
      scanner.update(0, position, forward, false);
      expect(scanner.view.nearestScanned).toBe(true);
      overlay.update(scanner.view, keys, null, 0);
      expect(texts(overlay.slot)).toMatchObject({ name: 'First contact', kind: 'discovery' });
      overlay.update(scanner.view, keys, null, DEFAULT_CONFIG.scan.completeBannerSeconds + 0.1);
      // The next approach replaces the logged card on every device in the shared slot.
      const detail = (overlay.slot.root as unknown as FakeElement).children[1].children[2];
      expect(texts(overlay.slot)).toMatchObject({
        name: 'Next contact',
        kind: 'objective',
        detail: touch
          ? 'Get closer to scan · 100 m · TURN 90° STARBOARD'
          : 'Get closer to scan · 100 m',
      });

      // Free exploration retains its logged-contact confirmation without an objective.
      scanner.setObjective(null);
      scanner.update(0, position, forward, false);
      overlay.update(scanner.view, keys, null, 0);
      expect(texts(overlay.slot)).toMatchObject({ name: 'First contact', kind: 'objective' });
      expect(detail.textContent).toBe('Logged · Journal');
      overlay.dispose();
    },
  );

  it('keeps a message in place when only its detail changes, and reports names it shows', () => {
    const slot = new GuidanceSlot();
    slot.offer('objective', 'objective', { ...msg('Stern section'), detail: 'TURN 40° PORT' });
    slot.offer('hint', 'hint', msg('Hold SCAN'));
    slot.offer('objective', 'objective', { ...msg('Stern section'), detail: 'TURN 20° PORT' });
    expect(slot.kind).toBe('hint');
    slot.offer('hint', 'hint', null);
    expect(slot.showsName('stern section')).toBe(true);
    expect(slot.showsName('Bow section')).toBe(false);
  });

  it('gives a sighting three seconds ahead of a ready contact, without delaying a held scan', () => {
    const bus = new EventBus();
    const scanner = new Scanner(DEFAULT_CONFIG.scan, bus);
    const overlay = new ScanOverlay(DEFAULT_CONFIG.scan, document.body);
    scanner.setTargets([
      {
        id: 'bow',
        name: 'Bow',
        landmarkId: 'titanic',
        position: new Vector3(0, 0, -5),
        radius: 20,
        scanSeconds: 1,
      },
    ]);
    const position = new Vector3();
    const forward = new Vector3(0, 0, -1);
    const keys = { scan: 'G', guide: 'J' };
    scanner.update(0, position, forward, false);
    overlay.update(scanner.view, keys, null, 0);
    overlay.slot.offer('event', 'discovery', msg('Whale passing'));
    expect(texts(overlay.slot).name).toBe('Whale passing');
    overlay.update(scanner.view, keys, null, 2.9);
    // Repeated offers and detail changes must not extend the grace period.
    overlay.slot.offer('event', 'discovery', { ...msg('Whale passing'), detail: 'Logged' });
    expect(texts(overlay.slot).name).toBe('Whale passing');
    overlay.update(scanner.view, keys, null, 0.2);
    expect(texts(overlay.slot).name).toBe('Bow');
    overlay.slot.offer('event', 'discovery', msg('Silt cloud'));
    scanner.update(0.5, position, forward, true);
    overlay.update(scanner.view, keys, null, 0.5);
    expect(overlay.slot.kind).toBe('scan');
    overlay.slot.offer('warning', 'urgent', msg('BATTERY LOW'));
    scanner.update(0.6, position, forward, true);
    expect(scanner.view.completed).toBe(1);
    expect(texts(overlay.slot).name).toBe('BATTERY LOW');
    overlay.slot.offer('warning', 'urgent', null);
    expect(texts(overlay.slot).name).toBe('Bow');
    const css = readFileSync('src/styles/guidance.css', 'utf8');
    expect(css).toMatch(/\.guidance-slot\s*\{[^}]*pointer-events: none/s);
    expect(css).toMatch(/\.guidance-skip\s*\{[^}]*pointer-events: auto/s);
    overlay.dispose();
  });

  it.each([false, true])(
    'keeps idle guidance on the objective beside a ready optional contact (touch=%s)',
    (touch) => {
      document.documentElement.classList.contains = () => touch;
      const scanner = new Scanner(DEFAULT_CONFIG.scan, new EventBus());
      const overlay = new ScanOverlay(DEFAULT_CONFIG.scan, document.body);
      const t = (id: string, name: string, x: number, z: number) => ({
        id,
        name,
        landmarkId: 'titanic',
        position: new Vector3(x, 0, z),
        radius: 20,
        scanSeconds: 1,
      });
      scanner.setTargets([t('memorial', 'Memorial', 0, -5), t('stern', 'Stern', -300, 0)]);
      scanner.setObjective('stern');
      const keys = { scan: 'G', guide: 'J' };
      const position = new Vector3();
      const forward = new Vector3(0, 0, -1);
      scanner.update(0, position, forward, false);
      overlay.update(scanner.view, keys, null, 0);
      const card = texts(overlay.slot);
      expect(scanner.view.candidateId).toBe('memorial');
      expect(card.name).toBe('Stern');
      expect(card.kind).toBe('objective');
      expect(card.detail).toBe(
        touch ? 'Get closer to scan · 300 m · TURN 90° PORT' : 'Get closer to scan · 300 m',
      );
      // On touch a New Journal entry card keeps the direction to the objective; elsewhere it keeps its own line.
      overlay.showComplete('Memorial', true, keys);
      if (touch) expect(texts(overlay.slot).detail).toContain('Stern');
      else expect(texts(overlay.slot).detail).toBe('PRESS J · JOURNAL');
      // When the contact is the objective there is no tag.
      scanner.setObjective('memorial');
      scanner.update(0, position, forward, false);
      overlay.clear();
      overlay.update(scanner.view, keys, null, 0);
      expect(texts(overlay.slot).kicker).toBe('SCAN TARGET');
      overlay.dispose();
    },
  );

  it.each([false, true])(
    'refreshes contact choice without clearing the slot (touch=%s)',
    (touch) => {
      const f = contactGuidance(touch);
      expect(f.step()).toMatchObject({ name: 'Stern', kicker: 'OBJECTIVE' });
      f.scanner.setObjective('memorial');
      expect(f.step()).toMatchObject({
        name: 'Memorial',
        kicker: 'SCAN TARGET',
        detail: touch ? 'HOLD SCAN TO SCAN' : 'HOLD G TO SCAN',
      });
      f.scanner.setObjective(null);
      expect(f.step().kicker).toBe('SCAN TARGET');
      f.scanner.setObjective('stern');
      f.keys.scan = 'X';
      expect(f.step().detail).toBe(
        touch ? 'Get closer to scan · 300 m · TURN 90° PORT' : 'Get closer to scan · 300 m',
      );
      // The objective wins when it becomes eligible, even beside a nearer contact.
      f.targets[1].position.set(0, 0, -15);
      expect(f.step()).toMatchObject({
        name: 'Stern',
        kicker: 'SCAN TARGET',
        detail: touch ? 'HOLD SCAN TO SCAN' : 'HOLD X TO SCAN',
      });
      f.targets[1].position.set(-300, 0, 0);
      f.position.set(0, 0, 1000);
      expect(f.step()).toMatchObject({
        name: 'Stern',
        kind: 'objective',
        detail: touch
          ? 'Get closer to scan · 1044 m · TURN 17° PORT'
          : 'Get closer to scan · 1044 m',
      });
      f.position.set(0, 0, 0);
      expect(f.step()).toMatchObject({ name: 'Stern', kicker: 'OBJECTIVE' });
      // Removing both sources must withdraw guidance without a manual overlay clear.
      f.scanner.setTargets([]);
      expect(f.step().hidden).toBe(true);
      expect(f.overlay.slot.kind).toBeNull();
      expect(
        (document.body as unknown as FakeElement).children.filter(
          (el) => el.className === 'guidance-slot',
        ),
      ).toHaveLength(1);
      f.overlay.dispose();
    },
  );

  it.each([false, true])(
    'keeps active and interrupted scans ahead of results and objectives (touch=%s)',
    (touch) => {
      const f = contactGuidance(touch);
      f.step();
      f.overlay.showComplete('Whale', true, f.keys);
      expect(f.step().name).toBe('Whale');
      expect(f.step(0.2, true)).toMatchObject({
        name: 'Memorial',
        kicker: 'SCANNING',
        detail: touch ? 'HOLD SCAN · KEEP ON TARGET' : 'HOLD G · KEEP ON TARGET',
      });
      expect(f.step(0.1)).toMatchObject({
        name: 'Memorial',
        kicker: 'SCAN INTERRUPTED',
        detail: touch ? 'HOLD SCAN TO RESUME' : 'HOLD G TO RESUME',
      });
      f.overlay.slot.offer('warning', 'urgent', msg('BATTERY LOW'));
      expect(texts(f.overlay.slot).name).toBe('BATTERY LOW');
      f.overlay.slot.offer('warning', 'urgent', null);
      expect(texts(f.overlay.slot).kicker).toBe('SCAN INTERRUPTED');
      // Keep the three-second grace guard by making the primary ready to scan.
      f.targets[1].position.set(0, 0, -15);
      expect(f.step(0.6).name).toBe('Whale');
      expect(f.step(2.2)).toMatchObject({ name: 'Stern', kicker: 'SCAN TARGET' });
      f.targets[1].position.set(-300, 0, 0);
      f.position.set(0, 0, 1000);
      f.step(DEFAULT_CONFIG.scan.completeBannerSeconds + 0.1);
      expect(texts(f.overlay.slot)).toMatchObject({
        name: 'Stern',
        kind: 'objective',
        detail: touch
          ? 'Get closer to scan · 1044 m · TURN 17° PORT'
          : 'Get closer to scan · 1044 m',
      });
      f.position.set(0, 0, 0);
      expect(f.step()).toMatchObject({ name: 'Stern', kicker: 'OBJECTIVE' });
      f.step(0.2, true);
      f.scanner.setTargets([]);
      expect(f.step().hidden).toBe(true);
      f.overlay.dispose();
    },
  );

  it.each([true, false])(
    'updates a result cue as its objective moves, changes or disappears (firstTime=%s)',
    (firstTime) => {
      const f = contactGuidance(true);
      f.step();
      f.overlay.showComplete('Whale', firstTime, f.keys);
      expect(texts(f.overlay.slot)).toMatchObject({
        name: 'Whale',
        detail: 'Stern · TURN 90° PORT',
      });
      f.forward.set(-1, 0, 0);
      expect(f.step(0.2).detail).toBe('Stern · 300 m AHEAD');
      f.scanner.setObjective('memorial');
      expect(f.step(0.2).detail).toBe(firstTime ? 'OPEN JOURNAL' : 'LOGGED · JOURNAL');
      f.scanner.setObjective('stern');
      expect(f.step(0.2).detail).toContain('Stern');
      f.scanner.setTargets([f.targets[0]]);
      expect(f.step(0.2).detail).toBe(firstTime ? 'OPEN JOURNAL' : 'LOGGED · JOURNAL');
      // Updating a result must not renew its priority or lifetime.
      f.scanner.setTargets([]);
      expect(f.step(DEFAULT_CONFIG.scan.completeBannerSeconds - 0.9)).toMatchObject({
        name: 'Whale',
        hidden: false,
      });
      expect(f.step(0.2).hidden).toBe(true);
      f.overlay.dispose();
    },
  );

  it.each([true, false])(
    'updates a visible result when the input mode or bindings change (firstTime=%s)',
    (firstTime) => {
      const f = contactGuidance(false);
      f.step();
      f.overlay.showComplete('Whale', firstTime, f.keys);
      expect(texts(f.overlay.slot).detail).toBe(
        firstTime ? 'PRESS J · JOURNAL' : 'LOGGED · JOURNAL',
      );
      document.documentElement.classList.contains = () => true;
      expect(f.step(0.2).detail).toBe('Stern · TURN 90° PORT');
      document.documentElement.classList.contains = () => false;
      f.keys.guide = 'K';
      expect(f.step(0.2).detail).toBe(firstTime ? 'PRESS K · JOURNAL' : 'LOGGED · JOURNAL');
      f.overlay.dispose();
    },
  );

  it('carries the next objective on a result created during scanner completion', () => {
    const f = contactGuidance(true);
    f.scanner.setObjective('memorial');
    f.step(0.2, true);
    expect(f.step(0.9, true)).toMatchObject({ name: 'Memorial', kicker: 'New Journal entry' });
    // The completion frame still contains the old objective geometry. Its
    // direction must not send the pilot back to the contact just scanned.
    expect(texts(f.overlay.slot).detail).toBe('OPEN JOURNAL');
    f.scanner.setObjective('stern');
    expect(f.step().detail).toBe('Stern · TURN 90° PORT');
    f.scanner.setObjective(null);
    expect(f.step().detail).toBe('OPEN JOURNAL');
    f.overlay.dispose();
  });

  const missionCases = sites.landmarks.flatMap((site) =>
    (['arcade', 'realistic'] as const).flatMap((mode) =>
      [false, true].flatMap((touch) =>
        [false, true].map((firstTime) => ({ site, mode, touch, firstTime })),
      ),
    ),
  );

  it.each(missionCases)(
    '$site $mode touch=$touch firstTime=$firstTime: rewards agree with the next waypoint through two objectives',
    ({ site, mode, touch, firstTime }) => {
      document.documentElement.classList.contains = () => touch;
      vi.stubGlobal('window', { innerWidth: 800, innerHeight: 600 });
      const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
      const def = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
      expect(def).not.toBeNull();
      const meta = json(`data/tiles/${def.tile}/meta.json`) as TileMeta;
      const effective = resolveEffective(defaultSettings(DEFAULT_CONFIG), mode, null);
      // Isolate guidance from terrain rendering: authored coordinates and scan
      // requirements remain real; seabed-snapped POIs use a controlled floor.
      const pois = placePois(
        parsePois(json(`data/landmarks/${def.landmark}/pois.json`)),
        meta,
        { sampleHeight: () => meta.min_m },
        effective.scan,
        def.landmark,
      );
      for (const poi of pois) {
        const primary = def.objectives.some((o) => o.poi === poi.id && o.primary);
        const radius = primary ? missionApproachScanRadius(site, poi.radius) : poi.radius;
        poi.radius = resolveScanRadius(
          radius * effective.sensor.scanRadiusMultiplier,
          effective.scan,
        );
      }
      const bus = new EventBus();
      const scanner = new Scanner(effective.scan, bus, {
        record: () => ({ firstTime }),
      });
      scanner.setTargets(pois);
      const overlay = new ScanOverlay(effective.scan, document.body);
      const keys = { scan: 'G', guide: 'J' };
      // Discovery subscribes before Mission in production, and renders the result
      // synchronously before Mission advances the objective on this same event.
      const off = bus.on('scan:complete', ({ poiId, firstTime: fresh }) =>
        overlay.showComplete(pois.find((p) => p.id === poiId)!.name, fresh, keys),
      );
      const mission = new Mission({ def, bus });
      mission.resolve(pois.map((p) => p.id));
      expect(mission.objectives.every((o) => o.resolved)).toBe(true);
      mission.start(def.tile);
      const waypoints = new Waypoints(scanner);
      waypoints.setPois(pois);
      waypoints.setVisualHints(effective.gameplay.visualHints);
      const camera = new PerspectiveCamera(60, 4 / 3, 0.1, 100000);
      const position = new Vector3();
      const forward = new Vector3(0, 0, -1);
      const discovery: Discovery = Object.assign(Object.create(Discovery.prototype) as Discovery, {
        opts: { keyLabel: (action: string) => (action === 'scan' ? keys.scan : keys.guide) },
        scanner,
        overlay,
        pois,
        projected: new Vector3(),
        guide: { isOpen: false, setFooter() {} },
        debrief: { isOpen: false },
        stats: { update() {} },
      });
      const ctx = {
        app: { state: 'dive' },
        sub: { position },
        discovery,
        missionRouter: { mission, panel: { showsTarget: () => false } },
        waypoints,
        guidance: overlay.slot,
        effective,
        rig: { camera },
      } as unknown as GameContext;
      const runner = new SystemRunner(ctx);
      runner.init(
        [discoverySystem, waypointsSystem].map(({ name, frame, start, dispose }) => ({
          name,
          frame,
          start,
          dispose,
        })),
      );
      const frame = {
        state: { scan: false, toggleGuide: false },
        sampled: {},
        pilotPosition: position,
        pilotForward: forward,
      } as FrameState;
      const step = (dt = 0, held = false) => {
        frame.dt = frame.fixedDt = frame.clockDt = dt;
        frame.steps = 1;
        frame.state = { ...frame.state, scan: held };
        camera.position.copy(position);
        camera.lookAt(position.clone().add(forward));
        camera.updateMatrixWorld();
        runner.frame(frame);
        return texts(overlay.slot);
      };
      const edge = (waypoints.root as unknown as FakeElement).children[0];
      const checkWaypoint = () => {
        const objective = nextScanObjective(mission.objectives);
        expect(frame.nextScanObjective?.poiId).toBe(objective?.poiId);
        const next = pois.find((p) => p.id === objective?.poiId);
        expect(edge.hidden).toBe(!next || !effective.gameplay.visualHints);
        if (next && effective.gameplay.visualHints) {
          expect(edge.children[0].textContent).toBe(next.name);
          const dy = next.position.y - position.y;
          expect(edge.children[1].textContent).toBe(
            `${Math.round(position.distanceTo(next.position))} m · ${dy >= 0 ? '↑' : '↓'}${Math.round(Math.abs(dy))} m${position.distanceTo(next.position) <= next.radius ? ' · IN RANGE' : ''}`,
          );
        }
        return next;
      };
      try {
        const order = [
          ...def.objectives.filter((o) => o.primary),
          ...def.objectives.filter((o) => !o.primary),
        ];
        expect(order.length).toBeGreaterThanOrEqual(2);
        for (const objective of order.slice(0, 2)) {
          expect(nextScanObjective(mission.objectives)?.poiId).toBe(objective.poi);
          const current = pois.find((p) => p.id === objective.poi)!;
          position.copy(current.position).add(new Vector3(0, 0, 5));
          forward.copy(current.position).sub(position).normalize();
          step();
          expect(scanner.view.candidateId).toBe(current.id);
          checkWaypoint();
          for (let elapsed = 0; !scanner.isScanned(def.landmark, current.id); elapsed += 0.25) {
            expect(elapsed).toBeLessThan(current.scanSeconds + 1);
            step(0.25, true);
          }
          const reward = texts(overlay.slot);
          expect(reward).toMatchObject({
            name: current.name,
            kicker: firstTime ? 'New Journal entry' : 'SCAN COMPLETE',
            kind: 'discovery',
          });
          const next = checkWaypoint();
          expect(next?.id).not.toBe(current.id);
          // Completion geometry and reward directions advance in the same frame.
          expect(scanner.view.objectiveId).toBe(next?.id ?? null);
          if (!touch || !next) {
            expect(reward.detail).toBe(
              firstTime ? (touch ? 'OPEN JOURNAL' : 'PRESS J · JOURNAL') : 'LOGGED · JOURNAL',
            );
          }
          if (next) {
            const detail = texts(overlay.slot).detail;
            if (touch) {
              expect(detail.startsWith(`${next.name} · `)).toBe(true);
              const turn = detail.match(/TURN (\d+)° (PORT|STARBOARD)/);
              if (turn) {
                const delta = next.position.clone().sub(position);
                const heading = Math.atan2(forward.x, -forward.z);
                const bearing = Math.atan2(delta.x, -delta.z);
                const degrees = ((((bearing - heading) * 180) / Math.PI + 540) % 360) - 180;
                expect(Number(turn[1])).toBe(Math.round(Math.abs(degrees)));
                expect(turn[2]).toBe(degrees >= 0 ? 'STARBOARD' : 'PORT');
              }
              if (detail.includes('RISE'))
                expect(next.position.y).toBeGreaterThanOrEqual(position.y);
              if (detail.includes('SINK')) expect(next.position.y).toBeLessThan(position.y);
              if (detail.includes('DIVE DEEPER')) expect(-position.y).toBeLessThan(next.minDepthM!);
              if (detail.includes(' m AHEAD'))
                expect(detail).toContain(
                  `${position.distanceTo(next.position).toFixed(0)} m AHEAD`,
                );
            }
            // Turn both ways and move above/below the next target while the same
            // reward remains visible. Directions must use its current waypoint.
            for (const turn of [-90, 90, 0]) {
              position.copy(next.position).add(new Vector3(0, turn === 90 ? 40 : -40, 60));
              if (turn === 0) position.copy(next.position).add(new Vector3(0, 0, 5));
              forward.set(Math.sin((turn * Math.PI) / 180), 0, -Math.cos((turn * Math.PI) / 180));
              const card = step(0.1);
              checkWaypoint();
              expect(card.name).toBe(current.name);
              expect(card.kind).toBe('discovery');
              if (!touch)
                expect(card.detail).toBe(firstTime ? 'PRESS J · JOURNAL' : 'LOGGED · JOURNAL');
              else if (turn !== 0) {
                expect(card.detail).toBe(
                  `${next.name} · TURN 90° ${turn < 0 ? 'STARBOARD' : 'PORT'}`,
                );
              } else expect(card.detail).toBe(firstTime ? 'OPEN JOURNAL' : 'LOGGED · JOURNAL');
            }
          }
          // Expiry reveals the ready next objective through the same single slot.
          step(effective.scan.completeBannerSeconds + 0.1);
          checkWaypoint();
          if (next) expect(texts(overlay.slot).name).toBe(next.name);
          expect(
            (document.body as unknown as FakeElement).children.filter(
              (el) => el.className === 'guidance-slot',
            ),
          ).toHaveLength(1);
        }
        expect(mission.counts().completed).toBe(2);
      } finally {
        runner.dispose();
        mission.dispose();
        off();
        overlay.dispose();
        waypoints.dispose();
      }
    },
  );

  it('keeps the range and turn to a remote objective visible on touch', () => {
    const f = contactGuidance(true);
    f.scanner.setTargets([f.targets[1]]);
    expect(f.step()).toMatchObject({
      name: 'Stern',
      kind: 'objective',
      detail: 'Get closer to scan · 300 m · TURN 90° PORT',
    });
    f.overlay.dispose();
  });

  it('keeps the result cue while an objective in range still needs aiming', () => {
    const f = contactGuidance(true);
    f.targets[1].position.set(50, 0, 0);
    f.targets[1].radius = 60;
    f.scanner.setTargets([f.targets[1]]);
    f.step();
    expect(f.scanner.view.candidateId).toBeNull();
    f.overlay.showComplete('Whale', true, f.keys);
    expect(texts(f.overlay.slot)).toMatchObject({
      name: 'Whale',
      detail: 'Stern · TURN 90° STARBOARD',
    });
    f.forward.set(1, 0, 0);
    expect(f.step().detail).toBe('OPEN JOURNAL');
    expect(f.scanner.view.candidateId).toBe('stern');
    f.overlay.dispose();
  });

  it.each([40, -40])(
    'steers vertically toward an in-range objective beside an optional contact (height=%s)',
    (height) => {
      const f = contactGuidance(true);
      f.targets[1].position.set(0, height, -30);
      f.targets[1].radius = 60;
      expect(f.step()).toMatchObject({
        name: 'Stern',
        kicker: 'OBJECTIVE',
        detail: `${height > 0 ? 'RISE' : 'SINK'} TOWARD TARGET`,
      });
      expect(f.scanner.view.objectiveInRange).toBe(true);
      f.overlay.showComplete('Whale', true, f.keys);
      expect(texts(f.overlay.slot).detail).toBe(
        `Stern · ${height > 0 ? 'RISE' : 'SINK'} TOWARD TARGET`,
      );
      f.overlay.dispose();
    },
  );

  it.each(['Journal', 'pause', 'debrief', 'mission switch'])(
    'clears every source when covered by %s, rejects covered offers and accepts fresh guidance',
    () => {
      const slot = new GuidanceSlot();
      for (const [source, kind] of [
        ['scan', 'scan'],
        ['objective', 'objective'],
        ['complete', 'discovery'],
        ['event', 'discovery'],
        ['tutorial', 'hint'],
        ['hint', 'hint'],
        ['warning', 'urgent'],
        ['notice', 'hint'],
      ] as const)
        slot.offer(source, kind, msg(source));
      slot.setSuppressed(true);
      expect(slot.visible).toBe(false);
      slot.offer('warning', 'urgent', msg('covered warning'));
      slot.notice('covered notice');
      slot.setSuppressed(false);
      expect(slot.kind).toBeNull();
      slot.offer('objective', 'objective', msg('New objective'));
      expect(texts(slot).name).toBe('New objective');
    },
  );

  it('clears completion and every other offer through real Journal, blocked-play and restart paths', () => {
    const scanner = new Scanner(DEFAULT_CONFIG.scan, new EventBus());
    const overlay = new ScanOverlay(DEFAULT_CONFIG.scan, document.body);
    const guide = { isOpen: false, setFooter() {} };
    const debrief = { isOpen: false };
    const discovery: Discovery = Object.assign(Object.create(Discovery.prototype) as Discovery, {
      opts: {},
      scanner,
      overlay,
      guide,
      debrief,
      stats: { update() {}, reset() {} },
    });
    for (const covered of ['Journal', 'pause', 'debrief', 'restart']) {
      overlay.showComplete('Old result', true, { scan: 'G', guide: 'J' });
      overlay.slot.notice('Old notice');
      if (covered === 'restart') discovery.resetDive();
      else {
        guide.isOpen = covered === 'Journal';
        debrief.isOpen = covered === 'debrief';
        discovery.update(
          0,
          0,
          new Vector3(),
          new Vector3(0, 0, -1),
          { scan: false, toggleGuide: false },
          undefined,
          0,
          covered === 'pause',
        );
      }
      expect(overlay.slot.visible).toBe(false);
      guide.isOpen = false;
      debrief.isOpen = false;
      discovery.update(0, 0, new Vector3(), new Vector3(0, 0, -1), {
        scan: false,
        toggleGuide: false,
      });
      expect(overlay.slot.visible).toBe(false);
    }
    overlay.dispose();
  });

  it.each([false, true])(
    'discards refreshed results and their cached cues on clear or suppression (touch=%s)',
    (touch) => {
      for (const reset of ['clear', 'suppress']) {
        for (const firstTime of [false, true]) {
          const f = contactGuidance(touch);
          f.step();
          f.overlay.showComplete('Old result', firstTime, f.keys);
          f.forward.set(-1, 0, 0);
          expect(f.step(0.2).name).toBe('Old result');
          if (reset === 'clear') f.overlay.clear();
          else {
            f.overlay.setSuppressed(true);
            f.overlay.showComplete('Covered result', true, f.keys);
            f.step(0.2);
            f.overlay.setSuppressed(false);
          }
          expect(f.overlay.slot.kind).toBeNull();
          // A new result can arrive before the next frame; it must not inherit the old direction.
          f.overlay.showComplete('Fresh result', firstTime, f.keys);
          expect(texts(f.overlay.slot)).toMatchObject({
            name: 'Fresh result',
            detail: firstTime ? (touch ? 'OPEN JOURNAL' : 'PRESS J · JOURNAL') : 'LOGGED · JOURNAL',
          });
          f.scanner.setTargets([]);
          expect(f.step(DEFAULT_CONFIG.scan.completeBannerSeconds + 0.1).hidden).toBe(true);
          expect(f.step().hidden).toBe(true);
          f.overlay.dispose();
        }
      }
    },
  );

  it.each([false, true])(
    'expires a refreshed result while an interrupted scan owns the slot (touch=%s)',
    (touch) => {
      const f = contactGuidance(touch);
      f.step();
      f.overlay.showComplete('Whale', true, f.keys);
      f.step(0.2, true);
      expect(f.step(0).kicker).toBe('SCAN INTERRUPTED');
      // Hold the interrupted view while real time elapses behind it.
      f.overlay.update(
        f.scanner.view,
        f.keys,
        null,
        DEFAULT_CONFIG.scan.completeBannerSeconds + 0.1,
      );
      expect(texts(f.overlay.slot).kicker).toBe('SCAN INTERRUPTED');
      f.scanner.cancel();
      expect(f.step()).toMatchObject({ name: 'Stern', kicker: 'OBJECTIVE' });
      f.scanner.setTargets([]);
      expect(f.step().hidden).toBe(true);
      f.overlay.dispose();
    },
  );

  it('offers a Skip button only for tutorial steps and reports the press', () => {
    const slot = new GuidanceSlot();
    const skip = (slot.root as unknown as FakeElement).children[2];
    const pressed = vi.fn();
    slot.setSkipHandler(pressed);
    slot.offer('tutorial', 'hint', { ...msg('Hold SCAN'), step: 'scan' });
    expect(skip.hidden).toBe(false);
    skip.dispatchEvent(new Event('click'));
    expect(pressed).toHaveBeenCalledTimes(1);
    slot.offer('tutorial', 'hint', null);
    slot.offer('hint', 'hint', msg('Animal nearby'));
    expect(skip.hidden).toBe(true);
  });
});

describe('hull gauge threshold', () => {
  it('stays hidden at routine mission depths and shows near the rating', () => {
    expect(hullGaugeVisible(0.5, false)).toBe(false);
    expect(hullGaugeVisible(HULL_GAUGE_SHOW_RATIO, false)).toBe(true);
    // Hysteresis: it stays up until the hull eases clearly below the show mark.
    expect(hullGaugeVisible(0.77, true)).toBe(true);
    expect(hullGaugeVisible(0.77, false)).toBe(false);
    expect(hullGaugeVisible(0.7, true)).toBe(false);
  });

  it('is quiet at every authored mission depth except Challenger Deep', () => {
    const classes = DEFAULT_CONFIG.submarine.hullClasses;
    const quiet: Record<string, number> = {};
    for (const id of sites.landmarks) {
      let mission: { briefing?: { depth_m?: number }; hull_class?: string };
      try {
        mission = JSON.parse(readFileSync(`data/landmarks/${id}/mission.json`, 'utf8'));
      } catch {
        continue;
      }
      const depth = mission.briefing?.depth_m;
      const rated = classes[mission.hull_class ?? '']?.ratedDepth;
      if (depth === undefined || rated === undefined) continue;
      quiet[id] = depth / -rated;
    }
    expect(Object.keys(quiet).length).toBeGreaterThan(8);
    for (const [site, ratio] of Object.entries(quiet)) {
      if (site === 'challenger-deep') expect(ratio).toBeGreaterThanOrEqual(HULL_GAUGE_SHOW_RATIO);
      else expect(ratio, site).toBeLessThan(HULL_GAUGE_SHOW_RATIO);
    }
    // 50% would have shown the gauge for the whole Titanic dive.
    expect(quiet.titanic).toBeGreaterThan(0.5);
  });
});

describe('tutorial copy', () => {
  const keys = { move: 'W', turn: 'A or D', rise: 'R', sink: 'F', scan: 'G' };
  it('is one short line on touch and names the destination elsewhere', () => {
    for (const step of TUTORIAL_STEPS)
      expect(tutorialText(step.id, 'touch', keys).length).toBeLessThanOrEqual(42);
    expect(tutorialText('move', 'touch', keys, null, 'Bow section')).toBe(
      'Left stick: follow the marker.',
    );
    expect(tutorialText('move', 'keyboard', keys, null, 'Bow section')).toContain('Bow section');
  });
});
