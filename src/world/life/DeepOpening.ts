import { Raycaster, Vector3 } from 'three';
import { DEEP_OPENINGS, deepOpeningFor } from '../../core/Config.js';
import type { Props } from '../Props.js';
import type { LifeSim } from './LifeSim.js';
import type { SubInfo } from './agent.js';
import { entryBand, inBand } from './tables.js';

/** One staged group beside the approach, using the normal pool, depth bands and steering. */
export function populateDeepOpening(
  site: string,
  sim: LifeSim,
  sub: SubInfo,
  props: Pick<Props, 'placed' | 'collide'>,
): void {
  const tuning = deepOpeningFor(site);
  if (!tuning) return;
  const hero = props.placed.find((p) => p.def.id === tuning.hero);
  if (!hero || Math.hypot(sub.x - hero.root.position.x, sub.z - hero.root.position.z) > 100) return;
  const spec = tuning.habitat;
  const row = sim.activeRows.find((r) => r.def.id === spec.species);
  const band = row && entryBand(row);
  if (!row || !band) return;
  const horizontal = Math.hypot(sub.fx, sub.fz);
  if (horizontal < 0.01) return;
  const fx = sub.fx / horizontal;
  const fz = sub.fz / horizontal;
  const x = sub.x + fx * spec.aheadM - fz * spec.sideM;
  const z = sub.z + fz * spec.aheadM + fx * spec.sideM;
  const y = sim.env.groundAt(x, z) + (row.def.altitude?.[0] ?? 0);
  if (!inBand(-y, band) || Math.hypot(x - sub.x, y - sub.y, z - sub.z) > sim.tier.radius * 0.9)
    return;
  const count = sim.tier.detail === 0 ? spec.low : spec.count;
  // Reject the whole patch if any individual would overlap the wreck or leave its depth band.
  let positions = Array.from({ length: count }, (_, i) => {
    const px = x + ((i % 3) - 1) * spec.spacingM;
    const pz = z + (Math.floor(i / 3) - (Math.ceil(count / 3) - 1) / 2) * spec.spacingM;
    return new Vector3(px, sim.env.groundAt(px, pz) + (row.def.altitude?.[0] ?? 0), pz);
  });
  if (spec.onWreck) {
    // Sessile animals attach to actual timber instead of floating above the mud.
    const hull = hero.root.getObjectByName('endurance-hull');
    if (!hull) return;
    hero.root.updateMatrixWorld(true);
    const patch = DEEP_OPENINGS.endurance.deckPatch;
    const ray = new Raycaster();
    const deck: Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const origin = hero.root.localToWorld(
        new Vector3(
          patch.x + ((i % 3) - 1) * spec.spacingM,
          patch.castHeightM,
          patch.z + (Math.floor(i / 3) - 1) * patch.rowSpacingM,
        ),
      );
      ray.set(origin, new Vector3(0, -1, 0));
      ray.far = patch.castHeightM;
      const hit = ray.intersectObject(hull, true)[0];
      if (!hit) return;
      deck.push(hit.point);
    }
    positions = deck;
  }
  if (
    positions.some(
      (p) =>
        !inBand(-p.y, band) ||
        p.distanceTo(new Vector3(sub.x, sub.y, sub.z)) > sim.tier.radius * 0.9 ||
        (!spec.onWreck && props.collide(p.clone().add(new Vector3(0, 1, 0)), 1, new Vector3())),
    )
  )
    return;
  const group = sim.placeGroup(row.def, row, x, y, z, count, true);
  if (!group) return;
  for (const [i, a] of group.members.entries()) {
    const p = positions[i]!;
    a.x = p.x;
    a.y = p.y;
    a.z = p.z;
    a.alt = p.y - sim.env.groundAt(p.x, p.z);
  }
}
