import { afterEach, describe, expect, it, vi } from 'vitest';
import { placeDataCredits, type CreditsRect } from '../../src/ui/DataCreditsLayout.js';
import { HUD } from '../../src/ui/HUD.js';

const rect = (x: number, y: number, width: number, height: number): CreditsRect => ({
  left: x,
  top: y,
  right: x + width,
  bottom: y + height,
});

function assertClear(slot: CreditsRect | null, viewport: CreditsRect, obstacles: CreditsRect[]) {
  expect(slot).not.toBeNull();
  expect(slot!.left).toBeGreaterThanOrEqual(viewport.left);
  expect(slot!.top).toBeGreaterThanOrEqual(viewport.top);
  expect(slot!.right).toBeLessThanOrEqual(viewport.right);
  expect(slot!.bottom).toBeLessThanOrEqual(viewport.bottom);
  expect(slot!.right - slot!.left).toBeGreaterThanOrEqual(120);
  expect(slot!.bottom - slot!.top).toBeGreaterThanOrEqual(48);
  for (const obstacle of obstacles) {
    expect(
      slot!.left < obstacle.right &&
        slot!.right > obstacle.left &&
        slot!.top < obstacle.bottom &&
        slot!.bottom > obstacle.top,
    ).toBe(false);
  }
}

describe('data credits free viewport slots', () => {
  it('keeps the full desktop panel directly above the chip when there is room', () => {
    const viewport = rect(12, 12, 1256, 776);
    const chip = rect(1160, 758, 108, 32);
    const reset = rect(1010, 758, 140, 32);
    const slot = placeDataCredits(viewport, chip, [chip, reset], 400, 160);
    assertClear(slot, viewport, [chip, reset]);
    expect(slot).toEqual(rect(868, 590, 400, 160));
  });

  it('fits a left-anchored portrait chip with sonar, telemetry, scanner and tutorial up', () => {
    const viewport = rect(12, 12, 336, 616);
    const chip = rect(12, 436, 110, 44);
    // Conservative short-phone envelopes, including the enlarged action grid.
    const obstacles = [
      rect(12, 12, 144, 214),
      rect(168, 72, 180, 164),
      rect(300, 12, 48, 48),
      rect(12, 240, 336, 62),
      rect(12, 320, 336, 94),
      rect(12, 520, 108, 108),
      rect(168, 460, 110, 168),
      rect(288, 480, 60, 148),
      chip,
    ];
    // The old right:0 panel attached to this chip started at x=-214.
    expect(chip.right - 336).toBeLessThan(0);
    const slot = placeDataCredits(viewport, chip, obstacles, 336, 160);
    assertClear(slot, viewport, obstacles);
    expect(slot!.left).toBeGreaterThanOrEqual(164);
    expect(slot!.right).toBeLessThanOrEqual(292);
    expect(slot!.bottom).toBeLessThanOrEqual(64);
  });

  it('moves away from a newly visible toast, then uses its old slot after dismissal', () => {
    const viewport = rect(12, 12, 820, 366);
    const chip = rect(430, 336, 114, 44);
    const obstacles = [
      chip,
      rect(12, 12, 144, 212),
      rect(168, 58, 406, 80),
      rect(168, 146, 406, 80),
      rect(582, 12, 250, 180),
      rect(16, 270, 108, 108),
      rect(582, 212, 250, 166),
    ];
    const initial = placeDataCredits(viewport, chip, obstacles, 400, 160);
    assertClear(initial, viewport, obstacles);
    const toast = rect(initial!.left, initial!.top, initial!.right - initial!.left, 48);
    const next = placeDataCredits(viewport, chip, [...obstacles, toast], 400, 160);
    assertClear(next, viewport, [...obstacles, toast]);
    expect(next).not.toEqual(initial);
    expect(placeDataCredits(viewport, chip, obstacles, 400, 160)).toEqual(initial);
  });

  it('never overlaps obstacles across a range of viewport sizes and HUD rectangles', () => {
    for (const [width, height] of [
      [360, 640],
      [390, 844],
      [667, 375],
      [844, 390],
      [1280, 720],
      [1600, 900],
    ]) {
      const viewport = rect(12, 12, width! - 24, height! - 24);
      const chip = rect(12, height! - 204, 110, 44);
      const obstacles = [chip, rect(12, 12, 144, 200), rect(width! - 156, height! - 200, 144, 188)];
      const slot = placeDataCredits(viewport, chip, obstacles, Math.min(400, width! - 24), 160);
      assertClear(slot, viewport, obstacles);
    }
  });

  it('returns no slot when the viewport has no usable reading area', () => {
    const viewport = rect(12, 12, 336, 616);
    expect(placeDataCredits(viewport, rect(12, 436, 110, 44), [viewport], 336, 160)).toBeNull();
  });
});

afterEach(() => vi.unstubAllGlobals());

