# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (targeted review 2026-10-09 14:30; golden 2026-10-09-191533)

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
