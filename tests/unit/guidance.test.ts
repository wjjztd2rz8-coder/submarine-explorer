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
    vi.stubGlobal('document', {
      body: new FakeElement(),
      documentElement: { classList: { contains: () => false } },
      createElement: () => new FakeElement(),
      createElementNS: () => new FakeElement(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  const texts = (slot: GuidanceSlot) => {
    const root = slot.root as unknown as FakeElement;
    const text = root.children[1];
    return { hidden: root.hidden, name: text.children[1].textContent, kind: root.dataset.kind };
  };

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
    const overlay = new ScanOverlay(DEFAULT_CONFIG.scan);
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
    const overlay = new ScanOverlay(DEFAULT_CONFIG.scan);
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
