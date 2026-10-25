# S-verify / S-bughunt: settings application audit

Date: 2026-10-25. Baseline: `ddcaaac5c141473ba4823e85a675384f2e27d887`.
Report only. One confirmed defect, reproduced in both directions. No tracked
source, test, snapshot, Director or tools edits; no browser, screenshots, merge,
push or tag. All disposable checks and logs are under `/tmp/settings-apply-audit`.

## Baseline correction and application trace

The brief's older mutation model has already been replaced in this checkout:
[S-resolve's integration evidence](S-resolve.md) and [S-rewards](S-rewards.md)
match the current code. There is already one pure effective-settings resolver;
purchasable equipment upgrades are retired. This audit reports defects in the
current implementation rather than resurrecting the deleted application paths.

| Boundary                     | Current behavior and evidence                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boot                         | [boot.ts:58](../../src/app/boot.ts#L58) reads Save once; lines 75–89 resolve Daily routing before calling `resolveEffective(settings, settings.gameplayMode, daily, config)`. `config` stays pristine. `ctx.settings` is explicitly a boot snapshot, while `ctx.effective` is replaceable ([context.ts:88](../../src/app/context.ts#L88)).                                                                                                          |
| Named modes / Custom         | [Save.ts:326](../../src/core/Save.ts#L326) applies named switches and remembers `gameplayBaseMode`; an Advanced edit enters Custom. [EffectiveSettings.ts:14](../../src/game/EffectiveSettings.ts#L14) takes Custom's switches plus its remembered handling/light/sensor preset.                                                                                                                                                                    |
| Fixed equipment              | [progress.ts:11](../../src/core/config/progress.ts#L11) contains the shared kit. [EffectiveSettings.ts:20](../../src/game/EffectiveSettings.ts#L20) derives speed from its pristine profile: thrust ×1.24², max/cruise ×1.24, yaw ×1.16, reverse ×1.2; battery hours ×1.36, oxygen ×1.24, light distance ×1.3 and beam +8°, sonar range ×1.45, scan/detail ×1.2. Progress awards/cosmetics do not apply equipment again.                            |
| Live mode / Advanced / reset | [modes.ts:31](../../src/app/systems/modes.ts#L31) re-resolves on gameplay, mode or base-mode changes and replaces consumer settings. POI radii derive from the saved base map, never from the last scaled result. Example: Titanic's authored 30 m becomes Arcade 100 m (`max(100,30×2.4)`) and Realistic 36 m (`30×1.2`).                                                                                                                          |
| Pause / resume               | Pause/Settings freeze the simulation; saving still runs the same live listener. Resume only changes shell state ([shell.ts:121](../../src/app/systems/shell.ts#L121)); it does not apply another multiplier. Power levels are preserved when disabled and restored when re-enabled ([Power.ts:58](../../src/game/Power.ts#L58)). Active hull, pose, selected sim speed and scan progress survive mode switches; handling velocity caps still apply. |
| Restart                      | “Dive again” emits restart then reloads the current URL ([MissionRouter.ts:650](../../src/game/MissionRouter.ts#L650)). Fresh boot re-reads saved settings and fits the depth-rated hull. Discovery's restart listener clears dive-local progress, not authored tuning. A restart after UTC rollover intentionally revalidates the Daily date.                                                                                                      |
| Daily on / off               | Daily is a route condition, not a live toggle: Home's Daily callback navigates with `mission` and `daily`; ordinary mission/free-dive URLs strip Daily. Fresh boot recomputes it. Strong currents forces `strong` (scale 8); calm and low-light force currents off. Low-light selects Realistic lamps while retaining mode handling/sensors. The active Daily remains fixed across Home's midnight card refresh.                                    |
| Mission starts               | [mission.ts:42](../../src/app/systems/mission.ts#L42) reads current effective sensors/camera, retains original primary radii, applies the near-site cap before multiplication/floor, and restores originals for surface starts. Deep-start supplies use effective descent/power after the start pose settles ([power.ts:31](../../src/app/systems/power.ts#L31)). Mid-dive start preference edits do not teleport the pilot.                        |

## Confirmed defect D1: delayed free-dive placement reads the boot mode

**Location:** [src/app/systems/props.ts:71](../../src/app/systems/props.ts#L71).
The optional-props completion callback passes `ctx.settings.gameplayMode`, even
though the adjacent camera argument comes from current `ctx.effective`.
[Spawn.ts:158](../../src/game/Spawn.ts#L158) uses that stale mode to select authored
opening overrides. The only shipped mode-specific free-dive override is
[Lost City site.json:16](../../data/landmarks/lost-city/site.json#L16).

**Trigger:** enter Lost City free dive, leave the boat within 2 m of its initial
position while props are pending, change mode in Settings, then let props finish.
The callback allows paused as well as diving state. It installs the old mode's
position and chase reset defaults. A fresh boot in the selected mode installs
different values. Both directions reproduce:

| Boot → selected before props finish | Actual horizontal range / chase default | Fresh boot in selected mode |
| ----------------------------------- | --------------------------------------- | --------------------------- |
| Arcade → Realistic                  | 38 m / 66 m                             | 44 m / 97.6933979345585 m   |
| Realistic → Arcade                  | 44 m / 97.6933979345585 m               | 38 m / 66 m                 |

These are numeric consumer-state results, not visual ratings. The headless
fixture keeps real Save, live mode application, Submarine, CameraRig, site data
and opening solver. It replaces optional IO, mesh construction and collision
with a delayed synthetic tower on flat ground. Fresh-mode controls pass and the
two equality assertions against fresh boot fail. The data overrides directly
explain both mismatches; this is not a renderer or timing tolerance issue.

**Smallest fix:** replace the argument with `ctx.save.get().gameplayMode`.
A temporary Vite transform performing only that substitution makes the same
assertions pass. No assertion or tracked file was changed. A later resolver
cleanup can expose the selected placement mode on the effective result, so this
consumer also reads one resolved object. Preserve the existing movement/home/
explicit-probe guards; do not reframe pilots who have already left the opening.
Custom's separate authored opening behavior is not changed by this proposal.

Impact is limited to mode selection before delayed free-dive props settle.
Already settled dives need not teleport on mode changes. Mission placement uses
its current effective values and does not take this free-dive mode argument.

## Refuted suspicions

| Suspicion                                                                                  | Result / headless evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Equipment or mode multipliers accumulate; Custom loses its base                            | Refuted for the supported settings. `f2-modes.test.ts` repeatedly switches modes and Advanced options, checks frozen-input purity and fixed equipment/Daily results, and restores Titanic's data radii. `modesExploration.test.ts` checks live state and unchanged config using real physics/scanning.                                                                                                                                                                                                                                           |
| Live application resets hull, input edges, scan progress, sim speed or supplies            | Refuted by `arcadeLoadout.test.ts`, `modesExploration.test.ts`, `power.test.ts` and `powerSystem.test.ts`. Controls cover both directions, depth-fitted hulls, ongoing holds, velocity caps and exhausted supplies surviving Arcade off/on.                                                                                                                                                                                                                                                                                                      |
| Pausing/resuming applies settings again or drains frozen supplies                          | Refuted by `powerSystem.test.ts`'s real frame gates and pause/resume tests, plus `firstMove.test.ts`. No settings resolver call exists on the resume action.                                                                                                                                                                                                                                                                                                                                                                                     |
| Mission radius caps compound or surface starts retain a cap                                | Refuted by `missionApproachSystem.test.ts`: authored radii 30/200, Arcade/Realistic, near-site → surface restoration. `arcadeLoadout.test.ts` also exercises briefing changes and delayed actual props.                                                                                                                                                                                                                                                                                                                                          |
| Daily low-light/currents contaminate later ordinary boots, or restart reapplies equipment  | Refuted by the disposable boot matrix: both saved modes × three modifiers × [Daily boot, repeated Daily boot, ordinary boot], **18 boots**. Each checks full effective equality, explicit lamp/current results and byte-identical persisted settings. Renderer/IO are mocked at the same boundaries as existing `dailyBoot.test.ts`; no browser is started. Existing `dailySystem.test.ts` covers live Low light persistence and midnight refresh without altering the active dive; `dailyCompletion.test.ts` covers completion-date boundaries. |
| Wildlife retains the Arcade 100 m floor after switching to Realistic                       | Refuted by `lifeDisposal.test.ts:117`: target reach returns to species data. [life.ts:125](../../src/app/systems/life.ts#L125) passes the current effective floor each frame.                                                                                                                                                                                                                                                                                                                                                                    |
| Discovery's captured scan object or Scanner's cached cone causes a supported mode mismatch | Inspection refutes this as a current mode defect: mode-dependent scanning uses `scanner.setConfig` and restored POI radii. Discovery's other captured consumers use spawn/display/session constants unchanged by these modes. `Scanner.cosCone` is cached, but all resolver branches retain the same base `coneHalfAngleDeg`; no supported setting changes it. A generic future cone-retuning feature would need a separate setter audit.                                                                                                        |
| Custom must use Arcade's authored free-dive camera whenever its handling base is Arcade    | Not classified as a defect. Custom inherits speed/lights/sensors; authored openings accept a separate Custom key. Existing `arcadeLoadout.test.ts:599` explicitly expects Custom's non-Arcade Lost City opening. The D1 fix must preserve that assertion.                                                                                                                                                                                                                                                                                        |

## Consumer list for S-resolve follow-up

Most migration is already complete. Preserve these boundaries; repair the one
stale consumer instead of adding another resolver, mutation layer or Daily listener.

| Consumer                                                                                                                                                       | Effective input / migration status                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [boot.ts:89](../../src/app/boot.ts#L89), [modes.ts:33](../../src/app/systems/modes.ts#L33)                                                                     | The existing boot and live resolution entry points. Saved mode, Custom base/switches, fixed equipment, Daily and pristine Config are the inputs.                                                                                                                             |
| [submarine.ts:26](../../src/app/systems/submarine.ts#L26), [Submarine.ts:201](../../src/sub/Submarine.ts#L201)                                                 | Resolved submarine handling. Keep depth-fitted hull/pressure state and selected T speed outside mode tuning.                                                                                                                                                                 |
| [camera.ts:23](../../src/app/systems/camera.ts#L23), [CameraRig.ts:69](../../src/sub/CameraRig.ts#L69)                                                         | Resolved camera look-ahead; preserve the current view and authored chase defaults.                                                                                                                                                                                           |
| [discovery.ts:22](../../src/app/systems/discovery.ts#L22), [Scanner.ts:192](../../src/game/Scanner.ts#L192), [modes.ts:17](../../src/app/systems/modes.ts#L17) | Resolved scan config plus authored/base POI radii. Keep ready/dispose guards and use base × multiplier, then floor. Discovery's boot-only spawn/display constants need no dynamic layer.                                                                                     |
| [mission.ts:47](../../src/app/systems/mission.ts#L47)                                                                                                          | Current sensors, scan floor and camera, plus start preference. Primary approach caps remain geometry policy over original data, before effective scaling.                                                                                                                    |
| [life.ts:119](../../src/app/systems/life.ts#L119), [explore.ts:284](../../src/app/systems/explore.ts#L284), [Samples.ts:36](../../src/game/Samples.ts#L36)     | Wildlife reads effective floor each frame; supplemental secrets/samples retain authored target data and share Scanner's effective admission. Avoid baking a floor back into permanent data.                                                                                  |
| [power.ts:24](../../src/app/systems/power.ts#L24)                                                                                                              | Effective power/enablement and effective descent profile for starting reserves. Keep live level preservation separate from new-mission reset.                                                                                                                                |
| [atmosphere.ts:51](../../src/app/systems/atmosphere.ts#L51), [modes.ts:40](../../src/app/systems/modes.ts#L40)                                                 | Effective light preset through Headlights, with existing per-site tuning.                                                                                                                                                                                                    |
| [sonar.ts:42](../../src/app/systems/sonar.ts#L42)                                                                                                              | Effective sonar POI range, updated live; palette/zoom are separate preferences.                                                                                                                                                                                              |
| [presets.ts:32](../../src/app/systems/presets.ts#L32), [HUD.ts:189](../../src/ui/HUD.ts#L189)                                                                  | Resolved current mode for archived/local current scale and HUD; Daily override belongs in the existing resolver.                                                                                                                                                             |
| [waypoints.ts:51](../../src/app/systems/waypoints.ts#L51)                                                                                                      | Effective visual-hints preference each frame, with the intentional near-site approach marker.                                                                                                                                                                                |
| [props.ts:70](../../src/app/systems/props.ts#L70)                                                                                                              | Effective camera is current; **D1: mode still comes from boot settings. Migrate this read.**                                                                                                                                                                                 |
| [progress.ts:26](../../src/app/systems/progress.ts#L26), [Progress.ts:89](../../src/game/Progress.ts#L89)                                                      | Another boot-mode argument exists, but `hullFor` ignores it and selects only by depth. It is redundant cleanup, not another confirmed stale effect.                                                                                                                          |
| Save / ModeSelector / Briefing / Settings / Daily navigation                                                                                                   | Preference writers and route selectors, not second equipment applicators. Keep saved preferences independent of Daily conditions. HUD/contact hull dimensions, world tuning and spawn safety margins are mode-invariant base Config consumers and need no blanket migration. |

## Exact verification results

All commands run from the checkout root with the installed tools.

```sh
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/f2-modes.test.ts tests/unit/modesExploration.test.ts tests/unit/daily.test.ts tests/unit/dailyBoot.test.ts tests/unit/dailySystem.test.ts tests/unit/dailyCompletion.test.ts tests/unit/power.test.ts tests/unit/powerSystem.test.ts tests/unit/missionApproachSystem.test.ts tests/unit/settingsSave.test.ts
```

Exit **0**: **10 files, 151 tests passed**, 2.47 s.

```sh
node_modules/.bin/vitest run --configLoader runner --cache=false tests/unit/arcadeLoadout.test.ts tests/unit/firstMove.test.ts tests/unit/lifeDisposal.test.ts
```

Exit **0**: **3 files, 182 tests passed**, 49.48 s. Total existing checks:
**13 files / 333 tests passed**, no changed assertions.

The temporary boot matrix was made by copying `tests/unit/dailyBoot.test.ts`
under `/tmp`, replacing relative source import prefixes with the absolute
checkout path, and adding the 18-boot loop described above. Its three copied
checks overlap the existing suite; its two added parameterized cases each run
nine boots. Disposable combined run:

```sh
node_modules/.bin/vitest run --config /tmp/settings-apply-audit/vitest.config.mjs --configLoader native --cache=false
AUDIT_FIX=1 node_modules/.bin/vitest run --config /tmp/settings-apply-audit/vitest.config.mjs --configLoader native --cache=false
```

Current source: exit **1**, **2 failed / 7 passed**, 779 ms; both failures are
D1's fresh-boot equality guards. Hypothetical in-memory one-line substitution:
exit **0**, **9 passed**, 733 ms. The temporary config's transform is enabled
only by `AUDIT_FIX=1`; it never writes the source. Current-source output is
retained at `/tmp/settings-apply-audit/current.log`.

Formatting and whitespace results are recorded after the reproducible check below.
No full repository test, build or visual gate is claimed.

## Retained D1 reproduction

This fixture remains intentionally red against the baseline. From this checkout,
extract it and a temporary config using the following command. The optional
transform validates the proposed fix without editing any source or assertion.

````sh
python3 - <<'PYSETUP'
from pathlib import Path
root = Path.cwd()
probe = Path('/tmp/settings-apply-audit')
probe.mkdir(exist_ok=True)
note = (root / 'plan/progress/3950-S-bughunt-settings-apply.md').read_text()
source = note.split('```typescript\n', 1)[1].split('\n```', 1)[0]
(probe / 'settings-apply.test.ts').write_text(source.replace('__ROOT__', str(root)))
modules = probe / 'node_modules'
if not modules.exists():
    modules.symlink_to(root / 'node_modules', target_is_directory=True)
(probe / 'vitest.config.mjs').write_text("""export default {
  root: '/tmp/settings-apply-audit',
  plugins: [{ name: 'audit-hypothetical-fix', transform(code, id) {
    if (process.env.AUDIT_FIX === '1' && id.endsWith('/src/app/systems/props.ts')) {
      if (!code.includes('ctx.settings.gameplayMode')) throw new Error('Audit target changed');
      return code.replace('ctx.settings.gameplayMode', 'ctx.save.get().gameplayMode');
    }
  }}],
  test: { environment: 'node', include: ['*.test.ts'], maxWorkers: 1 },
};\n""")
PYSETUP
node_modules/.bin/vitest run settings-apply.test.ts --config /tmp/settings-apply-audit/vitest.config.mjs --configLoader native --cache=false
AUDIT_FIX=1 node_modules/.bin/vitest run settings-apply.test.ts --config /tmp/settings-apply-audit/vitest.config.mjs --configLoader native --cache=false
````

```typescript
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Box3, Group, Scene, Vector3 } from 'three';
import { makeConfig } from '__ROOT__/src/core/Config.ts';
import { EventBus } from '__ROOT__/src/core/EventBus.ts';
import { Save } from '__ROOT__/src/core/Save.ts';
import { resolveEffective } from '__ROOT__/src/game/EffectiveSettings.ts';
import { Submarine } from '__ROOT__/src/sub/Submarine.ts';
import { CameraRig } from '__ROOT__/src/sub/CameraRig.ts';
import { modesSystem } from '__ROOT__/src/app/systems/modes.ts';
import { propsSystem } from '__ROOT__/src/app/systems/props.ts';
import { Props } from '__ROOT__/src/world/Props.ts';

// Keep real mode application, vehicle, camera and opening solver. Replace optional IO,
// mesh building and collision only; the authored site's mode overrides stay real.
async function place(bootMode: 'arcade' | 'realistic', liveMode = bootMode) {
  const config = makeConfig();
  const save = new Save({ config, storage: null });
  save.setGameplayMode(bootMode);
  const settings = save.get();
  const effective = resolveEffective(settings, bootMode, null, config);
  const terrain = {
    sampleHeight: () => -800,
    getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
  };
  const root = new Group();
  root.position.y = -800;
  const hero = {
    def: { id: 'poseidon-tower', model: 'synthetic', clearsGround: false },
    root,
    localBounds: new Box3(new Vector3(-5, 0, -5), new Vector3(5, 30, 5)),
  };
  let finish!: () => void;
  const io = new Promise<void>((resolve) => {
    finish = resolve;
  });
  vi.spyOn(Props.prototype, 'load').mockImplementation(async function () {
    await io;
    this.placed.push(hero as any);
    return { landmarkId: 'lost-city', count: 1, models: 0, procedural: 1 } as any;
  });
  vi.spyOn(Props.prototype, 'collide').mockReturnValue(false);
  vi.spyOn(Props.prototype, 'dispose').mockImplementation(() => {});
  vi.spyOn(Props.prototype, 'debugString').mockReturnValue('synthetic hero');
  const sub = new Submarine(effective.submarine, terrain);
  sub.setHullClass('B');
  sub.reset(0, -750, 0);
  const ctx: any = {
    app: { state: 'dive' },
    config,
    save,
    settings,
    effective,
    daily: null,
    meta: JSON.parse(readFileSync('__ROOT__/data/tiles/lost-city/meta.json', 'utf8')),
    terrain,
    sub,
    rig: new CameraRig(effective.camera, 16 / 9, terrain),
    scene: new Scene(),
    tier: 'low',
    route: null,
    spawnDepth: null,
    params: new URLSearchParams('tile=lost-city'),
    contentLandmark: 'lost-city',
    bus: new EventBus(),
    canvas: {},
    expose() {},
    discovery: { ready: Promise.resolve(), pois: [], scanner: { setConfig() {} } },
    power: { setConfig() {}, setEnabled() {} },
    headlights: { setPreset() {} },
    sonar: { setSensorRange() {} },
    presets: { setCurrentMode() {} },
    hud: { setCurrentMode() {} },
  };
  const loaded = new Promise<void>((resolve) => ctx.bus.on('props:loaded', resolve));
  try {
    modesSystem.init!(ctx);
    modesSystem.start!(ctx);
    propsSystem.init!(ctx);
    save.setGameplayMode(liveMode);
    expect(ctx.effective).toEqual(resolveEffective(save.get(), liveMode, null, config));
    finish();
    await loaded;
    return { radius: ctx.rig.chaseRadius, range: Math.hypot(sub.position.x, sub.position.z) };
  } finally {
    propsSystem.dispose?.();
    modesSystem.dispose?.();
    vi.restoreAllMocks();
  }
}

afterEach(() => vi.restoreAllMocks());
it.each(['arcade', 'realistic'] as const)(
  'fresh %s placement is the expected control',
  async (mode) => {
    const actual = await place(mode);
    expect(actual.range).toBeCloseTo(mode === 'arcade' ? 38 : 44, 8);
    expect(actual.radius).toBeCloseTo(mode === 'arcade' ? 66 : Math.hypot(38, 90), 8);
  },
);
it.each([
  ['arcade', 'realistic'],
  ['realistic', 'arcade'],
] as const)(
  'late placement after %s -> %s must match a fresh boot in the selected mode',
  async (before, after) => {
    const actual = await place(before, after);
    const fresh = await place(after);
    console.log(JSON.stringify({ before, after, actual, fresh }));
    expect(actual).toEqual(fresh);
  },
);
```

## Scope and simplicity

Only this note is added. The smallest proposed repair removes a stale snapshot
read; it adds no setting, UI, listener, dependency, site branch or runtime state.
The existing resolver remains the only place that combines tuning, mode, kit and
Daily. Package history stays in this note. No source/test/snapshot assertion was
weakened and no visual judgement was attempted.

Final note verification:

- `node_modules/.bin/prettier --write plan/progress/3950-S-bughunt-settings-apply.md`: exit **0**.
- `node_modules/.bin/prettier --check plan/progress/3950-S-bughunt-settings-apply.md`: exit **0**, “All matched files use Prettier code style!”
- `git diff --check`: exit **0**, no output.
- `git diff --no-index --check /dev/null plan/progress/3950-S-bughunt-settings-apply.md`: exit **1**, no whitespace diagnostics (the no-index comparison detects the new file). This additionally checks the untracked note, which ordinary `git diff --check` does not include.
- Extracted the fixture from the **formatted note** using its own setup command and reran the two targeted commands: current source exit **1**, **2 failed / 2 passed**, 561 ms; in-memory proposed fix exit **0**, **4 passed**, 524 ms. Logs: `/tmp/settings-apply-audit/retained-current.log` and `/tmp/settings-apply-audit/retained-fix.log`.
- `git rev-parse HEAD`: still `ddcaaac5c141473ba4823e85a675384f2e27d887`. `git status --short`: only `?? plan/progress/3950-S-bughunt-settings-apply.md`. No tracked source, test, snapshot, Director or tools change.
