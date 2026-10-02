# F-BUGHUNT-1 — verification of the merged Phase F work

Audited HEAD `4b83c98` against tag `f1`, on 2026-10-02. Read
`plan/PHASE-F-PLAN.md` before inspecting the changes. This is a documentation-only
audit: no source changes, added assets, source-test edits or commits.

## Ranked findings

Priority: **P1** blocks or severely delays an ordinary player flow; **P2** breaks a
feature contract, recovery or teardown; **P3** is a smaller issue or performance
hotspot without measured device impact. A code-path finding
is distinguished from an executed logic reproduction. Browser-only outcomes still
need an orchestrator playtest.

| Rank | Priority | Finding                                                                        | Evidence                                                 |
| ---- | -------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 1    | P1       | The new touch tutorial recommends PHOTO, which still has no touch exit         | Current code path; inherited F1B finding                 |
| 2    | P1       | Monterey's composed Arcade mission starts 14.66 km from its nearest primary    | Actual tile/prop geometry and fitted-hull reproduction   |
| 3    | P2       | Live Arcade → Realistic changes retain an unearned deep hull                   | Executed Save/modes/Submarine reproduction               |
| 4    | P2       | Partially corrupt research saves retain reward tokens but erase their balances | Executed migration/reward reproduction                   |
| 5    | P2       | One failed content fetch permanently completes legacy credit                   | Executed two-attempt migration reproduction              |
| 6    | P2       | Life disposal permits late recreation and retains stale scanner targets        | Executed deferred-fetch and loaded-dispose reproductions |
| 7    | P3       | Life scan-target refresh allocates a map every frame, including frozen frames  | Executed allocation counter; source inspection           |

### 1. Touch PHOTO remains a trap, now explicitly recommended by onboarding

**Locations:** `src/ui/TutorialCard.ts:45`, `src/ui/TouchControls.ts:153`,
`src/ui/PhotoMode.ts:90`, `src/app/systems/photo.ts:105`.

Step 5 now tells touch players to tap PHOTO. Entering photo mode hides the entire
touch root, including PHOTO and PAUSE. The photo overlay provides Capture, with
the text “Esc: exit photo mode”; it creates no exit button. The remaining exit
paths require keyboard/gamepad input or a separate app-state change. A touch-only
player cannot use the displayed controls to resume the dive.

**Reproduce:** open a dive with `?touch=1`; reach the final tutorial step or tap
PHOTO directly. Capture a photo, then try to return to piloting using touch alone.
The tutorial may finish, but the player remains frozen in photo mode. This is an
unresolved F1B issue (`plan/progress/F1B-AUDIT.md:107`), not a claim that the photo
overlay itself changed after `f1`. The newly merged instruction directs players
into it; the onboarding touch e2e skips the tutorial instead of completing it.

**Fix brief / acceptance:** add a visible, labelled, 44 px touch exit control
wired to `ctx.exitPhotoMode`; adapt the photo help text. Complete all tutorial
steps and PHOTO → Capture → Exit → move in a touch test without keyboard events.
Keep the Journal alternative available.

### 2. Mission “near-site” now substitutes a free-dive hero opening

**Locations:** `src/app/systems/mission.ts:35`, `src/game/Spawn.ts`
(`composedFreeDiveSpawn`), `data/landmarks/monterey-canyon/{mission,pois,props}.json`.

When Arcade is selected and props have loaded, `applyMissionStart` prefers the
hero opening over `missionStartPose`. The latter follows the first primary;
the hero picker has no mission-objective constraint. On the actual low-tier
Monterey terrain and generated props, with the correctly fitted Class B hull,
the composed start is **17,510 m horizontally from `canyon-head` and 14,660 m from
`upper-channel`**. Those are the two primaries. It is at the optional wall set
piece, while both required goals are elsewhere in the authored data.

