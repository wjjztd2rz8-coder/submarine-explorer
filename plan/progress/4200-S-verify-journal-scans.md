# 4200 — S-verify: shipped scan targets and Journal entries

DIRECTOR Backlog **7, S-verify / S-bughunt [Codex, standing]**, 2026-10-25.
Audited HEAD: **`c4c6d2a97ad6e768211aa76c524b6648913ee02a`**, pinned before
reading or diagnostics; initial worktree clean.

**Clean, bounded headless audit.** All **117 static targets** across the
13 shipped sites have a collision-free local scan pose in both Arcade and
Realistic: **234 first completions**, each with exactly one explicitly linked
Journal entry. Full same-dive repeat attempts add no writes or completions.
Another **234 return-dive completions** retain Journal identity and first
timestamps, with `firstTime: false` and the intended count increment to two.
No supported-path defect or production correction is proposed. Only this note
is added; local e2e mode is **none**.

## Intake, existing evidence and the remaining gap

Read CONTRIBUTING-AGENTS.md, all of DIRECTOR.md (Backlog, seven simplicity
rules and review rubric), the last 180 lines of OVERNIGHT-LOG.md through
run 146, and every available progress note from 4000 through 4140.
There is no 4100 progress file at this pin; run 143 explicitly records its
completion without a note. No applicable AGENTS.md was found in the worktree
or its ancestors. The explicit report-only/nonvisual brief takes precedence
over CONTRIBUTING-AGENTS' generic build/browser/screenshot instructions.
4150/4160/4170 and owner-blocked S-collision work were not investigated or edited.

The exact combined slice was not already covered. Existing evidence is reused
where sufficient:

| Existing evidence                                                                                                                                                                                                          | Contract already covered                                                                                                            | Boundary for this audit                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [3810](3810-S-bughunt-scan-targets.md), [gamePois](../../tests/unit/gamePois.test.ts), [missionComposition](../../tests/unit/missionComposition.test.ts)                                                                   | All authored POIs retained on real Low terrain; safe local primary scan poses with shipped props                                    | Optional POIs and curiosity targets together with props, resolved modes and Journal persistence    |
| [exploreTerrain](../../tests/unit/exploreTerrain.test.ts), [3210](3210-S-verify-secret-journal.md), [3220](3220-S-verify-sample-journal.md), [modesExploration](../../tests/unit/modesExploration.test.ts)                 | Secret/sample terrain placement and physics; shipped scan-to-Journal linkage and collection/reset behavior                          | Terrain physics fixture has no shipped Props; linkage fixtures isolate targets and use flat ground |
| [3850](3850-S-bughunt-journal-scan-reward.md), [gameScanner](../../tests/unit/gameScanner.test.ts), [journalData](../../tests/unit/journalData.test.ts), [gameDiscoveryStore](../../tests/unit/gameDiscoveryStore.test.ts) | Same-dive suppression, return-dive count increments, reload retention, grouped POIs and one wildlife identity per site/species      | These remain the established policies; no replacement or duplicated permanent tests                |
| [copyJournal](../../tests/unit/copyJournal.test.ts), [journalGroups](../../tests/unit/journalGroups.test.ts)                                                                                                               | All-site authored linkage and provenance; one front-page caveat and one entry tag through refresh                                   | Existing guards are rerun unchanged; no external factual-source revalidation                       |
| [3180](3180-S-verify-wildlife-journal.md), [4060](4060-S-bughunt-scan-after-floor.md), [lifeDisposal](../../tests/unit/lifeDisposal.test.ts)                                                                               | All 100 shipped site/species Journal identities, live-list disposal/selection, 100 m wildlife floor and moving-position publication | No new opening-life, prop-mask, instance-sync or mover-population matrix                           |
| [4030](4030-S-verify-life-clamp-shipped.md), [4120](4120-S-bughunt-difficulty-modes.md), [4130](4130-S-verify-endurance-clearance.md)                                                                                      | Birth-frame clamp fix, live mode/range behavior, current first-target scan exclusion                                                | Not repeated as life, mode-switch or opening-composition audits                                    |

