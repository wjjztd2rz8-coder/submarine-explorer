# V-journal-polish

## Change

- Ghost text: the Journal panel was 90% opaque over a 50% dim, so the HUD and the pause/home menu showed through. The panel is now opaque (its pointless backdrop blur is gone), the dim is 92%, and the home/pause menu is `visibility: hidden` while the Journal is open (replacing the earlier `pointer-events: none` rule in `menus.css`, which left it visible). No new element or state.
- Photo crop: `canvasThumbnail` takes an optional `subjectY`; a frame taller than 4:3 is cropped to a 4:3 band centred on it (clamped inside the frame). The first-scan still projects the scanned POI or animal through the camera to get it. Landscape frames and photos the player takes in photo mode are unchanged. The cyan rectangle was the pause menu's panel showing through the translucent Journal (it spilled outside the picture in portrait), not part of the photo; the opaque panel and hidden menu remove it. The photo is a plain canvas read and never contained the reticle (the reticle is DOM).
- Debrief: `debriefText` now takes the primary tally instead of a boolean. "Primaries complete" reads "2 of 2 primary objectives · 1:15" instead of "All primary objectives · 2 of 4 objectives". `Mission.primaryCounts()` supplies it.

Tests (by capability, existing specs): `photoStore.test.ts` (portrait band, clamping, landscape untouched), `journalData.test.ts` (debrief wording), `missionAbort.test.ts` (signature). The e2e debrief assertions only check the title, which is unchanged.

## Screenshots

`.cache/codex/shots/V-journal-polish/` `before-*` (director round-1 captures) and `after-*` at 1280x720, 844x390, 390x844. After: no ghost text inside the panel; HUD outside the panel at 1280 is only faintly visible. The staged capture uses a synthetic scan event with the POI out of view, so the still shows the sub deck; the subject-centred crop is covered by the unit test, not by a real framing.
