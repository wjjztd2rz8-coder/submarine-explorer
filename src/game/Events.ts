import { EXPLORE_CONFIG } from '../core/config/explore.js';
import { siteManifest } from '../core/SiteManifest.js';
export type ExploreEventKind = 'plume' | 'turbidity' | 'whale';
interface EventHabitat {
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
  plume: 'Vent plume: warm mineral-rich water rises from the seabed',
  turbidity: 'Silt cloud: sediment-laden water flows downslope',
  whale: 'Whale passing: whales use canyon waters to find food',
};
export function eventKinds(h: EventHabitat): ExploreEventKind[] {
  const events = siteManifest(h.site)?.events;
  const kinds: ExploreEventKind[] = [];
  if (events?.plume && h.altitudeM < events.plume.maxAltitudeM) kinds.push('plume');
  if (events?.turbidity && h.altitudeM < events.turbidity.maxAltitudeM) kinds.push('turbidity');
  if (events?.whale && h.depthM < events.whale.maxDepthM) kinds.push('whale');
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
    if (!choices.length) {
      this.remainingS = this.wait();
      return null;
    }
    return this.begin(
      choices[Math.min(choices.length - 1, Math.floor(this.random() * choices.length))],
    );
  }
  /** Review hook bypasses the quiet gap, but never overlaps an active event. */
  preview(kind: ExploreEventKind): ExploreEvent | null {
    if (this.active || !Object.hasOwn(EVENT_CAPTIONS, kind)) return null;
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