Inspected Scanner selection/completion, mission primary radius caps, modes
scaling, Secrets/Samples placement, Explore registration, JournalData and
Journal's tag writer. Compared relevant paths against 3850's audited SHA
`38afe4991d121c6b6c295b6a47d27fd6c45eeffb`: Scanner, Pois, JournalData,
Journal, Life, Explore, and the copyJournal/journalData/journalGroups/gameScanner
specs are unchanged. Of those paths plus LifeSim, only LifeSim differs
(11 changed lines, the collected clamp/integration changes). This is a local
source comparison, not a new validation of historical runs or hosted CI.

## Disposable diagnostic and retained evidence

Artifacts are under **`/tmp/4200-journal-scans/`**. `build-probe.py` generates
`probe.test.ts` and `vitest.config.mjs`. The configuration imports the existing
Vitest config and changes only the included file: Node environment, worker
limit and 30 s test timeout remain unchanged. No repository config is edited.

The probe enumerates `data/landmarks/index.json` independently. Every site uses
its actual metadata and Float32 `heightmap.bin` with production Low `Terrain`,
including normal detail/reconstruction sampling. Binary lengths must equal
`cols * rows * 4`. Production Props loads **all 53 placements** once across
13 sites: **51 procedural and 2 GLB**, zero failures or skipped placements.
GLBs use the production GLTFLoader with image decoding alone replaced by empty
textures, following missionComposition's existing headless practice.
No renderer, browser, canvas drawing or WebGL context is constructed.

For each site and each named mode:

1. Resolve fresh effective settings once with `resolveEffective`. Place all
   authored POIs, secrets and samples with their production functions. Apply
   the existing near-site cap to mission primaries only, then the effective
   equipment/sensor multiplier and scan floor to fixed POIs. Supplemental
   radii retain their authored policy and Scanner applies its mode floor.
   This mirrors the inspected mission/modes callers; those app systems are
   not instantiated by this probe.
2. Keep the complete fixed/supplemental pools installed, including authored
   arrival-event contacts. Resolve real Mission objectives using POI IDs.
   Use `nextScanObjective` for actual mission priority, scanning primaries,
   remaining POIs, then curiosities. Wildlife is covered separately by the
   existing capabilities; no fabricated animals are inserted into this pool.
3. Search 64 bearings at 0.75, 0.5, 0.9 and 0.25 of each resolved radius.
   Require terrain containment, existing hull/seabed/surface/rated-depth and
   minimum-depth limits, attainable pitch and no prop-sphere collision.
   Fit the normal depth-based hull through `requiredHull` (A/B/C), rather
   than assigning C everywhere. Require Scanner's actual candidate to be
   the intended target after a real physics step and PropContact resolution.
4. From the retained pose, hold Scan through the complete dwell at 1/60 s,
   running `Submarine.step(FROZEN_INPUT)` and real PropContact each frame.
   Require no prop collisions or hull breach and exactly one matching
   first-time completion, discovery key and linked Journal entry. A newly
   scanned target must retain count one through further hold/release attempts.
5. After all contacts finish, attempt full-duration held and release/repress
   scans again at every retained pose with the full pools still installed.
   Require identical saved state, no extra writes and no extra completions.
   Reload storage and verify identical snapshots and unlocked Journal keys
   with no load-time writes. Then isolate each target in a fresh return-dive
   Scanner, complete/repeat it, require one `firstTime: false` event and count
   two with the original timestamp, unchanged unlocked keys and exact reload.

Initial placement/aim is a controlled local witness, not a simulated route
from the opening. During first-dive dwell there is no pose, velocity, target,
scan-duration or physics override. Return-dive identity checks deliberately
use stationary retained poses and isolated targets; they are persistence
checks, not another physical approach claim.

