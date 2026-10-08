import { Vector3 } from 'three';
import { MONTEREY_OPENING } from '../../core/Config.js';
import type { Props } from '../Props.js';
import type { LifeSim } from './LifeSim.js';
import type { SubInfo } from './agent.js';
import { entryBand, inBand } from './tables.js';

/** Populate the opening bend only; all groups use normal steering, scans and tier caps. */
export function populateMontereyOpening(
  sim: LifeSim,
  sub: SubInfo,
  props: Pick<Props, 'placed' | 'collide'>,
): void {
  const ledge = props.placed.find((p) => p.def.id === 'canyon-wall-ledge');
  if (
    !ledge ||
    Math.hypot(sub.x - ledge.root.position.x, sub.z - ledge.root.position.z) >
      MONTEREY_OPENING.habitatRadiusM
  )
    return;
  const position = new Vector3();
  const normal = new Vector3();
  for (const spec of MONTEREY_OPENING.groups) {
    const row = sim.activeRows.find((r) => r.def.id === spec.species);
    if (!row) continue;
    const band = entryBand(row);
    if (!band) continue;
    const [ox, oy, oz] = spec.offset;
    const x = sub.x + ox;
    const z = sub.z + oz;
    const floor = sim.env.groundAt(x, z);
    const def = row.def;
    const y = def.archetype === 'school' ? sub.y + oy : floor + (def.altitude?.[0] ?? 0);
    if (!inBand(-y, band) || Math.hypot(x - sub.x, y - sub.y, z - sub.z) > sim.tier.radius * 0.9)
      continue;
    const count = sim.tier.detail === 0 ? spec.low : spec.count;
    const radius =
      def.archetype === 'school' ? Math.cbrt(count) * def.size * def.visScale * 2.6 : 8;
    if (y < floor + (def.archetype === 'school' ? radius : 0)) continue;
    position.set(x, y + (def.archetype === 'sessile' ? radius : 0), z);
    if (props.collide(position, radius, normal)) continue;
    const group = sim.placeGroup(def, row, x, y, z, count, true);
    if (!group) continue;
    // Keep the shoals travelling north along the local canyon axis.
    if (def.archetype === 'school') {
      group.gx = x;
      group.gz = z - MONTEREY_OPENING.schoolRunM;
      group.goalIn = MONTEREY_OPENING.schoolHoldS;
      for (const a of group.members) {
        a.hd = a.yaw = Math.PI;
        a.vx = 0;
        a.vz = -def.speed[0];
      }
    }
    if (def.archetype === 'sessile') {
      group.cell = 'monterey-opening';
      for (const [i, a] of group.members.entries()) {
        a.x = x + ((i % 3) - 1) * MONTEREY_OPENING.penSpacingM;
        a.z = z + (Math.floor(i / 3) - 1) * MONTEREY_OPENING.penSpacingM;
        a.y = sim.env.groundAt(a.x, a.z);
      }
    }
  }
}
