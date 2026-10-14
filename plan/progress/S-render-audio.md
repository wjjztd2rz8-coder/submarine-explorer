# S-render — shared hull-creak dispatch

2026-10-13. Backlog item 18, `plan/DIRECTOR.md` §6. Branch:
`codex/1670-S-render-hull-creaks`, based on `0968fed`. The unfinished audio code
portion is implemented; **S-render as a whole is not DONE**.

## Ownership and integration evidence

Before editing, inspected launched briefs 1560–1590 and 1610–1670, the available
result/final reports for 1560–1590 and 1610–1640, and live status/diffs and commits
ahead of main for every registered worktree. Main and this worktree were clean.
The finished 1570–1590 and 1610–1640 worktrees still held uncommitted changes
awaiting collection; their result reports were not treated as merge evidence.
No worktree had commits ahead of main or live changes to `AudioSystem.ts`,
`audio.test.ts`, `f3Audio.test.ts` or `audioLifecycle.test.ts`.

1580 has live changes to `src/app/systems/audio.ts` and
`tests/unit/audioTouchUnlock.test.ts`; both remain untouched here. 1650 owns the
scarp refactor and 1660 owns shared title rendering. Neither intersects this
implementation. Brief 1560 and `plan/progress/S-render.md` explicitly deferred
creak consolidation. The latest review/overnight log record S-rov collection;
`git merge-base --is-ancestor 05a4d1a HEAD` and the same check for `59d4747` both
returned exit 0, confirming the S-rov integration and cleanup are in this base.
No new ownership overlap was found.

## Consolidation and preserved contracts

`AudioSystem.tryHullCreak()` now owns the common engine/disposed/pause/visibility
eligibility check, AudioContext clock read, shared `lastCreakAt` check and update,
cue playback and caption emission. Source-specific eligibility and calculations
remain at the existing event subscriptions and frame hook:

| Input            | Eligibility and cue stress                                              | Incoming cooldown gap                                      | Caption                                                  |
| ---------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| `sub:hullStress` | Only `cause: 'pressure'`; supplied stress unchanged, no depth cutoff    | `maxGap - stress * (maxGap - minGap)` from existing config | `hull-creak`, “Hull creaks under pressure”, 1.2 s        |
| `env:trench`     | Existing event input; `clamp(-depth / HADAL_TOP_M - 1, 0, 1)`           | Existing `hullCreakMinGapS`                                | `trench-creak`, “Hull creaks under deep pressure”, 1.2 s |
| Frame update     | Strictly below -200 m; `max(hullStress ?? 0, min(0.3, -depth / 20000))` | `20 - min(1, hullStress ?? 0) * 17` seconds                | `hull-creak`, “Hull creaks under pressure”, 1.5 s        |

All paths still use the incoming source's established gap against the last
successful creak from any source. The boundary is inclusive. The timestamp is
reserved before playback/caption callbacks, preventing coincident and re-entrant
inputs from dispatching twice during cooldown. Rejected inputs do not consume
cooldown. Impact stress remains silent; `sub:collided` keeps its separate thud and
“Hull scrapes bottom” caption, independent of creak cooldown.

Locked means the engine has not been created; no new AudioContext state guard is
introduced. Existing gesture unlock/retry behavior is preserved. Pause/visibility
blocking, saved sound gains and mute remain on their existing paths. Muting still
silences the master mix while emitting captions; caption enable/disable remains
owned by the existing caption integration. Disposal checks also cover an event
callback already snapshotted by EventBus when an earlier listener disposes audio.
Existing subscriptions, loop cleanup and fresh-system re-entry remain intact.

Production source is two lines smaller, with one cue invocation and one timestamp
update replacing three copies. No scheduler, timer, config, UI, settings, site
branch or new capability was added. Cue synthesis, soundscape, integration,
save/input, workflows, tools, shared documentation and `plan/progress/S-render.md`
were not edited. All terrain, site/hero identities, scan/Journal, marine-life,
input and accessibility contracts remain outside the implementation changes;
Arcade remains the default. No assertions were weakened and no skips were added.

