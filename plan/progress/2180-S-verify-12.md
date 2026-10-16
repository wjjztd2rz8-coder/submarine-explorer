# S-verify-12 — merged-work audit

Baseline: `7057ab2` (2026-10-15). Reviewed `git log --oneline -12`
(`26b9892` through `7057ab2`, including the Lost City implementation immediately
behind that boundary) and the requested `82eaa98` (2120), `fdb147e` (2130),
`bdaf13f` (2140), `aac4f6c` (V-low-tier) and `e76bd93` (V-golden-monterey).
Rechecked `git log main --oneline -12`: main advanced to `59c287a` during the
audit, a Titanic in-flight status note only. At the final check main reached
`ab449b9`, including the later Titanic palette merge (`96bf380`, `88538b0`).
Static review of its 11 added source lines finds no rule 4/6/7 violation or
assertion change: the material option is explicit in the two Titanic builders.
That later palette merge is outside this checkout's build/unit results; no
moving-main source changes were incorporated.

## Findings and fixes

- **Fixed: slope-aligned `clear_ground` footprints.** `coversGround` transformed
  a point at sea-level Y into the prop's local frame. At roughly 3,800 m depth,
  a modest slope moved that point hundreds of metres sideways, so even the
  prop's center was reported uncovered. Replaced the manual X/Z comparisons
  with a vertical ray against the expanded local box. Scratch objects are
  reused; no allocations per query, new public API, setting or site dispatch.
  The existing prop-loader capability now checks aligned and unaligned props,
  heading, nonuniform scale, projected base/crown points and unrelated props.
  Before the fix: the aligned case fails, 22 others pass. After: all 23 pass.
  Authored Blue Hole props are unaligned: all **122,412** sampled footprint
  queries on controlled flat ground (both galleries, all tiers, padding 0/4)
  match the original result.
- **Fixed two small coverage/documentation gaps.** The seabed-light test claimed
  Medium/High but exercised only High; it now exercises both. Added the missing
  `clear_ground` field to the authoritative props contract. Its loader and
  `docs/props.md` already documented/implemented literal-true opt-in.
- **No newly loosened real-bug assertion found.** In the last 12 commits,
  sponge identity coverage is removed because that mesh is deleted; Blue Hole's
  draw ceiling tightens 8→6, with its triangle ceiling retained. Lost City biome,
  geometry and Endurance pose snapshot changes agree with the authored changes.
  In 2140, deleted source digests/internal cache identities have surviving
  behavior tests; the removed Monterey comparison required increased geometry
  cost, rather than enforcing a performance ceiling. Zero-spacing rejection
  remains in loader validation. Browser assertions remain; screenshot sleeps
  are removed or replaced with frame opportunities. In V-low-tier, Lost City
  and Beebe move from unchanged-water checks into the positive Low-fill cases;
  the illumination threshold stays intact and exact intensity rises 3→6.
- **Rules 4/6/7:** no new site-ID branch in shared code, package-named spec or
  package-history comment found in the reviewed changes. Lighting stays in
  existing site tables; the new exclusion flag is data-driven. Historical
  package-named specs remain pre-existing; this audit adds no spec file.
- **2120/2130:** approach coverage is independently enumerated and preserves the
  60 m scan transit; steel fallback/shader resource guards remain. Input still
  polls gamepad edges while suppressing flight in editors. Audio guards both
  before and after synchronous caption callbacks. No regression found there.
- **Monterey capture:** only the CDP fallback failure bound changes 30→90 s.
  The normal 30 s screenshot bound, readiness checks, poses, error checks and
  metadata remain. This is tooling tolerance, not a relaxed gameplay assertion.

## Larger follow-up: late prop loading

The Blue Hole `clear_ground` change only consults `env.blocked` when creating a
sessile patch. Props and life load independently, and life frame updates do not
wait for `props.loaded`. Already-created patches are never rechecked when props
arrive. Deterministic simulation: **45** rooted agents before the predicate
changes from false to true; **45** still present four seconds after every spot
becomes blocked. This proves the lifecycle gap, not its frequency in a browser.
It can leave the floating corals that this feature intends to remove on slow
loads. Current Blue Hole content uses the affected sessile population path.

Added the follow-up to the existing V-bluehole backlog item. Coordinate life
initialization with prop readiness or explicitly refresh affected patches after
loading; add delayed-load capability coverage. This needs lifecycle/visual
review, rather than a broad per-frame population reset in this verification fix.

## High/Medium isolation

Compared `21ecdb3^` (`e76bd93`, immediately before V-low-tier's source change)
with the audited checkout. Default water bytes match. For all 13 sites plus an
unknown fallback, both tiers preserve the original water reference; **28**
resolved configurations and **448** atmosphere samples at 16 depths are
byte-identical with no input mutation. Both revisions receive the same
deep-opening input, isolating `lowSiteWater`/`siteLightWater` from later deliberate
Endurance changes. This proves configuration/sample equality for V-low-tier,
not identical rendered frames across all subsequent visual merges.

Sample evidence SHA-256:
`6c9751ff6be7297bd9c91fc2a9f612111c90dece2b2054a3480c3fb1cace83fc`.

## Validation

- PASS: Low/atmosphere/quality batch, **5 files / 62 tests**.
- PASS: affected prop/collision/Blue Hole/Low-light batch, **4 files / 74 tests**;
  final prop/Low-light recheck, **2 files / 34 tests**. Counts overlap.
- PASS: full unit suite, **191 files / 2,320 tests**, no skips, in **983.44 s**:
  `npx vitest run --configLoader runner --pool=threads --maxWorkers=1
--cache=false --reporter=verbose`.
- PASS: TypeScript and production Vite bundle; strict content validation;
  attribution; repository-wide Prettier and `git diff --check`.
- `GATES_CONFIG_MODE=writable PW_PORT=4280 bash tools/gates.sh` attempted.
  Content/build pass. Python: **162/166 pass**, four unchanged manifest tests
  fail at `spawnSync git EPERM`. Default full-unit runner produces only its RUN
  header for several minutes and is interrupted; the successful full run above
  uses the established thread-pool workaround, with no shipped config/timeout changes.
- Canonical final build/e2e phases fail at the same Git provenance subprocess.
  The direct final production bundle succeeds; no provenance guard is bypassed
  or changed. Full and targeted Playwright attempts fail before assertions; direct preview
  reports `listen EPERM 127.0.0.1:4283`. Browser screenshots, real-phone
  readability/performance and a full e2e pass remain unverified.

Evidence under `.cache/2180/`: `recent-commits.txt`, `main-recent-commits.txt`,
`main-final-commits.txt`,
`atmosphere-compare.{mjs,log}`, `ground-{audit.mjs,audit.log,after.log}`,
`ground-before.log`, `footprint-isolation.{mjs,log}`, `low-atmosphere.log`,
`focused-after.log`, `final-focused.log`, `unit-full.log`, `gates.log`,
`build-{final,direct}.log`, `e2e-targeted.log`, `e2e-full-gate.log`, `browser-direct.log`,
`browser-full.log`, `preview.log`, `prettier.log`.
Canonical gate logs also live under `.cache/runs/`.
Isolated production build directories were removed after validation.
