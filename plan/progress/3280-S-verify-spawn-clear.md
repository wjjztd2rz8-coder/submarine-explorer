# S-verify: mission opening range and spawn clearance

- Item ID: **S-verify**, DIRECTOR backlog item 9 (standing numeric verification).
- Pinned input SHA: `6b7a7ce3df094e5600b8d9af79e63f19bd32e7e3`.
- Read `plan/DIRECTOR.md`, the tail of `plan/OVERNIGHT-LOG.md`, and
  `CONTRIBUTING-AGENTS.md` before implementation. Initial checkout was clean.
- Scope: the latest per-site mission `rangeM` / `yawOffset` changes, all 13
  authored sites and Low/Medium/High. No game rendering or visual acceptance.
  Completed 3130–3270 slices were not rerun as separate audits; the unmerged
  2980/3050 worktrees were not accessed or changed.

## Evidence and materially missing contracts

The unchanged focused baseline passed **80/80** tests across the two owned
capability specs (`.cache/3280-focused-baseline.log`). The existing approach
fixture already enumerates all 39 site/tier pairs, exact authored ranges,
terrain clearance using actual visible hull vertices, prop keepout, safe depth,
navigation projection and a sampled approach corridor.

The existing composition fixture loaded every shipped prop and navigated with
real physics, prop contact and scanning only on Low. Expanded that same fixture
to all three tiers, retaining its assertions and existing free-dive checks.
Geometry is loaded headlessly; only GLB texture decoding is replaced with empty
textures. The fixture uses `DeepOpeningSpawn.composedMissionSpawn`, the entry
point called by `missionSystem.applyMissionStart`, with depth-fitted hulls,
resolved Arcade settings, real heightmaps and all shipped prop colliders.

Added exact runtime first-target range and signed scanner turn checks. The
approach fixture also checks the sign of the authored yaw offset: its existing
dot-product check alone accepts either sign. Added an attempted scan from the
opening, aimed directly at the objective, asserting no candidate, progress or
completion. This isolates range rejection from the authored heading offset.

The runtime scan radius includes equipment scaling and Arcade's **100 m floor**
after the mission cap. Endurance/Bismarck at 110 m therefore leave **10 m** before
scan range, and Titanic/Challenger at 140 m leave **40 m**. The older raw-sensor
`range - radius >= 60 m` assertions remain intact, but do not describe that final
resolved Arcade radius. A positive approach satisfies the owner's revised rule;
no artificial 60 m runtime floor or site exception was introduced.

## Findings and retained failures

All **39/39 mission openings** kept the first target outside resolved scan
range, clear of terrain and prop colliders, and reachable after a short
approach. Every runtime first scan completed with **zero prop-contact frames**,
no hull breach, and at least **12.00 m** centre-to-terrain clearance throughout
the route. The smallest mission visible-hull vertex gap was **15.12 m**; the
retained free-dive checks also passed on all tiers (minimum **13.06 m**).

The following measurements cover all three tiers; hull gap is the minimum over
those tiers and time includes scanning. Source: `.cache/spawn-audit.json` (39
records, with site/tier coverage checked independently).

| Site                 | Opening range (m) | Resolved scan radius (m) | Minimum mission hull gap (m) | First scan completed (s) |
| -------------------- | ----------------: | -----------------------: | ---------------------------: | -----------------------: |
| axial-seamount-ashes |               180 |                      144 |                        18.96 |              10.52–10.52 |
| beebe-vent-field     |               220 |                      192 |                        38.14 |                9.88–9.88 |
| bismarck             |               110 |                      100 |                        21.38 |                7.27–7.27 |
| blake-plateau-corals |               160 |                      120 |                        48.03 |                8.82–8.82 |
| challenger-deep      |               140 |                      100 |                        16.82 |              10.97–10.97 |
| endurance            |               110 |                      100 |                        20.72 |                7.27–7.27 |
| great-blue-hole      |               150 |                      100 |                       109.49 |                9.57–9.57 |
| hudson-canyon        |               160 |                      120 |                        15.12 |                9.82–9.82 |
| hunga-tonga-caldera  |               160 |                      120 |                        34.56 |                7.82–7.82 |
| kamaehuakanaloa      |               200 |                      168 |                       130.02 |                9.20–9.20 |
| lost-city            |               220 |                      192 |                        46.07 |                9.90–9.92 |
| monterey-canyon      |               240 |                      216 |                        80.12 |                6.55–6.55 |
| titanic              |               140 |                      100 |                        26.06 |                9.08–9.08 |

