# S-bughunt: difficulty and mode switching audit

## Findings

No battery, oxygen, hull-limit or scan-range mode leak was demonstrated in the
audited paths. Report-only: no production changes and no added or weakened tests.

Audited HEAD: `b7f3ca59fdc4e404b5b8672a2eb4e5b1a420c4e8`.
Branch: `codex/4120-S-bughunt-difficulty-modes`. The initial worktree was clean.
Scope: DIRECTOR Backlog 7, S-bughunt, non-visual headless checks only.

Read `CONTRIBUTING-AGENTS.md`, all of `plan/DIRECTOR.md` (including simplicity
rules, Backlog 7 and review rubric), and the last 160 lines of
`plan/OVERNIGHT-LOG.md` before inspecting implementation. HEAD was recorded
before the audit and checked again afterward.

## Evidence and behavior

- **Settings application:** `src/ui/Settings.ts` uses `ModeSelector`; its radio
  and Advanced switch handlers write through `Save.setGameplayMode` and
  `Save.setGameplayOption`. `src/app/systems/modes.ts` is the sole live resolver
  path, listening for gameplay, mode and inherited-base changes. It resolves
  from pristine configuration and sends the result to the submarine, scanner,
  power system and other consumers. It does not mutate base tuning.
- **Supplies:** `resolveEffective` applies fixed equipment multipliers to a
  fresh power object. `Power.setEnabled` preserves supply fractions; Arcade
  freezes drain, and re-enabling supplies resumes the preserved fractions.
  `createPowerSystem` resets supplies on `mission:started`; deferred descent
  costing reads live effective speed, supply tuning and enabled state after
  discovery/pose readiness. Existing tests cover its disposal and old-runtime
  guards. A mode change during an already active dive does not retroactively
  charge a descent or refill supplies.
- **Hull limits:** hull fitting happens when the dive loads, based on mission
  target or tile depth. Live handling changes use `Submarine.setConfig`, which
  preserves the fitted class, rated depth and crush depth. Hull limits do not
  differ by mode. Keeping the same fitted hull during a switch is intentional,
  and existing loadout tests exercise both directions and safe deep starts.
- **Scan range:** the modes system stores authored POI radii before scaling.
  Recomputations always use those baselines. Arcade uses a 100 m floor and
  2.4× authored radius; Realistic uses no floor and 1.2× authored radius, with
  current fixed equipment. Custom inherits its last named preset's sensors.
  The scanner receives the live configuration, including the floor for
  supplemental contacts; wildlife updates read the live floor. Mission
  primary approach caps retain a separate original-radius map so returning
  to a surface start restores the authored radius without compounding.
- **Save loading:** `Save` migrates/sanitizes storage before boot resolves
  effective settings. Named presets replace mismatched saved options; Custom
  keeps its inherited base and valid switches. Production calls `Save.load`
  only from the constructor. There is no in-session storage-import caller to
  exercise. The audit checked reconstruction from serialized storage after
  every transition, including Custom and Reset settings.
- **Mission restart:** the player-facing “Dive again” calls `mission.restart`
  and reloads the page, so the new run loads saved mode settings and fresh
  radii/supplies. The existing router spec checks restart and reload dispatch;
  existing mode/restart specs check session isolation and readiness ordering.
  Mission start selection uses the live effective getter, including the
  delayed skip-briefing path. No additional cached mode was found in the
  audited supply, hull or scan consumers.

## Commands and actual results

Commands ran from the worktree root. Temporary logs and the disposable probe
were written under `/tmp`; no helper was added to `tools/` or the test suite.