`results.json` retains all 234 target/mode records: target coordinates,
radius/depth/dwell inputs, fitted hull, full pool IDs, event IDs, candidate
search attempts, initial and post-step poses, final position/view, collision
count, minimum centre-to-ground gap, completion payload, Journal key/tag and
return-dive payload/record. `records.jsonl` retains first-dive observations
as they occur. `summaries.json` retains all 26 mission counts, first/return
store snapshots, unlocked-key lists and write counts. `inputs.json` records
SHA-256 hashes of the shipped content/heightmaps and GLB files; the audited
git pin identifies their source. `summarize.py` independently checks the
retained totals and writes `summary.txt`. These are local temporary artifacts.

| Artifact         | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `probe.test.ts`  | `82c53a3ed952b060cb06df9c864ab8ea0e7d3cab7e5e162a97be1d03aa803c11` |
| `results.json`   | `1a2407523eb4206c7340c9595ed54bbff6a01014777fbdba1e4b125d2bab2281` |
| `summaries.json` | `eb3e72ec402e800e7466df9416fa29146dfb53188c6b5f0129c6507e089ff061` |
| `inputs.json`    | `728487456afd85840f7fcefb1d7c4f3a4b9fd58e01b55fc8a6fc2a746c10ff8b` |

## Results and policy distinctions

Each row runs in **both** modes. Secrets and samples are supplemental scan
targets; arrival-event contacts remain hint/witness contacts and intentionally
cannot complete a beam scan.

| Site                 | Primary POIs | Other POIs | Secrets | Samples |
| -------------------- | -----------: | ---------: | ------: | ------: |
| great-blue-hole      |            2 |          2 |       3 |       2 |
| hunga-tonga-caldera  |            2 |          1 |       3 |       2 |
| blake-plateau-corals |            2 |          2 |       3 |       2 |
| lost-city            |            2 |          2 |       3 |       2 |
| kamaehuakanaloa      |            2 |          1 |       3 |       2 |
| axial-seamount-ashes |            2 |          2 |       3 |       2 |
| hudson-canyon        |            2 |          1 |       3 |       2 |
| monterey-canyon      |            2 |          3 |       3 |       2 |
| endurance            |            2 |          2 |       3 |       2 |
| titanic              |            2 |          5 |       3 |       2 |
| bismarck             |            2 |          1 |       3 |       2 |
| beebe-vent-field     |            2 |          1 |       3 |       2 |
| challenger-deep      |            2 |          3 |       3 |       2 |
| **Total per mode**   |       **26** |     **26** |  **39** |  **26** |

All 234 first-dive scans pass with **zero prop collisions**, no hull breach,
and every mission objective complete (49 objectives per mode). The minimum
measured physics-centre height above terrain during dwell is
**12.339067406786766 m**. Every candidate is found within **24** search attempts.
This is an observed local witness, not proof about every approach direction.

The 117 target identities map to **111 explicit Journal keys**. Multiple POIs
may intentionally share their authored entry; a scan can also unlock the site
overview and scientifically linked survey-species entries. Thus “one entry”
means one explicit target-linked entry, not exactly one newly unlocked row
or a one-to-one relationship between scan totals and Journal totals.
Repeated scans never append Journal rows. The 234 records contain 70 Recreation,
130 Game addition and 34 untagged target links across both modes. Existing
copyJournal checks the authored provenance and absence of repeated caveats;
journalGroups checks that refreshes retain exactly one tag on an addition.

Return-dive rescanning intentionally increments completed-scan counters while
retaining the first discovery timestamp and entry identity. A later scan
completing a fresh mission objective is also intentional. Arrival sightings
use witnessing rather than scanning. None is classified as a duplicate bug.
No unsupported post-scan Mission re-resolution or arbitrary storage mutation
is used to manufacture a discrepancy. The synthetic unsupported transition
in 4090 and shallow-column life conflicts in 4030 remain their prior evidence.

## Exact commands and actual outcomes

All commands ran from the pinned worktree. Logs are under the temporary audit
directory; no gate wrapper or hosted workflow was invoked.

```bash
git rev-parse HEAD
git status --short
python3 /tmp/4200-journal-scans/build-probe.py
node node_modules/vitest/vitest.mjs run --config /tmp/4200-journal-scans/vitest.config.mjs --configLoader runner --cache=false --reporter verbose > /tmp/4200-journal-scans/probe-final.log 2>&1
python3 /tmp/4200-journal-scans/summarize.py > /tmp/4200-journal-scans/summary.txt
```

