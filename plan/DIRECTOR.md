# Director's brief (living document; Claude owns it)

The owner treats this as a curiosity project about how far current models and workflows can go. Claude acts as creative director: it holds the vision, reviews every package and sends work back until it is good. Most plan "rules" are Claude's own recommendations, so revise them freely and record why here.

## Current priorities (refreshed 2026-10-08 comprehensive review; golden sets 2026-10-08-122501 and -132228)

Run `tools/golden.sh` at the start of any run that merged visual work (`GOLDEN_SITES=great-blue-hole GOLDEN_LAYOUTS=desktop` for a single site). Claude weekly budget reset on 2026-10-08 (100%), so Claude can build again, but Sonnet agents still own only visual-heavy packages; Codex builds the rest.

Claude backlog (ordered by player impact; all unblocked):

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
