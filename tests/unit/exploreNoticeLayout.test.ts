import { afterEach, expect, it, vi } from 'vitest';
import { ExploreNotice, type ExploreNoticeBounds } from '../../src/ui/ExploreNotice.js';
import { EVENT_CAPTIONS } from '../../src/game/Events.js';

const rect = (x: number, y: number, width: number, height: number): ExploreNoticeBounds => ({
  x,
  y,
  width,
  height,
});
const intersects = (a: ExploreNoticeBounds, b: ExploreNoticeBounds): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

afterEach(() => vi.unstubAllGlobals());
for (const subject of [
  { kind: 'plume', bounds: rect(270, 210, 70, 100) },
  { kind: 'turbidity', bounds: rect(300, 280, 100, 32) },
  { kind: 'whale', bounds: rect(325, 205, 60, 24) },
  // Real Beebe Low phone particle envelope at age 2; stress a wrapped caption.
  { kind: 'plume-wrapped', bounds: rect(254.4, 205.2, 68.2, 118.5) },
]) {
  it(`${subject.kind}: phone caption leaves the subject, HUD and thumb controls clear`, () => {
    // Occupied regions from the supplied Low 844×390 phone captures.
    const controls: Record<string, ExploreNoticeBounds> = {
      '.sonar': rect(14, 14, 134, 162),
      '.hud-readouts': rect(550, 14, 282, 64),
      '.tc-stick': rect(20, 253, 130, 130),
      '.tc-slider': rect(770, 224, 64, 159),
      '.tc-buttons': rect(555, 174, 197, 208),
      '.tc-btn-pause': rect(286, 6, 58, 58),
    };
    if (subject.kind !== 'whale') controls['.scan-panel'] = rect(163, 66, 363, 63);
    const style: Record<string, string> = {};
    const root = {
      style,
      hidden: true,
      textContent: '',
      setAttribute: vi.fn(),
      remove: vi.fn(),
      getBoundingClientRect: () => {
        const width =
          subject.kind === 'plume-wrapped' ? Math.min(386, Number.parseFloat(style.maxWidth)) : 360;
        const height =
          subject.kind === 'plume-wrapped'
            ? 12 + 18 * (Math.ceil(420 / (width - 22)) + Math.ceil(156 / (width - 22)))
            : 48;
        return rect(
          Number.parseFloat(style.left) || 0,
          Number.parseFloat(style.top) || 0,
          width,
          height,
        );
      },
    };
    const query = vi.fn((selector: string) =>
      controls[selector]
        ? {
            hidden: false,
            getClientRects: () => [controls[selector]],
            getBoundingClientRect: () => controls[selector],
          }
        : null,
    );
    vi.stubGlobal('window', { innerWidth: 844, innerHeight: 390 });
    vi.stubGlobal('document', {
      body: { append: vi.fn() },
      createElement: () => root,
      documentElement: { classList: { contains: () => true } },
      querySelector: query,
    });
    const notice = new ExploreNotice(undefined, () => subject.bounds);
    const explanation =
      EVENT_CAPTIONS[
        subject.kind.startsWith('plume')
          ? 'plume'
          : subject.kind === 'whale'
            ? 'whale'
            : 'turbidity'
      ];
    notice.show(explanation, 3);
    notice.update(0.1, false);
    expect(root.hidden).toBe(false);
    const caption = root.getBoundingClientRect();
    expect(caption.x).toBeGreaterThanOrEqual(0);
    expect(caption.y).toBeGreaterThanOrEqual(0);
    expect(caption.x + caption.width).toBeLessThanOrEqual(844);
    expect(caption.y + caption.height).toBeLessThanOrEqual(390);
    for (const occupied of [...Object.values(controls), subject.bounds])
      expect(intersects(caption, occupied)).toBe(false);
    if (subject.kind === 'plume-wrapped') {
      expect(caption.x).toBeGreaterThan(subject.bounds.x + subject.bounds.width + 8);
      expect(caption.width).toBeGreaterThanOrEqual(280);
      expect(caption.height).toBe(66);
      expect(style.fontSize).toBe('12px');
    }
    const reads = query.mock.calls.length;
    notice.update(0.1, false);
    expect(query).toHaveBeenCalledTimes(reads);
    notice.update(0.5, false);
    expect(query.mock.calls.length).toBeGreaterThan(reads);
    notice.update(3, false);
    expect(root.hidden).toBe(true);
    notice.dispose();
  });
}
