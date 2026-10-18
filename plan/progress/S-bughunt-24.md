# S-bughunt-24 — input interruption and live mode audit

Backlog 8 (`S-bughunt`), 2026-10-18. Reviewed keyboard/pad/touch mapping,
pointer cancellation, blur and visibility during held controls, live
Arcade/Realistic switching, and modal focus return with unit fixtures. Read the
previous input and modal hunts to avoid repeating their completed fixes.

## Demonstrated bug and correction

Hiding the document without a window blur cleared input once, but the next
gamepad poll restored thrust, yaw, pitch, ballast, Scan and Boost while still
hidden. Background button changes could also trigger shortcuts on later polls.
The new visibility fixture failed before the correction: **1 failed / 52 passed**
in `subInput.test.ts` (`/tmp/S-bughunt-24-before.log`). This is a listener/polling
reproduction, not an observed browser playthrough.

Pad contributions now also require a visible document. Existing blur suspension,
button-history polling and return baselining remain in place. Held analog/level
controls resume when visible; background shortcuts require release/repress.
The correction adds one visibility condition, with no new state or listener.

## Regression coverage

Seven added cases extend existing capability specs:

- `subInput.test.ts`: visibility loss without blur, with and without background
  frames; hidden-page focus does not re-enable the pad; held controls resume on
  visibility return without replaying Camera/Journal, then release/repress works.
- `touchControlsAudit.test.ts`: pointer cancellation and lost capture release
  stick, ballast and Scan; unrelated pointer IDs leave each hold intact, stale
  moves cannot restart controls, and new fingers work normally.
- `modesExploration.test.ts`: real Input, Submarine, Scanner, Save and the live
  modes system retain keyboard/touch/pad holds through four alternating
  Arcade/Realistic edits. Scan progress continues, camera edges do not replay,
  pose/hull persist, resolved speed limits apply and scan radii do not compound.
  The base config remains unchanged.

Existing fixtures also exercise opposing/remapped keys, mixed-device precedence,
all pad edge mappings, blur with stopped/running background frames, multi-finger
Scan, rotation, pause/photo camera interruption, modal keyboard ownership and
focus return after nested, out-of-order and hidden/disconnected opener cases.
No further defect was demonstrated in those paths.

## Simplicity and review scope

No UI element, guidance surface, setting, dependency, schema, site branch or
runtime base-config mutation added. No art, layout, CSS or composition changed.
The behavior keeps hidden controls neutral and returning controls predictable;
existing modal focus/accessibility and discovery reward guards remain intact.
Beauty, phone appearance and screenshot acceptance remain for Claude. No game
rendering or visual acceptance is claimed. No merge, push or tag; `tools/` and
`plan/DIRECTOR.md` untouched.

## Validation

- Final focused capability run: **353 tests / 10 files PASS** (subInput, touch,
  touchControls, touchControlsAudit, overlayFocus, f2-modes, modesExploration,
  powerSystem, arcadeLoadout, subFeel). Log:
  `/tmp/S-bughunt-24-focused-final.log`.
- Required gates and existing browser capability attempts: results pending.

No assertions were loosened, timeouts increased or tools modified.