Default Arcade uses Fast, 1× simulation speed and no currents. With no upgrades,
its 20.6 m/s speed cap and the extended 500 m scan radius impose a best-case
horizontal transit of `(14660 - 500) / 20.6 = 687 s`, **about 11.5 minutes** before
the nearest primary can be scanned. Acceleration, turning and depth change can
only add time under those settings. This is a substantial regression from the
previous near-primary approach, not a claim that the goal is impossible.

**Reproduce:** new-player Arcade, `/?mission=monterey-canyon&tier=low`, normal
near-site start, wait for props and Begin dive. Inspect both primary ranges; do
not use `?poi=`, `?at=` or `?depth=`. A logic test can build the actual Terrain and
procedural Props, call `composedFreeDiveSpawn` with Class B's rated depth, then
convert the authored POI coordinates using `latLonToWorld` and measure X/Z range.

The opening tests verify hero framing and clearance; they do not verify primary
goal proximity. The late `props:loaded` handler can also apply the hero start
after the initial approach was selected if the pilot has moved less than 2 m.

**Fix brief / acceptance:** constrain mission composition to a useful approach to
an incomplete primary, or compose separate mission and free-dive openings. Keep
the authored goals fixed. Assert distance to the nearest primary in mission-start
tests, and check the resulting nav arrow without `?poi=`/`?at=` overrides.

### 3. Switching to Realistic leaves the Arcade hull fitted

**Locations:** `src/app/systems/submarine.ts:47`,
`src/app/systems/modes.ts:47`, `src/app/systems/progress.ts:156`.

Hull fitting and route rejection happen at boot. Live mode changes update
propulsion, descent, lights, sensors and UI access, but never fit another hull
or revalidate the active mission. Start a new player at a deep site in Arcade,
then choose Realistic in Dive settings or Pause. The workshop/site list says the
site is locked, but the existing sub retains its Class C hull.

**Executed result:** using actual `Save`, `modesSystem`, `Progress` and `Submarine`
with 0 lifetime RP, fit the hull for a 10,931 m Arcade dive and call
`save.setGameplayMode('realistic')`:

```text
canDive: false
hull: C
rated: -11000
```

This bypass does not require editing a save or using a debug reward hook. The
reverse transition also keeps the previously fitted shallow hull until reload.
The second executed check started with Realistic Class A and switched to Arcade:
`canDive(10931, 'arcade') === true`, but the fitted hull remained A, rated -1,000 m.

**Decision / acceptance:** define whether a mode change applies to this dive or
the next. Either revalidate/refit safely before starting/resuming, or clearly
defer hull/access changes until a new dive. Do not quietly refit a low-rated hull
while the sub is already deep. Test both directions from the briefing and Pause.

### 4. Partial save corruption creates an unrecoverable reward ledger

**Locations:** `src/core/Save.ts:370`, `src/game/Progress.ts:91`,
`src/game/ProgressMigration.ts:14`.

`migrateProgress` replaces malformed `points` and `lifetime` with zero but keeps
valid `awarded`, `ratings` and `legacyCredited: true`. Rewards remain consumed,
and boot skips retroactive recovery. A returning player loses research hull
access while rediscovering their previous subjects yields zero RP.

**Executed result:** create a completed two-objective fixture worth 100 RP and
two stars (seven reward tokens), change only its two numeric balance fields to
`"corrupt"`, load it, run migration and replay every reward:

```text
points: 0
lifetime: 0
tokens: 7
stars: 2
```

The game survives corrupt JSON and unavailable storage; this finding concerns
a partially valid document whose fields contradict each other.

There is a related recovery edge when the research blob is completely missing or
corrupt but modern discovery records survive: migration treats **every** discovery
key as a POI. A fixture containing `life:comb-jelly`, `secret:arch` and
`sample:sediment` receives three generic POI tokens and 30 RP, instead of species /
secret / sample credit (15 + 15 + 10). Later normal scans can add differently named
tokens for the same discoveries. Typed restoration must recognise these prefixes
and the global species-reward identity; this is not exercised by the existing
legacy-only fixtures.

