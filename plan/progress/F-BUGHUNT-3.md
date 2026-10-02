# F-BUGHUNT-3 — verification of the latest merges

2026-10-02. Audited `git diff f3 HEAD` at `3549496`. Read
`plan/PHASE-F-PLAN.md` first. Findings concern repository behavior; site and
species names below identify game fixtures, not real-world factual claims. No
assets added, no source/test edits, no commit. The initial audit authored only
this report; the requested gate follow-up also formats `plan/OVERNIGHT-LOG.md`.

## Ranked findings

### 1. P1 — the hull-refit fix can cause immediate pressure failure

**New regression in F-BUGHUNT-2.** Locations:
`src/app/systems/submarine.ts:49`, `:64`; `src/sub/Submarine.ts:172`, `:388`;
`src/app/systems/mission.ts:51`.

A fresh Arcade pilot at the Titanic opening has Class B at 3,780.61 m game
depth. Selecting Realistic in Pause fits Class A without changing the pose.
One neutral `Submarine.step(input, 1 / 60)` then produces:

```text
canDive(targetDepth, 'realistic') = false
hullClass = A; crushDepth = -1100
hullBreached = true; emergencyBlow = true
depth = -3780.6054
```

This was executed with actual Save, Progress, submarine system, low-tier
terrain and procedural props. The same test breaches at the current openings
for Beebe, Bismarck, Challenger, Endurance, Axial and Kamaehuakanaloa. Switching
back to Arcade changes the rating but `setHullClass` does not clear the breach
or emergency state. This is no longer the old Class B/C entitlement bypass;
it is a failure caused by a settings edit.

The briefing has a second path: its preview/start helper uses the boot-time
`route.def.hull_class` for the classic approach, while the sub has the newly
fitted hull. Route access and briefing hull/hazard copy are only rewritten at
boot. A live change can therefore leave Begin available for a now-locked
mission, with an approach too deep for the current vehicle. The second-pass
execution gives `routeRetained=true, missionHull=B, fittedHull=A`, with a
3,778 m classic near-site start that breaches on its first tick. Returning to
Arcade then leaves `hull=B, hullBreached=true, emergencyBlow=true`.

**Reproduce:** fresh settings/research; `/?mission=titanic&tier=low`; Begin in
Arcade, Pause → Realistic → Resume. Also select Realistic on the original
Arcade briefing, then Begin. No debug rewards or teleports are required.

**Fix brief / acceptance:** choose a safe live-change policy. Defer hull/access
changes until a new dive, or return to a validated start/site selection before
applying a downgrade. Revalidate an open briefing and derive its pose/copy from
the effective hull. Tests must step physics after both mode-change directions,
including an active deep dive, a briefing and a deployed ROV; asserting only
`hullClass` misses this failure. Resume must not trigger an involuntary abort.

### 2. P1 — a locked Realistic link can initially spawn below its fitted hull's crush depth

**Existing progression/spawn defect still present.** Locations:
`src/app/systems/progress.ts:35`, `src/app/systems/submarine.ts:34`, `:62`;
`src/app/systems/props.ts:30`.

Boot converts a locked mission to a free dive and fits the research hull, but
the initial free-dive pose still comes from the deep tile's seabed. The optional
props callback may later move the sub upward through composed spawning; the
initial pose is already unsafe if a physics frame runs before it resolves.

Executed with a fresh Realistic save and the actual low-tier tiles:

| Locked mission fixture | Initial free-dive depth | Hull | First neutral step breaches |
| ---------------------- | ----------------------: | ---- | --------------------------- |
| Titanic                |              3,713.11 m | A    | Yes                         |
| Beebe                  |              4,901.50 m | A    | Yes                         |
| Bismarck               |              4,128.79 m | A    | Yes                         |
| Challenger             |             10,828.92 m | A    | Yes                         |
| Endurance              |              2,914.45 m | A    | Yes                         |
| Axial                  |              1,446.31 m | A    | Yes                         |

**Reproduce:** with 0 lifetime RP and Realistic saved, open
`/?mission=titanic&tier=low` or `/?tile=titanic&tier=low`; delay the props fetch.
The mission link becomes a free dive with an access notice, rather than a
briefing that freezes physics. Test the initial pose before props finish,
not only the final composed opening.

