# Scan, discovery, field guide, debrief (B1)

The Tier 1 discovery loop: approach a point of interest (POI), hold the scan
beam on it, unlock its field-guide entry, and see what you found in the
debrief. Schemas are authoritative in `plan/PHASE-B-CONTRACTS.md` §2.1–2.2;
this page covers how the engine uses them.

## Files

| Module                                                 | Role                                                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `src/game/ContentPath.ts`                              | `landmarkIdFor(params, tileId)`, `contentUrl(id, file)`, `fetchContentJson()` (missing/HTML/garbage → `null`, never throws) |
| `src/game/Pois.ts`                                     | `pois.json` types, `parsePois`, `placePois`, `spawnPoseForPoi`                                                              |
| `src/game/Guide.ts`                                    | `guide.json` types, `parseGuide`, `buildGuideEntries`                                                                       |
| `src/game/Scanner.ts`                                  | beam state machine; pure TS, `update(dt, position, forward, held)`                                                          |
| `src/game/DiscoveryStore.ts`                           | localStorage persistence + `migrate()`                                                                                      |
| `src/game/Objectives.ts`                               | `Objectives` (per-landmark progress) and `SessionStats` (debrief numbers)                                                   |
| `src/game/Discovery.ts`                                | wires the above and the overlays together; the only thing `main.ts` touches                                                 |
| `src/ui/ScanOverlay.ts`, `FieldGuide.ts`, `Debrief.ts` | DOM overlays (styles under `/* --- B1 --- */` in `src/styles.css`)                                                          |

## Content

`/data/landmarks/<landmark>/pois.json` and `guide.json`. The landmark folder is
`?landmark=<id>` if given (letters, digits, `_`, `-` only), else the tile id.
Both files are optional.

- POI world position: `latLonToWorld(meta, lat, lon)`; Y = `-depth_m` (a
  positive magnitude), or the seabed with `snap_to_seabed: true` or no depth. A
  POI is never placed below the seabed. POIs outside the tile are skipped.
- Defaults: `radius_m` → `Config.scan.defaultRadiusM` (150), `scan_seconds` →
  `Config.scan.defaultSeconds` (4), unknown `kind` → `other`.
- Guide unlocking: an entry is unlocked when any POI whose `guide_entry` points
  at it has been discovered. An entry no POI points at (an overview, say) is
  unlocked from the start. A POI whose `guide_entry` is missing or unresolved
  gets a minimal stand-in entry (id = POI id) so it still has something to unlock.
- `guide.json` may carry an optional top-level `title` (site display name). If
  it doesn't, the name comes from `data/landmarks.json`, and failing that the folder id.
- Guide text is only ever set with `textContent`. Image and source URLs must be
  `http(s)://` or site-relative (`/data/...`); anything else is dropped.

Fixture: `data/landmarks/_test/` (Titanic tile). `test-bow` is primary, 3 s,
`depth_m: 3800`, entry `bow`. `test-debris` is secondary and seabed-snapped,
entry `debris`. Entry `site` is unreferenced, so it starts unlocked.

## Scanning

The candidate is the nearest POI within `radius_m` (3D distance) whose
direction is within `Config.scan.coneHalfAngleDeg` (35°) of `sub.getForward()`.
Inside `closeRangeM` (25 m) the facing test is skipped. While `InputState.scan`
is held (G / gamepad RB), progress grows by `dt / scan_seconds`.

- Released, out of range or off-facing → one `scan:aborted`. Progress then
  decays at `decayPerSecond` (0.35/s), so a target re-acquired quickly resumes.
- Once a scan completes, G has to be released before that POI can be scanned
  again. Repeat scans bump `count` and report `firstTime: false`.
- Scanning is suppressed while the field guide or the debrief is open. The game
  itself keeps running.
- `main.ts` calls `discovery.update()` once per frame with
  `dt = steps × fixedDelta` (simulated seconds), so progress follows physics
  time and does not depend on frame rate.

Events (`GameEvents`): `scan:started {poiId}`, `scan:progress {poiId, progress}`
(≤ `progressEventHz` = 10), `scan:aborted {poiId, reason: range|facing|released}`,
`scan:complete {poiId, landmarkId, firstTime}`, `guide:opened {entryId}` (fires
whenever an unlocked entry is displayed).

## Persistence

localStorage key **`subexplorer.discoveries.v1`**:

