# F-MONTEREY-860 — first frame: light and life

Implementation complete, 2026-10-08. Rendered visual acceptance and fresh paired
screenshots remain pending: the sandbox denies preview listening and Chromium
startup, and the connected browser list is empty. No after-image or rendered
contrast claim is made from the headless checks.

## Changes

- Monterey's mission raises ambient fill from 24 to 28 and changes the fill tint
  from `0x4f7480` to the more neutral `0x71858b`. A modest hemisphere light
  (`0xa8bbc8` sky / `0x493d32` ground, intensity 3) preserves a difference between
  upward and downward surfaces. Fog, terrain materials, post-processing and
  other sites' lighting retain their defaults. This is an authored visibility
  aid at depth, not sunlight.
- Monterey's sub lamps use 2× spot intensity and 1.2× distance, with 3× short
  point-fill intensity and 1.5× fill distance. Existing falloff, spot angles,
  beam opacity and shadow settings remain. The gains survive preset switches,
  lamp toggling and ROV retrieval; the deployed ROV keeps its existing work-light
  values. The intent is readable wall beds at 40–60 m; pixel confirmation remains
  pending. No extra lamp, beam draw or shadow map is added.
- The existing creature system places two Pacific hake schools travelling north
  along the local canyon axis, a few sablefish near the wall toe, and a rooted
  sea-pen field over the nearby floor before random groups fill the pool.
  Low stages 8 + 5 hake, 3 sablefish and 5 sea pens; other tiers stage
  14 + 12 hake, 4 sablefish and 9 sea pens. Normal simulation then continues.
  Placement checks depth bands, seabed clearance, prop collision and tier reach;
  staging is limited to within 160 m of the opening ledge.
- Low retains its 44-agent / four-species cap, low-detail models and reserved
  rare-appearance slot. Hake and sablefish take the two existing star slots;
  sea pens win the next slot by their existing weight. Random life elsewhere in
  Monterey uses the existing table, now including sablefish. Other sites have
  no habitat callback and no spawn-table changes. `?life=0` remains supported.