**Fix brief / acceptance:** fit the effective hull before selecting the initial
free-dive depth, then clamp the pose to its safe rating or route to a usable
shallow start. Optional loading must never be responsible for pressure safety.
Cover delayed, failed and absent props and verify several neutral physics ticks.

### 3. P1 — Monterey's Arcade mission still opens 14.66 km from the nearest primary

**Unresolved F-BUGHUNT-1 finding 2**, independently rechecked at this HEAD.
Locations: `src/app/systems/mission.ts:35`, `src/game/Spawn.ts:52`,
`data/landmarks/monterey-canyon/{mission,pois,props}.json`.

The low-tier hero opening is collision-free and correctly faces its set piece,
but its nearest authored primary is **14,660.18 m horizontally away**. It uses
the optional wall rather than a primary approach. The default 20.6 m/s speed
cap and 500 m extended scan radius give an optimistic **687 s / 11.5 minute**
transit before scanning even the nearest primary. Other checked openings have
nearby primaries; Titanic is 43.45 m, Beebe 40.38 m, Lost City 44 m.

**Fix brief / acceptance:** separate mission/free-dive composition, or constrain
mission composition to an incomplete primary. Keep the authored objectives.
Assert nearest-primary range as well as collision and camera framing in normal
near-site mission tests without URL position overrides.

### 4. P2 — Daily Low light enforcement omits the ROV lamps

**Newly reproduced integration gap.** Locations:
`src/app/systems/rov.ts:35`, `:37`; `src/app/systems/daily.ts:59`;
`src/rov/RovVisual.ts:63`.

Daily boot initially applies the realistic light profile to both vehicles.
The ROV's saved-gameplay listener subsequently installs the saved profile;
Daily enforcement restores only `ctx.headlights`. The ROV can therefore use
enhanced lamps during the same Low light run.

Executed with the real ROV and Daily systems and low-tier RovVisual:

```text
Daily Low light boot:     each ROV spot intensity 618.75, distance 80 m
Realistic → Arcade edit: each ROV spot intensity 1012.5, distance 100 m
submarine after edit:    still config.lightPresets.realistic
```

**Reproduce:** launch a Low light Daily, change the gameplay preset Realistic →
Arcade in Settings, then deploy ROV. The mode changes are legal; saved
preferences remain enhanced while the run-specific modifier should persist.

**Fix brief / acceptance:** use the effective Daily light profile for both
vehicles at boot and on gameplay/progress updates, without writing it into
saved preferences. Extend `dailySystem.test.ts` with actual ROV lamp values
after a settings change and a purchase; its current assertion observes only
the submarine's `headlights.setPreset`.

## Phone HUD: concrete constraints, rendered verification still required

**P2 verification priority.** Existing `f-hud-layout.spec.ts` covers 844×390
landscape, desktop and tablet; it has no portrait or narrower landscape overlap
case. Browser launch and localhost binding both fail in this sandbox, so no
rendered overlap/screenshot pass is claimed.

- At **390×844 portrait**, both collapsed sonar and free-dive readouts retain
  `top: 12px`: `sonar.css:15` places sonar at left 12 px; `flow.css:226` gives
  readouts width 360 px and right 12 px (left 18 px). Sonar is visible by default
  (`Sonar.ts:183`), with a default 220 px maximum canvas side. The portrait
  rules in `hud-layout.css:205` move only tutorial/scan elements. These boxes
  necessarily share horizontal/top space on this viewport. In a mission the
  objectives occupy the same right-side top region instead. This is a static
  layout defect left uncovered by the recent layout fix; measure actual bounds
  and assess obscured text outside this sandbox.
- The short-landscape center column in `hud-layout.css:92` is `100vw - 438px`:
  **229 px at 667×375**, **130 px at 568×320**. Tutorial buttons share an `auto`
  grid column without wrapping, while the scan panel reserves a 40 px ring,
  10 px gap and 18 px padding/border in the later HUD rules. Existing
  `explore.css` **does** provide touch text wrapping and a narrow-screen grid;
  do not remove those protections. There is a conflicting override: below
  700 px width its scan grid retains a **24 px first column**, but the more
  specific `hud-layout.css:193` resets the SVG ring to **40 px** with a
  **10 px gap**. The ring extends 6 px into the next column's allocation.
  Measure the kicker/ring children, not only the outer scan panel. Long text
  and UI scale 150% still need explicit rendered overflow checks.
