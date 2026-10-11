# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (comprehensive review, Claude alone, 2026-10-11 05:30; golden 2026-10-11-100422)

Sol skipped (Codex 5h 9%). Scores (beautiful): Titanic 4, Endurance 4 (+0.25), Beebe 3.75, Monterey 3.75, Challenger 3.75, Blue Hole 3.5 (+0.25), Lost City 3.5. No regressions.

Claude backlog (ordered by player impact; all unblocked; Sonnet visual, Haiku small):

1. (MERGED 2026-10-11, spec lightened: 800x500, fewer shots; hosted CI to confirm) **Hosted CI f1-vehicles (Haiku):** `e2e/f1-vehicles.spec.ts:21` screenshot times out on the software-GL runner; fewer/lower-res screenshots, never loosen assertions.
2. (MERGED 2026-10-11 f-touch-stack: objective chip, tutorial collapse >900 px) **Touch landscape stack (Sonnet):** scan card + tutorial strip cover ~195 of 390 px; collapse the strip after the first scan and add a compact objective chip when no contact is in range.
3. (MERGED 2026-10-11 f-tutorial-order: out-of-order scan/lights/photo/journal remembered, step auto-skips on arrival) **Tutorial step text after first scan (Sonnet):** still says 'Step 1: Move and turn' (1240 tests pin it; update tests deliberately).
4. **Blue Hole gallery apron/talus (Sonnet):** ramp apron smooth and fogged at gallery range.
5. (MERGED 2026-10-11 f-lostcity-tower: ochre/blue-grey colour, stronger flutes, subtler fins, tip clear of scan card; clear but moderate gain, towers still smooth-sectioned) **Lost City tower read (Sonnet):** raise striation contrast and colour variation; keep scan card off the tip.
6. (MERGED 2026-10-11 f-challenger-cam: portrait lander clear, touch briefing scrolls) **Challenger camera/briefing (Haiku):** camera hides lander behind sub; touch briefing clips objectives.
7. **Monterey wall-foot boulders and Endurance minimap stripes (Haiku, low).**

Codex queue: 1280 Blue Hole squiggle, 1290 verify hull/Lost City, 1310 Titanic sky + Challenger boulders; plus new briefs below.

## Update 2026-10-11 04:50 (post f51)

- DONE: new-player flow recapture (f-newplayer-recapture: touch reward notice moved clear of scan card, RISE/SINK hint on touch) and f-scan-card-objective (scan card points at the mission objective). Codex 1250 (sonar flat sites) and 1260/1270 merged; f51 pushed.
- Open, Claude backlog: (a) touch landscape stack (scan card + tutorial strip ~195 of 390 px) covers the subject, e.g. Blue Hole gallery reticle: layout decision, collapse the strip once the first scan is done; (b) card only shows within scan range of a contact, so far from any contact touch has no 'where next' signal (consider a compact objective chip); (c) tutorial still says 'Step 1: Move and turn' after the first scan (pinned by 1240 tests; revisit deliberately); (d) Challenger camera hides the lander behind the sub; touch briefing clips objectives; (e) Blue Hole gallery-range apron/talus; Titanic sky + Challenger boulders (Codex 1310 queued).
- Needs owner: nothing.

## Current priorities (comprehensive review, Claude alone, 2026-10-10 22:00; golden 2026-10-11-015340)

Sol skipped (Codex weekly 5%). Scores (beautiful): Titanic 4, Beebe 3.75, Monterey 3.75, Challenger 3.75 (+0.25, grey-olive floor, lander and amphipods read), Endurance 3.75 (lit water column good; hull still small and pale), Lost City 3.5, Blue Hole 3.25 (+0.25, minimap now calm and hole legible). No regressions. CI on f49 green.

Claude backlog (ordered by player impact; all unblocked; Sonnet visual, Haiku small):

