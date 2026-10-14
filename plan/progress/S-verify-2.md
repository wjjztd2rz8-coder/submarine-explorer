# S-verify — second collection audit

Backlog item: **S-verify [Codex]**, second pass / brief 1680 in
`plan/DIRECTOR.md`. Date: 2026-10-13. Starting HEAD: `526362e`.

## Scope and evidence

Read the package commits and all ten collection merges after `316a2a9`,
including combined source diffs and the aggregate diff to HEAD:

| Merge     | Package                       |
| --------- | ----------------------------- |
| `3358034` | S-tests hosted CI (`18ca5d2`) |
| `f5c6b0a` | S-verify (`74396d3`)          |
| `9f5747f` | S-bughunt (`39fdd8b`)         |
| `7da7cd0` | S-debrief (`415a4de`)         |
| `e13951a` | S-render scarps (`faa438a`)   |
| `49a76c2` | S-render title (`2475c7b`)    |
| `4db018b` | S-render audio (`543bc93`)    |
| `b1fa94f` | S-boot (`0f1975d`)            |
| `c73ba1d` | S-modal (`c3ba7d4`)           |
| `0a93b80` | S-resolve (`5ee74ba`)         |

Checked the hand-resolved shell, Globe, Journal and discovery paths against
both parents and their resulting source. The merged shell preserves Home-only
construction and top-overlay Escape dispatch; the Globe chooser still focuses
its first site; Journal retains its media-query unsubscribe; discovery keeps
both scan-priority ordering and host disposal. `src/core/config/discovery.ts`
is unchanged from the lower bound. Subsequent commits in the range are docs.

## Confirmed defects and fixes

- **Home startup after teardown:** `startRuntime` yields even for Home. A
  non-cached `pagehide` during that yield disposed startup, but its continuation
  still initialized menus/title and scheduled a new loop. The regression failed
  before the fix (Home initialization ran once after teardown). Runtime disposal
  is now idempotent and checked before continuing Home startup.
- **Pointer-system teardown:** listeners were removed, but keyboard lock,
  mouse-look state and the two hint roots remained. A pending keyboard or
  pointer-lock acquisition could also finish after disposal. Pointer cleanup now
  belongs to its factory instance, releases those controls and roots, and releases
  a lock that finishes late. The settled/pending-keyboard regression cases failed
  before the fix. Pending-pointer completion is also covered. This is an existing
  teardown gap exposed by the audit, not a claim that the shell conflict introduced
  it.

Tests extend `startupLifecycle`, `overlayFocus` and `audioLifecycle`; no new
package-specific spec, weakened assertion or skipped test. No capability cut,
new UI, settings, site branch or appearance tuning. Existing helpers are reused;
the additional lifecycle guards prevent post-disposal work.

## Verified behavior

- Escape leaves photo mode before pausing; Pause subviews step back; Home site
  list returns to its opener; nested overlays consume only their own Escape.
  Held Escape, binding capture, focus cycling/return, removal of an underlying
  trap, chooser focus and consumer disposal retain their existing guards.
- Live settings, Custom inheritance, upgrades and all Daily modifiers resolve
  without mutating base configuration or compounding multipliers. Vehicle hull,
  pose, supplies and manual T speed survive live edits; mission approach radius
  caps remain in the base-radius map. Power, lights, sensors, scanner, camera,
  currents and waypoints read effective settings. Removed controls survive only
  in migration code; legacy/current/future saves retain the existing protections.
- Home boot requests neither a dive tile nor the dive system factory. Direct
  routes load their selected tile before initialization and publish readiness on
  the first drawn frame. Cancellation and partial startup rollback remain covered.
- Site selection still navigates/reloads; Quit/debrief Home still changes the
  current page's state. Three page-navigation Home/dive/Home cycles verify a
  single frame loop and exactly one teardown per installed system. Separately,
  three real shell/input/Globe/photo/Daily lifetimes exercise Home sites, photo
  exit, Pause and Home, then check listener removals and zero remaining timers or
  overlay ownership. Three real audio lifetimes (fake WebAudio platform) verify
  Home silence, suspension, context close, disconnected nodes, zero timers and
  removed visibility handlers. WebGL presentation remains outside these unit
  harnesses.

## Validation

- Initial targeted audit: **PASS**, 15 capability files / 239 tests.
- New regression run before fixes: **FAIL**, Home continuation and both
  settled/pending-keyboard teardown cases, as expected.
- New lifecycle tests after fixes: **PASS** (including three repeated cycles).
- Final targeted audit: **PASS**, 15 capability files / 246 tests.
- Corrected production build: **PASS**, including TypeScript, ordinary public
  asset copy and service-worker stamping:
  `npm run build -- --outDir dist-s-verify-2 --config .cache/S-verify-2/vite.config.mjs --configLoader native`.
  The temporary writable config uses the same Rolldown bundling mechanism as
  `GATES_CONFIG_MODE=writable`; dependencies and tools were not edited.
- `npx prettier --check .` and `git diff --check`: **PASS**.
- Required aggregate run:
  `GATES_CONFIG_MODE=writable bash tools/gates.sh`, **exit 1**. Logs are under
  `.cache/runs/20261013-230318-7-oGb1Fu/`:
  - Config, content, full unit, attribution and repository-wide Prettier:
    **PASS**. Full unit: **192 files / 2,174 tests**, 495.68 s.
  - Its initial root build exposed missing parameter annotations in the new
    Document/EventTarget test harness. Fixed the annotations, then passed
    typecheck, the final targeted audit and the corrected root build above.
    The gate's subsequent **project-base build also passed** on the corrected
    source.
  - Python: **161 passed / 4 failed** out of 165. All four existing manifest
    failures report `spawnSync git EPERM`, even though the child Git command
    produces output. This matches the prior collection's sandbox restriction;
    no Python assertions or tools were changed.
  - Root browser phase did not execute assertions because the aggregate run's
    initial build had failed. Retried smoke separately against the corrected
    root artifact, with writable configuration and preview diagnostics: it still
    fails before assertions, reporting loopback `connect EPERM` for both IPv4
    and IPv6 and preview startup failure. The project-base browser gate likewise
    fails at preview startup after its successful build. No alternate artifact,
    weakened assertions or skips were used to report browser success.

Separate before-fix, final targeted, corrected build, preview and formatting logs
are retained in `.cache/S-verify-2/S-verify-2-*.log`. The aggregate gate is not
fully green; rerun its Python/browser phases on a host that permits child Git
processes and loopback servers. There were no runtime changes after the full
unit run started; the intervening correction only supplies erased test types.

## Remaining

- No visual conclusions are drawn from DOM/geometry unit harnesses. The shared
  title lighting/snow and table-driven scarps still need Claude's golden review
  under S-render; existing phone guidance/HUD and hero-site appearance work
  remains in the visual backlog. No visual files were changed.
- Hosted CI and render-nightly outcomes require the separate hosted-CI follow-up;
  local gates cannot establish their hosted result.
- No merge, push or tag; `plan/DIRECTOR.md` and `tools/` remain unedited.
  Changes are uncommitted: worktree Git metadata is outside the permitted write
  roots and has read-only access in this session.
