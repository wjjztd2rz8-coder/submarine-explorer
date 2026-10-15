# 2120 — S-verify, tenth pass

Reviewed main at `1c1dad6` in two rounds. Requested history: V-headlight
(`78f9fcf`, `46b191a`), Titanic plateStains (`069c081`), V-eight-sites
(`e6298bf`, `55fc5b5`), V-sub-scale (`a91e577`, `d87f0a2`), and the
2060/2070/2080 merges (`afdf21d`, `02a6cce`, `8d91362`). Later verification
and bug-hunt changes already on main were retained. No source, content,
assets, CSS, camera values, shader parameters or snapshots changed in this pass.

## Round 1 — diffs and regression inventory

- **Headlight:** the only surviving runtime diff blends the existing clamped
  terrain roughness toward 0.9 with weight 0.25. Medium/High's resulting interval
  is 0.775–0.925. Low's non-PBR branch is unchanged: preprocess the before/after
  shader with `cpp -P` and both hashes are
  `ac4dafe074083d40641007ff3ea1e0cdf634991540075e4b9a7ebd474f74fcf8`.
  No new uniform, sampler, extension, vertex output or texture read. The raw
  fragment declaration inventory remains 31 uniforms, including six sampler
  declarations; this is not a linked-program active-resource count.
- **Steel plates:** six sine hashes per covered fragment (two plate hashes and
  four inside one noise evaluation), fixed arithmetic, no loop, sampler,
  uniform or additional draw. The patch is shared by Titanic/Bismarck steel
  and their steel scatter; other material factories retain standard shaders.
  Low uses 256 px maps without normals, Medium 512 px without normals, High
  512 px with normals. Map UV use stays under `USE_MAP`; a missing canvas map
  skips the hook. Existing standard fog, lights and output chunks survive.
- **Precision/fallback:** the installed Three.js renderer explicitly requires
  WebGL2 and defaults to highp; neither quality tiers nor the plate patch
  override precision. There is no complete WebGL1 renderer fallback to certify.
  Re-ran the previous isolated EGL/GLES checker against this checkout's exact
  plate declarations/body: ES 1.00 and ES 3.00, highp and mediump, mapped and
  unmapped all compile (eight checks). Compilation does not establish mediump
  noise quality: the hash's large multiplier can lose fractional variation at
  reduced precision. No supported highp regression was demonstrated, and no
  noise/palette change is made. Real-phone ALU time and image quality remain
  unmeasured.
- **Approaches:** the four changed distances remain Bismarck 150 m, Hudson,
  Hunga and Blake 160 m; the other nine rows are unchanged. Existing geometry
  checks still enforce hull, terrain, prop and camera clearance, target
  projection on desktop/portrait/landscape, and each sensor's range. The scan
  cap scales with the table and leaves at least 60 m before Extended scan reach.
  Geometric projection does not prove rendered contrast at these dark sites.
- **Subject scale:** final dimensions are Challenger 26×26×34 m and Beebe
  31×24×16 m; the camera experiments were reverted. Reviewed every snapshot
  leaf changed by the two visual packages: headlight snapshot edits are shader
  hashes only; scale edits are confined to Beebe's first hero prop. No other
  prop, uniform digest, shader digest or draw count is rebaselined by scale.
  The Low flat-ground census actually rises 19,926→20,758 (+832) triangles;
  the budget rises 19,938→20,758 (+820), using the previous 12-triangle margin.
  It remains a finite cap plus an exact snapshot, rather than a self-comparison.
- **2060:** diagnostic tier rejection runs before browser/scene setup; defaults
  are Low/Medium/High, perf keeps Low/High. Settings migration/reload and Daily
  synchronization tests retain independent persisted expectations. No production
  storage schema or gameplay tuning was changed by that package.
- **2070:** reviewed photo quota classification, per-system cleanup, ZIP timer
  ownership, editable focus clearing, instant-based discovery ordering and clock
  suppression. New tests exercise real writes/reloads, bus listeners, download
  clicks, submarine/scanner behavior and RAF deltas. The startup fixture change
  supplies a real EventTarget; it removes no assertion. Later photo write
  verification from 2100 remains intact.
- **2080:** the hint must first appear with exact device-specific text and its
  seen-state transition before expiry is checked. Early exit only removes frames
  after disappearance; the original 60×250 ms upper bound remains. A stuck hint
  still fails the immediate assertion. Matrix changes preserve one worker,
  zero root-shard retries and deadlines; refreshed weights retain the timed-out
  case's observed cost. No skip, timeout relaxation or passing timing substitution.