1. (DONE f50 pushed) **Release f50 (Haiku):** full e2e on main (9+ commits ahead of origin), push, tag f50, check `gh run list`. Never loosen assertions; software-GL frame-count flakes get rerun alone. Free PW_PORT first (`fuser -k`).
2. **New-player flow recapture (Haiku capture, Sonnet judge):** Home to site to first 60 s to Journal to debrief on desktop and phone; not recaptured since 10-09. Fix any dead end or clutter found.
3. (MERGED 2026-10-11 f-lostcity-5: striations, brucite fins, silt variation; modest gain, fins a bit spiky, scan card still overlaps tower tip in opening) **Lost City columns (Sonnet):** towers are smooth pale pillars with a bland seabed slope; add vertical flow striations, colour variation, brucite fringe near orifice; keep the scan card clear of the tower.
4. (MERGED 2026-10-11 f-endurance-hull: opening chase arm 98.5->70 m, plank tones, ribs, rail growth; hull ~380 px, sits low in frame) **Endurance hull scale and weathering (Sonnet):** hull reads small against the plain at the default pose; bring the camera closer or enlarge the framing, vary plank colour, add rail growth and a broken-rib silhouette.
5. (MERGED 2026-10-11 f-bluehole-bowl: terrace banding, lit lips, ~2x flora, +0.3 on approach; gallery-view ramp apron/talus still smooth, fog) **Blue Hole floor/bowl (Sonnet):** wall and floor still smooth green ramps with sparse debris-like flora; add bowl terraces visible at gallery range and denser sponge/coral clumps.
6. (QUEUED Codex 1310 with item 7) **Titanic dark-void sky (Haiku/Sonnet):** flat near-black above the horizon; a faint depth gradient like Endurance's, without brightening the abyss mood.
7. **Challenger rock scale (Haiku, low):** cobbles are tiny at 45 m; add a few larger boulders and a slope shadow beyond the lander.

Codex queue unchanged (1220-1280, dry until 15 Oct): see below.

## Previous priorities (targeted review, 2026-10-10 20:00; golden 2026-10-11-004532)

