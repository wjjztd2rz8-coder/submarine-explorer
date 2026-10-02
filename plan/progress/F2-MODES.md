# F2-MODES — complete; all 8 gates pass

## Player-visible changes

- `ModeSelector.ts` now offers only Arcade (default) and Realistic. All three
  placements share a collapsed Advanced button and the same native selects.
  Any option edit enters Custom and shows its small status tag; either preset
  resets every option. The disclosure supports Enter/Space and has an explicit
  expanded state. Buttons, segments, selects and new briefing actions have
  targets at least 44 px high. Expanded home options scroll within the menu;
  expanded briefing options have their own bounded scroll area.
- `Settings.ts` delegates Gameplay options to this shared control. Labels/order/
  notes moved to `core/config/modes.ts` and are re-exported for existing callers.
- Currents offers Off, Realistic and Exaggerated. Exaggerated uses an 8× tuning
  constant for both the submarine's adjusted field and the ROV's sampled field.
  The preset flow cap scales with it, so the old cap does not erase the effect.
  Terrain impulse guarding and missing-data behavior remain in place.
- Existing v2 Custom saves retain every valid option; retired Gentle values
  retain their 0.35× effect and appear in a hidden legacy select option until
  changed. The settings version, keys and migration are unchanged.
- Home has one Daily dive card with the site's mission title, the modifier,
  best stars today and an active completion streak. `Daily.ts` reuses the life
  engine's existing Mulberry32 PRNG. UTC dates deterministically rank available
  sites and choose a ±35 m approach offset, heading, survey/focus variant and
  Calm water / Strong currents / Low light modifier. A focus survey retains
  one authored primary and, when available, one authored optional objective.
  Ordinary mission goals and content files are unchanged.
- Daily candidates must have a downloaded tile, a known mission depth and an
  unlocked hull. Fresh saves therefore receive a shallow candidate. All players
  share today's approach and modifier; the site falls back to their highest
  ranked accessible site when the global preferred site is locked. Identical
  date/access sets always give identical dives, regardless of catalogue order.
- Daily best ratings use `daily-YYYY-MM-DD` in F2-PROGRESS's existing `ratings`
  map. Hyphenated keys satisfy its sanitizer; no progress schema edits. The
  dated reward IDs make daily primary/star rewards replayable across days but
  idempotent within a day. Streaks use only `subexplorer.daily.v1`, with version,
  last completed UTC date and streak. Repeats, aborts and incomplete dives do not
  advance it. Old/future/malformed or denied storage is guarded.
- Daily water conditions apply for that run without changing saved preferences.
  Strong currents uses Exaggerated; Calm and Low light disable currents; Low
  light uses the existing realistic headlight profile. Daily conditions remain
  applied if other gameplay settings are edited during that run.

## Free dive: found versus added

Already present: a named Free dive home entry, a full tile picker, hull-access
information and capped hull fitting, authored sandbox approaches, and a route
with no mission router, briefing or mission objectives panel. No sandbox system
needed replacing. Added: a named Free dive action in mission/Daily briefings
that reloads the same tile through the existing free-dive route.

## Cuts

Logged in `CHANGELOG.md`: Custom's third segment moved into Advanced; Gentle
removed from new choices while old saves retain it; the briefing's separate
More options implementation merged into the shared Advanced implementation.
No gameplay options or authored site objectives were removed.

## Orchestrator browser follow-up

The orchestrator ran the full gates outside this sandbox: build, unit, Python,
content, attribution, Prettier and e2e-base passed. The main e2e run had 175
passes, 14 skips and five failures. This supersedes the original local browser
availability report below.

Four failures shared a real CSS cascade bug: `.mode-advanced[hidden]` and the
later `.mode-selector .mode-advanced` grid rule had equal specificity. The grid
rule won despite the DOM's correct hidden attribute and false expanded state.
The hidden selector now includes `.mode-selector`, so it outranks the grid rule
on home, briefing and Settings. The collapsed disclosure again removes its
options from the visible layout; the Daily card is no longer pushed below a
panel that should be absent. Existing open/closed, keyboard, touch, viewport and
accessibility assertions remain unchanged.

