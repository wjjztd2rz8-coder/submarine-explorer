# 111 S-dead sweep — 2026-10-29

Two offline rounds: token/reference grep across src/tests/tools, then a Rolldown AST import/re-export audit with dynamic-import inspection. Audit script/results: `.cache/s-dead-sweep/audit.mjs`, `audit-round{1,2}.txt`. No dependency added.

- Deleted `wrecks/ship.ts`'s uncalled `plate` and its exclusive `strut` import; `strut` itself remains used by Titanic builders.
- Removed re-exports: Settings `GAMEPLAY_ORDER`; FieldGuide `GuideEmitter`; vehicles `VehicleLod`, `VehicleStats`, `HullClassId`; life/models `Look`; builders/wrecks `HullEnd`; geo `GEO_DETAIL`, `geoDetail`, `GeoDetail`; wrecks `WreckBuilt`; wrecks/shared `hashString`. Checked all import paths and namespace/dynamic consumers; original live declarations remain.
- CSS scan covered every src stylesheet against non-CSS source. Only `.obj-nav-target`/`.obj-nav-turn` appeared absent; ObjectivesPanel emits them through `obj-nav-${f}`, so both stay.
- All 40 shared e2e helper exports have spec references; no dead helper or active test was deleted. Round two found no further safe cuts.

Validation: typecheck, root/project-base native-config builds, strict content, attribution and full-repo formatting PASS. Focused units PASS: wrecks 40, vehicles 19, predive 7, settingsScreen 4 (each via `npx vitest run tests/unit/<file>.test.ts --configLoader runner --cache=false --pool=threads --maxWorkers=1`). Source is 29 lines shorter; net including this report and CHANGELOG: **10 fewer lines**.

`GATES_CONFIG_MODE=writable PW_PORT=4311 PW_OUTDIR=dist-s-dead-sweep bash tools/gates.sh` passed config/content/build; Python failed 5/167 in unchanged tools (four `spawnSync git EPERM`, golden comparison JSON parse). Unit gate was interrupted; sequential full-unit retry exceeded 180 s, props-geo exceeded 30 s. Full-unit two-shard retry pending. No gate assertions were weakened.

Capability grep: `rg -n -i 'wreck|hull ends|fixture props|settings|journal' tests/e2e/props.spec.ts tests/e2e/settings.spec.ts`. Attempted `GATES_CONFIG_MODE=writable PW_PORT=4312 PW_OUTDIR=dist-s-dead-sweep-final npx playwright test tests/e2e/props.spec.ts -g 'Titanic hull ends read differently: prow, torn end, counter stern'`, full `npm run test:e2e`, and project-base asset spec; all stopped before tests at preview startup (`connect EPERM` on IPv4/IPv6). No screenshots were produced or visual acceptance claimed.

Logs: `.cache/s-dead-sweep/{gates,build-final,focused-e2e-debug,full-e2e}.log`; detailed gate logs: `.cache/runs/20261029-130327-7-iGWQ74/`. DIRECTOR unchanged; no merge or push. Gate completion remains blocked by the recorded validation failures.
