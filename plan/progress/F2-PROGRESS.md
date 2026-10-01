# F2-PROGRESS — gate repairs ready; browser rerun pending

## Player-visible work

- Research points: POI 10, objective 5, new species 15, new subject photo 10,
  primary completion 30 and each improved site-rating star 20. Stable reward IDs
  prevent repeat farming. `ctx.progress.award(kind, id)` / `window.__game.progress`
  is available for F2-LIFE's species and animal-photo hooks.
- Ten upgrades, with 2–3 levels in Lights, Sonar, Power and Propulsion. Home and
  Pause open a scrollable workshop with costs, effects and 44 px buttons. Purchases
  apply immediately and survive mode changes and reloads. Battery/oxygen affect
  Realistic; boost duration also matters in Arcade.
- Class A starts at 1,000 m; B unlocks at 300 lifetime RP (6,500 m), C at 900 RP
  (11,000 m). Buying upgrades does not delay unlocks. Four starters are available:
  Great Blue Hole, Hunga Tonga, Blake Plateau corals and Lost City. A representative
  full-dive route unlocks B after three sites and C after eight.
- Mission cards display locks/requirements and best stars. Globe pins also enforce
  locks. Free dive visits any survey using an unlocked hull; shared locked mission
  links become a rated free dive with a dismissible explanation. Existing vehicle
  models follow the fitted class. Briefing hull ratings match that selection.
- Debrief: primaries = one star, all secondaries = two, plus a photographed subject
  or species scan = three. Aborts/unfinished primaries earn no stars. Best ratings
  persist, and only improvements earn additional rating RP.

## Files

- `src/game/Progress.ts`: reward ledger, purchases, ratings, hull access and effects.
- `src/game/ProgressMigration.ts`, `src/core/Save.ts`: versioned progress save and
  retroactive discovery/objective/photo/completion/rating credit. Boot waits for
  migration before access checks; a saved marker prevents migration from granting
  ratings for later dives. Discovery and photo records are never rewritten.
- `src/core/config/progress.ts`: rewards, thresholds, upgrade costs/effects, boost.
- `src/app/systems/progress.ts`: config/application hooks, workshop and launch gates.
- `src/ui/Upgrades.ts`, `src/styles/upgrades.css`: workshop and progression styles.
- `src/ui/MissionSelect.ts`, `src/ui/Debrief.ts`: locks, hull limits and ratings.
- Unit tests cover save safety, repeat rewards, migration, purchases, config effects,
  unlock pacing, ratings and boost recovery. `tests/e2e/f2-progress.spec.ts` covers
  real scans, photo capture, live lamp upgrade, stars, locks, phone layout, old-save
  credit and the species hook. It writes five screenshots to
  `.cache/codex/shots/f2-progress/` when run.

## Checks

After the orchestrator's gate feedback, `tools/gates.sh --no-e2e` passes:

- PASS: build, unit (621 tests / 60 files), Python, content, attribution, Prettier.
- PASS: project-base build (`VITE_BASE=/submarine-explorer/`).
- PASS: new Playwright spec collection (`--list`): five tests.
- PASS: `git diff --check`.

The orchestrator's latest browser run passed 137 tests with one skipped and one
failure in the new progression flow. That flow reached scans, earned 90 RP, bought
the lamp upgrade, checked the effect and freeze, and captured its subject photo;
it then timed out trying to surface while photo mode remained open. Browser runs
remain unavailable inside this sandbox, so the repaired flow still needs an
orchestrator rerun. The earlier e2e-base run passed; the latest run was stopped by
the now-corrected regression test type errors.

The supplied workshop screenshots (desktop after purchase and phone) and phone
mission-select screenshot were visually reviewed. Costs, hull requirements and
levels are readable, with the panel scrolling on the phone. The desktop debrief
and mission-select screenshots with earned stars still require the repaired test
to reach its final assertions and captures.

## Gate repairs

- `tests/e2e/helpers/scanAim.ts` and `tests/e2e/f2-progress.spec.ts`: aim at contacts
  in three dimensions. A safe spawn on Blake Plateau's slope was above the target,
  leaving a horizontal heading outside the existing scan cone. The helper now
  waits for the exact candidate and discovery with local timeouts.
- `tests/unit/progressScan.test.ts`: uses actual Blake terrain and normal submarine
  physics to reproduce the horizontal-aim failure, scan all four intended contacts
  with the corrected aim, and check the pitch limit. Removed an unused import and
  fixed `Submarine.step(input, dt)` argument order; all three regressions pass.
- The progression e2e flow now waits for photo mode to be hidden after P before
  pressing Escape, then asserts pause is visible. P is processed on the next frame;
  sending Escape immediately could exit photo mode first, then P reopened it.
- No gameplay assertions were removed or relaxed, no production behavior changed
  in this repair, and no new ownership deviations were needed.

## Deviations and integration notes

Minimal wiring beyond the ownership list:

- `src/app/boot.ts`, `context.ts`, `systems.ts`: await migration, publish handles,
  register the new system before config consumers.
- `src/app/systems/mission.ts`, `src/game/MissionRouter.ts`: optional debrief-rating
  callback; `shell.ts`: Escape ignores the shell while the workshop is open.
- `src/core/config/progress.ts`: required per-domain tuning home.
- `src/ui/MissionSelect.ts`: required locks/stars; `Globe.ts`: closes the globe
  launch bypass and keeps locked requirements keyboard-readable.
- `docs/architecture.md`: save/API/integration contract; `CHANGELOG.md`: additions
  and the cut from unrestricted free-dive hulls/unlimited boost.

Existing e2e feature specs import `helpers/unlocked.ts`, which seeds an experienced
pilot (900 lifetime RP, no upgrades). Existing behavioral assertions remain intact;
Home's exact button count changes from six to seven for Upgrades. The new progression
spec uses fresh-player storage. Other packages editing those specs should preserve
this fixture import when merging.

The shared node_modules symlink was replaced with a local ignored copy to let Vite
write its config cache; no dependency manifest changed. No git commit was made.