The fifth failure was the old shell test's seven-button count. The home menu
now has nine buttons because Daily dive and Advanced were added intentionally.
The test retains an exact count of the original seven direct menu actions and
now verifies their exact text/order, one Daily card, one Advanced toggle and
nine total buttons. No existing interaction or assertion was removed.

The currents and phone-touch screenshot steps now scroll the selected Currents
control into view before capture, so the screenshot actually shows Exaggerated.
The supplied PNGs are from the orchestrator's pre-fix run; this sandbox cannot
regenerate them. Rerun `d-shell.spec.ts`, `d2-predive.spec.ts`,
`f2-modes.spec.ts` and `d-currents.spec.ts`, then the full browser gate. Inspect
fresh collapsed/expanded desktop and phone captures, especially Daily visibility
and the selected current choice.

Follow-up local checks: `tools/gates.sh --no-e2e` passes build, all 709 unit tests,
Python, content, attribution and Prettier. Test collection and diff whitespace
checks pass. Browser execution remains restricted here; no browser pass is
claimed for this repair.

## Checks from the original implementation

- `PW_PORT=4237 tools/gates.sh`: build, unit (709 tests / 69 files), Python,
  content, attribution and Prettier all PASS. Both e2e and e2e-base stop before
  test execution because Vite cannot bind localhost in this sandbox (`listen
EPERM 127.0.0.1:4237`). The project-base build itself passes.
- Direct Chromium launch also fails with `sandbox_host_linux.cc` / Operation
  not permitted. No permission escalation is available in this session.
- TypeScript strict check and `git diff --check` pass.
- `npx playwright test tests/e2e/f2-modes.spec.ts --list` collects all five new
  tests. The spec covers 1280×720 and 390×844, disclosure open/closed, Custom and
  preset reset, touch emulation/tapping, Daily visibility, fresh-save access,
  Daily completion/star/streak persistence and briefing → sandbox behavior.
- Existing related e2e specs retain their physics, persistence and accessibility
  assertions with the new disclosure interaction and Custom tag expectations.
  Gentle's physical scaling remains checked through a legacy option write;
  Exaggerated adds an 8× live-flow check.
- Screenshot paths are in the normal e2e suite at
  `.cache/codex/shots/f2-modes/*.png`. **No PNGs were generated here** because
  browser execution is blocked. Orchestrator must rerun both browser gates and
  inspect desktop/phone home and briefing layouts, expanded Advanced, touch
  controls and shifted Daily approaches before accepting this package.
- The worktree's external read-only node_modules symlink prevented Vite's temp
  config write. Dependencies were copied under ignored `.cache/node_modules`
  and the local ignored symlink redirected there, enabling the normal build
  and unit gates. No tracked dependency or package-lock changes.

## Deviations from OWNS

Necessary runtime/placement integration, kept limited to the relevant paths:

- `src/ui/Briefing.ts`: remove duplicate option UI and mount shared Advanced;
  keep the existing start-position group.
- `src/core/config/gameplay.ts`, `src/core/config/ui.ts`: accept/persist
  Exaggerated while keeping Gentle compatibility.
- `src/world/presets/Presets.ts`, `src/app/systems/rov.ts`: apply shared current
  scaling and the Daily current condition.
- `src/app/boot.ts`, `src/app/context.ts`, `src/app/systems.ts`: resolve Daily
  mission/conditions before initialization and register its small system.
- New `src/app/systems/daily.ts`: access filtering, card refresh/launch,
  modifier enforcement and listener/timer disposal, following Phase F structure.
- `src/app/systems/mission.ts`: safe Daily approach, Daily rating/streak callback
  and briefing Free dive action.
- `src/styles.css`: move the already-existing modes stylesheet import to the
  end so module-owned styles override earlier menu/predive rules.
- `tests/e2e/d-shell.spec.ts`: preserve the original seven-action check and
  account explicitly for the two new buttons in the orchestrator follow-up.
- `CHANGELOG.md` and this progress note: required package reporting.

No commit made.

## Orchestrator close-out

Merged main (F-HUD-LAYOUT, explore system); settings e2e now opens Advanced before Simulation speed (the control moved into the disclosure); Daily card given a 76 px minimum so its details line is not clipped. Gates: build, unit, python, content, attribution, prettier, e2e, e2e-base all PASS.
