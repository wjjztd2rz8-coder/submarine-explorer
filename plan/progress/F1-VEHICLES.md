# F1-VEHICLES: procedural vehicles and cockpit

Status: done. Screenshots: `.cache/codex/shots/f1-vehicles/` (in-game hulls,
cockpit and ROV from `tests/e2e/f1-vehicles.spec.ts`; the kit preview renders
`hulls-all.png`, `rov-tether-preview.png` and the low-tier LOD).

## Done

- `src/vehicles/` kit: `hulls.ts` (three blueprints), `parts.ts`, `kit.ts`
  (merge by material slot, so draw calls stay low), `materials.ts` (camera key
  plus fresnel rim so hulls read in dark water), `textures.ts`, `decals.ts`,
  `Wash.ts` (thruster wash and bubbles), `Vehicle.ts` (animation state),
  `rov.ts`, `tether.ts`, `cockpit.ts`.
- `sub/SubMesh.ts` and `rov/RovVisual.ts` sit on the kit with their public API
  unchanged. The hull class follows the fitted physics hull.
- Cockpit: first-person view frames the viewport; controls unchanged (arcade).
- Tiers: low builds a simplified LOD (no textures, arms baked in, no wash or
  decals, line tether); medium/high/ultra scale tether segments and detail.
- Fixes this pass: ROV top and bow-area clipped to flat white inside the
  boat's own headlight beams. Added a highlight shoulder to the lit vehicle
  materials and moved the ROV fill light back. Prettier fix in `kit.ts`.
- New e2e `tests/e2e/f1-vehicles.spec.ts` (all three hulls, cockpit, ROV).

## Deferred

- Interior detail seen from the cockpit is minimal (viewport frame and a strip
  of console at the bottom edge); no visible pilot, gauges or interior lighting.
- The chase camera sits far out at default zoom, so the hull detail is best
  seen in photo (orbit) mode. Camera distance belongs to `sub/CameraRig.ts`.
- Class-specific livery variants and unlockable paint are not built.

## Known issues

- The ROV top face still reads flat orange from a high chase angle: the
  shoulder trades highlight detail for no clipping.
- Sub headlights stay on the mothership while the ROV is deployed, so the ROV
  is lit from behind by both rigs; a dedicated ROV lighting balance would need
  a `Headlights` change (not this lane).
- The e2e preview server serves `dist`, so screenshots need `npm run build`
  first.
