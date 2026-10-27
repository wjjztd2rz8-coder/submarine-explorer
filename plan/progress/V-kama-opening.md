# V-kama-opening + V-hunga-opening

Numbers from [4670](4670-S-verify-kama-opening.md).

## What changed

- Hunga mission opening range 160 m to 120 m (`data/landmarks/hunga-tonga-caldera/site.json`). Data edit only; heading is 90 degrees and the chase camera is standard.
- Kama mission opening range 130 m to 110 m, with a raised 35 m chase arm (`chaseRadius` 35, `chaseOffsetY` 100) in the site's `opening.mission` data.
- The mission schema (`SiteManifest.ts`) accepts the existing camera fields. `composedMissionSpawn` (`Spawn.ts`) copies them from the site's mission row into the returned pose, and the existing mission start code applies them. No site branch, no config mutation.
- Tests: `missionApproach.test.ts` ranges updated and a capability assertion that per-site mission arm data reaches the pose. The 110 m floor in that spec and in `missionComposition.test.ts` allows 0.01 m float tolerance (the reconciled range is 109.99999999999999). Not loosened beyond float error.

## Simplicity rules

- Rule 4: extended the existing per-site mission table.
- Rule 5: no runtime config change.
- Rule 6: extended capability specs; no new spec.
- Rule 1: no new UI or settings. Nothing cut, so no CHANGELOG line.

## Honest rating (Low tier, screenshots in `.cache/codex/shots/V-kama-opening/`)

- **Kama: 3.8 of 5 for the opening.** Pillow field is about 22% of desktop frame height (about 11% in portrait), outside the 100 m Arcade scan radius (HUD 110 m). Gold-brown iron mats are visible against the slate slope. The accents are small and the slope behind is busy. On desktop the hull sits below the frame, because the high arm looks down the slope. In portrait it fills the bottom. Target of about 10% met.
- **Hunga: 3.6 of 5.** The tuff wall is about 27% of frame height and reads as a rim scarp in all three layouts. The scene is still dim and muddy-teal; no shader lift was added.

## Gates

- Unit specs `missionApproach`, `missionComposition`, `siteManifest`: pass.
- `tools/gates.sh` (smoke + project-base): see the end of this note.
