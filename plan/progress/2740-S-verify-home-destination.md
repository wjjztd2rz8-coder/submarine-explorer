# S-verify — Home announced destination

Audited `09ec9f7b4c6fce24d715941824c3b62a7b042736` under Director
Backlog item 8, **S-verify / S-bughunt [Codex, standing]**. Reviewed the current
Director rules/rubric, 2026-10-19 joint review, overnight log through run 65,
`P2-copy.md`, and the actual Home/shell diff in `0272855c0243917d24fb365b6d85d542c7cc087b`.
The subsequent `0973fc7` triage does not change either Home or shell.

Before edits, checked the queue (2740/2750 launched; 2760 queued), launched
briefs, results, and all active worktree diffs. Earlier 2310 Home-controls,
2390 controls/input, and 2500 picker-density reports cover different behavior
and predate this label. Their wrapper results say gates passed, but their
agent reports distinguish sandbox failures; this note uses actual local logs.
2630–2650 retain boost/scan, contacts, audio/performance/release; 2660–2680
retain rim/shader/vent work; 2700–2730 retain journeys, hull clearance, Low
contacts and hosted CI. The separate 2750 Settings/focus and 2760 Auto-tier
files are untouched. No Home/shell or homeFocus overlap was present.

## Path and reproduced defects

`Home.setDiveSite` sets the native primary button's text. Initially it reads
`Dive`. The shell's catalogue continuation names the result of `diveSite()`:
the saved last mission when listed, otherwise the existing opening mission,
Titanic. Clicking uses that same resolver, then `selectMission` emits
`app:siteSelected` with the catalogue tile and navigates via `missionUrl`.
The URL retains `tier`/`touch` and drops conflicting mission/daily/tile options.

Two defects reproduced against unchanged audited source:

- With saved Titanic and a Great Blue Hole mission page, catalogue arrival
  names Titanic. A later supported `mission:started` changes `app.lastSite`
  to Great Blue Hole. Returning Home still announces `Dive: Titanic dive`,
  while a click emits Great Blue Hole's mission/tile and navigates to its URL.
  The regression checks event and navigation before comparing the label.
- Disposing the shell with its catalogue pending still lets that continuation
  call the disposed Home and both disposed selectors. When a replacement
  reuses the context, the old continuation also replaces its catalogue.
  Detached controls were updated; a visible DOM reattachment was not observed.

The final regression fixtures on original source produce **3 failures / 7
passes**: one stale label and two teardown cases (fresh/reused context).
Evidence: `.cache/codex/home-before-final.log`. The fixed source was restored
immediately after that check.

The production change is confined to `src/app/systems/shell.ts`: refresh the
label after `mission:started`, still using `diveSite()`, and invalidate the
catalogue continuation with a local lifetime flag during existing cleanup.
`src/ui/Home.ts` needs no change. Saved-site policy, pending fallback and
navigation remain in their existing resolution paths.

## State / label / launch matrix

The deterministic fixtures use real Home, shell, MissionSelect, FocusTrap,
EventBus, Save and URL construction; only the catalogue promise, optional
content fetch, storage, location and small DOM surface are controlled.
Mission-page fixtures parse the shipped Great Blue Hole mission. No arbitrary
`app.lastSite` writes substitute for runtime mission events.

