# F-BUGHUNT-17 — hero props and spawn/scan integrity

2026-10-03. Two code-review rounds on Titanic, Lost City, Great Blue Hole,
Beebe Vent Field and Monterey Canyon. Static gates pass; browser gates are blocked by the sandbox, as detailed below.

## Round 1 — findings and minimal fixes

1. **Lost City small carbonate chimneys double-snapped to sloping terrain.**
   `buildCarbonateChimney` builds a terrain-conforming apron, but `followsTerrain`
   did not recognize it without a feature id. `Props.place` applied a second
   lowest-corner snap. On actual terrain, Beehive's origin was lowered by
   2.111 m (Low) / 2.209 m (Medium), burying its one-metre column. Recognize
   the same carbonate/zero-diameter branch used by the builder. This also makes
   `Props.replace` rebuild its terrain-relative mesh and compound colliders.
   Generic fixed-diameter sulfide/basalt chimneys keep their footprint snap.
2. **Great Blue Hole's scenic opening lacked a nearby scan.** Its only POIs
   were the eastern/western atoll drop-offs, kilometres from the grotto opening.
   Add an optional `great-blue-hole-stalactites` contact at the existing
   `karst-grotto` coordinate, linked to the existing `the-hole` Journal entry.
   Low confidence and Recreation tag explicitly identify the authored placement;
   internal provenance distinguishes the game coordinate from a surveyed gallery.
   Existing mission primaries, real-site dimensions, history and sources stay intact.

Before fixes, the focused audit produced four failures: the two carbonate
placement cases and both Blue Hole opening-minute cases. Eleven cases passed.

## Round 2 — integrity review

- Seventeen unit cases cover all five sites on actual shipped heightmaps with
  terrain detail/carves and procedural geometry at Low and Medium.
- Every prop loads without skipping/failure. Solid mesh vertices, including
  instanced debris, have seabed contact and exposed geometry: no entirely floating
  or entirely buried set. Individual foundations deliberately sunk into terrain
  are allowed. Existing Blue Hole shelf-foot tests cover its individual ledges.
- Free-dive and composed Arcade mission openings have a straight approach to a
  scan station within 60 s at a gentle 4 m/s, including scan time. Approaches sample
  terrain and all prop colliders every 4 m. Stations use the real scanner, full POI
  list and legal pitch, and avoid prop collision. Each POI has a legal scan station;
  distant optional targets are not required in the opening minute.
- Every POI explicitly links to an authored, nonempty Journal entry; scanning it
  unlocks that entry and preserves Recreation metadata. Every secret and every
  wildlife spawn/rare species has matching text and a tested discovery unlock.
- Hero POI names, guide titles/paragraphs/facts, mission objective strings, secret
  text and wildlife text have no repeated illustrative/reconstructed/recreation
  caveats. The existing `JOURNAL_HONESTY` front-page note and tags remain the single
  explanation; no copy rewrite was needed.
- Two synthetic slope tests isolate carbonate replacement with scalar/nonuniform
  scale and offsets, verifying new geometry, seated origin and rebuilt colliders.
- These are code-level checks, not visual acceptance or full navigation pathfinding
  for distant contacts. In particular, the shallow atoll platform cannot be assumed
  traversable by the hull merely because both drop-off stations are scannable.

## Gates

`GATES_CONFIG_MODE=writable PW_PORT=4390 tools/gates.sh --full-e2e` exits 1:

- PASS configuration, root production build/typecheck, **1,173 unit tests across
  108 files**, **140 Python tests**, strict content, attribution and Prettier.
- Project-base production build/typecheck also passes.
- E2e and e2e-base stop before browser assertions because preview startup fails.
  An independent Node TCP listen probe confirms `EPERM` on `127.0.0.1:4390`.
  Network/server permissions cannot be elevated in this workspace.
- Logs: `.cache/gates/{build,unit,python,content,attribution,prettier,e2e,e2e-base}.log`.
- Focused new suite: **17/17 pass**. `git diff --check` passes.

The full required gate is **not passed**. Run the same gate command on a host
that permits local preview servers, and visually inspect the hero screenshots
before merge. No assertions, timeouts or gate selections were weakened.