No production opening defect reproduced; no production fix is proposed.

The aggregate Python tooling gate retains **5 failures / 167 cases**:

- Four provenance tests in `tools/tests/test_ci_build_manifest.py` report
  `spawnSync git EPERM` at `tools/ci-build-manifest.mjs:11`, including captured
  status 0 and a SHA in stdout. Smallest proposed remedy: validate on a runner
  with functioning Node synchronous child-process support; do not alter game
  code or weaken provenance assertions to accommodate the runner.
- `test_golden_tooling` fails at
  `tools/tests/golden-manifest.test.mjs:151`: `JSON.parse(report.stdout)` receives
  an empty report (`Unexpected end of JSON input`). Smallest proposed follow-up:
  have the tooling owner diagnose the child's status/stdout/stderr and restore
  complete CLI JSON output on the runner. Its root cause is not established by
  this audit; no speculative golden-tool change or test relaxation was made.

Both signatures were already recorded in the earlier spawn audit note; these
failures are retained independently of the passing opening checks. Tools remain
unchanged. Gate logs live under
`.cache/runs/20261022-230254-3-OqqNvC/`; aggregate log:
`.cache/3280-gates.log`.

## Simplicity

- Extended two existing capability specs; no new spec, helper framework,
  dependency, setting, UI, save schema or production branch.
- Reused the existing all-prop loader, navigation loop and audit output. Tier is
  one table parameter; no duplicated fixture or alternate opening algorithm.
- Added missing prop disposal to the approach fixture alongside its existing
  mesh/terrain disposal.
- No assertions relaxed, retries added or tests skipped. Production behavior,
  site data, art, CSS, layout and camera poses were not edited.

## Validation and limits

- Baseline focused specs: **80/80 passed**, 59.16 s.
- Initial typecheck and owned-test formatting: passed.
- Expanded focused specs: **106/106 passed**, 74.10 s
  (`.cache/3280-focused.log`), with `SPAWN_AUDIT=1`.
- Required command: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
- Aggregate result: **FAIL**, exit 1, solely from the five Python tooling cases
  documented above. The command ended with `FAIL gates (e2e=none)`.

| Gate                         | Result                                                                |
| ---------------------------- | --------------------------------------------------------------------- |
| Config                       | PASS                                                                  |
| Python tooling               | FAIL: 5 of 167 cases, retained above                                  |
| Content                      | PASS                                                                  |
| Root build / final typecheck | PASS                                                                  |
| Full unit suite              | PASS: 192 files; 3,802 passed, 4 existing expected failures; 544.68 s |
| Attribution                  | PASS                                                                  |
| Repository formatting        | PASS                                                                  |
| Root / project-base e2e      | Not run: mode **none**                                                |

- Actual e2e mode: **none**. No browser, screenshots or game rendering.
- Numeric hull clearance samples visible mesh vertices against terrain; prop
  keepout uses the runtime collision sphere with an extra 4 m margin. This is
  not an exhaustive triangle-intersection proof for every hull cosmetic.
- The navigation fixture demonstrates one controlled route per opening, rather
  than all possible player inputs. Browser lifecycle, actual phone play and
  visual framing remain outside this audit.

Final owned-file formatting and `git diff --check` passed after recording the
gate results. The input SHA is unchanged. Only the two owned capability specs
and this progress note are modified; no merge, push or tag was performed.
