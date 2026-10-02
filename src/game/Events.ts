import { EXPLORE_CONFIG } from '../core/config/explore.js';
export type ExploreEventKind = 'plume' | 'turbidity' | 'snow' | 'whale';
export interface EventHabitat {
  site: string;
  depthM: number;
  altitudeM: number;
}
export interface ExploreEvent {
  kind: ExploreEventKind;
  elapsedS: number;
  durationS: number;
}
export const EVENT_CAPTIONS: Record<ExploreEventKind, string> = {
  plume: 'A vent plume surges into the current',
  turbidity: 'A drift of silt rolls along the seabed',
  snow: 'Marine snow falls through the light',
  whale: 'A whale passes overhead',
};
const VENTS = new Set(['lost-city', 'axial-seamount-ashes', 'beebe-vent-field', 'kamaehuakanaloa']);
const CANYONS = new Set(['monterey-canyon', 'hudson-canyon', 'hunga-tonga-caldera']);
export function eventKinds(h: EventHabitat): ExploreEventKind[] {
  const kinds: ExploreEventKind[] = ['snow'];
  if (VENTS.has(h.site) && h.altitudeM < 70) kinds.push('plume');
  if (CANYONS.has(h.site) && h.altitudeM < 45) kinds.push('turbidity');
  if (
    (h.site === 'monterey-canyon' || h.site === 'hudson-canyon') &&
    h.depthM < EXPLORE_CONFIG.shallowDepthM
  )
    kinds.push('whale');
  return kinds;
}
/** Uses active dive time only, with one short event and a guaranteed quiet gap. */
export class EventScheduler {
  active: ExploreEvent | null = null;
  private remainingS: number;
  constructor(private readonly random: () => number = Math.random) {
    this.remainingS = this.wait();
  }
  private wait(): number {
    const [lo, hi] = EXPLORE_CONFIG.eventWaitS;
    return lo + (hi - lo) * Math.max(0, Math.min(1, this.random()));
  }
  update(dt: number, h: EventHabitat): ExploreEvent | null {
    if (!Number.isFinite(dt) || dt <= 0) return null;
    if (this.active) {
      this.active.elapsedS = Math.min(this.active.durationS, this.active.elapsedS + dt);
      if (this.active.elapsedS >= this.active.durationS) {
        this.active = null;
        this.remainingS = EXPLORE_CONFIG.eventCooldownS + this.wait();
      }
      return null;
    }
    this.remainingS -= dt;
    if (this.remainingS > 0) return null;
    const choices = eventKinds(h);
    return this.begin(
      choices[Math.min(choices.length - 1, Math.floor(this.random() * choices.length))],
    );
  }
  /** Review hook bypasses the quiet gap, but never overlaps an active event. */
  preview(kind: ExploreEventKind): ExploreEvent | null {
    if (this.active) return null;
    return this.begin(kind);
  }
  private begin(kind: ExploreEventKind): ExploreEvent {
    this.active = { kind, elapsedS: 0, durationS: EXPLORE_CONFIG.eventDurationS };
    return this.active;
  }
  reset(): void {
    this.active = null;
    this.remainingS = this.wait();
  }
}
