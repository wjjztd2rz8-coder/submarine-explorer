# F-BUGHUNT-7 — copy and HUD regression audit

## Scope and plan

- Audit the merged 150 copy changes against mission objectives, contextual hints,
  Journal references and browser assertions.
- Check the current HUD cascade and the 170 touch-audit patch for longer copy at
  390×844 and desktop; fix small remaining issues without duplicating 170.
- Add regression coverage, update the changelog and run
  `bash tools/gates.sh --no-e2e`. Leave browser execution to the orchestrator.

The supplied checkout is `c0b0911`, with 150 merged at `a084229`. The 170 package
is available as `e5f7543` on `codex/170-f-touch-audit`, but is **not merged into
this checkout**. Reviewed that patch and its progress notes separately; no merge
or cherry-pick was performed. Final combined CSS still needs the external run.

## Findings and fixes

- The current objective inherited a single-line ellipsis on desktop. Portrait
  overrides allowed spaces to wrap but retained `overflow: hidden`, so a long
  word could still be clipped in the narrow right-hand column. Active titles now
  wrap, including within long species names, and the OPTIONAL badge cannot
  shrink. Other list rows keep their compact ellipsis. The existing
  ResizeObserver continues to position telemetry below the measured panel.
- All 43 objectives in the 13 published missions resolve to authored Journal
  entries. Across those sites and `_test`, all 48 POIs resolve to the 84 guide
  entries. Guide IDs and ordering are unchanged by 150. No missing Journal key
  was found. There is no i18n framework, translation catalog or locale-key
  lookup in this codebase; the English copy is literal text and authored JSON.
  Parsed comparisons also preserve guide facts, sources, reconstruction flags
  and all four species-to-POI guide links used for survey-species unlocks.
- Contextual/tutorial hints use the current Journal and control names. The
  duplicate scan-target hint remains disabled at the onboarding caller, with
  its existing save ID retained. ROV's keyboard-only hint is device-gated;
  phone scan/Journal control labels are fixed by 170.
- Searched tests for every replaced objective title and hint and reviewed the
  related Journal/scan/onboarding assertions. No remaining old objective strings
  were found. Extended `content-missions.spec.ts` to compare rendered briefing
  titles and live HUD titles/hints with `mission.json` during real scan flows.
- 170 already supplies `min-width: 0` and wrapping for long scan names, compact
  portrait navigation/progress, narrower supply columns and revised fixed
  scan/tutorial spacing. Those changes are not duplicated here. This patch's
  active-title selector applies alongside 170's portrait/landscape rules.

## Regression coverage

- `tests/unit/copyJournal.test.ts`: all 13 published packs pass through the real
  mission/POI/guide parsers and Journal builder. Every objective's scan unlocks
  its authored entry with the expected key, prose and Recreation tag; keys are
  unique. Focused run: **13 tests passed**.
- `tests/e2e/f-copy-regress.spec.ts`: exercises the real objectives component
  with all 43 authored title/hint pairs and their primary/optional flags at
  1280×720 and 390×844, each at 100% and 150% UI. Checks clipping, viewport/row
  bounds, badge separation and telemetry stacking. Writes four screenshots to
  `.cache/codex/shots/f-bughunt-7/`. It is a copy-layout fixture; mission scan
  progression remains in `content-missions.spec.ts`.
- Playwright `--list` discovers the two new layout cases and all 14 existing
  content-mission cases. No browser tests were executed in this sandbox.

## Verification and external follow-up

Initial gate attempt passed Python, content, attribution and Prettier; build and
unit startup hit the shared read-only `node_modules/.vite-temp` path. Used an
ignored local package-link wrapper with writable Vite caches for the unchanged
gate command and restored the original dependency symlink afterward.

- `bash tools/gates.sh --no-e2e`: **PASS build, unit (91 files / 945 tests),
  Python (128 tests), strict content, attribution and repository-wide Prettier**.
- `git diff --check` passed. No commits, dependency changes or generated assets.

The orchestrator should run the full gates after integrating 170, inspect the
four new screenshots, and retain the touch-audit checks for long scan names,
all tutorial steps, hint dismissal and mission completion/abort banners. Fixed
portrait scan/tutorial spacing and their interaction with completion banners
still require rendered evidence; this sandbox audit does not claim visual
acceptance or phone ergonomics.
