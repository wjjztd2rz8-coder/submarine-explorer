# F-BUGHUNT-960 — regression hunt after 890 / 900

2026-10-08. **Tutorial regression fixed; external gate failures addressed.
Browser revalidation remains open.** Worktree baseline equals `main`:
`f84a2854831f9f2082d6a80dd5c6a12ee509f76b`.
Changes stay on `codex/960-f-regression-hunt-890-900` for review.

## Confirmed bug and fix

890's phone-only tutorial paragraph always used hardcoded touch instructions.
At a phone viewport with touch enabled, switching to keyboard or gamepad changed
the hidden desktop paragraph but left the visible paragraph saying to use the
touch controls. Remapped keyboard bindings disappeared from the visible card.

Pass the already-detected input device into `TutorialCard.show`. Keep compact
touch copy for touch input, and display the existing device/binding-aware text
for keyboard/gamepad. Include the device in the render cache key so switching
devices repaints even when the full instruction string is identical. Two small
production changes; tutorial progression and save formats are unchanged.

Two actual-card unit regressions fail against the original `main` implementation
and pass after the fix. They exercise every tutorial step with touch, remapped
keyboard and gamepad copy, plus an identical-text device switch. A system-level
regression checks the real onboarding device transitions and card callback.
The focused suite passes all 11 tests. Before-fix evidence:
`.cache/tutorial-960-before.log`.

## Browser matrix and external execution

`tests/e2e/f-bughunt-960.spec.ts` adds 24 cases:

- 390×844 / 844×390 with native touch, and 1280×720 with keyboard/mouse.
- Arcade and Realistic; low and high tiers; Titanic and Great Blue Hole.
- Home → Dive sites → briefing → first dive → assisted first scan → debrief
  → Journal → two reloads.
- Fully visible, centre-hit-tested action controls; horizontal panel overflow;
  the existing portrait no-scroll assertion; native Enter/Space disclosures;
  compact phone HUD assertions and hidden duplicate scan-target instructions;
  phone touch/keyboard switching; debrief scan count and Journal focus return;
  exact settings/discovery snapshots and tutorial completion after both reloads.

Only hull progression is seeded to unlock the Class B sites in Realistic.
Tutorial and discovery saves start fresh. Opening screenshots precede any
assistance. Scanning uses an explicitly marked teleport/debug pose, aim and the
existing real held keyboard/native-touch scan helper. **These checks are not
evidence of naturally reaching the first scan.** No existing assertion, timing,
tolerance or timeout was loosened.

TypeScript and Playwright discovery pass: 24 new cases listed. The requested
two-round browser run, including the existing briefing and touch audits, was
attempted with `--repeat-each=2`. Preview fails before any test starts.
Log: `.cache/bughunt-960/two-round-browser.log`.

Local preview reports `listen EPERM: operation not permitted 127.0.0.1:4961`.
Standalone Chromium also fails before opening a page:
`sandbox_host_linux.cc:41 ... shutdown: Operation not permitted (1)`.
The Browser skill's connection/discovery reports no available browser (`[]`).
The orchestrator subsequently ran the full gate outside this sandbox: **448 e2e
passed, 49 skipped, 16 failed; project-base passed**. All eight new desktop cases
passed, including assisted scan, debrief, Journal and two save reloads. All 16
phone cases reached the same incorrect test action described below. Thus phone
scan/debrief/save acceptance remains open. Reviewed supplied portrait/landscape
briefing and desktop opening/debrief images; no browser was driven locally.

### Follow-up root causes and fixes

- **Phone test input transition:** F9 correctly switches the whole HUD to keyboard
  mode. The external failure snapshots show **Skip step / Skip tutorial**, while
  the next action incorrectly waits for the touch-only **Skip**. Keep the exact
  keyboard instruction assertion, assert the desktop button is visible, then
  perform a native canvas tap to restore touch mode. Assert the phone paragraph
  is visible and its exact ballast-slider instructions before continuing the
  original hit-tested Skip action. No force clicks, injected mode flags or
  relaxed assertions. Playwright discovery lists all 48 cases for two rounds.