Why: Claude idled at >=50% because the backlog was empty after the last merges and Codex is dry until 15 Oct. New golden set viewed (Claude alone, no Sol). Scores (beautiful): Titanic 4, Beebe 3.75 (two chimneys with smoke, lit), Monterey 3.75 (wall silhouette and strata good), Endurance 3.75 (hull large, lit sky), Challenger 3.5, Lost City 3.5, Blue Hole 3 (floor still a smooth grey ramp; minimap now teal camouflage blotches that don't read as bathymetry).

Claude backlog (ordered by player impact; all unblocked; Sonnet visual, Haiku small):

1. **Release f50 (Haiku):** full e2e on main, push, tag f50, check `gh run list`. Never loosen assertions; software-GL frame-count flakes get rerun alone.
2. (MERGED 2026-10-10 f-bluehole-map: calm reef gradient, hole legible; +0.1-0.25) **Blue Hole minimap (Sonnet):** outside the hole the sonar is camouflage-like teal blobs; replace with a calm depth gradient plus the hole ring so the feature reads in 2 s.
3. **Lost City columns (Sonnet):** towers are smooth pale pillars; add vertical flow striations, colour variation and brucite fringe near orifice; keep the scan card clear of the tower.
4. (MERGED 2026-10-10 f-challenger-tone: grey-olive silt, softer fog; ~+0.5) **Challenger seabed tone (Sonnet):** the floor is bright warm tan at 10.9 km; cool and darken toward grey-brown with soft fog so the trench feels deep, keeping the lander readable.
5. **Endurance hull weathering (Sonnet):** pale planks with repeating dark blotches; vary plank colour, add marine growth near waterline-equivalent rail and a broken-rib silhouette.
6. **Monterey wall base (Haiku/Sonnet, low):** the row of dark boulders at the wall foot is a neat line; scatter and vary size.
7. **New-player flow recapture (Haiku capture, Sonnet judge):** Home to site to 60 s to Journal to debrief on desktop and phone (Codex 1260 covers it after 15 Oct; do first if budget allows).

Codex queue unchanged (1220-1280, dry until 15 Oct): 1220 pacing gaps, 1230 CI shard triage, 1240 verify lander/first-discovery, 1250 sonar flat sites, 1260 new-player flow audit, 1270 verify Lost City/CI, 1280 Blue Hole squiggle.

## Previous priorities (comprehensive review, Claude alone, 2026-10-10 08:30; golden 2026-10-10-123858)

Sol skipped (Codex weekly 5%). Scores (beautiful): Titanic 4, Lost City 3.5 (+0.5), Endurance 3.5 (+0.5), Beebe 3.5, Monterey 3.5, Challenger 3.5, Blue Hole 3.

Claude backlog (ordered by player impact; all unblocked; Sonnet visual, Haiku small):

1. **Push f48 and confirm hosted CI green (Haiku):** full e2e on main was started 2026-10-10 08:30 (.cache/full-e2e-review.log); if all gates pass push, tag f48, check `gh run list`. If CI still red, read shard logs and lighten specs, never loosen assertions.
2. (MERGED 2026-10-10 14:06 f-bluehole-floor2: squiggle gone, banded apron, reef-shaded minimap, ~+0.3; terraces still subtle at gallery range, wall reads flat cream) **Blue Hole floor and minimap (Sonnet, take a new angle):** floor is a smooth grey ramp and the minimap a flat teal square; tried three times. Use vertex-colour banding plus real terrace geometry (no silt texture), and shade the minimap by depth outside the hole.
3. (MERGED 2026-10-10 f-rusticles: thin drooping clumps, clear gain) **Titanic rusticles (Sonnet):** shrink and thin the orange spikes, vary length, cluster them under rails and edges.
4. (MERGED 2026-10-10 f-beebe-trunk: paint ownership bug fixed, ochre crests, modest gain at range; near pose still shows side stack) **Beebe main trunk (Sonnet):** side chimneys are crusted; the central trunk is a smooth brown cone, give it the same crust, flange and colour treatment.
5. (MERGED 2026-10-10 f-endurance-sky: lit water column, scour-shaded minimap, hull glyph; clear gain) **Endurance sky and minimap (Sonnet):** dark void above the horizon, minimap five stripes; add haze gradient and ice-scour relief on the map.
6. (MERGED 2026-10-10 f-monterey-wall: slump scars, uneven ledges, fallen blocks; modest gain, no overhang geometry) **Monterey wall silhouette (Sonnet, low):** strata read; the wall outline is stepped slabs, add slump and overhang variation.
7. (MERGED 2026-10-10 f-challenger-seabed: cobbles, dropstones, tone patches; clear gain) **Challenger seabed (Haiku/Sonnet, low):** add scattered rocks and faint slope shading around the lander.

(MERGED 2026-10-10 f-bluehole-wall: stratified ledges, depth colour grade; modest gain at gallery range, bowl terraces still fogged) Blue Hole wall pass done. Backlog otherwise empty; next run needs a new golden set + review.

Codex queue (dry until 15 Oct weekly reset): 1220 pacing gaps, 1230 CI shard triage, 1240 verify lander/first-discovery, 1250 sonar flat sites (largely done by f-sonar-flat; check before running), 1260 new-player flow audit, 1270 verify Lost City/CI, 1280 Blue Hole squiggle.

## Previous priorities (comprehensive review, Claude alone, 2026-10-09 17:30; golden 2026-10-09-221156)

Codex 5h was 11% so Sol was skipped (exit 75). Scores (beautiful): Titanic 4, Beebe 3.5 (chimney now layered/ridged, +0.25), Monterey 3.5 (livelier, more flora), Blue Hole 3 (bowl readable, sonar still a flat green square), Lost City 3 (tower still blobby plates), Challenger 3 (lander visible, seabed dim and flat), Endurance 2.5 (snow discs and black blob on sub unchanged; 1180 running).

Claude backlog (ordered by player impact; all unblocked; Sonnet visual, Haiku small):

1. **Push wave f45 and fix hosted CI:** run full e2e on main, push, tag, check `gh run list`; 14/30 e2e shards still failed on the pre-1120 SHA. If still red, queue Codex triage with shard logs.
2. **Endurance snow + black blob (Sonnet, after 1180 lands):** snow discs cover the lower half of frame; black blob on the sub hull; flat horizon.
3. **Sonar minimap legibility (Sonnet or take Codex 1200):** Blue Hole, Endurance and Titanic maps are flat teal squares; scale and depth shading so features read.
4. **Lost City tower redo (Sonnet):** flow-stone ridges, orifice, colour variation; trunk is still pale plated blob.
5. **Challenger seabed (Sonnet):** brighten and add relief to the seabed around the lander, amphipod swarm legible, slope visible.
6. **Blue Hole overhangs and sponge density (Sonnet):** bowl floor still smooth; remaining pacing gaps at Challenger/Hunga Tonga/Hudson are Codex 1220.
7. **Unaided first-discovery open items (Haiku):** reward card title vs objective name; desktop tutorial stuck on 'Move and turn'.

Codex queue: 1190 (Titanic haze), 1200 (sonar palette), 1210 (verify merged), 1220 (pacing gaps), 1230 (CI shard triage after push). Running: 1130, 1180.

## Current priorities (comprehensive review, Claude alone, 2026-10-09 22:30; golden 2026-10-10-030121)

Codex weekly 6% so Sol was skipped (exit 75). Scores (beautiful): Titanic 4, Challenger 3.5 (lander + amphipods + ripples now clearly read, +0.5), Monterey 3.5, Beebe 3.5, Blue Hole 3 (overhangs help; floor still smooth), Lost City 3 (tower still lumpy brown cone, orifice dark but chimney reads as clay), Endurance 3 (snow discs and black blob gone, +0.5; hull small, flat void above horizon, minimap five stripes).

Claude backlog (ordered by player impact; all unblocked; Sonnet visual, Haiku small):

1. (PARTLY MERGED 2026-10-09 23:xx: installer retry, first-minute timeout 480 s; f-bughunt-1090 frame-floor specs still fail on hosted runners, Codex 1270 proposes a hosted-safe variant) **Hosted CI green (Haiku):** the fixable part (bughunt1090 wrote to a missing .cache) is fixed. Next: 10/30 e2e shards hit 300 s test timeouts on hosted runners (page closed); find the slow specs from shard logs (gh api .../jobs/<id>/logs), cut or lighten them, never loosen assertions. Playwright apt-lock flake in project-base: add a retry wrapper. Codex 1230 covers it only after the 15 Oct reset.
2. (MERGED 2026-10-09 22:50: ridges, haze band, oak hull; ~3.5, opening framing still small) **Endurance scene (Sonnet):** hull is small and dark in a flat tan plain with a void above the horizon; add scale (ice-scoured seabed, boulders, distant relief), haze gradient, bigger approach framing.
3. (MERGED 2026-10-09 23:xx: pale carbonate, white-fringed orifice with shimmer; ~3.5; striations subtle at range) **Lost City tower (Sonnet):** trunk reads as brown clay cone with lumpy plates; needs pale carbonate with vertical flow striations, white-fringed orifice with shimmer, brighter material contrast against the dark seabed.
4. (TRIED 2026-10-10, not merged: branch claude/f-bluehole-floor, terraces invisible; squiggle texture from silt_a.jpg unsolved, Codex 1280 queued) **Blue Hole floor and gallery (Sonnet):** the bowl floor is a smooth grey ramp with scattered boulders; add terraced ledges and sediment banding; drop the beige tile-like noise.
5. (MERGED 2026-10-10 03:xx: crusted ochre/sulfide flanges, dark smoke, ~+0.4; flanges slightly spiky, chimneys 2-3 keep old profile) **Beebe chimney trunk (Sonnet):** smooth grey fluted trunk, still reads as plaster; add crust, chimneys with mineral colours, visible black smoke at the orifice.
6. **Phone pass at 844x390 (Haiku capture, Sonnet judge)** of Challenger lander, Endurance and the new sonar.
7. **Monterey spare wall regularity (Sonnet, low):** strata better, still corrugated.

Codex queue: 1220 (pacing gaps), 1230 (CI shard triage), 1240 (verify lander/first-discovery), 1250 (sonar flat sites), 1260 (new-player flow audit). Codex is dry until the 15 Oct weekly reset.

## Previous priorities (joint review with Sol, 2026-10-09 evening; golden 2026-10-09-195308)

Agreed scores (beautiful): Titanic 3.5-4, Beebe 3-3.5, Blue Hole 2.5-3, Lost City 3-3.3, Monterey 3-3.5, Challenger 2.5-3, Endurance 2.5. Stage ~70%, 3-4 weeks. Sol's calibration: opening frames hide weak close-ups; "complete a scan and read the reward" has never been captured; second required targets are 4.5 km (Blue Hole) and 14.6 km (Monterey) away.

Claude backlog (ordered by player impact; all unblocked; Sonnet visual, Haiku small):

1. (MERGED 2026-10-09 evening: tools/firstdiscovery-shots.mjs, phone notice and next-target chip fixes; Beebe 173 degree turn not reproduced in guided flow; open: reward card title differs from objective name, desktop tutorial stuck on 'Move and turn') **Unaided first-discovery capture (Sonnet):** extend tools/firstminute-shots.mjs to press Scan, show the reward and the next-step prompt on desktop and phone for Titanic and Beebe; fix whatever confuses (Beebe asks for a 173 degree turn while onboarding teaches vertical movement; Titanic phone 60 s frame loses the wreck).
2. (MERGED 2026-10-09 eve: Blue Hole 270 m, Monterey 645 m; Challenger 4.1 km, Hunga Tonga 3.3 km, Hudson 2.8 km gaps remain, allowlisted in tests/unit/missionPacing.test.ts) **Mission pacing (Sonnet):** second required targets at Blue Hole (~4.5 km) and Monterey (~14.6 km) are transit, not exploration; move or add intermediate required POIs so the next target is within ~1 km, keeping facts honest.
3. (BOWL PASS 4 MERGED: ragged lip, bluer walls, capsule sponges, ~+0.25; overhangs/sponge density open) **Blue Hole bowl and sonar scale (Sonnet):** shelf line, faceted terraces, capsule sponges; sonar minimap scaled so the hole is legible (palette itself is Codex 1200).
4. **Challenger seabed legibility (Sonnet):** lander marker is tiny; make the amphipod swarm and slope readable (1170 audits).
5. **Lost City tower redo (Sonnet):** still blobby clay with plate flanges; flow-stone ridges, orifice, material variation.
6. **Beebe chimney trunk and sediment (Sonnet):** fluted-cone look; sediment still procedural.
7. **Review and merge Codex 1090-1120, 1130, 1140, 1160 (Haiku gates, Claude review); hosted CI green on the release SHA; then push wave f45 after full e2e.**

Codex queue: 1170 (Challenger audit), 1180 (Endurance snow/black blob), 1190 (Titanic haze), 1200 (sonar palette). Also running: 1130, 1140, 1160 plus stalled 1090-1120.

Process: capture Monterey alone before starting Sol (CPU contention caused timeouts); audit all contact-sheet sites, not just the hero five.

## Previous priorities (targeted review 2026-10-09 14:30; golden 2026-10-09-191533)

Why this refresh: Claude sat at >=50% for 140 h of samples because the backlog read "waits for the next golden set"; the set now exists. Scores (honest): Titanic 4, Beebe 3.5, Monterey 3.5 (strata better), Challenger 3 (empty seabed), Lost City 3, Blue Hole 2.5-3.

Claude backlog (ordered by player impact; all unblocked; Sonnet visual, Haiku small):

1. (MERGED 2026-10-09 15:xx, modest gain: jagged ledged silhouette, orifice not yet verified in frame) **Lost City tower trunk:** lost-city-2 is a smooth pale blob with flat saucer flanges; needs carbonate flow texture, irregular profile, mineral colour variation, orifice.
2. (PARTLY MERGED: stouter pendants, Blue Hole-only sonar ramp, but sonar background is STILL a flat green square and the shelf line/bowl read unchanged; redo with a new angle: darken sonar fill by depth and rework the wall profile near the gallery seat) **Blue Hole bowl + sonar (Sonnet):** bowl is smooth beige with a hard shelf line and flat-cone stalactites; the minimap is a flat lime-green square (no bathymetry read). Add ledge relief, darker blue lower walls, stalactite taper, readable sonar palette.
3. **Challenger Deep seabed life (Sonnet):** challenger-deep-1 is an empty brown plane; add amphipods near the lander, sediment ripples, a visible slope/horizon.
4. **Titanic haze band / horizon (Sonnet):** big flat dark void above a hard seabed horizon.
5. **Merge Codex 1090/1100/1110/1120 when budget returns (Haiku gates, Claude review):** worktrees stalled by the Codex floor; hosted CI for f43 still red (1120 triage).
6. **Phone pass at 844x390 landscape for the three new fixes (Haiku capture, Sonnet judge).**
7. **Push wave f45 after full e2e on main once 1-2 merge.**

Codex queue: 1130 Beebe scatter rocks, 1140 bug hunt f44, 1160 verify debrief-zero, 1170 Challenger seabed bug/fidelity audit.

## Previous priorities (refreshed 2026-10-09 midday comprehensive review; golden 2026-10-09-112035)

Status 2026-10-09 07:xx: items 1 and 2 MERGED (1070 spec fix, 1060 Journal/Debrief, 1080 Endurance framing + Beebe smoker). Hosted CI needs re-check after push. Remaining Claude backlog: 3-7.

Claude backlog (ordered by player impact; all unblocked; Sonnet for visual, Haiku for small):

1. **Hosted CI green (Haiku, then Sonnet if needed):** latest completed CI (f41 docs commit) failed 10+ of 30 e2e shards after 36 min. 1070 worktree holds an uncommitted spec fix (f-bughunt-15 batched visibility) and its gate run was killed by the Codex floor. Finish: run it, merge, push, then check the hosted run. If many shards still fail, cut shard-heavy specs rather than loosen assertions.
2. **Land stranded Codex worktrees (Haiku gates, Claude review):** 1060 (Journal/Debrief polish), 1070, 1080 (Challenger/Endurance opening plus Beebe framing/smokers) have uncommitted work after the Codex floor stopped them. Run gates, review shots, merge or send back.
3. (MERGED 2026-10-09 08:xx, modest gain: teal depth grade, thicker pendants; ledge roughness and riser still geometric) **Blue Hole bowl atmosphere (Sonnet):** gallery is good; bowl and apron still read as one beige smooth-shaded dune with a hard shelf line (great-blue-hole-2). Needs depth haze/colour grading toward blue at the bottom, per-ledge texture or normal variation, and stalactite thickness/irregularity. Biggest "beautiful" gap in the set (2.5-3).
4. **Lost City tower (Sonnet):** close-up (lost-city-2) is stacked plates with grey blotchy albedo and pale saucer flanges; needs carbonate flow texture, irregular profile, mineral colour variation, a visible orifice. Review 1050 landed fingers; the tower trunk itself is unchanged.
5. (MERGED 2026-10-09 09:xx: dark angular rocks, feathered apron; a few pale biome rocks remain) **Beebe chimney and boulders (Sonnet):** chimney trunk now has some ridge variation but boulders are pale smooth eggs and the sand disc ring is still a clean ellipse. Replace boulders with rock mesh, feather the disc edge.
6. (MERGED 2026-10-09: varied beds, overhangs, per-bed colour) **Monterey strata regularity (Sonnet):** corrugated stripes repeat; vary thickness, add slumps and overhangs. Sub is clear of the wall now (merged f41).
7. **First-minute playthrough check (Haiku capture, Sonnet judge):** after 1060 merges: Home -> site -> 60 s -> Journal -> debrief on desktop and phone.

Codex queue: 1090 (bug hunt f38-f41), 1100 (Low-tier recheck), 1110 (audio fact check). Refill after the 1060/1070/1080 stalls are resolved.

## Previous priorities (2026-10-09 early comprehensive review; golden 2026-10-09-045527)

Claude backlog (ordered by player impact; all unblocked; Sonnet for visual, Haiku for small):

1. (PASS 3 MERGED 2026-10-09: apron vertex-colour variance, moderate gain; further gain needs atmosphere/haze or a dedicated texture) **Blue Hole bowl (Sonnet):** gallery fine; bowl is still a smooth beige dune with a hard horizon ring and flat-cone stalactites. Real ledge geometry, darker lower walls, softened ring, tapered irregular stalactites (1030 may cover part; review it first).
2. **Lost City tower read (Sonnet):** close-up is ledged but still stacked plates with blotchy albedo; irregular carbonate fingers with flow texture (1050 verifies; fix what it finds).
3. **Beebe chimney detail (Sonnet; Codex 1080 has a first pass, review it):** smooth fluted trunk needs crust/flange variation and a visible orifice; boulders are flat pale blobs.
4. **Hosted CI green (Haiku to triage 1070 output):** f37 run had e2e shards 3/6/24 red; f38 run pending. Never loosen assertions.
5. **First-minute playthrough check (Haiku capture, Sonnet judge):** Home -> site -> 60 s -> Journal -> debrief on desktop and phone after 1060 merges.
6. **Titanic haze band and Monterey spawn overlap (Sonnet):** flat haze above seabed; sub overlaps the wall at Monterey spawn.

Codex queue: 1040, 1050, 1060, 1070, 1080 (1020/1030/1000 running or merging). Refill from next golden.

## Previous priorities (2026-10-08 evening review; golden 2026-10-08-202656)

Claude backlog (ordered by player impact; all unblocked; Sonnet for visual, Haiku for small):

1. (PARTLY DONE 2026-10-08 16:xx: horizon fade, darker strata, sponges merged; bowl wall geometry still smooth/albedo-only, needs real ledge geometry) **Blue Hole bowl and horizon (Sonnet):** gallery is right after 910, but the bowl is a smooth beige dune with a hard horizon ring; add strata/ledges, darker lower walls, softened horizon, real sponge/fish silhouettes. Compare GOLDEN_SITES=great-blue-hole.
2. (PARTLY DONE: irregular fingers merged; fingers still tubular with flat tops, wide shot still tiered spire; not checked on Low/phone) **Lost City beehive/slab (Sonnet):** towers still stacked cones with saucer flanges; give irregular carbonate fingers and flow texture, close-up view first (lost-city-2.png).
3. **Review 940/960/970 when they land:** 940 must put Blue Hole's hole/gallery and Monterey's wall on the default mission path; 960 must show phone 60 s with sub, seabed and one target; 970 must turn CI green (cut shard-heavy specs, never loosen assertions).
4. (DONE 2026-10-08 evening, merged) **Beebe sand-disc edge and chimneys (Sonnet):** feather the lit disc into the seabed and add chimney detail (930 if Codex has not done it).
5. **Low-tier and real-phone pass (Haiku to run, Sonnet to judge):** capture all 13 sites on Low tier at 390x844 and 844x390; log defects.
6. Queue state: Codex has 940, 950, 960, 970, 980 queued. Refill with Challenger Deep/Endurance fixes and the next fidelity rollout after the next golden set.

Demoted: further title polish; rebrand logo (done); per-site tweaks that don't change the silhouette or material read.

## Previous priorities (morning review 2026-10-08)

(older list follows)

Run `tools/golden.sh` at the start of any run that merged visual work (`GOLDEN_SITES=great-blue-hole GOLDEN_LAYOUTS=desktop` for a single site). Claude weekly budget reset on 2026-10-08 (100%), so Claude can build again, but Sonnet agents still own only visual-heavy packages; Codex builds the rest.

Claude backlog (ordered by player impact; all unblocked):

0. **Joint review 2026-10-08 (REVIEWS.md):** ~65%, ~3 weeks to 1.0. Agreed blocker order: first five minutes (890/900 + a real capture), default missions reach the hero scenery (940), Blue Hole fidelity first (910/875), green CI (920/880), all-13-site + real-phone Low-tier coverage. Honest beautiful: Titanic 3.5, Beebe 3, Blue Hole 2, Lost City 3, Monterey 3. Small, well-scoped Claude tasks go to Haiku 5.5 (RESUME-PROMPT §2).

1. **Phone first-minute clutter (review + rework if Codex 890 falls short):** at 60 s on 390x844 the scene is ~25% of the screen; the same scan target is shown three times; tutorial card covers the sub. Review 890's before/after at 390x844 and 844x390 and send back until the sub, the seabed and one target indicator dominate.
2. **Briefing wall of text (review 900):** 4 facts + 5 hazards + 3 buttons before the first dive; the default view must fit a phone without scrolling and have one filled button.
3. **Blue Hole wall relief redo (review 910):** 830 was reverted: patchwork sand blobs and a shrunken gallery. Accept only if the gallery stays as large as in golden 132858 and no hard-edged patches remain.
4. **Fidelity rollout (review 870, then Lost City beehive/slab and Titanic hull detail):** Monterey's 810 terrain read much smoother and more natural in golden 132228 (+1). Roll the same profile to Blue Hole and Lost City, then decide on Beebe/Titanic from the result.
5. (850/860 MERGED 2026-10-08; Beebe first frame good, close-up sand-disc edge queued as 930; re-check Monterey in next golden after the carve fix) **Beebe and Monterey first frame:** Beebe seabed beyond the lit pool and an odd near-vertical sub pose; Monterey still dark and teal-monochrome with few animals. Redo in Claude if Codex output is flat.
6. (DONE 2026-10-08) **Debrief wording and actions:** "Dive ended / Primary objectives unfinished" after a successful scan reads like failure, and the end card offers five actions (two buttons, three links). One primary action, a warmer line for partial dives.
7. (DONE 2026-10-08) **Journal list:** "Unscanned target 2..7" rows are dead space; collapse them to a single "7 more to find" row.
8. **Hosted CI:** run on f30 push; if still red after 880's verification, cut shard-heavy specs rather than loosen assertions.

Codex queue: 850 Beebe, 860 Monterey first frame, 870 fidelity rollout, 880 f30 bug hunt, 890 phone HUD, 900 briefing, 910 Blue Hole redo. Next candidates: Challenger Deep/Endurance golden pass, Journal list collapse and debrief wording (items 6-7), a regression bug hunt after 890/900.

Demoted: further title polish; rebrand logo (done).

## Director note 2026-10-06 (calibration)

Looking at golden set 2026-10-06-121603 directly: recent review scores were too generous. Against the owner's ask ("realistic, detailed, similar to real life") the sites are readable and coherent but still read as a stylised prototype: faceted low-poly terrain (Monterey, Blue Hole walls), the Lost City close-up still blurry and stretched (710 finished with NO changes and was silently dropped; reopen it), and the Blue Hole gallery overhang still reads as a dark dome. Honest "beautiful" scores: Titanic 4, Beebe 3, Blue Hole 3, Lost City 3, Monterey 2-3. The step change is not more per-site tweaks: it is (1) denser terrain meshes with smooth normals, (2) CC0 PBR rock/sediment textures with triplanar mapping (F1-TERRAIN planned this; check what actually shipped), (3) higher-detail hero props. Plan this as one "fidelity pass" package set after the Claude weekly reset (2026-10-08): Claude designs and reviews, Codex builds per site.

## Review rubric (every package, before merge)

- **Readable in the first 10 s:** you can see the sub, the seabed and something interesting.
- **Beautiful:** looks like a documentary still, not a prototype.
- **Simple:** a new player understands what to do without reading much.
- **Rewarding:** there's something to find, and it feels good to find it.
- **Honest:** real sites are factual and additions are tagged once.
- **Phone-OK:** a touch layout with no overlaps, and the low tier still looks good.

If it fails, send it back to the same agent or Codex session with concrete feedback (what's wrong, which screenshot, what good looks like). Don't merge and fix later.

## Golden screenshots

`tools/golden-shots.mjs` (to be written) captures the 5 hero sites at fixed poses into `.cache/golden/<date>/`. Compare the newest set with the previous one every night. A merge must not make them worse.

## Needs owner

(The newest items go first. Codex resets: assume the owner will use them, but list here when Codex is blocked.)

(none)

- 2026-10-09: low/portrait golden 034952 captured; Challenger opening and Blue Hole horizon issues queued as 1020/1030/1040.
