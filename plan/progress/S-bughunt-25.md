# S-bughunt-25 — anchored event contacts

2026-10-18. Standing S-bughunt review of P2-events-anchored. No production
defect demonstrated; added missing regression guards in existing capability
specs. No production source, art, layout, CSS or composition changes.

## Evidence and regression guards

- `eventsTerrain`: all eight authored contacts across six sites are above the
  actual detailed Low seabed. Existing terrain fixtures also retain reachable
  arrival poses, vertical separation, numerical projections and moving effects.
- `gameExplore`: coincident contacts consume both entry latches with one active
  effect, no queued playback while occupied, and rearm after leaving. Both
  contact orders are checked. Existing tests retain inclusive 3D arrival,
  invalid/paused steps, no overlap, reset and exit/re-entry behavior.
- `gameScanner`: coincident optional arrival and scan targets across fixed,
  wildlife and curiosity pools; Realistic/Arcade/Realistic radius changes;
  local optional contact selection over a remote scan hint; candidate/name
  agreement once the scan becomes eligible; exactly one scan discovery and
  no event discovery from holding Scan.
- `eventsSystem`: extended all eight contact journeys through real
  DiscoveryStore serialization and recreation of the exploration system and
  Scanner. Journal records survive; the new session begins without an active
  event or dive sighting, then arrival plays and witnessing contributes to the
  new dive without increasing the saved discovery count. Existing assertions
  retain pause, blocked/frozen frames, restart, occlusion, witness delay,
  looking away and zero reward inflation.
- `guidance`: desktop/touch DOM fixtures now check warning → sighting → optional
  approach handoffs in the existing slot, including withdrawal recovery.

The hunt found regression coverage gaps, so no speculative behavior fix was
made. No new guidance surface, setting, schema, site branch or runtime config
mutation. Beauty, phone appearance and screenshot acceptance remain for Claude;
no game rendering or visual acceptance obtained. No merge, push or tag;
`tools/` and `plan/DIRECTOR.md` untouched.

## Validation

- Baseline focused run: **111 tests in six files PASS**. Expanded focused run:
  **115 tests in six files PASS**, using
  `npm test -- --configLoader runner --cache=false` on `eventsSystem`,
  `eventsReform`, `eventsTerrain`, `gameExplore`, `gameScanner` and `guidance`.
- Required gate invocation:
  `GATES_CONFIG_MODE=writable PW_PORT=4265 PW_OUTDIR=.cache/bughunt-25-dist bash tools/gates.sh`.
  Logs: `.cache/runs/20261018-174708-2-nezJDm/`. Final gate summary pending.
- Existing browser capabilities attempted: `f-events-reform.spec.ts` and
  `f2-explore.spec.ts`, normal behavior mode with `PW_RENDER_REVIEW` unset,
  retained build above, port 4266. Preview startup failed before browser
  assertions. Debug evidence: `.cache/bughunt-25-capability-debug.log`.

Actual tooling failure, separate from environment restrictions: the Python gate's
golden comparison wrapper reports `Unexpected end of JSON input` at
`tools/tests/golden-manifest.test.mjs:151`; its underlying cause was not established
here. This same failure is recorded in the anchored implementation's progress
note and is outside this behavioral scope.

Environment restrictions: four Python build-manifest cases report
`spawnSync git EPERM`. Together with the golden wrapper, the Python gate has
five failures among 167 outer tests. The targeted browser debug log reports
localhost connection `EPERM` for both `::1:4266` and `127.0.0.1:4266` and a web
server startup failure. No assertions were loosened, timeouts increased or tools
modified.