| State                                                                      | Announced action                                                              | Selected mission / tile                                | Navigation                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| Catalogue pending, no saved site                                           | `Dive`                                                                        | Titanic / Titanic                                      | `?mission=titanic`              |
| Catalogue pending, valid saved Great Blue Hole                             | `Dive`                                                                        | Titanic / Titanic                                      | `?mission=titanic`              |
| Catalogue pending, removed saved site                                      | `Dive`                                                                        | Titanic / Titanic                                      | `?mission=titanic`              |
| Catalogue arrives, first run                                               | `Dive: Titanic dive`                                                          | Titanic / Titanic                                      | `?mission=titanic`              |
| Catalogue arrives, saved Great Blue Hole                                   | `Dive: Great Blue Hole: Lighthouse Reef`                                      | Great Blue Hole / Great Blue Hole                      | `?mission=great-blue-hole`      |
| Catalogue arrives, removed saved site                                      | `Dive: Titanic dive`                                                          | Titanic / Titanic                                      | `?mission=titanic`              |
| Great Blue Hole starts before catalogue; return Home                       | Great Blue Hole title after arrival                                           | Great Blue Hole / Great Blue Hole                      | `?mission=great-blue-hole`      |
| Great Blue Hole starts after catalogue; return Home                        | Great Blue Hole title, refreshed by start                                     | Great Blue Hole / Great Blue Hole                      | `?mission=great-blue-hole`      |
| Subsequent dive/Home transition, both event orderings                      | Great Blue Hole title                                                         | Great Blue Hole / Great Blue Hole                      | `?mission=great-blue-hole`      |
| Synthetic mission whose tile differs from its id                           | Catalogue title                                                               | `survey-mission` / `great-blue-hole`                   | `?mission=survey-mission`       |
| Dispose pending shell, then resolve after fresh/reused-context replacement | Old button stays `Dive`, disconnected and closed; replacement title preserved | No old selection; replacement launches Great Blue Hole | Replacement URL remains correct |

All checked navigation also retains `&tier=low&touch=1` under the project base.
Pending state deliberately makes no named-site promise. Catalogue arrival and
launch do not rewrite the saved id; `mission:started` still saves it. Returning
Home focuses the same enabled primary button. Replacement checks preserve its
catalogue identity, last site, focus and launch, with zero old setter calls.

## Simplicity and review rubric

Readable/honest: the existing button now names the site it launches after a
mission start. Simple: one existing destination resolver, one label refresh,
and one local teardown flag; no new surface, setting, guidance, site branch,
config mutation, CSS/layout patch or dependency. Rewards and picker progress
are unchanged. The native button and existing Home focus path remain intact;
synthetic activation covers the common click handler used by native keyboard
and pointer/touch activation. These are DOM/event/focus checks, not browser
accessibility-tree or physical-device input acceptance. The existing two Home
assertion cases remain unchanged; eight cases extend that capability spec.

Beauty, composition, screenshots, phone appearance and unaided journeys remain
with Claude/owner. No game rendering, screenshots, art, authored values,
scan/input, mission-selection components, e2e tests or tooling changes.

## Validation

- PASS: focused Home, overlay focus, mission core, startup lifecycle, shell
  Escape and disposables checks: **6 files / 184 tests**, including all ten
  Home cases. Command: `npx vitest run tests/unit/homeFocus.test.ts
tests/unit/overlayFocus.test.ts tests/unit/missionCore.test.ts
tests/unit/startupLifecycle.test.ts tests/unit/shellEscape.test.ts
tests/unit/disposables.test.ts --configLoader runner --cache=false`.
  Log: `.cache/codex/home-focused.log`.
- Required gate: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  Uses the existing writable-config mode for the shared dependency tree.
  Aggregate log: `.cache/codex/home-gates.log`; phase logs:
  `.cache/runs/20261020-113704-7-bwVJo0/`.
  - PASS: config preparation, strict content validation (13 sites, no errors or
    warnings), production build including TypeScript, full unit suite
    (**192 files / 3,289 tests**, 511.33 s), attribution and repository-wide
    Prettier.
  - Python: **162/167 passed; five failures** in unchanged tooling. Four
    build-manifest cases fail with `spawnSync git EPERM`; the golden-tooling
    CLI case fails parsing empty stdout (`Unexpected end of JSON input`).
    These match the earlier audit reports. No tooling changes or relaxed
    assertions were used to bypass them.
  - Aggregate **exit 1**, `FAIL gates (e2e=none)`, because of those five Python
    tooling failures. This is not an all-green gate run.
- PASS: final changed-file Prettier and `git diff --check`. Only shell source,
  the existing Home capability spec and this note are changed; no merge, push
  or tag was performed.
- Actual e2e mode: **none**. Smoke, full suite and project-base browser checks
  are unexecuted, not passes. No browser environment failure is inferred from
  skipping them. Hosted-CI classification is outside this audit.