function hudFixture() {
  const viewport = rect(12, 12, 1256, 776);
  const chip = rect(1160, 758, 108, 32);
  const readHeight = vi.fn(() => 158);
  const panel = {
    style: { left: '', top: '', width: '', maxHeight: '' },
    get scrollHeight() {
      return readHeight();
    },
  };
  const details = {
    open: true,
    querySelector: (selector: string) =>
      selector === 'summary' ? { getBoundingClientRect: () => chip } : panel,
  };
  const obstacle = {
    box: rect(1010, 758, 140, 32),
    visible: true,
    getClientRects() {
      return this.visible ? [this.box] : [];
    },
    getBoundingClientRect() {
      return this.box;
    },
  };
  const hud = Object.create(HUD.prototype) as HUD;
  Object.defineProperty(hud, 'root', { value: { querySelector: () => details } });
  vi.stubGlobal('document', { querySelectorAll: () => [obstacle] });
  vi.stubGlobal('getComputedStyle', () => ({ visibility: 'visible', font: '12px monospace' }));
  vi.stubGlobal('innerWidth', 1280);
  vi.stubGlobal('innerHeight', 800);
  const slot = () =>
    rect(
      parseFloat(panel.style.left),
      parseFloat(panel.style.top),
      parseFloat(panel.style.width),
      parseFloat(panel.style.maxHeight),
    );
  return { hud, panel, details, obstacle, chip, viewport, readHeight, slot };
}

describe('live HUD credit placement', () => {
  it('fits the crowded 667×375 mission without relaxing reading size or HUD clearance', () => {
    const f = hudFixture();
    vi.stubGlobal('innerWidth', 667);
    vi.stubGlobal('innerHeight', 375);
    Object.assign(f.chip, rect(261.515625, 321, 105.484375, 44));
    f.readHeight.mockReturnValue(216);
    // Conservative envelopes from the short-landscape layout: sonar/stick
    // on the left, tutorial/contact in the centre, mission/telemetry and
    // actions on the right. Pause splits the space above the tutorial.
    const obstacles = [
      rect(12, 12, 144, 239),
      rect(16, 255, 108, 104),
      rect(168, 58, 229, 142),
      rect(168, 206, 229, 103),
      rect(405, 12, 250, 100),
      rect(417, 120, 238, 60),
      rect(411.8, 187, 172, 172),
      rect(591, 219, 60, 140),
      rect(667 * 0.34, 6.4, 48, 48),
    ];
    vi.stubGlobal('document', {
      querySelectorAll: () =>
        obstacles.map((box) => ({
          getClientRects: () => [box],
          getBoundingClientRect: () => box,
        })),
    });
    // The old padded search cannot place a panel, leaving its CSS auto
    // position below the credit chip (y=365 in the external failure).
    expect(
      placeDataCredits(rect(12, 12, 643, 351), f.chip, [...obstacles, f.chip], 400, 218),
    ).toBeNull();
    f.hud.layoutDataCredits();
    assertClear(f.slot(), rect(4, 4, 659, 367), [...obstacles, f.chip]);
    const first = f.slot();
    f.hud.layoutDataCredits();
    expect(f.slot()).toEqual(first);
    expect(f.readHeight).toHaveBeenCalledOnce();
    // Once the mission panels clear, prefer the normal spacing and full
    // reading width again instead of retaining the cramped fallback.
    obstacles.splice(0);
    f.hud.layoutDataCredits();
    assertClear(f.slot(), rect(12, 12, 643, 351), [f.chip]);
    expect(f.slot().right - f.slot().left).toBe(400);
    expect(f.readHeight).toHaveBeenCalledTimes(2);
  });

  it('caches steady geometry and responds to a toast appearing and disappearing', () => {
    const f = hudFixture();
    f.hud.layoutDataCredits();
    const first = f.slot();
    assertClear(first, f.viewport, [f.chip, f.obstacle.box]);
    f.hud.layoutDataCredits();
    expect(f.readHeight).toHaveBeenCalledOnce();
    f.obstacle.box = first;
    f.hud.layoutDataCredits();
    assertClear(f.slot(), f.viewport, [f.chip, f.obstacle.box]);
    expect(f.slot()).not.toEqual(first);
    f.obstacle.visible = false;
    f.hud.layoutDataCredits();
    expect(f.slot()).toEqual(first);
    expect(f.readHeight).toHaveBeenCalledTimes(3);
  });

  it('repositions an open panel after rotation instead of retaining offscreen coordinates', () => {
    const f = hudFixture();
    f.hud.layoutDataCredits();
    vi.stubGlobal('innerWidth', 360);
    vi.stubGlobal('innerHeight', 640);
    Object.assign(f.chip, rect(12, 436, 110, 44));
    f.obstacle.box = rect(168, 460, 180, 168);
    f.hud.layoutDataCredits();
    assertClear(f.slot(), rect(12, 12, 336, 616), [f.chip, f.obstacle.box]);
  });

  it('does not measure or rewrite a closed credits panel', () => {
    const f = hudFixture();
    f.details.open = false;
    f.hud.layoutDataCredits();
    expect(f.readHeight).not.toHaveBeenCalled();
    expect(f.panel.style.left).toBe('');
  });
});