**Fix brief / acceptance:** establish a recoverable invariant between validated
tokens, lifetime, balances and purchased levels. Recover a safe lifetime lower
bound from recognised reward tokens, or explicitly rebuild the damaged portion
without duplicating valid awards. Preserve future-version saves. Add a partial
corruption test, beyond the existing empty/default migration tests.

### 5. Transient mission-content failures permanently suppress legacy rewards

**Locations:** `src/game/ProgressMigration.ts:22` and `:39`,
`tests/unit/progressMigration.test.ts:45`.

A failed `loadMission` returns early for that site, but the function still saves
the global `legacyCredited` flag. On every subsequent launch the first guard
skips the site, even when its content fetch succeeds. Existing discoveries earn
their POI credit, but objective/completion/rating credit is lost until the player
actually repeats the dive. This can postpone the promised returning-player hull
unlock.

**Executed result:** the same completed two-objective fixture has:

```text
first migration with unavailable content: 20 RP, legacyCredited=true
retry with successful content: 20 RP, fetch calls=0
control with successful content initially: 100 RP, two stars
```

The current unavailable-pack unit test checks the first 10 RP and never retries.

**Fix brief / acceptance:** track pending per-site migration, retry transient
failures and distinguish truly absent optional content from a failed fetch.
Keep already issued tokens idempotent. Test unavailable → available across reload
without requiring another player scan.

### 6. Deferred life load leaks scene objects and listeners after dispose

**Locations:** `src/app/systems/life.ts:51` and `:108`.

`dispose` clears only objects/subscriptions that already exist. The unguarded
`loadLifeDoc().then(...)` later creates a `Life`, adds it to the old scene, sets
the old scanner's targets and installs two new bus subscriptions. The exploration
system has a disposed guard; the life system does not.

**Executed result:** hold the life fetch promise; call `init`, then `dispose`;
resolve valid content and flush microtasks:

```text
lifeRecreated: true
sceneChildren: 1
busSubscriptions: 2
```

The completed-load disposal path has another verified ownership failure.
Populate one animal target, then dispose: the scene group is removed, but
`ctx.life` remains non-null and Scanner retains the extra-target array.

```text
ctxLifeStillPresent: true
retainedScannerTargets: 1
candidate after disposal: life:comb-jelly
ownedSceneChildren: 0
```

Thus the scanner can offer an invisible disposed animal even without a deferred
fetch. `Life.dispose()` only disposes rendering; it does not clear its target
array.

This is a verified teardown-contract defect. Ordinary site navigation currently
reloads the document and does not call the runner's dispose, so this is not proof
of an accumulating leak during today's normal site selection.

**Fix brief / acceptance:** reject late completion using a disposed flag or init
generation, detach owned extra targets and clear `ctx.life` on disposal. Test
dispose-before-fetch-completion and ordinary dispose-after-load. A disposed
system must leave zero owned scene children and bus subscriptions.

### 7. Per-frame life target refresh allocates while simulation is frozen

**Locations:** `src/world/life/Life.ts:98`, `:113`; secondary lower-rate churn in
`src/world/life/LifeSim.ts:533` and `:548`.

Each `Life.update`, including `dt=0` for Pause/photo mode, makes a new best-target
Map. Every winning candidate adds a new `{ a, score }` record. The persistent
target array and pooled agents do not eliminate these allocations. Cell passes
also build/sort a new tuple array and filter rows every 0.3 s; those are lower-rate
allocations, not per-animal steering allocations.

**Executed result:** warm a low-tier Life with one animal, instrument the Map
constructor, then call `update(0, ...)` 120 times: **120 new Maps**. This isolates
the target refresh from spawning. No device FPS or heap-size claim is made.