```json
{
  "version": 1,
  "discovered": { "<landmark>/<poiId>": { "at": "2026-09-22T10:00:00.000Z", "count": 1 } },
  "stats": { "scans": 1, "firstAt": "2026-09-22T10:00:00.000Z" }
}
```

`migrate()` turns older shapes (a bare key array, `{discoveries: [...]}`, or a
key → ISO/true map) and malformed v1 documents into this shape. A save written
by a _newer_ version is left untouched: the store goes read-only for that
session rather than overwriting it. Missing or throwing storage makes the
store in-memory only. Nothing ever throws.

## Keys and overlays

| Key           | Action                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| G (hold) / RB | scan (`InputState.scan`)                                                |
| J             | toggle field guide (`toggleGuide` action, added to `src/core/Input.ts`) |
| Esc           | close the field guide, then the debrief                                 |

The scan overlay has a corner-bracket reticle over the nearest contact, plus a
panel showing its name and a hint: `CLOSE TO 150 M` when out of range,
`TURN n° PORT/STARBOARD` or `PITCH TOWARD TARGET` in amber when you are not
facing it, and `HOLD G TO SCAN` when it can be scanned. While the beam is on,
a cyan progress ring fills. A completed scan shows `NEW ENTRY`, and pressing
J then opens the guide at that entry.

The panel's distance is the 3D range to the POI; the mission objectives
panel's `RNG` is the same slant range (QA-B #11).

**Focus (QA-B #12).** The field guide and the debrief trap Tab inside
themselves while open (`src/ui/FocusTrap.ts`; traps stack, so the guide opened
from a debrief wins until it closes). Opening one blurs whatever was focused
behind it but does not focus its own buttons: Space is ballast blow, and a
focused "Dive again" would reload on a held Space. The first Tab lands inside.

**Framing (QA-B #6).** `discovery.focusPoint()` is the nearest POI while it is
inside its scan radius (else null). main.ts passes it to `CameraRig.update` as
`focus`, and the chase camera slides sideways (to the target's side) and up and
aims part-way at it (`Config.camera.focus*`), so the boat's own hull no longer
sits on the sight line to the wreck. The HUD also drops the static SEABED
PROXIMITY banner while it is non-null (QA-B #14): wreck inspection happens at
12–25 m altitude on purpose. The closing-rate warning (under 60 m and < 4 s
from contact) still fires.

**DIVE TIME** counts real seconds of unfrozen play (`Discovery.update`'s
`clockDt`), not capped physics time (QA-B #10).

## Debug params

- `?landmark=<id>`: which content folder to load.
- `?poi=<poiId>`: once POIs have loaded, spawn `spawnDistanceM` (80 m, capped
  at 80% of the radius) from the POI on `spawnBearingDeg` (180, i.e. south of
  it), facing it, at the POI's depth. The spawn is clamped to at least
  `hullRadius + seabedClearance + spawnClearanceM` above the seabed and pulled
  in until the POI is inside 90% of its radius. `window.__game.discovery.spawnedAt`
  is set when the spawn has been applied.
- `?debrief=1`: open the debrief `debugDebriefDelayMs` (3 s) after boot.

Try `/?tile=titanic&landmark=_test&poi=test-bow`, then hold G.

## For B3 (mission flow)

- `window.__game.discovery` is the `Discovery` instance; `.ready` resolves once
  content has loaded.
- `discovery.objectives.progress()` returns `{ total, discovered, primaryTotal,
primaryDiscovered, primaryComplete, items[] }` for the current landmark.
  Re-read it on `scan:complete`.
- `discovery.showDebrief({ title: 'Mission complete', subtitle })` merges its
  argument into the session stats (distance, max depth, time, scans this dive,
  new entries) and opens the debrief. "Dive again" reloads the page. To change
  that, construct your own `Debrief` with `onDiveAgain`.
- `discovery.guide.open(entryId?)` opens the field guide, optionally at an entry.
- `discovery.stats.markTeleport()`: call this after moving the sub yourself, so
  the jump isn't counted as distance travelled.
- Keep `?poi=` working: `tests/e2e/discovery.spec.ts` depends on it.

`window.__game` also exposes `scanner` (`.view` is a live snapshot),
`discoveries` (the store), `debrief` and `fieldGuide`.

Tests: `tests/unit/game*.test.ts`, `tests/e2e/discovery.spec.ts` (screenshots
`discovery-scan.png`, `discovery-guide.png`, `discovery-debrief.png`).
