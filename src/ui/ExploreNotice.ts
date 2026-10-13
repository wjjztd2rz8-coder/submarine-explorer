import '../styles/explore.css';

export interface ExploreNoticeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
const overlaps = (a: ExploreNoticeBounds, b: ExploreNoticeBounds): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

/** Empty rectangles between occupied edges, including space beside the scan card. */
function freeRegions(
  blockers: ExploreNoticeBounds[],
  width: number,
  height: number,
): ExploreNoticeBounds[] {
  const occupied = blockers.map((b) => ({
    x: b.x - 8,
    y: b.y - 8,
    width: b.width + 16,
    height: b.height + 16,
  }));
  const tops = new Set([12, ...occupied.map((b) => Math.max(12, b.y + b.height))]);
  const bottoms = new Set([height - 12, ...occupied.map((b) => Math.min(height - 12, b.y))]);
  const regions: ExploreNoticeBounds[] = [];
  for (const top of tops)
    for (const bottom of bottoms) {
      if (bottom - top < 40) continue;
      const intervals = occupied
        .filter((b) => b.y < bottom && b.y + b.height > top)
        .sort((a, b) => a.x - b.x);
      let left = 12;
      for (const b of intervals) {
        const right = Math.min(width - 12, b.x);
        if (right - left >= 180)
          regions.push({ x: left, y: top, width: right - left, height: bottom - top });
        left = Math.max(left, b.x + b.width);
      }
      if (width - 12 - left >= 180)
        regions.push({ x: left, y: top, width: width - 12 - left, height: bottom - top });
    }
  // Prefer fewer wrapped lines, then more vertical room.
  return regions.sort((a, b) => b.width - a.width || b.height - a.height);
}

/** A reveal caption that leaves the subject and the existing controls visible. */
export class ExploreNotice {
  readonly root = document.createElement('div');
  private leftS = 0;
  private layoutWaitS = 0;
  private placed = true;
  constructor(
    parent: HTMLElement = document.body,
    private readonly subjectBounds?: () => ExploreNoticeBounds | null,
  ) {
    this.root.className = 'explore-caption';
    Object.assign(this.root.style, {
      boxSizing: 'border-box',
      whiteSpace: 'pre-line',
      width: 'max-content',
      maxWidth: 'min(82vw, 640px)',
      bottom: 'auto',
      transform: 'none',
      padding: '6px 10px',
    });
    this.root.hidden = true;
    this.root.setAttribute('role', 'status');
    parent.append(this.root);
  }
  show(text: string, durationS = 5): void {
    this.root.textContent = text;
    this.leftS = durationS;
    this.layoutWaitS = 0;
  }
  /** Keep approach guidance live; confirmation needs only a short reading time. */
  event(text: string, needsCloser: boolean, logged: boolean): void {
    const cue = needsCloser ? 'Get closer to log it' : logged ? 'Sighting logged in Journal' : '';
    const value = cue ? `${text}\n${cue}` : text;
    if (this.root.textContent === value) return;
    this.root.textContent = value;
    if (logged) this.leftS = Math.min(this.leftS, 3);
    this.layoutWaitS = 0;
  }
  update(dt: number, blocked: boolean): void {
    this.leftS = Math.max(0, this.leftS - dt);
    if (blocked || this.leftS <= 0) {
      this.root.hidden = true;
      return;
    }
    this.layoutWaitS -= dt;
    if (this.layoutWaitS <= 0) {
      this.root.hidden = false;
      this.placed = this.place();
      // Recheck changes in HUD/subject placement twice a second, without
      // forcing layout on every rendered frame of a phone dive.
      this.layoutWaitS = 0.5;
    }
    this.root.hidden = !this.placed;
  }
  private place(): boolean {
    const width = window.innerWidth,
      height = window.innerHeight;
    if (!width || !height || !this.root.getBoundingClientRect) return true;
    const selectors = [
      '.sonar',
      '.hud-readouts',
      '.scan-panel',
      '.onboard-card',
      '.tc-stick',
      '.tc-slider',
      '.tc-buttons',
      '.tc-btn-pause',
      '.objectives-panel',
    ];
    const blockers = selectors.flatMap((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element || element.hidden || !element.getClientRects().length) return [];
      const rect = element.getBoundingClientRect();
      return rect.width && rect.height
        ? [{ selector, x: rect.x, y: rect.y, width: rect.width, height: rect.height }]
        : [];
    });
    const sonar = blockers.find((b) => b.selector === '.sonar');
    const readouts = blockers.find((b) => b.selector === '.hud-readouts');
    const left = sonar ? sonar.x + sonar.width + 8 : 12;
    const right = readouts && readouts.x > width / 2 ? readouts.x - 8 : width - 12;
    const middle = right > left + 180;
    this.root.style.fontSize = document.documentElement.classList.contains('is-touch')
      ? '12px'
      : '14px';
    this.root.style.maxWidth = `${Math.min(640, middle ? right - left : width - 24)}px`;
    const size = this.root.getBoundingClientRect();
    const x = Math.max(
      12,
      Math.min(width - size.width - 12, (middle ? (left + right) / 2 : width / 2) - size.width / 2),
    );
    const subject = this.subjectBounds?.();
    if (subject)
      blockers.push({
        selector: 'subject',
        x: subject.x - 8,
        y: subject.y - 8,
        width: subject.width + 16,
        height: subject.height + 16,
      });
    const scan = blockers.find((b) => b.selector === '.scan-panel');
    const pause = blockers.find((b) => b.selector === '.tc-btn-pause');
    const candidates = [
      (scan ? scan.y + scan.height : pause ? pause.y + pause.height : 12) + 8,
      ...(subject ? [subject.y - size.height - 12, subject.y + subject.height + 12] : []),
      height - size.height - 12,
    ];
    for (let y = 12; y + size.height <= height - 12; y += 8) candidates.push(y);
    const y = candidates.find(
      (y) =>
        y >= 12 &&
        y + size.height <= height - 12 &&
        blockers.every((b) => !overlaps({ x, y, width: size.width, height: size.height }, b)),
    );
    if (y !== undefined) {
      this.root.style.left = `${x}px`;
      this.root.style.top = `${y}px`;
      return true;
    }
    // A rising plume can occupy the whole centre column. Search side gaps
    // before hiding guidance, keeping the same type size and every blocker.
    const measured = new Map<number, { width: number; height: number }>();
    for (const region of freeRegions(blockers, width, height)) {
      const maxWidth = Math.floor(Math.min(640, region.width));
      let fitted = measured.get(maxWidth);
      if (!fitted) {
        this.root.style.maxWidth = `${maxWidth}px`;
        const box = this.root.getBoundingClientRect();
        fitted = { width: box.width, height: box.height };
        measured.set(maxWidth, fitted);
      }
      if (fitted.width > region.width || fitted.height > region.height) continue;
      this.root.style.maxWidth = `${maxWidth}px`;
      this.root.style.left = `${region.x + (region.width - fitted.width) / 2}px`;
      this.root.style.top = `${region.y}px`;
      return true;
    }
    return false;
  }
  clear(): void {
    this.leftS = 0;
    this.root.hidden = true;
  }
  dispose(): void {
    this.root.remove();
  }
}