**Fix brief / acceptance:** reuse a scratch map or species-indexed buffers and
best-agent/score fields; avoid new candidate records each update. Preserve target
stickiness and IDs. Profile a populated low-tier site and frozen photo mode; do
not replace this with a brittle wall-clock unit-test threshold.

## Verification and round record

### Round 1

- Reviewed settings/research/onboard/daily save migrations, scanner pools,
  progression awards, audio pause/unlock/dispose, touch tutorial actions,
  life simulation/render paths, exploration scheduling and new geo placement.
- Existing unit suite: **74 files / 761 tests passed**, using
  `npx vitest run --configLoader runner --reporter=dot`. Ordinary `npm test`
  cannot write Vite's config bundle into the shared read-only node_modules
  symlink; the runner loader avoids that environment restriction.
- Logic reproductions used Vite `ssrLoadModule` with middleware mode, WebSocket
  disabled and a cache under `/tmp`; no authored test/source files were created.
- All **65 secret/sample target centers** were checked against the actual
  low-tier terrain and generated prop colliders: **zero embedded target centers**.
  The two external GLBs at Blake Plateau could not load in the server-side
  relative-URL harness, so this does not certify their geometry. The existing
  all-site terrain/scanning tests passed. This does not certify every vertex or
  sightline on every quality tier.
- Browser testing could not start: binding `127.0.0.1:4197` returned `EPERM`.
  No mobile Safari, rendered screenshot or live-console pass is claimed.
- Required `tools/gates.sh --no-e2e`: **PASS Python, content, attribution,
  Prettier**; build and the ordinary unit command fail with `EROFS` while writing
  Vite config bundles under shared node_modules. TypeScript checking completed
  before the build failure. These are environment failures, not failures caused
  by this Markdown file. Browser gates were explicitly omitted because localhost
  binding is unavailable.

### Round 2

- Rechecked mission openings with the actual fitted Arcade hulls and **all**
  primary objectives, eliminating misleading first-in-file distances. Monterey's
  nearest primary is 14,660 m away; the checked alternative openings have a
  nearby primary: Great Blue Hole 276 m, Hudson Canyon 105 m, Hunga Tonga 127 m.
  Those three are **not** reported as mission-start bugs.
- Verified both live mode-change directions and the loaded-life disposal path,
  supplementing the deferred-load leak reproduction.
- Verified future-version research protection using a version-2 fixture:
  `readOnly=true`, zero writes after awards/finish, zero session points. This
  behavior is preserved by the suggested recovery work.
- Existing reward guards use stable tokens; repeating the same ordinary
  secret/sample/event awards did not expose a new RP farming path in the inspected
  flow. Sample collection resets per dive; scanner session state also resets.
- No source fixes were made. Each finding includes an implementation brief and
  acceptance criteria for the orchestrator's fix packages.
- Required final `tools/gates.sh --no-e2e`: **PASS Python, content, attribution,
  Prettier**. Build and the ordinary unit command again stop at the same shared
  node_modules `EROFS` config-bundle restriction. The separately executed
  runner-loader unit suite remains 761/761 passing; no source changed between
  rounds. Final Markdown formatting/content checks are rerun after recording
  these results. Browser checks remain unavailable in this sandbox.

## Orchestrator decisions and remaining checks

1. Decide the live mode-change hull policy for finding 3.
2. Decide the partial-save recovery invariant for finding 4.
3. Fix the touch photo exit before accepting onboarding as touch-complete.
4. Decide how Monterey's mission start should preserve cinematic composition and
   a short approach to an authored primary; keep the free-dive hero opening.
5. Run real touch audio verification: first tap from Home, Begin dive, mute before
   first gesture, Pause → Resume and background → foreground. Current audio code
   keeps gesture listeners and retries `resume`; the audit has **not** proved a
   context that can never resume on mobile.

No real-world site/species facts or new assets are asserted or recommended here;
site/species names identify repository data and test cases only.