- Hake and `Umbellula lindahli` are in the retained Monterey OBIS species list.
  Sablefish use the existing fish builder with the hover archetype, sourced
  from NOAA, Monterey Bay Aquarium and MBARI; see
  [sources.md](../../data/landmarks/monterey-canyon/sources.md#f-monterey-860-opening-wildlife).
  The OBIS snapshot is unchanged. Journal text is factual and uses the existing
  Game addition label for staged encounters.
- Keep the North canyon wall's coordinates, radius, spawn position, altitude
  and chase offsets. Reduce only the Monterey opening yaw offset from 10° to 6°
  so terrain differences between tiers no longer put the target just outside
  the scanner's 35° cone. The existing global chase reset distance is retained.

## Three review rounds

1. Preserve the before build and inspect the three retained reference images.
   Attempt fresh desktop/portrait goldens. The first candidate school anchors
   were inside the ledge; collision checks skipped them. The new scan check also
   exposed the existing Low/High facing-cone edge. Initial fixture corrections
   use the public `spawnSettings()` helper and Terrain's disposal API.
   Logs: `.cache/monterey-860/round1*.log`, `clearance.log`.
2. Move the school anchors to the clear near-side water, spread sea pens into
   a field, and keep both schools' counts inside Low's pool. Preserve the two
   star-slot contract. Lowering the requested spawn altitude did not resolve
   the scan angle because the terrain clearance guard dominates; restore the
   original altitude and reduce the heading offset instead.
   Log: `.cache/monterey-860/round2.log`.
3. Verify all four tiers with real surveyed terrain, placed walls, opening
   cameras, population steering, wall sightlines, and Scanner completion through
   ten seconds. Check clear/reset repopulation and lamp mode/ROV transitions.
   Attempt full E2E with `VISUAL_QA=1` and fresh after goldens. The initial full
   unit run had one unchanged wall-life timeout under parallel CPU load; rerun
   the complete suite with two workers, retaining all assertions and timeouts.
   Logs: `.cache/monterey-860/round3-preflight.log`, `gates.log`, `unit-final.log`.

## Before/after shots — every Monterey golden pose

Fresh paired captures are **blocked**, rather than substituted with edited
images or headless diagrams. Canonical desktop is 1600×900; portrait is 390×844.
The saved before build is `.cache/monterey-860/before/dist/`, including its original
copied data. The final build is `dist-monterey-860/`.

| Layout   | Pose | Camera / authored framing                             | Fresh before | Fresh after |
| -------- | ---- | ----------------------------------------------------- | ------------ | ----------- |
| Desktop  | 1    | Free-dive opening, chase                              | Blocked      | Blocked     |
| Desktop  | 2    | Cockpit, 75 m from wall target, 26 m above ledge base | Blocked      | Blocked     |
| Desktop  | 3    | Cockpit, 48 m range, 12 m lateral, same altitude      | Blocked      | Blocked     |
| Portrait | 1    | Same opening                                          | Blocked      | Blocked     |
| Portrait | 2    | Same 75 m approach                                    | Blocked      | Blocked     |
| Portrait | 3    | Same 48 m inspection                                  | Blocked      | Blocked     |

Both attempts preserve the requested pose/layout manifests:

- [Before capture manifest](../../.cache/golden/2026-10-08-134332/poses.json),
  [contact sheet](../../.cache/golden/2026-10-08-134332/index.html):
  `complete: false`, zero captures. Chromium fails at
  `sandbox_host_linux.cc` with `shutdown: Operation not permitted`.
- [After capture manifest](../../.cache/golden/2026-10-08-135234/poses.json),
  [contact sheet](../../.cache/golden/2026-10-08-135234/index.html):
  the same startup failure, zero captures.
- Both `tools/golden.sh` attempts fail to listen on `127.0.0.1:4298`
  (`EPERM`): `.cache/monterey-860-before-golden.log` and
  `.cache/monterey-860/after-golden.log`.
- Browser skill recovery reports `No browser is available`; browser list `[]`.

The following retained 1280×720 images were supplied with the workspace and
inspected as **prior references**, not fresh before captures or after evidence.
Their original source is `.cache/codex/shots/f-visual-qa/`.

Opening reference:

![Prior Monterey opening](../../.cache/monterey-860/before/monterey-canyon-1.png)

Approach reference:

![Prior Monterey approach](../../.cache/monterey-860/before/monterey-canyon-2.png)

Inspection reference:

![Prior Monterey inspection](../../.cache/monterey-860/before/monterey-canyon-3.png)

When browser/port access is available, serve each preserved build separately
and use the same canonical tool against each server. For example:

```bash
npm run preview -- --outDir .cache/monterey-860/before/dist --port 4390 --strictPort --configLoader runner
GOLDEN_SITES=monterey GOLDEN_LAYOUTS=desktop,portrait node tools/golden-shots.mjs --base-url http://127.0.0.1:4390/

npm run preview -- --outDir dist-monterey-860 --port 4391 --strictPort --configLoader runner
GOLDEN_SITES=monterey GOLDEN_LAYOUTS=desktop,portrait node tools/golden-shots.mjs --base-url http://127.0.0.1:4391/
```

Review all six pairs for the wall strata at 40–60 m, separated warm/cool
lighting, hull silhouette, several visible animals during the first ten
seconds, and an unobstructed first scan card. Headless frustum inclusion and
prop-ray clearance cannot establish rendered lighting, fog, or terrain occlusion.

## Validation

- Build, Python (148 tests), strict content, attribution, whole-repository
  Prettier, and `git diff --check` pass.
- All five new opening/lamp tests pass. Real terrain tests require both staged
  schools plus sablefish and sea pens, bounded populations, visible species in
  the opening frustum with clear wall-prop rays, a North canyon wall candidate
  that completes its real scan, species still present after ten seconds, and
  one field after clear/reset. Existing geometry and scan assertions remain.
- Full unit result: **144 files / 1,464 tests pass** with two workers, recorded
  in `.cache/monterey-860/unit-final.log`. The first run had 1,463 passes and
  one wall-life timeout; all original timeouts and assertions are retained.
- Full E2E and project-base E2E were attempted with `VISUAL_QA=1`; both stop
  before tests because the preview web server cannot start. Retained logs:
  `.cache/monterey-860/gates/e2e.log` and `e2e-base.log`.

Full gate command:

```bash
GATES_CONFIG_MODE=writable PW_PORT=4386 PW_OUTDIR=dist-monterey-860 VISUAL_QA=1 tools/gates.sh --full-e2e
```
