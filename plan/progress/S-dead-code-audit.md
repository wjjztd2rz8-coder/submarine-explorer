# S-dead-code-audit — brief 162, item 20 — 2026-11-09

Three offline rounds: import/re-export graph (including tests/tools, barrels and dynamic imports), member/reference grep, then post-cut graph and strict `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`. Audit scripts/results: `.cache/s-dead-code-audit/`.

Cuts: Globe's uncalled `setMissionAccess`, its callback field and unreachable lock branches; `Discovery.focusPoint`, `Atmosphere.tierInfo` (and its stored constructor field), `Life.hasTable`, `Briefing.advancedOpen`, `MissionSelect.showFreeDive`; 22 unused export modifiers across 14 modules. Live declarations remain module-local. Corrected the obsolete camera-focus description in `docs/discovery.md`.

Retained/uncertain:

- No live ROV, boost or upgrade-purchase path remains. Legacy RP/upgrade records, retired-key migration and purchase costs remain necessary for save recovery; no persistence code changed. Current settings have runtime readers in boot, effective settings, world, audio and HUD systems.
- Deferred startup still owns load cancellation, rollback and page teardown; no proven dead startup path.
- `Progress.canDive`/currency diagnostics and effective `speedName` still have test/API consumers; retained rather than deleting compatibility coverage.
- CSS `.is-secret` is generated from Journal entry kinds; Home directly toggles `.is-free-dive`. The `.woff2` search hit is a font extension. No proven unused CSS or per-element HUD offsets found; styles untouched.
- Guidance remains in the existing slot, effective settings resolve through `resolveEffective`, and no site branch, setting, layout patch, artwork or package-number comment was added.

Validation: fresh strict typecheck PASS; post-cut export/member searches find no further candidates beyond the two explained CSS hits. Focused units PASS (558 tests / 18 files, including saves/migrations/startup, mission selection, scanner, tutorials, power, prop loading, presets, cameras, vehicles, title and life disposal).

Capability grep: `rg -n 'mission|Realistic|Titanic pin' tests/e2e/{globe,f2-progress}.spec.ts`. Reran `npx playwright test tests/e2e/globe.spec.ts -g 'Enter on the Titanic pin starts the Titanic mission'` and `npx playwright test tests/e2e/f2-progress.spec.ts -g 'all downloaded missions stay open in Realistic'` against the isolated build (writable config; ports 4373/4374). Both stop before tests at preview startup; debug logs show localhost IPv4/IPv6 `connect EPERM`. No screenshots or visual acceptance claimed.

Gates FAIL: `GATES_CONFIG_MODE=writable PW_PORT=4375 PW_OUTDIR=dist-s-dead-code-audit-recheck bash tools/gates.sh --full-e2e`, with an exported npm wrapper adding `--pool=threads --maxWorkers=2 --reporter=verbose` and a 90 s unit limit. PASS: config, content, root/project-base builds, attribution, full-repo Prettier. FAIL: five Python tooling tests (four build-manifest `spawnSync git EPERM`, one golden JSON parse failure); full units exceeded the limit with passing cases logged but no final summary; full root and project-base Playwright stopped at preview startup. An earlier 300 s unit attempt also did not finish. No assertions weakened; full-suite verification remains incomplete.

Net: 59 fewer source lines; 42 fewer lines including docs, this report and CHANGELOG. Latest gate logs: `.cache/runs/20261109-044633-3-ZAeCll/`; fresh focused and browser checks: `.cache/s-dead-code-audit/recheck-{unit,globe-e2e,progress-e2e}.log`. Earlier audit/check logs remain in `.cache/s-dead-code-audit/`.
