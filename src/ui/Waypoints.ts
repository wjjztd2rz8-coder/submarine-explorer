/** DOM guidance for POIs. Positions are projected from the real world; this never changes survey data. */
import { Vector3, type Camera } from 'three';
import type { PlacedPoi } from '../game/Pois.js';
import type { Scanner } from '../game/Scanner.js';

type Rect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

/** Keep the whole wrapped label nearest its projection, clear of the composed HUD. */
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

export function waypointReadout(
  from: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  radius: number,
): string {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const dz = target.z - from.z;
  const distance = Math.hypot(dx, dy, dz);
  return `${Math.round(distance)} m · ${dy >= 0 ? '↑' : '↓'}${Math.round(Math.abs(dy))} m${distance <= radius ? ' · IN RANGE' : ''}`;
}

export class Waypoints {
  readonly root: HTMLDivElement;
  private readonly edge: HTMLDivElement;
  private readonly edgeName = document.createElement('span');
  private readonly edgeInfo = document.createElement('span');
  private readonly markers = new Map<string, HTMLDivElement>();
  private readonly projection = new Vector3();
  private pois: readonly PlacedPoi[] = [];
  private visualHints = true;

  constructor(
    private readonly scanner: Scanner,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'd-scan-waypoints';
    this.edge = document.createElement('div');
    this.edge.className = 'd-scan-edge';
    this.edgeName.className = 'd-scan-edge-name';
    this.edgeInfo.className = 'd-scan-edge-info';
    this.edge.append(this.edgeName, this.edgeInfo);
    this.root.append(this.edge);
    parent.appendChild(this.root);
  }

  setPois(pois: readonly PlacedPoi[]): void {
    this.pois = pois;
    for (const poi of pois) {
      const marker = document.createElement('div');
      marker.className = 'd-scan-world-marker';
      marker.dataset.poi = poi.id;
      marker.setAttribute('aria-label', poi.name);
      this.root.appendChild(marker);
      this.markers.set(poi.id, marker);
    }
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

  /**
   * @param nameInSlot says whether the guidance slot already shows a name; the
   *   label then keeps only range and depth.
   */
  update(
    camera: Camera,
    position: Vector3,
    objective: WaypointObjective | null,
    nameInSlot: (name: string) => boolean = () => false,
  ): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const current = objective ? this.pois.find((p) => p.id === objective.poiId) : null;
    for (const poi of this.pois) {
      const scanned = this.scanner.isScanned(poi.landmarkId, poi.id);
      const isCurrent = poi === current && this.visualHints && !scanned;
      const projected = this.projection.copy(poi.position).project(camera);
      const onscreen =
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 0.9 &&
        Math.abs(projected.y) < 0.85;
      const marker = this.markers.get(poi.id);
      if (marker) {
        marker.hidden = !onscreen || (!scanned && !isCurrent);
        marker.classList.toggle('is-scanned', scanned);
        marker.classList.toggle('is-current', isCurrent);
        marker.textContent = scanned ? '✓' : '◇';
        marker.title = scanned ? `${poi.name} · scanned this dive` : poi.name;
        if (!marker.hidden) {
          marker.style.left = `${((projected.x + 1) / 2) * width}px`;
          marker.style.top = `${((1 - projected.y) / 2) * height}px`;
        }
      }
    }
    if (!current || !this.visualHints) {
      this.edge.hidden = true;
      return;
    }
    const point = this.projection.copy(current.position).project(camera);
    this.edge.hidden = false;
    const onscreen =
      point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.9 && Math.abs(point.y) < 0.85;
    this.edge.classList.toggle('is-onscreen', onscreen);
    const behind = point.z > 1;
    const x = behind ? -point.x : point.x;
    const y = behind ? -point.y : point.y;
    const angle = Math.atan2(-y, x);
    this.edgeName.textContent = current.name;
    this.edgeName.hidden = nameInSlot(current.name);
    this.edgeInfo.textContent = waypointReadout(position, current.position, current.radius);
    this.edge.style.setProperty('--direction', `${angle}rad`);
    // Measure this frame's wrapped copy before clamping, including the name when it returns.
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
    const markerHalf = (this.markers.get(current.id)?.offsetHeight ?? 0) / 2 + gap;
    const placement = clampWaypointLabel(
      {
        x: ((x + 1) / 2) * width - size.width / 2,
        y:
          ((1 - y) / 2) * height +
          (onscreen ? (y < 0.24 ? -size.height - markerHalf : markerHalf) : -size.height / 2),
      },
      size,
      { width, height },
      occupied,
      gap,
    );
    // A full-screen map may leave no room; its navigation already owns the stage.
    this.edge.hidden = placement === null;
    if (placement) {
      this.edge.style.left = `${placement.x}px`;
      this.edge.style.top = `${placement.y}px`;
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
