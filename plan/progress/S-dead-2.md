# 122 S-dead: second sweep — 2026-11-04

Serves the standing S-dead item. Offline audit; no dependencies added.

Plan completed: inspect exports, config fields and CSS against source, tests,
tools and data; remove proven unused surfaces; repeat the reference audit and
check the UI syntax trees; run gates. Behaviour is unchanged by construction:
live declarations stay local, and deleted config/CSS had no consumer or producer.
DIRECTOR.md is untouched; no merge or push.

Round one removed these export modifiers from `src/ui/`:

| Module          | Declarations kept local                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PauseMenu       | `PauseObjective`, `PauseActions`                                                                                         |
| ControlsCard    | `INPUT_DEVICES`, `ControlRow`, `ControlGroup`, `ControlsCardOptions`                                                     |
| Journal         | `GuideEmitter`                                                                                                           |
| Globe           | `GlobeEmitter`, `GlobeOpenSource`, `GlobeOptions`                                                                        |
| Briefing        | `BriefingOptions`, `DiveSettingsOptions`                                                                                 |
| Home            | `HomeActions`                                                                                                            |
| Settings        | `UI_SCALE_MIN`, `UI_SCALE_MAX`, `UI_SCALE_STEP`, `RESERVED_KEYS`, `SettingsInput`, `RebindPlan`, `SettingsScreenOptions` |
| HUD             | `HudContext`                                                                                                             |
| HullGauge       | `HULL_GAUGE_HIDE_RATIO`                                                                                                  |
| Sonar           | `LabelBox`                                                                                                               |
| ObjectivesPanel | `CompletionBanner`, `formatProgress`                                                                                     |

Also deleted `FIRST_MINUTE_GUIDANCE.fadeMs` (only its declaration existed) and
`.mission-badge.is-available` (MissionSelect emits missing, recommended and
pending badges, never that class). Guidance consumers read other named fields;
no generic config enumeration uses the deleted field. Live badge rules stay.
All cuts are logged in CHANGELOG.md. Source is five lines and 25 exports smaller.

Round two checked exact names and import/re-export/namespace/dynamic consumers.
No removed export has a named consumer outside its own module. Production code
has no namespace/dynamic consumer of these UI modules; the ObjectivesPanel mock
in firstMove spreads the original module but never uses the removed exports.
Rolldown's installed parser compared each edited UI module with HEAD after
normalising the 25 export wrappers and source positions: all other syntax-tree
nodes match. The repeated config/class-name scan found no additional keys used
only by config declarations/defaults or class names absent from non-CSS files.
These grep checks identify candidates; they do not establish that every
dynamically indexed setting or selector is dead. Audit evidence lives in
`.cache/s-dead-2/{cuts.json,audit.mjs,audit-round2.log,reference-round2.log}`.

Validation:

- PASS: typecheck; production root and `/submarine-explorer/` builds; strict
  content; attribution; full-repository Prettier check; `git diff --check`.
- PASS: 547 focused unit tests across guidance (149), settingsScreen (4),
  predive (7), f3Onboard (31), uiHud (15), uiSonar (53), overlayFocus (181),
  homeFocus (11), journalGroups (44) and missionRouter (52). Each ran separately
  with `npx vitest run tests/unit/<name>.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1`.
- `firstMove` produced no completed result before its 45-second timeout. The
  full unit retry also timed out after 300 seconds without results (exit 124):
  `timeout 300s npm test -- --configLoader runner --cache=false --pool=threads --maxWorkers=1`.
- Python: 162/167 pass. Four unchanged CI-manifest tests fail with
  `spawnSync git EPERM`; unchanged golden-tooling comparison fails while parsing
  empty JSON. No Python/tool files were edited.
- Focused Playwright, full `npm run test:e2e` and project-base spec stop before
  tests at preview startup. Debug logs show localhost IPv4/IPv6 `connect EPERM`.
  No screenshots were produced; no visual acceptance is claimed.

Capability searches covered guidance, Controls, mission badges and the shell in
`tests/e2e`. Focused commands (each with its own preview port):

```bash
GATES_CONFIG_MODE=writable PW_PORT=4323 PW_OUTDIR=dist-s-dead-2 npx playwright test tests/e2e/d-shell.spec.ts -g 'home, site grid, pause, objectives, resume and quit'
GATES_CONFIG_MODE=writable PW_PORT=4324 PW_OUTDIR=dist-s-dead-2 npx playwright test tests/e2e/f-first-minute-620.spec.ts -g '620 guidance desktop.*Controls stays reachable from Pause while the tutorial is up'
```

Gate run: `GATES_CONFIG_MODE=writable PW_PORT=4322 PW_OUTDIR=dist-s-dead-2 bash tools/gates.sh`.
Detailed gate logs: `.cache/runs/20261104-004749-3-Rgp6Nj/`; follow-up build,
unit and browser logs: `.cache/s-dead-2/`. Default two-worker unit execution
stalled without results and was interrupted; the one-thread full retry timed
out. Temporary root/project-base build outputs were deleted after validation.
Gate completion remains blocked by the recorded validation failures.
