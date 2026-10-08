# F-BUGHUNT-840 — f28–f30 regression audit

## Scope and two-round plan

Reviewed `git log f27..main` and the merged diffs from
`beb67345` (f27) through `224b21e` (main at checkout): 128 changed files.
This includes 590–650, integration 660 and the 590 drop, 670–730, the f29
follow-ups, 740, 760 and the new queue refiller. A merge's intermediate state
is not evidence of a defect still present on main.

1. Read runtime/content/config/style/tool diffs and their regressions;
   trace references, save identifiers, mobile CSS and asynchronous lifetimes.
   Run baseline gates and reproduce clear defects before changing them.
2. Fix reproduced defects with regression tests; recheck package interactions
   and save compatibility, then run the full release gates again. Record
   product decisions separately from confirmed bugs and execution limits.

## Confirmed bugs fixed

- **Terrain readiness hangs after a failed image load (740).** `img.onerror`
  only warned, so its promise, `rockTexture` when affected, and the new
  `texturesReady` barrier never settled. The save-soak readiness consumer could
  wait indefinitely for a missing/offline map. Failed loads now resolve to
  `null`, leave the neutral fallback bound, and permit the barrier to settle.
  Cleanup independently releases unused albedo/normal placeholders; a fallback
  still sampled by an active slot remains alive until terrain disposal. Shared
  A/B loads remain deduplicated. Seven new Low/High cases cover shared albedo,
  slot C, normal and total load failure. All seven fail on the original code;
  the complete ten-case readiness suite passes after the fix. No rejection or
  black/unloaded texture is passed to a material.
- **Automatic brief numbering reuses IDs at four digits (f30 tooling).** The
  refiller recognized only exactly three digits, ignoring launched 1000/1010
  and proposing 1000/1010/1020 again. It also ignored earlier two-digit briefs.
  Parse the complete numeric prefix and retain the empty-archive default.
  Prompt-capture tests reproduce both failures without invoking Codex.
- **Queued tasks run out of numeric order at 1000.** Lexical dispatch ordering
  put 1000 ahead of 990, defeating the refiller's numbered priorities. Use
  version sorting; the dispatch shim test fails before the change and passes
  afterward. Existing port-reservation and concurrency-lock tests still pass.
- **Stale preset documentation.** `docs/presets.md` and the preset registry
  header still claimed no geometry on Low and disabled ambient modifiers.
  Document Titanic's opt-in backdrop, its extra draw, depth fade and retained
  Low-tier ambient fill. The default flag is live: preset defaults and validated
  mission overrides flow into `WreckPreset.enter`; other wrecks stay off.
- **Release formatting gate.** The f30 addition to `plan/PROCESS-LOG.md`
  lacked the blank line after its heading. Prettier failed on the untouched
  baseline; formatting adds that line only.

## Reviewed interactions and compatibility

- **References and saves:** settings, bindings, discoveries, research and
  onboarding storage keys/migrators are unchanged by this batch. The mission
  index and wildlife catalogue are unchanged. Content copy edits preserve
  guide IDs, objective/POI IDs and species record identities. Existing
  `copyJournal`, migration, settings, progress and save-soak unit suites pass.
  A before/after comparison of scientific-name-based species unlock links
  found no removed links; Lost City's microbial entry gains Rhodobacteraceae
  and Methanosarcinaceae links. Old discoveries therefore remain usable.
  The identifier audit checks all 52 guide/objective/POI/species lists and
  mission landmark/tile references across thirteen packs against f27;
  `.cache/bughunt-840/save-identifiers.log` records the result.
  Start-only edits still enter Custom, suppress only the irrelevant hull
  notice, and retain the fitted hull until a new load; the integration tests
  cover both presets and subsequent explicit mode choices.
- **Mobile/touch:** 660's portrait FOV and measured scan-stack placement remain
  present; 740's later landscape supplies grid fixes the historically dropped
  590 Surface collision. The current-step fallback, measured rotate-hint
  offset, Journal Contents toggle, one-pane CSS and focus restoration are
  connected. Readouts observers disconnect on disposal. These observations
  and passing geometry/system tests do not establish rendered browser QA.
