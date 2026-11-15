import { contactLabel, CONTACT_CONFIG, type ContactState } from '../game/Contacts.js';
/** DOM guidance for POIs. Positions are projected from the real world; this never changes survey data. */
import { Vector3, type Camera } from 'three';
import type { PlacedPoi } from '../game/Pois.js';
import type { ScanTarget, Scanner } from '../game/Scanner.js';

const SECONDARY_DISTANCE_M = 200;

type Rect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

/** Keep the offscreen arrow nearest its projection, clear of the composed HUD. */
export function clampWaypointLabel(
  preferred: { x: number; y: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  occupied: readonly Rect[],
  gap: number,
): { x: number; y: number } | null {
  if (size.width + gap * 2 > viewport.width || size.height + gap * 2 > viewport.height) return null;
  const clampX = (x: number) => Math.max(gap, Math.min(viewport.width - size.width - gap, x));
  const clampY = (y: number) => Math.max(gap, Math.min(viewport.height - size.height - gap, y));
  const origin = { x: clampX(preferred.x), y: clampY(preferred.y) };
  const xs = [origin.x, ...occupied.flatMap((r) => [r.left - size.width - gap, r.right + gap])];
  const ys = [origin.y, ...occupied.flatMap((r) => [r.top - size.height - gap, r.bottom + gap])];
  let nearest: { x: number; y: number } | null = null;
  let distance = Infinity;
  for (const x of xs.map(clampX)) {
    for (const y of ys.map(clampY)) {
      if (
        occupied.some(
          (r) =>
            x < r.right + gap &&
            x + size.width + gap > r.left &&
            y < r.bottom + gap &&
            y + size.height + gap > r.top,
        )
      )
        continue;
      const d = (x - origin.x) ** 2 + (y - origin.y) ** 2;
      if (d < distance) {
        nearest = { x, y };
        distance = d;
      }
    }
  }
  return nearest;
}

interface WaypointObjective {
  poiId: string;
}

export class Waypoints {
  readonly root: HTMLDivElement;
  private readonly edge: HTMLDivElement;
  private readonly markers = new Map<string, HTMLDivElement>();
  private readonly projection = new Vector3();
  private pois: readonly PlacedPoi[] = [];
  private visualHints = true;
  private layoutAt = -Infinity;
  private layoutWidth = 0;
  private layoutHeight = 0;
  private layout: {
    size: { width: number; height: number };
    gap: number;
    occupied: Rect[];
  } | null = null;

  private toggle(marker: HTMLElement, name: string, on: boolean): void {
    if (marker.classList.contains(name) !== on) marker.classList.toggle(name, on);
  }
  private hide(marker: HTMLElement, hidden: boolean): void {
    if (marker.hidden !== hidden) marker.hidden = hidden;
  }
  private text(marker: HTMLElement, text: string): void {
    if (marker.textContent !== text) marker.textContent = text;
  }
  private labels = new WeakMap<HTMLElement, string>();
  private label(marker: HTMLElement, label: string): void {
    if (this.labels.get(marker) === label) return;
    this.labels.set(marker, label);
    marker.title = label;
    marker.setAttribute('aria-label', label);
  }
  private position(marker: HTMLElement, x: number, y: number): void {
    const left = `${Math.round(x)}px`;
    const top = `${Math.round(y)}px`;
    if (marker.style.left !== left) marker.style.left = left;
    if (marker.style.top !== top) marker.style.top = top;
  }
  private direction = '';

  constructor(
    private readonly scanner: Scanner,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'd-scan-waypoints';
    this.edge = document.createElement('div');
    this.edge.className = 'd-scan-edge';
    this.root.append(this.edge);
    parent.appendChild(this.root);
  }

  private contactState: ((poi: PlacedPoi) => ContactState) | null = null;
  setContactState(state: (poi: PlacedPoi) => ContactState): void {
    this.contactState = state;
  }
  setPois(pois: readonly PlacedPoi[]): void {
    this.pois = pois;
    for (const poi of pois) {
      this.addMarker(poi);
    }
  }

  private addMarker(target: ScanTarget): void {
    if (this.markers.has(target.id)) return;
    const marker = document.createElement('div');
    marker.className = 'd-scan-world-marker';
    marker.dataset.poi = target.id;
    marker.addEventListener('pointerdown', (event) => {
      if (!this.scanner.view.candidateIds?.includes(target.id)) return;
      event.stopPropagation();
    });
    marker.addEventListener('click', (event) => {
      if (this.scanner.selectCandidate(target.id)) {
        event.stopPropagation();
        event.preventDefault();
      }
    });
    this.root.appendChild(marker);
    this.markers.set(target.id, marker);
  }

  setVisualHints(enabled: boolean): void {
    this.visualHints = enabled;
    this.root.dataset.hints = String(enabled);
  }

  setReducedMotion(enabled: boolean): void {
    this.root.dataset.reduceMotion = String(enabled);
  }

  setPalette(name: string): void {
    this.root.dataset.palette = name;
  }

  private state(poi: PlacedPoi): ContactState {
    return (
      this.contactState?.(poi) ?? {
        primary: poi.primary,
        found: this.scanner.isScanned(poi.landmarkId, poi.id),
      }
    );
  }

  /** The guidance slot owns target text; world navigation uses symbols only. */
  update(camera: Camera, _position: Vector3, objective: WaypointObjective | null): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const current = objective ? this.pois.find((p) => p.id === objective.poiId) : null;
    const targets: readonly ScanTarget[] = [
      ...this.pois,
      ...this.scanner.getSupplementalTargets(),
      ...this.scanner.getExtraTargets(),
    ];
    const liveIds = new Set(targets.map((t) => t.id));
    for (const [id, marker] of this.markers) {
      if (!liveIds.has(id)) {
        marker.remove();
        this.markers.delete(id);
      }
    }
    for (const poi of targets) {
      this.addMarker(poi);
      const placed = this.pois.find((p) => p.id === poi.id);
      const state = placed
        ? this.state(placed)
        : {
            primary: false,
            found: this.scanner.isScanned(poi.landmarkId, poi.id),
          };
      const label = placed ? contactLabel(placed, state) : poi.name;
      const scannable = this.scanner.view.candidateIds?.includes(poi.id) ?? false;
      // A Journal discovery can be scanned again on a new dive. Keep its armed marker visible.
      const scanned = state.found && !scannable;
      const unknown = !state.primary && !state.found;
      const distance = _position.distanceTo(poi.position);
      const nearby = distance <= CONTACT_CONFIG.worldMarkerRangeM;
      const isCurrent = poi === current && this.visualHints && !scanned;
      const secondary = Boolean(current) && poi !== current && !scanned;
      const projected = this.projection.copy(poi.position).project(camera);
      const onscreen =
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 0.9 &&
        Math.abs(projected.y) < 0.85;
      const marker = this.markers.get(poi.id);
      if (marker) {
        // Other unknown contacts appear in range; the current target is always marked.
        this.hide(
          marker,
          scanned ||
            !onscreen ||
            (!scannable && (unknown ? !(nearby || isCurrent) || !this.visualHints : !isCurrent)),
        );
        this.toggle(marker, 'is-scannable', scannable);
        this.toggle(marker, 'is-armed', this.scanner.view.candidateId === poi.id);
        this.toggle(marker, 'is-scanned', scanned);
        this.toggle(marker, 'is-current', isCurrent);
        this.toggle(marker, 'is-secondary', secondary);
        this.text(
          marker,
          unknown
            ? secondary && distance > SECONDARY_DISTANCE_M
              ? '?'
              : `? · ${Math.round(distance)} m`
            : scanned
              ? `✓ ${label}`
              : '◇',
        );
        this.label(marker, label);
        this.toggle(marker, 'is-unknown', unknown);
        if (!marker.hidden) {
          this.position(marker, ((projected.x + 1) / 2) * width, ((1 - projected.y) / 2) * height);
        }
      }
    }
    if (!current || !this.visualHints) {
      this.hide(this.edge, true);
      return;
    }
    const state = this.state(current);
    this.text(
      this.edge,
      !state.primary && !state.found
        ? `? · ${Math.round(_position.distanceTo(current.position))} m`
        : '',
    );
    this.label(this.edge, contactLabel(current, state));
    const point = this.projection.copy(current.position).project(camera);
    const onscreen =
      point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.9 && Math.abs(point.y) < 0.85;
    if (onscreen) {
      this.hide(this.edge, true);
      return;
    }
    const behind = point.z > 1;
    const x = behind ? -point.x : point.x;
    const y = behind ? -point.y : point.y;
    const angle = Math.atan2(-y, x);
    const direction = `${angle}rad`;
    if (this.direction !== direction) {
      this.direction = direction;
      this.edge.style.setProperty('--direction', direction);
    }
    const now = performance.now();
    if (
      !this.layout ||
      now - this.layoutAt >= 250 ||
      width !== this.layoutWidth ||
      height !== this.layoutHeight
    ) {
      this.hide(this.edge, false);
      const size = this.edge.getBoundingClientRect();
      const gap = parseFloat(getComputedStyle(this.root).getPropertyValue('--hud-gap')) || 0;
      const occupied = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.sonar, .objectives-panel, .hud-readouts, .guidance-slot, .hud-bar, ' +
            '.tc-stick, .tc-slider, .tc-buttons, .scan-reticle',
        ),
      )
        .filter((el) => el.checkVisibility({ checkVisibilityCSS: true }))
        .map((el) => el.getBoundingClientRect());
      this.layout = { size, gap, occupied };
      this.layoutAt = now;
      this.layoutWidth = width;
      this.layoutHeight = height;
    }
    const { size, gap, occupied } = this.layout;
    const placement = clampWaypointLabel(
      {
        x: ((x + 1) / 2) * width - size.width / 2,
        y: ((1 - y) / 2) * height - size.height / 2,
      },
      size,
      { width, height },
      occupied,
      gap,
    );
    // A full-screen map may leave no room; its navigation already owns the stage.
    this.hide(this.edge, placement === null);
    if (placement) {
      this.position(this.edge, placement.x, placement.y);
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
