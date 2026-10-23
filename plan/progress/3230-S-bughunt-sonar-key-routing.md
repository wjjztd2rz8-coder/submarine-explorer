# 3230 — S-bughunt: Sonar keyboard routing

DIRECTOR Backlog item **9, S-verify / S-bughunt [Codex, standing]**,
specifically **S-bughunt**, the highest eligible nonvisual Codex entry.
Pinned checkout: **`a545afe00196649a2d6de4cf1c8039851aba9074`**.

Two supported-path policy mismatches reproduced and corrected wholly inside
`src/ui/Sonar.ts`: the focused map consumed Alt/Ctrl/Meta range shortcuts,
and bubbling range keys from its native zoom buttons bypassed the global
button-target exclusion. The local handler now applies the existing global
modifier and target guards before its unchanged key-to-`zoomBy` dispatch.

## Authority and isolation

Read DIRECTOR direction, seven simplicity rules and review rubric;
CONTRIBUTING-AGENTS; newest 2026-10-22 comprehensive review; OVERNIGHT-LOG
through run 82; launched scopes, available completion reports/progress and
registered worktree diff inventories, including finished 3130–3210 work.
Read 2440's launched brief, final report and `S-bughunt-19.md`, existing
`uiSonar`, `overlayFocus`, touch capability guards, Sonar, sonar systems,
Disposables, Input, FocusTrap and shell key routing. Also checked 3080/3120
and the disjoint 3220/3240 scopes.

Before editing and again before the production correction, checked worktree
status and ownership: no other registered diff claims `src/ui/Sonar.ts` or
`tests/unit/uiSonar.test.ts`. The 3220 and 3240 worktrees were clean at that
recheck; they own modesExploration and uiWaypoints tests respectively. No
other package's changes were copied or collected. Unmerged 2980/3050,
completed 3130–3210, earlier sample-restart/namespace coverage, parked Blue
Hole and owner-blocked opening rules remain outside this slice.

## Supported paths and listener phases

The constructed, attached real Sonar supplies three focus targets: its
`tabIndex=0` map root and two native `type=button` controls. Header, range
label and canvas are not independently keyboard focusable. Sonar contains no
input/select/textarea/contenteditable control. Body is the normal keyboard
target after blurring the map; the fixture does not pretend body is tab-focusable.

Keyboard route: window capture (FocusTrap's shared dispatcher and shell
fallbacks in the app), target, then bubbling ancestors. Sonar's keydown
listener is a normal root listener; `sonarControlsSystem` listens on window
without capture. A consumed map key stops before the window's global range
listener, so exactly one handler calls `zoomBy`. An unrelated `KeyM` reaches
the next owner without prevention or stopping; the isolated fixture does not
instantiate Input or claim to toggle M's app action. Input's real window
listener preserves native Enter/Space button activation; unmodified default
range shortcuts are handled by sonarControlsSystem.

Global range eligibility remains dive state with Settings, Controls, Globe,
Journal, debrief, photo mode and frozen briefing absent. Existing 2440
`overlayFocus` cases use a stub sonar for that modal matrix; they are run
read-only, not repeated with synthetic modal/focus combinations here.
FocusTrap activation blurs focus outside its modal. No detached Sonar event
or hidden-root event manually injected behind a modal is called a lifecycle bug.

Wheel routing is unchanged: local root bubble listener is nonpassive; expanded
map global wheel listener is capture/nonpassive and stops immediate propagation
when eligible. Wheel cadence and pinch routing keep their existing guards.

| Focus / target path                              | Key or activation                                                    | Established contract and final result                                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused attached map root                        | Equal / NumpadAdd                                                    | One `zoomBy(-1)`, 1000 → 500 m; one preventDefault and one stopPropagation; window capture sees event, window bubble owner does not        |
| Focused attached map root                        | Minus / NumpadSubtract                                               | One `zoomBy(1)`, 1000 → 2000 m; same single consumption                                                                                    |
| Body after map blur                              | All four range codes                                                 | Real global system performs one intended step and one preventDefault, without stopping propagation                                         |
| Root, either native zoom button, body            | Alt, Ctrl or Meta + each range code                                  | No range call/change, prevention or stopping; event reaches window owner                                                                   |
| Map root                                         | Shift + Equal                                                        | Accepted as plus, one step to 500 m, consistent with global policy (Shift is not excluded)                                                 |
| Either focused zoom button                       | All four plain range codes                                           | No range call/change or consumption, matching global `closest(button)` exclusion                                                           |
| Either focused zoom button                       | Enter / Space, then activation click                                 | Key remains available; delivered click invokes its intended existing handler once                                                          |
| Non-Sonar attached control contract probes       | Each range code on input/select/textarea/button/contenteditable=true | Global target exclusion holds; these are global controls, not invented Sonar descendants                                                   |
| Focused root                                     | KeyM                                                                 | No Sonar call or consumption; window owner receives it                                                                                     |
| Zoom buttons, compact and expanded; touch on/off | Click in / out                                                       | 1000 → 500 → 1000 m, one call per click; expansion stays unchanged                                                                         |
| Canvas click, touch on/off                       | Click outside buttons                                                | Existing touch expansion toggles; desktop does not toggle                                                                                  |
| Root and native button                           | Repeated outward steps at 250 m / tile                               | Public target remains at endpoint; data-zoom and label remain `250` / `250 m`, or `tile` / `Whole tile`; root consumes each range key once |