- **Geometry:** Beebe has one opening definition, including the reconciled
  -38 m vertical offset and 680's lateral shift; its apron expands visual
  bounds while retaining the original solid colliders. Monterey's carve is
  exclusive by tile ID; Blue Hole's branch and original science contacts remain
  separate. Lost City uses one baked tint instead of also applying fragment
  strata, and its LOD index buffers share the same vertex colours. Blue Hole's
  east material composes its shader hook with the inherited vertex glow.
- **CI/config:** the duration sharder discovers tests dynamically, escapes
  complete title paths, and retains helper-source timing keys. The dependent
  atmosphere frames are now steps within one test, so balancing cannot split
  their shared measurements. The actual global timeout is 25 minutes.
  Older 15-minute descriptions in progress logs describe superseded states.
- **Duplication/dead code:** no surviving conflict markers or duplicate opening
  definitions found. `scan-target` hint history remains valid saved data even
  though 620 deliberately delegates its prompt to the live scan panel.
  It is not removed as an incidental migration change.

## Design questions — no behavior changes made

1. **Tutorial completion message priority:** a fresh player's animal hint can
   replace “Nice work” on the next frame after Skip. Current system tests
   explicitly retain this behavior, and 740's isolated toast fixture seeds
   animal hint history to inspect the completion message. Should completion
   guidance get a minimum visible interval before contextual hints?
2. **Copy-derived unlocks:** editing scientific names in prose changes species
   availability even when all save IDs stay stable. Should habitat links become
   explicit content data? This batch adds two links and removes none.
3. **Shared comb-jelly identity:** fact-check copy explains the Pacific/Atlantic
   distinction, but the shared wildlife catalogue still names the encounter
   `Bolinopsis infundibulum`. Decide between regional species identities and a
   genus-level encounter; changing stored wildlife IDs needs a migration plan.
4. **Blue Hole opening:** 690 polishes the east grotto while the default opening
   still selects the original west `karst-grotto`. Should the east gallery be
   the first-view hero? Changing that choice requires camera/scan/touch review.
5. **Debrief exploration goals:** 720 hides empty secret/sample sections. Should
   a zero-of-three secrets cue remain visible to suggest further exploration?
   This is an information-priority decision, not missing save state.

## Validation and execution limits

- Negative regression logs:
  `.cache/bughunt-840-textures-before.log` (seven failures) and
  `.cache/bughunt-840-queue-before.log` (three failures).
- Focused post-fix suites: **10 terrain readiness tests** and **6 queue tooling
  tests** pass. The queue tests use isolated directories and command shims.
- Round 1: `GATES_CONFIG_MODE=writable PW_PORT=4840 tools/gates.sh --full-e2e`.
  Build/typecheck, **136 unit files / 1,422 tests**, **144 Python tests**, strict
  content and attribution pass. Formatting fails on the pre-existing missing
  heading gap fixed above. Both browser gates stop before assertions at preview
  startup; project-base production build passes. Logs:
  `.cache/bughunt-840-round1.log` and `.cache/bughunt-840/round1/*.log`.
- Round 2: the same full-gate command passes build/typecheck, **136 unit files /
  1,429 tests**, **148 Python tests**, strict content, attribution and repository
  formatting. Root and project-base production builds pass. Both E2E gates
  again stop at preview startup before any assertions; overall gate exit is 1.
  Logs: `.cache/bughunt-840-round2.log` and
  `.cache/bughunt-840/round2/*.log`. Final `git diff --check`, changed-file
  Prettier and Bash syntax checks pass.
- Direct preview probe confirms `listen EPERM: operation not permitted
127.0.0.1:4173`; `.cache/bughunt-840/preview-probe.log`.
- A direct headless Chromium launch also fails before page creation with
  `sandbox_host_linux.cc:41 ... Operation not permitted`. Browser checks and
  screenshots cannot be verified in this sandbox. Re-run the full-gate command
  on a browser-capable host and inspect the Surface, Journal, portrait, save-soak
  and hero screenshots; successful static gates do not imply browser success.
