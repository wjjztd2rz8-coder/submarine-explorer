import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GUIDANCE_ORDER,
  pickGuidance,
  type GuidanceKind,
  type GuidanceMessage,
  type GuidanceOffer,
} from '../../src/game/Guidance.js';
import { ScanOverlay } from '../../src/ui/ScanOverlay.js';
import { Scanner } from '../../src/game/Scanner.js';
import { Discovery } from '../../src/game/Discovery.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Vector3 } from 'three';
import { GuidanceSlot } from '../../src/ui/GuidanceSlot.js';
import { HULL_GAUGE_SHOW_RATIO, hullGaugeVisible } from '../../src/ui/HullGauge.js';
import { MOVE_IDLE_S, TUTORIAL_STEPS, Tutorial, tutorialText } from '../../src/game/Tutorial.js';
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
      overlay.showComplete(
        targets.find((t) => t.id === poiId)!.name,
        firstTime,
        keys,
        scanner.view.lastCompleteSideFind,
      ),
    );
    const step = (dt = 0, held = false) => {
      scanner.update(dt, position, forward, held);
      overlay.update(scanner.view, keys, null, dt);
      return texts(overlay.slot);
    };
    return { scanner, overlay, targets, position, forward, keys, step };
  };

  it.each([false, true])(
    'names the chosen candidate and only offers a desktop switch hint for multiple choices (touch=%s)',
    (touch) => {
      const { scanner, overlay, step } = contactGuidance(touch);
      scanner.setObjective(null);
      scanner.setTargets([
        target('a', 'First', 0, 0, -30, 100),
        target('b', 'Second', 5, 0, -40, 100),
      ]);
      expect(step()).toMatchObject({
        name: 'First',
        detail: touch ? 'Hold SCAN' : 'Hold G · N next',
      });
      scanner.selectCandidate('b');
      expect(step()).toMatchObject({
        name: 'Second',
        detail: touch ? 'Hold SCAN' : 'Hold G · N next',
      });
      scanner.setTargets([target('a', 'First', 0, 0, -30, 100)]);
      expect(step()).toMatchObject({ name: 'First', detail: touch ? 'Hold SCAN' : 'Hold G' });
      overlay.dispose();
    },
  );

  it.each([false, true])(
    'keeps side-find guidance on the objective through approach and scan readiness (touch=%s)',
    (touch) => {
      const { scanner, targets, overlay, keys, step } = contactGuidance(touch);
      step(0.1, true);
      expect(step(1, true)).toMatchObject({
        kicker: 'Side find - not the objective',
        name: 'Memorial',
        detail: 'Objective still open · Stern',
      });
      expect(scanner.view.lastCompleteId).toBe('memorial');
      // A repeat side find uses the same guidance, even as the objective becomes ready.
      overlay.showComplete('Memorial', false, keys, true);
      targets[1].position.set(0, 0, -15);
      expect(step()).toMatchObject({
        kicker: 'Side find - not the objective',
        name: 'Memorial',
        detail: `Stern · ${touch ? 'Hold SCAN' : 'Hold G'}`,
      });
      expect(scanner.view.candidateId).toBe('stern');
      expect(step(0.1, true)).toMatchObject({ kicker: 'SCANNING', name: 'Stern' });
      overlay.dispose();
    },
  );

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
      expect(step(1.2).detail).toContain('Turn');
      forward.set(0, 0, -1);
      position.y = -60;
      expect(step(1.2).detail).toBe('RISE TOWARD TARGET');
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
        detail: touch ? 'Hold SCAN' : 'Hold G',
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

  it.each([false, true])('holds steering words with live distance (touch=%s)', (touch) => {
    const f = contactGuidance(touch);
    const view = {
      ...f.scanner.view,
      objectiveId: 'stern',
      objectiveName: 'Stern',
      objectiveDistance: 300,
      objectiveRadius: 20,
      objectiveInRange: false,
      objectiveVertDeg: 0,
      objectiveTurnDeg: 16,
      candidateId: null,
    };
    const draw = (turn: number, dt: number, distance = view.objectiveDistance) => {
      Object.assign(view, { objectiveTurnDeg: turn, objectiveDistance: distance });
      f.overlay.update(view, f.keys, null, dt);
      return texts(f.overlay.slot).detail;
    };
    expect(draw(16, 0)).toBe('Turn right · 300 m');
    for (const turn of [9, 11, 8, 12, 9, 11]) expect(draw(turn, 0.3)).toBe('Turn right · 300 m');
    expect(draw(5, 0.1)).toBe('Get closer to scan · 300 m');
    expect(draw(11, 0.1)).toBe('Get closer to scan · 300 m');
    expect(draw(125, 1.2)).toBe('Turn around · 300 m');
    expect(draw(80, 0.5, 290)).toBe('Turn around · 290 m');
    expect(draw(-40, 0.69, 280)).toBe('Turn around · 280 m');
    expect(draw(-40, 0.02, 279)).toBe('Turn left · 279 m');
    expect(draw(4, 0.5, 270)).toBe('Turn left · 270 m');
    expect(draw(4, 0.71, 260)).toBe('Get closer to scan · 260 m');
    f.overlay.dispose();
  });

  it('uses a separate around band and resets steering on a new objective', () => {
    const f = contactGuidance(false);
    const view = {
      ...f.scanner.view,
      objectiveId: 'stern',
      objectiveName: 'Stern',
      objectiveDistance: 300,
      objectiveRadius: 20,
      objectiveInRange: false,
      objectiveVertDeg: 0,
      objectiveTurnDeg: 121,
      candidateId: null,
    };
    const draw = (turn: number, dt = 1.3) => {
      view.objectiveTurnDeg = turn;
      f.overlay.update(view, f.keys, null, dt);
      return texts(f.overlay.slot).detail;
    };
    expect(draw(121)).toBe('Turn around · 300 m');
    for (const turn of [119, 100, 91]) expect(draw(turn)).toBe('Turn around · 300 m');
    expect(draw(89)).toBe('Turn right · 300 m');
    expect(draw(119)).toBe('Turn right · 300 m');
    expect(draw(0)).toBe('Get closer to scan · 300 m');
    expect(draw(30, 0.1)).toBe('Get closer to scan · 300 m');
    expect(draw(30, 1.2)).toBe('Turn right · 300 m');
    view.objectiveId = 'new-objective';
    expect(draw(-30, 0)).toBe('Turn left · 300 m');
    f.overlay.clear();
    expect(draw(0, 0)).toBe('Get closer to scan · 300 m');
    f.overlay.dispose();
  });

  it.each([false, true])('lets urgent guidance pre-empt a new turn (touch=%s)', (touch) => {
    const f = contactGuidance(touch);
    f.targets[0].position.z = 300; // Isolate approach cues from ready scan candidates.
    f.step();
    f.overlay.setApproachObstacle('Blocked ahead · go up ↑');
    expect(f.step(0.01).detail).toBe('Blocked ahead · go up ↑ · 300 m');
    f.overlay.setApproachObstacle(null);
    f.targets[1].position.set(-200, 200, 0);
    f.overlay.update(
      { ...f.scanner.view, objectiveDistance: 300, objectiveVertDeg: 45 },
      { ...f.keys, rise: 'Space' },
      null,
      0.01,
    );
    expect(texts(f.overlay.slot).detail).toBe(
      `Go up ↑ 212 m${touch ? '' : ' (hold Space)'} · 300 m`,
    );
    f.overlay.slot.offer('warning', 'urgent', msg('SEABED PROXIMITY'));
    expect(texts(f.overlay.slot).name).toBe('SEABED PROXIMITY');
    f.overlay.slot.offer('warning', 'urgent', null);
    f.targets[1].position.set(0, 0, -15);
    expect(f.step(0.01).detail).toBe(touch ? 'Hold SCAN' : 'Hold G');
    f.overlay.dispose();
  });

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
        detail: 'Turn right · 100 m',
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

  it('keeps a message in place when only its detail changes', () => {
    const slot = new GuidanceSlot();
    slot.offer('objective', 'objective', { ...msg('Stern section'), detail: 'TURN 40° PORT' });
    slot.offer('hint', 'hint', msg('Hold SCAN'));
    slot.offer('objective', 'objective', { ...msg('Stern section'), detail: 'TURN 20° PORT' });
    expect(slot.kind).toBe('hint');
    slot.offer('hint', 'hint', null);
    expect(texts(slot)).toMatchObject({ name: 'Stern section', detail: 'TURN 20° PORT' });
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
      expect(card.name).toBe('Memorial');
      expect(card.kind).toBe('scan');
      expect(card.detail).toBe(touch ? 'Hold SCAN' : 'Hold G');
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
      expect(f.step()).toMatchObject({ name: 'Memorial', kicker: 'SCAN TARGET' });
      f.scanner.setObjective('memorial');
      expect(f.step()).toMatchObject({
        name: 'Memorial',
        kicker: 'SCAN TARGET',
        detail: touch ? 'Hold SCAN' : 'Hold G',
      });
      f.scanner.setObjective(null);
      expect(f.step().kicker).toBe('SCAN TARGET');
      f.scanner.setObjective('stern');
      f.keys.scan = 'X';
      expect(f.step().detail).toBe(touch ? 'Hold SCAN' : 'Hold X');
      // The objective wins when it becomes eligible, even beside a nearer contact.
      f.targets[1].position.set(0, 0, -15);
      expect(f.step()).toMatchObject({
        name: 'Stern',
        kicker: 'SCAN TARGET',
        detail: touch ? 'Hold SCAN' : 'Hold X · N next',
      });
      f.targets[1].position.set(-300, 0, 0);
      f.position.set(0, 0, 1000);
      expect(f.step()).toMatchObject({
        name: 'Stern',
        kind: 'objective',
        detail: 'Turn left · 1044 m',
      });
      f.position.set(0, 0, 0);
      expect(f.step()).toMatchObject({ name: 'Memorial', kicker: 'SCAN TARGET' });
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
        detail: 'Turn left · 1044 m',
      });
      f.position.set(0, 0, 0);
      expect(f.step()).toMatchObject({ name: 'Memorial', kicker: 'SCAN TARGET' });
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
        detail: 'Stern · Turn left',
      });
      f.forward.set(-1, 0, 0);
      expect(f.step(1.2).detail).toBe('Stern · 300 m AHEAD');
      f.scanner.setObjective('memorial');
      expect(f.step(0.2).detail).toBe(firstTime ? 'OPEN JOURNAL' : 'LOGGED · JOURNAL');
      f.scanner.setObjective('stern');
      expect(f.step(0.2).detail).toContain('Stern');
      f.scanner.setTargets([f.targets[0]]);
      expect(f.step(0.2).detail).toBe(firstTime ? 'OPEN JOURNAL' : 'LOGGED · JOURNAL');
      // Updating a result must not renew its priority or lifetime.
      f.scanner.setTargets([]);
      expect(f.step(DEFAULT_CONFIG.scan.completeBannerSeconds - 1.9)).toMatchObject({
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
      expect(f.step(0.2).detail).toBe('Stern · Turn left');
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
    expect(f.step().detail).toBe('Stern · Turn left');
    f.scanner.setObjective(null);
    expect(f.step().detail).toBe('OPEN JOURNAL');
    f.overlay.dispose();
  });

  it('shows only the turn cue for a remote objective that needs a turn', () => {
    const f = contactGuidance(true);
    f.scanner.setTargets([f.targets[1]]);
    expect(f.step()).toMatchObject({
      name: 'Stern',
      kind: 'objective',
      detail: 'Turn left · 300 m',
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
      detail: 'Stern · Turn right',
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
      f.targets[0].position.z = 300; // No ready incidental contact hides the approach cue.
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
      expect(f.step()).toMatchObject({ name: 'Memorial', kicker: 'SCAN TARGET' });
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
    // Touch names the target the same way desktop does, without the key hint.
    expect(tutorialText('move', 'touch', keys, null, 'Bow section')).toBe(
      'Steer with the left pad toward Bow section.',
    );
    expect(tutorialText('move', 'touch', keys, null, undefined)).toBe(
      'Drag the left pad to move and turn.',
    );
    // A dropped beam keeps its cue in the scan card's words, not the generic hold line.
    expect(
      tutorialText('scan', 'keyboard', keys, null, undefined, undefined, undefined, 'facing'),
    ).toBe('Turn toward the marker');
    expect(
      tutorialText('scan', 'touch', keys, null, undefined, undefined, undefined, 'released'),
    ).toBe('HOLD SCAN TO RESUME');
    expect(
      tutorialText('scan', 'keyboard', keys, null, undefined, undefined, undefined, null),
    ).toBe('Hold G on a glowing target.');
    expect(tutorialText('move', 'keyboard', keys, null, 'Bow section')).toContain('Bow section');
  });
  it('adds the marker distance on touch only after the move step sits idle', () => {
    const t = new Tutorial();
    const idle = { dt: 1, throttle: 0, yaw: 0, ballast: 0 };
    for (let i = 0; i < MOVE_IDLE_S - 1; i++) t.update(idle);
    expect(t.stalled).toBe(false);
    t.update(idle);
    expect(t.stalled).toBe(true);
    const text = tutorialText('move', 'touch', keys, null, 'Bow section', undefined, 122);
    expect(text).toBe('Marker 120 m ahead');
    expect(text.length).toBeLessThanOrEqual(42);
    expect(tutorialText('move', 'touch', keys, null, 'Bow section', undefined, 1)).toBe(
      'Marker 5 m ahead',
    );
    t.update({ ...idle, dt: 0.1, throttle: 0.5 });
    expect(t.stalled).toBe(false);
  });
});
