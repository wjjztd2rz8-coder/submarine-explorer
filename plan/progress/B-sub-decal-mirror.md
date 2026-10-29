# B-sub-decal-mirror

## Finding

The reported mirror is not reproduced by the source geometry. No runtime change
is justified by the available evidence; visual acceptance remains open.

- `src/vehicles/hulls.ts` places Class A's `DSV-1` on the aft deck with a +Y
  normal. Class B/C numbers are side markings. The same builders serve every site.
- `src/vehicles/decals.ts` maps increasing U left to right and increasing V toward
  the bow on the deck. Its basis has positive handedness. The atlas draws text
  with positive scale; the canvas texture uses its normal vertical upload flip.
- `src/vehicles/materials.ts` uses the default front side for decals. The text is
  not the back of a double-sided plane. Vehicle scaling is positive; physics yaw
  is a rotation, not a reflection.
- The supplied Blue Hole golden shows `DSV-1` in the correct character order.
  The deck is seen at a grazing angle, strongly compressing the letters' height.
  This makes the D look distorted; foreshortening is the likely explanation,
  not a demonstrated UV bug. A temporary raycast probe across the D's strip also
  found no intervening deck surface from behind/above; this is not a GPU check.

Flipping a UV axis would introduce a reflection. The hull, camera, atlas and
materials are unchanged.

## Regression coverage

Added `tests/unit/decals.test.ts` (four passing cases):

- Deck lettering projects upright and left to right through the actual SubMesh
  scale/pose at north, east, south and west headings, including Blue Hole's west
  opening. The decal material remains front-sided.
- Every decal in all three hull classes has outward triangle winding, matching
  normals and positive UV handedness. This catches negative scale, reversed
  winding and a single flipped UV axis without needing a browser canvas.

## Evidence

Reviewed the supplied Blue Hole mission image and Titanic deep mission image.
Their existing golden manifest records clean SHA
`3645c0f6e30be56c7efdac077373a7066fa76441`, which matches this checkout's HEAD.
Runtime files have not changed. Copies and provenance are retained under
`.cache/codex/shots/B-sub-decal-mirror/`:

- `reference-great-blue-hole-1-mission.png`
- `reference-titanic-1-mission.png`
- `evidence.json`

These are existing reference captures, **not fresh screenshots**. The Browser
skill connection returned no available browsers. The local preview fails with
`listen EPERM 127.0.0.1:4173`; standalone Chromium also fails with
`sandbox_host_linux.cc:41 ... shutdown: Operation not permitted`. Fresh screenshots
could not be captured in this sandbox.

Pending manual check in a browser-capable environment: open
`/?mission=great-blue-hole&skipBriefing=1&tutorial=0&tier=high&dynres=0`, inspect the
deck text from the default chase camera and from higher photo/orbit angles, then
turn through each heading. Repeat at Titanic, inspecting its Class B side
lettering. Save fresh PNGs beside the references. If only the default low angle
distorts the D, classify this as camera/text readability rather than mirroring.

## Validation

- `npx vitest run tests/unit/decals.test.ts --configLoader runner --cache=false`:
  **4/4 passed**.
- New decal coverage plus existing `tests/unit/vehicles.test.ts`, with one
  worker: **23/23 passed**.
- `npm run typecheck`: passed.
- Repository-wide Prettier: passed. Attribution: passed. `git diff --check`:
  passed.
- `GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/codex/dist PW_PORT=4173 bash
tools/gates.sh --no-e2e`: content and production build passed. Python failed
  five unrelated tooling cases: four manifest tests hit `spawnSync git EPERM`;
  golden comparison failed parsing empty JSON. Logs:
  `.cache/runs/20261029-064613-2-ebWVn1/`.
  The default full unit stage did not complete or print file results within six
  minutes and was interrupted; it is not recorded as passing.
- A full unit retry with `--maxWorkers=1` also did not finish within a 180-second
  limit (`timeout` exit 124). Output: `.cache/codex/unit-single-worker.log`.
  The cause is undiagnosed; only the focused 23-test run is recorded as passing.
- Grepped `tests/e2e` for hull, vehicle, decal and chase coverage. Attempted the
  following targeted capability specs against the built output; each was blocked
  before test execution because the preview server could not start:

  ```sh
  GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/codex/dist PW_PORT=4173 \
    npx playwright test tests/e2e/sub-playtest.spec.ts \
    -g 'after turning to ~090 the chase camera sits west of the boat, behind it'
  GATES_CONFIG_MODE=writable PW_OUTDIR=.cache/codex/dist PW_PORT=4173 \
    npx playwright test tests/e2e/sub-playtest.spec.ts \
    -g 'QA-B #2: deep tiles fit a hull rated for them; no breach at spawn|QA-B #3: shallow tile centres spawn submerged over deep water'
  ```

The project-base browser gate was not run after preview startup failed. Overall
gates are not green, and fresh visual acceptance is still required.

No tools or DIRECTOR edits; no merge or push.