The local fixture lives only in `tests/unit/uiSonar.test.ts`. It models attached
parents, focus/blur, original event target, capture-before-bubble, cancellation
and listener teardown. It reuses only the existing sonarCanvas 2D context,
not that recorder's no-op listeners. A tiny 2×2 metadata object and dimensions
suffice for construction. No Terrain instance, height generation, update,
draw, pixels or renderer are used; recorder raster/draw arrays stay empty.
Static header innerHTML is irrelevant to these focus paths and is not parsed.

## Failing before, passing after

Before any production change, `.cache/3230-before.log` records **47 tests:
31 passed, 16 failed**. Twelve cases are the four range codes × three excluded
modifiers on the actual focused root; four cases are the four range codes
bubbling from an actual focused zoom button. At initial target 1000 m, Equal
and NumpadAdd incorrectly produced `{ prevented: true, zoom: 500 }`; Minus
and NumpadSubtract produced `{ prevented: true, zoom: 2000 }`. Expected:
`{ prevented: false, zoom: 1000 }`, as in the established global contract.

The correction adds seven lines to the existing root handler, reusing the
exact modifier exclusions and closest-target selector from sonarControlsSystem.
No new shortcut policy or event owner was introduced. The complete 47-case
Sonar spec passes afterward. The final modifier guards additionally exercise
both actual buttons as well as map/global paths. The 29 added table-expanded
cases retain all 18 original pure-helper cases without changes.

Public-state evidence uses targetZoom, displayed zoom, root data-zoom, label
text, expanded and backdrop.hidden. After a key step targetZoom changes while
zoom remains at its initial 1000 until update; no animation is driven here.
Existing pure ease/cadence/config guards remain intact and own their formulas.
No historical assertion, tolerance, budget, instance count or snapshot changed.

## Simplicity and rubric

The two event paths now share the same established exclusions using the existing
handlers. The only production change is a local early return. No UI element,
setting, guidance surface, layout patch, site branch, runtime config mutation,
save schema, dependency, shared helper or new spec was added. Labels, native
button types, root focusability, zoom levels, wheel cadence, animation, touch
toggle and modal ownership are preserved. Capability tests remain in uiSonar;
package history stays in this note, with no package numbers in source/comments.

This protects keyboard access and understandable existing range guidance.
Terrain/site identities, hero set pieces, scanning, retained Journal discoveries,
marine life, pad input and Arcade default are unchanged. Resource limits and
rendering behavior were not modified. Readability, beauty, composition,
visual Phone-OK and real-phone acceptance remain with Claude/owner.

## Validation

- Focused command: `npm test -- --configLoader runner --cache=false tests/unit/uiSonar.test.ts tests/unit/overlayFocus.test.ts tests/unit/touchControls.test.ts tests/unit/touchControlsAudit.test.ts tests/unit/touch.test.ts`.
  **PASS: 5 files / 256 tests** after correction; `.cache/3230-focused.log`.
- An intermediate typecheck caught a widened numeric literal in the new endpoint
  table; it was corrected to a literal type before the final gates.
- Required aggregate: `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`.
  **Exit 1, `FAIL gates (e2e=none)`**. Aggregate log: `.cache/3230-gates.log`;
  individual logs: `.cache/runs/20261022-193811-35-lVNcn0/`.
- **PASS:** config bundling, strict content, production build/typecheck,
  **192 unit files / 3,548 tests** (562.65 seconds), attribution and repository-wide
  Prettier. No unit assertion failures, retries or skipped tests were reported.
- **FAIL:** Python, **167 tests / five failures**, all in unchanged tooling.
  Four `test_ci_build_manifest` cases fail with `spawnSync git EPERM` while
  reading fixture provenance. `test_golden_tooling` wraps the failing
  `golden comparison refuses partial sets, missing files and incompatible poses`
  subtest: CLI output cannot be parsed (`Unexpected end of JSON input`). These
  match the previously documented environment/tooling failures. No unrelated
  tools or assertions were repaired; the gate's actual failure is retained.
- Final owned-file formatting and `git diff --check`: **PASS**. The checkout
  still has the pinned SHA and only the two owned source/test edits plus this
  new note. No commit, merge, push or tag was made.
- Actual e2e mode: **none**. No browser launched, screenshots captured or game
  rendered. Delivered click events establish routing of the click produced by
  native activation, not the browser's generation of that click or browser-native
  shortcuts. No GPU behavior, visual quality, unaided play, assistive-technology,
  screen-reader or real-phone acceptance is claimed.
