# P2-copy: four UI copy changes

Status: done on `claude/P2-copy` (branch `claude/P2-copy`, worktree `/home/vijay/subexp-wt/P2-copy`).

## What changed

1. **Home primary button** reads `Dive: <site>` (`src/ui/Home.ts` `setDiveSite`, called from `src/app/systems/shell.ts` once the mission catalogue loads). The site is the same one the button launches (saved last site, else the opening one), resolved by a shared `diveSite()` helper. Plain `Dive` until the catalogue loads. Long names ellipsise on one line (`src/styles/home.css`).
2. **Discovery confirmation** kicker reads `New Journal entry` (`src/ui/ScanOverlay.ts`). Comments that quote it were updated, and so were `docs/discovery.md` and `docs/missions.md`.
3. **Touch devices** hide the Settings Controls (key-bindings) button and its pane (`src/ui/Settings.ts` `showControls`). Logged under Removed in `CHANGELOG.md`; `docs/settings.md` notes it.
4. **Graphics Auto row** reads `Auto (<tier> on this device)`, where `<tier>` is `quality.detected.tier` passed as `autoTier` from `src/app/systems/settings.ts`. The tier is lowercase, matching the existing `This dive uses <tier>` note.

## Tests updated (expected strings only)

- `Dive` exact-name matches became `/^Dive(:|$)/`, and the list assertions normalise the `Dive: <site>` text: `tests/e2e/d-shell.spec.ts`, `tests/e2e/f-title-layout.spec.ts`, `tests/e2e/f-title-scene.spec.ts`, `tests/e2e/hud-touch.spec.ts`, `tests/e2e/mission.spec.ts`, `tests/e2e/journal-debrief.spec.ts`, `tests/e2e/helpers/titleAudit.ts`.
- `NEW ENTRY` kicker expectations became `New Journal entry`: `tests/e2e/f2-explore.spec.ts`, `tests/e2e/hud-touch.spec.ts`, `tests/e2e/journal-debrief.spec.ts`, `tests/e2e/f2-life.spec.ts`, `tests/e2e/f-verify-lander-firstdisc-1240.spec.ts`, `tests/unit/guidance.test.ts`.
- `tests/unit/overlayFocus.test.ts`: the two `quality` stubs gained a `detected` field, which the Settings screen now reads.

No new specs were added. No unrelated assertion was loosened.

## Gate result

`PW_PORT=4460 tools/gates.sh` printed PASS for python, content, build, unit, e2e, e2e-base, attribution, prettier and the overall gate (`PASS gates (e2e=smoke)`), exit 0. `npx tsc --noEmit` is clean.

Not run: the full e2e suite (`--full-e2e`) and a standalone `playwright test` run of the title and settings specs (it could not start its webServer outside the gate build). The touch-specific Settings Controls behaviour is not covered by a new assertion; the specs that click Controls in settings are keyboard-only desktop tests.