- Portrait bottom offsets are fixed: scan 360 px, card 210 px, hint 300 px.
  A wrapped card over 150 px tall enters the scan panel's reserved band. Check
  all five tutorial steps, simultaneous hints, sample/animal scan names, power
  meters, warnings and safe-area insets. Current tests do not include sonar
  among their pairwise boxes, and mission cases omit the scan panel.

**Acceptance:** add 390×844, 320×568, 667×375 and 568×320 at UI scale 100%/150%;
measure child overflow as well as panel bounds, and include sonar, objectives,
scan, tutorial, stick, slider, buttons and Pause in applicable overlap checks.

## Checks that passed and boundaries

- **Daily UTC seed:** executed with the same instant `2026-10-02T00:15:00Z`
  under UTC, America/Chicago, Pacific/Honolulu, Pacific/Kiritimati and
  Asia/Kathmandu. All produce the same date, site, offset, heading, variant and
  modifier for the same access set. The captured boot date and existing
  midnight-crossing regression prevent the earlier mixed-date bug. Different
  research entitlements intentionally change the candidate sites even in
  Arcade; this is specified by F2-MODES, not a timezone defect.
- **Low-tier ambient fill:** executed 120 atmosphere/preset frames for Titanic
  and Beebe. Scene child/light counts are unchanged, preset stats stay
  `draws=0, particles=0, lights=0`; ambient intensity stays **19.18** and **8.18**
  respectively without accumulating. It updates the existing ambient light,
  not extra dynamic lights or a new fill shader. No GPU compilation/FPS claim
  is made. Hero `vertexGlow` adds fragment arithmetic separately and still
  needs a real phone profile.
- **Opening clearance:** all 13 sites' low-tier terrains/procedural props with
  the automatically fitted Arcade hull return non-null composed openings with
  no hull-radius prop collision. The unit suite also passes its terrain,
  camera-clearance and hero-projection checks. External GLBs and rendered
  occlusion are not certified by this headless geometry check.
- **Daily placement:** checked 31 October date seeds × 13 per-site fixtures ×
  near-site/surface starts: **806 poses**, no generated-prop hull collisions.
  These are forced per-site candidate fixtures, not a claim that every site
  is selected in October. Daily deliberately replaces the approach bearing
  with a full-circle seeded heading; **195/403** near-site fixtures point into
  the opposite horizontal hemisphere from their first primary. This is an
  authored feature/UX decision, not nondeterminism. Consider a seeded angle
  around the target-facing heading if hero-first readability should apply to
  Daily. Events still use Math.random; only the Daily descriptor/goals are
  certified deterministic.
- **Listener fixes:** 770/770 existing unit tests pass, including hull
  unsubscribe, Daily refresh/enforcement/timer disposal and camera reset-handler
  cleanup. No new live-console pass is possible here. F-BUGHUNT-1's deferred
  life-load and retained scanner-target disposal defects remain in
  `src/app/systems/life.ts`; they were not fixed by F-BUGHUNT-2's camera cleanup.
  Normal site changes reload the document, so this is not evidence of a leak
  accumulating during today's ordinary navigation.
- **Migration carry-forward:** Custom/Gentle/false-valued settings regressions
  pass. `migrateProgress` and `creditPreviousDives` still contain the previously
  reported partial-balance/token inconsistency and one-shot migration after a
  failed content fetch. Those are unresolved F-BUGHUNT-1 findings 4–5; the
  latest merges do not repair them. Its touch photo-exit finding also remains:
  PhotoMode still presents Capture and keyboard Escape, without a touch exit.

## Round record and validation

### Round 1

- Reviewed the requested merges and preceding audit/fix reports; reproduced
  findings 1–4 with actual runtime modules through Vite `ssrLoadModule`.