Generator, final diagnostic and independent summary: **exit 0**.
Diagnostic: **1 file / 13 site cases passed, 7.73 s**. Summary checks 234
first scans, 234 return scans, 26 complete mission runs and zero same-dive
repeat writes. The earlier completed diagnostic, before adding the full-pool
full-duration repeat pass and retained summary snapshots, also passed all
13 cases (**7.61 s**, `probe.log`). The final run supersedes it.

The first harness attempt failed **13/13**, exit **1**, **7.36 s**:
`probe-fixture-error.log`. It passed objects instead of IDs to Mission.resolve
and called a nonexistent `currentObjective` method. Correcting only the
disposable harness to `resolve(fixed.map(t => t.id))` and
`nextScanObjective(mission.objectives).poiId` removed those fixture errors.
No product scan failed in that attempt; no failing-before/fixed-after product
claim is made.

```bash
node node_modules/vitest/vitest.mjs run --configLoader runner --cache=false tests/unit/gamePois.test.ts tests/unit/gameScanner.test.ts tests/unit/gameDiscoveryStore.test.ts tests/unit/journalData.test.ts tests/unit/journalGroups.test.ts tests/unit/copyJournal.test.ts tests/unit/gameExplore.test.ts tests/unit/modesExploration.test.ts tests/unit/lifeDisposal.test.ts tests/unit/discoveryReward1240.test.ts > /tmp/4200-journal-scans/capabilities.log 2>&1
```

Existing capabilities: **exit 0, 10 files / 361 tests passed, 5.33 s**.
No skips or expected failures in this selection. Tests and assertions are
unchanged; the four owner-blocked collision expected failures are outside it.
DOM fixtures perform object/text assertions without browser layout or drawing.

Final owned-note checks:

```bash
node_modules/.bin/prettier --write plan/progress/4200-S-verify-journal-scans.md
node_modules/.bin/prettier --check plan/progress/4200-S-verify-journal-scans.md
git diff --check
git diff --no-index --check /dev/null plan/progress/4200-S-verify-journal-scans.md
git rev-parse HEAD
git status --short
```

Owned-note Prettier write/check and `git diff --check`: **exit 0**.
The new-file no-index check emits **no whitespace diagnostics** (exit **1**
because the added file differs from `/dev/null`). All **19 local citation
targets** exist. Final HEAD remains the audited SHA; final status contains
only `?? plan/progress/4200-S-verify-journal-scans.md`.

## Limits and simplicity

This establishes local scannability at sampled collision-free poses on Low,
with normal dwell physics and all site props. It does not prove a continuous
route from every opening, every bearing/tier/frame rate, or rendered hull/roof
clearance. Collider spheres and Terrain's sampler are the production physics
contract; mesh vertices and visual occlusion are not separately evaluated.
Currents, supply consumption, unaided steering, touch delivery, optional-load
timing and native browser persistence are outside this fixture. Settings are
resolved per named mode; Custom transitions rely on the cited existing audit.
Wildlife Journal identity/floor/disposal tests are rerun, but natural encounter
frequency, new birth-frame trajectories and opening population/mask/instance
behavior are not re-audited.

No full build, full unit suite, Python suite, local e2e, hosted-CI, GPU or
real-phone validation is claimed. No browser, rendering, screenshots or visual
judgment. Readability, beauty, touch layout and phone performance in the rubric
remain unassessed. Honest/Rewarding behavior is supported here by preserved
target linkage, provenance and discovery retention, not by a visual review or
fresh scientific-source research.

Net simpler: one evidence note, no production/test/data/snapshot/config/tool
changes, duplicated permanent tests, new guidance/settings/layout machinery,
site branches, package numbers in code or policy/tolerance changes. No edits
to DIRECTOR.md or other notes; no commit, merge, push, tag or workflow dispatch.
No smallest correction is warranted by the observed results.
