# F2-LIFE: marine life engine

Branch `claude/f2-life` (worktree `/home/vijay/subexp-wt/f2-life`).

## Done

- `src/world/life/`: sim (`LifeSim`), steering (`steer`), instanced renderer with vertex animation (`LifeRender`), bioluminescence sparks (`Sparks`), species catalogue (`catalogue`, `catalogueInvert`), procedural models (`models/*`), spawn tables (`tables`), the `Life` facade and an app system (`src/app/systems/life.ts`).
- 8 movement archetypes, about 30 species, tables for all 13 sites from `data/life/life.json`, one rare encounter per site (chance per minute plus cooldown).
- Tier budgets: low 4 species meshes + sparks (at most 5 draw calls), up to 11 species + sparks on medium/high/ultra (at most 12). Checked in e2e on low (Monterey) and high (seven sites).
- Scan: animals are extra scanner targets (POIs always win), first scan adds a Journal wildlife entry and banner, persisted. Photo mode caption names the animal in frame.
- `preview/life.html` lineup; species screenshots in `.cache/codex/shots/f2-life/cu/`.
- Tests: `tests/unit/lifeSim.test.ts`, `tests/unit/lifeTables.test.ts` (30 tests), `tests/e2e/f2-life.spec.ts` (spawn and budget, scan and Journal, photo, rare encounter plus screenshot at seven sites).
- This session: merged main; fixed the rare encounter being swallowed when the agent pool is full (`makeRoom` releases the farthest animals); made the scan e2e robust (spawn closer, since animals drift); added the per-site e2e and screenshots `site-*.png`.

## Cuts

None beyond what the CHANGELOG lists. Journal player text carries no "illustrative" caveats.

## Known issues

- Large rare animals (whales, sharks) and the tiny dumbo octopus are small or out of the lights in the site screenshots; a hand-framed hero shot per rare would look better.
- Fog glare makes some deep midwater frames pale around the lights (an F1-OCEAN tuning matter, not life).
- The photo test relies on the orbit camera; it passes but is sensitive to camera changes.