- Existing suite: `npx vitest run --configLoader runner --reporter=dot`:
  **77 files / 770 tests passed**. The runner loader avoids writing a Vite
  configuration bundle through the shared read-only node_modules symlink.
- Direct Chromium launch fails before a page opens; direct localhost probe
  returns `listen EPERM 127.0.0.1:4253`. No browser screenshots or live-console
  results are claimed.
- Required `tools/gates.sh --no-e2e`: **PASS Python, content, attribution**.
  Build and the ordinary unit command fail with **EROFS** on the shared
  node_modules config-bundle write. TypeScript checking completes before that
  build failure. Whole-repository Prettier fails on the untouched
  `plan/OVERNIGHT-LOG.md`; this report was formatted separately and is the only
  authored file. Browser gates omitted because browser/localhost probes fail.

### Round 2

- Executed the briefing downgrade and reverse-after-failure checks in finding
  1, confirming the surviving route and stale mission hull rather than merely
  predicting them from listener order.
- Rechecked the three changed hero sites with both **low/high** terrain and
  matching prop tiers at **1280×720, 667×375 and 390×844**: **18/18** pose,
  camera-terrain clearance and target-center projection checks pass. This is
  geometry/frustum validation, not a rendered occlusion or HUD pass.
- Reproduced the inherited migration defects: a seven-token completed fixture
  with corrupt numeric balances remains **0 RP / 0 lifetime** after migration
  and reward replay; unavailable → available content remains **20 RP**, with
  `legacyCredited=true` and **zero retry fetches**.
- Reproduced the deferred life teardown failure: initialize → dispose → resolve
  the held table fetch leaves **ctx.life present, one scene child and two bus
  subscriptions**. The new hull/Daily/camera cleanup tests do not cover this
  older failure.
- Corrected the scan-layout assessment after including the imported
  `explore.css`: touch text wrapping already exists, but the later 40 px ring
  override conflicts with its 24 px narrow-grid track. Do not brief a redundant
  text-wrapping fix.
- Separate **`npx tsc --noEmit` passes**. An alternate
  `npx vite build --configLoader runner --outDir /tmp/f-bughunt-3-build` gets past
  the read-only bundle write but fails in the PWA plugin's `closeBundle` hook
  with `Vite module runner has been closed`. No production-build pass is
  claimed; no configuration/source workaround was authored.
- Final `tools/gates.sh --no-e2e` has the same results as round 1: **PASS
  Python, content, attribution**; build/unit fail on the shared node_modules
  **EROFS** write, and whole-repository Prettier flags only the untouched
  `plan/OVERNIGHT-LOG.md`. **Targeted report Prettier and strict content checks
  pass** (all 13 sites, zero errors/warnings). `git diff --check` passes and
  `git status --short` shows only this new report. No source fixes or new
  authored tests in either round.

### Orchestrator gate follow-up

- The orchestrator's unrestricted `tools/gates.sh` run reports **PASS build,
  unit, Python, content, attribution, e2e and e2e-base**. These supplied results
  supersede the sandbox's build/browser availability limitations; they do not
  invalidate the separately reproduced audit findings or provide new phone
  screenshots.
- Its only failure is Prettier on `plan/OVERNIGHT-LOG.md`. Fixed the actual
  flagged file with `npx prettier --write plan/OVERNIGHT-LOG.md`; no formatter
  configuration, gate commands or test assertions were changed.
- Local **`npm run format:check` passes across the whole repository** and
  **`npm run check:content` passes** for all 13 sites with zero errors/warnings.
  `git diff --check` passes. `git diff --ignore-all-space --exit-code --
plan/OVERNIGHT-LOG.md` confirms the log change is whitespace-only. No commit
  made. The orchestrator can rerun its full gates to verify the combined result.

## Orchestrator decisions

1. Choose a safe active-dive/briefing policy for a hull-rating downgrade; the
   current immediate refit is unsafe below the new crush depth.
2. Keep cinematic mission openings near a primary, especially Monterey.
3. Decide whether Daily's random heading should preserve target visibility;
   retain UTC dates and the explicitly intended research-entitlement filtering.
4. Run the phone layout/render/console checks in an unrestricted browser;
   prioritize portrait sonar/readouts and narrow-landscape child overflow.