## Round 2 — close coverage and documentation gaps

- Found a vacuous enumeration risk: `missionApproach.test.ts` obtained its cases
  from `MISSION_APPROACH_M`, so deleting a row deleted that site's three tests.
  Cases now come from the independent authored site index. A table expectation
  pins all 13 accepted distances, and every site/tier/sensor case explicitly
  retains the 60 m transit. Existing clearance/projection checks are unchanged.
- Strengthened the existing steel capability to compare GLSL uniform declarations
  as well as JS uniform bindings and sampler/texture calls. An added float uniform
  could previously evade the resource guard. Added a separate existing-file
  capability proving all three tiers retain the exact standard shader when canvas
  maps are unavailable, including the unpatched program key.
- Sensitivity check through a temporary Vite transform: delete Bismarck's row,
  inject a float uniform into steel, and apply the plate hook without a map.
  All three guards fail as intended. No production file is mutated. This closes
  coverage holes; no new runtime defect was confirmed, so no runtime fix or
  visual change was justified.
- Corrected deployment docs to match 38 shards, PR-only cancellation, zero root
  retries (project-base retains its configured default), screenshot/report
  artifacts, and three root smoke plus eight project-base cases. Added the
  WebGL2 requirement to README. Added missing CHANGELOG entries for the four
  visual changes, diagnostic-tier repair, bug fixes and CI changes, including
  reasons for the changed approaches/subject scale. Historical entries retain
  their original shard counts.

## Validation

- PASS: strengthened approach and steel capabilities, **2 files / 78 tests**,
  including all 39 site/tier geometry cases and both textured/untextured steel.
  `npx vitest run tests/unit/wrecks.test.ts tests/unit/missionApproach.test.ts
--configLoader runner --pool=forks --maxWorkers=1 --cache=false`.
- PASS: timing importer, shard balancer, quality and settings capabilities,
  **4 files / 77 tests**, with the same runner/fork options.
- PASS: broader affected capabilities, **15 files / 233 tests**: app systems,
  photo mode/storage, discovery storage, input, Daily, quality/settings, Beebe
  isolation, Low terrain buffers, lander verification, deep openings and mission
  composition. These batch counts overlap; they are not summed as distinct cases.
- PASS: golden-options Node tooling test, changed-file Prettier and
  `git diff --check`.
- PASS: sensitivity run **three expected failures**, one for each guard above;
  all eight isolated GLSL compilations; preprocessed Low shader equality;
  snapshot leaf audit; TypeScript; strict content validation; attribution.
- Production Vite bundle succeeds using the existing writable-config build
  mode into isolated `dist-2120`. The gate fails afterward in its unchanged
  manifest helper with `spawnSync git EPERM`. No provenance guard bypassed.
- Python: **162/166 pass**; four manifest tests hit the same `spawnSync git
EPERM` restriction. No Python assertion/configuration was changed.
- Browser discovery: **262 cases / four existing specs** (smoke, mission,
  opening-framing, hud-touch). Attempted execution cannot start its owned
  preview; direct preview confirms `listen EPERM 127.0.0.1:4212`. No browser,
  screenshot, phone-performance or hosted CI pass is claimed.
- INCOMPLETE: full unit run with `--configLoader runner --pool=forks
--maxWorkers=1 --cache=false` was stopped after approximately ten minutes
  (exit 130), having reported only its RUN header and no case results. Initial
  thread-pool full/focused attempts also reported no results and were stopped;
  the fork-based focused batches above completed normally. This is not a full
  unit pass or an observed assertion failure; its cause is not established here.
  No runner configuration or timeout changes ship.

Isolated `dist-2120` output was removed after the browser attempt. Changes are
uncommitted.

Evidence is under `.cache/2120/`: `capabilities-round2.log`,
`tooling-capabilities.log`, `sensitivity{.log,.config.mjs}`, `shader-check.py`,
`shader-compile.log`, `terrain-low-{before,after}.glsl`, `snapshot-audit{.mjs,.json}`,
`typecheck.log`, `content.log`, `attribution.log`, `build.log`, `python.log`,
`browser{.log,-discovery.log}`, `preview.log`, `audit-capabilities.log`,
`golden-options.log`, `format-check.log` and `units-round{1,2}.log`.