- **Monterey unit timeouts:** the external parallel run timed out the medium
  hero-integrity case (15 seconds) and ultra opening case (30 seconds). Both
  unchanged suites pass in isolation: **22 tests**, 38.94 seconds total. CPU
  profiles of the two reported cases show collision/terrain sampling and dense
  geometry generation; the cases pass in 4.9 / 9.2 seconds of profiled CPU work.
  Set Vitest's default `maxWorkers: 2` to avoid simultaneous CPU-heavy mesh builds
  exhausting per-test budgets on shared runners. Keep the 15/30-second limits
  and all checks unchanged. This trades suite concurrency for reliable execution.

External logs retained in `.cache/bughunt-960/orchestrator-before/`; isolated and
profiled runs in `.cache/bughunt-960/monterey-before.log` and
`.cache/bughunt-960/monterey-profile.log`.

## Cosmetic findings

Source-confirmed copy inconsistency in the unscanned Journal site page:
`Scan a target here to open this page, or show spoilers.` appears below the
already usable **More about this site** disclosure introduced in 900.
Consider describing entry unlocks instead. Left as cosmetic copy, outside the
functional fix.

Rendered copy inconsistency in the supplied Great Blue Hole desktop debrief
(`test-results-gates-4372-233941/f-bughunt-960-960-1280x720-8c25a-n-Journal-debrief-and-saves-chromium/debrief.png`):
the subtitle says **Nothing logged this time** beside **SCANS 1**, a named scan
and **1 new Journal entry**. The subtitle counts mission objectives, rather than
all scans; consider saying **No mission objectives completed**. Left as cosmetic
copy. The reviewed debrief controls are fully visible.

## Gates and remaining acceptance

Round 1, baseline: `GATES_CONFIG_MODE=writable PW_PORT=4960
PW_OUTDIR=dist-bughunt-960 tools/gates.sh --full-e2e`.
Build/typecheck, 1,536 unit tests in 152 files, 148 Python tests, strict content,
attribution and repository Prettier pass. Full e2e and project-base e2e fail at
preview startup. Logs retained in `.cache/bughunt-960/round-1/`.

Round 2, final fix: same full gate with `FULL_E2E=1 ROUNDS=2` and
`VITEST_MAX_WORKERS=2` (worker count only): build/typecheck, **1,539 unit tests
in 153 files**, 148 Python tests, strict content, attribution and repository
Prettier pass. Full e2e and project-base e2e again fail at preview startup;
the gate exits 1. Logs retained in `.cache/bughunt-960/round-2/`.
Changed-file formatting and `git diff --check` also pass. The writable-config
mode avoids writing to the shared read-only dependency tree.

Follow-up local full gate uses the new default concurrency without a
`VITEST_MAX_WORKERS` override: **1,539 unit tests in 153 files pass** (198.84
seconds), along with build/typecheck, 148 Python tests, content, attribution and
Prettier. Full e2e and project-base again fail before tests at preview startup
inside the sandbox; gate exits 1. Logs: `.cache/bughunt-960/followup-gates.log`
and `.cache/bughunt-960/followup/`. Post-fix external browser results are pending.

In a browser-capable checkout, rebuild and run:

```bash
GATES_CONFIG_MODE=writable FULL_E2E=1 ROUNDS=2 \
  PW_PORT=4960 PW_OUTDIR=dist-bughunt-960 tools/gates.sh --full-e2e
GATES_CONFIG_MODE=writable PW_PORT=4962 PW_OUTDIR=dist-bughunt-960 \
  npx playwright test tests/e2e/f-bughunt-960.spec.ts \
  tests/e2e/f-briefing-900.spec.ts tests/e2e/f-touch-audit.spec.ts \
  --repeat-each=2 --output=test-results-bughunt-960
```

Inspect all new briefing/opening/assisted-scan/debrief images and the existing
touch-audit screenshots. Separately drive each requested size/mode/tier through
a natural first scan using keyboard or touch, then debrief and reload. Record
any observed overlaps, unreachable controls or cosmetics here. Acceptance stays
open until those journeys and `tools/gates.sh --full-e2e` pass.

- Blue Hole 390x844 portrait: tutorial card covered the hull (chase arm shortened by the surface, hull sat low). Fix in src/sub/CameraRig.ts: on portrait chase (aspect < 0.7) aim drops up to 30 m in proportion to lost arm length, lifting the hull above the card (sub y 597 -> 497, card top 558). Gates and camera/HUD/onboard/touch specs pass.
