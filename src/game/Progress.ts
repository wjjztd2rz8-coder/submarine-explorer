import type { GameConfig, GameplayOptions } from '../core/Config.js';
import { PROGRESS_CONFIG, UPGRADES, type UpgradeId } from '../core/config/progress.js';
import { ProgressSave, type GameplayMode, type ProgressRecord } from '../core/Save.js';

export type AwardKind = keyof typeof PROGRESS_CONFIG.rewards;
export interface DiveRating {
  stars: number;
  points: number;
  best: number;
}
export interface RatingObjective {
  primary: boolean;
  complete: boolean;
}
export function diveStars(
  objectives: readonly RatingObjective[],
  bonus: boolean,
  aborted = false,
): number {
  const primary = objectives.filter((o) => o.primary);
  if (aborted || !primary.length || primary.some((o) => !o.complete)) return 0;
  if (objectives.some((o) => !o.primary && !o.complete)) return 1;
  return bonus ? 3 : 2;
}
export function requiredHull(depthM: number) {
  return PROGRESS_CONFIG.hulls.find((h) => depthM <= h.depthM) ?? PROGRESS_CONFIG.hulls[2];
}

/** Idempotent rewards, best-site ratings and upgrades; independent of DOM and rendering. */
export class Progress {
  private data: ProgressRecord;
  private readonly listeners = new Set<() => void>();
  private readonly tokens: Set<string>;
  /** Current-dive photo/species goal, including repeat subjects on return dives. */
  bonus = false;
  divePoints = 0;
  constructor(
    readonly save = new ProgressSave(),
    discoveries: readonly string[] = [],
  ) {
    this.data = save.get();
    this.tokens = new Set(this.data.awarded);
    for (const key of discoveries) this.credit('poi', key);
  }
  snapshot(): ProgressRecord {
    return structuredClone(this.data);
  }
  get legacyCredited(): boolean {
    return this.data.legacyCredited;
  }
  completeLegacyCredit(): void {
    if (!this.save.readOnly) this.data.legacyCredited = true;
    this.persist();
  }
  get points(): number {
    return this.data.points;
  }
  get lifetime(): number {
    return this.data.lifetime;
  }
  get hull() {
    return [...PROGRESS_CONFIG.hulls].reverse().find((h) => this.lifetime >= h.threshold)!;
  }
  /** Without a mode, report the research entitlement. Only Realistic uses it as a gate. */
  canDive(depthM: number, mode: GameplayMode = 'realistic'): boolean {
    return mode !== 'realistic' || depthM <= this.hull.depthM;
  }
  hullFor(depthM: number, mode: GameplayMode = 'realistic'): string {
    return this.canDive(depthM, mode) ? requiredHull(depthM).id : this.hull.id;
  }
  rating(site: string): number {
    return this.data.ratings[site] ?? 0;
  }
  level(id: UpgradeId): number {
    return Math.min(UPGRADES.find((u) => u.id === id)!.costs.length, this.data.upgrades[id] ?? 0);
  }
  cost(id: UpgradeId): number | null {
    return UPGRADES.find((u) => u.id === id)!.costs[this.level(id)] ?? null;
  }
  award(kind: AwardKind, id: string): number {
    if (!id || id.length > 280 || this.save.readOnly) return 0;
    if (kind === 'photo' || kind === 'species') this.bonus = true;
    const key = `${kind}:${id}`;
    if (this.tokens.has(key)) return 0;
    this.tokens.add(key);
    const amount = PROGRESS_CONFIG.rewards[kind];
    this.data.points += amount;
    this.data.lifetime += amount;
    this.divePoints += amount;
    this.persist();
    return amount;
  }
  /** Old discoveries count toward unlocks, without becoming this dive's bonus or earnings. */
  credit(kind: AwardKind, id: string): void {
    const points = this.divePoints;
    const bonus = this.bonus;
    this.award(kind, id);
    this.divePoints = points;
    this.bonus = bonus;
  }
  beginDive(): void {
    this.bonus = false;
    this.divePoints = 0;
  }
  finish(site: string, objectives: readonly RatingObjective[], aborted = false): DiveRating {
    const stars = diveStars(objectives, this.bonus, aborted);
    if (stars > 0) this.award('primary', site);
    for (let i = 1; i <= stars; i++) this.award('rating', `${site}/${i}`);
    if (!this.save.readOnly) this.data.ratings[site] = Math.max(this.rating(site), stars);
    this.persist();
    return { stars, points: this.divePoints, best: this.rating(site) };
  }
  buy(id: UpgradeId): boolean {
    const cost = this.cost(id);
    if (this.save.readOnly || cost === null || cost > this.points) return false;
    this.data.points -= cost;
    this.data.upgrades[id] = this.level(id) + 1;
    this.persist();
    return true;
  }
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private persist(): void {
    this.data.awarded = [...this.tokens];
    this.save.save(this.data);
    for (const listener of this.listeners) listener();
  }
}

/** Reapply from a pristine baseline: purchases and mode changes never compound multipliers. */
export function applyProgress(
  config: GameConfig,
  base: GameConfig,
  progress: Progress,
  gameplay: GameplayOptions,
): void {
  const factor = (id: UpgradeId) =>
    1 + progress.level(id) * UPGRADES.find((u) => u.id === id)!.step;
  for (const key of Object.keys(base.speedProfiles) as GameplayOptions['speedProfile'][]) {
    const profile = base.speedProfiles[key];
    config.speedProfiles[key] = {
      ...profile,
      thrustAccel: profile.thrustAccel * factor('thrust') ** 2,
      maxSpeed: profile.maxSpeed * factor('thrust'),
      cruiseSpeed: profile.cruiseSpeed * factor('thrust'),
      yawRate: profile.yawRate * factor('turn'),
      reverseAccel: profile.reverseAccel * factor('reverse'),
    };
  }
  for (const key of Object.keys(base.lightPresets) as GameplayOptions['lights'][]) {
    const light = base.lightPresets[key];
    config.lightPresets[key] = {
      ...light,
      distance: light.distance * factor('light-range'),
      angleDeg: light.angleDeg + progress.level('light-beam') * UPGRADES[1].step,
    };
  }
  for (const key of Object.keys(base.sensorPresets) as GameplayOptions['sensors'][]) {
    const sensor = base.sensorPresets[key];
    config.sensorPresets[key] = {
      ...sensor,
      sonarPoiRange: sensor.sonarPoiRange * factor('sonar-range'),
      scanRadiusMultiplier: sensor.scanRadiusMultiplier * factor('sonar-detail'),
      hintRangeMultiplier: sensor.hintRangeMultiplier * factor('sonar-detail'),
    };
  }
  Object.assign(config.power, base.power);
  for (const key of [
    'batteryIdleHours',
    'batteryThrustHours',
    'batteryLightsHours',
    'batterySensorsHours',
  ] as const)
    config.power[key] *= factor('battery');
  config.power.oxygenHours *= factor('oxygen');
  config.power.boostCostMultiplier /= factor('boost');
  Object.assign(config.submarine, config.speedProfiles[gameplay.speedProfile]);
  config.scan.hintRangeFactor = base.scan.hintRangeFactor * factor('sonar-detail');
}
