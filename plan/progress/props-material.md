# Props: chimney `material_hint`

Closes the gap flagged in `plan/progress/C4a.md` and `plan/QA-C-INTEGRATION.md`
(Lost City's carbonate chimneys rendered basalt-grey).

- New optional props.json key `material_hint`: `basalt | carbonate | sulfide`.
  It applies to `procedural:chimney` only. An unknown value is a validation error
  (entry skipped). On other kinds it is ignored with a warning, like `ends`.
  Without the key, chimneys look exactly as before.
- Engine: `PropDef.materialHint` (`src/world/PropLoader.ts`),
  `buildChimney(dims, seed, cfg, material)` and `chimneyPalette()`
  (`src/world/props/Procedural.ts`). Palettes are in
  `Config.props.chimneyMaterials` (`carbonate` `#A9A393`/`#D6D1C4`, `sulfide`
  `#24201E`/`#7A4E2C`). `basalt` still reads `colors.basalt`/`colors.mineral`.
  Geometry is the same for every hint. The impostor uses the rock colour.
- Offline validator: `tools/validate_props.py` (`CHIMNEY_MATERIALS`), which
  `tools/validate_landmark.py` also uses.
- Docs: `docs/props.md` (key table, chimney section) and
  `plan/PHASE-B-CONTRACTS.md` §2.3.
- Content: all five Lost City chimneys set `"material_hint": "carbonate"`.
  Removed the "renders basalt-grey" caveats from Lost City's guide, mission
  hazards, props note and sources.md.
- Tests: TS loader, builder and Props wiring; Python validator.
- Visual check (ad hoc, not committed): `/?tile=lost-city&landmark=lost-city&at=30.1236,-42.1203,30&depth=770`.
  The towers read pale cream-grey. At close range the headlit face saturates to
  near-white, as the lit seabed does. I dimmed the first palette (`#C4BDAB`)
  for this, but the change is barely visible because the saturation comes
  from light exposure.
- Not done: no `tint` hex key (a hint is enough for current packs). The
  Beebe and Axial packs can use `sulfide` when they are authored.
