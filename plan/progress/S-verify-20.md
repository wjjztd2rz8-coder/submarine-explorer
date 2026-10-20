# S-verify-20 — merged boost removal and scan reach

No demonstrated runtime bug found. Added four regression cases to existing
capability specs and strengthened the adjacent-target fixture; no production
code changes.

- `subInput`: exercised v1/v2/v3 saved bindings containing boost, conflicting
  retired keys, surviving custom bindings and explicit unbindings. Reloaded
  bindings omit boost. Shift and gamepad RT are inert; keyboard X resets the
  camera. Gamepad X remains headlights; D-pad down resets the camera.
- `touchControls` / `touchControlsAudit`: exercised the four-button dock
  (Scan, Lights, Sonar, Photo), Journal wiring and keyboard/touch/gamepad scan
  parity. This verifies structure and behavior, not appearance.
- `progress`: added explicit legacy boost-purchase recovery for levels 1–3
  (35/100/200 spent research). Cosmetic credit survives three save/reload cycles
  without duplication, and the recovered paint remains selectable and persistent.
  `LegacyProgress.ts` retains read-only purchase-price evidence for this purpose.
- `f2-modes`: added live Arcade → Realistic → Arcade cycles, each also entering
  Custom. Every Titanic POI returns to its authored base radius before scaling;
  bow/stern resolve to 100 m in Arcade and 36 m in Realistic, larger radii survive,
  the scanner receives the effective settings, and Config remains pristine.
- `gameScanner`: strengthened the existing order-independent adjacent-target
  test with Titanic bow/stern IDs, names, authored radii and scan durations.
  Deliberately compact fixture positions overlap the 100 m reach; they do not
  represent the real wreck geometry. Crossing the midpoint selects the nearer
  target, then an active scan keeps its lock. Existing cases retain the exact
  100/101 m boundary, facing/depth requirements and all target pools.
- `missionApproachSystem`: exercised 30 m and 200 m authored radii in both modes:
  the 80 m approach cap precedes scaling and the Arcade floor. Switching back to
  surface starts restores the original radii. Titanic's 220 m approach remains
  beyond scan reach.
- Audited `src/`, README and current settings/architecture/power documentation:
  no live thrust-boost action or promise remains. Historical `docs/playtest-A3.md`
  describes old controls; sonar hillshade gain uses the unrelated word “boost.”

Behavior review: readable target names match the selected scan; simple controls
have no hidden sprint; old earned cosmetic credit is preserved; range guidance
is honest; retained controls, unbound keys and device parity stay covered.
Net simpler: no on-screen element, setting or guidance surface added or replaced.
No art, CSS, layout or composition changes. Beauty, phone appearance and
screenshot acceptance remain with Claude; Codex did not render the game.

## Verification

- Initial relevant unit capabilities: **410 passed / 16 files** (61.29 s), log
  `.cache/s-verify-20-capabilities.log`.
- Updated regression capabilities: **66 passed / 3 files** (362 ms), log
  `.cache/s-verify-20-regressions.log`.
- Final focused capabilities including the new guards: **225 passed / 8 files**,
  log `.cache/s-verify-20-final-capabilities.log`.
- Relevant browser discovery: **172 tests / 6 files**, log
  `.cache/s-verify-20-browser-discovery.log`.
- Relevant browser execution: **none executed**; preview startup failed, exit 1.
  `DEBUG=pw:webserver` confirms `connect EPERM` on localhost IPv4 and IPv6,
  before the game or any assertions run. Logs: `.cache/s-verify-20-browser.log`
  and `.cache/s-verify-20-browser-diagnostic.log`.
- `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/s-verify-20-dist PW_PORT=4263 bash tools/gates.sh`:
  running; final results recorded below. Uses the existing supported mode for
  the shared read-only dependency tree.

Environment/tooling failures, separate from behavior results:

- Python gate: **167 tests, 5 failures**. Four unchanged CI-manifest tests report
  Node `spawnSync git EPERM`. The unchanged golden-tooling wrapper receives
  empty CLI report JSON (`Unexpected end of JSON input`); its cause is unresolved.
  Neither category is counted as a behavior pass.
- Browser preview startup is blocked as described above. Discovery alone is not
  an execution pass or visual acceptance.

No tooling, assertions or timeouts loosened. No changes under `tools/` or to
`plan/DIRECTOR.md`; no merge, push or tag.