## Validation

Extended the existing unowned `audioLifecycle.test.ts` by 25 cases, using its fake
AudioContext clock and real cue graphs with cue/caption spies. Cases cover
configured pressure stress gaps, trench stress clamping, frame depth/stress
floors and cadence, immediately-before/exact-boundary timing, impact versus
pressure and independent collision thuds, all six same-tick source orderings,
caption re-entry, locked/paused/hidden/disposed inputs, listener snapshots,
muted captions/gains, cleanup and fresh-system re-entry. Existing soundscape,
scan, caption and touch-unlock regressions remain intact.

- `npm run typecheck`: **PASS**, exit 0.
- Initial `npm test -- tests/unit/audio.test.ts tests/unit/f3Audio.test.ts tests/unit/audioLifecycle.test.ts tests/unit/audioTouchUnlock.test.ts`:
  **blocked at startup**, exit 1, `EROFS` writing the bundled Vitest config into
  the read-only shared `node_modules/.vite-temp`. No tests ran in that attempt.
- `npm test -- --configLoader runner tests/unit/audio.test.ts tests/unit/f3Audio.test.ts tests/unit/audioLifecycle.test.ts tests/unit/audioTouchUnlock.test.ts`:
  **PASS**, exit 0, 60 tests / 4 files (before the final two disposal cases).
- Final `npm test -- --configLoader runner tests/unit/audio.test.ts tests/unit/f3Audio.test.ts tests/unit/audioLifecycle.test.ts tests/unit/audioTouchUnlock.test.ts tests/unit/captions.test.ts tests/unit/gameScanner.test.ts`:
  **PASS**, exit 0, **93 tests / 6 files**, 1.44 s, no skips.
- `npm run build -- --configLoader runner`: **FAIL**, exit 1, Vite's module runner
  closed before the PWA plugin's late dynamic import. No repository config or
  plugin was changed to work around this environment/toolchain issue.
- Used the existing writable-config pattern documented in `tools/gates.sh`:

  ```bash
  mkdir -p .cache/s-render-audio
  node --input-type=module <<'JS'
  import { build } from 'rolldown';
  await build({ input: 'vite.config.ts', platform: 'node', external: ['vite'],
    output: { file: '.cache/s-render-audio/vite.config.mjs', format: 'esm' } });
  JS
  npm run build -- --config .cache/s-render-audio/vite.config.mjs --configLoader native
  ```

  **PASS**, exit 0, including final typecheck, production assets, public copy and
  service-worker stamping. The existing large-chunk warning remains.

- `npm run format:check`: **PASS**, exit 0.
- `npx prettier --check src/audio/AudioSystem.ts tests/unit/audioLifecycle.test.ts plan/progress/S-render-audio.md`:
  **PASS**, exit 0. `git diff --check`: **PASS**, exit 0.

No rendering-dependent gates, browser/game rendering, screenshots, golden
captures, nightly execution or hosted-CI validation were run for this package.

`git add src/audio/AudioSystem.ts tests/unit/audioLifecycle.test.ts plan/progress/S-render-audio.md`
was **blocked**, exit 128: Git could not create the worktree's `index.lock` on the
read-only Git metadata filesystem. Changes remain uncommitted. Intended scoped
commit: `audio: consolidate S-render hull-creak dispatch`. No merge, push or tag
was attempted.

## Pending before collection

Manual listening is **pending**, not passed: check pressure/trench/frame creaks,
collision thuds, pause/visibility return, mute with captions and dive re-entry on
an audio-capable host. Automated spies verify dispatch and graph cleanup, not
perceived loudness or sound quality.

Claude retains golden comparison and the rubric's **Readable, Beautiful and
Phone-OK** judgments before collection; these are **pending**, with no Codex
visual acceptance claim. The scarp/title briefs and first hosted nightly review
remain separate S-render work; hosted-CI work remains with 1610.
