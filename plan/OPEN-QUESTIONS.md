# Open questions for the project owner

Each question lists the default the plan assumes. Answer only where you disagree; unanswered = default. Questions marked ⚠ change the scaffold or data pipeline and are cheapest to answer before Phase A starts.

> **Answered 2026-09-16.** See `plan/DECISIONS.md` for the owner's answers; all unlisted items use the defaults below.

## A. Direction & scope

1. ⚠ **Engine.** Default: browser game, Three.js + TypeScript (agents can build, test and screenshot it headlessly; shareable by URL; no licences). Alternatives: Godot 4 (better built-in physics/lighting, agents can still work on text scenes but cannot easily _see_ it), Unity/Unreal (best visuals, worst agent ergonomics, licence terms). Do you want to stay on the web?
2. **Tone.** Default: serene, educational exploration with mild pressure/darkness tension. Alternative tones: survival (oxygen, battery, failure states), arcade (fast, score-driven), horror (thalassophobia-forward). Which, and how much tension is acceptable?
3. **Player fantasy.** Default: modern crewed research submersible (Alvin/Limiting Factor class) with a deployable ROV later. Alternatives: military sub, fictional near-future sub, ROV-only (more realistic for wrecks).
4. **Audience.** Default: adults and teens interested in the ocean; usable in a classroom. Does it need to be strictly kid-safe (affects wreck content such as Titanic, USS Indianapolis)?
5. **Session length.** Default: 10–20 minute missions. Longer open-world sessions?
6. **Multiplayer.** Default: none. Any interest in co-op or spectating (it changes architecture early)?

## B. Realism vs. fun

7. **Sub speed.** Default: 2–3× real speed with a visible "simulation speed" setting; real research subs cruise ~1–2 knots, which is slow across a 20 km tile. Or offer a time-compression control instead?
8. **Fabrication policy.** Terrain data cannot show a 269 m wreck. Default: place a 3D wreck prop at the real coordinates and orientation and label it "artist's reconstruction" in the field guide. Alternative: only ever show real data (no props), relying on sonar contacts and text.
9. **Marine life.** Default: species lists per landmark from OBIS, but _placement and behaviour are invented_, disclosed in the field guide. OK?
10. **Hazards & failure.** Default: exceeding crush depth triggers emergency ascent and mission restart; collisions cost hull integrity but never kill. Do you want any permanent failure state?
11. **Sensitive sites.** Titanic, USS Indianapolis, Endurance, Bismarck are war graves or memorial sites. Default: include them respectfully with a memorial note and no "loot" mechanics. Any you'd rather exclude?

## C. Data

12. ⚠ **Terrain resolution vs. size.** Default: one tile per landmark, 500–1,500 cells per side (~2–8 MB each), fetched offline and committed to the repo. Alternatives: fewer/larger tiles, or a streaming server (needs hosting). Repo size cap you're comfortable with (default 200 MB, then Git LFS)?
13. **Live "dive anywhere" mode** (type coordinates, fetch from GMRT at runtime). It requires either a CORS-friendly source or a tiny proxy server. Default: Tier 4 stretch. Want it earlier?
14. **Which landmarks for Tier 2?** The catalog agent proposes 50–70; the plan picks 8–12 for the world tour. Do you have must-haves (personal favourites, a region you care about)?
15. **Data licences.** GMRT and GEBCO require attribution; some site surveys are non-commercial only. Default: attribution-only sources unless you say the game will never be commercial. Is commercial use possible in the future?

## D. Assets & art

16. **Art style.** Default: realistic-leaning low-fantasy: real colours, PBR materials, restrained post-processing. Alternatives: stylised low-poly (cheaper, ages well, hides coarse data), painterly. Any references you love?
17. **Asset budget.** Default: CC0/CC-BY only, zero paid assets. Would you buy a few assets (a good submarine GLB is ~$20–60) if it saves agent hours?
18. **Music.** Default: ambient generative/drone via WebAudio, no licensed tracks. Do you want composed music (CC-BY from e.g. Kevin MacLeod, or commissioned)?
19. **Voice.** Default: text only. Any narration?

## E. Delivery & process

20. **Hosting & visibility.** Default: GitHub repo (public?) + GitHub Pages. Do you have a domain or preferred host?
21. **Licence for the code.** Default MIT; content CC-BY-SA 4.0. OK?
22. **Name.** Working title "Submarine Explorer", folder `~/submarine-explorer`. Any preferred name (it affects the repo and package names, so decide before Phase C deployment)?
23. **Model budget.** Default mapping in the master plan: Opus for rendering/physics/architecture (A1–A3, B1, B4, C1, C3), Sonnet for everything else. Roughly how many agent sessions per week can you afford? This decides how much of Phase A runs in parallel.
24. **Review cadence.** Default: you review screenshots and play the build at the end of each phase; agents do not wait for you within a phase. Do you want a hands-on gate earlier (for example after A2 to approve the look)?
25. **Your role.** Will you write any content (field-guide prose, landmark picks) yourself, or is it all agent-produced with your review?

## F. Things I could not verify in this pass and would like you to confirm or provide

26. Whether you have a GPU-capable machine to playtest at 60 fps (Apple Silicon? Intel iGPU?). The performance budget assumes an M-series Mac.
27. Whether you already own any assets, sub models, or reference material (books, papers, dive footage) that should shape the art direction.
28. Whether the finished game may be used in a classroom or published publicly; that decides how strict to be on fact-checking and licensing from the start.
