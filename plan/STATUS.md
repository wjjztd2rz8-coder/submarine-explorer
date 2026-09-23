# Status — 2026-09-23 Phase C close-out

This is the current handoff. Earlier checkpoints, including the original
Claude pacing/model instructions, are preserved in
[the status archive](archive/STATUS-before-2026-09-23-closeout.md).
Do not use historical pending lists to repeat completed work.

## Owner direction and model mapping

- Finish Phase C and prepare Phase D briefs. The owner has **not yet
  playtested Phase C** (confirmed this session). **No Phase D code yet.**
- GPT-6 Astra replaces Fable for orchestration/planning; GPT-6 Sol replaces
  both Opus and Sonnet for implementation, QA and documentation. Preserve
  Claude-specific instructions for Claude sessions.
- At most two implementation subagents at once; orchestrator reviews their
  work and requests corrections before progressing.
- No push, repository creation or Pages activation without the owner's
  go-ahead. Local CI/deployment preparation does not mean the site is live.

## Reviewed state at resumption

Other agents completed C1, C5 integration and all remaining C4 packs, then QA
and the HUD warning/title fixes. Baseline HEAD was `c1489fd`; README,
architecture and master-plan reconciliation remained uncommitted and has
been preserved. Prior untracked QA report files were also preserved.

| Package | Implementation state                                                              | Remaining acceptance / limitations                                                                  |
| ------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A/B     | Existing foundation, atmosphere, controls, audio, Titanic discovery/mission/props | Deferred visual polish; hardware performance unverified                                             |
| C1      | Globe, keyboard controls, species tab, thinner rim, e2e and axe checks            | Owner interaction review; no measured target-device performance                                     |
| C2      | 13 real landmark tiles, inventory, compression tooling                            | No brotli files; runtime uses float32                                                               |
| C3      | All eight presets integrated; currents, trench creaks, carbonate material support | Shimmer/brine are visual approximations; source limits documented                                   |
| C4      | All 13 landmark missions, guides, props and species files exist                   | Close-out verifies real scans through debrief; natural routes need owner playtest                   |
| C5      | Settings, bindings, captions, palettes, reduced motion wired                      | Reset discoveries / apply-reload close-out in progress; no gamepad rebinding or separate LOD slider |
| C6      | CI and deployment workflows, filtered build and project-base URLs                 | Site unpublished; workflows not yet verified on GitHub                                              |

## Current close-out work

Two GPT-6 Sol agents are completing the remaining C5 controls and content QA.
The orchestrator reviewed the recent HUD layout fixes, added retained strict
content and project-base checks to CI, and prepared `PHASE-D-BRIEFS.md`.

- C5: explicit confirmation before clearing discoveries, preserve settings
  and bindings, verify storage removal, protect newer save versions, and
  reload so guide/scanner/run state stays consistent. Apply/reload for
  boot-only settings must show when saving is unavailable.
- Content: correct Lost City facts against primary literature; acknowledge
  Challenger Deep's intended pressure warning through precise reviewed
  metadata, never by changing real depths or silently disabling warnings.
- QA: retain all-13-mission scan-to-debrief tests and HUD layout regression
  checks instead of relying on deleted ad hoc probes.
- Documentation: preserve and finish the existing reconciliation; distinguish
  implementation completion from manual acceptance and publishing.

## Verification

Reviewed baseline: build, 375 unit tests, 107 Python tests, 42 browser tests
(+1 opt-in project-base skip), attribution all pass. The strict content
validator initially failed on four warnings: one intentional Challenger
pressure-band warning and three Lost City single-source entries. The older
QA report's wording did not reflect strict mode's nonzero exit status.

Final close-out checks will replace this paragraph when complete. Use:

```bash
npm run check:content
npm run ci
```

During concurrent work, use isolated build/output directories and ports per
`CONTRIBUTING-AGENTS.md`. `npm run test:e2e:base` separately builds and verifies
`/submarine-explorer/` hosting; the ordinary browser run skips that test.

## Next session

1. Read this status, `plan/QA-C.md` and close-out addenda; inspect git status
   and log. Preserve existing work; only repeat checks when changes justify it.
2. Resolve any remaining Phase C close-out findings recorded above.
3. Owner playtest: ordinary navigation/scanning at Titanic, a vent, a canyon,
   Challenger Deep and a shallow site; report visibility, controls and pacing.
4. Review the proposed `plan/PHASE-D-BRIEFS.md` against that feedback. Write
   Phase D contracts before implementation. Do not begin Phase D runtime code
   until the playtest gate is satisfied.
5. Publishing is a separate owner decision; do not push or enable Pages.

Known nonblocking limits: existing large-JS-chunk warning, duplicate emitted
Draco decoder assets, software-rendering versus real GPU performance, no
independent gamepad bindings, no true refraction/reflections, and bathymetry
resolution/time limitations documented in the site guides and tile inventory.