| Command                                                                                                                                                                                                                                               | Actual result                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git rev-parse HEAD` and `git status --short`                                                                                                                                                                                                         | Pinned SHA above; initially clean.                                                                                                                                                                                                                                          |
| `npx vitest run tests/unit/f2-modes.test.ts tests/unit/modesExploration.test.ts tests/unit/arcadeLoadout.test.ts tests/unit/powerSystem.test.ts tests/unit/dailyBoot.test.ts tests/unit/dailySystem.test.ts tests/unit/missionApproachSystem.test.ts` | Could not start: `EROFS` writing bundled config into shared `node_modules/.vite-temp`.                                                                                                                                                                                      |
| Same targeted command with `--configLoader runner`                                                                                                                                                                                                    | PASS: 7 files, 147 tests, 19.60 s.                                                                                                                                                                                                                                          |
| `node /tmp/mode-audit-probe.mjs`                                                                                                                                                                                                                      | PASS: 16 mode scenarios, 128 transitions, 128 save reloads and 16 deferred-start scenarios.                                                                                                                                                                                 |
| `npm run build -- --outDir dist-mode-audit`                                                                                                                                                                                                           | TypeScript passed; Vite's default config loader hit the same `EROFS`.                                                                                                                                                                                                       |
| `npm run build -- --outDir dist-mode-audit --configLoader runner`                                                                                                                                                                                     | TypeScript passed; build failed with `Vite module runner has been closed` in the PWA plugin's `closeBundle` dynamic import.                                                                                                                                                 |
| `npm run build -- --outDir dist-mode-audit --config /tmp/mode-audit-vite.config.mjs`                                                                                                                                                                  | PASS: TypeScript, 301 transformed modules, production output, public-data copy and service-worker stamping. Existing large-chunk warning only.                                                                                                                              |
| `npm test -- --configLoader runner`                                                                                                                                                                                                                   | PASS: 192 files, 4,239 passed and 4 existing expected failures (4,243 total), 636.44 s; exit 0.                                                                                                                                                                             |
| `PYTHONDONTWRITEBYTECODE=1 npm run test:py`                                                                                                                                                                                                           | FAIL: 167 tests run, 5 failures. Four build-manifest cases failed with `spawnSync git EPERM`. The golden-tooling wrapper failed because the comparison CLI's report stdout was empty (`Unexpected end of JSON input`); that failure's underlying cause was not established. |
| `npm run test:e2e`                                                                                                                                                                                                                                    | Not run: browser/WebGL execution is expressly outside this audit.                                                                                                                                                                                                           |

Final `npx prettier --write` and `npx prettier --check` on this note,
`git diff --check`, and the unchanged-HEAD check all passed. Final
`git status --short` contains only this new progress note.

The successful build used this temporary wrapper; the repository Vite config,
plugins and application source were unchanged:

```js
export { default } from '/home/vijay/subexp-wt/4120-S-bughunt-difficulty-modes/vite.config.ts';
```

The disposable probe used Vite's server-side module loader with no HTTP server,
WebSocket server or browser, and real `Save`, `resolveEffective`, `modesSystem`,
`Power`, `Submarine`, `Scanner` and `EventBus` objects. The 16 scenarios were:
two boot modes × four Daily conditions (none, calm, strong currents, low light)
× discovery already ready or pending during the first switches. Each ran
Realistic → Arcade → Realistic → Custom supplies off → Custom supplies on →
Arcade → Custom supplies on → Reset settings. Checks covered:

- Exact equality between live effective settings and fresh resolution.
- Frozen base configuration unchanged after every transition.
- Supplies preserved on switching; subsequent two-second loaded drain matched
  an independently initialized Power instance, including disabled drain.
- Class C fitted hull, rated depth and crush depth preserved.
- A 30 m authored contact resolving to 100 m in Arcade or 36 m in Realistic;
  scanner range classification at 80 m followed the selected mode.
- Save round-trip equality and fresh power initialization/descent reserves.

A second matrix used the real `createPowerSystem`, fresh runtime window
fixtures, and actual `mission:started` events: two boot modes × two modes
selected during discovery loading × two modes selected after the reserve
microtask was queued × two start depths (5 m and 1,000 m), for 16 scenarios.
It verified immediate supply reset, then correct live-mode descent costing
and notice count. No stale-mode reserve write was demonstrated.

The initial probe invocation allowed Vite to attempt a WebSocket listen, which
the sandbox rejected with `EPERM`; all assertions still passed. The probe was
then rerun with `server.ws: false`, yielding the clean PASS reported above.

## Limits and simplicity review

These results cover CPU behavior, production settings handlers by inspection,
and existing headless UI/router fixtures. They do not verify browser event
delivery, real page reload timing, WebGL, screenshots, appearance or physical
phone interaction. The disposable restart check reconstructs saved settings
and power; actual navigation dispatch is covered by the existing router test.
The Python suite is not green; its unrelated failures were left untouched.
The same five failures are recorded in the existing
`4030-S-verify-life-clamp-shipped.md` and `4040-S-bughunt-debrief-save.md`
progress notes; this audit did not introduce them.

No visual rubric claims are made. No settings, guidance surfaces, site branches,
package-number code comments, dependencies or assertion relaxations were
introduced. No edits to `tools/` or `plan/DIRECTOR.md`; no merge, push or tag.
The isolated build output was removed after verification. Only this note
remains in the worktree.
