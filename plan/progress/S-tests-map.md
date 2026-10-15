# S-tests step 1: assertion-level e2e coverage map

Analysis of **eb8dd33** (2026-10-12). Deliverable only: this report. No test, application, gate or workflow edits; no builds, browser sessions or e2e execution. Source, Playwright `--list --reporter=json`, `tools/e2e-timings.json`, `git log --follow`, targeted `git log -S`, and local progress notes supplied the evidence. The requested `BROWSER=0` is respected. `ROUNDS=1` describes this analysis pass; the inventory records the suite's shipped defaults, including the two-round 720 and three-round 1060 loops, and explicitly gives capture formulas for a one-round invocation.

## Findings and how to use the map

There are **95 entry specs, 806 expanded test selections**. File counts alone hide the 78-case all-site HUD sweep. With default flags, root local execution has **757 active cases**; root hosted execution has **720**, plus **8 project-base cases** in the separate job. This comes from 22 declaration-time skips (8 project-base and 14 visual QA), 27 further common body-time skips (26 first-minute audits and the reverted Blue Hole relief test), and 37 additional hosted body-time skips (32 chase/idle cases, four High first-minute cases, one Home/restart case). Playwright listing does **not** reveal the body-time skips. They must not be mistaken for executed hosted coverage.

Each expanded test has its own line below: title, assertions/contract, weight, captures, provenance and disposition. The adjacent **contracts** contain every explicit matcher with original thresholds, conditional branches, iteration variables, helper assertions, failure throws, navigation and readiness predicates. These are assertion excerpts, not a recommendation to copy setup wholesale. Use the expanded title to bind site/tier/viewport variables; the row controls and constants give the remaining data. Several tests perform multiple states/viewports in one body: these are sequences, not independent screenshots.

Weights are **historical hosted seconds including completed retry attempts**, not a clean serial measurement and not screenshots' isolated cost. The timing file averages multiple reports for a case, retains conservative timeout costs and older estimates for skips/unexecuted cases, and uses file fallbacks or **45 s** otherwise. `M` means exact current timing-key match; `F` means fallback. **255 of 806 keys lack an exact match; 89 timing keys are stale**. Do not assign an old similarly named test's cost to a renamed case. Shared `helpers/titleAudit.ts` cases deliberately use their helper source in timing keys; they execute under two entry files and different bases.

Capture notation is **P/L/I**: page viewport screenshots / locator crops / actual in-game photo captures per successful attempt. There are **zero `fullPage:true` calls**: “full-page” in older prose generally means whole viewport. Counts include repeated calls that overwrite a filename; file copies, JSON probes, HTML contact sheets and attachment references are not extra captures. Retry repeats the attempt's captures; trace capture is not counted. Opt-in/skipped tests take zero by default; their enabled counts remain listed. Golden subprocess images are counted separately where relevant.

Provenance: **R** = a concrete past defect identified (scope described per spec/contract), **F** = feature contract with no historical defect established, **U** = audit/verification coverage whose exact bug attribution is uncertain. A fix commit in a file's history is not proof that every assertion in that file failed before it. All three classes stay covered. The separate uncertainty register records unresolved attribution and apparent duplicates.

## Step 2: the three capability specs

Use `hud-touch.spec.ts`, `opening-framing.spec.ts`, `journal-debrief.spec.ts`. These are proposed survivor filenames, not files created in this step. The **29-source roster** below is concrete; the approximate 9/12/8 numbers are not permission to trim other mixed-capability specs. Each source contract below is the full assertion list for its row. A row's kept list is the **union of all attached contracts, helper contracts and explicit throws/readiness predicates**. Never take only their intersection. Guards unrelated to the row become their own row in the same capability file or remain in their current capability file.

Row identity must include viewport, touch/mobile/DPR, deployment base, route (`tile` versus `mission` versus `_test`/`poi`), site, tier, mode, UI scale, fresh/experienced save, guidance/contact state and settle policy. `390×844 Titanic` alone is not a safe deduplication key. Preserve real input and loading checks. Reuse `helpers/clock.ts`, `helpers/scan.ts`, `helpers/phoneHud.ts`, `helpers/journal.ts` and `helpers/hudTips.ts`; `helpers/unlocked.ts` seeds 900 lifetime RP, a completed tutorial and seen hints, so it is inappropriate for fresh onboarding rows.

The row groups are enumerated below. The inventory's expanded titles are the exact members of each product; its source-contract references (`filename:Lline`, matched to the numbered A-contracts below) name the complete kept assertions, including their original numeric bounds. Thus the grouped tables and the expanded roster together specify every row without reopening all the source specs. Optional capture evidence should be attached once after a settled state; assertions still run at every existing state.

### HUD/touch: 9 source specs

Fold `f-hud-layout`, `f-touch-audit`, `f-touch-stack`, `f-bughunt-15`, `f-bughunt-4`, `f-monterey-portrait-hud`, `f-toast-placement`, `f-bughunt-hud-touch-overlap-1390`, `f-touch-controls-1392` (all `.spec.ts`). Keep the control-function coverage in `f1-touch` and tutorial-action coverage in `f3-onboard`; neither is replaced by bounds checks.

| Row group: viewport × site × state                                                                                                                                                                                                                               | Kept assertions and source contracts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1: `_test` Titanic bow contact; 1600×900 keyboard, 1280×720 keyboard, 844×390 touch, 1024×768 touch; fresh tutorial, all five steps                                                                                                                             | `f-hud-layout:L65`: onboard/scan visible; every required box positive, on screen and pairwise separate, desktop tips/reset versus touch stick/slider/buttons/pause; touch tips hidden; Skip hit area ≥44×44; exact move→depth→lights→scan→journal. Do not replace `.tc-buttons` wrapper bounds with only individual buttons.                                                                                                                                                                                                                                                                                                                                                                                    |
| H2: `_test` Titanic contact; 360×640 and 667×375 at 80/100/150%; 390×844 and 844×390 at 150%; fresh tutorial → long reward → expanded sonar → collapse                                                                                                           | `f-touch-audit:L102` plus `expectCompactPhoneHud`: each individual control separate, ≥44px and centre hit-testable; one Skip; sonar 96px portrait/120px landscape; two-line unclipped tutorial clears projected sub; depth/speed ≤1px and status/hull ≤3px alignment; second row below first; five steps; active scan suppresses duplicate edge/objective guidance, dim approach retains its edge; long unbroken reward fits; expanded zoom controls reachable. H1's normal-scale states are additional rows, not substitutes for 150%.                                                                                                                                                                         |
| H3: Monterey mission at 1280×720 keyboard, 844×390 touch (100%); at 360×640,390×844,667×375,844×390 touch (150%); fresh                                                                                                                                          | `f-hud-layout:L103` + `f-touch-audit:L194`: onboard/objectives/readouts and controls remain visible, fit and do not intersect; readouts do not horizontally scroll. Attach both contracts only when scale and route match.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| H4: Monterey free dive and mission, 390×844 touch, normal scale; tutorial off/on                                                                                                                                                                                 | `f-monterey-portrait-hud:L90,L96`: sonar/readouts required, **all visible** HUD/footer/scan-stack/warning/reward/control wrappers fit and are separate; none covers projected submarine centre; centre >40px from each viewport edge. This whole projected-sub guard is additional to H3's rectangle guard.                                                                                                                                                                                                                                                                                                                                                                                                     |
| H5: 360×640 × Titanic/Beebe; 390×844 × Lost City/Monterey/Beebe; 844×390 × Blue Hole/Beebe; 100%, plus Beebe 150% at all three                                                                                                                                   | `f-bughunt-15:L92`: Arcade and scale pins; opening, all five in-range tutorial steps, then contextual-hint state. Full HUD bounds/strict selector uniqueness/nonoverlap; one scan hint; no desktop prompt/portrait rotation hint; retired scan-target hint is neither shown nor marked seen. Combine the **three phases into one row sequence**, retaining measurements at every step.                                                                                                                                                                                                                                                                                                                          |
| H6: all 13 catalog sites × {844×390,667×375,390×844,1024×768,1280×720 touch;1280×720 keyboard}, low tier, normal scale, fresh                                                                                                                                    | `f-bughunt-hud-touch-overlap-1390:L143`: opening → real early scan/reward → move/depth/lights → collapsed journal → away/contact chip → tutorial complete → return contact → reload. At every phase, the full selector list fits and has zero pairwise intersections (including reward, Boost and Journal). Early scan does not skip movement, is remembered so scan step is skipped later; reward visible; touch chip ≤28px, keyboard chip hidden; card/chip mutually exclusive; saved `tutorialDone` survives reload. Preserve all 78 data rows; no evidence permits cutting non-hero sites. Merge H3's same-size/mode/scale states into these rows only after adding wrapper/required-visibility assertions. |
| H7: Titanic fixture tutorial-final and real Titanic mission out-of-range; 844×390,667×375,932×430 touch, normal scale                                                                                                                                            | `f-touch-stack:L22,L43`: five steps; final tutorial ≤56px; card/scan bottom < half viewport +20px; no-contact chip visible with ▸, ≤28px, zero intersections with every named control/sonar/readout/objective. H6 does not cover 932×430 or the half-height bound.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| H8: Blue Hole/Monterey free dive at 390×844 touch; Daily mission at same size; Blue Hole controls at 320×568/100%,390×844/150%                                                                                                                                   | `f-bughunt-4:L26,L33,L58`: sonar clears readouts/pause and Daily objectives; Daily Begin exits briefing and a real tap restores touch modality; stick/Boost/button-group/slider separation; wrappers in viewport; every group button ≥44×44. Keep 320×568.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| H9: animal target + contextual toast + long reward + absent target: Blue Hole1600×900 keyboard/100%; Monterey1280×720 keyboard/100%; Blue Hole390×844 touch/100,150%; Monterey360×640 touch/100,150%; Monterey844×390 touch/100% and Blue Hole844×390 touch/150% | `f-toast-placement:L94`: actual spawned creature and nonzero targets; no retired scan hint; animal cue uses device copy; tutorial dismissed; all named boxes visible, positive, unclipped, on screen and separate; toast exactly 8px below scan panel, same width/centre (desktop centred in viewport), same after wrapping; absent scan panel leaves cue safe; dismiss target ≥44×44, receives tap, hides cue.                                                                                                                                                                                                                                                                                                 |
| H10: Titanic control action rows at 390×844,844×390,667×375,1024×768 touch and1280×720 keyboard; normal scale                                                                                                                                                    | `f-touch-controls-1392:L78`: every button gets its own bounds/hit target, touch buttons ≥48×48; dock beside slider on portrait (8–20px gap, within slider height), above slider on landscape/tablet (8–16px gap, x within1px); Journal action/title; Boost false→true/active/input→false; Journal/Pause clear latch; key Shift still holds/releases boost. Add `:L159,L178` at the spec's own viewport for meter depletion/recovery (requires new tap), hidden-page and end-of-dive clear latch.                                                                                                                                                                                                                |
| H11: 1280×720 keyboard, normal scale; learned/expired tips                                                                                                                                                                                                       | `f-hud-layout:L140,L178`: first move hides strip without falsely setting learned; all controls mark learned later; guide reachable from Pause; deadline hides strip without learning. These are save/temporal guards, not layout duplicates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| H12: 390×844 and 667×375 touch, 150%; Home/Daily/settings/Journal journeys                                                                                                                                                                                       | `f-touch-audit:L235,L303`: full menu ordering, hidden→visible→hidden globe, Back restores focus, Advanced selects and mode radios hit-testable, Custom tag and Daily launch, briefing Begin/Free dive reachable; catalog count, spoilers switch, first/last site and entries reachable, phone sheet title/back/Contents/Close and unclipped header. Move the Journal journey's assertions to the Journal capability if preferred; do not delete it when retiring the HUD source.                                                                                                                                                                                                                                |

H5 is a genuine boot-reuse opportunity (30 cases →10 sequences). H6 is already a comprehensive sequence and offers capture reduction, not a justified 78→5 matrix cut. Additional states from H1–H12 survive even when they lack matching H6 rows.

### Opening framing: 12 source specs

Fold `f-beebe-framing-680`, `f-challenger-opening`, `f-lostcity-readable`, `f-mission-940`, `f-verify-610`, `f-verify-650`, `f-verify-920`, `f-verify-hull-lostcity-1290`, `f-visual-fixes`, `f-verify-530`, `f-horizon-1190`, `f-verify-520`.

| Row group: viewport × site × state                                                                                          | Full kept assertion list/contract                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1: Beebe free opening, 1600×900 High;390×844 High/Low; at 0 and **real 10s**                                               | `f-beebe-framing-680:L21`: chase mode; zero failed props; mineral apron/talus objects exist; actual vent tip x<−0.1, abs(x/y)<0.9; zero page errors. Keep both timestamps.                                                                                                                                                                                                                                                 |
| O2: Challenger/Endurance/Hunga/Axial,390×844 Low touch; fresh starting depth, grace expiry                                  | `f-challenger-opening:L28`: pitch/roll zero; projected visible hull bounds left>12,right<378,top>211,bottom<844×.79; near/far inside(−1,1); hero x in(12,378),z in(−1,1), hero horizontally >12px clear of hull; hull NDC x≈0; scan visible; near-hull cue hidden through the starting-depth grace and not recorded seen.                                                                                                  |
| O3: Lost City mission and tile free-dive,1280×800,{Low,Medium,High}; Arcade; plus Realistic free-dive                       | `f-lostcity-readable:L30,L140`: correct route-specific pose; **mission** first-primary range≈220 and >scan radius, classic arm hypot(38,90); **tile** tower range>30≤40 and arm66, local camera axes match authored offset/terrain adjustment; hero abs(x/y)<.9,z∈(−1,1); altitude≥22, fill16,ambient≥16,floor proxies>2.5, lamps off. Realistic range42–46 and classic arm. Do not impose tile arm66 on mission approach. |
| O4: five heroes × Low/Medium/High,1280×800 keyboard; free dive versus mission preview→Begin                                 | `f-mission-940:L59`: free dive has no mission primary; both no failed props; correct first primary/objective id; mission range equals **MISSION_APPROACH_M** (Titanic220,Lost City220,Blue Hole220,Beebe220,Monterey240), >scan range and ≤300; free-versus-mission displacement>60; objective range equals first-primary range; “Head to” title; preview position/yaw exactly equals Begin; no errors.                    |
| O5: five heroes,390×844 Low touch; **live, unmodified opening after real 3s**                                               | `f-verify-610:L77`: mode Arcade/tierLow/chase/touch/viewport pins; all hull geometry visible, positive projected size; failed/skipped props0,draws>0; hull near/far inside(−1,1); required sonar/readouts/stick/slider/buttons/pause present; hull+every visible HUD box in viewport; no hull/HUD or HUD/HUD intersection. Do not freeze physics or use only the hull centre here.                                         |
| O6: Titanic/Beebe/Monterey × Low/Medium × {1600×900,844×390,360×640}; experienced free dive frozen after textures+frames    | `f-verify-650:L79`: visible canvas; exact tier,draws>0,triangles>10k; optional Monterey baseline calls/triangles do not increase; Titanic snow count300/1200,visible,opacity.24,maxSize3,density>0; Beebe actual vertex-projected hull on screen and clear of reticle; Monterey boulders0/384,none buried. Baseline rows remain opt-in via F650_BASELINE_URL.                                                              |
| O7: Blue Hole/Monterey × Low/Medium/High,1280×800; opening and centre sample                                                | `f-verify-920:L17`: mesh raycast finite; collision-vs-mesh height<.002m; HUD depth equals sub y; altitude-vs-mesh<.002m; camera clearance≥5.998; central source-survey delta<.1; rendered central delta<5m Monterey/<2m others; no errors. Numeric mesh/physics agreement stays ordinary.                                                                                                                                  |
| O8: Endurance/Lost City × Low/High × {1600×900,390×844,844×390}; free opening                                               | `f-verify-hull-lostcity-1290:L36`: failed props0; arm70/66; eye clearance≥6−1e−8; all nine near-plane samples above terrain; Low draws>0≤1500,tris>10k≤1.5m; Lost City **highest solid vertex** inside screen/depth and ≥8px clear of **visible** scan card; no errors. Do not substitute prop origin/bounds for the actual tip.                                                                                           |
| O9: all13 sites,1280×720; experienced free opening; extra detail at Blue Hole,Hunga,Titanic,Lost City,Endurance,Beebe,Blake | `f-visual-fixes:L76` + `assertUnderwater`: opening facing>.98, no hull prop collision; submerged sub, chase camera y≤−2+1e−6 and ≥terrain+configured clearance−1e−6; safe 40/15m approach exists for detail sites; recheck chase before cockpit poses; no errors. Titanic additional Realistic detail capture supplies evidence, not a numeric exposure guard.                                                             |
| O10: Titanic tile and mission × Low/Medium/High,1280×800; settled first-frame lighting                                      | `f-verify-530:L24`: fill/ambient≥24; all floor proxies≥.1; snow300/1200/3000, visible; opacity/density/foregroundAlpha>0,maxSize3. Full list applies to both routes; keep the snow-material guard after merging O6's common count/maxSize predicates.                                                                                                                                                                      |
| O11: Titanic/Endurance × Low/High × {1600×900,390×844}; frozen free opening pixel readback                                  | `f-horizon-1190:L22`: horizon visible,561vertices; exact tier/canvas dimensions; failed props0; Low no wreckHaze; central scene ROI mean max-channel brightness>10 excluding HUD; no errors. The pixel readback assertion requires a capture or equivalent rendered readback in ordinary gates.                                                                                                                            |
| O12: Lost City/Beebe,844×390 Low touch; 30 settled rendered frames, textures/life ready                                     | `f-verify-520:L42`: Arcade/Low; failed/skipped props0,full>0; ambient≥12/6; nine floor proxies≥2.5/.1; draws>0≤1500,tris>10k≤1.5m; hero exists; no errors. Common counters may share O8/O6 only at the same tier/pose and after all original samples.                                                                                                                                                                      |

Use separate state phases for live three-second, real-ten-second, frozen 30-frame, mission preview and free-dive tests; matching viewport/site does not make their measurements interchangeable. Leave `f-bughunt-18` in camera capability: it guards zoom clamps, X/button/double-click, orbit freeze/return and mode/surface radius changes; O3 does not replace it. Leave `d-start`, `d2-predive`, `f-arcade-access`, `f-verify-1000`, `f-bughunt-1090`, `f-endurance-1180`, and `f-lowtier-followups` intact except for exact shared assertions whose survivor is explicitly recorded below.

### Journal/debrief: 8 source specs

Fold `d-flow`, `discovery`, `f-debrief-720`, `f-debrief-zero-1160`, `f-journal-debrief-1060`, `f-journal-photo-1370`, `f-flow-audit-510`, `f-verify-740`. The last source is mixed: its six Blue Hole surface/HUD rows go into the HUD capability; its two all-site provenance rows go into Journal. Photo focus is a separate state family in the Journal capability, not disposable image evidence. Keep `d-photo` storage/download/quota coverage separately.

| Row group: viewport × site × state                                                                                                           | Full kept assertion list/contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J1: {1600×900,390×844,844×390} × five heroes; fresh mission, zero scan→one scan, Journal and re-surface                                      | `f-debrief-720:L57` with `contained`: modeArcade; discoveries0/1; debrief/Journal panel/header/body positive/visible and fit (horizontal overflow≤1px); exactly one primary, zero-scan Keep exploring versus nonzero Dive sites; appropriate quiet link; highlight/next each1; research points; no empty samples; unscanned locked entry; one honesty note on front only; one Recreation tag in article; mobile tree hidden, body>half height, Back to site entries focuses body; Close restores Journal opener; resume/debrief exits return site picker/menu; no errors.                                                                                                                                                                                                                                                                       |
| J2: {1600×900,390×844} × five heroes; same zero→one scan cycle, **three shipped rounds**                                                     | Union `f-journal-debrief-1060:L41` + J1 matching rows: debrief vertical overflow≤1px, one score, exact warm/scanned-name highlight, no old stats/lists/subtitle; **desktop** one expanded site, POIs open with more-to-find and no unscanned named targets, wildlife closed; Enter/Space category toggles retain focus, collapsing site restores rebuilt focus, Tab skips closed content, Shift+Tab returns, toggling spoilers does not open closed groups, expanded-site selection returns overview without collapsing; **phone** no tree, site page category/article/back; wildlife+secret exactly one Game addition tag; Journal axe zero violations; Close focus and resume each round. Keep max(720,1060) default rounds for overlapping rows; landscape keeps its own 720 sequence. Do not implement ROUNDS=1 as the new shipped default. |
| J3: {1280×720,390×844} × Titanic/Beebe/Blue Hole; zero/one scan→More→Journal→resume→re-surface→Escape→site-picker                            | `f-debrief-zero-1160:L52`: modeArcade; pause/objectives hidden under debrief; 0/1 count and exact named highlight; one primary and two quiet actions; More initially hidden/reset after rebuild; bounded panel/no scroll; state debrief/frozen, timers/pose/counts **unchanged during held W and Journal**; exact Tab+ShiftTab cycle including expanded Dive again/Home; Journal owns focus and Close restores opener; resume restores previous state/pose/counts and clears duration/freeze; timers and native motion advance after resume; scan record exactly target; Escape resumes; menu exit works; no errors. Distinct viewport1280 row survives even if 1600 is consolidated.                                                                                                                                                           |
| J4:1280×800 Titanic `_test` bow; first scan→repeat hold→reload→Journal; direct `?debrief=1`                                                  | `discovery:L68,L180`: scan events/progress and recorder (see full contract); same-dive completion count stays1 after hold; stored timestamp/count persists; fresh reload permits repeat scan and count2; authored title/paras/caption/recreation, no locked caveat, Journal hides on exit; direct hook opens named debrief; no errors. Keep real keyboard hold and the helper's input/frozen checks.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| J5:1280×800 Titanic mission; two primaries→Keep exploring→optional→surface; partial→Home→Dive again; Home Journal spoilers/reload            | `d-flow:L161,L294,L365`: exact event order/payloads and counts, primary banner title/detail/buttons, no premature debrief, optional progression, frozen pose, no-reload site-picker navigation; partial warm highlight/next/actions; fresh dive emits only started, clears objectives and increments dive log; Journal13 sites/count2/8, spoilers initially off, no named unscanned rows, recreation/source link/honesty rules, reload leaves save unchanged and logged bow retained. Keep existing hosted skip of the two-boot row until measured; consolidation must not silently enlarge hosted skip scope.                                                                                                                                                                                                                                  |
| J6:1600×900 Titanic/Blue Hole;844×390 Lost City/Beebe/Titanic/Blue Hole;390×844 Monterey/Titanic/Blue Hole; fresh end-to-end mission journey | `f-flow-audit-510:L190` + helpers: Home/site picker/briefing focus and action hit tests; real first tutorial actions; compact phone contract; ≥10s elapsed ordinary observation (30/60 optional); unscanned Journal contained/navigation; zero-scan debrief; Journal return focus and same-page resume; real assisted scan and exact unlocked entry/title/sources; nonzero summary; site-picker then Home; no errors. The roster/contract contains every intermediate selector/text assertion. Keep its unique full journey; move only redundant review captures.                                                                                                                                                                                                                                                                               |
| J7:{1600×900,844×390,390×844} × Titanic contact; **two photo-focus rounds**                                                                  | `f-journal-photo-1370:L21`: touch PHOTO/desktop P opens; hides HUD; native Capture saves; Done returns prior HUD focus **after** HUD visibility restored; Tab/ShiftTab wraps visible controls, Escape exits Photo without opening Pause and restores focus. Its prior-focus target is the current HUD Journal button, not the deleted credit chip. Keep two rounds regardless of the analysis pass's ROUNDS=1.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| J8:{1280×800 keyboard,390×844 touch} Home Journal × every13 sites × wildlife+secret                                                          | `f-verify-740:L237`: exact13 site cards; front honesty; one Game addition tag per staged wildlife/secret, rendered paragraph, no illustrative/reconstructed/recreation prose caveats, title no horizontal clipping, wildlife source URL; errors0. Contract loops all13 even though Playwright lists one test per viewport.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| HUD carry-over from eighth source: Blue Hole surface starts, {1280×800 keyboard,390×844 touch,844×390 touch} × Arcade/Realistic              | `f-verify-740:L75` + `auditSurface`: mode/start pins; y>−20 and≤−hull radius+1; required readouts/power/current appropriate to mode; every visible box fits, text unclipped, pairwise separate; tutorial Skip produces “Nice work.” (740 real regression); in-range scan visible and remains near surface; no errors. Preserve in HUD survivor as its own surface row family.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Do not remove `f-bughunt-880`'s two-reload/authored-content test, `f-bughunt-960`'s mode×tier×viewport/keyboard-device matrix, `f-verify-1000`'s exact13 top-level-site selector and 600-frame life checks, `f-content-fix`'s scientific facts, or `f-briefing-900`'s About-this-site facts. Common Journal visibility is only a fragment of those contracts.

## Confirmed overlap and survivor decisions

Only assertion-level duplication is established here. A same-selector check made at a different pose, scale, fresh/experienced state, viewport or base is marked partial, never justification for removing the whole test. The inventory assigns each source a disposition and preserves its unique contract.

| Current overlap                                                                                                                                                                                                                            | Survivor and retained differences                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `f-hud-layout` Monterey mission1280×720 keyboard and844×390 touch, normal scale, versus opening phase of the same mission rows in1390: `.onboard-card/.objectives-panel/.hud-readouts/.tc-stick/.tc-slider` bounds and pairwise separation | H6 in `hud-touch`. Add required presence, wrapper `.tc-buttons` and desktop tips from H3. Keep1390 reward/chip/reload sequence. Original probes' frame timing is different; run H3 checks at its own settled opening phase before declaring the source redundant.                             |
| `f-debrief-720` and1060 at1600×900/390×844, same five missions, zero/one scan: count, highlight/next cardinality, single primary, panel bounds, Journal visible, Close focus, Keep exploring resume                                        | J2 union in `journal-debrief`. Keep720 primary action identities/locked/front/recreation/mobile Back/body-height/exit;1060 keyboard disclosures/closed-focus/axe/Game addition and three-round repetition. **Landscape720 has no1060 counterpart.**                                           |
| `f-debrief-zero-1160` portrait390×844 Titanic/Beebe/Blue Hole versus720 and1060: zero/one scan copy/count, primary identity, fit, Journal Close focus                                                                                      | J3 sequence in `journal-debrief` includes union of J1/J2 matching phases. Snapshot/frozen-timer/native-motion/More/focus-cycle checks are unique and must all remain;1280×720 is unique.                                                                                                      |
| `f-verify-530` Titanic tile Low/Medium,1280×800, versus relevant650/other opening predicates: snow counts/maxSize                                                                                                                          | O10 survivor with O6 predicates at their **different** dimensions; this is partial, not an existing identical viewport match. No boot saving is credited for these different rows.                                                                                                            |
| `f-verify-hull-lostcity-1290` and `f-perf-budget`: Endurance/Lost City Low1600×900 opening, draw/tris limits and no failed props                                                                                                           | Keep limits in O8; keep `f-perf-budget` exact prop census, skipped0/full>0, dynres=false and renderer-counter equality. Their UI/freeze/settle policy differs: measure each original policy before removing a duplicate predicate; no whole-test deletion.                                    |
| `f-bughunt-4` Monterey free-dive390×844 vs `f-monterey-portrait-hud` free dive: sonar-readout/pause separation                                                                                                                             | H4 can absorb H8 pairwise visibility assertions at the ordinary-scale experienced free-dive row; preserve40px sub-centre margin, wrapper guards, and the320px/150%/Daily rows. `unlocked` versus fresh and explicit tutorial0 differ; an identical experienced/tut-off row is required first. |
| `f1-touch` normal iPhone landscape `_test` versus HUD fixture checks                                                                                                                                                                       | Keep `f1-touch` as input survivor. H1/H2 keep bounds. It tests actual drag/throttle/ballast reset, held scan, pause, modality and PWA; screenshots alone are not its guard.                                                                                                                   |
| `f-title-layout`, `f-title-scene`, `helpers/titleAudit` selector Back/Escape opener focus                                                                                                                                                  | `f-title-scene` can eventually own same1280×800 title/globe lifecycle; `titleAudit` owns root **and project-base** variants; keep `f-title-layout` copy/order/7-layout ≥48px/hit-test checks. No retirement proposed in step2.                                                                |
| `mission` primaries→surface and `d-flow` Titanic events/debrief                                                                                                                                                                            | J5 retains richer optional/event/no-reload sequence; keep `mission` native two-scan route, briefing freeze, crush-abort and current-camera invariance. Default viewport matches but fixtures and completed state differ; do not delete `mission`.                                             |
| `f-bughunt-880`,960,1000,`f-flow-audit-510`,`f-first-minute-620`: Journal/debrief visible or no errors                                                                                                                                     | Preserve each source's distinct scan, mode/tier, save, native journey or temporal guard. This is broad overlap, not same-state duplication.                                                                                                                                                   |

## Step 3: nightly captures, ordinary assertion survivors

Implementation status (2026-10-15): [2020-S-tests-step3.md](2020-S-tests-step3.md) records the current survivors, assertion audit, inventory and environment limits. The original contracts below remain historical source evidence.

Add scheduled and manual nightly runs (e.g. `schedule: cron: '0 8 * * *'`, `workflow_dispatch`, UTC). Use the same built artifact, owned preview and Chromium installer as gates; run `tools/golden.sh` for authored poses and archive contact sheets, manifests, diagnostics and failure reports with the tested SHA. Existing `golden.sh` always rebuilds and starts a preview: step4 needs an explicit validated prebuilt mode or caller-supplied base URL so it can reuse artifacts. A GPU runner is desirable for frame-time evidence; software-GPU measurements must be labelled. Do not assume golden's chase/cockpit poses reproduce scarp's bright-fill orbit angles or terrain's close-camera poses: keep those explicit capture recipes.

| Nightly capture list                                                                                                       | Ordinary survivor / full retained checks                                                                                                                                                                                                                                                                                                                                                           | Cost boundary                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `f-geo-scarp`:4 wall sites×5 views (wide,toe,oblique,high,cockpit),20 viewport images                                      | Geometry/perf capability retains rocks>20,min seat>−3m,max seat<half hero height,draws>0,tris<900k,missing-hero throw/errors0; original Medium/view-specific rendering still sampled. Rock support is static across views and may be evaluated once/site **only after preserving the view-specific perf checks**.                                                                                  | 749.1 hosted-weight seconds; moving whole spec would falsely remove its guards.                                                                          |
| `f-sonar-palette-1200`:5sites×desktop/portrait DPR2,10 viewport+10 minimap crops                                           | Ordinary sonar guard retains legend,colour population>1000,lime0,>20 distinct colours,canvasCSS×2,base raster+96,span≥20,finite contour if range≥2,placementx≈12,right≤viewport,portrait96px. Direct canvas pixel access requires no screenshot file.                                                                                                                                              | 946.4s; capture removal cannot save all946.4s.                                                                                                           |
| `f1-terrain`:6biomes×Low/High,24 viewport images at8m/3.5m                                                                 | Ordinary render/terrain rows retain original error filtering and navigation/readiness at both camera states; **source does not actually assert nonblank pixels**, despite its comment. Keep smoke/atmosphere guards; add a deliberate nonblank guard only in step2/3 with validation, not by pretending it exists.                                                                                 | 629.5s; reviewer image evaluation moves.                                                                                                                 |
| `visual-qa`:13sites×spawn/40m/15m +east grotto close,40 images                                                             | Split out an **ordinary** all-site hero-map/loading/draw/failed-prop/no-error and safe-approach guard. At `:266–270` east pose retains blocked=false,eyeBlocked=false,floor>1m,underwater=true,failedProps0 plus errors0; also retain throws for missing/empty hero/no clear40/15m approach. Use the exact authored `tools/blue-hole-poses.json` east pose.                                        | Already VISUAL_QA=1-only; removing captures saves **zero** default local/hosted time; activating the extracted ordinary collision guards adds some work. |
| `f-bluehole-squiggle`:High desktop five authored views plus four floor ablations;9 captures clean /14 with changed sources | Ordinary Blue Hole material guard retains apron map=false,bump=false,terrain contrast[0,0,0],normalStrength0,hero/loading/no errors. Nightly keeps5-view manifest complete/no failures/High/failed0/tris>0,solid vertex parity when before exists, central ROI brightness after≥.97before (only applicable with baseline),all four ablations. No clean-HEAD baseline comparison is currently made. | Only45s fallback;720s timeout and subprocess builds make it unsuitable as a measured45s saving.                                                          |
| `f-fidelity-rollout` golden-related review                                                                                 | **No captures to move. Keep all20 cases in ordinary perf gates**: Blue Hole/Lost City×Medium×desktop/portrait; each authored opening/approach/detail and ±2m drift;16 rendered frames/drift,ignore first8,maximum tris>0<900k,draws>0,tierMedium,errors0,missing-pose/no-clear-approach errors. `:192` is a triangle guard, not screenshot work.                                                   | 1534.3s remains charged; saving=0 unless separately measured optimisations retain every pose/drift/frame sample.                                         |

Also move review-only raster calls from the29 folded sources to a scheduled evidence option, while keeping every metric/transition in ordinary gates. **Do not remove capture/readback calls that feed an ordinary assertion** (atmosphere colour deltas, ROV exposure, in-game saved-photo pixels, horizon ROI). Cheap numeric checks can stay with a direct readback when file persistence is optional. `f-bluehole-1030` is an additional nightly **candidate** (10 clean/20 dirty golden images); preserve its ordinary Low triangle<500k/vertices<500k/subdivision16>0 guard and manifest/hero-geometry evidence before changing its gate. Do not silently add it to the step3 exclusions.

Keep existing opt-in `FIRSTMIN_AUDIT=1` and local-only1090/high1000 native-time checks accessible in the nightly/manual evidence workflow with their unchanged thresholds. This makes missing hosted evidence visible; it is not a new runtime saving because those cases already skip there. Nightly failure should open a visible failed workflow/report; ordinary numeric regressions must still fail PR/release gates.

## Step 4: build once per deployment base and share gate definitions

Current `.github/workflows/ci.yml` performs a root build in `checks` and in **each of30 e2e shards**, then another project-base build through `npm run test:e2e:base`: **32 builds =31 root +1 project-base**. Browser configuration already serves `PW_OUTDIR` and owns its preview; it does not build. The base-specific Vite output rewrites asset/data/PWA paths and cannot be replaced by a root artifact mounted under a prefix.

1. Make root and project-base build outputs immutable artifacts for the workflow SHA. Build matrix `{base:'/',outDir:'dist-root'}` and `{base:'/submarine-explorer/',outDir:'dist-project-base'}`; root may be produced by the checks/build job. `npm ci`, typecheck once in checks; build both with the matching VITE_BASE and capture SHA,lockfile hash,Node version,base,outdir in a small manifest. Upload the **entire Vite output including copied data/models/fonts/GLBs/service worker/manifest/tiles**, not only assets/. Use artifact names containing run-id/run-attempt/base label; validate manifest on download. Verify the public/data symlink's built contents are real portable files; never rely on source-worktree paths in a downloaded dist.
2. E2e shards `needs: build-root` (or a single build matrix completion), install identical dependencies and Chromium/OS packages, download root artifact into its expected outdir, set PW_OUTDIR, retain CI low seed/one worker/retries1/30 balanced shards. No shard calls build/typecheck. Project-base job downloads its own artifact and sets `VITE_BASE=/submarine-explorer/ PW_BASE=/submarine-explorer/ PW_PORT=4211 PW_OUTDIR=dist-project-base`; call **Playwright directly** for `base-url.spec.ts`, avoiding the rebuilding npm script. Keep all8 base tests, including helper title audits. Each job still owns a strict-port preview. Cache dependencies/browser separately; artifact integrity is not supplied by npm cache.
3. Preserve `fail-fast:false`, branch/PR cancellation, per-shard timings, report uploads and bounded browser installation. Use `needs` so no stale dist is tested after a failed build. Upload build artifacts immediately after successful build, without making e2e wait for slow unrelated static checks; required final status still includes checks. Artifact transfer and job dependency delay can offset wall-time gains even as runner-minutes drop. A nightly workflow on a different run downloads only a verified matching SHA artifact or rebuilds its own two bases, never “latest” without an SHA check.
4. One canonical gate runner (extend `tools/gates.sh`, or factor a declarative runner it calls) owns the ordered list: Python,strict-content,build/typecheck,unit,root-e2e,project-base-build/browser,attribution,format. Make package script `ci` delegate to that runner in **full** mode; keep gates.sh's local default smoke+base, `--full-e2e`, `--no-e2e`, writable config support, log names, aggregated failures, isolated outputs/cleanup and explicit no-server-reuse. Add an internal `--prebuilt`/phase interface for CI consumers that validates base/SHA manifest and does not rebuild or clean externally downloaded output. Static workflow jobs call runner phases, not duplicated command arrays; e2e selection remains discovery-driven in `e2e-shards.mjs`.
5. Validation for the implementing step: compare discovered coverage/grep exact uniqueness before/after; prove every kept assertion contract has a survivor; exercise both bases including PWA/data/model requests; simulate occupied port,missing/wrong-base/wrong-SHA artifact and build failure; prove no skipped dependency falsely passes; run ordinary plus scheduled capture selection once. Refresh timing weights after renaming row titles, and measure on the quiet CPU before claiming30%. This report itself does not execute those implementation checks.

Build sharing reduces root builds31→1 (30 removed), with2 builds total. If root build takes B seconds and artifact delivery D seconds per consumer, aggregate runner saving is roughly30B−31D (plus producer upload costs). It does **not** reduce serial e2e test-body time. Local `npm run ci` still needs one build per base; unifying its definition prevents drift, not a fictitious30-build local saving.

## Serial-time estimate and uncertainty

The current all-selection weight sum is **36,250.4s** (604.2min); applying source-level default skips gives **34,106.3s /568.4min root local**, and **30,158.0s /502.6min root hosted**, plus299.1s for the separate base suite. These are **hosted-workload proxies**, not a prediction that a quiet local machine takes9.5hours. The reported local full-run floor is >1hour, but no clean current serial timing exists in this analysis. Active local fallback cases alone contribute9,630s (28.2% of its proxy); active hosted fallbacks contribute8,190s. Software GPU, retries, renames, capture flags and changed default/site poses dominate uncertainty.

| Step2 family                                                 | Current active-local hosted-weight proxy | Assumption for planning, not measured saving                                                                                            |
| ------------------------------------------------------------ | ---------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------------- |
| HUD9                                                         |                        6412.7s /106.9min | 25–45% saved by merging matching state setup/phases and avoiding redundant capture persistence;1390's78 rows still execute.             |
| Opening12                                                    |                         3832.3s /63.9min | 15–35% saved; distinct live/frozen/route/tier/viewport policies cannot be collapsed away.                                               |
| Journal8                                                     |                         1920.7s /32.0min | 30–50% saved through720/1060/1160 common journeys; all unique controls/focus/save guards and default stress rounds retained.            |
| Step3 active capture families (scarp/sonar/terrain/squiggle) |                         2370.0s /39.5min | 20–60% of these mixed tests' cost might be capture/setup work:474–1422s. Visual QA alreadyopt-in (saving0); fidelitycapture0 (saving0). |

Those illustrative assumptions yield roughly **3,300–6,600s** of proxy reduction (**10–19%** of root local proxy), before added ordinary visual-QA collision cases and artifact/runner overhead. Treat **5–25%** as a broader planning range, not a confidence interval. If a measured quiet-CPU run takes T minutes, an initial planning estimate is **0.10T–0.19T minutes saved**, and must be recalibrated from actual per-case serial data. For a hypothetical90min run this means9–17min;90min is an example, not an observed run.

**30%+ is a target, not established by this map.** Removing all six named nightly specs would claim4,534.3s (13.3% of the root-local proxy) but falsely removes fidelity1534.3s and charges opt-in visual630s as default saving; even removing the entire remaining mixed tests incorrectly assumes their assertions cost0. Table-driving file names alone saves no time. Preserve guards first, measure setup/capture/assertion phases, then decide whether additional capture candidates or cheaper equivalent probes can reach30%. Sharing30 redundant root builds improves hosted runner-minutes; it contributes0 to serial test-body saving.

## Uncertainty and no-loss register

- **No contract is authorised for deletion here.** All R/F/U predicates are attached to a survivor or explicitly retained. Numeric thresholds, real held-input scan helpers, timers, event payloads and pose/drift/frame counts remain unchanged. Replacing a past-bug guard with a screenshot reviewed only nightly is not an equivalent survivor.
- No browser assertion was exercised in this task. Past progress-note “blocked” findings are cited as blocked; code/history evidence does not establish current pass/fail. Where the direct provenance is a feature or audit, the per-test F/U status is retained rather than inventing a reproduced bug.
- The1290 memo disposal defect is real but unit-guarded; its12 e2e geometry cases are audit coverage. The1350 orientationchange defect is likewise guarded by a render unit regression; do not call every perf-budget row its reproduction. The1240/1260 tutorial timer and Pause-Journal defects are real, but the rewards and authored-entry naming assertions cover legitimate **different** labels, not an assumed naming failure.
  -1390's original note listed52 rows; current source has78 (adds667×375 and1024×768). Current source, not the old count, owns the table.1392's touch minimum is48px, whereas older controls tests use44px.Bughunt4's small-phone row is320×568; preserve its actual test.use dimensions. Source values take precedence over descriptive history.
- Proposed overlaps across scale/route/DPR/fresh state or settling policy remain **partial** until the survivor reproduces the same condition and retains all probes. The per-spec overlap paragraphs explicitly identify these, with no assumed whole-spec deletion.
- The latest P-first-dive-flow changed mission approach values toTitanic220,Lost City220,Blue Hole220,Beebe220,Monterey240m; use current `src/game/Spawn.ts`, not old “beside the wreck” timing titles or older opening notes. Current Lost City tile arm66 and mission classic arm are distinct accepted states; historical50m assertions were updated in04d42fe, not weakened in this task.
- Existing `f-bughunt-880` default Blue Hole candidate≤110m, default future-provenance and mode-state expectations remain verbatim even if future S-flow/S-guidance changes make them obsolete; the future implementation needs explicit accepted redesign evidence, not deletion to get a green gate.
- Changing `ROUNDS=3` to1 alters1060 timing keys, so its weight becomes45s fallback until measured;720's title does not mention ROUNDS, so its historical weight still covers an unknown old repetition cost. Counts below give defaults and one-round variants; neither is a clean benchmark.

The **U declarations** are listed separately after the inventory, each with expanded-case count and preserved disposition. F means no specific defect found, not proof none ever existed. In particular, untraced historical camera/readability/perf audits stay protected until attribution can be resolved.

## Spec inventory and every expanded test

Default viewport is1280×800 /Desktop Chrome unless test.use,device profile or body changes it. Relative spec links below are to the original source; the assertions are included here so the consumer need not reopen every file. Contract anchors use the source declaration, including sharedhelper declarations. Case lines use the exact titlepath; no cases are grouped away.

### [atmosphere.spec.ts](../../tests/e2e/atmosphere.spec.ts) — rendering/visual

1 expanded cases; sum of assigned weights **16.5s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `b712ec6` — capability introduced here; no specific failed-before defect located. Origin: `b712ec6 Initial commit`.

Selector/fixture constants: `CASES = [ { tile: 'monterey-canyon', depth: 10 }, { tile: 'monterey-canyon', depth: 300 }, { tile: 'titanic', depth: 3800 }, ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **A2 atmosphere depth bands render distinct non-black frames** — keeps 'A2 atmosphere depth bands render distinct non-black frames'; full list in contract; **16.5s M**; captures **3/0/0**; bug **F `b712ec6`**; contract [A001](#a001).

<a id="a001"></a>

**Contract A001 (atmosphere.spec.ts:L42)** — 'A2 atmosphere depth bands render distinct non-black frames'.

Navigation: ``page.goto(`/?tile=${c.tile}&depth=${c.depth}`, { waitUntil: 'domcontentloaded' })``.

Scope: `const c of CASES`.

- `expect(errors, 'no console/page errors').toEqual([])`
- ``expect(lum, `frame at ${c.depth} m is not black`).toBeGreaterThan(3)``

Scope: unconditional in this body.

- `expect(d(means[10]!, means[300]!)).toBeGreaterThan(20)`
- `expect(d(means[300]!, means[3800]!)).toBeGreaterThan(5)`
- `expect(d(means[10]!, means[3800]!)).toBeGreaterThan(40)`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil(page, () => { const g = window.__game as { props: { loaded: boolean }; discovery: { loaded: boolean } }; return window.__gameReady === true && g?.props.loaded && g.discovery.loaded; })`.

### [base-url.spec.ts](../../tests/e2e/base-url.spec.ts) — CI/base-url

8 expanded cases; sum of assigned weights **299.1s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Shared7 titleAudit contracts also inrootf-title-audit; base-specific requests/asset/model guard unique. Both deployment bases survive.

History/provenance scope: **R**, `cc2cfbc` — C6 deployment-prefix asset-path failure; title lifecycle adds6a8a2c6. Origin: `cc2cfbc core: base-URL fix (C6), wire presets (C3), Lost City pack`.

Profile/skip controls (variables expanded by rows below): `test.skip(!base, 'set PW_BASE to test a build served from that path')`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **project-base build loads data, models, and globe texture** — keeps .fatal; full list in contract; **41s M**; captures **2/0/0**; bug **R `cc2cfbc`**; contract [A002](#a002); requires PW_BASE.
- **title focus order, selectors and modal Escape return** — keeps button; full list in contract; **117.5s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A003](#a003); requires PW_BASE.
- **saved Continue has first focus and Enter launches the saved mission** — keeps .briefing, .home-screen; full list in contract; **10.2s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A004](#a004); requires PW_BASE.
- **an unavailable saved mission redirects focus and Daily is absent with an empty catalogue** — keeps button, .daily-card; full list in contract; **41.5s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A005](#a005); requires PW_BASE.
- **optional Monterey and font failures preserve usable home and base-aware requests** — keeps .home-scene-caption, .home-mark, .home-sites [data-mission=, .briefing, .fatal; full list in contract; **10.6s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A006](#a006); requires PW_BASE.
- **mission, tile, globe and debug URLs bypass the title** — keeps .home-screen, .briefing, .globe:not(.is-embedded), .fatal; full list in contract; **40.8s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A007](#a007); requires PW_BASE.
- **reduced motion draws once, refreshes after resize and resumes after modal close** — keeps 'reduced motion draws once, refreshes after resize and resumes after modal close'; full list in contract; **4.3s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A008](#a008); requires PW_BASE.
- **home input and quit-to-home preserve gameplay and renderer allocations** — keeps .home-screen, button, perf.geometries, perf.textures, perf.sceneObjects; full list in contract; **33.2s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A009](#a009); requires PW_BASE.

<a id="a002"></a>

**Contract A002 (base-url.spec.ts:L10)** — 'project-base build loads data, models, and globe texture'.

Navigation: ``page.goto(`${base}?tile=titanic&globe=1`, { waitUntil: 'domcontentloaded' })``; ``page.goto(`${base}?tile=titanic&landmark=_test&skipBriefing=1`, { waitUntil: 'domcontentloaded', })``.

- `expect(stats.models).toBe(2)`
- `expect(stats.failed).toBe(0)`
- `expect .poll(() => requests.filter(({ path }) => path.endsWith('.glb')).length) .toBeGreaterThanOrEqual(2)`

Scope: `const suffix of [ '/data/tiles/titanic/meta.json', '/data/tiles/titanic/heightmap.bin', '/data/landmarks/_test/props.json', '/assets/models/rock_09.glb', '/assets/models/barrel_stove.glb', '/assets/globe/earth-bmng-topo-bathy-4096.jpg', ]`.

- ``expect(requests).toContainEqual({ status: 200, path: `${base.replace(/\/$/, '')}${suffix}` })``

Scope: unconditional in this body.

- `expect(requests.filter(({ path }) => !path.startsWith(base))).toEqual([])`
- `expect(errors).toEqual([])`
- `expect(page.locator('.fatal')).toHaveCount(0)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction( () => (window.__game?.globe as { textureReady?: boolean } | undefined)?.textureReady === true, )`; `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction( () => (window.__game?.props as { loaded?: boolean } | undefined)?.loaded === true, )`.

<a id="a003"></a>

**Contract A003 (helpers/titleAudit.ts:L66)** — 'title focus order, selectors and modal Escape return'.

- `expect(menu.getByRole('button', { name: 'Dive sites', exact: true })).toBeFocused()`

Scope: `const entry of ['Dive sites', 'Free dive']; const exit of ['Back to menu', 'Escape']`.

- `expect(menu.getByRole('button', { name: entry, exact: true })).toBeFocused()`

Scope: `const [name, selector] of [ ['Settings', '.settings'], ['Controls', '.settings'], ['Journal', '.journal'], ['Upgrades', '.upgrades'], ]`.

- `expect(page.locator(selector)).toBeVisible()`
- `expect(page.locator(selector)).toBeHidden()`
- `expect(origin).toBeFocused()`
- `expect.poll(() => draws(page)).toBeGreaterThan(before)`

Helper guard closure: [boot](#helpers-titleaudit-ts-14-boot), [trapped](#helpers-titleaudit-ts-33-trapped), [idle](#helpers-titleaudit-ts-21-idle).

Helper call bindings: ``boot(page, `${base}?tier=low`)``; `trapped(page, '.home-menu')`; `trapped(page, '.home-screen')`; `trapped(page, selector)`; `idle(page)`.

<a id="a004"></a>

**Contract A004 (helpers/titleAudit.ts:L99)** — 'saved Continue has first focus and Enter launches the saved mission'.

- `expect(button).toBeEnabled()`
- `expect(button).toBeFocused()`
- `expect(page.locator('.briefing')).toBeVisible()`
- `expect(new URL(page.url()).pathname).toBe(base)`
- `expect(page.locator('.home-screen')).toBeHidden()`
- `expect(await draws(page)).toBe(0)`

Readiness/temporal predicates: `page.waitForURL(/[?&]mission=titanic\b/)`; `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [boot](#helpers-titleaudit-ts-14-boot).

Helper call bindings: ``boot(page, `${base}?tier=low`)``.

<a id="a005"></a>

**Contract A005 (helpers/titleAudit.ts:L115)** — 'an unavailable saved mission redirects focus and Daily is absent with an empty catalogue'.

- `expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()`
- `expect(page.getByRole('button', { name: 'Dive sites', exact: true })).toBeFocused()`
- `expect(page.locator('.daily-card')).toBeHidden()`

Helper guard closure: [boot](#helpers-titleaudit-ts-14-boot), [trapped](#helpers-titleaudit-ts-33-trapped).

Helper call bindings: ``boot(page, `${base}?tier=low`)``; `trapped(page, '.home-menu')`.

<a id="a006"></a>

**Contract A006 (helpers/titleAudit.ts:L134)** — 'optional Monterey and font failures preserve usable home and base-aware requests'.

- `expect .poll(() => requested.some((path) => path.endsWith('/monterey-canyon/meta.json'))) .toBe(true)`
- `expect.poll(() => requested.filter((path) => path.endsWith('.woff2')).length).toBe(3)`
- `expect(requested.every((path) => path.startsWith(base))).toBe(true)`
- `expect(page.locator('.home-scene-caption')).toHaveText('Expedition preview')`
- `expect(page.locator('.home-mark')).toBeVisible()`
- `expect(page.locator('.home-sites [data-mission="titanic"]')).toBeVisible()`
- `expect(page.locator('.briefing')).toBeVisible()`
- `expect(page.locator('.fatal')).toHaveCount(0)`
- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForURL(/[?&]mission=titanic\b/)`; `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [boot](#helpers-titleaudit-ts-14-boot).

Helper call bindings: ``boot(page, `${base}?tier=low`)``.

<a id="a007"></a>

**Contract A007 (helpers/titleAudit.ts:L169)** — 'mission, tile, globe and debug URLs bypass the title'.

Scope: `const route of ['mission=titanic', 'tile=titanic', 'globe=1', 'debugTerrain=1']`.

- `expect(page.locator('.home-screen')).toBeHidden()`
- `expect(await draws(page)).toBe(0)`

Scope: `const route of ['mission=titanic', 'tile=titanic', 'globe=1', 'debugTerrain=1']; if route.startsWith('mission=')`.

- `expect(page.locator('.briefing')).toBeVisible()`

Scope: `const route of ['mission=titanic', 'tile=titanic', 'globe=1', 'debugTerrain=1']; if route === 'globe=1'`.

- `expect(page.locator('.globe:not(.is-embedded)')).toBeVisible()`

Scope: `const route of ['mission=titanic', 'tile=titanic', 'globe=1', 'debugTerrain=1']`.

- `expect(page.locator('.fatal')).toHaveCount(0)`

Helper guard closure: [boot](#helpers-titleaudit-ts-14-boot).

Helper call bindings: ``boot(page, `${base}?${route}&tier=low`)``.

<a id="a008"></a>

**Contract A008 (helpers/titleAudit.ts:L180)** — 'reduced motion draws once, refreshes after resize and resumes after modal close'.

- `expect .poll(() => page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.terrainReady), ) .toBe(true)`
- `expect.poll(() => draws(page)).toBeGreaterThan(0)`
- `expect( await page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.animated), ).toBe(false)`
- `expect.poll(() => draws(page)).toBeGreaterThan(before)`
- `expect(settings).toBeVisible()`
- `expect(reduceMotion).toBeChecked()`
- `expect( await page.evaluate(() => (window.__game as unknown as AuditGame).save.get().reduceMotion), ).toBe(true)`
- `expect( await page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.animated), ).toBe(false)`
- `expect(settings).toBeVisible()`
- `expect(reduceMotion).not.toBeChecked()`
- `expect( await page.evaluate(() => (window.__game as unknown as AuditGame).save.get().reduceMotion), ).toBe(false)`
- `expect.poll(() => draws(page)).toBeGreaterThan(paused)`
- `expect( await page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.animated), ).toBe(true)`

Helper guard closure: [boot](#helpers-titleaudit-ts-14-boot), [idle](#helpers-titleaudit-ts-21-idle).

Helper call bindings: ``boot(page, `${base}?tier=low`)``; `idle(page)`.

<a id="a009"></a>

**Contract A009 (helpers/titleAudit.ts:L233)** — 'home input and quit-to-home preserve gameplay and renderer allocations'.

- `expect(await gameplay(page)).toEqual(initial)`
- `expect(page.locator('.home-screen')).toBeHidden()`
- `expect(await draws(page)).toBe(0)`
- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeFocused()`
- `expect .poll(() => page.evaluate(() => (window.__game as unknown as AuditGame).titleScene.terrainReady), ) .toBe(true)`

Scope: `let i = 0; i < 3`.

- `expect.poll(() => draws(page)).toBeGreaterThan(before)`

Scope: unconditional in this body.

- `expect(await gameplay(page)).toEqual(paused)`
- `expect(after.geometries).toBe(perf.geometries)`
- `expect(after.textures).toBe(perf.textures)`
- `expect(after.sceneObjects).toBe(perf.sceneObjects)`

Readiness/temporal predicates: `page.waitForFunction(contentReady)`; `page.waitForFunction(contentReady)`.

Helper guard closure: [boot](#helpers-titleaudit-ts-14-boot), [idle](#helpers-titleaudit-ts-21-idle).

Helper call bindings: ``boot(page, `${base}?tier=low`)``; ``boot(page, `${base}?mission=titanic&tier=low&skipBriefing=1`)``; `idle(page)`.

### [content-missions.spec.ts](../../tests/e2e/content-missions.spec.ts) — missions/modes

14 expanded cases; sum of assigned weights **852.8s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `3d35c06` — capability introduced here; no specific failed-before defect located. Origin: `3d35c06 settings: reset discoveries; content: pressure_band_review; ci: content and base-URL gates`.

Profile/skip controls (variables expanded by rows below): .

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **smoke cases match the shipped catalog** — keeps response.ok()).toBe(true); missionIds).toEqual(catalog.landmarks); **0s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A010](#a010).
- **titanic: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **52.5s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **challenger-deep: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **74.4s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **lost-city: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **74.5s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **monterey-canyon: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **124.4s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **endurance: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **66.2s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **axial-seamount-ashes: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **34.2s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **hudson-canyon: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **61.8s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **kamaehuakanaloa: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **56.1s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **beebe-vent-field: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **56.3s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **great-blue-hole: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **115.1s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **bismarck: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **28.1s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **hunga-tonga-caldera: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **62.7s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).
- **blake-plateau-corals: briefing to primary scans to debrief** — keeps .briefing, .briefing-objectives li.is-primary, .briefing-objectives li.is-primary .briefing-obj-title, .objectives-panel, .obj-progress, .obj-banner-title; full list in contract; **46.5s M**; captures **0/0/0**; bug **F `3d35c06`**; contract [A011](#a011).

<a id="a010"></a>

**Contract A010 (content-missions.spec.ts:L112)** — 'smoke cases match the shipped catalog'.

- `expect(response.ok()).toBe(true)`
- `expect(missionIds).toEqual(catalog.landmarks)`

<a id="a011"></a>

**Contract A011 (content-missions.spec.ts:L120)** — `${id}: briefing to primary scans to debrief`.

Row expansion: `const id of missionIds`.

Navigation: ``page.goto(`/?mission=${id}`, { waitUntil: 'domcontentloaded', })``.

- ``expect(response.ok(), `${id}: mission.json served`).toBe(true)``
- `expect(doc.landmark).toBe(id)`
- `expect(primary.length).toBeGreaterThanOrEqual(2)`
- `expect(page.locator('.briefing')).toBeVisible()`
- `expect(page.locator('.briefing-objectives li.is-primary')).toHaveCount(primary.length)`
- `expect(page.locator('.briefing-objectives li.is-primary .briefing-obj-title')).toHaveText( primary.map((objective) => objective.title), )`
- `expect(page.locator('.objectives-panel')).toBeVisible()`

Scope: `const objective of primary`.

- `expect .poll(async () => { const title = await page.locator('.obj-item.is-current .obj-item-title').textContent(); const current = doc.objectives.find((o) => o.title === title); return !!current && (await page.locator('.obj-hint').textContent()) === current.hint; }) .toBe(true)`
- ``expect(completed, `${id}: ${objective.id} should complete through a scan`).toBeGreaterThan( before, )``

Scope: unconditional in this body.

- `expect(page.locator('.obj-progress')).toHaveText(/primaries done|all complete/)`
- `expect(banner).toBeVisible({ timeout: 15_000 })`
- `expect(banner.locator('.obj-banner-title')).toHaveText(/objectives complete$/)`
- `expect(page.locator('.mission-debrief')).toHaveCount(0)`
- `expect(page.locator('.mission-debrief')).toBeVisible()`
- `expect(page.locator('.mission-debrief .debrief-title')).toHaveText('Mission complete')`
- `expect(state).toBe('debrief')`
- `expect(errors, errors.join(' | ')).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000, })`; `page.waitForFunction( () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded, undefined, { timeout: 20_000 }, )`; `page.waitForFunction( (objectiveId) => ( window.__game as { mission: { objectives: Array<{ id: string; complete: boolean }> } } ).mission.objectives.some((o) => o.id === objectiveId && o.complete), objective.id, { timeout: 30_000 }, )`.

Helper guard closure: [teleportToPoi](#content-missions-spec-ts-29-teleporttopoi), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `teleportToPoi(page, objective.poi)`.

### [d-currents.spec.ts](../../tests/e2e/d-currents.spec.ts) — missions/modes

2 expanded cases; sum of assigned weights **44.9s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `bd74a3f` — capability introduced here; no specific failed-before defect located. Origin: `bd74a3f currents: offline HYCOM current field per site with Off/Gentle/Realistic toggle`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **off, gentle and realistic scale the same offline canyon field** — keeps .hud-current, Currents, .mode-custom-tag; full list in contract; **39.1s M**; captures **5/1/0**; bug **F `bd74a3f`**; contract [A012](#a012).
- **a missing offline grid gives zero flow and an honest HUD label** — keeps await speed(page)).toBe(0); locator('.hud-current')).toContainText('offline data unavailable'); **5.8s M**; captures **0/0/0**; bug **F `bd74a3f`**; contract [A013](#a013).

<a id="a012"></a>

**Contract A012 (d-currents.spec.ts:L29)** — 'off, gentle and realistic scale the same offline canyon field'.

Navigation: `page.goto('/?tile=monterey-canyon&preset=canyon', { waitUntil: 'domcontentloaded' })`.

- `expect(await speed(page)).toBe(0)`
- `expect(page.locator('.hud-current')).toBeHidden()`
- `expect(dialog.getByLabel('Currents')).toHaveValue('off')`
- `expect(dialog.getByLabel('Currents')).toHaveValue('realistic')`
- `expect.poll(() => speed(page)).toBeGreaterThan(0.01)`
- `expect(page.locator('.hud-current')).toContainText('CURRENT')`
- `expect(dialog.locator('.mode-custom-tag')).toBeVisible()`
- `expect.poll(async () => (await speed(page)) / full).toBeCloseTo(0.35, 1)`
- `expect(gentle).toBeGreaterThan(0)`
- `expect.poll(async () => (await speed(page)) / full).toBeCloseTo(8, 1)`
- `expect(await speed(page)).toBe(0)`
- `expect(page.locator('.hud-current')).toBeHidden()`
- `expect .poll( async () => { await page.clock.fastForward(250); return page.evaluate(() => { const v = (window.__game as { sub: { velocity: { x: number; z: number } } }).sub.velocity; return Math.hypot(v.x, v.z); }); }, { intervals: [20] }, ) .toBeGreaterThan(0)`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil(page, () => window.__gameReady === true)`; `clockFramesUntil(page, () => { const g = window.__game as { currents: { status: string }; presets: { entered: boolean } }; return g.currents.status === 'ready' && g.presets.entered; })`.

<a id="a013"></a>

**Contract A013 (d-currents.spec.ts:L106)** — 'a missing offline grid gives zero flow and an honest HUD label'.

Navigation: `page.goto('/?tile=monterey-canyon&preset=canyon', { waitUntil: 'domcontentloaded' })`.

- `expect(await speed(page)).toBe(0)`
- `expect(page.locator('.hud-current')).toContainText('offline data unavailable')`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil(page, () => window.__gameReady === true)`; `clockFramesUntil( page, () => (window.__game as { currents: { status: string } }).currents.status === 'missing', )`.

### [d-flow.spec.ts](../../tests/e2e/d-flow.spec.ts) — Journal/debrief

3 expanded cases; sum of assigned weights **240.0s**, 0 fallback keys. Disposition: **fold → journal-debrief.spec.ts**.

Overlap: Partial mission.spec.ts/discovery/f-debrief families; J5 keeps event payloads, optional state, restart/no-reload and save semantics; mission/scan survivors stay.

History/provenance scope: **F**, `df15a58` — capability introduced here; no specific failed-before defect located. Origin: `df15a58 flow: fresh objectives every dive, keep exploring, honest debrief, Journal`.

Profile/skip controls (variables expanded by rows below): `test.skip(!!process.env.CI, 'two full boots exceed the timeout on software GL')`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **D-FLOW dive flow › primaries complete -> keep exploring -> secondary -> surface -> debrief actions** — keeps .obj-progress, .obj-banner-title, .obj-banner-detail, button, .mission-debrief, .debrief-title; full list in contract; **130.3s M**; captures **2/0/0**; bug **F `df15a58`**; contract [A014](#a014).
- **D-FLOW dive flow › Home from the debrief; Dive again starts a fresh dive** — keeps .debrief-title, .debrief-highlight, .debrief-next, .debrief-btn.is-primary, .debrief-secondary > .debrief-btn, [data-field=; full list in contract; **96.2s M**; captures **2/0/0**; bug **F `df15a58`**; contract [A015](#a015); hosted body-time skip.
- **D-FLOW Journal › home front page, site entries, spoilers, reload** — keeps .home-screen, .jr-honesty, .jr-site-card, .jr-site-card[data-target=, .jr-spoilers input, .jr-body .jr-title; full list in contract; **13.5s M**; captures **3/0/0**; bug **F `df15a58`**; contract [A016](#a016).

<a id="a014"></a>

**Contract A014 (d-flow.spec.ts:L161)** — 'primaries complete -> keep exploring -> secondary -> surface -> debrief actions'.

- `expect(start).toEqual({ logged: true, state: 'diving', anyComplete: false })`
- `expect(page.locator('.obj-progress')).toHaveText('0 of 4 objectives · 0 of 2 primary')`
- `expect(p.state).toBe('primaries-complete')`
- `expect(banner).toBeVisible({ timeout: 8_000 })`
- `expect(banner.locator('.obj-banner-title')).toHaveText('Primary objectives complete')`
- `expect(banner.locator('.obj-banner-detail')).toHaveText( '2 of 4 objectives. 2 optional targets remain.', )`
- `expect(banner.locator('button')).toHaveText(['Keep exploring', 'Surface and debrief'])`
- `expect(page.locator('.mission-debrief')).toHaveCount(0)`
- `expect(banner).toBeHidden()`
- `expect((await probe(page)).state).toBe('primaries-complete')`
- `expect(page.locator('.mission-debrief')).toHaveCount(0)`
- `expect((await flowEvents(page)).map((e) => e.name)).toEqual(['mission:primaryComplete'])`
- `expect(p.complete).toEqual(['find-bow', 'find-stern', 'boilers'])`
- `expect(page.locator('.obj-progress')).toHaveText('3 of 4 objectives · primaries done')`
- `expect((await probe(page)).state).toBe('debrief')`
- `expect(events.map((e) => e.name)).toEqual([ 'mission:primaryComplete', 'mission:complete', 'mission:ended', ])`
- `expect(events[0]?.payload).toEqual({ missionId: 'titanic', completed: 2, total: 4 })`
- `expect(events[2]?.payload).toMatchObject({ missionId: 'titanic', reason: 'surface', completed: 3, total: 4, })`
- `expect(debrief.locator('.debrief-title')).toHaveText('Mission complete')`
- `expect(debrief.locator('.debrief-next')).toHaveText( 'Next: Finish the remaining objectives for 2 stars.', )`
- `expect(debrief.locator('[data-field="objectives"] .debrief-value')).toHaveText('3 of 4')`
- `expect(debrief.locator('.debrief-btn')).toHaveText([ 'Dive sites', 'Keep exploring', 'Journal', 'Dive again', 'Home', ])`
- `expect(await subPos(page)).toEqual(held)`
- `expect(debrief).toBeHidden()`
- `expect((await probe(page)).state).toBe('primaries-complete')`
- `expect(Math.hypot(resumed.x - held.x, resumed.z - held.z)).toBeLessThan(2)`
- `expect(page.locator('.objectives-panel')).toBeVisible()`
- `expect((await flowEvents(page)).map((e) => e.name)).toEqual([ 'mission:primaryComplete', 'mission:complete', 'mission:ended', 'mission:ended', ])`
- `expect(page.locator('.journal')).toBeVisible()`
- `expect(page.locator('.journal')).toBeHidden()`
- `expect(debrief).toBeVisible()`
- `expect(debrief).toBeHidden()`
- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(page.locator('.home-sites')).toBeVisible()`
- `expect(page.locator('.home-sites h2')).toHaveText('Dive sites')`
- `expect(new URL(page.url()).searchParams.get('mission')).toBeNull()`
- `expect( await page.evaluate(() => (window as unknown as { __samePage?: boolean }).__samePage), ).toBe(true)`
- `expect(await page.evaluate(() => (window.__game as { appState: string }).appState)).toBe( 'home', )`
- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [boot](#d-flow-spec-ts-48-boot), [ready](#d-flow-spec-ts-53-ready), [teleport](#d-flow-spec-ts-84-teleport), [scan](#d-flow-spec-ts-114-scan), [stepScan](#helpers-scan-ts-7-stepscan), [surfaceFromPause](#d-flow-spec-ts-151-surfacefrompause).

Helper call bindings: `boot(page, DIVE)`; `teleport(page, 'titanic-bow')`; `scan(page, 'find-bow')`; `teleport(page, 'titanic-stern')`; `scan(page, 'find-stern')`; `teleport(page, 'titanic-boilers')`; `scan(page, 'boilers')`; `surfaceFromPause(page)`.

<a id="a015"></a>

**Contract A015 (d-flow.spec.ts:L294)** — 'Home from the debrief; Dive again starts a fresh dive'.

- `expect(debrief.locator('.debrief-title')).toHaveText('Back at the surface')`
- `expect(debrief.locator('.debrief-highlight')).toHaveText('Scanned Bow section.')`
- `expect(debrief.locator('.debrief-next')).toHaveText( 'Next: Keep exploring to finish the primary objectives.', )`
- `expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1)`
- `expect(debrief.locator('.debrief-secondary > .debrief-btn')).toHaveCount(2)`
- `expect(debrief.locator('[data-field="objectives"] .debrief-value')).toHaveText('1 of 4')`
- `expect((await probe(page)).emitted).not.toContain('mission:complete')`
- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(page.locator('.home-sites')).toBeHidden()`
- `expect(page.locator('.home-menu')).toBeVisible()`
- `expect(new URL(page.url()).searchParams.get('mission')).toBe('titanic')`
- `expect(fresh.state).toBe('diving')`
- `expect(fresh.complete).toEqual([])`
- `expect(fresh.emitted).toEqual(['mission:started'])`
- `expect(page.locator('.obj-progress')).toHaveText('0 of 4 objectives · 0 of 2 primary')`
- `expect(page.locator('.mission-debrief')).toHaveCount(0)`
- `expect(after).toBe(before + 1)`
- `expect(errors, errors.join(' | ')).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction( () => (window.__game as { scanner: { view: { candidateId: string | null } } }).scanner.view .candidateId === 'titanic-bow', undefined, { timeout: 15_000 }, )`.

Helper guard closure: [boot](#d-flow-spec-ts-48-boot), [ready](#d-flow-spec-ts-53-ready), [teleport](#d-flow-spec-ts-84-teleport), [scan](#d-flow-spec-ts-114-scan), [stepScan](#helpers-scan-ts-7-stepscan), [surfaceFromPause](#d-flow-spec-ts-151-surfacefrompause).

Helper call bindings: `boot(page, DIVE)`; `teleport(page, 'titanic-bow')`; `scan(page, 'find-bow')`; `surfaceFromPause(page)`; `ready(page)`.

<a id="a016"></a>

**Contract A016 (d-flow.spec.ts:L365)** — 'home front page, site entries, spoilers, reload'.

- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(journal).toBeVisible()`
- `expect(journal.locator('.jr-honesty')).toContainText('real survey data')`
- `expect(journal.locator('.jr-site-card')).toHaveCount(13)`
- `expect(journal.locator('.jr-site-card[data-target="titanic"] .jr-card-count')).toHaveText( // The bow, plus the site-level overview that opens with any scan there. '2/8', )`
- `expect(journal.locator('.jr-spoilers input')).not.toBeChecked()`
- `expect(journal.locator('.jr-body .jr-title')).toHaveText('RMS Titanic')`
- `expect(stern).toHaveCount(0)`
- `expect(journal.locator('.jr-nav-item', { hasText: /Unscanned target/ })).toHaveCount(0)`
- `expect(journal.locator('.jr-more-to-find')).toHaveText(/^\d+ more to find$/)`
- `expect(journal.locator('.jr-tag.is-recreation')).toHaveText('Recreation')`
- `expect(journal.locator('.jr-sources a').first()).toHaveAttribute('href', /^https?:/)`
- `expect(journal.locator('.jr-body')).not.toContainText(/illustrative|not surveyed/i)`
- `expect(journal.locator('.jr-more-to-find')).toHaveCount(0)`
- `expect(stern).toBeVisible()`
- `expect(journal.locator('.jr-tag.is-undiscovered')).toBeVisible()`
- `expect(journal.locator('.jr-body .jr-para').first()).toBeVisible()`
- `expect(journal.locator('.jr-nav-item.is-species')).not.toHaveCount(0)`
- `expect(journal).toBeHidden()`
- `expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe(raw)`
- `expect(journal.locator('.jr-spoilers input')).not.toBeChecked()`
- `expect(journal.locator('.jr-nav-item[data-target="titanic/poi/bow"]')).not.toHaveText( 'Undiscovered', )`
- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [boot](#d-flow-spec-ts-48-boot), [ready](#d-flow-spec-ts-53-ready).

Helper call bindings: `boot(page, '/')`; `ready(page)`.

### [d-input-hud.spec.ts](../../tests/e2e/d-input-hud.spec.ts) — HUD/touch layout

4 expanded cases; sum of assigned weights **207.0s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `918eea9` — camera/input fixes and v3 binding migration;71dcbc0 Ctrl fallback/HUD. Origin: `71dcbc0 controls: Shift boost, Ctrl/C dive, F scan, drag-orbit camera; larger scaled HUD`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **readable contextual HUD, controls and UI scale survive reload** — keeps .hud-help, body > .mission-select, .hud-prompt, Legacy default sim speed, dialog, [data-action=; full list in contract; **136.5s M**; captures **5/0/0**; bug **R `918eea9`**; contract [A017](#a017).
- **Ctrl tip is once-only and C still descends if keyboard lock fails** — keeps .hud-ctrl-tip; full list in contract; **32.6s M**; captures **1/0/0**; bug **R `918eea9`**; contract [A018](#a018).
- **canvas drag orbits chase camera and wheel zooms without pointer lock** — keeps 'canvas drag orbits chase camera and wheel zooms without pointer lock'; full list in contract; **31.3s M**; captures **1/0/0**; bug **R `918eea9`**; contract [A019](#a019).
- **v1 custom bindings migrate without taking new one-handed defaults** — keeps bindings).toEqual({ ahead: ['KeyI'], boost: [], scan: ['KeyG'], descend: ['ControlLeft', 'ControlRight', 'KeyC'], journal: ['KeyH'], saved: 3, }); **6.6s M**; captures **0/0/0**; bug **R `918eea9`**; contract [A020](#a020).

<a id="a017"></a>

**Contract A017 (d-input-hud.spec.ts:L16)** — 'readable contextual HUD, controls and UI scale survive reload'.

- `expect(page.locator('.hud-help')).toHaveCount(0)`
- `expect(page.locator('body > .mission-select')).toBeHidden()`
- `expect(page.locator('.hud-prompt')).toContainText('G Scan')`
- `expect(fontSize).toBeGreaterThanOrEqual(14)`
- `expect(settings.getByLabel('Legacy default sim speed')).toHaveCount(0)`
- `expect(page.getByRole('dialog', { name: 'Controls' })).toBeVisible()`
- `expect(settings.locator('[data-action="scan"]')).toHaveText('G')`
- `expect(settings.locator('[data-action="ballastFlood"]')).toContainText('Ctrl')`
- `expect(settings.locator('[data-action="ping"]')).toHaveCount(0)`
- `expect(settings.locator('[data-action="togglePhotoMode"]')).toHaveText('P')`
- `expect(settings.locator('[data-action="capturePhoto"]')).toHaveText('Enter')`
- `expect(settings.locator('.settings-scale-value')).toHaveText('150%')`
- `expect( await page.evaluate( () => (window.__game as { save: { get(): { uiScale: number } } }).save.get().uiScale, ), ).toBe(150)`
- `expect(page.locator('.hud-prompt')).toContainText('G Scan')`
- `expect(page.locator('.hud-sim-speed')).toHaveText('2× SIM SPEED')`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [ready](#d-input-hud-spec-ts-8-ready).

Helper call bindings: `ready(page)`.

<a id="a018"></a>

**Contract A018 (d-input-hud.spec.ts:L61)** — 'Ctrl tip is once-only and C still descends if keyboard lock fails'.

- `expect .poll(() => page.evaluate(() => (window as unknown as { __lockCalls: number }).__lockCalls)) .toBe(1)`
- `expect(page.locator('.hud-ctrl-tip')).toContainText('Ctrl+W may close this tab')`
- `expect(after).toBeLessThan(before)`
- `expect(page.locator('.hud-ctrl-tip')).toBeHidden()`

Failure guards: `throw new Error('lock denied');`.

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [ready](#d-input-hud-spec-ts-8-ready).

Helper call bindings: `ready(page, '/?tile=titanic')`.

<a id="a019"></a>

**Contract A019 (d-input-hud.spec.ts:L108)** — 'canvas drag orbits chase camera and wheel zooms without pointer lock'.

- `expect(box).not.toBeNull()`
- `expect( Math.hypot(dragged.x - before.x, dragged.y - before.y, dragged.z - before.z), ).toBeGreaterThan(1)`
- `expect((await camera()).radius).toBeGreaterThan(before.radius)`
- `expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()`

Helper guard closure: [ready](#d-input-hud-spec-ts-8-ready).

Helper call bindings: `ready(page, '/?tile=titanic')`.

<a id="a020"></a>

**Contract A020 (d-input-hud.spec.ts:L145)** — 'v1 custom bindings migrate without taking new one-handed defaults'.

- `expect(bindings).toEqual({ ahead: ['KeyI'], boost: [], scan: ['KeyG'], descend: ['ControlLeft', 'ControlRight', 'KeyC'], journal: ['KeyH'], saved: 3, })`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [ready](#d-input-hud-spec-ts-8-ready).

Helper call bindings: `ready(page, '/?tile=titanic')`.

### [d-modes.spec.ts](../../tests/e2e/d-modes.spec.ts) — missions/modes

2 expanded cases; sum of assigned weights **90.3s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `d60056a` — capability introduced here; no specific failed-before defect located. Origin: `d60056a gameplay: Arcade/Realistic/Custom modes with speed, descent, light and sensor presets`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Arcade, Realistic and Custom apply live and survive reload** — keeps radio, Forward speed, Lights, .mode-custom-tag; full list in contract; **87.1s M**; captures **1/2/0**; bug **F `d60056a`**; contract [A021](#a021).
- **v1 settings migrate to Arcade while keeping display choices** — keeps migrated.current, migrated.legacy; full list in contract; **3.2s M**; captures **0/0/0**; bug **F `d60056a`**; contract [A022](#a022).

<a id="a021"></a>

**Contract A021 (d-modes.spec.ts:L7)** — 'Arcade, Realistic and Custom apply live and survive reload'.

Navigation: `page.goto('/?tile=titanic&landmark=titanic&poi=titanic-bow')`.

- `expect(initial).toEqual({ mode: 'arcade', speed: 1, light: 750, scanRadius: 400 })`
- `expect(dialog.getByRole('radio', { name: 'Arcade' })).toBeChecked()`
- `expect(dialog.getByLabel('Forward speed')).toHaveValue('research')`
- `expect(dialog.getByLabel('Lights', { exact: true })).toHaveValue('realistic')`
- `expect(realistic).toEqual({ forwardCap: 1.4, descentCap: 0.5, light: 500, fill: 12, scanRadius: 200, })`
- `expect(dialog.locator('.mode-custom-tag')).toBeVisible()`
- `expect(dialog.getByLabel('Forward speed')).toHaveValue('research')`
- `expect(dialog.locator('.mode-custom-tag')).toBeVisible()`
- `expect(dialog.getByLabel('Lights', { exact: true })).toHaveValue('enhanced')`
- `expect(dialog.getByLabel('Forward speed')).toHaveValue('research')`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`; `page.waitForFunction(() => window.__gameReady === true)`.

<a id="a022"></a>

**Contract A022 (d-modes.spec.ts:L79)** — 'v1 settings migrate to Arcade while keeping display choices'.

Navigation: `page.goto('/?tile=titanic')`.

- `expect(migrated.current).toMatchObject({ version: 2, graphicsTier: 'low', postFx: false, detailStrength: 0.5, simSpeedDefault: 3, reduceMotion: true, captions: true, sonarPalette: 'highContrast', gameplayMode: 'arcade', })`
- `expect(migrated.legacy).not.toBeNull()`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

### [d-photo.spec.ts](../../tests/e2e/d-photo.spec.ts) — Journal/debrief

3 expanded cases; sum of assigned weights **211.8s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Photo open/save fragments1370; d-photo survives actual JPEG pixels/gallery/download ZIP/deletion/quota/store/drop/ROV orbit.

History/provenance scope: **R**, `090ea99` — touch photo exit/save recovery; photo/gallery feature21096d3 also retained. Origin: `21096d3 photo: photo mode (P) with captioned captures saved to a Journal gallery`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **photo mode freezes the sim, saves to the Journal, persists and deletes** — keeps .hud, .objectives-panel, .photo-mode-caption, .photo-mode-tips, button, .photo-mode-toast; full list in contract; **190.5s M**; captures **5/0/1**; bug **R `090ea99`**; contract [A023](#a023).
- **a full photo store reports the dropped oldest; quota failure is explained** — keeps .photo-mode, p.id; full list in contract; **13.3s M**; captures **0/0/2 attempts (one quota error)**; bug **R `090ea99`**; contract [A024](#a024).
- **with the ROV out, photo mode orbits the ROV and leaves it deployed** — keeps .hud-rov, .photo-mode; full list in contract; **8s M**; captures **0/0/0**; bug **R `090ea99`**; contract [A025](#a025).

<a id="a023"></a>

**Contract A023 (d-photo.spec.ts:L68)** — 'photo mode freezes the sim, saves to the Journal, persists and deletes'.

Navigation: `page.goto(DIVE)`.

- `expect(mode).toBeVisible()`
- `expect(page.locator('.hud')).toBeHidden()`
- `expect(page.locator('.objectives-panel')).toBeHidden()`
- `expect(mode.locator('.photo-mode-caption')).toHaveText(/^.*Titanic.* · Bow section$/)`
- `expect(mode.locator('.photo-mode-tips')).toHaveText( 'Esc: exit · drag: orbit · wheel: zoom', )`
- `expect(mode.getByRole('button', { name: 'Capture (Enter / Space)' })).toBeVisible()`
- `expect((await cameraSnapshot(page)).mode).toBe('orbit')`
- `expect(await simSnapshot(page)).toEqual(before)`
- `expect .poll(() => page.evaluate(() => (window.__game as unknown as Game).rig.orbitRadius)) .toBeGreaterThan(orbit0.radius)`
- `expect(orbit1.az).not.toBeCloseTo(orbit0.az, 3)`
- `expect(orbit1.clearance).toBeGreaterThan(0)`
- `expect .poll(() => page.evaluate(() => (window.__game as unknown as Game).rig.orbitRadius)) .toBeLessThan(orbit0.radius * 1.2)`
- `expect(mode.locator('.photo-mode-caption')).toContainText('Bow section')`
- `expect(mode.locator('.photo-mode-toast')).toHaveText('Saved to Journal')`
- `expect(stored?.version).toBe(1)`
- `expect(stored?.photos).toHaveLength(1)`
- `expect(saved.siteId).toBe('titanic')`
- `expect(saved.poiId).toBe('titanic-bow')`
- `expect(saved.poiName).toBe('Bow section')`
- `expect(Number(saved.depthM)).toBeGreaterThan(3000)`
- `expect(Number.isNaN(Date.parse(String(saved.at)))).toBe(false)`
- `expect(image.width).toBeGreaterThan(300)`
- `expect(image.width).toBeLessThanOrEqual(640)`
- `expect(image.mean).toBeGreaterThan(8)`
- `expect(image.sd).toBeGreaterThan(3)`
- `expect(mode).toBeHidden()`
- `expect(page.locator('.hud')).toBeVisible()`
- `expect(await page.evaluate(() => (window.__game as unknown as Game).appState)).toBe('dive')`
- `expect .poll(async () => { const after = await cameraSnapshot(page); return ( after.mode === cameraBefore.mode && Math.hypot(after.x - cameraBefore.x, after.y - cameraBefore.y, after.z - cameraBefore.z) < 0.5 ); }) .toBe(true)`
- `expect(mode).toBeHidden()`
- `expect(mode).toBeVisible()`
- `expect(mode).toBeHidden()`
- `expect(journal).toBeVisible()`
- `expect(journal.locator('.jr-photo-title')).toHaveText('Photos · 1 of 24')`
- `expect(journal.locator('.jr-photo-card')).toHaveCount(1)`
- `expect(journal.locator('.jr-photo-card')).toContainText('Bow section')`
- `expect(journal.getByRole('button', { name: 'Download all' })).toBeVisible()`
- `expect( journal.getByRole('button', { name: 'Download RMS Titanic · Bow section' }), ).toBeVisible()`
- `expect(one.suggestedFilename()).toMatch(/^rms-titanic-bow-section-\d{4}-\d{2}-\d{2}\.jpg$/)`
- `expect(all.suggestedFilename()).toBe('journal-photos.zip')`
- `expect([...zip.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])`
- `expect(journal.locator('.jr-photo-caption')).toHaveText(/Titanic.* · Bow section$/)`
- `expect(journal.locator('.jr-photo-detail')).toContainText('m deep')`
- `expect(journal.locator('.jr-entry-photos .jr-photo-card')).toHaveCount(1)`
- `expect(journal).toBeVisible()`
- `expect(journal.locator('.jr-photo-card')).toHaveCount(1)`
- `expect(journal.locator('.jr-photo-card')).toHaveCount(0)`
- `expect(journal.locator('.jr-photo-title')).toHaveText('Photos · 0 of 24')`
- `expect((await storedPhotos(page))?.photos).toEqual([])`
- `expect(await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe( discoveriesBefore, )`
- `expect(errors).toEqual([])`

Helper guard closure: [ready](#d-photo-spec-ts-29-ready).

Helper call bindings: `ready(page)`.

<a id="a024"></a>

**Contract A024 (d-photo.spec.ts:L256)** — 'a full photo store reports the dropped oldest; quota failure is explained'.

Navigation: `page.goto(DIVE)`.

- `expect(toast).toHaveText(/Saved to Journal · oldest photo removed \(keeps 24\)/)`
- `expect(stored?.photos).toHaveLength(24)`
- `expect(stored?.photos.some((p) => p.id === 'old-23')).toBe(false)`
- `expect(toast).toHaveText(/Photo storage is full/)`
- `expect(toast).toHaveClass(/is-error/)`
- `expect(page.locator('.photo-mode')).toBeHidden()`

Failure guards: `throw new DOMException('full', 'QuotaExceededError');`.

Helper guard closure: [ready](#d-photo-spec-ts-29-ready).

Helper call bindings: `ready(page)`.

<a id="a025"></a>

**Contract A025 (d-photo.spec.ts:L300)** — 'with the ROV out, photo mode orbits the ROV and leaves it deployed'.

Navigation: `page.goto(DIVE)`.

- `expect(page.locator('.hud-rov')).toBeVisible()`
- `expect(page.locator('.photo-mode')).toBeVisible()`
- `expect(view.deployed).toBe(true)`
- `expect(view.mode).toBe('orbit')`
- `expect(view.distance).toBeLessThanOrEqual(view.radius + 1)`
- `expect(page.locator('.photo-mode')).toBeHidden()`
- `expect( await page.evaluate(() => (window.__game as { rov: { deployed: boolean } }).rov.deployed), ).toBe(true)`

Helper guard closure: [ready](#d-photo-spec-ts-29-ready).

Helper call bindings: `ready(page)`.

### [d-polish.spec.ts](../../tests/e2e/d-polish.spec.ts) — HUD/touch layout

2 expanded cases; sum of assigned weights **60.1s**, 1 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `d082cae` — capability introduced here; no specific failed-before defect located. Origin: `d082cae polish: top-right objectives list and telemetry, control tips, 350-600 m start, snappy camera`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **polished dive HUD keeps mission, telemetry, speed, live tips and the controls guide readable** — keeps .obj-item, .obj-item.is-current, .obj-item.is-optional, .obj-check, .obj-hint, .hud-control-tips; full list in contract; **45s F**; captures **3/3/0**; bug **F `d082cae`**; contract [A026](#a026).
- **a long objective list shows the current target and the next few** — keeps .obj-item.is-current, .obj-item, .obj-item-title, .obj-more; full list in contract; **15.1s M**; captures **0/0/0**; bug **F `d082cae`**; contract [A027](#a027).

<a id="a026"></a>

**Contract A026 (d-polish.spec.ts:L8)** — 'polished dive HUD keeps mission, telemetry, speed, live tips and the controls guide readable'.

Navigation: `page.goto('/?mission=titanic&skipBriefing=1')`.

- `expect(page.locator('.obj-item')).toHaveCount(4)`
- `expect(page.locator('.obj-item.is-current')).toContainText('Head to the bow')`
- `expect(page.locator('.obj-item.is-optional')).toHaveCount(2)`
- `expect(page.locator('.obj-check')).toHaveText(['○', '○', '○', '○'])`
- `expect(page.locator('.obj-hint')).not.toBeEmpty()`
- `expect(page.locator('.hud-control-tips')).toBeVisible()`
- `expect(page.locator('.hud-control-tips')).toContainText('W/S speed')`
- `expect(depthSize).toBeGreaterThanOrEqual(14)`
- `expect(page.locator('.hud-sim-speed')).toHaveText('2× SIM SPEED')`
- `expect(stack.telemetryTop).toBeGreaterThanOrEqual(stack.objectiveBottom)`
- `expect(stack.badgeTop).toBeGreaterThanOrEqual(stack.telemetryTop)`
- `expect(stack.badgeBottom).toBeLessThanOrEqual(stack.telemetryBottom)`
- `expect(page.locator('.hud-control-tips')).toBeHidden()`
- `expect(page.locator('.hud-control-tips')).toBeEmpty()`
- `expect(guide).toBeVisible()`
- `expect(guide.locator('.controls-card-control').first()).toHaveText('W / S')`
- `expect(guide).toContainText('Speed ahead and astern')`
- `expect(guide).toBeHidden()`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(guide.locator('.controls-card-control').first()).toHaveText('I / S')`
- `expect(guide).toContainText('Speed ahead and astern')`
- `expect(page.locator('.hud-control-tips')).toBeVisible()`
- `expect(page.locator('.hud-control-tips')).toContainText('I/S speed')`

Failure guards: `throw new Error('Rebind failed');`.

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`.

<a id="a027"></a>

**Contract A027 (d-polish.spec.ts:L95)** — 'a long objective list shows the current target and the next few'.

Navigation: `page.goto('/?mission=lost-city&skipBriefing=1')`.

- `expect(page.locator('.obj-item.is-current')).toContainText('Head to Poseidon')`
- `expect(page.locator('.obj-item')).toHaveCount(4)`
- `expect(page.locator('.obj-item.is-current')).toContainText('Head to Poseidon')`
- `expect(page.locator('.obj-item-title')).toHaveText([ 'Head to Poseidon', 'Scan IMAX Tower', 'Extra vent one', 'Scan Beehive', ])`
- `expect(page.locator('.obj-more')).toHaveText('+2 more · Esc for all')`
- `expect(page.locator('.obj-item', { hasText: 'Extra vent two' })).toHaveCount(0)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`.

### [d-power.spec.ts](../../tests/e2e/d-power.spec.ts) — missions/modes

1 expanded cases; sum of assigned weights **33.4s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `e7fcdff` — capability introduced here; no specific failed-before defect located. Origin: `e7fcdff power: optional battery and oxygen (Realistic/Custom), gauges, safe emergency ascent`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Arcade hides supplies; Custom enables them; depletion ascends and debriefs safely** — keeps radio, .mode-custom-tag, .hud-warning, .mission-debrief; full list in contract; **33.4s M**; captures **3/1/0**; bug **F `e7fcdff`**; contract [A028](#a028).

<a id="a028"></a>

**Contract A028 (d-power.spec.ts:L7)** — 'Arcade hides supplies; Custom enables them; depletion ascends and debriefs safely'.

Navigation: `page.goto('/?mission=titanic&skipBriefing=1')`.

- `expect(gauge).toBeHidden()`
- `expect(dialog.getByRole('radio', { name: 'Arcade' })).toBeChecked()`
- `expect(dialog.locator('.mode-custom-tag')).toBeVisible()`
- `expect(gauge).toBeVisible()`
- `expect(page.locator('.hud-warning')).toContainText('BATTERY LOW')`
- `expect(page.locator('.hud-warning')).toContainText('EMERGENCY ASCENT')`
- `expect(page.locator('.mission-debrief')).toBeVisible({ timeout: 10_000 })`
- `expect(page.locator('.mission-debrief')).toContainText('Supplies exhausted')`
- `expect(page.locator('.mission-debrief')).toContainText('Dive again')`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction( () => (window.__game as { missionRouter: { emergencyAscent: boolean } }).missionRouter .emergencyAscent, )`.

### [d-rov.spec.ts](../../tests/e2e/d-rov.spec.ts) — scan

2 expanded cases; sum of assigned weights **81.2s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `80635e6` — capability introduced here; no specific failed-before defect located. Origin: `80635e6 rov: tethered ROV (E) that flies, scans and returns; visible, lit chase view`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **deploy, scan through the shared discovery path, and retrieve** — keeps .hud-rov; full list in contract; **30.4s M**; captures **2/0/0**; bug **F `80635e6`**; contract [A029](#a029).
- **tether limit and pause return control safely; controls show E** — keeps .hud-rov, [data-action=; full list in contract; **50.8s M**; captures **2/0/0**; bug **F `80635e6`**; contract [A030](#a030).

<a id="a029"></a>

**Contract A029 (d-rov.spec.ts:L50)** — 'deploy, scan through the shared discovery path, and retrieve'.

Navigation: `page.goto(url)`.

- `expect(page.locator('.hud-rov')).toBeVisible()`
- `expect(page.locator('.hud-rov')).toContainText('ROV')`
- `expect( await page.evaluate(() => { const g = window.__game as { rig: { camera: { position: { distanceTo(other: unknown): number } } }; sub: { position: unknown }; config: { rov: { mothershipCameraClearanceM: number } }; }; return ( g.rig.camera.position.distanceTo(g.sub.position) - g.config.rov.mothershipCameraClearanceM ); }), ).toBeGreaterThanOrEqual(-0.01)`
- `expect(Math.abs(rovOnScreen.x)).toBeLessThan(1)`
- `expect(rovOnScreen.y).toBeLessThan(1 / 3)`
- `expect(rovOnScreen.y).toBeGreaterThan(-1)`
- `expect(Math.abs(rovOnScreen.z)).toBeLessThan(1)`
- `expect(deployedExposure.nearWhite).toBeLessThan(0.05)`
- `expect(deployedExposure.centreMean).toBeGreaterThan(35)`
- `expect( await page.evaluate( () => ( window.__game as { discoveries: { get(l: string, p: string): { count: number } | null } } ).discoveries.get('_test', 'test-bow')?.count, ), ).toBe(1)`
- ``expect((await exposure(page, `${shots}/rov-scan.png`)).nearWhite).toBeLessThan(0.05)``
- `expect .poll(() => page.evaluate(() => (window.__game as { rov: { deployed: boolean } }).rov.deployed)) .toBe(false)`
- `expect(page.locator('.hud-rov')).toBeHidden()`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady && (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt === 'test-bow', )`.

Helper guard closure: [stepScan](#helpers-scan-ts-7-stepscan).

<a id="a030"></a>

**Contract A030 (d-rov.spec.ts:L108)** — 'tether limit and pause return control safely; controls show E'.

Navigation: `page.goto('/?tile=titanic')`.

- `expect .poll(() => page.evaluate(() => (window.__game as { rov: { deployed: boolean } }).rov.deployed)) .toBe(true)`
- `expect( await page.evaluate(() => { const g = window.__game as { rov: { position: { distanceTo(p: unknown): number } }; sub: { position: unknown }; }; return g.rov.position.distanceTo(g.sub.position); }), ).toBeGreaterThan(149)`
- `expect(page.locator('.hud-rov')).toContainText('TETHER LIMIT')`
- `expect(page.locator('.hud-rov')).toBeHidden()`
- `expect( await page.evaluate(() => (window.__game as { rov: { deployed: boolean } }).rov.deployed), ).toBe(false)`
- `expect(page.locator('[data-action="toggleRov"]')).toContainText('E')`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady)`.

### [d-scan.spec.ts](../../tests/e2e/d-scan.spec.ts) — scan

2 expanded cases; sum of assigned weights **86.8s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `d38964b` — capability introduced here; no specific failed-before defect located. Origin: `d38964b scan: per-dive scan state, scanned markers, waypoints and objective hints`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **scanned contacts stay marked and cannot be rescanned until a new dive** — keeps .scan-panel .scan-hint, .d-scan-world-marker[data-poi=; full list in contract; **41.3s M**; captures **3/0/0**; bug **F `d38964b`**; contract [A031](#a031).
- **visual hints show an objective waypoint and obey the saved toggle** — keeps .d-scan-objective-hint, .d-scan-edge, .d-scan-waypoints; full list in contract; **45.5s M**; captures **4/0/0**; bug **F `d38964b`**; contract [A032](#a032).

<a id="a031"></a>

**Contract A031 (d-scan.spec.ts:L30)** — 'scanned contacts stay marked and cannot be rescanned until a new dive'.

- `expect(page.locator('.scan-panel .scan-hint')).toHaveText(/HOLD G TO SCAN/)`
- `expect .poll(() => page.evaluate(() => ( window.__game as { sonar: { markers: Array<{ poiId: string; icon: string; scanned: boolean; visible: boolean }>; }; } ).sonar.markers.find((m) => m.poiId === 'test-bow'), ), ) .toMatchObject({ icon: '✓', scanned: true, visible: true })`
- `expect(page.locator('.d-scan-world-marker[data-poi="test-bow"]')).toHaveClass(/is-scanned/)`
- `expect(page.locator('.scan-panel .scan-hint')).toHaveText('Logged · Journal')`
- `expect( await page.evaluate(() => { const g = window.__game as { scanner: { view: { completed: number }; isScanned(l: string, p: string): boolean }; discoveries: { get(l: string, p: string): { count: number } | null }; }; return [ g.scanner.view.completed, g.discoveries.get('_test', 'test-bow')?.count, g.scanner.isScanned('_test', 'test-bow'), ]; }), ).toEqual([1, 1, true])`
- `expect(page.locator('.scan-panel .scan-hint')).toHaveText(/HOLD G TO SCAN/)`
- `expect( await page.evaluate(() => { const g = window.__game as { scanner: { view: { lastCompleteFirstTime: boolean } }; discoveries: { get(l: string, p: string): { count: number } | null }; }; return [g.scanner.view.lastCompleteFirstTime, g.discoveries.get('_test', 'test-bow')?.count]; }), ).toEqual([false, 2])`

Readiness/temporal predicates: `page.waitForFunction( () => !(window.__game as { discovery: { overlay: { bannerActive: boolean } } }).discovery.overlay .bannerActive, )`; `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`; `page.waitForFunction( () => (window.__game as { discovery?: { spawnedAt: string | null } }).discovery?.spawnedAt === 'test-bow', )`.

Helper guard closure: [boot](#d-scan-spec-ts-9-boot), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `boot(page, scanUrl)`.

<a id="a032"></a>

**Contract A032 (d-scan.spec.ts:L94)** — 'visual hints show an objective waypoint and obey the saved toggle'.

- `expect(page.locator('.d-scan-objective-hint')).toContainText('bow')`
- `expect(page.locator('.d-scan-edge')).toBeVisible()`
- `expect(page.locator('.d-scan-edge')).toContainText(/m · [↑↓]\d+ m/)`
- `expect(page.locator('.d-scan-edge')).not.toHaveClass(/is-onscreen/)`
- `expect(page.locator('.d-scan-waypoints')).toHaveAttribute('data-hints', 'false')`
- `expect(page.locator('.d-scan-edge')).toBeHidden()`
- `expect(page.locator('.d-scan-objective-hint')).toContainText('bow')`
- `expect(page.locator('.d-scan-waypoints')).toHaveAttribute('data-hints', 'false')`
- `expect(page.locator('.d-scan-objective-hint')).toContainText('bow')`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

Helper guard closure: [boot](#d-scan-spec-ts-9-boot).

Helper call bindings: `boot(page, '/?mission=titanic&skipBriefing=1&poi=titanic-bow')`.

### [d-shell.spec.ts](../../tests/e2e/d-shell.spec.ts) — missions/modes

3 expanded cases; sum of assigned weights **252.7s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `d5fefb0` — capability introduced here; no specific failed-before defect located. Origin: `d5fefb0 shell: title screen with globe, Esc pause menu, vertical dive-site list`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **home, site grid, pause, objectives, resume and quit** — keeps .home-screen, .home-menu .daily-card, .home-menu .mode-advanced-toggle, .home-menu button, button, .globe.is-embedded; full list in contract; **193s M**; captures **5/0/0**; bug **F `d5fefb0`**; contract [A033](#a033).
- **URL probes bypass home and home site grid scrolls vertically with trapped focus** — keeps .home-screen, [data-mission=, .home-sites, .globe.is-embedded, .home-menu, button; full list in contract; **54.4s M**; captures **0/0/0**; bug **F `d5fefb0`**; contract [A034](#a034).
- **a home globe pin launches the same mission as its grid entry** — keeps pin).toHaveAttribute('data-state', 'mission'); locator('.globe.is-embedded .globe-card')).toContainText('Titanic'); locator('.briefing')).toBeVisible(); **5.3s M**; captures **0/0/0**; bug **F `d5fefb0`**; contract [A035](#a035).

<a id="a033"></a>

**Contract A033 (d-shell.spec.ts:L58)** — 'home, site grid, pause, objectives, resume and quit'.

- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(existingActions).toHaveCount(7)`
- `expect(existingActions).toHaveText([ 'Continue', 'Dive sites', 'Free dive', 'Journal', 'Settings', 'Controls', 'Upgrades', ])`
- `expect( await page .locator('.home-menu > *') .evaluateAll((elements) => elements.map((element) => element.classList.contains('daily-card') ? 'Daily dive' : element.classList.contains('mode-selector') ? 'Mode' : element.textContent, ), ), ).toEqual([ 'Continue', 'Dive sites', 'Free dive', 'Daily dive', 'Mode', 'Journal', 'Settings', 'Controls', 'Upgrades', ])`
- `expect(page.locator('.home-menu .daily-card')).toHaveCount(1)`
- `expect(page.locator('.home-menu .mode-advanced-toggle')).toHaveCount(1)`
- `expect(page.locator('.home-menu button')).toHaveCount(9)`
- `expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()`
- `expect(page.locator('.globe.is-embedded')).toBeHidden()`
- `expect(await pose(page)).toEqual(atHome)`
- `expect(sites).toBeVisible()`
- `expect(page.locator('.globe.is-embedded')).toBeVisible()`
- `expect .poll(() => page.locator('.globe.is-embedded .globe-canvas').evaluate((canvas) => { const box = canvas.getBoundingClientRect(); return Math.abs( (canvas as HTMLCanvasElement).width / (canvas as HTMLCanvasElement).height - box.width / box.height, ); }), ) .toBeLessThan(0.02)`
- `expect(sites.locator('[data-mission="titanic"]')).toBeVisible()`
- `expect(sites.locator('[data-mission="titanic"] .mission-badge')).toHaveCount(0)`
- `expect(sites.locator('[data-mission="titanic"]')).toContainText(/Class B hull/)`
- `expect(sites.locator('[data-mission="titanic"]')).toContainText(/\d+\/\d+ logged/)`
- `expect(page.locator('.globe.is-embedded .globe-card')).toContainText('Titanic')`
- `expect(page.locator('.briefing')).toBeVisible()`
- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(await pose(page)).toEqual(paused)`
- `expect( await page.evaluate(() => document.querySelector('.pause-menu')?.contains(document.activeElement), ), ).toBe(true)`
- `expect(page.locator('.settings')).toBeVisible()`
- `expect(page.locator('.settings')).toBeHidden()`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(page.locator('.pause-objectives li')).toHaveCount(4)`
- `expect(page.locator('.pause-objectives')).toContainText('north end')`
- `expect(page.locator('.pause-actions')).toBeVisible()`
- `expect(page.locator('.pause-menu')).toBeHidden()`
- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(page.locator('.pause-menu')).toBeHidden()`
- `expect(new URL(page.url()).search).toBe('')`
- `expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled()`
- `expect(await pose(page)).toEqual(homeAgain)`

Readiness/temporal predicates: `page.waitForFunction( () => (window.__game as { homeGlobe: { textureReady: boolean; pinCount: number } }).homeGlobe .textureReady && (window.__game as { homeGlobe: { pinCount: number } }).homeGlobe.pinCount > 0, )`; `page.waitForURL(/[?&]mission=titanic\b/)`; `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [boot](#d-shell-spec-ts-8-boot), [expectGlobeClearEdges](#d-shell-spec-ts-43-expectglobeclearedges).

Helper call bindings: `boot(page, '/')`; `expectGlobeClearEdges(page)`.

<a id="a034"></a>

**Contract A034 (d-shell.spec.ts:L188)** — 'URL probes bypass home and home site grid scrolls vertically with trapped focus'.

Scope: `const url of [ '/?tile=titanic', '/?mission=titanic', '/?skipBriefing=1', '/?depth=30', '/?globe=1', ]`.

- `expect(page.locator('.home-screen')).toBeHidden()`

Scope: unconditional in this body.

- `expect(scroll.locator('[data-mission="titanic"]')).toBeVisible()`
- `expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(before.top)`
- `expect(await scroll.evaluate((el) => el.scrollLeft)).toBe(before.left)`
- `expect( await page.evaluate(() => document.querySelector('.home-screen')?.contains(document.activeElement), ), ).toBe(true)`
- `expect(page.locator('.home-sites')).toBeHidden()`
- `expect(page.locator('.globe.is-embedded')).toBeHidden()`
- `expect( page.locator('.home-menu').getByRole('button', { name: 'Dive sites' }), ).toBeFocused()`

Helper guard closure: [boot](#d-shell-spec-ts-8-boot).

Helper call bindings: `boot(page, url)`; `boot(page, '/')`.

<a id="a035"></a>

**Contract A035 (d-shell.spec.ts:L224)** — 'a home globe pin launches the same mission as its grid entry'.

- `expect(pin).toHaveAttribute('data-state', 'mission')`
- `expect(page.locator('.globe.is-embedded .globe-card')).toContainText('Titanic')`
- `expect(page.locator('.briefing')).toBeVisible()`

Readiness/temporal predicates: `page.waitForURL(/[?&]mission=titanic\b/)`.

Helper guard closure: [boot](#d-shell-spec-ts-8-boot).

Helper call bindings: `boot(page, '/')`.

### [d-sonar.spec.ts](../../tests/e2e/d-sonar.spec.ts) — scan

4 expanded cases; sum of assigned weights **172.7s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `b92792e` — capability introduced here; no specific failed-before defect located. Origin: `b92792e sonar: close default zoom, zoom levels, POI and objective contacts, readable relief`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **visible sonar controls, expanded wheel routing, and live marker setting** — keeps button, .d-sonar-range; full list in contract; **53.1s M**; captures **3/0/0**; bug **F `b92792e`**; contract [A036](#a036).
- **sonar follows the sub, zooms by keys and wheel, and marks dive scan state** — keeps .d-scan-sonar-marker, .d-sonar-range, .d-sonar-backdrop; full list in contract; **78.6s M**; captures **6/0/0**; bug **F `b92792e`**; contract [A037](#a037).
- **whole-tile step remains available and sensor range gates POIs** — keeps .d-sonar-range; full list in contract; **16.7s M**; captures **3/0/0**; bug **F `b92792e`**; contract [A038](#a038).
- **local canyon relief shows measured depth bands and labelled contours** — keeps readiness/throws and invoked helper predicates below (no direct expect in body); **24.3s M**; captures **1/0/0**; bug **F `b92792e`**; contract [A039](#a039).

<a id="a036"></a>

**Contract A036 (d-sonar.spec.ts:L49)** — 'visible sonar controls, expanded wheel routing, and live marker setting'.

Navigation: `page.goto('/?mission=titanic&poi=titanic-bow&skipBriefing=1')`.

- `expect(sonar.getByRole('button', { name: 'Sonar zoom in' })).toBeVisible()`
- `expect(sonar.getByRole('button', { name: 'Sonar zoom out' })).toBeVisible()`
- `expect(sonar).toHaveAttribute('title', /mouse wheel/)`
- `expect(sonar.locator('.d-sonar-range')).toHaveText('500 m')`
- `expect(sonar).toHaveClass(/d-sonar-expanded/)`
- `expect(sonar.locator('.d-sonar-range')).toHaveText('250 m')`
- `expect( await page.evaluate(() => (window.__game as { rig: { chaseRadius: number } }).rig.chaseRadius), ).toBe(cameraRadius)`
- `expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ visible: false })`
- `expect(sonar).toHaveClass(/d2-sonar-markers-hidden/)`
- `expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ visible: true })`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

Helper guard closure: [waitForZoom](#d-sonar-spec-ts-40-waitforzoom).

Helper call bindings: `waitForZoom(page)`.

<a id="a037"></a>

**Contract A037 (d-sonar.spec.ts:L93)** — 'sonar follows the sub, zooms by keys and wheel, and marks dive scan state'.

Navigation: `page.goto('/?mission=titanic&poi=titanic-bow&skipBriefing=1', { waitUntil: 'domcontentloaded', })`.

- `expect .poll(() => marker(page, 'titanic-bow')) .toMatchObject({ current: true, icon: '◇', visible: true })`
- `expect(sonar.locator('.d-scan-sonar-marker')).toHaveCount(0)`
- `expect(sonar.locator('.d-sonar-range')).toHaveText('1000 m')`
- `expect(sonar).toHaveCSS('left', '12px')`
- `expect(sonar.locator('.d-sonar-range')).toHaveText('500 m')`
- `expect.poll(async () => (await marker(page, 'titanic-bow'))?.py).not.toBe(beforeZoom?.py)`
- `expect(sonar.locator('.d-sonar-range')).toHaveText('250 m')`
- `expect.poll(() => marker(page, 'titanic-stern')).toMatchObject({ visible: false })`
- `expect(sonar.locator('.d-sonar-range')).toHaveText('500 m')`
- `expect(sonar).toHaveClass(/d-sonar-expanded/)`
- `expect(page.locator('.d-sonar-backdrop')).toBeVisible()`
- `expect(sonar).toHaveCSS('background-color', 'rgb(6, 19, 24)')`
- `expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ scanned: true, icon: '✓' })`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

Helper guard closure: [waitForZoom](#d-sonar-spec-ts-40-waitforzoom), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `waitForZoom(page)`.

<a id="a038"></a>

**Contract A038 (d-sonar.spec.ts:L143)** — 'whole-tile step remains available and sensor range gates POIs'.

Navigation: `page.goto('/?mission=titanic&skipBriefing=1', { waitUntil: 'domcontentloaded' })`.

- `expect(sonar.locator('.d-sonar-range')).toHaveText('Whole tile')`
- `expect .poll(() => marker(page, 'titanic-stern')) .toMatchObject({ icon: '·', visible: true })`
- `expect.poll(() => marker(page, 'titanic-stern')).toMatchObject({ visible: false })`
- `expect.poll(() => marker(page, 'titanic-stern')).toMatchObject({ visible: true })`
- `expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ visible: false })`
- `expect.poll(() => marker(page, 'titanic-bow')).toMatchObject({ visible: true })`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

Helper guard closure: [waitForZoom](#d-sonar-spec-ts-40-waitforzoom).

Helper call bindings: `waitForZoom(page)`.

<a id="a039"></a>

**Contract A039 (d-sonar.spec.ts:L203)** — 'local canyon relief shows measured depth bands and labelled contours'.

Navigation: `page.goto('/?mission=monterey-canyon&skipBriefing=1', { waitUntil: 'domcontentloaded' })`.

- No direct matcher in this test body; the helper predicates and readiness/throws below are the executable assertions.

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`; `page.waitForFunction(() => { const relief = ( window.__game as { sonar: { relief: { spanM: number; contourIntervalM: number } }; } ).sonar.relief; return relief.spanM > 40 && Number.isFinite(relief.contourIntervalM); })`.

Helper guard closure: [waitForZoom](#d-sonar-spec-ts-40-waitforzoom).

Helper call bindings: `waitForZoom(page)`.

### [d-start.spec.ts](../../tests/e2e/d-start.spec.ts) — opening framing

2 expanded cases; sum of assigned weights **114.6s**, 1 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `5fe81c9` — capability introduced here; no specific failed-before defect located. Origin: `5fe81c9 start: dives begin near the first objective; surface start is opt-in`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Custom near-site starts retain the authored approach at deep and shallow sites** — keeps .briefing-start input[value=, .briefing; full list in contract; **45s F**; captures **4/0/0**; bug **F `5fe81c9`**; contract [A040](#a040).
- **The briefing start choice persists as the saved start position** — keeps .briefing, .briefing-start input[value=; full list in contract; **69.6s M**; captures **1/0/0**; bug **F `5fe81c9`**; contract [A041](#a041).

<a id="a040"></a>

**Contract A040 (d-start.spec.ts:L24)** — 'Custom near-site starts retain the authored approach at deep and shallow sites'.

Scope: `const [id, filename] of [ ['titanic', 'near-site-titanic.png'], ['challenger-deep', 'near-site-challenger.png'], ['lost-city', 'near-site-lost-city.png'], ]`.

- `expect(page.locator('.briefing-start input[value="near-site"]')).toBeChecked()`
- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(near.range).toBeCloseTo(MISSION_APPROACH_M[id], 0)`
- `expect(near.range).toBeGreaterThan(near.scanRadius)`
- `expect(Math.abs(near.turn)).toBeLessThan(0.02)`
- `expect(near.altitude).toBeGreaterThanOrEqual(near.minAltitude - 0.5)`
- `expect(near.y).toBeGreaterThan(near.rating)`

Helper guard closure: [boot](#d-start-spec-ts-8-boot).

Helper call bindings: `boot(page, id)`.

<a id="a041"></a>

**Contract A041 (d-start.spec.ts:L96)** — 'The briefing start choice persists as the saved start position'.

- `expect(page.locator('.briefing')).toBeHidden()`
- `expect((await pose(page)).y).toBeGreaterThan(-20)`
- `expect(page.locator('.briefing-start input[value="surface"]')).toBeChecked()`
- `expect(page.locator('.briefing-start input[value="surface"]')).toBeChecked()`
- `expect(page.locator('.briefing')).toBeHidden()`
- `expect((await pose(page)).y).toBeLessThan(-3000)`
- `expect(page.locator('.briefing-start input[value="near-site"]')).toBeChecked()`

Helper guard closure: [boot](#d-start-spec-ts-8-boot).

Helper call bindings: `boot(page, 'titanic')`.

### [d2-camera.spec.ts](../../tests/e2e/d2-camera.spec.ts) — opening framing

2 expanded cases; sum of assigned weights **244.5s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `918eea9` — capability introduced here; no specific failed-before defect located. Origin: `918eea9 camera: remove target auto-framing, world-fixed free look, reset camera (X/button/double-click), wider chase framing, no hull shake; R/F pitch and G scan with bindings v3 migration; pointer-look fixes; camera tips at dive start`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **chase framing, dive-start tips, free look and reset controls** — keeps .hud-control-tips, .hud-attribution; full list in contract; **131.9s M**; captures **6/0/0**; bug **F `918eea9`**; contract [A042](#a042).
- **pointer look preference survives menus; lock loss pauses and Esc resume shows hint** — keeps .settings, .settings-pointer-lock, .pause-menu, .d3-pointer-look-hint; full list in contract; **112.6s M**; captures **0/0/0**; bug **F `918eea9`**; contract [A043](#a043).

<a id="a042"></a>

**Contract A042 (d2-camera.spec.ts:L26)** — 'chase framing, dive-start tips, free look and reset controls'.

- `expect(page.locator('.hud-control-tips')).toContainText( 'Drag: look · Wheel: zoom · X: reset camera', )`
- `expect(radius).toBeGreaterThan(95)`
- `expect.poll(async () => (await camera(page)).free).toBe(true)`
- `expect(page.locator('.hud-control-tips')).toBeHidden()`
- `expect.poll(async () => (await camera(page)).free).toBe(false)`
- `expect.poll(async () => (await camera(page)).free).toBe(true)`
- `expect.poll(async () => (await camera(page)).free).toBe(false)`
- `expect(page.locator('.hud-attribution')).toHaveCount(0)`
- `expect.poll(async () => (await camera(page)).free).toBe(true)`
- `expect.poll(async () => (await camera(page)).free).toBe(false)`
- `expect.poll(async () => (await camera(page)).mode).toBe('first-person')`
- `expect.poll(async () => (await camera(page)).mode).toBe('chase')`

Helper guard closure: [dive](#d2-camera-spec-ts-9-dive).

Helper call bindings: `dive(page, 'titanic')`; `dive(page, 'lost-city')`.

<a id="a043"></a>

**Contract A043 (d2-camera.spec.ts:L83)** — 'pointer look preference survives menus; lock loss pauses and Esc resume shows hint'.

- `expect(page.locator('.settings')).toBeVisible()`
- `expect(page.locator('.settings-pointer-lock')).toHaveText('Disable pointer look')`
- `expect(page.locator('.settings')).toBeHidden()`
- `expect(await page.evaluate(() => document.pointerLockElement)).toBeNull()`
- `expect( await page.evaluate(() => (window as unknown as { cameraLockRequests: () => number }).cameraLockRequests(), ), ).toBe(1)`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(page.locator('.settings')).toBeVisible()`
- `expect(page.locator('.settings')).toBeHidden()`
- `expect(page.locator('.pause-menu')).toBeHidden()`
- `expect(page.locator('.d3-pointer-look-hint')).toBeVisible()`
- `expect( await page.evaluate(() => (window as unknown as { cameraLockRequests: () => number }).cameraLockRequests(), ), ).toBe(1)`
- `expect(page.locator('.d3-pointer-look-hint')).toBeHidden()`
- `expect( await page.evaluate(() => (window as unknown as { cameraLockRequests: () => number }).cameraLockRequests(), ), ).toBe(2)`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(page.locator('.d3-pointer-look-hint')).toBeVisible()`
- `expect(page.locator('.d3-pointer-look-hint')).toBeHidden()`
- `expect( await page.evaluate(() => (window as unknown as { cameraLockRequests: () => number }).cameraLockRequests(), ), ).toBe(4)`

Helper guard closure: [dive](#d2-camera-spec-ts-9-dive).

Helper call bindings: `dive(page, 'titanic')`.

### [d2-hazard.spec.ts](../../tests/e2e/d2-hazard.spec.ts) — missions/modes

2 expanded cases; sum of assigned weights **60.1s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `300d5c1` — capability introduced here; no specific failed-before defect located. Origin: `300d5c1 hazard: hull gauge and vignette replace shake, rated vs crush depth (full-ocean vehicle for Challenger Deep), descent-adjusted starting reserves, current-driven marine snow`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **live hull warning styles show vignette, gauge, and both near the rating** — keeps .hud-warning; full list in contract; **38.5s M**; captures **4/0/0**; bug **F `300d5c1`**; contract [A044](#a044).
- **current indicator and snow advect with the measured field** — keeps .hud-current; full list in contract; **21.6s M**; captures **1/0/0**; bug **F `300d5c1`**; contract [A045](#a045).

<a id="a044"></a>

**Contract A044 (d2-hazard.spec.ts:L7)** — 'live hull warning styles show vignette, gauge, and both near the rating'.

Navigation: `page.goto('/?mission=challenger-deep&skipBriefing=1')`.

- `expect(gauge).toContainText('11,000 m rated')`
- `expect(vignette).toBeHidden()`
- `expect(page.locator('.hud-warning')).toBeHidden()`
- `expect(warningChoice).toHaveValue('both')`
- `expect(page.locator('.hud-warning')).toContainText('HULL RATING EXCEEDED')`

Scope: `const style of ['vignette', 'gauge', 'both'] as const; if style === 'vignette'`.

- `expect(gauge).toBeHidden()`

Scope: `const style of ['vignette', 'gauge', 'both'] as const; else of style === 'vignette'`.

- `expect(gauge).toBeVisible()`

Scope: `const style of ['vignette', 'gauge', 'both'] as const; if style === 'gauge'`.

- `expect(vignette).toBeHidden()`

Scope: `const style of ['vignette', 'gauge', 'both'] as const; else of style === 'gauge'`.

- `expect(vignette).toBeVisible()`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction( () => (window.__game as { sub: { position: { y: number } } }).sub.position.y < -10000, )`.

<a id="a045"></a>

**Contract A045 (d2-hazard.spec.ts:L81)** — 'current indicator and snow advect with the measured field'.

Navigation: `page.goto('/?tile=blake-plateau-corals')`.

- `expect(page.locator('.hud-current')).toContainText('kn')`
- `expect(page.locator('.hud-current')).toContainText('m/s')`
- `expect((after.x - before.x) * after.cx + (after.z - before.z) * after.cz).toBeGreaterThan(0)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction( () => (window.__game as { currents: { status: string } }).currents.status === 'ready', )`.

### [d2-predive.spec.ts](../../tests/e2e/d2-predive.spec.ts) — opening framing

5 expanded cases; sum of assigned weights **193.3s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `068231e` — capability introduced here; no specific failed-before defect located. Origin: `068231e predive: game mode selector on Home, briefing Dive settings, settings layout fixes, briefing shows the real start`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **home screen shows the game mode and changes it** — keeps radiogroup, radio, .mode-desc; full list in contract; **18.1s M**; captures **2/0/0**; bug **F `068231e`**; contract [A046](#a046).
- **briefing Dive settings: mode, start and Advanced persist to settings** — keeps radio, .briefing-start input[value=, input[value=, .briefing-begin, button, .mode-custom-tag; full list in contract; **107.6s M**; captures **2/0/0**; bug **F `068231e`**; contract [A047](#a047).
- **briefing previews the near-site start; Begin dive does not teleport** — keeps .briefing; full list in contract; **17.3s M**; captures **0/0/0**; bug **F `068231e`**; contract [A048](#a048).
- **briefing previews the surface start; Begin dive does not teleport** — keeps .briefing; full list in contract; **45.9s M**; captures **0/0/0**; bug **F `068231e`**; contract [A048](#a048).
- **Settings: mode on top of Gameplay, separate waypoint toggles, hull warning, UI scale** — keeps radio, .mode-desc, .mode-custom-tag, Sonar markers; full list in contract; **4.4s M**; captures **0/3/0**; bug **F `068231e`**; contract [A049](#a049).

<a id="a046"></a>

**Contract A046 (d2-predive.spec.ts:L49)** — 'home screen shows the game mode and changes it'.

- `expect(mode).toBeVisible()`
- `expect(mode.getByRole('radiogroup', { name: 'Game mode' })).toBeVisible()`
- `expect(mode.getByRole('radio', { name: 'Arcade' })).toBeChecked()`
- `expect(mode.locator('.mode-desc')).toContainText('Fast travel')`
- `expect(box!.y).toBeGreaterThan(tagline!.y + tagline!.height)`
- `expect(mode.getByRole('radio', { name: 'Realistic' })).toBeChecked()`
- `expect(mode.locator('.mode-desc')).toContainText('Battery, oxygen')`
- `expect((await saved(page)).gameplayMode).toBe('realistic')`
- `expect((await saved(page)).gameplay.speedProfile).toBe('research')`
- `expect(dialog.getByRole('radio', { name: 'Realistic' })).toBeChecked()`
- `expect(mode).toBeVisible()`

Helper guard closure: [boot](#d2-predive-spec-ts-31-boot).

Helper call bindings: `boot(page, '/')`.

<a id="a047"></a>

**Contract A047 (d2-predive.spec.ts:L80)** — 'briefing Dive settings: mode, start and Advanced persist to settings'.

- `expect(briefing).toBeVisible()`
- `expect(dive).toHaveAttribute('aria-label', 'Dive settings')`
- `expect(dive.getByRole('radio', { name: 'Arcade' })).toBeChecked()`
- `expect(dive.locator('.briefing-start input[value="near-site"]')).toBeChecked()`
- `expect(briefing.locator('input[value="near-site"]')).toHaveCount(1)`
- `expect(more).toBeHidden()`
- `expect(toggle).toHaveAttribute('aria-expanded', 'false')`
- `expect(briefing.locator('.briefing-begin')).toBeInViewport()`
- `expect(more).toBeVisible()`
- `expect(briefing).toBeVisible()`
- `expect(briefing.getByRole('button', { name: 'Advanced' })).toHaveAttribute( 'aria-expanded', 'true', )`

Scope: `const label of [ 'Visual waypoints', 'Sonar markers', 'Battery and oxygen', 'Currents', 'Forward speed', ]`.

- `expect(more.getByLabel(label, { exact: true })).toBeVisible()`

Scope: unconditional in this body.

- `expect(briefing.locator('.briefing-begin')).toBeInViewport()`
- `expect(dive.locator('.mode-custom-tag')).toBeVisible()`
- `expect(s.gameplayMode).toBe('custom')`
- `expect(s.gameplay.sonarMarkers).toBe(false)`
- `expect(s.gameplay.visualHints).toBe(true)`
- `expect((await saved(page)).gameplay.currents).toBe('exaggerated')`
- `expect(dive.getByRole('radio', { name: 'Realistic' })).toBeChecked()`
- `expect(briefing).toBeVisible()`
- `expect(s.gameplayMode).toBe('realistic')`
- `expect(more.getByLabel('Visual waypoints', { exact: true })).toHaveValue('false')`
- `expect(more.getByLabel('Battery and oxygen', { exact: true })).toHaveValue('true')`
- `expect(more.getByLabel('Forward speed', { exact: true })).toHaveValue('research')`
- `expect(more.getByLabel('Sonar markers', { exact: true })).toHaveValue('true')`
- `expect(more.getByLabel('Forward speed', { exact: true })).toHaveValue('fast')`
- `expect(await page.evaluate(() => !!document.activeElement?.closest('.briefing'))).toBe(true)`
- ``expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])``
- `expect(page.locator('.briefing-dive').locator('.mode-custom-tag')).toBeVisible()`
- `expect((await saved(page)).gameplay.visualHints).toBe(false)`

Helper guard closure: [boot](#d2-predive-spec-ts-31-boot).

Helper call bindings: `boot(page, '/?mission=titanic')`.

<a id="a048"></a>

**Contract A048 (d2-predive.spec.ts:L158)** — `briefing previews the ${start} start; Begin dive does not teleport`.

Row expansion: `const start of ['near-site', 'surface'] as const`.

- `expect(page.locator('.briefing')).toBeVisible()`
- `expect.poll(async () => (await pose(page)).y, { timeout: 15_000 }).toBeLessThan(-3000)`
- `expect .poll(async () => { const now = await pose(page); const moved = dist(now, near); near = now; return moved; }) .toBeLessThan(0.01)`

Scope: `if start === 'surface'`.

- `expect.poll(async () => (await pose(page)).y).toBeGreaterThan(-50)`
- `expect(dist(surface, near)).toBeGreaterThan(500)`
- `expect(s.gameplay.startPosition).toBe('surface')`
- `expect(s.gameplayMode).toBe('custom')`
- `expect.poll(async () => (await pose(page)).y).toBeLessThan(-3000)`
- `expect.poll(async () => (await pose(page)).y).toBeGreaterThan(-50)`

Scope: unconditional in this body.

- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(dist(started, previewed)).toBeLessThan(1)`

Scope: `if start === 'surface'`.

- `expect(started.y).toBeGreaterThan(-50)`

Scope: `else of start === 'surface'`.

- `expect(started.y).toBeLessThan(-3000)`

Readiness/temporal predicates: `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`; `page.waitForFunction( () => (window.__game as { props: { loaded: boolean } }).props.loaded, )`.

Helper guard closure: [boot](#d2-predive-spec-ts-31-boot).

Helper call bindings: `boot(page, '/?mission=titanic')`.

<a id="a049"></a>

**Contract A049 (d2-predive.spec.ts:L205)** — 'Settings: mode on top of Gameplay, separate waypoint toggles, hull warning, UI scale'.

- `expect(first).toHaveAttribute('type', 'radio')`
- `expect(gameplay.getByRole('radio', { name: 'Arcade' })).toBeChecked()`
- `expect(gameplay.locator('.mode-desc')).toContainText('Fast travel')`

Scope: `const [label, words] of [ ['Visual waypoints', 'dive view'], ['Sonar markers', 'sonar map'], ] as const`.

- `expect(control).toBeVisible()`
- `expect(noteId).toBeTruthy()`
- ``expect(page.locator(`[id="${noteId}"]`)).toContainText(words)``

Scope: unconditional in this body.

- `expect(gameplay.locator('.mode-custom-tag')).toBeVisible()`
- `expect(s.gameplay.sonarMarkers).toBe(false)`
- `expect(s.gameplay.visualHints).toBe(true)`
- `expect(gameplay.getByLabel('Sonar markers', { exact: true })).toHaveValue('true')`
- `expect(s.hullWarningStyle).toBe('gauge')`
- `expect(s.gameplayMode).toBe('arcade')`
- `expect(slider).toHaveAttribute('type', 'range')`
- `expect(value).toHaveText('100%')`
- `expect(value).toHaveText('105%')`
- `expect(value).toHaveText('95%')`
- `expect(value).toHaveText('150%')`
- `expect((await saved(page)).uiScale).toBe(150)`
- `expect(value).toHaveText('80%')`

Scope: `const viewport of [ { width: 1280, height: 720 }, { width: 1920, height: 1080 }, ]; const scale of [80, 100, 125, 150]`.

- ``expect(value).toHaveText(`${scale}%`)``
- ``expect(await fits(), `${viewport.width}x${viewport.height} at ${scale}%`).toEqual({ clipped: false, overlaps: false, })``

Scope: unconditional in this body.

- ``expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])``

Helper guard closure: [boot](#d2-predive-spec-ts-31-boot).

Helper call bindings: `boot(page, '/')`.

### [discovery.spec.ts](../../tests/e2e/discovery.spec.ts) — Journal/debrief

2 expanded cases; sum of assigned weights **97.4s**, 0 fallback keys. Disposition: **fold → journal-debrief.spec.ts**.

Overlap: Journal visibility/count fragments overlap J1/J5 and d-scan; J4 survives with scan events, recorder counts and reload.

History/provenance scope: **F**, `3aec307` — capability introduced here; no specific failed-before defect located. Origin: `3aec307 game: scan beam, discoveries, field guide, debrief and mission flow`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **B1 scan, discovery, Journal › scan the bow, persist across reload, open the Journal** — keeps .scan-panel .scan-hint, .scan-panel .scan-kicker, .scan-panel .scan-name, .jr-nav-item[data-target=, .jr-body .jr-title, .jr-site-entries li.is-locked; full list in contract; **65.7s M**; captures **2/0/0**; bug **F `3aec307`**; contract [A050](#a050).
- **B1 scan, discovery, Journal › ?debrief=1 opens the debrief after a few seconds** — keeps .debrief-title, .debrief-score, .debrief-next, .debrief-btn, .journal; full list in contract; **31.7s M**; captures **1/0/0**; bug **F `3aec307`**; contract [A051](#a051).

<a id="a050"></a>

**Contract A050 (discovery.spec.ts:L68)** — 'scan the bow, persist across reload, open the Journal'.

- `expect(before.discovered).toBe(false)`
- `expect(page.locator('.scan-panel .scan-hint')).toHaveText(/HOLD G TO SCAN/)`
- `expect(mid.phase).toBe('scanning')`
- `expect(mid.progress).toBeGreaterThan(0.1)`
- `expect(page.locator('.scan-panel .scan-kicker')).toHaveText('SCANNING')`
- `expect(names[0]).toBe('scan:started')`
- `expect(names).toContain('scan:progress')`
- `expect(complete).toHaveLength(1)`
- `expect(complete[0]?.payload).toEqual({ poiId: 'test-bow', landmarkId: '_test', firstTime: true, })`
- `expect(names.filter((n) => n === 'scan:started')).toHaveLength(1)`
- `expect(page.locator('.scan-panel .scan-kicker')).toHaveText('NEW ENTRY')`
- `expect(page.locator('.scan-panel .scan-name')).toHaveText('Bow section (fixture)')`
- `expect(saved).not.toBeNull()`
- `expect(doc.version).toBe(1)`
- `expect(doc.discovered['_test/test-bow']?.count).toBe(1)`
- `expect((await probe(page)).discovered).toBe(true)`
- `expect(journal).toBeHidden()`
- `expect(journal).toBeVisible()`
- `expect(journal.locator('.jr-nav-item[data-target="_test"] .jr-nav-meta')).toHaveText( 'THIS DIVE · 2/3', )`
- `expect(journal.locator('.jr-body .jr-title')).toHaveText('Test site · Titanic tile')`
- `expect(journal.locator('.jr-site-entries li.is-locked')).toHaveCount(0)`
- `expect(journal.locator('.jr-site-entries .jr-more-to-find')).toHaveText('1 more to find')`
- `expect(journal.locator('.jr-body .jr-title')).toHaveText('The bow section')`
- `expect(journal.locator('.jr-tag.is-recreation')).toHaveText('Recreation')`
- `expect(journal.locator('.jr-memorial')).toBeVisible()`
- `expect(journal.locator('.jr-facts tr')).toHaveCount(3)`
- `expect(journal.locator('.jr-sources a')).toHaveCount(1)`
- `expect( await page.evaluate( () => (window.__game as { scanner: { enabled: boolean } }).scanner.enabled, ), ).toBe(false)`
- `expect(journal).toBeHidden()`
- `expect(errors, errors.join(' | ')).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction( () => { const g = window.__game as { discovery: { spawnedAt: string | null }; scanner: { view: { candidateId: string | null } }; }; return g.discovery.spawnedAt === 'test-bow' && g.scanner.view.candidateId === 'test-bow'; }, undefined, { timeout: 10_000 }, )`; `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`; `page.waitForFunction( () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded, )`.

Helper guard closure: [boot](#discovery-spec-ts-57-boot), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `boot(page, URL_SCAN)`.

<a id="a051"></a>

**Contract A051 (discovery.spec.ts:L180)** — '?debrief=1 opens the debrief after a few seconds'.

- `expect(debrief).toBeVisible({ timeout: 15_000 })`
- `expect(page.locator('.debrief-title')).toHaveText('Dive debrief')`
- `expect(debrief.locator('.debrief-score')).toContainText('0 scans')`
- `expect(debrief.locator('.debrief-next')).toHaveText('Next: Face a target and hold Scan.')`
- `expect(page.locator('.debrief-btn')).toHaveText(['Dive again', 'Journal'])`
- `expect(page.locator('.journal')).toBeVisible()`
- `expect(page.locator('.journal')).toBeHidden()`
- `expect(debrief).toBeVisible()`
- `expect(debrief).toBeHidden()`
- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [boot](#discovery-spec-ts-57-boot).

Helper call bindings: `boot(page, '/?tile=titanic&landmark=_test&debrief=1')`.

### [f-a11y.spec.ts](../../tests/e2e/f-a11y.spec.ts) — other

7 expanded cases; sum of assigned weights **45.7s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `7a35afe` — accessibility focus/reduced-motion fixes;4f985c6 closed briefing details. Origin: `7a35afe wip(f-a11y-audit): accessibility audit fixes (gates failing: photoMode unit, prettier)`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **system and saved reduced motion apply live to camera, particles, warnings and shutter** — keeps html, .photo-mode, .d2-photo-flash, .hud-warning; full list in contract; **14s M**; captures **0/0/0**; bug **R `7a35afe`**; contract [A052](#a052).
- **home menus and nested dialogs cycle visibly, close with Escape, and restore their opener** — keeps home).toBeVisible(); dialog).toBeVisible(); dialog).toBeHidden(); opener).toBeFocused(); locator('.home-sites')).toBeVisible(); locator('.home-sites')).toBeHidden(); **3.5s M**; captures **0/0/0**; bug **R `7a35afe`**; contract [A053](#a053).
- **standalone globe is keyboard reachable** — keeps locator('.globe:not(.is-embedded)')).toBeVisible(); **3.6s M**; captures **0/0/0**; bug **R `7a35afe`**; contract [A054](#a054).
- **briefing controls and cancellation remain keyboard reachable** — keeps contrast.violations).toEqual([]); briefing).toBeHidden(); locator('.home-screen')).toBeVisible(); **7.9s M**; captures **0/0/0**; bug **R `7a35afe`**; contract [A055](#a055).
- **pause details and mission selection remain keyboard reachable** — keeps locator('.pause-actions')).toBeVisible(); **2.4s M**; captures **0/0/0**; bug **R `7a35afe`**; contract [A056](#a056).
- **controls and Journal cycle focus and restore their pause opener** — keeps controls).toBeFocused(); journalContrast.violations).toEqual([]); journal).toBeFocused(); pause).toBeHidden(); **6.8s M**; captures **0/0/0**; bug **R `7a35afe`**; contract [A057](#a057).
- **photo, HUD and debrief remain keyboard reachable with accessible contrast** — keeps .photo-mode, .mission-debrief, button; full list in contract; **7.5s M**; captures **0/0/0**; bug **R `7a35afe`**; contract [A058](#a058).

<a id="a052"></a>

**Contract A052 (f-a11y.spec.ts:L59)** — 'system and saved reduced motion apply live to camera, particles, warnings and shutter'.

- `expect.poll(reduced).toBe(true)`
- `expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true')`
- `expect(await drawnParticles()).toBe(0)`
- `expect(page.locator('.photo-mode')).toBeVisible()`
- `expect(page.locator('.d2-photo-flash')).not.toHaveClass(/is-active/)`
- `expect.poll(reduced).toBe(false)`
- `expect(await drawnParticles()).toBeGreaterThan(0)`
- `expect.poll(reduced).toBe(true)`
- `expect(await drawnParticles()).toBe(0)`
- `expect(page.locator('.hud-warning')).toHaveCSS('animation-name', 'none')`
- `expect.poll(reduced).toBe(true)`

Helper guard closure: [boot](#f-a11y-spec-ts-9-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `boot(page, '/?tile=titanic&tier=medium')`; `clockFramesUntil( page, () => typeof (window as unknown as { drawnParticles?: number }).drawnParticles === 'number', )`; `clockFramesUntil(page, () => window.__gameReady === true)`.

<a id="a053"></a>

**Contract A053 (f-a11y.spec.ts:L127)** — 'home menus and nested dialogs cycle visibly, close with Escape, and restore their opener'.

- `expect(home).toBeVisible()`

Scope: `const [name, selector] of [ ['Journal', '.journal'], ['Settings', '.settings'], ['Controls', '.settings'], ['Upgrades', '.upgrades'], ]`.

- `expect(dialog).toBeVisible()`
- `expect(dialog).toBeHidden()`
- `expect(opener).toBeFocused()`

Scope: `const name of ['Dive sites', 'Free dive']`.

- `expect(page.locator('.home-sites')).toBeVisible()`
- `expect(page.locator('.home-sites')).toBeHidden()`

Helper guard closure: [boot](#f-a11y-spec-ts-9-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [cycle](#f-a11y-spec-ts-15-cycle).

Helper call bindings: `boot(page, '/?tier=low')`; `cycle(page, home)`; `cycle(page, dialog)`.

<a id="a054"></a>

**Contract A054 (f-a11y.spec.ts:L161)** — 'standalone globe is keyboard reachable'.

- `expect(page.locator('.globe:not(.is-embedded)')).toBeVisible()`

Helper guard closure: [boot](#f-a11y-spec-ts-9-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [cycle](#f-a11y-spec-ts-15-cycle).

Helper call bindings: `boot(page, '/?mission=titanic&tier=low&skipBriefing=1&globe=1')`; `cycle(page, page.locator('.globe:not(.is-embedded)'))`.

<a id="a055"></a>

**Contract A055 (f-a11y.spec.ts:L167)** — 'briefing controls and cancellation remain keyboard reachable'.

- `expect(contrast.violations).toEqual([])`
- `expect(briefing).toBeHidden()`
- `expect(page.locator('.home-screen')).toBeVisible()`

Helper guard closure: [boot](#f-a11y-spec-ts-9-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [cycle](#f-a11y-spec-ts-15-cycle), [withClockFrames](#helpers-clock-ts-33-withclockframes).

Helper call bindings: `boot(page, '/?mission=titanic&tier=low')`; `cycle(page, briefing)`; `withClockFrames(page, () => new AxeBuilder({ page }) .include('.briefing') .withRules(['color-contrast', 'button-name']) .analyze(), )`.

<a id="a056"></a>

**Contract A056 (f-a11y.spec.ts:L185)** — 'pause details and mission selection remain keyboard reachable'.

Scope: `const name of ['Objectives', 'Mission select']`.

- `expect(page.locator('.pause-actions')).toBeVisible()`

Helper guard closure: [boot](#f-a11y-spec-ts-9-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [cycle](#f-a11y-spec-ts-15-cycle).

Helper call bindings: `boot(page, '/?mission=titanic&tier=low&skipBriefing=1')`; `cycle(page, pause)`.

<a id="a057"></a>

**Contract A057 (f-a11y.spec.ts:L207)** — 'controls and Journal cycle focus and restore their pause opener'.

- `expect(controls).toBeFocused()`
- `expect(journalContrast.violations).toEqual([])`
- `expect(journal).toBeFocused()`
- `expect(pause).toBeHidden()`

Helper guard closure: [boot](#f-a11y-spec-ts-9-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [cycle](#f-a11y-spec-ts-15-cycle), [withClockFrames](#helpers-clock-ts-33-withclockframes).

Helper call bindings: `boot(page, '/?mission=titanic&tier=low&skipBriefing=1')`; `cycle(page, page.locator('.controls-card'))`; `cycle(page, page.locator('.journal'))`; `withClockFrames(page, () => new AxeBuilder({ page }) .include('.journal') .withRules(['color-contrast', 'button-name']) .analyze(), )`.

<a id="a058"></a>

**Contract A058 (f-a11y.spec.ts:L234)** — 'photo, HUD and debrief remain keyboard reachable with accessible contrast'.

- `expect(page.locator('.photo-mode')).toBeVisible()`
- `expect(page.locator('.photo-mode')).toBeHidden()`
- `expect(hud.violations).toEqual([])`
- `expect(page.locator('.mission-debrief')).toBeHidden()`
- `expect(page.getByRole('button', { name: 'Sonar zoom in' })).toHaveAttribute( 'aria-label', 'Sonar zoom in', )`
- `expect(page.getByRole('button', { name: 'Sonar zoom out' })).toHaveAttribute( 'aria-label', 'Sonar zoom out', )`

Helper guard closure: [boot](#f-a11y-spec-ts-9-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [cycle](#f-a11y-spec-ts-15-cycle), [withClockFrames](#helpers-clock-ts-33-withclockframes).

Helper call bindings: `boot(page, '/?mission=titanic&tier=low&skipBriefing=1')`; `cycle(page, page.locator('.photo-mode'))`; `withClockFrames(page, () => new AxeBuilder({ page }).include('.hud').withRules(['color-contrast', 'button-name']).analyze(), )`; `cycle(page, page.locator('.mission-debrief'))`.

### [f-arcade-access.spec.ts](../../tests/e2e/f-arcade-access.spec.ts) — opening framing

3 expanded cases; sum of assigned weights **54.2s**, 1 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `dd670cb` — capability introduced here; no specific failed-before defect located. Origin: `dd670cb F-ARCADE-ACCESS: no depth gating in Arcade; composed near-site opening; golden-shots tool`.

Profile/skip controls (variables expanded by rows below): `test.use({ storageState: { cookies: [], origins: [] } })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **fresh Arcade Titanic starts on an approach in its deep-ocean vehicle** — keeps .briefing-start input[value=, .briefing, .obj-item.is-current, .progress-hull-notice; full list in contract; **45s F**; captures **1/0/0**; bug **F `dd670cb`**; contract [A059](#a059).
- **Arcade opens every card on a phone; switching to Realistic restores locks** — keeps .mission-lock, .is-mission:disabled, [data-mission=, .is-mission:not(:disabled); full list in contract; **4.3s M**; captures **2/0/0**; bug **F `dd670cb`**; contract [A060](#a060).
- **a fresh Realistic shared Titanic link keeps the coastal hull and opens free dive** — keeps .progress-hull-notice; full list in contract; **4.9s M**; captures **1/0/0**; bug **F `dd670cb`**; contract [A061](#a061).

<a id="a059"></a>

**Contract A059 (f-arcade-access.spec.ts:L22)** — 'fresh Arcade Titanic starts on an approach in its deep-ocean vehicle'.

Navigation: `page.goto('/?mission=titanic&tutorial=0')`.

- `expect(page.locator('.briefing-start input[value="near-site"]')).toBeChecked()`
- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(pose.lifetime).toBe(0)`
- `expect(-pose.depth).toBeGreaterThan(3500)`
- `expect(pose.altitude).toBeGreaterThan(10)`
- `expect(pose.altitude).toBeLessThan(80)`
- `expect(pose.wreckRange).toBeGreaterThan(8)`
- `expect(pose.primaryRange).toBeCloseTo(220, 0)`
- `expect(pose.primaryRange).toBeGreaterThan(pose.scanRadius)`
- `expect(pose.facing).toBeGreaterThan(0.999)`
- `expect(page.locator('.obj-item.is-current')).toContainText('Head to the bow')`
- `expect(pose.hull).toBe('B')`
- `expect(pose.vehicle).toBe('B')`
- `expect(pose.missionHull).toBe('B')`
- `expect(pose.rating).toBe(6500)`
- `expect(pose.rating).toBeGreaterThan(pose.siteDepth)`
- `expect(pose.breached).toBe(false)`
- `expect(page.locator('.progress-hull-notice')).toHaveCount(0)`

Helper guard closure: [ready](#f-arcade-access-spec-ts-10-ready).

Helper call bindings: `ready(page)`.

<a id="a060"></a>

**Contract A060 (f-arcade-access.spec.ts:L82)** — 'Arcade opens every card on a phone; switching to Realistic restores locks'.

Navigation: `page.goto('/?tutorial=0')`.

- `expect(sites.locator('.mission-lock')).toHaveCount(0)`
- `expect(sites.locator('.is-mission:disabled')).toHaveCount(0)`
- `expect(sites.locator('[data-mission="titanic"]')).toBeEnabled()`
- `expect(sites.locator('[data-mission="challenger-deep"]')).toBeEnabled()`
- `expect(sizes.length).toBeGreaterThanOrEqual(13)`
- `expect(sizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true)`
- `expect(sites.locator('[data-mission="titanic"]')).toBeDisabled()`
- `expect(sites.locator('[data-mission="titanic"] .mission-lock')).toContainText( 'Class B · 300 lifetime RP', )`
- `expect(sites.locator('[data-mission="challenger-deep"] .mission-lock')).toContainText( 'Class C · 900 lifetime RP', )`
- `expect(sites.locator('.is-mission:not(:disabled)')).toHaveCount(4)`
- `expect(sites.locator('.mission-lock')).toHaveCount(0)`
- `expect(sites.locator('[data-mission="titanic"]')).toBeEnabled()`

Helper guard closure: [ready](#f-arcade-access-spec-ts-10-ready).

Helper call bindings: `ready(page)`.

<a id="a061"></a>

**Contract A061 (f-arcade-access.spec.ts:L128)** — 'a fresh Realistic shared Titanic link keeps the coastal hull and opens free dive'.

Navigation: `page.goto('/?mission=titanic&tutorial=0')`.

- `expect(page.locator('.progress-hull-notice')).toContainText('Class B · 300 lifetime RP')`
- `expect(page).toHaveURL(/tile=titanic/)`
- `expect(state).toEqual({ hull: 'A', rating: -1000, vehicle: 'A', mission: null })`

Helper guard closure: [ready](#f-arcade-access-spec-ts-10-ready).

Helper call bindings: `ready(page)`.

### [f-beebe-framing-680.spec.ts](../../tests/e2e/f-beebe-framing-680.spec.ts) — opening framing

3 expanded cases; sum of assigned weights **181.6s**, 0 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `bb2fedc` — Beebe tip/subject opening placement correction; visual tuning, not every predicate independently reproduced. Origin: `bb2fedc feat(680): f-beebe-framing (Codex)`.

Profile/skip controls (variables expanded by rows below): .

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Beebe opening and ten seconds: desktop-high** — keeps framing.chase, framing.failedProps, framing.apron, framing.rubble, framing.tip; full list in contract; **108.7s M**; captures **2/0/0**; bug **R `bb2fedc`**; contract [A062](#a062).
- **Beebe opening and ten seconds: portrait-high** — keeps framing.chase, framing.failedProps, framing.apron, framing.rubble, framing.tip; full list in contract; **48s M**; captures **2/0/0**; bug **R `bb2fedc`**; contract [A062](#a062).
- **Beebe opening and ten seconds: portrait-low** — keeps framing.chase, framing.failedProps, framing.apron, framing.rubble, framing.tip; full list in contract; **24.9s M**; captures **2/0/0**; bug **R `bb2fedc`**; contract [A062](#a062).

<a id="a062"></a>

**Contract A062 (f-beebe-framing-680.spec.ts:L21)** — `Beebe opening and ten seconds: ${view.name}`.

Row expansion: `const view of [ { name: 'desktop-high', width: 1600, height: 900, tier: 'high' }, { name: 'portrait-high', width: 390, height: 844, tier: 'high' }, { name: 'portrait-low', width: 390, height: 844, tier: 'low' }, ]`.

Navigation: ``page.goto( `/?tile=beebe-vent-field&skipBriefing=1&tutorial=0&tier=${view.tier}${view.width < view.height ? '&touch=1' : ''}`, )``.

Scope: `const second of [0, 10]`.

- `expect(framing.chase).toBe('chase')`
- `expect(framing.failedProps).toBe(0)`
- `expect(framing.apron).toBe(true)`
- `expect(framing.rubble).toBe(true)`
- `expect(framing.tip[0]).toBeLessThan(-0.1)`
- `expect(Math.abs(framing.tip[0]!)).toBeLessThan(0.9)`
- `expect(Math.abs(framing.tip[1]!)).toBeLessThan(0.9)`

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => { const game = window.__game as unknown as BeebeGame | undefined; return window.__gameReady && game?.props.loaded && game.discovery.loaded; })`.

### [f-beebe-plumes.spec.ts](../../tests/e2e/f-beebe-plumes.spec.ts) — rendering/visual

1 expanded cases; sum of assigned weights **206.5s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `5638cdd` — capability introduced here; no specific failed-before defect located. Origin: `5638cdd wip(f-beebe-plumes): billowing smoke plume, orifice shimmer, unit + e2e spec`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **F-BEEBE-PLUMES › smoker plumes billow; screenshots; low tier is lighter** — keeps high.n).toBeGreaterThan(0); errors).toEqual([]); low.n).toBeGreaterThan(0); low.particles / low.n).toBeLessThan(high.particles / high.n); **206.5s M**; captures **4/0/0**; bug **F `5638cdd`**; contract [A063](#a063).

<a id="a063"></a>

**Contract A063 (f-beebe-plumes.spec.ts:L76)** — 'smoker plumes billow; screenshots; low tier is lighter'.

- `expect(high.n).toBeGreaterThan(0)`
- `expect(errors).toEqual([])`
- `expect(low.n).toBeGreaterThan(0)`
- `expect(low.particles / low.n).toBeLessThan(high.particles / high.n)`
- `expect(errors).toEqual([])`

Failure guards: `throw new Error('no plume');`.

Helper guard closure: [load](#f-beebe-plumes-spec-ts-39-load).

Helper call bindings: `load(page, 'high')`; `load(page, 'low')`.

### [f-bluehole-1030.spec.ts](../../tests/e2e/f-bluehole-1030.spec.ts) — rendering/visual

1 expanded cases; sum of assigned weights **170.6s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `e4d7ccd` — capability introduced here; no specific failed-before defect located. Origin: `e4d7ccd feat(1030): Blue Hole ledges, Low-tier mesh refinement, stronger horizon haze`.

Profile/skip controls (variables expanded by rows below): .

Selector/fixture constants: `changedSources = [ 'src/world/terrainFeatures.ts', 'src/world/TerrainBiome.ts', 'src/world/Terrain.ts', 'src/core/config/terrain.ts', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1030 Blue Hole: desktop + portrait Low golden comparison and frame budgets** — keeps '1030 Blue Hole: desktop + portrait Low golden comparison and frame budgets'; full list in contract; **170.6s M**; captures **10 golden clean /20 dirty; 0 locator/photo**; bug **F `e4d7ccd`**; contract [A064](#a064).

<a id="a064"></a>

**Contract A064 (f-bluehole-1030.spec.ts:L40)** — '1030 Blue Hole: desktop + portrait Low golden comparison and frame budgets'.

- `expect(sheet).toBeTruthy()`
- `expect(manifest.complete).toBe(true)`
- `expect(manifest.failures).toEqual([])`
- `expect(manifest.captures).toHaveLength(10)`

Scope: `const shot of manifest.captures`.

- `expect(shot.tier).toBe('low')`
- `expect(shot.failedProps).toBe(0)`
- `expect(shot.triangles).toBeGreaterThan(0)`
- `expect(shot.triangles, shot.filename).toBeLessThan(500_000)`

Scope: `if changed.trim()`.

- `expect(url).toBeTruthy()`

Scope: `const shot of after.captures`.

- `expect(shot.terrain.vertices).toBeLessThan(500_000)`
- `expect(shot.terrain.subdivisionCounts?.[16]).toBeGreaterThan(0)`

Scope: `const shot of after.captures; if previous`.

- `expect(shot.heroGeometry, shot.filename).toEqual(previous.heroGeometry)`

Helper guard closure: [capture](#f-bluehole-1030-spec-ts-57-capture).

Helper call bindings: `capture(url!, 'before')`; `capture(baseURL!, 'after')`.

### [f-bluehole-squiggle.spec.ts](../../tests/e2e/f-bluehole-squiggle.spec.ts) — rendering/visual

1 expanded cases; sum of assigned weights **45.0s**, 1 fallback keys. Disposition: **split: numeric/functional guards ordinary; review captures nightly**.

Overlap: Golden5-pose capture shapes overlap golden tool, butmaterial ablations/parity/conditional brightness are unique; ordinarymaterial +nightly evidence.

History/provenance scope: **R**, `04d42fe` — terrace/material visual correction; historical contour-map evidence in f-bluehole-squiggle.md. [material/readability evidence](f-bluehole-squiggle.md). Origin: `04d42fe feat(bluehole): terraced sediment beds on gallery apron (1280)`.

Profile/skip controls (variables expanded by rows below): .

Selector/fixture constants: `sources = [ 'src/core/config/props.ts', 'src/world/props/geo/stalactites.ts', 'src/world/props/geo/talus.ts', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1280 Blue Hole: golden sediment terraces, brightness and floor material bisect** — keeps p.meshes.map, m.vertices; full list in contract; **45s F**; captures **9 page/golden clean /14 dirty;0 locator/photo**; bug **R `04d42fe`**; contract [A065](#a065).

<a id="a065"></a>

**Contract A065 (f-bluehole-squiggle.spec.ts:L54)** — '1280 Blue Hole: golden sediment terraces, brightness and floor material bisect'.

Navigation: ``page.goto(`${baseURL}/?tile=great-blue-hole&tier=high&tutorial=0&lifeSeed=42&dynres=0`)``.

- `expect(sheet, stdout).toBeTruthy()`
- `expect(manifest.complete).toBe(true)`
- `expect(manifest.failures).toEqual([])`
- `expect(manifest.captures).toHaveLength(5)`

Scope: `const shot of manifest.captures`.

- `expect(shot.tier).toBe('high')`
- `expect(shot.failedProps).toBe(0)`
- `expect(shot.triangles).toBeGreaterThan(0)`

Scope: `const shot of after.captures; if previous`.

- `expect(shot.heroGeometry.map((p) => p.meshes.map((m) => m.vertices))).toEqual( previous.heroGeometry.map((p) => p.meshes.map((m) => m.vertices)), )`

Scope: unconditional in this body.

- `expect(materialEvidence.apronMap).toBe(false)`
- `expect(materialEvidence.apronBump).toBe(false)`
- `expect(materialEvidence.terrainContrast).toEqual([0, 0, 0])`
- `expect(materialEvidence.terrainNormalStrength).toBe(0)`
- `expect(errors).toEqual([])`

Scope: `if before`.

- `expect(means[1]).toBeGreaterThanOrEqual(means[0] * 0.97)`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady && (window.__game as unknown as FloorGame).props.loaded, )`.

Helper guard closure: [capture](#f-bluehole-squiggle-spec-ts-64-capture).

Helper call bindings: `capture(server.resolvedUrls!.local[0], 'before')`; `capture(baseURL!, 'after')`.

### [f-briefing-900.spec.ts](../../tests/e2e/f-briefing-900.spec.ts) — Journal/debrief

8 expanded cases; sum of assigned weights **288.0s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Briefing fit fragmentstext-diet/d2-predive; facts/duplicates/hazards andAbout-site Journal remain. Not a step2 source.

History/provenance scope: **F**, `bc3f61f` — capability introduced here; no specific failed-before defect located. Origin: `bc3f61f wip(900): compact briefing (Codex)`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **titanic compact briefing 1600x900** — keeps .briefing-controls, button, .briefing-objectives li, link, radio, .briefing-begin; full list in contract; **60.1s M**; captures **1/0/0**; bug **F `bc3f61f`**; contract [A066](#a066).
- **titanic compact briefing 390x844** — keeps .briefing-controls, button, .briefing-objectives li, link, radio, .briefing-begin; full list in contract; **16.1s M**; captures **1/0/0**; bug **F `bc3f61f`**; contract [A066](#a066).
- **titanic compact briefing 844x390** — keeps .briefing-controls, button, .briefing-objectives li, link, radio, .briefing-begin; full list in contract; **24.2s M**; captures **1/0/0**; bug **F `bc3f61f`**; contract [A066](#a066).
- **titanic Journal preserves site details before a scan** — keeps .jr-site-top .jr-para, summary; full list in contract; **5.4s M**; captures **0/0/0**; bug **F `bc3f61f`**; contract [A067](#a067).
- **great-blue-hole compact briefing 1600x900** — keeps .briefing-controls, button, .briefing-objectives li, link, radio, .briefing-begin; full list in contract; **102.6s M**; captures **1/0/0**; bug **F `bc3f61f`**; contract [A066](#a066).
- **great-blue-hole compact briefing 390x844** — keeps .briefing-controls, button, .briefing-objectives li, link, radio, .briefing-begin; full list in contract; **41s M**; captures **1/0/0**; bug **F `bc3f61f`**; contract [A066](#a066).
- **great-blue-hole compact briefing 844x390** — keeps .briefing-controls, button, .briefing-objectives li, link, radio, .briefing-begin; full list in contract; **33.7s M**; captures **1/0/0**; bug **F `bc3f61f`**; contract [A066](#a066).
- **great-blue-hole Journal preserves site details before a scan** — keeps .jr-site-top .jr-para, summary; full list in contract; **4.9s M**; captures **0/0/0**; bug **F `bc3f61f`**; contract [A067](#a067).

<a id="a066"></a>

**Contract A066 (f-briefing-900.spec.ts:L17)** — `${mission.landmark} compact briefing ${viewport.width}x${viewport.height}`.

Row expansion: `const mission of [titanic, blueHole]`; `const viewport of viewports`.

Navigation: ``page.goto(`/?mission=${mission.landmark}&tier=low`)``.

- `expect(briefing).toBeVisible()`
- `expect(summary).toHaveText('About this site')`
- `expect(more).not.toHaveAttribute('open', '')`

Scope: `const kind of ['facts', 'hazards']`.

- ``expect(briefing.locator(`.briefing-section.is-${kind} li:visible`)).toHaveCount(0)``

Scope: unconditional in this body.

- `expect(briefing.locator('.briefing-controls')).toHaveCount(0)`
- `expect(briefing.getByRole('button', { name: 'View controls' })).toHaveCount(0)`

Scope: `const objective of await briefing.locator('.briefing-objectives li').all()`.

- `expect(objective).toBeInViewport({ ratio: 1 })`

Scope: unconditional in this body.

- `expect(briefing.locator('.briefing-objectives li')).toHaveCount( mission.objectives.length, )`
- `expect(briefing.getByRole('link', { name: 'Free dive', exact: true })).toBeVisible()`
- `expect( briefing.getByRole('radio', { name: 'near the first target', exact: true }), ).toBeChecked()`
- `expect( briefing.getByRole('radio', { name: 'at the surface', exact: true }), ).not.toBeChecked()`
- `expect(briefing.getByRole('button', { name: 'Begin dive', exact: true })).toBeVisible()`

Scope: `if viewport.height > viewport.width || viewport.width === 1600`.

- `expect(metrics.scroll, 'Default briefing must fit without scrolling').toBeLessThanOrEqual( 1, )`
- `expect(metrics.horizontal).toBeLessThanOrEqual(1)`
- `expect(metrics.top).toBeGreaterThanOrEqual(0)`
- `expect(metrics.bottom).toBeLessThanOrEqual(viewport.height)`
- `expect(briefing.locator('.briefing-begin')).toBeInViewport({ ratio: 1 })`

Scope: unconditional in this body.

- `expect(more).toHaveAttribute('open', '')`
- `expect(briefing).toBeVisible()`
- `expect(more.locator('.briefing-summary')).toHaveText(mission.briefing.summary)`
- `expect(briefing.locator('.is-facts li')).toHaveText(mission.briefing.facts)`
- `expect(briefing.locator('.is-hazards li')).toHaveText( mission.briefing.hazards.filter((hazard) => !/Class [ABC]/.test(hazard)), )`
- `expect(more).not.toHaveAttribute('open', '')`
- `expect(briefing).toBeVisible()`
- ``expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])``
- `expect(new URL(page.url()).searchParams.get('tile')).toBe(mission.tile)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction( () => (window.__game as { props: { loaded: boolean } }).props.loaded, )`; `page.waitForURL((url) => !url.searchParams.has('mission'))`.

<a id="a067"></a>

**Contract A067 (f-briefing-900.spec.ts:L98)** — `${mission.landmark} Journal preserves site details before a scan`.

Row expansion: `const mission of [titanic, blueHole]`.

Navigation: `page.goto('/?tier=low')`.

- ``expect(journal.locator(`.jr-site-card[data-target="${mission.landmark}"]`)).toBeVisible()``
- `expect(journal.locator('.jr-site-top .jr-para')).toHaveText(mission.briefing.summary)`
- `expect(more.locator('summary')).toHaveText('About this site')`
- `expect(items.length).toBeGreaterThan(0)`

Scope: `const item of items`.

- `expect(source.some((line) => line.includes(item))).toBe(true)`

Scope: unconditional in this body.

- `expect(new Set(items).size).toBe(items.length)`
- `expect(items.join(' ')).not.toMatch(/hull (is|can)\b|rated depth|hull warning/i)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

### [f-bughunt-1090.spec.ts](../../tests/e2e/f-bughunt-1090.spec.ts) — perf

32 expanded cases; sum of assigned weights **1440.0s**, 32 fallback keys. Disposition: **retain ordinary capability guard; existing opt-in/local-only restrictions recorded**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `69cf61f` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `69cf61f feat(1090): collected Codex work`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: layout, hasTouch: layout.touch, isMobile: layout.touch, deviceScaleFactor: 1, serviceWorkers: 'block', storageState: { cookies: [], origins: [] }, })`; `test.skip( !!process.env.CI, 'reason: software-GL hosted runners cannot sustain the frame counts; covered by local full e2e', )`; `test.skip(!!process.env.CI, 'frame-rate dependent; software GL on hosted runners')`; `test.skip(!!process.env.CI, 'frame-rate dependent; software GL on hosted runners')`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1090 desktop › titanic: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › challenger-deep: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › lost-city: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › monterey-canyon: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › endurance: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › axial-seamount-ashes: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › hudson-canyon: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › kamaehuakanaloa: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › beebe-vent-field: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › great-blue-hole: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › bismarck: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › hunga-tonga-caldera: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › blake-plateau-corals: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 desktop › monterey-canyon: chase arm clears terrain during forward travel and a turn** — keeps sample.frames, sample.minArm, sample.clearance, sample.minEye, sample.surfaceViolations, sample.breached; full list in contract; **45s F**; captures **1/0/0 local**; bug **U `69cf61f`**; contract [A069](#a069); hosted body-time skip.
- **1090 desktop › beebe-vent-field: chase arm clears terrain during forward travel and a turn** — keeps sample.frames, sample.minArm, sample.clearance, sample.minEye, sample.surfaceViolations, sample.breached; full list in contract; **45s F**; captures **1/0/0 local**; bug **U `69cf61f`**; contract [A069](#a069); hosted body-time skip.
- **1090 desktop › titanic: chase arm clears terrain during forward travel and a turn** — keeps sample.frames, sample.minArm, sample.clearance, sample.minEye, sample.surfaceViolations, sample.breached; full list in contract; **45s F**; captures **1/0/0 local**; bug **U `69cf61f`**; contract [A069](#a069); hosted body-time skip.
- **1090 portrait › titanic: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › challenger-deep: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › lost-city: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › monterey-canyon: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › endurance: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › axial-seamount-ashes: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › hudson-canyon: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › kamaehuakanaloa: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › beebe-vent-field: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › great-blue-hole: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › bismarck: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › hunga-tonga-caldera: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › blake-plateau-corals: Low opening and real 60 s idle render without clipping or errors** — keeps sample.elapsedMs, sample.frames, sample.failed, sample.breached, sample.minHull, sample.minEye; full list in contract; **45s F**; captures **2/0/0 enabled**; bug **U `69cf61f`**; contract [A068](#a068); hosted body-time skip.
- **1090 portrait › monterey-canyon: chase arm clears terrain during forward travel and a turn** — keeps sample.frames, sample.minArm, sample.clearance, sample.minEye, sample.surfaceViolations, sample.breached; full list in contract; **45s F**; captures **1/0/0 local**; bug **U `69cf61f`**; contract [A069](#a069); hosted body-time skip.
- **1090 portrait › beebe-vent-field: chase arm clears terrain during forward travel and a turn** — keeps sample.frames, sample.minArm, sample.clearance, sample.minEye, sample.surfaceViolations, sample.breached; full list in contract; **45s F**; captures **1/0/0 local**; bug **U `69cf61f`**; contract [A069](#a069); hosted body-time skip.
- **1090 portrait › titanic: chase arm clears terrain during forward travel and a turn** — keeps sample.frames, sample.minArm, sample.clearance, sample.minEye, sample.surfaceViolations, sample.breached; full list in contract; **45s F**; captures **1/0/0 local**; bug **U `69cf61f`**; contract [A069](#a069); hosted body-time skip.

<a id="a068"></a>

**Contract A068 (f-bughunt-1090.spec.ts:L44)** — `${site}: Low opening and real 60 s idle render without clipping or errors`.

Row expansion: `const layout of [ { name: 'desktop', width: 1280, height: 800, touch: false }, { name: 'portrait', width: 390, height: 844, touch: true }, ]`; `const site of index.landmarks`.

Navigation: ``page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, { waitUntil: 'domcontentloaded', })``.

- `expect(errors).toEqual([])`
- `expect(sample.elapsedMs).toBeGreaterThanOrEqual(60_000)`
- `expect(sample.frames).toBeGreaterThan(30)`
- `expect(sample.failed).toBe(0)`
- `expect(sample.breached).toBe(false)`
- `expect(sample.minHull).toBeGreaterThan(0)`
- `expect(sample.minEye).toBeGreaterThanOrEqual(sample.clearance - 1e-5)`
- `expect(sample.minArm).toBeGreaterThanOrEqual(sample.clearance - 1e-5)`
- `expect(sample.propContacts).toBe(0)`
- `expect(sample.surfaceViolations).toBe(0)`
- `expect(sample.tier).toBe('low')`
- `expect(sample.countersMatch).toBe(true)`
- `expect(sample.calls).toBeGreaterThan(0)`
- `expect(sample.triangles).toBeGreaterThan(10_000)`
- `expect(sample.calls).toBeLessThanOrEqual(1500)`
- `expect(sample.triangles).toBeLessThanOrEqual(1_500_000)`

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game; return window.__gameReady && g.props.loaded && g.discovery.loaded && g.explore.ready; })`.

<a id="a069"></a>

**Contract A069 (f-bughunt-1090.spec.ts:L173)** — `${site}: chase arm clears terrain during forward travel and a turn`.

Row expansion: `const layout of [ { name: 'desktop', width: 1280, height: 800, touch: false }, { name: 'portrait', width: 390, height: 844, touch: true }, ]`; `const site of ['monterey-canyon', 'beebe-vent-field', 'titanic']`.

Navigation: ``page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, { waitUntil: 'domcontentloaded', })``.

- `expect(errors).toEqual([])`
- `expect(Math.hypot(...samples[0].position.map((v, i) => v - start[i]))).toBeGreaterThan(10)`

Scope: `const sample of samples`.

- `expect(sample.frames).toBeGreaterThan(5)`
- `expect(sample.minArm).toBeGreaterThanOrEqual(sample.clearance - 1e-5)`
- `expect(sample.minEye).toBeGreaterThanOrEqual(sample.clearance - 1e-5)`
- `expect(sample.surfaceViolations).toBe(0)`
- `expect(sample.breached).toBe(false)`

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game; return window.__gameReady && g.props.loaded && g.discovery.loaded && g.explore.ready; })`.

### [f-bughunt-15.spec.ts](../../tests/e2e/f-bughunt-15.spec.ts) — HUD/touch layout

30 expanded cases; sum of assigned weights **219.9s**, 0 fallback keys. Disposition: **fold → hud-touch.spec.ts**.

Overlap: H5 three phases share a boot and identical site/viewport/scale; sequence keeps all phases. Other HUD sources use different fixture/scale/state.

History/provenance scope: **R**, `2647826` — known360×640/150% HUD overlap previously fixme at f5a69f8;be55bfc original overlap fixes. Origin: `be55bfc F-BUGHUNT-15: touch overlap fixes, HUD`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport, hasTouch: true, isMobile: true })`.

Selector/fixture constants: `heroes = [ { site: 'titanic', poi: 'titanic-bow' }, { site: 'lost-city', poi: 'lost-city-poseidon' }, { site: 'great-blue-hole', poi: 'great-blue-hole-stalactites' }, { site: 'beebe-vent-field', poi: 'bvf-main-vents' }, { site: 'monterey-canyon', poi: 'monterey-canyon-wall' }, ]`; `hud = [ '.sonar', '.objectives-panel', '.hud-readouts', '.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **hero touch HUD 360x640 › titanic 100%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **3.8s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 360x640 › titanic 100%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **6.6s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 360x640 › titanic 100%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **3.9s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 360x640 › beebe-vent-field 100%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **3.8s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 360x640 › beebe-vent-field 100%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **8.1s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 360x640 › beebe-vent-field 100%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **8.8s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 360x640 › beebe-vent-field 150%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **4.2s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 360x640 › beebe-vent-field 150%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **7.1s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 360x640 › beebe-vent-field 150%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **7.4s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › lost-city 100%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **4.8s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › lost-city 100%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **5s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › lost-city 100%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **10.4s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › beebe-vent-field 100%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **5.1s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › beebe-vent-field 100%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **8.3s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › beebe-vent-field 100%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **10.2s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › beebe-vent-field 150%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **2.7s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › beebe-vent-field 150%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **5.1s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › beebe-vent-field 150%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **9.1s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › monterey-canyon 100%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **7.6s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › monterey-canyon 100%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **15.5s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 390x844 › monterey-canyon 100%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **9.5s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 844x390 › great-blue-hole 100%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **6.2s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 844x390 › great-blue-hole 100%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **13.9s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 844x390 › great-blue-hole 100%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **10.9s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 844x390 › beebe-vent-field 100%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **4.5s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 844x390 › beebe-vent-field 100%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **5.8s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 844x390 › beebe-vent-field 100%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **10.9s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 844x390 › beebe-vent-field 150%: opening, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **3.7s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 844x390 › beebe-vent-field 150%: tutorial steps, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **8.1s M**; captures **1/0/0**; bug **R `2647826`**; contract [A070](#a070).
- **hero touch HUD 844x390 › beebe-vent-field 150%: contextual hint, contact and controls stay separate** — keeps .hud-attribution, .scan-panel, .hud-control-tips, .hud-prompt, .tc-rotate-hint, .onboard-card; full list in contract; **8.9s M**; captures **0/0/0**; bug **R `2647826`**; contract [A070](#a070).

<a id="a070"></a>

**Contract A070 (f-bughunt-15.spec.ts:L92)** — `${hero.site} ${uiScale}%: ${phase}, contact and controls stay separate`.

Row expansion: `const viewport of [ { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }, ]`; `const hero of heroes.filter( (hero, index) => hero.site === 'beebe-vent-field' || index % 3 === (viewport.width === 360 ? 0 : viewport.width === 390 ? 1 : 2), )`; `const uiScale of hero.site === 'beebe-vent-field' ? [100, 150] : [100]`; `const phase of ['opening', 'tutorial steps', 'contextual hint']`.

Navigation: ``page.goto(`/?mission=${hero.site}&skipBriefing=1&touch=1&tier=low`)``.

- `expect( await page.evaluate(() => (window.__game as { save: Save }).save.get().gameplayMode), ).toBe('arcade')`
- `expect( await page.evaluate(() => (window.__game as { save: Save }).save.get().uiScale), ).toBe(uiScale)`

Scope: `if phase === 'opening'`.

- `expect(page.locator('.hud-attribution')).toHaveCount(0)`

Scope: unconditional in this body.

- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(page.locator('.hud-control-tips')).toBeHidden()`
- `expect(page.locator('.hud-prompt')).toBeHidden()`

Scope: `if viewport.width < viewport.height`.

- `expect(page.locator('.tc-rotate-hint')).toBeHidden()`

Scope: `const step of ['move', 'depth', 'lights', 'scan', 'journal']`.

- `expect(page.locator('.onboard-card')).toHaveAttribute('data-step', step)`

Scope: unconditional in this body.

- `expect(page.locator('.onboard-card')).toBeHidden()`
- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(page.locator('.scan-hint')).toHaveCount(1)`
- `expect(page.locator('.hud-prompt')).toBeHidden()`
- `expect( page.getByText('Something to scan is in range', { exact: false }), ).toBeHidden()`
- `expect(page.locator('.onboard-hint')).not.toContainText( /Something to scan is in range|Face the target\. Hold .* to scan\./, )`
- `expect( await page.evaluate(() => (window.__game as { onboard: { hints: HintEngine } }).onboard.hints.hasSeen( 'scan-target', ), ), ).toBe(false)`

Failure guards: ``throw new Error(`Missing hero POI ${poi}`);``.

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [separate](#f-bughunt-15-spec-ts-29-separate).

Helper call bindings: `clockFramesUntil(page, () => { const game = window.__game as { discovery: Discovery; props: { loaded: boolean } }; return window.__gameReady === true && game.discovery.loaded && game.props.loaded; })`; `separate(page, fresh)`; `clockFramesUntil( page, () => !!(window.__game as { discovery: Discovery }).discovery.scanner.view.nearestInRange, )`; `separate(page, [...hud, '.onboard-card', '.scan-panel'])`; `separate(page, after)`.

### [f-bughunt-18.spec.ts](../../tests/e2e/f-bughunt-18.spec.ts) — opening framing

8 expanded cases; sum of assigned weights **161.5s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `b6997c1` — Lost City spawn/camera/loadout reset defect;04d42fe later authored66m alignment retained all functional guards. Origin: `b6997c1 fix: Lost City camera bughunt 18 (spawn, camera rig, loadout)`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Lost City tile: reset, wheel and photo at 1600x900** — keeps .briefing, .photo-mode; full list in contract; **67.1s M**; captures **3/0/0**; bug **R `b6997c1`**; contract [A071](#a071).
- **Lost City mission: reset, wheel and photo at 844x390** — keeps .briefing, .photo-mode; full list in contract; **25.6s M**; captures **3/0/0**; bug **R `b6997c1`**; contract [A071](#a071).
- **Lost City briefing mode changes and surface starts restore the appropriate reset distance** — keeps 'Lost City briefing mode changes and surface starts restore the appropriate reset distance'; full list in contract; **15.9s M**; captures **0/0/0**; bug **R `b6997c1`**; contract [A072](#a072).
- **Lost City realistic tile restores the legacy camera distance** — keeps expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6); range).toBeCloseTo(44, 0); **5.2s M**; captures **0/0/0**; bug **R `b6997c1`**; contract [A073](#a073).
- **Lost City realistic mission restores the legacy camera distance** — keeps expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6); range).toBeCloseTo(44, 0); **4.3s M**; captures **0/0/0**; bug **R `b6997c1`**; contract [A073](#a073).
- **Lost City custom tile restores the legacy camera distance** — keeps expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6); range).toBeCloseTo(44, 0); **5.6s M**; captures **0/0/0**; bug **R `b6997c1`**; contract [A073](#a073).
- **Lost City custom mission restores the legacy camera distance** — keeps expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6); range).toBeCloseTo(44, 0); **3.4s M**; captures **0/0/0**; bug **R `b6997c1`**; contract [A073](#a073).
- **new sites and explicit Lost City probes restore the global chase radius** — keeps 'new sites and explicit Lost City probes restore the global chase radius'; full list in contract; **34.4s M**; captures **0/0/0**; bug **R `b6997c1`**; contract [A074](#a074).

<a id="a071"></a>

**Contract A071 (f-bughunt-18.spec.ts:L73)** — `Lost City ${route}: reset, wheel and photo at ${size.width}x${size.height}`.

Row expansion: `const size of [ { width: 1600, height: 900 }, { width: 844, height: 390 }, ]`; `const route of [size.width === 1600 ? 'tile' : 'mission']`.

Scope: `if route === 'mission'`.

- `expect(page.locator('.briefing')).toBeHidden()`

Scope: unconditional in this body.

- `expect.poll(async () => (await camera(page)).radius).toBe(resetRadius)`
- `expect.poll(async () => (await camera(page)).radius).toBe(35)`
- `expect.poll(async () => (await camera(page)).radius).toBe(180)`
- `expect.poll(async () => (await camera(page)).radius).toBe(resetRadius)`
- `expect.poll(async () => (await camera(page)).freeLook).toBe(false)`
- `expect((await camera(page)).clearance).toBeGreaterThanOrEqual(6 - 1e-6)`
- `expect.poll(async () => (await camera(page)).freeLook).toBe(false)`
- `expect((await camera(page)).radius).toBe(resetRadius)`
- `expect.poll(async () => (await camera(page)).freeLook).toBe(false)`
- `expect((await camera(page)).radius).toBe(resetRadius)`
- `expect(page.locator('.photo-mode')).toBeVisible()`
- `expect.poll(async () => (await camera(page)).mode).toBe('orbit')`
- `expect((await camera(page)).mode).toBe('orbit')`
- `expect.poll(async () => (await camera(page)).orbitRadius).toBe(6)`
- `expect.poll(async () => (await camera(page)).orbitRadius).toBe(220)`
- `expect((await camera(page)).position).toEqual(frozen)`
- `expect((await camera(page)).radius).toBe(resetRadius)`
- `expect.poll(async () => (await camera(page)).mode).toBe('chase')`

Scope: `let i = 0; i < 3`.

- `expect(returned.offset[i]).toBeCloseTo(before.offset[i]!, 2)`

Scope: unconditional in this body.

- `expect(returned.radius).toBe(resetRadius)`
- `expect.poll(async () => (await camera(page)).mode).toBe('first-person')`
- `expect.poll(async () => (await camera(page)).mode).toBe('orbit')`
- `expect.poll(async () => (await camera(page)).mode).toBe('first-person')`
- `expect.poll(async () => (await camera(page)).mode).toBe('chase')`
- `expect((await camera(page)).radius).toBe(resetRadius)`

Helper guard closure: [ready](#f-bughunt-18-spec-ts-25-ready), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [drag](#f-bughunt-18-spec-ts-51-drag).

Helper call bindings: ``ready(page, `${route}=lost-city`)``; `drag(page)`.

<a id="a072"></a>

**Contract A072 (f-bughunt-18.spec.ts:L146)** — 'Lost City briefing mode changes and surface starts restore the appropriate reset distance'.

- `expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6)`
- `expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6)`
- `expect(briefing).toBeHidden()`
- `expect((await camera(page)).radius).toBeCloseTo(defaultRadius, 6)`

Scope: `let i = 0; i < 3`.

- `expect(started[i]).toBeCloseTo(preview[i]!, 0)`

Scope: unconditional in this body.

- `expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6)`
- `expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6)`
- `expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6)`

Helper guard closure: [ready](#f-bughunt-18-spec-ts-25-ready), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `ready(page, 'mission=lost-city')`.

<a id="a073"></a>

**Contract A073 (f-bughunt-18.spec.ts:L177)** — `Lost City ${mode} ${route} restores the legacy camera distance`.

Row expansion: `const mode of ['realistic', 'custom']`; `const route of ['tile', 'mission']`.

- `expect.poll(async () => (await camera(page)).radius).toBeCloseTo(defaultRadius, 6)`

Scope: `if route === 'tile'`.

- `expect(range).toBeCloseTo(44, 0)`

Helper guard closure: [ready](#f-bughunt-18-spec-ts-25-ready), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: ``ready(page, `${route}=lost-city&skipBriefing=1`)``.

<a id="a074"></a>

**Contract A074 (f-bughunt-18.spec.ts:L203)** — 'new sites and explicit Lost City probes restore the global chase radius'.

- `expect.poll(async () => (await camera(page)).radius).toBe(lostCityRadius)`

Scope: `const query of [ 'tile=titanic', 'mission=titanic&skipBriefing=1', 'tile=beebe-vent-field', 'tile=monterey-canyon', 'tile=lost-city&depth=700', 'mission=lost-city&poi=lost-city-poseidon&skipBriefing=1', ]`.

- `expect .poll(async () => { await page.keyboard.press('x'); const radius = (await camera(page)).radius; return accepted.some((value) => Math.abs(radius - value) < 1e-6); }) .toBe(true)`

Helper guard closure: [ready](#f-bughunt-18-spec-ts-25-ready), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `ready(page, 'tile=lost-city')`; `ready(page, query)`.

### [f-bughunt-4.spec.ts](../../tests/e2e/f-bughunt-4.spec.ts) — HUD/touch layout

5 expanded cases; sum of assigned weights **169.9s**, 0 fallback keys. Disposition: **fold → hud-touch.spec.ts**.

Overlap: Monterey390 free sonar/readout separation overlaps Monterey-HUD at normal scale after aligning saved/tutorial state; H4+H8 union. Daily/320px/150% remain.

History/provenance scope: **R**, `b6a10cb` — portrait telemetry/Daily sonar overlap. Origin: `b6a10cb fix(f-bughunt-4): portrait telemetry layout, daily objectives space beside sonar`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })`; `test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: true, isMobile: true, })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **F-BUGHUNT-4 portrait telemetry › great-blue-hole Free dive sonar has space beside readouts and pause** — keeps readiness/throws and invoked helper predicates below (no direct expect in body); **12s M**; captures **0/0/0**; bug **R `b6a10cb`**; contract [A075](#a075).
- **F-BUGHUNT-4 portrait telemetry › monterey-canyon Free dive sonar has space beside readouts and pause** — keeps readiness/throws and invoked helper predicates below (no direct expect in body); **32.1s M**; captures **0/0/0**; bug **R `b6a10cb`**; contract [A075](#a075).
- **F-BUGHUNT-4 portrait telemetry › Daily objectives have space beside sonar** — keeps locator('.briefing')).toBeHidden(); locator('html.is-touch')).toHaveCount(1); **20.8s M**; captures **0/0/0**; bug **R `b6a10cb`**; contract [A076](#a076).
- **F-BUGHUNT-4 320px controls at 100% › thrust and boost have separate touch targets** — keeps 'thrust and boost have separate touch targets'; full list in contract; **46.5s M**; captures **0/0/0**; bug **R `b6a10cb`**; contract [A077](#a077).
- **F-BUGHUNT-4 390px controls at 150% › thrust and boost have separate touch targets** — keeps 'thrust and boost have separate touch targets'; full list in contract; **58.5s M**; captures **0/0/0**; bug **R `b6a10cb`**; contract [A077](#a077).

<a id="a075"></a>

**Contract A075 (f-bughunt-4.spec.ts:L26)** — `${site} Free dive sonar has space beside readouts and pause`.

Row expansion: `const site of ['great-blue-hole', 'monterey-canyon']`.

Navigation: ``page.goto(`/?tile=${site}&tier=low&touch=1`)``.

- No direct matcher in this test body; the helper predicates and readiness/throws below are the executable assertions.

Helper guard closure: [ready](#f-bughunt-4-spec-ts-3-ready), [separate](#f-bughunt-4-spec-ts-10-separate).

Helper call bindings: `ready(page)`; `separate(page, '.sonar', '.hud-readouts')`; `separate(page, '.sonar', '.tc-btn-pause')`.

<a id="a076"></a>

**Contract A076 (f-bughunt-4.spec.ts:L33)** — 'Daily objectives have space beside sonar'.

Navigation: `page.goto('/?tier=low&touch=1')`.

- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(page.locator('html.is-touch')).toHaveCount(1)`

Helper guard closure: [ready](#f-bughunt-4-spec-ts-3-ready), [separate](#f-bughunt-4-spec-ts-10-separate).

Helper call bindings: `ready(page)`; `separate(page, '.sonar', '.objectives-panel')`; `separate(page, '.sonar', '.hud-readouts')`.

<a id="a077"></a>

**Contract A077 (f-bughunt-4.spec.ts:L58)** — 'thrust and boost have separate touch targets'.

Row expansion: `const layout of [ { width: 320, height: 568, scale: 100 }, { width: 390, height: 844, scale: 150 }, ]`.

Navigation: `page.goto('/?tile=great-blue-hole&tier=low&touch=1')`.

Scope: `const selector of ['.tc-stick', '.tc-slider', '.tc-buttons']`.

- `expect(box.x, selector).toBeGreaterThanOrEqual(0)`
- `expect(box.y, selector).toBeGreaterThanOrEqual(0)`
- `expect(box.x + box.width, selector).toBeLessThanOrEqual(layout.width)`
- `expect(box.y + box.height, selector).toBeLessThanOrEqual(layout.height)`

Scope: `const button of await page.locator('.tc-buttons .tc-btn').all()`.

- `expect(box.width).toBeGreaterThanOrEqual(44)`
- `expect(box.height).toBeGreaterThanOrEqual(44)`

Helper guard closure: [ready](#f-bughunt-4-spec-ts-3-ready), [separate](#f-bughunt-4-spec-ts-10-separate).

Helper call bindings: `ready(page)`; `separate(page, '.tc-stick', '.tc-btn-boost')`; `separate(page, '.tc-stick', '.tc-buttons')`; `separate(page, '.tc-slider', '.tc-buttons')`.

### [f-bughunt-880.spec.ts](../../tests/e2e/f-bughunt-880.spec.ts) — scan

11 expanded cases; sum of assigned weights **448.9s**, 1 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Journal/render/save fragments960/1000; two real reloads and site-authored source/title/Horizon/candidate guard remain.

History/provenance scope: **U**, `0d14061` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `0d14061 wip(880): f30 bug hunt tests (Codex)`.

Profile/skip controls (variables expanded by rows below): `test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' })`; `test.skip( !blueHole.props.some((p) => p.id === 'blue-hole-wall-relief'), '830 was deliberately reverted by 3f962b6; Low relief acceptance requires the director’s replacement geometry.', )`.

Selector/fixture constants: `sites = ['titanic', 'great-blue-hole', 'lost-city', 'monterey-canyon', 'beebe-vent-field']`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **titanic low: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **23.8s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **great-blue-hole low: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **30.6s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **lost-city low: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **33.4s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **monterey-canyon low: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **62.5s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **beebe-vent-field low: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **31.6s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **titanic medium: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **17.2s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **great-blue-hole medium: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **37.9s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **lost-city medium: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **50.6s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **monterey-canyon medium: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **70.9s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **beebe-vent-field medium: render opening, scan, reload twice and read authored Journal** — keeps .journal, .jr-locked, .jr-body .jr-para, .jr-title-row .jr-tag:not(.is-undiscovered), opening.failed, opening.calls; full list in contract; **45.4s M**; captures **2/0/0**; bug **U `0d14061`**; contract [A078](#a078).
- **830 Low wall relief is present and leaves the opening scan clear** — keeps await page.evaluate(() => (window.__game as unknown as Game).props.placed.some( (p) => p.def.id === 'blue-hole-wall-relief', ), ), ).toBe(true); **45s F**; captures **0/0/0**; bug **U `0d14061`**; contract [A079](#a079); reverted830 relief: conditionally skipped with shipped data.

<a id="a078"></a>

**Contract A078 (f-bughunt-880.spec.ts:L65)** — `${site} ${tier}: render opening, scan, reload twice and read authored Journal`.

Row expansion: `const tier of ['low', 'medium']`; `const site of sites`.

Navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`; ``page.goto(`${url}&poi=${opening.target.id}`, { waitUntil: 'domcontentloaded' })``.

- `expect(opening.failed).toBe(0)`
- `expect(opening.calls).toBeGreaterThan(0)`
- `expect(opening.triangles).toBeGreaterThan(0)`

Scope: `if site === 'titanic'`.

- `expect(opening.horizon).toMatchObject({ visible: true, toneMapped: false, depthWrite: false, })`
- `expect(opening.horizon!.order).toBeLessThan(0)`
- `expect(opening.target.distance).toBeLessThan(300)`

Scope: `else of site === 'titanic'`.

- `expect(opening.horizon).toBeNull()`

Scope: `if site === 'great-blue-hole'`.

- `expect(opening.target.id).toBe('great-blue-hole-stalactites')`
- `expect(opening.nearestId).toBe(opening.target.id)`
- `expect(opening.candidateId).toBe(opening.target.id)`
- `expect(Math.abs(opening.target.screen[0])).toBeLessThan(1)`
- `expect(Math.abs(opening.target.screen[1])).toBeLessThan(1)`
- `expect( await page.evaluate( () => (window.__game as unknown as Game).discovery.scanner.view.nearestDistance, ), ).toBeLessThanOrEqual(110)`

Scope: unconditional in this body.

- `expect( await page.evaluate( (id) => (window.__game as unknown as Game).discovery.store.get( (window.__game as unknown as Game).discovery.landmarkId, id, ), id, ), ).toMatchObject({ count: 1 })`

Scope: `let reload = 0; reload < 2`.

- `expect( await page.evaluate(() => (window.__game as unknown as Game).discovery.store.snapshot()), ).toEqual(snapshot)`

Scope: unconditional in this body.

- `expect( await page.evaluate( () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).tutorialDone, ), ).toBe(true)`
- `expect(page.locator('.journal')).toBeVisible()`
- `expect(page.locator('.jr-locked')).toHaveCount(0)`
- `expect(page.locator('.jr-body .jr-para').first()).toBeVisible()`

Scope: `if site === 'great-blue-hole'`.

- `expect(page.locator('.jr-title-row .jr-tag:not(.is-undiscovered)')).toHaveText( 'Recreation', )`

Scope: unconditional in this body.

- `expect(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true)`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [stepScan](#helpers-scan-ts-7-stepscan).

<a id="a079"></a>

**Contract A079 (f-bughunt-880.spec.ts:L222)** — '830 Low wall relief is present and leaves the opening scan clear'.

Navigation: `page.goto('/?tile=great-blue-hole&skipBriefing=1&tier=low&dynres=0', { waitUntil: 'domcontentloaded', })`.

- `expect( await page.evaluate(() => (window.__game as unknown as Game).props.placed.some( (p) => p.def.id === 'blue-hole-wall-relief', ), ), ).toBe(true)`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [stepScan](#helpers-scan-ts-7-stepscan).

### [f-bughunt-9-pwa.spec.ts](../../tests/e2e/f-bughunt-9-pwa.spec.ts) — CI/base-url

1 expanded cases; sum of assigned weights **10.0s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `04a94f6` — installed offline shell replaced by deployment navigation. Origin: `04a94f6 fix: F-BUGHUNT-9 audio lifecycle, PWA and mobile regressions`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **a deploy navigation cannot replace the installed offline shell** — keeps heading, .fatal, #viewport; full list in contract; **10s M**; captures **0/0/0**; bug **R `04a94f6`**; contract [A080](#a080).

<a id="a080"></a>

**Contract A080 (f-bughunt-9-pwa.spec.ts:L8)** — 'a deploy navigation cannot replace the installed offline shell'.

Navigation: `page.goto(dive)`; `page.goto(nextDeploy)`; ``page.goto(`${dive}&offline=1`)``.

- `expect(page.getByRole('heading', { name: 'New deployment' })).toBeVisible()`
- `expect(page.locator('.fatal')).toHaveCount(0)`
- `expect(page.locator('#viewport')).toBeVisible()`
- `expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction(() => window.__gameReady === true)`.

### [f-bughunt-960.spec.ts](../../tests/e2e/f-bughunt-960.spec.ts) — onboarding

24 expanded cases; sum of assigned weights **927.4s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Mode×tier×viewport tutorial-device/briefing/scan/save fragments other suites; full24-state matrix survivor stays.

History/provenance scope: **R**, `6fef976` — tutorial text used touch controls on keyboard/mismatched active input. Origin: `6fef976 fix(960): tutorial card honours active input device; regression e2e`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: layout, hasTouch: layout.touch, isMobile: layout.touch, deviceScaleFactor: 1, serviceWorkers: 'block', storageState: { cookies: [], origins: [] }, })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **960 390x844 › titanic arcade low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **17.4s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 390x844 › great-blue-hole arcade low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **20.6s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 390x844 › titanic arcade high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **50.4s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 390x844 › great-blue-hole arcade high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **63.4s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 390x844 › titanic realistic low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **17.3s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 390x844 › great-blue-hole realistic low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **21.9s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 390x844 › titanic realistic high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **31.9s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 390x844 › great-blue-hole realistic high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **60.8s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 844x390 › titanic arcade low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **19.3s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 844x390 › great-blue-hole arcade low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **31.7s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 844x390 › titanic arcade high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **57.8s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 844x390 › great-blue-hole arcade high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **93.4s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 844x390 › titanic realistic low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **19.6s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 844x390 › great-blue-hole realistic low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **22.3s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 844x390 › titanic realistic high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **74.8s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 844x390 › great-blue-hole realistic high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **66.3s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 1280x720 › titanic arcade low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **9.8s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 1280x720 › great-blue-hole arcade low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **25.8s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 1280x720 › titanic arcade high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **47.1s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 1280x720 › great-blue-hole arcade high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **60s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 1280x720 › titanic realistic low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **18.6s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 1280x720 › great-blue-hole realistic low: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **13.5s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 1280x720 › titanic realistic high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **24.9s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).
- **960 1280x720 › great-blue-hole realistic high: briefing, assisted scan, Journal, debrief and saves** — keeps radio, .onboard-card-phone-text, button, .d-scan-edge, .d-scan-objective-hint, .objectives-panel .obj-list; full list in contract; **58.8s M**; captures **4/0/0**; bug **R `6fef976`**; contract [A081](#a081).

<a id="a081"></a>

**Contract A081 (f-bughunt-960.spec.ts:L57)** — `${site} ${mode} ${tier}: briefing, assisted scan, Journal, debrief and saves`.

Row expansion: `const layout of [ { width: 390, height: 844, touch: true }, { width: 844, height: 390, touch: true }, { width: 1280, height: 720, touch: false }, ]`; `const mode of ['arcade', 'realistic'] as const`; `const tier of ['low', 'high']`; `const site of ['titanic', 'great-blue-hole']`.

Navigation: ``page.goto(`/?tier=${tier}&dynres=0&lifeSeed=42`, { waitUntil: 'domcontentloaded', })``.

- `expect(briefing).toBeVisible()`
- `expect( briefing.getByRole('radio', { name: 'near the first target', exact: true }), ).toBeChecked()`
- `expect(await panel.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual( 1, )`

Scope: `if layout.width === 390`.

- `expect( await panel.evaluate((e) => e.scrollHeight - e.clientHeight), ).toBeLessThanOrEqual(1)`

Scope: unconditional in this body.

- `expect(more).toHaveAttribute('open', '')`
- `expect(briefing).toBeVisible()`
- `expect(more).not.toHaveAttribute('open', '')`
- `expect(briefing).toBeHidden()`

Scope: `if layout.touch`.

- `expect(page.locator('.onboard-card-phone-text')).toHaveText( 'Hold Space to rise or Ctrl to sink.', )`
- `expect( page.getByRole('button', { name: 'Skip step', exact: true }), ).toBeVisible()`
- `expect(page.locator('.onboard-card-phone-text')).toBeVisible()`
- `expect(page.locator('.onboard-card-phone-text')).toHaveText( 'Right slider: up to rise, down to sink.', )`
- `expect(page.locator('.onboard-card-phone-text')).toHaveText( 'Tap LIGHTS to switch the headlights.', )`
- `expect(page.locator('.d-scan-edge')).toBeHidden()`
- `expect(page.locator('.d-scan-objective-hint')).toBeHidden()`
- `expect(page.locator('.objectives-panel .obj-list')).toBeHidden()`

Scope: unconditional in this body.

- `expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText( '1', )`
- `expect(journal).toBeVisible()`
- `expect(journal.locator('.jr-locked')).toHaveCount(0)`
- `expect(debrief.locator('[data-action="journal"]')).toBeFocused()`
- `expect(snapshot.settings.gameplayMode).toBe(mode)`
- `expect(snapshot.settings.gameplay.startPosition).toBe('near-site')`

Scope: `let reload = 0; reload < 2`.

- `expect( await page.evaluate(() => { const g = window.__game as unknown as Game; return { discoveries: g.discovery.store.snapshot(), settings: g.save.get() }; }), ).toEqual(snapshot)`
- `expect( await page.evaluate( () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).tutorialDone, ), ).toBe(true)`

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForURL((url) => url.searchParams.get('mission') === site, { waitUntil: 'domcontentloaded', })`.

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [reachable](#f-bughunt-960-spec-ts-28-reachable), [expectCompactPhoneHud](#helpers-phonehud-ts-17-expectcompactphonehud), [dismissTutorial](#helpers-tutorial-ts-4-dismisstutorial), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `reachable(target)`; `expectCompactPhoneHud(page)`; `dismissTutorial(page, layout.touch, true)`; `reachable(scan)`.

### [f-bughunt-hud-touch-overlap-1390.spec.ts](../../tests/e2e/f-bughunt-hud-touch-overlap-1390.spec.ts) — HUD/touch layout

78 expanded cases; sum of assigned weights **3510.0s**, 78 fallback keys. Disposition: **fold → hud-touch.spec.ts**.

Overlap: Opening Monterey1280×720/844×390 fragments fromhud-layout; H6 survives all13×6 rows, reward/chip/reload and input ordering.

History/provenance scope: **R**, `02f37a4` — reward notice crossing scan/tutorial stack; eeda29a synchronous chip-suppression/completion defects. [1390 note](1390-f-bughunt-hud-touch-overlap.md), [measured landscape fix](f-hud-overlap-fix.md). Origin: `eeda29a feat(1390): f-bughunt-hud-touch-overlap fixes and regression tests`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport, hasTouch: viewport.touch, isMobile: viewport.touch })`.

Selector/fixture constants: `selectors = [ '.sonar', '.objectives-panel', '.hud-readouts', '.scan-panel', '.scan-objective-chip', '.onboard-card', '.onboard-hint', '.hud-notice', '.tc-stick', '.tc-slider', '.tc-btn-scan', '.tc-btn-lights', '.tc-btn-sonar', '.tc-btn-photo', '.tc-btn-pause', '.tc-btn-boost', '.hud-journal', '.hud-control-tips', '.hud-reset-camera', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **844x390-touch › titanic: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › challenger-deep: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › lost-city: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › monterey-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › endurance: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › hudson-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › beebe-vent-field: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › great-blue-hole: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › bismarck: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › hunga-tonga-caldera: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **844x390-touch › blake-plateau-corals: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › titanic: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › challenger-deep: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › lost-city: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › monterey-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › endurance: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › hudson-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › beebe-vent-field: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › great-blue-hole: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › bismarck: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › hunga-tonga-caldera: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **667x375-touch › blake-plateau-corals: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › titanic: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › challenger-deep: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › lost-city: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › monterey-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › endurance: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › hudson-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › beebe-vent-field: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › great-blue-hole: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › bismarck: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › hunga-tonga-caldera: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **390x844-touch › blake-plateau-corals: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › titanic: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › challenger-deep: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › lost-city: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › monterey-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › endurance: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › hudson-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › beebe-vent-field: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › great-blue-hole: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › bismarck: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › hunga-tonga-caldera: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1024x768-touch › blake-plateau-corals: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › titanic: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › challenger-deep: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › lost-city: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › monterey-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › endurance: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › axial-seamount-ashes: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › hudson-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › kamaehuakanaloa: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › beebe-vent-field: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › great-blue-hole: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › bismarck: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › hunga-tonga-caldera: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-touch › blake-plateau-corals: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › titanic: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › challenger-deep: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › lost-city: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › monterey-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › endurance: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › axial-seamount-ashes: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › hudson-canyon: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › kamaehuakanaloa: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › beebe-vent-field: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › great-blue-hole: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › bismarck: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › hunga-tonga-caldera: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).
- **1280x720-keyboard › blake-plateau-corals: tutorial, contact, reward, chip and reload** — keeps .scan-panel, .hud-notice; full list in contract; **45s F**; captures **3/0/0**; bug **R `02f37a4`**; contract [A082](#a082).

<a id="a082"></a>

**Contract A082 (f-bughunt-hud-touch-overlap-1390.spec.ts:L143)** — `${site}: tutorial, contact, reward, chip and reload`.

Row expansion: `const viewport of [ { width: 844, height: 390, touch: true }, { width: 667, height: 375, touch: true }, { width: 390, height: 844, touch: true }, { width: 1024, height: 768, touch: true }, { width: 1280, height: 720, touch: true }, { width: 1280, height: 720, touch: false }, ]`; `const site of sites.landmarks`.

Navigation: ``page.goto( `/?mission=${site}&skipBriefing=1&tier=low${viewport.touch ? '&touch=1' : ''}`, )``.

- `expect(card).toHaveAttribute('data-step', 'move')`
- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(chip).toBeHidden()`
- `expect(card).toHaveAttribute('data-step', 'move')`
- `expect(page.locator('.hud-notice')).toContainText('New discovery')`

Scope: `const step of ['move', 'depth', 'lights']`.

- `expect(card).toHaveAttribute('data-step', step)`

Scope: unconditional in this body.

- `expect(card).toHaveAttribute('data-step', 'journal')`
- `expect(page.locator('.hud-notice')).toBeVisible()`
- `expect(page.locator('.scan-panel')).toBeHidden()`

Scope: `if viewport.touch`.

- `expect(chip).toBeVisible()`

Scope: unconditional in this body.

- `expect(card).toBeHidden()`
- `expect( await page.evaluate( () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).tutorialDone, ), ).toBe(true)`
- `expect(page.locator('.scan-panel')).toBeHidden()`

Scope: `if viewport.touch`.

- `expect(chip).toBeVisible()`
- `expect((await chip.boundingBox())!.height).toBeLessThanOrEqual(28)`

Scope: `else of viewport.touch`.

- `expect(chip).toBeHidden()`

Scope: unconditional in this body.

- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(chip).toBeHidden()`
- `expect(card).toBeHidden()`

Failure guards: ``throw new Error(`Missing opening objective ${id}`);``.

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [layout](#f-bughunt-hud-touch-overlap-1390-spec-ts-40-layout), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `layout(page, 'opening')`; `layout(page, 'contact in range')`; `layout(page, 'early scan reward')`; ``layout(page, `reward and tutorial ${step}`)``; `layout(page, 'collapsed journal and reward')`; `layout(page, 'journal strip with objective chip and reward')`; `layout(page, 'finished tutorial and reward')`; `layout(page, 'out of range chip with hint and reward')`; `layout(page, 'return to scanned contact')`; `layout(page, 'reload remembers tutorial completion')`.

### [f-challenger-opening.spec.ts](../../tests/e2e/f-challenger-opening.spec.ts) — opening framing

4 expanded cases; sum of assigned weights **180.0s**, 4 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `deb4744` — portrait hull/hero framing and starting-depth near-hull false hint. Origin: `deb4744 feat(1020): Challenger/Endurance portrait opening framing, near-hull hint grace`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1020 portrait openings › challenger-deep: level framed opening stays quiet at its starting depth** — keeps .scan-panel, .onboard-hint, opening.pitch, opening.roll, bounds.left, bounds.right; full list in contract; **45s F**; captures **1/0/0**; bug **R `deb4744`**; contract [A083](#a083).
- **1020 portrait openings › endurance: level framed opening stays quiet at its starting depth** — keeps .scan-panel, .onboard-hint, opening.pitch, opening.roll, bounds.left, bounds.right; full list in contract; **45s F**; captures **1/0/0**; bug **R `deb4744`**; contract [A083](#a083).
- **1020 portrait openings › hunga-tonga-caldera: level framed opening stays quiet at its starting depth** — keeps .scan-panel, .onboard-hint, opening.pitch, opening.roll, bounds.left, bounds.right; full list in contract; **45s F**; captures **1/0/0**; bug **R `deb4744`**; contract [A083](#a083).
- **1020 portrait openings › axial-seamount-ashes: level framed opening stays quiet at its starting depth** — keeps .scan-panel, .onboard-hint, opening.pitch, opening.roll, bounds.left, bounds.right; full list in contract; **45s F**; captures **1/0/0**; bug **R `deb4744`**; contract [A083](#a083).

<a id="a083"></a>

**Contract A083 (f-challenger-opening.spec.ts:L28)** — `${site}: level framed opening stays quiet at its starting depth`.

Row expansion: `const site of [ 'challenger-deep', 'endurance', 'hunga-tonga-caldera', 'axial-seamount-ashes', ]`.

Navigation: ``page.goto(`/?tile=${site}&tier=low&touch=1&tutorial=0&lifeSeed=42&dynres=0`, { waitUntil: 'domcontentloaded', })``.

- `expect(opening.pitch).toBe(0)`
- `expect(opening.roll).toBe(0)`

Scope: `if site === 'challenger-deep'`.

- `expect(frame.bounds.left).toBeGreaterThan(12)`
- `expect(frame.bounds.right).toBeLessThan(390 - 12)`
- `expect(frame.bounds.top).toBeGreaterThan(211)`
- `expect(frame.bounds.bottom).toBeLessThan(844 * 0.79)`
- `expect(frame.depth.near).toBeGreaterThan(-1)`
- `expect(frame.depth.far).toBeLessThan(1)`
- `expect(frame.heroX).toBeGreaterThan(12)`
- `expect(frame.heroX).toBeLessThan(390 - 12)`
- `expect(frame.heroZ).toBeGreaterThan(-1)`
- `expect(frame.heroZ).toBeLessThan(1)`
- `expect(frame.heroX < frame.bounds.left - 12 || frame.heroX > frame.bounds.right + 12).toBe( true, )`

Scope: `else of site === 'challenger-deep'`.

- `expect(opening.hullNdc[0]).toBeCloseTo(0, 6)`

Scope: unconditional in this body.

- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(page.locator('.onboard-hint')).toBeHidden()`
- `expect(page.locator('.onboard-hint')).toBeHidden()`
- `expect( await page.evaluate( () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).seenHints, ), ).not.toContain('near-hull')`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil(page, () => { const g = window.__game as unknown as Probe; return window.__gameReady === true && g.props.loaded && g.discovery.loaded; })`.

### [f-content-fix.spec.ts](../../tests/e2e/f-content-fix.spec.ts) — Journal/debrief

8 expanded cases; sum of assigned weights **377.6s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Journal readable/source fragments J8, but exact sourced geology/site identity and Hunga support unique; keep outside29.

History/provenance scope: **R**, `4729499` — sourced content/site placement errors;90ec5a2 later fact-check. Origin: `4729499 F-CONTENT-FIX: factual/content corrections from F-VISUAL-QA (data only)`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **great-blue-hole: sourced content is readable in the Journal** — keeps .jr-body, .jr-sources a, .jr-heading; full list in contract; **82.4s M**; captures **1/0/0**; bug **R `4729499`**; contract [A084](#a084).
- **hunga-tonga-caldera: sourced content is readable in the Journal** — keeps .jr-body, .jr-sources a, .jr-heading; full list in contract; **60s M**; captures **1/0/0**; bug **R `4729499`**; contract [A084](#a084).
- **bismarck: sourced content is readable in the Journal** — keeps .jr-body, .jr-sources a, .jr-heading; full list in contract; **25.6s M**; captures **1/0/0**; bug **R `4729499`**; contract [A084](#a084).
- **lost-city: sourced content is readable in the Journal** — keeps .jr-body, .jr-sources a, .jr-heading; full list in contract; **47.3s M**; captures **1/0/0**; bug **R `4729499`**; contract [A084](#a084).
- **beebe-vent-field: sourced content is readable in the Journal** — keeps .jr-body, .jr-sources a, .jr-heading; full list in contract; **56.3s M**; captures **1/0/0**; bug **R `4729499`**; contract [A084](#a084).
- **blake-plateau-corals: sourced content is readable in the Journal** — keeps .jr-body, .jr-sources a, .jr-heading; full list in contract; **47.2s M**; captures **1/0/0**; bug **R `4729499`**; contract [A084](#a084).
- **Lost City mission and free dive both retain clear flow** — keeps effects).toEqual({ smokeIntensity: 0, glowLights: 0, smoke: null, strength: 0.03, lights: 0, particles: 36, // 3 shimmer sprites at each of the 12 chimneys }); **52.2s M**; captures **2/0/0**; bug **R `4729499`**; contract [A085](#a085).
- **Hunga hero and scan marker share a supported terrain location** — keeps 'Hunga hero and scan marker share a supported terrain location'; full list in contract; **6.6s M**; captures **0/0/0**; bug **R `4729499`**; contract [A086](#a086).

<a id="a084"></a>

**Contract A084 (f-content-fix.spec.ts:L20)** — `${site.id}: sourced content is readable in the Journal`.

Row expansion: `const site of [ { id: 'great-blue-hole', text: 'The flooded limestone sinkhole is about 320 m wide', entry: 'overview', }, { id: 'hunga-tonga-caldera', text: 'before the 15 January 2022 eruption', entry: 'overview' }, { id: 'bismarck', text: 'roughly 570 m gap', entry: 'overview' }, { id: 'lost-city', text: 'The fluid emerges clear', entry: 'overview' }, { id: 'beebe-vent-field', text: 'roughly 500 bar', entry: 'vents' }, { id: 'blake-plateau-corals', text: 'naturally white', entry: 'coral-thicket' }, ]`.

Navigation: ``page.goto(`/?tile=${site.id}&skipBriefing=1`, { waitUntil: 'domcontentloaded' })``.

- `expect(journal).toBeVisible()`
- `expect(journal.locator('.jr-body')).toContainText(site.text)`
- `expect(journal.locator('.jr-body')).not.toContainText(/illustrative|reconstructed/i)`
- `expect(journal.locator('.jr-sources a').first()).toHaveAttribute('href', /^https:/)`

Scope: `if site.id === 'beebe-vent-field'`.

- `expect(journal.locator('.jr-heading')).toContainText( 'Beebe Hydrothermal Vent Field (Piccard)', )`
- `expect(journal.locator('.jr-heading')).not.toContainText('Von Damm')`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [openJournalCategory](#helpers-journal-ts-84-openjournalcategory), [journalContents](#helpers-journal-ts-16-journalcontents).

Helper call bindings: `openJournalCategory(page, site.id, kind)`.

<a id="a085"></a>

**Contract A085 (f-content-fix.spec.ts:L44)** — 'Lost City mission and free dive both retain clear flow'.

Navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`.

Scope: `const url of [ '/?tile=lost-city&skipBriefing=1&tier=medium', '/?mission=lost-city&skipBriefing=1&tier=medium', ]`.

- `expect(effects).toEqual({ smokeIntensity: 0, glowLights: 0, smoke: null, strength: 0.03, lights: 0, particles: 36, // 3 shimmer sprites at each of the 12 chimneys })`

Readiness/temporal predicates: `page.waitForFunction(() => { const p = window.__game?.presets as { entered?: boolean } | undefined; return window.__gameReady && p?.entered; })`.

<a id="a086"></a>

**Contract A086 (f-content-fix.spec.ts:L87)** — 'Hunga hero and scan marker share a supported terrain location'.

Navigation: `page.goto('/?tile=hunga-tonga-caldera&skipBriefing=1', { waitUntil: 'domcontentloaded', })`.

- `expect(position.distance).toBeLessThan(0.01)`
- `expect(position.ground).toBeCloseTo(-471.1, 0)`
- `expect(position.heroY).toBeCloseTo(position.ground, 2)`
- `expect(Math.abs(position.targetY - position.ground)).toBeLessThan(5)`

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as { props: { loaded: boolean }; discovery: { loaded: boolean } } | undefined; return window.__gameReady && g?.props.loaded && g.discovery.loaded; })`.

### [f-copy-regress.spec.ts](../../tests/e2e/f-copy-regress.spec.ts) — HUD/touch layout

2 expanded cases; sum of assigned weights **55.6s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `c8b4023` — authored objective titles/hints clipped or collided with optional marker. Origin: `c8b4023 feat: 210-f-bughunt-7-copy-regress`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch, isMobile: layout.touch, })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **copy regression desktop › all authored current-objective titles fit at 100% and 150%** — keeps bounds.title, bounds.hint, bounds.visible, bounds.clipped, bounds.left, bounds.right; full list in contract; **38.1s M**; captures **2/0/0**; bug **R `c8b4023`**; contract [A087](#a087).
- **copy regression phone › all authored current-objective titles fit at 100% and 150%** — keeps bounds.title, bounds.hint, bounds.visible, bounds.clipped, bounds.left, bounds.right; full list in contract; **17.5s M**; captures **2/0/0**; bug **R `c8b4023`**; contract [A087](#a087).

<a id="a087"></a>

**Contract A087 (f-copy-regress.spec.ts:L21)** — 'all authored current-objective titles fit at 100% and 150%'.

Row expansion: `const layout of [ { name: 'desktop', width: 1280, height: 720, touch: false }, { name: 'phone', width: 390, height: 844, touch: true }, ]`.

Navigation: ``page.goto(`/?mission=titanic&skipBriefing=1&tier=low${layout.touch ? '&touch=1' : ''}`)``.

- `expect(indexResponse.ok()).toBe(true)`
- `expect(response.ok(), id).toBe(true)`

Scope: `const scale of [100, 150]; const bounds of samples`.

- `expect(bounds.title).toBe(objective.title)`
- `expect(bounds.hint).toBe(objective.hint)`
- ``expect(bounds.visible, `${scale}%: ${objective.title}`).toBe(true)``
- ``expect(bounds.clipped, `${scale}%: ${objective.title}`).toBe(false)``
- `expect(bounds.left).toBeGreaterThanOrEqual(0)`
- `expect(bounds.right).toBeLessThanOrEqual(layout.width)`
- `expect(bounds.right).toBeLessThanOrEqual(bounds.rowRight)`
- `expect(bounds.right).toBeLessThanOrEqual(bounds.optionalLeft)`

Scope: `const scale of [100, 150]`.

- `expect .poll(async () => { const panel = (await page.locator('.objectives-panel').boundingBox())!; const readouts = (await page.locator('.hud-readouts').boundingBox())!; return readouts.y - (panel.y + panel.height); }) .toBeGreaterThanOrEqual(0)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [expectObjectiveGuidance](#helpers-phonehud-ts-7-expectobjectiveguidance).

Helper call bindings: `expectObjectiveGuidance(page, layout.touch)`.

### [f-debrief-720.spec.ts](../../tests/e2e/f-debrief-720.spec.ts) — Journal/debrief

15 expanded cases; sum of assigned weights **252.8s**, 0 fallback keys. Disposition: **fold → journal-debrief.spec.ts**.

Overlap: Exact common portrait/desktop summary/layout/return-focus with1060; survivor J2 union; landscapeJ1 and locked/Back/exit remain.

History/provenance scope: **U**, `a8d2e4d` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `a8d2e4d feat(720): f-debrief-journal-polish (Codex)`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport, hasTouch: viewport.touch, isMobile: viewport.touch, deviceScaleFactor: 1, serviceWorkers: 'block', storageState: { cookies: [], origins: [] }, })`.

Selector/fixture constants: `sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon']`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **720 debrief/Journal 1600x900 › titanic: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **19s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 1600x900 › lost-city: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **21.2s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 1600x900 › great-blue-hole: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **31.3s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 1600x900 › beebe-vent-field: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **24.6s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 1600x900 › monterey-canyon: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **41.7s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 390x844 › titanic: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **8s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 390x844 › lost-city: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **11.4s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 390x844 › great-blue-hole: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **14.1s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 390x844 › beebe-vent-field: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **9.8s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 390x844 › monterey-canyon: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **12.7s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 844x390 › titanic: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **9.3s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 844x390 › lost-city: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **11.7s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 844x390 › great-blue-hole: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **15.7s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 844x390 › beebe-vent-field: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **11.9s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).
- **720 debrief/Journal 844x390 › monterey-canyon: short summary, Journal, resume and exit** — keeps [data-field=, .debrief-btn.is-primary, .debrief-secondary > [data-action=, .debrief-highlight, .debrief-next, .debrief-rating; full list in contract; **10.4s M**; captures **2R+2/0/0 (defaultR=2:6;R=1:4)**; bug **U `a8d2e4d`**; contract [A088](#a088).

<a id="a088"></a>

**Contract A088 (f-debrief-720.spec.ts:L57)** — `${site}: short summary, Journal, resume and exit`.

Row expansion: `const viewport of [ { width: 1600, height: 900, touch: false }, { width: 390, height: 844, touch: true }, { width: 844, height: 390, touch: true }, ]`; `const site of sites`.

Navigation: ``page.goto(`/?mission=${site}&skipBriefing=1`, { waitUntil: 'domcontentloaded' })``.

- `expect( await page.evaluate(() => (window.__game as unknown as Game).save.get().gameplayMode), ).toBe('arcade')`

Scope: `let round = 1; round <= rounds`.

- `expect(debrief).toBeVisible()`
- `expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText( String(round === 1 ? 0 : 1), )`

Scope: `let round = 1; round <= rounds; if !before`.

- `expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1)`
- `expect(debrief.locator('.debrief-btn.is-primary')).toHaveAttribute( 'data-action', round === 1 ? 'keep-exploring' : 'dive-sites', )`
- `expect( debrief.locator('.debrief-secondary > [data-action="dive-sites"]'), ).toHaveCount(round === 1 ? 1 : 0)`
- `expect(debrief.locator('.debrief-highlight')).toHaveCount(1)`
- `expect(debrief.locator('.debrief-next')).toHaveCount(1)`
- `expect(debrief.locator('.debrief-rating')).toContainText('research points')`
- `expect(debrief.locator('.debrief-section.is-samples')).toHaveCount(0)`

Scope: `let round = 1; round <= rounds`.

- `expect(journal).toBeVisible()`

Scope: `let round = 1; round <= rounds; if round === 1`.

- `expect(journal.locator('.jr-locked')).toBeVisible()`
- `expect(journal.locator('.jr-honesty')).toHaveCount(1)`

Scope: `let round = 1; round <= rounds; if round === 1; if !before`.

- `expect(journal.locator('.jr-tag.is-recreation')).toHaveCount(1)`
- `expect(journal.locator('.jr-tag.is-recreation')).toHaveText('Recreation')`
- `expect(journal.locator('.jr-honesty')).toHaveCount(0)`

Scope: `let round = 1; round <= rounds; if round === 1; if !before; if await journalIsSheet(page)`.

- `expect(journal.locator('.jr-nav')).toBeHidden()`
- `expect((await journal.locator('.jr-body').boundingBox())!.height).toBeGreaterThan( viewport.height * 0.5, )`
- `expect(journal.locator('.jr-body .jr-entries')).toBeVisible()`
- `expect(journal.locator('.jr-body')).toBeFocused()`

Scope: `let round = 1; round <= rounds`.

- `expect(debrief.locator('[data-action="journal"]')).toBeFocused()`
- `expect(debrief).toBeHidden()`

Scope: unconditional in this body.

- `expect(page.locator('.home-sites')).toBeVisible()`
- `expect(page.locator('.home-menu')).toBeVisible()`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [contained](#f-debrief-720-spec-ts-31-contained), [journalContents](#helpers-journal-ts-16-journalcontents), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `clockFramesUntil( page, () => window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded, )`; `contained(debrief.locator('.debrief-panel'))`; `contained(journal.locator('.jr-panel'))`; `contained(journal.locator('.jr-header'))`; `contained(journal.locator('.jr-body'))`.

### [f-debrief-zero-1160.spec.ts](../../tests/e2e/f-debrief-zero-1160.spec.ts) — Journal/debrief

6 expanded cases; sum of assigned weights **150.8s**, 0 fallback keys. Disposition: **fold → journal-debrief.spec.ts**.

Overlap: Common390×844 zero/one summary with720/1060; survivorJ3 union. Frozen snapshot/More/key cycle/movement and1280×720 remain.

History/provenance scope: **R**, `cea8414` — zero-scan debrief/focus/resume regression guard; warm Keep-exploring primary from7067cec; see f-debrief-zero.md. [zero-scan finding](f-debrief-zero.md). Origin: `cea8414 feat(1160): collected Codex work`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport, hasTouch: viewport.touch, isMobile: viewport.touch, deviceScaleFactor: 1, serviceWorkers: 'block', storageState: { cookies: [], origins: [] }, })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1160 debrief 390x844 › titanic: zero and one scan, focus, Journal, resume and exit** — keeps .pause-menu, .objectives-panel, [data-field=, .debrief-highlight, .debrief-btn.is-primary, .debrief-secondary > [data-action]; full list in contract; **14.1s M**; captures **4/0/0**; bug **R `cea8414`**; contract [A089](#a089).
- **1160 debrief 390x844 › beebe-vent-field: zero and one scan, focus, Journal, resume and exit** — keeps .pause-menu, .objectives-panel, [data-field=, .debrief-highlight, .debrief-btn.is-primary, .debrief-secondary > [data-action]; full list in contract; **16.2s M**; captures **4/0/0**; bug **R `cea8414`**; contract [A089](#a089).
- **1160 debrief 390x844 › great-blue-hole: zero and one scan, focus, Journal, resume and exit** — keeps .pause-menu, .objectives-panel, [data-field=, .debrief-highlight, .debrief-btn.is-primary, .debrief-secondary > [data-action]; full list in contract; **26.2s M**; captures **4/0/0**; bug **R `cea8414`**; contract [A089](#a089).
- **1160 debrief 1280x720 › titanic: zero and one scan, focus, Journal, resume and exit** — keeps .pause-menu, .objectives-panel, [data-field=, .debrief-highlight, .debrief-btn.is-primary, .debrief-secondary > [data-action]; full list in contract; **28.4s M**; captures **4/0/0**; bug **R `cea8414`**; contract [A089](#a089).
- **1160 debrief 1280x720 › beebe-vent-field: zero and one scan, focus, Journal, resume and exit** — keeps .pause-menu, .objectives-panel, [data-field=, .debrief-highlight, .debrief-btn.is-primary, .debrief-secondary > [data-action]; full list in contract; **18.6s M**; captures **4/0/0**; bug **R `cea8414`**; contract [A089](#a089).
- **1160 debrief 1280x720 › great-blue-hole: zero and one scan, focus, Journal, resume and exit** — keeps .pause-menu, .objectives-panel, [data-field=, .debrief-highlight, .debrief-btn.is-primary, .debrief-secondary > [data-action]; full list in contract; **47.3s M**; captures **4/0/0**; bug **R `cea8414`**; contract [A089](#a089).

<a id="a089"></a>

**Contract A089 (f-debrief-zero-1160.spec.ts:L52)** — `${site}: zero and one scan, focus, Journal, resume and exit`.

Row expansion: `const viewport of [ { width: 390, height: 844, touch: true }, { width: 1280, height: 720, touch: false }, ]`; `const site of ['titanic', 'beebe-vent-field', 'great-blue-hole']`.

Navigation: ``page.goto(`/?mission=${site}&skipBriefing=1&tier=low`, { waitUntil: 'domcontentloaded', })``.

- `expect( await page.evaluate(() => (window.__game as unknown as Game).save.get().gameplayMode), ).toBe('arcade')`

Scope: `const scans of [0, 1]`.

- `expect(debrief).toBeVisible()`
- `expect(page.locator('.pause-menu')).toBeHidden()`
- `expect(page.locator('.objectives-panel')).toBeHidden()`
- `expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText( String(scans), )`
- ``expect(debrief.locator('.debrief-highlight')).toHaveText( scans === 0 ? 'The site is waiting for your first scan.' : `Scanned ${scanName}.`, )``
- `expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1)`
- `expect(debrief.locator('.debrief-btn.is-primary')).toHaveAttribute( 'data-action', scans === 0 ? 'keep-exploring' : 'dive-sites', )`
- `expect(debrief.locator('.debrief-secondary > [data-action]')).toHaveCount(2)`
- ``expect( debrief.locator(`.debrief-secondary > [data-action="${quiet}"]`), ).toBeVisible()``
- `expect( debrief.locator('.debrief-secondary > [data-action="journal"]'), ).toBeVisible()`
- `expect(debrief.locator('.debrief-more-items')).toBeHidden()`
- `expect(await panel.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual( 1, )`
- `expect(await panel.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1)`
- `expect(box.x).toBeGreaterThanOrEqual(0)`
- `expect(box.y).toBeGreaterThanOrEqual(0)`
- `expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)`
- `expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)`
- `expect(ended.state).toBe('debrief')`
- `expect(ended.frozen).toBe(true)`
- `expect(ended.elapsed).toBe(diving.elapsed)`
- `expect(await snapshot(page)).toEqual(ended)`

Scope: `const scans of [0, 1]; const target of [primary, quiet, 'journal', 'more', primary]`.

- ``expect( debrief.locator( target === 'more' ? '.debrief-more-toggle' : `[data-action="${target}"]`, ), ).toBeFocused()``

Scope: `const scans of [0, 1]`.

- `expect(debrief.locator('.debrief-more-toggle')).toBeFocused()`
- `expect(debrief.locator('.debrief-more-toggle')).toHaveAttribute( 'aria-expanded', 'true', )`

Scope: `const scans of [0, 1]; const target of ['dive-again', 'home', primary]`.

- ``expect(debrief.locator(`[data-action="${target}"]`)).toBeFocused()``

Scope: `const scans of [0, 1]`.

- `expect(page.locator('.journal')).toBeVisible()`
- `expect(await page.evaluate(() => !!document.activeElement?.closest('.journal'))).toBe( true, )`
- `expect(debrief.locator('[data-action="journal"]')).toBeFocused()`
- `expect(await snapshot(page)).toEqual(ended)`

Scope: `const scans of [0, 1]; if scans === 0`.

- `expect(debrief.locator('[data-action="keep-exploring"]')).toBeFocused()`

Scope: `const scans of [0, 1]; else of scans === 0`.

- `expect(debrief.locator('.debrief-more-items')).toBeVisible()`

Scope: `const scans of [0, 1]`.

- `expect(debrief).toBeHidden()`
- `expect(page.locator('.objectives-panel')).toBeVisible()`
- `expect(page.locator('.hud-readouts')).toBeVisible()`
- `expect(resumed).toEqual({ ...ended, state: diving.state, duration: null, frozen: false })`
- `expect(await page.evaluate(() => !!document.activeElement?.closest('.debrief'))).toBe( false, )`
- `expect(ticking.elapsed).toBeGreaterThan(resumed.elapsed)`
- `expect(ticking.sessionElapsed).toBeGreaterThan(resumed.sessionElapsed)`
- `expect(ticking.scans).toEqual(resumed.scans)`
- `expect(ticking.counts).toEqual(resumed.counts)`
- `expect((await snapshot(page)).pose).not.toEqual(ticking.pose)`

Scope: `const scans of [0, 1]; if scans === 0`.

- `expect((await snapshot(page)).scans).toEqual([{ poiId: target.id, name: target.name }])`

Scope: unconditional in this body.

- `expect(debrief.locator('.debrief-more-items')).toBeHidden()`
- `expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('1')`
- `expect(debrief).toBeHidden()`
- `expect((await snapshot(page)).frozen).toBe(false)`
- `expect(page.locator('.home-sites')).toBeVisible()`
- `expect(page.locator('.home-menu')).toBeVisible()`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `clockFramesUntil( page, () => window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded, )`.

### [f-endurance-1180.spec.ts](../../tests/e2e/f-endurance-1180.spec.ts) — rendering/visual

4 expanded cases; sum of assigned weights **69.9s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `193f2a9` — audit/verification guard; historical defect attribution not proved for this declaration. [snow/hull readback correction](1180-f-endurance-snow-sonar.md). Origin: `193f2a9 feat(f-endurance-snow-sonar): Endurance snow discs and hull blob fixes, HUD clearance`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Endurance low: hull-close lighting stays finite and horizon renders** — keeps probe.ndc, probe.pixel.slice, probe.horizon, probe.failed; full list in contract; **5.4s M**; captures **2/0/0**; bug **U `193f2a9`**; contract [A090](#a090).
- **Endurance medium: hull-close lighting stays finite and horizon renders** — keeps probe.ndc, probe.pixel.slice, probe.horizon, probe.failed; full list in contract; **9s M**; captures **2/0/0**; bug **U `193f2a9`**; contract [A090](#a090).
- **Endurance high: hull-close lighting stays finite and horizon renders** — keeps probe.ndc, probe.pixel.slice, probe.horizon, probe.failed; full list in contract; **27.2s M**; captures **2/0/0**; bug **U `193f2a9`**; contract [A090](#a090).
- **Endurance ultra: hull-close lighting stays finite and horizon renders** — keeps probe.ndc, probe.pixel.slice, probe.horizon, probe.failed; full list in contract; **28.3s M**; captures **2/0/0**; bug **U `193f2a9`**; contract [A090](#a090).

<a id="a090"></a>

**Contract A090 (f-endurance-1180.spec.ts:L20)** — `Endurance ${tier}: hull-close lighting stays finite and horizon renders`.

Row expansion: `const tier of ['low', 'medium', 'high', 'ultra']`.

Navigation: ``page.goto(`/?tile=endurance&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42`, { waitUntil: 'domcontentloaded', })``.

- `expect(Math.abs(probe.ndc[0])).toBeLessThan(1)`
- `expect(Math.abs(probe.ndc[1])).toBeLessThan(1)`
- `expect(Math.max(...probe.pixel.slice(0, 3))).toBeGreaterThan(10)`
- `expect(probe.horizon).toBe(true)`
- `expect(probe.failed).toBe(0)`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil(page, () => { const g = window.__game as unknown as Game; return !!(window.__gameReady && g.props.loaded && g.discovery.loaded && g.presets.entered); })`.

### [f-events-reform.spec.ts](../../tests/e2e/f-events-reform.spec.ts) — other

6 expanded cases; sum of assigned weights **270.0s**, 6 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `7ddb454` — audit/verification guard; historical defect attribution not proved for this declaration. feature/phone redesign4eb3478, not proof every bounded-frame threshold failed beforehand. Origin: `7ddb454 wip(1393-f-events-reform): round 1 (stopped at Codex limit)`.

Profile/skip controls (variables expanded by rows below): `test.use({ ...phone })`; `test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **desktop Low event review › plume: visible spawn, live cue, sighting and bounded active frame** — keeps .explore-caption, .journal, .journal .jr-body; full list in contract; **45s F**; captures **3/0/0**; bug **U `7ddb454`**; contract [A091](#a091).
- **desktop Low event review › turbidity: visible spawn, live cue, sighting and bounded active frame** — keeps .explore-caption, .journal, .journal .jr-body; full list in contract; **45s F**; captures **3/0/0**; bug **U `7ddb454`**; contract [A091](#a091).
- **desktop Low event review › whale: visible spawn, live cue, sighting and bounded active frame** — keeps .explore-caption, .journal, .journal .jr-body; full list in contract; **45s F**; captures **3/0/0**; bug **U `7ddb454`**; contract [A091](#a091).
- **phone Low event review › plume: visible spawn, live cue, sighting and bounded active frame** — keeps .explore-caption, .journal, .journal .jr-body; full list in contract; **45s F**; captures **3/0/0**; bug **U `7ddb454`**; contract [A091](#a091).
- **phone Low event review › turbidity: visible spawn, live cue, sighting and bounded active frame** — keeps .explore-caption, .journal, .journal .jr-body; full list in contract; **45s F**; captures **3/0/0**; bug **U `7ddb454`**; contract [A091](#a091).
- **phone Low event review › whale: visible spawn, live cue, sighting and bounded active frame** — keeps .explore-caption, .journal, .journal .jr-body; full list in contract; **45s F**; captures **3/0/0**; bug **U `7ddb454`**; contract [A091](#a091).

<a id="a091"></a>

**Contract A091 (f-events-reform.spec.ts:L111)** — `${kind}: visible spawn, live cue, sighting and bounded active frame`.

Row expansion: `const surface of ['desktop', 'phone'] as const`; `const [kind, site] of [ ['plume', 'beebe-vent-field'], ['turbidity', 'monterey-canyon'], ['whale', 'hudson-canyon'], ] as const`.

Navigation: ``page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, { waitUntil: 'domcontentloaded', })``.

- `expect( await page.evaluate( (kind) => (window.__game as unknown as Game).explore.previewEvent(kind), kind, ), ).toBe(true)`
- `expect(page.locator('.explore-caption')).toBeVisible()`
- `expect(page.locator('.explore-caption')).toContainText( kind === 'plume' ? 'Vent plume:' : kind === 'turbidity' ? 'Silt cloud:' : 'Whale passing:', )`
- `expect(measurements.range).toBeGreaterThanOrEqual(30)`
- `expect(measurements.range).toBeLessThanOrEqual(70)`
- `expect(Math.abs(measurements.projected[0])).toBeLessThan(1)`
- `expect(Math.abs(measurements.projected[1])).toBeLessThan(1)`
- `expect(measurements.particles).toBe(100)`
- `expect(measurements.calls).toBeLessThanOrEqual(1500)`
- `expect(measurements.triangles).toBeLessThanOrEqual(1_500_000)`
- `expect(measurements.tier).toBe('low')`
- `expect(page.locator('.explore-caption')).toBeVisible()`
- `expect(startLayout.covered, 'caption must leave the event visible').toBe(false)`
- `expect( startLayout.captionOverlays, 'caption must leave HUD and thumb controls clear', ).toEqual([])`

Scope: `if kind === 'whale'`.

- `expect(startLayout.subject.height).toBeGreaterThan(8)`

Scope: unconditional in this body.

- `expect(page.locator('.explore-caption')).toBeVisible()`
- `expect(movingLayout.covered, 'moving event must stay clear of its caption').toBe(false)`
- `expect(movingLayout.captionOverlays, 'moving caption must leave controls clear').toEqual( [], )`
- `expect(page.locator('.explore-caption')).toContainText('Sighting logged in Journal')`
- `expect( await page.evaluate( () => (window.__game as unknown as Game).explore.summary().events.length, ), ).toBe(1)`
- `expect(page.locator('.journal')).toContainText('Sighting:')`
- `expect(page.locator('.journal .jr-body')).toContainText(explanation)`
- ``expect(page.locator('.journal .jr-body').locator(`a[href="${source}"]`)).toHaveCount( 1, )``
- `expect(errors).toEqual([])`
- ``expect( await page.evaluate( ({ site, kind }) => (window.__game as unknown as Game).discoveries.isDiscovered(site, `event:${kind}`), { site, kind }, ), ).toBe(true)``

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game; return window.__gameReady && g.explore?.ready && g.props.loaded; })`; ``page.waitForFunction((kind) => { const g = window.__game as unknown as Game; return g.discoveries.isDiscovered( new URLSearchParams(location.search).get('tile')!, `event:${kind}`, ); }, kind)``; `page.waitForFunction(() => window.__gameReady === true)`.

### [f-fidelity-rollout.spec.ts](../../tests/e2e/f-fidelity-rollout.spec.ts) — perf

20 expanded cases; sum of assigned weights **1534.3s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Some opening budget fragments inperf-budget but Medium900k and every drift/detail differ; ordinary fidelity survivor, no captures.

History/provenance scope: **U**, `370eba3` — audit/verification guard; historical defect attribution not proved for this declaration. 370eba3 added ceiling guard; [1120/1230 CI triage](f-ci-triage2.md) identifies timeouts/splitting, not permission to drop rendered budget assertions. Origin: `370eba3 wip(875): fidelity rollout (Codex)`.

Profile/skip controls (variables expanded by rows below): .

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **great-blue-hole Medium desktop: opening stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **57.2s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **great-blue-hole Medium desktop: karst-grotto-2 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **149.3s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **great-blue-hole Medium desktop: karst-grotto-3 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **100.9s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **great-blue-hole Medium desktop: karst-grotto-east-2 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **109.6s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **great-blue-hole Medium desktop: karst-grotto-east-3 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **140.9s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **great-blue-hole Medium portrait: opening stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **29.8s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **great-blue-hole Medium portrait: karst-grotto-2 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **48.3s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **great-blue-hole Medium portrait: karst-grotto-3 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **50.8s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **great-blue-hole Medium portrait: karst-grotto-east-2 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **37s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **great-blue-hole Medium portrait: karst-grotto-east-3 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **40.6s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium desktop: opening stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **119.1s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium desktop: poseidon-tower-2, vertical drift -2 m stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **77.9s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium desktop: poseidon-tower-2, vertical drift 0 m stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **51.7s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium desktop: poseidon-tower-2, vertical drift 2 m stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **75.9s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium desktop: poseidon-tower-3, vertical drift -2 m stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **90.2s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium desktop: poseidon-tower-3, vertical drift 0 m stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **93.5s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium desktop: poseidon-tower-3, vertical drift 2 m stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **94.4s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium portrait: opening stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **22.9s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium portrait: poseidon-tower-2 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **69.9s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).
- **lost-city Medium portrait: poseidon-tower-3 stays below 900k rendered triangles** — keeps perf.tier, perf.draws, perf.triangles; full list in contract; **74.4s M**; captures **0/0/0**; bug **U `370eba3`**; contract [A092](#a092).

<a id="a092"></a>

**Contract A092 (f-fidelity-rollout.spec.ts:L45)** — `${site} Medium ${layout.name}: ${poseName}${suffix} stays below 900k rendered triangles`.

Row expansion: `const site of ['great-blue-hole', 'lost-city']`; `const layout of [ { name: 'desktop', width: 1600, height: 900 }, { name: 'portrait', width: 390, height: 844 }, ]`; `const { poseName, drifts } of cases`.

Navigation: ``page.goto( `/?tile=${site}&tier=medium&skipBriefing=1&tutorial=0&lifeSeed=42&dynres=0${layout.name === 'portrait' ? '&touch=1' : ''}`, )``.

- ``expect(pose, `Missing golden pose ${poseName}`).toBeDefined()``

Scope: `const drift of drifts`.

- `expect(perf.tier).toBe('medium')`
- `expect(perf.draws).toBeGreaterThan(0)`
- ``expect(perf.triangles, `${pose.name}, vertical drift ${drift} m`).toBeGreaterThan(0)``
- ``expect(perf.triangles, `${pose.name}, vertical drift ${drift} m`).toBeLessThan(900_000)``

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Failure guards: `throw new Error('No clear Poseidon golden approach');`; ``throw new Error(`Missing golden pose ${poseName}`);``.

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game; return window.__gameReady && g?.props.loaded && g.discovery.loaded; })`.

### [f-first-minute-620.spec.ts](../../tests/e2e/f-first-minute-620.spec.ts) — onboarding

32 expanded cases; sum of assigned weights **1405.9s**, 26 fallback keys. Disposition: **retain ordinary capability guard; existing opt-in/local-only restrictions recorded**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `ed98895` — audit/verification guard; historical defect attribution not proved for this declaration. [first minute findings](f-firstminute.md), [HUD correction](f-hud-overlap.md). Origin: `ed98895 wip(620-f-first-minute-audit): Codex result, gates per .cache/codex/620-f-first-minute-audit-result.md`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch, isMobile: layout.touch, deviceScaleFactor: 1, storageState: { cookies: [], origins: [] }, serviceWorkers: 'block', })`; `test.skip(!audit, 'Opt-in real 60-second capture: FIRSTMIN_AUDIT=1.')`; `test.skip(round === 'before', 'Baseline captures do not include the fixed guidance hooks.')`; `test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch, isMobile: layout.touch, storageState: { cookies: [], origins: [] }, serviceWorkers: 'block', })`.

Selector/fixture constants: `selectors = [ '.onboard-card', '.onboard-hint', '.hud-control-tips', '.scan-panel', '.objectives-panel', '.obj-item.is-current', '.hud-readouts', '.tc-stick', '.tc-slider', '.tc-buttons', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **620 round 1 desktop › first minute titanic** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute challenger-deep** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute lost-city** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute monterey-canyon** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute endurance** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute axial-seamount-ashes** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute hudson-canyon** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute kamaehuakanaloa** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute beebe-vent-field** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute great-blue-hole** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute bismarck** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute hunga-tonga-caldera** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 desktop › first minute blake-plateau-corals** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute titanic** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute challenger-deep** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute lost-city** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute monterey-canyon** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute endurance** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute axial-seamount-ashes** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute hudson-canyon** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute kamaehuakanaloa** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute beebe-vent-field** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute great-blue-hole** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute bismarck** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute hunga-tonga-caldera** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 round 1 touch › first minute blake-plateau-corals** — keeps .home-screen, .briefing, .hud-control-tips; full list in contract; **45s F**; captures **9/0/0 enabled**; bug **U `ed98895`**; contract [A093](#a093); requires FIRSTMIN_AUDIT=1.
- **620 guidance desktop › idle guidance expires at twelve seconds and Controls remains available** — keeps .onboard-card, dialog; full list in contract; **17.2s M**; captures **0/0/0**; bug **U `ed98895`**; contract [A094](#a094).
- **620 guidance desktop › animal hint and strip fade on the first actual move; scan stays separate** — keeps .hud-control-tips, .scan-panel; full list in contract; **95.5s M**; captures **2/0/0**; bug **U `ed98895`**; contract [A095](#a095).
- **620 guidance portrait › idle guidance expires at twelve seconds and Controls remains available** — keeps .onboard-card, dialog; full list in contract; **5.9s M**; captures **0/0/0**; bug **U `ed98895`**; contract [A094](#a094).
- **620 guidance portrait › animal hint and strip fade on the first actual move; scan stays separate** — keeps .hud-control-tips, .scan-panel; full list in contract; **46.4s M**; captures **2/0/0**; bug **U `ed98895`**; contract [A095](#a095).
- **620 guidance landscape › idle guidance expires at twelve seconds and Controls remains available** — keeps .onboard-card, dialog; full list in contract; **12.5s M**; captures **0/0/0**; bug **U `ed98895`**; contract [A094](#a094).
- **620 guidance landscape › animal hint and strip fade on the first actual move; scan stays separate** — keeps .hud-control-tips, .scan-panel; full list in contract; **58.4s M**; captures **2/0/0**; bug **U `ed98895`**; contract [A095](#a095).

<a id="a093"></a>

**Contract A093 (f-first-minute-620.spec.ts:L89)** — `first minute ${site}`.

Row expansion: `let pass = 1; pass <= rounds`; `const layout of [ { name: 'desktop', width: 1280, height: 800, touch: false }, { name: 'touch', width: 390, height: 844, touch: true }, ]`; `const site of catalog.landmarks`.

Navigation: `page.goto('/', { waitUntil: 'domcontentloaded' })`.

- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(choice).toBeEnabled()`
- `expect(page.locator('.briefing')).toBeVisible()`
- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(errors).toEqual([])`

Scope: `if round !== 'before'`.

- `expect(page.locator('.hud-control-tips')).toBeHidden()`

Readiness/temporal predicates: `page.waitForFunction( (seconds) => (window.__game as unknown as Game).discovery.stats.elapsedS >= seconds, seconds, { timeout: 120_000 }, )`.

Helper guard closure: [ready](#f-first-minute-620-spec-ts-24-ready), [hold](#f-first-minute-620-spec-ts-29-hold), [expectObjectiveGuidance](#helpers-phonehud-ts-7-expectobjectiveguidance).

Helper call bindings: `ready(page)`; `hold(page, layout.touch, '.tc-stick', 'KeyW', 1500)`; `hold(page, layout.touch, '.tc-btn-scan', 'KeyG', 4500)`; `expectObjectiveGuidance(page, layout.touch)`.

<a id="a094"></a>

**Contract A094 (f-first-minute-620.spec.ts:L202)** — 'idle guidance expires at twelve seconds and Controls remains available'.

Row expansion: `const layout of [ { name: 'desktop', width: 1280, height: 800, touch: false }, { name: 'portrait', width: 390, height: 844, touch: true }, { name: 'landscape', width: 844, height: 390, touch: true }, ]`.

Navigation: `page.goto('/?mission=titanic&skipBriefing=1&tier=low')`.

Scope: `if !layout.touch`.

- `expect(tips).toBeVisible()`

Scope: unconditional in this body.

- `expect(remaining.moved).toBe(false)`
- `expect(remaining.ms).toBeGreaterThan(0)`
- `expect(remaining.ms).toBeLessThanOrEqual(12_000)`
- `expect(tips).toBeHidden()`
- `expect( await page.evaluate( () => (window.__game as { cameraTips: { moved: boolean } }).cameraTips.moved, ), ).toBe(false)`
- `expect(page.locator('.onboard-card')).toBeVisible()`
- `expect( page.getByRole('dialog', { name: layout.touch ? 'How to play' : 'Controls guide' }), ).toBeVisible()`

Helper guard closure: [ready](#f-first-minute-620-spec-ts-24-ready), [expectObjectiveGuidance](#helpers-phonehud-ts-7-expectobjectiveguidance).

Helper call bindings: `ready(page)`; `expectObjectiveGuidance(page, layout.touch)`.

<a id="a095"></a>

**Contract A095 (f-first-minute-620.spec.ts:L239)** — 'animal hint and strip fade on the first actual move; scan stays separate'.

Row expansion: `const layout of [ { name: 'desktop', width: 1280, height: 800, touch: false }, { name: 'portrait', width: 390, height: 844, touch: true }, { name: 'landscape', width: 844, height: 390, touch: true }, ]`.

Navigation: `page.goto('/?mission=great-blue-hole&skipBriefing=1&tier=low&lifeSeed=3')`.

- `expect(spawned).toBe(true)`
- `expect(hint).toContainText('Animal nearby')`
- `expect(hint).toBeVisible()`
- `expect(toast.y).toBeGreaterThanOrEqual(target.y + target.height + 7)`
- `expect(toast.x).toBeCloseTo(target.x, 0)`
- `expect(hint).toBeHidden()`
- `expect(page.locator('.hud-control-tips')).toBeHidden()`
- `expect(page.locator('.scan-panel')).toBeVisible()`

Readiness/temporal predicates: `page.waitForFunction(() => !!(window.__game as { life: unknown }).life)`.

Helper guard closure: [ready](#f-first-minute-620-spec-ts-24-ready), [hold](#f-first-minute-620-spec-ts-29-hold), [expectObjectiveGuidance](#helpers-phonehud-ts-7-expectobjectiveguidance).

Helper call bindings: `ready(page)`; `hold(page, layout.touch, '.tc-stick', 'KeyW', 0)`; `expectObjectiveGuidance(page, layout.touch)`.

### [f-flow-audit-510.spec.ts](../../tests/e2e/f-flow-audit-510.spec.ts) — Journal/debrief

9 expanded cases; sum of assigned weights **585.9s**, 0 fallback keys. Disposition: **fold → journal-debrief.spec.ts**.

Overlap: Journal/debrief fragments overlap720/1060, but first native actions/focus/Home-through-exit journey differs; J6 union survives.

History/provenance scope: **U**, `f91bd0d` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `f91bd0d feat(510): Journal/debrief flow fixes, portrait Journal layout, 15-flow audit spec`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.touch, isMobile: viewport.touch, deviceScaleFactor: 1, storageState: { cookies: [], origins: [] }, serviceWorkers: 'block', })`.

Selector/fixture constants: `sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon']`; `selectors = [ '.onboard-card', '.objectives-panel', '.hud-readouts', '.scan-panel', '.sonar', '.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause', '.jr-panel', '.debrief-panel', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **510 flow 1600x900 › titanic: Home -> opening -> Journal -> debrief -> Home** — keeps button, .home-sites, .briefing, .onboard-card, .jr-body .jr-locked, .jr-body .is-undiscovered; full list in contract; **51s M**; captures **14/0/0 default10s;16 if60s**; bug **U `f91bd0d`**; contract [A096](#a096).
- **510 flow 1600x900 › great-blue-hole: Home -> opening -> Journal -> debrief -> Home** — keeps button, .home-sites, .briefing, .onboard-card, .jr-body .jr-locked, .jr-body .is-undiscovered; full list in contract; **158.6s M**; captures **14/0/0 default10s;16 if60s**; bug **U `f91bd0d`**; contract [A096](#a096).
- **510 flow 844x390 › titanic: Home -> opening -> Journal -> debrief -> Home** — keeps button, .home-sites, .briefing, .onboard-card, .jr-body .jr-locked, .jr-body .is-undiscovered; full list in contract; **44.2s M**; captures **14/0/0 default10s;16 if60s**; bug **U `f91bd0d`**; contract [A096](#a096).
- **510 flow 844x390 › lost-city: Home -> opening -> Journal -> debrief -> Home** — keeps button, .home-sites, .briefing, .onboard-card, .jr-body .jr-locked, .jr-body .is-undiscovered; full list in contract; **49.9s M**; captures **14/0/0 default10s;16 if60s**; bug **U `f91bd0d`**; contract [A096](#a096).
- **510 flow 844x390 › great-blue-hole: Home -> opening -> Journal -> debrief -> Home** — keeps button, .home-sites, .briefing, .onboard-card, .jr-body .jr-locked, .jr-body .is-undiscovered; full list in contract; **72.5s M**; captures **14/0/0 default10s;16 if60s**; bug **U `f91bd0d`**; contract [A096](#a096).
- **510 flow 844x390 › beebe-vent-field: Home -> opening -> Journal -> debrief -> Home** — keeps button, .home-sites, .briefing, .onboard-card, .jr-body .jr-locked, .jr-body .is-undiscovered; full list in contract; **46.8s M**; captures **14/0/0 default10s;16 if60s**; bug **U `f91bd0d`**; contract [A096](#a096).
- **510 flow 390x844 › titanic: Home -> opening -> Journal -> debrief -> Home** — keeps button, .home-sites, .briefing, .onboard-card, .jr-body .jr-locked, .jr-body .is-undiscovered; full list in contract; **25.2s M**; captures **14/0/0 default10s;16 if60s**; bug **U `f91bd0d`**; contract [A096](#a096).
- **510 flow 390x844 › great-blue-hole: Home -> opening -> Journal -> debrief -> Home** — keeps button, .home-sites, .briefing, .onboard-card, .jr-body .jr-locked, .jr-body .is-undiscovered; full list in contract; **61.8s M**; captures **14/0/0 default10s;16 if60s**; bug **U `f91bd0d`**; contract [A096](#a096).
- **510 flow 390x844 › monterey-canyon: Home -> opening -> Journal -> debrief -> Home** — keeps button, .home-sites, .briefing, .onboard-card, .jr-body .jr-locked, .jr-body .is-undiscovered; full list in contract; **75.9s M**; captures **14/0/0 default10s;16 if60s**; bug **U `f91bd0d`**; contract [A096](#a096).

<a id="a096"></a>

**Contract A096 (f-flow-audit-510.spec.ts:L190)** — `${site}: Home -> opening -> Journal -> debrief -> Home`.

Row expansion: `const viewport of [ { width: 1600, height: 900, touch: false, sites: ['titanic', 'great-blue-hole'] }, { width: 844, height: 390, touch: true, sites: ['lost-city', 'beebe-vent-field', 'titanic', 'great-blue-hole'], }, { width: 390, height: 844, touch: true, sites: ['monterey-canyon', 'titanic', 'great-blue-hole'], }, ]`; `const site of sites.filter((site) => viewport.sites.includes(site))`.

Navigation: `page.goto('/', { waitUntil: 'domcontentloaded' })`.

- `expect(home).toBeVisible()`
- `expect(home.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()`
- `expect(home.locator('.home-sites')).toBeHidden()`
- `expect(choice).toBeEnabled()`
- `expect(page.locator('.briefing')).toBeVisible()`
- `expect(home).toBeVisible()`
- `expect(page.locator('.onboard-card')).toHaveAttribute('data-step', 'move')`

Scope: `const seconds of [10, 30, 60].filter((s) => s <= captureSeconds)`.

- `expect .poll( async () => { // One real frame per bounded clock advance; Time caps its delta at 250 ms. await page.clock.fastForward(250); return page.evaluate( () => (window.__game as unknown as Game).discovery.stats.elapsedS, ); }, { timeout: 180_000, intervals: [20] }, ) .toBeGreaterThanOrEqual(seconds)`

Scope: unconditional in this body.

- `expect(journal.locator('.jr-body .jr-locked')).toBeVisible()`
- `expect(journal.locator('.jr-body .is-undiscovered')).toHaveText('No scans logged')`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(debrief).toBeVisible()`
- `expect(debrief.locator('.debrief-title')).toHaveText('Back at the surface')`
- `expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('0')`
- `expect(journal).toBeVisible()`
- `expect(debrief).toBeVisible()`
- `expect(debrief.locator('[data-action="journal"]')).toBeFocused()`

Scope: `if touch`.

- `expect(page.locator('.tc-btn-scan')).toBeVisible()`

Scope: unconditional in this body.

- `expect(journal.locator('.jr-body .jr-title')).not.toHaveText('Undiscovered')`
- `expect(journal.locator('.jr-body .jr-locked')).toHaveCount(0)`
- `expect .poll(() => page.evaluate(() => (window.__game as unknown as Game).journal.selectedId)) .toBe(poi.entry)`

Scope: `if size === '844x390'`.

- `expect(await journal.locator('.jr-body').evaluate((e) => e.scrollTop)).toBeGreaterThan(0)`

Scope: unconditional in this body.

- `expect.poll(() => journal.locator('.jr-body').evaluate((e) => e.scrollTop)).toBe(0)`
- `expect(debrief).toBeVisible()`
- `expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('1')`

Scope: `if size === '844x390'`.

- `expect( await debrief.locator('.debrief-panel').evaluate((e) => e.scrollTop), ).toBeGreaterThan(0)`

Scope: unconditional in this body.

- `expect .poll(() => debrief.locator('.debrief-panel').evaluate((e) => e.scrollTop)) .toBe(0)`
- `expect(home).toBeVisible()`
- `expect(home.locator('.home-menu')).toBeVisible()`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [contained](#f-flow-audit-510-spec-ts-40-contained), [expectCompactPhoneHud](#helpers-phonehud-ts-17-expectcompactphonehud), [firstActions](#f-flow-audit-510-spec-ts-125-firstactions), [holdTouchUntilStep](#f-flow-audit-510-spec-ts-95-holdtouchuntilstep), [pause](#f-flow-audit-510-spec-ts-65-pause), [journalContents](#helpers-journal-ts-16-journalcontents), [closeJournal](#f-flow-audit-510-spec-ts-74-closejournal), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `contained(choice)`; `expectCompactPhoneHud(page)`; `firstActions(page, touch)`; `pause(page, touch)`; `contained(journal.locator('.jr-header'))`; `contained(journal.locator('.jr-body'))`; `closeJournal(page, touch)`; `contained(debrief.locator('.debrief-panel'))`.

### [f-geo-scarp.spec.ts](../../tests/e2e/f-geo-scarp.spec.ts) — rendering/visual

20 expanded cases; sum of assigned weights **749.1s**, 0 fallback keys. Disposition: **split: numeric/functional guards ordinary; review captures nightly**.

Overlap: Rock-seat probe repeated across5 views/site; geometry can share once/site after proof, per-view triangles remain; nightly capturesonly.

History/provenance scope: **U**, `182261e` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `182261e wip(f-geo-scarp): wall kit with talus apron, arc plan, strata beds, stalactite alcove`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })`.

Selector/fixture constants: `sites = [ { id: 'challenger-deep', hero: 'north-wall-scarp' }, { id: 'monterey-canyon', hero: 'canyon-wall-ledge' }, { id: 'hunga-tonga-caldera', hero: 'caldera-tuff-wall' }, { id: 'great-blue-hole', hero: 'karst-grotto' }, ]`; `views = [ { name: 'wide', range: 10, radius: 70, elevation: 0.25, azimuth: 0.2, side: 0.1 }, { name: 'toe', range: 4, radius: 22, elevation: 0.12, azimuth: 0.55, side: 0.12 }, { name: 'oblique', range: 8, radius: 48, elevation: 0.2, azimuth: 1.05, side: 0.2 }, { name: 'high', range: 6, radius: 75, elevation: 0.6, azimuth: -0.4, side: -0.15 }, ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **F-GEO-SCARP wall heroes › challenger-deep: north-wall-scarp wide wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **36.4s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › challenger-deep: north-wall-scarp toe wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **40.1s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › challenger-deep: north-wall-scarp oblique wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **35.1s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › challenger-deep: north-wall-scarp high wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **29s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › challenger-deep: north-wall-scarp cockpit wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **47.6s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › monterey-canyon: canyon-wall-ledge wide wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **28.5s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › monterey-canyon: canyon-wall-ledge toe wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **62s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › monterey-canyon: canyon-wall-ledge oblique wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **57.4s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › monterey-canyon: canyon-wall-ledge high wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **52.2s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › monterey-canyon: canyon-wall-ledge cockpit wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **34.8s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › hunga-tonga-caldera: caldera-tuff-wall wide wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **18.5s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › hunga-tonga-caldera: caldera-tuff-wall toe wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **29.5s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › hunga-tonga-caldera: caldera-tuff-wall oblique wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **35.5s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › hunga-tonga-caldera: caldera-tuff-wall high wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **15.2s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › hunga-tonga-caldera: caldera-tuff-wall cockpit wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **33.6s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › great-blue-hole: karst-grotto wide wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **37.5s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › great-blue-hole: karst-grotto toe wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **46.2s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › great-blue-hole: karst-grotto oblique wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **38.6s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › great-blue-hole: karst-grotto high wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **29.5s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).
- **F-GEO-SCARP wall heroes › great-blue-hole: karst-grotto cockpit wall screenshot** — keeps rocks.count, rocks.min, rocks.max, rocks.height, perf.draws, perf.triangles; full list in contract; **41.9s M**; captures **1/0/0**; bug **U `182261e`**; contract [A097](#a097).

<a id="a097"></a>

**Contract A097 (f-geo-scarp.spec.ts:L56)** — `${id}: ${hero} ${view} wall screenshot`.

Row expansion: `const { id, hero } of sites`; `const view of [...views.map((v) => v.name), 'cockpit']`.

Navigation: ``page.goto(`/?tile=${id}&skipBriefing=1&tier=medium`, { waitUntil: 'domcontentloaded', timeout: 120_000, })``.

- `expect(rocks.count).toBeGreaterThan(20)`
- `expect(rocks.min).toBeGreaterThan(-3)`
- `expect(rocks.max).toBeLessThan(rocks.height * 0.5)`
- `expect(perf.draws).toBeGreaterThan(0)`
- `expect(perf.triangles).toBeLessThan(900_000)`
- `expect(errors).toEqual([])`

Failure guards: ``throw new Error(`missing ${hero}`);``.

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 120_000, })`; `page.waitForFunction( () => { const g = window.__game as unknown as Game | undefined; return g?.props.loaded && g.discovery.loaded; }, undefined, { timeout: 90_000 }, )`.

### [f-horizon-1190.spec.ts](../../tests/e2e/f-horizon-1190.spec.ts) — rendering/visual

8 expanded cases; sum of assigned weights **88.8s**, 0 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `545d3b3` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `545d3b3 feat(1190): Titanic haze/horizon fog continuity`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **titanic low desktop: horizon and opening remain readable** — keeps probe.visible, probe.vertices, probe.tier, probe.failed, probe.canvas, probe.wreckHaze; full list in contract; **4.1s M**; captures **1/0/0**; bug **U `545d3b3`**; contract [A098](#a098).
- **titanic low portrait: horizon and opening remain readable** — keeps probe.visible, probe.vertices, probe.tier, probe.failed, probe.canvas, probe.wreckHaze; full list in contract; **4s M**; captures **1/0/0**; bug **U `545d3b3`**; contract [A098](#a098).
- **titanic high desktop: horizon and opening remain readable** — keeps probe.visible, probe.vertices, probe.tier, probe.failed, probe.canvas, probe.wreckHaze; full list in contract; **26.3s M**; captures **1/0/0**; bug **U `545d3b3`**; contract [A098](#a098).
- **titanic high portrait: horizon and opening remain readable** — keeps probe.visible, probe.vertices, probe.tier, probe.failed, probe.canvas, probe.wreckHaze; full list in contract; **12.6s M**; captures **1/0/0**; bug **U `545d3b3`**; contract [A098](#a098).
- **endurance low desktop: horizon and opening remain readable** — keeps probe.visible, probe.vertices, probe.tier, probe.failed, probe.canvas, probe.wreckHaze; full list in contract; **5s M**; captures **1/0/0**; bug **U `545d3b3`**; contract [A098](#a098).
- **endurance low portrait: horizon and opening remain readable** — keeps probe.visible, probe.vertices, probe.tier, probe.failed, probe.canvas, probe.wreckHaze; full list in contract; **5.7s M**; captures **1/0/0**; bug **U `545d3b3`**; contract [A098](#a098).
- **endurance high desktop: horizon and opening remain readable** — keeps probe.visible, probe.vertices, probe.tier, probe.failed, probe.canvas, probe.wreckHaze; full list in contract; **22.4s M**; captures **1/0/0**; bug **U `545d3b3`**; contract [A098](#a098).
- **endurance high portrait: horizon and opening remain readable** — keeps probe.visible, probe.vertices, probe.tier, probe.failed, probe.canvas, probe.wreckHaze; full list in contract; **8.7s M**; captures **1/0/0**; bug **U `545d3b3`**; contract [A098](#a098).

<a id="a098"></a>

**Contract A098 (f-horizon-1190.spec.ts:L22)** — `${site} ${tier} ${layout}: horizon and opening remain readable`.

Row expansion: `const site of ['titanic', 'endurance']`; `const tier of ['low', 'high']`; `const [layout, width, height] of [ ['desktop', 1600, 900], ['portrait', 390, 844], ] as const`.

Navigation: ``page.goto( `/?tile=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42${layout === 'portrait' ? '&touch=1' : ''}`, { waitUntil: 'domcontentloaded' }, )``.

- `expect(probe.visible).toBe(true)`
- `expect(probe.vertices).toBe(561)`
- `expect(probe.tier).toBe(tier)`
- `expect(probe.failed).toBe(0)`
- `expect(probe.canvas).toEqual({ width, height })`

Scope: `if tier === 'low'`.

- `expect(probe.wreckHaze).toBe(false)`

Scope: unconditional in this body.

- `expect(mean).toBeGreaterThan(10)`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil(page, () => { const g = window.__game as unknown as Game; return !!( window.__gameReady && g.props.loaded && g.discovery.loaded && g.presets.entered ); })`.

### [f-hud-layout.spec.ts](../../tests/e2e/f-hud-layout.spec.ts) — HUD/touch layout

8 expanded cases; sum of assigned weights **311.7s**, 0 fallback keys. Disposition: **fold → hud-touch.spec.ts**.

Overlap: Same Monterey1280×720/844×390 opening box fragments in1390; H6 union keeps explicit presence/wrappers; fixture and learned-tip rows separate.

History/provenance scope: **R**, `58f4a46` — HUD overlapping tutorial/contact/objectives plus learned hint lifetime. Origin: `58f4a46 wip(f-hud-layout): relayout HUD, learned hint bar, overlap e2e`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch })`; `test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch })`; `test.use({ viewport: { width: 1280, height: 720 } })`.

Selector/fixture constants: `selectors = ['.onboard-card', '.scan-panel', '.hud-readouts']`; `selectors = ['.onboard-card', '.objectives-panel', '.hud-readouts']`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **desktop-1600 › fresh dive HUD has separate spaces** — keeps .hud-control-tips, .onboard-card; full list in contract; **42.6s M**; captures **1/0/0**; bug **R `58f4a46`**; contract [A099](#a099).
- **desktop-1280 › fresh dive HUD has separate spaces** — keeps .hud-control-tips, .onboard-card; full list in contract; **32.2s M**; captures **1/0/0**; bug **R `58f4a46`**; contract [A099](#a099).
- **phone-landscape › fresh dive HUD has separate spaces** — keeps .hud-control-tips, .onboard-card; full list in contract; **37.8s M**; captures **1/0/0**; bug **R `58f4a46`**; contract [A099](#a099).
- **tablet-landscape › fresh dive HUD has separate spaces** — keeps .hud-control-tips, .onboard-card; full list in contract; **64s M**; captures **1/0/0**; bug **R `58f4a46`**; contract [A099](#a099).
- **mission desktop-1280 › card, objectives and readouts do not overlap** — keeps locator('.onboard-card')).toBeVisible(); locator('.objectives-panel')).toBeVisible(); **62.6s M**; captures **1/0/0**; bug **R `58f4a46`**; contract [A100](#a100).
- **mission phone-landscape › card, objectives and readouts do not overlap** — keeps locator('.onboard-card')).toBeVisible(); locator('.objectives-panel')).toBeVisible(); **37.2s M**; captures **1/0/0**; bug **R `58f4a46`**; contract [A100](#a100).
- **controls hint bar › hides after the first move, still records all controls, and stays in Help** — keeps dialog; full list in contract; **30.8s M**; captures **0/0/0**; bug **R `58f4a46`**; contract [A101](#a101).
- **controls hint bar › the hint deadline expires without marking controls learned** — keeps .hud-control-tips; full list in contract; **4.5s M**; captures **0/0/0**; bug **R `58f4a46`**; contract [A102](#a102).

<a id="a099"></a>

**Contract A099 (f-hud-layout.spec.ts:L65)** — 'fresh dive HUD has separate spaces'.

Row expansion: `const layout of [ { name: 'desktop-1600', width: 1600, height: 900, touch: false }, { name: 'desktop-1280', width: 1280, height: 720, touch: false }, { name: 'phone-landscape', width: 844, height: 390, touch: true }, { name: 'tablet-landscape', width: 1024, height: 768, touch: true }, ]`.

Scope: `if layout.touch`.

- `expect(page.locator('.hud-control-tips')).toBeHidden()`

Scope: `const name of layout.name === 'phone-landscape' ? ['Skip'] : ['Skip step', 'Skip tutorial']`.

- `expect(box.width).toBeGreaterThanOrEqual(44)`
- `expect(box.height).toBeGreaterThanOrEqual(44)`

Scope: `let step = 1; step < 5`.

- `expect(page.locator('.onboard-card')).toHaveAttribute( 'data-step', ['move', 'depth', 'lights', 'scan', 'journal'][step], )`

Helper guard closure: [boot](#f-hud-layout-spec-ts-12-boot), [finishAnimations](#helpers-hudtips-ts-23-finishanimations), [clearLayout](#f-hud-layout-spec-ts-26-clearlayout).

Helper call bindings: `boot(page, layout.touch)`; `clearLayout(page, selectors)`.

<a id="a100"></a>

**Contract A100 (f-hud-layout.spec.ts:L103)** — 'card, objectives and readouts do not overlap'.

Row expansion: `const layout of [ { name: 'desktop-1280', width: 1280, height: 720, touch: false }, { name: 'phone-landscape', width: 844, height: 390, touch: true }, ]`.

Navigation: ``page.goto( `/?mission=monterey-canyon&skipBriefing=1&tier=low${layout.touch ? '&touch=1' : ''}`, )``.

- `expect(page.locator('.onboard-card')).toBeVisible()`
- `expect(page.locator('.objectives-panel')).toBeVisible()`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`; `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`.

Helper guard closure: [finishAnimations](#helpers-hudtips-ts-23-finishanimations), [clearLayout](#f-hud-layout-spec-ts-26-clearlayout).

Helper call bindings: `finishAnimations(page, '.onboard-card')`; `clearLayout(page, selectors)`.

<a id="a101"></a>

**Contract A101 (f-hud-layout.spec.ts:L140)** — 'hides after the first move, still records all controls, and stays in Help'.

Navigation: `page.goto('/?mission=titanic&skipBriefing=1&tier=low')`.

- `expect(tips).toBeVisible()`
- `expect(tips).toBeHidden()`
- `expect( await page.evaluate( () => JSON.parse(localStorage.getItem('subexplorer.controlsLearned.v1')!).learned, ), ).toBe(false)`
- `expect(tips).toBeHidden()`
- `expect( await page.evaluate( () => JSON.parse(localStorage.getItem('subexplorer.controlsLearned.v1')!).learned, ), ).toBe(true)`
- `expect(page.getByRole('dialog', { name: 'Controls guide' })).toBeVisible()`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`; `page.waitForFunction( () => (window.__game as { cameraTips: { moved: boolean } }).cameraTips.moved, )`.

<a id="a102"></a>

**Contract A102 (f-hud-layout.spec.ts:L178)** — 'the hint deadline expires without marking controls learned'.

Navigation: `page.goto('/?tile=titanic&tier=low')`.

- `expect(page.locator('.hud-control-tips')).toBeVisible()`
- `expect(page.locator('.hud-control-tips')).toBeHidden()`
- `expect( await page.evaluate( () => JSON.parse(localStorage.getItem('subexplorer.controlsLearned.v1')!).learned, ), ).toBe(false)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

### [f-journal-debrief-1060.spec.ts](../../tests/e2e/f-journal-debrief-1060.spec.ts) — Journal/debrief

10 expanded cases; sum of assigned weights **326.3s**, 0 fallback keys. Disposition: **fold → journal-debrief.spec.ts**.

Overlap: Common summary/layout/return-focus with720; survivorJ2. Disclosure keyboard/axe/tag/three-round contract unique.

History/provenance scope: **U**, `a3a5c4f` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `a3a5c4f feat: collapsible Journal groups and compact debrief (1060)`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport, hasTouch: viewport.touch, isMobile: viewport.touch, deviceScaleFactor: 1, storageState: { cookies: [], origins: [] }, })`.

Selector/fixture constants: `sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon']`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1060 Journal/debrief 1600x900 › titanic: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **33.3s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).
- **1060 Journal/debrief 1600x900 › lost-city: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **42s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).
- **1060 Journal/debrief 1600x900 › great-blue-hole: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **55.5s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).
- **1060 Journal/debrief 1600x900 › beebe-vent-field: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **24s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).
- **1060 Journal/debrief 1600x900 › monterey-canyon: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **81.3s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).
- **1060 Journal/debrief 390x844 › titanic: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **10.8s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).
- **1060 Journal/debrief 390x844 › lost-city: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **19.4s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).
- **1060 Journal/debrief 390x844 › great-blue-hole: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **20.2s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).
- **1060 Journal/debrief 390x844 › beebe-vent-field: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **13s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).
- **1060 Journal/debrief 390x844 › monterey-canyon: expandable groups, single tag and short debrief over 3 rounds** — keeps .debrief-panel, .debrief-score, [data-field=, .debrief-highlight, .debrief-next, .debrief-btn.is-primary; full list in contract; **26.8s M**; captures **2R+3 desktop /2R+2 phone; defaultR=3:9/8;R=1:5/4**; bug **U `a3a5c4f`**; contract [A103](#a103).

<a id="a103"></a>

**Contract A103 (f-journal-debrief-1060.spec.ts:L41)** — `${site}: expandable groups, single tag and short debrief over ${rounds} rounds`.

Row expansion: `const viewport of [ { width: 1600, height: 900, touch: false }, { width: 390, height: 844, touch: true }, ]`; `const site of sites`.

Navigation: ``page.goto(`/?mission=${site}&skipBriefing=1&tier=low`, { waitUntil: 'domcontentloaded', })``.

Scope: `let round = 1; round <= rounds`.

- `expect(debrief).toBeVisible()`
- `expect( await debrief .locator('.debrief-panel') .evaluate((el) => el.scrollHeight - el.clientHeight), ).toBeLessThanOrEqual(1)`
- `expect(debrief.locator('.debrief-score')).toHaveCount(1)`
- `expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText( round === 1 ? '0' : '1', )`
- ``expect(debrief.locator('.debrief-highlight')).toHaveText( round === 1 ? 'The site is waiting for your first scan.' : `Scanned ${scanName}.`, )``
- `expect(debrief.locator('.debrief-next')).toHaveCount(1)`
- `expect(debrief.locator('.debrief-btn.is-primary')).toHaveCount(1)`
- `expect( debrief.locator('.debrief-stats, .debrief-lists, .debrief-subtitle'), ).toHaveCount(0)`
- `expect(journal).toBeVisible()`

Scope: `let round = 1; round <= rounds; if viewport.touch`.

- `expect(journal.locator('.jr-nav')).toBeHidden()`

Scope: `let round = 1; round <= rounds; if viewport.touch; if round === 1`.

- `expect(journal.locator('.jr-site-more summary')).toBeVisible()`
- `expect(tags).toHaveCount(1)`
- `expect(tags).toHaveText('Game addition')`
- `expect(tags).toHaveCount(1)`
- `expect(tags).toHaveText('Game addition')`
- `expect(axe.violations.map((v) => v.id)).toEqual([])`

Scope: `let round = 1; round <= rounds; else of viewport.touch`.

- `expect(current).toHaveAttribute('aria-expanded', 'true')`

Scope: `let round = 1; round <= rounds; else of viewport.touch; if round === 1`.

- `expect( journal.locator('.jr-nav-list > li > [aria-expanded="true"]'), ).toHaveCount(1)`
- `expect(poi).toHaveAttribute('open', '')`
- `expect(poi.locator('.jr-more-to-find')).toHaveText(/^\d+ more to find$/)`
- `expect( journal.locator('.jr-nav-item', { hasText: /Unscanned target/ }), ).toHaveCount(0)`
- `expect(wildlife).not.toHaveAttribute('open', '')`
- `expect(wildlife).toHaveAttribute('open', '')`
- `expect(wildlife).not.toHaveAttribute('open', '')`
- `expect(summary).toBeFocused()`
- `expect(current).toHaveAttribute('aria-expanded', 'false')`
- ``expect(journal.locator(`#journal-entries-${site}`)).toBeHidden()``

Scope: `let round = 1; round <= rounds; else of viewport.touch; if round === 1; if !viewport.touch`.

- `expect(current).toBeFocused()`

Scope: `let round = 1; round <= rounds; else of viewport.touch; if round === 1`.

- `expect(current).toHaveAttribute('aria-expanded', 'true')`
- `expect( await page.evaluate( () => !!document.activeElement?.closest('.journal') && (document.activeElement?.tagName === 'SUMMARY' || !document.activeElement?.closest('details:not([open])')), ), ).toBe(true)`
- `expect(summary).toBeFocused()`
- `expect(wildlife).not.toHaveAttribute('open', '')`
- `expect(tags).toHaveCount(1)`
- `expect(tags).toHaveText('Game addition')`
- `expect(tags).toHaveCount(1)`
- `expect(tags).toHaveText('Game addition')`
- `expect(wildlife).not.toHaveAttribute('open', '')`
- `expect(axe.violations.map((v) => v.id)).toEqual([])`
- `expect(current).toHaveAttribute('aria-expanded', 'true')`
- `expect(journal.locator('.jr-site-more summary')).toBeVisible()`

Scope: `let round = 1; round <= rounds`.

- `expect(debrief.locator('[data-action="journal"]')).toBeFocused()`
- `expect(debrief).toBeHidden()`

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [fits](#f-journal-debrief-1060-spec-ts-18-fits), [openJournalCategory](#helpers-journal-ts-84-openjournalcategory), [journalContents](#helpers-journal-ts-16-journalcontents), [withClockFrames](#helpers-clock-ts-33-withclockframes), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `clockFramesUntil( page, () => window.__gameReady === true && (window.__game as unknown as Game).discovery.loaded, )`; `fits(debrief.locator('.debrief-panel'))`; `fits(journal.locator('.jr-panel'))`; `fits(journal.locator('.jr-body'))`; `openJournalCategory(page, site, 'life')`; `withClockFrames(page, () => new AxeBuilder({ page }).include('.journal').analyze(), )`; `fits(journal.locator('.jr-nav'))`; `openJournalCategory(page, site, 'secret')`.

### [f-journal-photo-1370.spec.ts](../../tests/e2e/f-journal-photo-1370.spec.ts) — Journal/debrief

3 expanded cases; sum of assigned weights **135.0s**, 3 fallback keys. Disposition: **fold → journal-debrief.spec.ts**.

Overlap: Photo open/save fragments ind-photo; focus-after-unhide/Tab/Escape/two rounds are uniqueJ7.

History/provenance scope: **R**, `3c94422` — JDP-1 focus restoration ran while HUD control was visibility:hidden; reproduced before fix in1370 note. [1370 focus reproduction](1370-f-bughunt-journal-debrief.md). Origin: `3c94422 feat(1370): f-bughunt-journal-debrief fixes and regression tests`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, deviceScaleFactor: 1, serviceWorkers: 'block', storageState: { cookies: [], origins: [] }, })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1370 photo focus 1600x900 › Done restores prior HUD focus and Tab/Escape keep a keyboard exit over two rounds** — keeps .hud, .photo-mode-toast, .pause-menu; full list in contract; **45s F**; captures **2/0/2**; bug **R `3c94422`**; contract [A104](#a104).
- **1370 photo focus 844x390 › Done restores prior HUD focus and Tab/Escape keep a keyboard exit over two rounds** — keeps .hud, .photo-mode-toast, .pause-menu; full list in contract; **45s F**; captures **2/0/2**; bug **R `3c94422`**; contract [A104](#a104).
- **1370 photo focus 390x844 › Done restores prior HUD focus and Tab/Escape keep a keyboard exit over two rounds** — keeps .hud, .photo-mode-toast, .pause-menu; full list in contract; **45s F**; captures **2/0/2**; bug **R `3c94422`**; contract [A104](#a104).

<a id="a104"></a>

**Contract A104 (f-journal-photo-1370.spec.ts:L21)** — 'Done restores prior HUD focus and Tab/Escape keep a keyboard exit over two rounds'.

Row expansion: `const profile of [ { width: 1600, height: 900, touch: false }, { width: 844, height: 390, touch: true }, { width: 390, height: 844, touch: true }, ]`.

Navigation: `page.goto('/?mission=titanic&poi=titanic-bow&skipBriefing=1&tier=low', { waitUntil: 'domcontentloaded', })`.

Scope: `let round = 1; round <= 2`.

- `expect(mode).toBeVisible()`
- `expect(page.locator('.hud')).toBeHidden()`
- `expect(mode.locator('.photo-mode-toast')).toHaveText('Saved to Journal')`
- `expect(mode).toBeHidden()`

Scope: `let round = 1; round <= 2; if !profile.touch`.

- `expect(credit).toBeFocused()`

Scope: `let round = 1; round <= 2`.

- `expect(mode).toBeVisible()`

Scope: `let round = 1; round <= 2; const control of [capture, done, pause, capture]`.

- `expect(control).toBeFocused()`

Scope: `let round = 1; round <= 2`.

- `expect(pause).toBeFocused()`
- `expect(mode).toBeHidden()`

Scope: `let round = 1; round <= 2; if !profile.touch`.

- `expect(credit).toBeFocused()`

Scope: `let round = 1; round <= 2`.

- `expect(page.locator('.pause-menu')).toBeHidden()`

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil( page, () => window.__gameReady === true && (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt === 'titanic-bow', )`.

### [f-lostcity-readable.spec.ts](../../tests/e2e/f-lostcity-readable.spec.ts) — opening framing

7 expanded cases; sum of assigned weights **277.1s**, 6 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `c0e9d2a` — Lost City Arcade opening camera/ambient readability; later66m/approach corrections from04d42fe/5c52cc8. Origin: `c0e9d2a F-400: Lost City arcade opening camera`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Lost City tile low: Arcade preserves its route-specific opening and ambient-lit seabed** — keeps .briefing, .pause-menu, opening.mode, opening.heroRange, opening.chaseRadius, opening.primaryRange; full list in contract; **45s F**; captures **0/0/0**; bug **R `c0e9d2a`**; contract [A105](#a105).
- **Lost City mission low: Arcade preserves its route-specific opening and ambient-lit seabed** — keeps .briefing, .pause-menu, opening.mode, opening.heroRange, opening.chaseRadius, opening.primaryRange; full list in contract; **45s F**; captures **0/0/0**; bug **R `c0e9d2a`**; contract [A105](#a105).
- **Lost City tile medium: Arcade preserves its route-specific opening and ambient-lit seabed** — keeps .briefing, .pause-menu, opening.mode, opening.heroRange, opening.chaseRadius, opening.primaryRange; full list in contract; **45s F**; captures **0/0/0**; bug **R `c0e9d2a`**; contract [A105](#a105).
- **Lost City mission medium: Arcade preserves its route-specific opening and ambient-lit seabed** — keeps .briefing, .pause-menu, opening.mode, opening.heroRange, opening.chaseRadius, opening.primaryRange; full list in contract; **45s F**; captures **0/0/0**; bug **R `c0e9d2a`**; contract [A105](#a105).
- **Lost City tile high: Arcade preserves its route-specific opening and ambient-lit seabed** — keeps .briefing, .pause-menu, opening.mode, opening.heroRange, opening.chaseRadius, opening.primaryRange; full list in contract; **45s F**; captures **0/0/0**; bug **R `c0e9d2a`**; contract [A105](#a105).
- **Lost City mission high: Arcade preserves its route-specific opening and ambient-lit seabed** — keeps .briefing, .pause-menu, opening.mode, opening.heroRange, opening.chaseRadius, opening.primaryRange; full list in contract; **45s F**; captures **0/0/0**; bug **R `c0e9d2a`**; contract [A105](#a105).
- **Lost City Realistic free dive retains the vent opening and camera arm** — keeps pose.mode).toBe('realistic'); pose.range).toBeGreaterThan(42); pose.range).toBeLessThan(46); pose.arm).toBeCloseTo(Math.hypot(38, 90), 6); **7.1s M**; captures **0/0/0**; bug **R `c0e9d2a`**; contract [A106](#a106).

<a id="a105"></a>

**Contract A105 (f-lostcity-readable.spec.ts:L30)** — `Lost City ${route} ${tier}: Arcade preserves its route-specific opening and ambient-lit seabed`.

Row expansion: `const tier of ['low', 'medium', 'high']`; `const route of ['tile', 'mission']`.

Navigation: ``page.goto(`/?${route}=lost-city&tutorial=0&tier=${tier}`, { waitUntil: 'domcontentloaded', })``.

Scope: `if route === 'mission'`.

- `expect(page.locator('.briefing')).toBeHidden()`

Scope: unconditional in this body.

- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(opening.mode).toBe('arcade')`

Scope: `if route === 'tile'`.

- `expect(opening.heroRange).toBeGreaterThan(30)`
- `expect(opening.heroRange).toBeLessThanOrEqual(40)`
- `expect(opening.chaseRadius).toBe(66)`

Scope: `else of route === 'tile'`.

- `expect(opening.primaryRange).toBeCloseTo(220, 0)`
- `expect(opening.primaryRange!).toBeGreaterThan(opening.scanRadius!)`
- `expect(opening.chaseRadius).toBeCloseTo(Math.hypot(38, 90), 6)`

Scope: `let axis = 0; axis < 3`.

- `expect(opening.localEye[axis]).toBeCloseTo(expectedEye[axis] * armScale, 1)`

Scope: `const [x, y, z] of opening.towerAxis`.

- `expect(Math.abs(x)).toBeLessThan(0.9)`
- `expect(Math.abs(y)).toBeLessThan(0.9)`
- `expect(z).toBeGreaterThan(-1)`
- `expect(z).toBeLessThan(1)`

Scope: unconditional in this body.

- `expect(opening.altitude).toBeGreaterThanOrEqual(22)`
- `expect(opening.fill).toBe(16)`
- `expect(opening.ambient).toBeGreaterThanOrEqual(16)`
- `expect(opening.floorProxies.every((value) => value > 2.5)).toBe(true)`
- `expect(opening.lampsOn).toBe(false)`

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game | undefined; return window.__gameReady === true && g?.props.loaded && g.presets.entered; })`.

<a id="a106"></a>

**Contract A106 (f-lostcity-readable.spec.ts:L140)** — 'Lost City Realistic free dive retains the vent opening and camera arm'.

Navigation: `page.goto('/?tile=lost-city&tutorial=0')`.

- `expect(pose.mode).toBe('realistic')`
- `expect(pose.range).toBeGreaterThan(42)`
- `expect(pose.range).toBeLessThan(46)`
- `expect(pose.arm).toBeCloseTo(Math.hypot(38, 90), 6)`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady === true && (window.__game as unknown as Game).props.loaded, )`.

### [f-lowtier-followups.spec.ts](../../tests/e2e/f-lowtier-followups.spec.ts) — scan

2 expanded cases; sum of assigned weights **40.4s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `ebde838` — Blake reticle/control overlap and east-gallery candidate ownership; cc32f59 follow-ups. Origin: `cc32f59 feat(1100): collected Codex work`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Blake portrait keeps the contact reticle off SCAN and restores it when controls move** — keeps .tc-btn-scan, .scan-panel, .scan-reticle; full list in contract; **25.9s M**; captures **1/0/0**; bug **R `ebde838`**; contract [A107](#a107).
- **Blue Hole east gallery owns its scan card at both authored poses** — keeps .scan-panel .scan-name, .scan-panel .scan-hint; full list in contract; **14.5s M**; captures **2/0/0**; bug **R `ebde838`**; contract [A108](#a108).

<a id="a107"></a>

**Contract A107 (f-lowtier-followups.spec.ts:L13)** — 'Blake portrait keeps the contact reticle off SCAN and restores it when controls move'.

Navigation: `page.goto('/?tile=blake-plateau-corals&tier=low&touch=1&tutorial=0&lifeSeed=42&dynres=0')`.

- `expect(page.locator('.tc-btn-scan')).toBeVisible()`
- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(page.locator('.scan-reticle')).toBeVisible()`
- `expect(page.locator('.scan-reticle')).toBeHidden()`
- `expect(page.locator('.scan-reticle')).toBeVisible()`
- `expect(overlap).toBe(false)`
- `expect(page.locator('.scan-reticle')).toBeVisible()`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady && (window.__game as unknown as Game).props.loaded && (window.__game as unknown as Game).discovery.loaded, )`.

<a id="a108"></a>

**Contract A108 (f-lowtier-followups.spec.ts:L59)** — 'Blue Hole east gallery owns its scan card at both authored poses'.

Navigation: `page.goto('/?tile=great-blue-hole&tier=low&touch=1&tutorial=0&lifeSeed=42&dynres=0')`.

Scope: `const [name, range] of [ ['approach', blueHolePoses.east.approachRange], ['detail', blueHolePoses.east.close.range], ] as const`.

- `expect(page.locator('.scan-panel .scan-name')).toHaveText('Eastern stalactite gallery')`
- `expect(page.locator('.scan-panel .scan-hint')).toHaveText('HOLD SCAN TO SCAN')`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).scanner.view.nearestId), ).toBe('great-blue-hole-stalactites-east')`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady && (window.__game as unknown as Game).props.loaded && (window.__game as unknown as Game).discovery.loaded, )`.

### [f-mission-940.spec.ts](../../tests/e2e/f-mission-940.spec.ts) — opening framing

15 expanded cases; sum of assigned weights **675.0s**, 15 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `8625686` — capability introduced here; no specific failed-before defect located. Origin: `8625686 feat(940): default missions lead to Blue Hole gallery and Monterey wall`.

Profile/skip controls (variables expanded by rows below): `test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **titanic low: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **titanic medium: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **titanic high: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **great-blue-hole low: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **great-blue-hole medium: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **great-blue-hole high: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **monterey-canyon low: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **monterey-canyon medium: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **monterey-canyon high: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **beebe-vent-field low: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **beebe-vent-field medium: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **beebe-vent-field high: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **lost-city low: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **lost-city medium: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).
- **lost-city high: mission previews and opens on an approach outside scan range** — keeps .briefing, .obj-item.is-current; full list in contract; **45s F**; captures **0/0/0**; bug **F `8625686`**; contract [A109](#a109).

<a id="a109"></a>

**Contract A109 (f-mission-940.spec.ts:L59)** — `${site} ${tier}: mission previews and opens on an approach outside scan range`.

Row expansion: `const [site, first] of [ ['titanic', 'find-bow'], ['great-blue-hole', 'stalactites'], ['monterey-canyon', 'canyon-wall'], ['beebe-vent-field', 'main-vents'], ['lost-city', 'find-poseidon'], ]`; `const tier of ['low', 'medium', 'high']`.

Navigation: ``page.goto(`/?${params}`, { waitUntil: 'domcontentloaded' })``; ``page.goto(`/?${params}&mission=${site}`, { waitUntil: 'domcontentloaded' })``.

- `expect(free.first).toBeUndefined()`
- `expect(free.failedProps).toBe(0)`
- `expect(page.locator('.briefing')).toBeVisible()`
- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(mission.failedProps).toBe(0)`
- `expect(mission.first).toBe(first)`
- `expect(mission.range).toBeDefined()`
- `expect(mission.range!).toBeCloseTo(MISSION_APPROACH_M[site], 1)`
- `expect(mission.range!).toBeGreaterThan(mission.scanRadius!)`
- `expect(mission.range!).toBeLessThanOrEqual(300)`
- `expect(distance).toBeGreaterThan(60)`
- `expect(mission.objectiveId).toBeTruthy()`
- `expect(mission.objectiveDistance).toBeCloseTo(mission.range!, 1)`
- `expect(page.locator('.obj-item.is-current')).toContainText('Head to')`
- `expect(preview.position).toEqual(mission.position)`
- `expect(preview.yaw).toEqual(mission.yaw)`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

### [f-monterey-portrait-hud.spec.ts](../../tests/e2e/f-monterey-portrait-hud.spec.ts) — HUD/touch layout

2 expanded cases; sum of assigned weights **70.0s**, 1 fallback keys. Disposition: **fold → hud-touch.spec.ts**.

Overlap: Free sonar/readout overlap fragment withbughunt4; H4 survives with projected-sub40px margin and whole HUD; mission scale differs fromtouch-audit.

History/provenance scope: **U**, `6b10dc2` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `6b10dc2 wip(f-monterey-portrait-hud): portrait HUD no-overlap test, changelog, progress note`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })`.

Selector/fixture constants: `HUD = [ '.sonar', '.hud-readouts', '.hud-footer', '.objectives-panel', '.scan-stack', '.onboard-card', '.hud-notice', '.hud-warning', '.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **free dive: portrait HUD panels do not overlap** — keeps locator('.scan-stack')).toBeVisible(); **45s F**; captures **0/0/0**; bug **U `6b10dc2`**; contract [A110](#a110).
- **mission with tutorial: card, objectives, scan and readouts stay separate** — keeps locator('.onboard-card')).toBeVisible(); locator('.objectives-panel')).toBeVisible(); **25s M**; captures **0/0/0**; bug **U `6b10dc2`**; contract [A111](#a111).

<a id="a110"></a>

**Contract A110 (f-monterey-portrait-hud.spec.ts:L90)** — 'free dive: portrait HUD panels do not overlap'.

- `expect(page.locator('.scan-stack')).toBeVisible()`

Helper guard closure: [boot](#f-monterey-portrait-hud-spec-ts-24-boot), [expectClearLayout](#f-monterey-portrait-hud-spec-ts-45-expectclearlayout).

Helper call bindings: `boot(page, 'tutorial=0')`; `expectClearLayout(page)`.

<a id="a111"></a>

**Contract A111 (f-monterey-portrait-hud.spec.ts:L96)** — 'mission with tutorial: card, objectives, scan and readouts stay separate'.

- `expect(page.locator('.onboard-card')).toBeVisible()`
- `expect(page.locator('.objectives-panel')).toBeVisible()`

Helper guard closure: [boot](#f-monterey-portrait-hud-spec-ts-24-boot), [expectClearLayout](#f-monterey-portrait-hud-spec-ts-45-expectclearlayout).

Helper call bindings: `boot(page, 'mission=monterey-canyon')`; `expectClearLayout(page)`.

### [f-perf-budget.spec.ts](../../tests/e2e/f-perf-budget.spec.ts) — perf

13 expanded cases; sum of assigned weights **545.7s**, 8 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Same-site Low opening budget fragments in1290/520; f-perf-budget survives exact13-site census/dynres/counter equality; do not remove full test.

History/provenance scope: **U**, `5ef9d64` — audit/verification guard; historical defect attribution not proved for this declaration. [1350 audit](1350-f-bughunt-mobile-perf.md): orientationchange fixed in render units; census/render-budget e2e coverage itself is verification. Origin: `5ef9d64 feat(f-perf-budget): perf budget tool and tests`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, storageState: { cookies: [], origins: [] }, })`.

Selector/fixture constants: `sites = [ { id: 'titanic', props: 6 }, { id: 'lost-city', props: 12 }, { id: 'great-blue-hole', props: 2 }, { id: 'beebe-vent-field', props: 3 }, { id: 'monterey-canyon', props: 5 }, { id: 'challenger-deep', props: 2 }, { id: 'endurance', props: 3 }, { id: 'hunga-tonga-caldera', props: 1 }, { id: 'hudson-canyon', props: 1 }, { id: 'axial-seamount-ashes', props: 6 }, { id: 'kamaehuakanaloa', props: 4 }, { id: 'bismarck', props: 4 }, { id: 'blake-plateau-corals', props: 3 }, ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **titanic opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **16s M**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **lost-city opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **39.2s M**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **great-blue-hole opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **55.6s M**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **beebe-vent-field opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **23.4s M**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **monterey-canyon opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **51.5s M**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **challenger-deep opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **45s F**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **endurance opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **45s F**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **hunga-tonga-caldera opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **45s F**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **hudson-canyon opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **45s F**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **axial-seamount-ashes opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **45s F**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **kamaehuakanaloa opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **45s F**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **bismarck opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **45s F**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).
- **blake-plateau-corals opening stays within the Low-tier frame geometry budget** — keeps sample.tier, sample.dynamicResolution, sample.props.count, sample.props.failed, sample.props.skipped, sample.props.full; full list in contract; **45s F**; captures **0/0/0**; bug **U `5ef9d64`**; contract [A112](#a112).

<a id="a112"></a>

**Contract A112 (f-perf-budget.spec.ts:L42)** — `${site.id} opening stays within the Low-tier frame geometry budget`.

Row expansion: `const site of sites`.

Navigation: ``page.goto(`/?tile=${site.id}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, { waitUntil: 'domcontentloaded', })``.

- `expect(errors).toEqual([])`
- `expect(sample.tier).toBe('low')`
- `expect(sample.dynamicResolution).toBe(false)`
- `expect(sample.props.count).toBe(site.props)`
- `expect(sample.props.failed).toBe(0)`
- `expect(sample.props.skipped).toBe(0)`
- `expect(sample.props.full).toBeGreaterThan(0)`
- `expect(sample.countersMatch).toBe(true)`
- `expect(sample.calls).toBeGreaterThan(0)`
- `expect(sample.triangles).toBeGreaterThan(10_000)`
- `expect(sample.calls).toBeLessThanOrEqual(1500)`
- `expect(sample.triangles).toBeLessThanOrEqual(1_500_000)`

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game | undefined; return ( window.__gameReady && g?.props.loaded && g.discovery.loaded && g.explore.ready && g.life ); })`.

### [f-rebrand-bathyline.spec.ts](../../tests/e2e/f-rebrand-bathyline.spec.ts) — Journal/debrief

5 expanded cases; sum of assigned weights **17.2s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `5bfd92f` — capability introduced here; no specific failed-before defect located. Origin: `5bfd92f F-REBRAND: Bathyline mark, icons, share image, docs`.

Profile/skip controls (variables expanded by rows below): `test.use({ hasTouch: true, deviceScaleFactor: 1 })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Bathyline title and Journal 1280x800** — keeps .home-screen, .home-screen h1, .home-mark, dialog, .jr-kicker, .journal; full list in contract; **2.9s M**; captures **2/0/0**; bug **F `5bfd92f`**; contract [A113](#a113).
- **Bathyline title and Journal 320x568** — keeps .home-screen, .home-screen h1, .home-mark, dialog, .jr-kicker, .journal; full list in contract; **2.4s M**; captures **2/0/0**; bug **F `5bfd92f`**; contract [A113](#a113).
- **Bathyline title and Journal 844x390** — keeps .home-screen, .home-screen h1, .home-mark, dialog, .jr-kicker, .journal; full list in contract; **3.2s M**; captures **2/0/0**; bug **F `5bfd92f`**; contract [A113](#a113).
- **metadata, portable logo variants and maskable safe circle** — keeps meta[property=, meta[name=, result.width, result.height, result.painted, result.transparent; full list in contract; **6.3s M**; captures **1/0/0**; bug **F `5bfd92f`**; contract [A114](#a114).
- **favicon at tab size and social card** — keeps #tab-title; full list in contract; **2.4s M**; captures **2/0/0**; bug **F `5bfd92f`**; contract [A115](#a115).

<a id="a113"></a>

**Contract A113 (f-rebrand-bathyline.spec.ts:L16)** — `Bathyline title and Journal ${viewport.width}x${viewport.height}`.

Row expansion: `const viewport of [ { width: 1280, height: 800 }, { width: 320, height: 568 }, { width: 844, height: 390 }, ]`.

Navigation: `page.goto('/?tier=low', { waitUntil: 'domcontentloaded' })`.

- `expect .poll(() => page.evaluate( () => (window.__game as { titleScene: { terrainReady: boolean } }).titleScene.terrainReady, ), ) .toBe(true)`
- `expect(page.locator('.home-screen')).toHaveClass(/has-title-scene/)`
- `expect(page).toHaveTitle('Bathyline')`
- `expect(page.locator('.home-screen h1')).toHaveText('Bathyline')`
- `expect(page.locator('.home-mark')).toHaveAttribute('aria-hidden', 'true')`
- `expect(page.locator('.home-screen')).not.toContainText( /Submarine Explorer|illustrative|reconstructed/i, )`
- `expect(heading).not.toBeNull()`
- `expect(heading!.x).toBeGreaterThanOrEqual(0)`
- `expect(heading!.x + heading!.width).toBeLessThanOrEqual(viewport.width)`
- `expect(target!.width).toBeGreaterThanOrEqual(44)`
- `expect(target!.height).toBeGreaterThanOrEqual(44)`
- `expect(page.getByRole('dialog', { name: 'Journal', exact: true })).toBeVisible()`
- `expect(page.locator('.jr-kicker')).toHaveText('Journal')`
- `expect(page.locator('.journal')).not.toContainText('Submarine Explorer')`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

<a id="a114"></a>

**Contract A114 (f-rebrand-bathyline.spec.ts:L56)** — 'metadata, portable logo variants and maskable safe circle'.

Navigation: `page.goto('/')`.

- `expect(page).toHaveTitle('Bathyline')`

Scope: `const selector of [ 'meta[name="application-name"]', 'meta[name="apple-mobile-web-app-title"]', 'meta[property="og:site_name"]', ]`.

- `expect(page.locator(selector)).toHaveAttribute('content', 'Bathyline')`

Scope: unconditional in this body.

- `expect(page.locator('meta[property="og:title"]')).toHaveAttribute( 'content', 'Bathyline: Explore the real deep.', )`
- `expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute( 'content', 'Bathyline: Explore the real deep.', )`
- `expect(manifestResponse.ok()).toBe(true)`
- `expect(manifest.name).toBe('Bathyline')`
- `expect(manifest.short_name).toBe('Bathyline')`
- `expect(manifest.icons.filter((icon) => icon.purpose === 'maskable')).toHaveLength(2)`

Scope: `const icon of manifest.icons`.

- ``expect(`${result.width}x${result.height}`).toBe(icon.sizes)``
- `expect(result.painted).toBeGreaterThan(result.width * result.height * 0.08)`
- `expect(result.transparent).toBe(0)`
- `expect(result.outside).toBe(0)`

Scope: `const name of assets`.

- `expect(response.ok()).toBe(true)`
- `expect(svg).toContain('Bathyline')`
- `expect(svg).not.toMatch(/<text|@font-face|<script|<foreignObject/)`

<a id="a115"></a>

**Contract A115 (f-rebrand-bathyline.spec.ts:L158)** — 'favicon at tab size and social card'.

Navigation: `page.goto('/')`.

- `expect(page).toHaveTitle('Bathyline')`
- `expect(response.ok()).toBe(true)`
- `expect(response.headers()['content-type']).toContain('image/svg+xml')`
- `expect(social).toBe( 'https://wjjztd2rz8-coder.github.io/submarine-explorer/share/bathyline-og-1200x630.png', )`
- `expect(localShare.ok()).toBe(true)`
- `expect(localShare.headers()['content-type']).toContain('image/png')`
- `expect(preview.locator('#tab-title')).toHaveText('Bathyline')`
- `expect(dimensions).toEqual([1200, 630])`

### [f-save-soak.spec.ts](../../tests/e2e/f-save-soak.spec.ts) — save

1 expanded cases; sum of assigned weights **137.4s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `84e5430` — capability introduced here; no specific failed-before defect located. Origin: `84e5430 fix(f-save-soak): save/input/quality persistence soak fixes`.

Profile/skip controls (variables expanded by rows below): `test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 960, height: 640 } })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **four dives, mode switches, restarts and reloads preserve saves without scene leaks or errors** — keeps .briefing, .pause-menu, .mission-debrief, saved.mode, saved.captions, saved.settings; full list in contract; **137.4s M**; captures **0/0/0**; bug **F `84e5430`**; contract [A116](#a116).

<a id="a116"></a>

**Contract A116 (f-save-soak.spec.ts:L101)** — 'four dives, mode switches, restarts and reloads preserve saves without scene leaks or errors'.

Navigation: `page.goto('/?mission=blake-plateau-corals&tier=low&dynres=0&tutorial=0&lifeSeed=42')`.

Scope: `let iteration = 0; iteration < 4`.

- `expect(saved.mode).toBe(expectedMode)`
- `expect(saved.captions).toBe(true)`
- `expect(saved.settings).toContain('"captions":true')`
- `expect(saved.bindings.keys.thrustForward).toEqual(['KeyI'])`
- `expect(saved.bindings.keys.boost).toEqual([])`
- `expect(saved.discoveries['blake-plateau-corals/old-scan']).toBe('2026-09-01T00:00:00Z')`
- `expect(saved.progress).toMatchObject({ points: 400, lifetime: 900, awarded: ['poi:blake-plateau-corals/old-scan'], upgrades: { 'light-range': 1 }, ratings: { titanic: 3 }, })`
- `expect(boot.sceneObjects).toBeGreaterThan(20)`
- `expect(boot.geometries).toBeGreaterThan(0)`
- `expect(boot.drawCalls).toBeGreaterThan(0)`
- `expect(boot.triangles).toBeGreaterThan(1000)`

Scope: `let iteration = 0; iteration < 4; if baseline`.

- `expect(boot.sceneObjects).toBe(baseline.sceneObjects)`
- `expect(boot.geometries).toBe(baseline.geometries)`
- `expect(boot.textures).toBe(baseline.textures)`

Scope: `let iteration = 0; iteration < 4`.

- `expect(page.locator('.briefing')).toBeHidden()`
- `expect .poll( async () => { // Use the engine's 250 ms frame clamp instead of spending several // slow GPU renders to advance only 50 ms of held input. await page.clock.fastForward(250); return page.evaluate((position) => { const current = (window.__game as unknown as Game).sub.position; return Math.hypot( current.x - position.x, current.y - position.y, current.z - position.z, ); }, before); }, { intervals: [20] }, ) .toBeGreaterThan(0.05)`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(settings).toBeHidden()`

Scope: `let iteration = 0; iteration < 4; let restart = 0; restart < 3`.

- `expect(afterRestart.sceneObjects).toBe(beforeRestart.sceneObjects)`
- `expect(afterRestart.geometries).toBeLessThanOrEqual(beforeRestart.geometries)`
- `expect(afterRestart.textures).toBeLessThanOrEqual(beforeRestart.textures)`

Scope: `let iteration = 0; iteration < 4`.

- `expect(page.locator('.mission-debrief')).toBeVisible()`
- `expect(errors).toEqual([])`

Scope: unconditional in this body.

- `expect(final.sceneObjects).toBe(baselines.get(expectedMode)!.sceneObjects)`
- `expect(final.geometries).toBe(baselines.get(expectedMode)!.geometries)`
- `expect(final.textures).toBe(baselines.get(expectedMode)!.textures)`
- `expect(errors).toEqual([])`

Helper guard closure: [ready](#f-save-soak-spec-ts-28-ready), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [withClockFrames](#helpers-clock-ts-33-withclockframes).

Helper call bindings: `ready(page)`.

### [f-sonar-palette-1200.spec.ts](../../tests/e2e/f-sonar-palette-1200.spec.ts) — rendering/visual

10 expanded cases; sum of assigned weights **946.4s**, 0 fallback keys. Disposition: **split: numeric/functional guards ordinary; review captures nightly**.

Overlap: Placement/legend fragments ind-sonar but site/DPR/view vary; ordinary palette/raster/readback contract survives; capturesnightly.

History/provenance scope: **F**, `b959b25` — capability introduced here; no specific failed-before defect located. Origin: `b959b25 feat(1200): sonar minimap palette, smoothed hillshade`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: layout === 'desktop' ? { width: 1600, height: 900 } : { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: layout === 'portrait', })`.

Selector/fixture constants: `sites = ['great-blue-hole', 'endurance', 'lost-city', 'beebe-vent-field', 'titanic']`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1200 sonar desktop › great-blue-hole: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **207.3s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).
- **1200 sonar desktop › endurance: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **74.7s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).
- **1200 sonar desktop › lost-city: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **207.9s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).
- **1200 sonar desktop › beebe-vent-field: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **165.4s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).
- **1200 sonar desktop › titanic: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **109.1s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).
- **1200 sonar portrait › great-blue-hole: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **54.3s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).
- **1200 sonar portrait › endurance: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **36.7s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).
- **1200 sonar portrait › lost-city: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **31.4s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).
- **1200 sonar portrait › beebe-vent-field: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **34.7s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).
- **1200 sonar portrait › titanic: smooth relief and existing map layout** — keeps .d-sonar-legend span, state.coloured, state.lime, state.colours, state.canvasWidth, state.cssWidth; full list in contract; **24.9s M**; captures **1/1/0**; bug **F `b959b25`**; contract [A117](#a117).

<a id="a117"></a>

**Contract A117 (f-sonar-palette-1200.spec.ts:L12)** — `${site}: smooth relief and existing map layout`.

Row expansion: `const layout of ['desktop', 'portrait'] as const`; `const site of sites`.

Navigation: ``page.goto(`/?tile=${site}&skipBriefing=1&tier=low`, { waitUntil: 'domcontentloaded', })``.

- `expect(sonar).toBeVisible()`
- `expect(sonar.locator('.d-sonar-legend span')).toHaveText([ '▲ Sub', '◇ Objective', '· Contact', '✓ Scanned', ])`
- `expect(state.coloured).toBeGreaterThan(1000)`
- `expect(state.lime).toBe(0)`
- `expect(state.colours).toBeGreaterThan(20)`
- `expect(state.canvasWidth).toBe(state.cssWidth * 2)`
- `expect(state.rasterWidth).toBe(state.canvasWidth + 96)`
- `expect(state.relief.spanM).toBeGreaterThanOrEqual(20)`

Scope: `if state.relief.maxDepthM - state.relief.minDepthM >= 2`.

- `expect(Number.isFinite(state.relief.contourIntervalM)).toBe(true)`

Scope: unconditional in this body.

- `expect(box.x).toBeCloseTo(12, 0)`
- `expect(box.x + box.width).toBeLessThanOrEqual(layout === 'desktop' ? 1600 : 390)`

Scope: `if layout === 'portrait'`.

- `expect(box.width).toBeCloseTo(96, 0)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000, })`.

### [f-text-diet.spec.ts](../../tests/e2e/f-text-diet.spec.ts) — other

5 expanded cases; sum of assigned weights **225.0s**, 5 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `e58e029` — capability introduced here; no specific failed-before defect located. Origin: `e58e029 wip(f-text-diet): paused at budget floor; hud.ts mid-edit (layoutDataCredits line to restore)`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })`; `test.use({ viewport: { width: 1280, height: 720 } })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **phone portrait › briefing fits with Begin and every objective, and names no Enter key** — keeps .briefing-hint, .briefing-site-more > summary, .briefing-begin, .mode-desc, .is-hazards li, .is-hazards; full list in contract; **45s F**; captures **0/0/0**; bug **F `e58e029`**; contract [A118](#a118).
- **phone portrait › pause menu: How to play has pictures and no key names; Data credits keeps the licence** — keeps .hud-attribution, .hud, button, .how-to-tile, .how-to-tile svg, .controls-card-tabs; full list in contract; **45s F**; captures **2/0/0**; bug **F `e58e029`**; contract [A119](#a119).
- **phone portrait › photo mode shows Capture and gesture tips only** — keeps .photo-mode-capture, .photo-mode-tips; full list in contract; **45s F**; captures **0/0/0**; bug **F `e58e029`**; contract [A120](#a120).
- **desktop › the HUD has no data chip; Data credits sits in the pause menu; Controls keeps keys** — keeps .hud-attribution, .pause-credits, button, .controls-card-tabs, .how-to-tile; full list in contract; **45s F**; captures **0/0/0**; bug **F `e58e029`**; contract [A121](#a121).
- **desktop › briefing keeps the Enter hint and lists facts once inside About this site** — keeps briefing.locator('.briefing-hint')).toHaveText('OR PRESS ENTER'); new Set(facts).size).toBe(facts.length); facts.filter((fact) => hazards.includes(fact))).toEqual([]); **45s F**; captures **0/0/0**; bug **F `e58e029`**; contract [A122](#a122).

<a id="a118"></a>

**Contract A118 (f-text-diet.spec.ts:L16)** — 'briefing fits with Begin and every objective, and names no Enter key'.

- `expect(briefing).toBeVisible()`
- `expect(briefing.locator('.briefing-hint')).toBeHidden()`
- `expect(briefing.locator('.briefing-site-more > summary')).toHaveText('About this site')`
- `expect(briefing.locator('.briefing-begin')).toBeInViewport({ ratio: 1 })`

Scope: `const objective of await briefing.locator('.briefing-objectives li').all()`.

- `expect(objective).toBeInViewport({ ratio: 1 })`

Scope: unconditional in this body.

- `expect( await briefing.locator('.mode-desc').evaluate((el) => el.getBoundingClientRect().height), ).toBeLessThan(24)`
- `expect(briefing.locator('.is-hazards li')).not.toHaveCount(0)`
- `expect(briefing.locator('.is-hazards')).not.toContainText(/rated to|Class [ABC]/)`
- `expect(briefing.locator('.briefing-controls')).toHaveCount(0)`

Helper guard closure: [ready](#f-text-diet-spec-ts-8-ready).

Helper call bindings: `ready(page, 'mission=titanic&tier=low&touch=1')`.

<a id="a119"></a>

**Contract A119 (f-text-diet.spec.ts:L35)** — 'pause menu: How to play has pictures and no key names; Data credits keeps the licence'.

- `expect(page.locator('.hud-attribution')).toHaveCount(0)`
- `expect(page.locator('.hud')).not.toContainText('Data:')`
- `expect(pause).toBeVisible()`
- `expect(pause.getByRole('button', { name: 'Controls', exact: true })).toHaveCount(0)`
- `expect(card).toBeVisible()`
- `expect(card.locator('.how-to-tile')).toHaveCount(10)`
- `expect(card.locator('.how-to-tile svg')).toHaveCount(10)`
- `expect(card.locator('.controls-card-tabs')).toBeHidden()`
- `expect(card).toContainText('Tap for a burst of speed')`
- `expect(card).not.toContainText(KEY_WORDS)`
- `expect(card).toBeHidden()`
- `expect(credits).toBeVisible()`
- `expect(credits.locator('.data-credits-citation')).toHaveText(attribution)`
- `expect(credits).toContainText('doi:10.1029/2008GC002332')`
- `expect(credits).toContainText('Not for navigation')`
- `expect(credits.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute( 'href', 'https://creativecommons.org/licenses/by/4.0/', )`
- `expect(credits.getByRole('link', { name: 'GMRT Synthesis' })).toHaveAttribute( 'href', 'https://www.gmrt.org/', )`
- `expect(pause.getByRole('button', { name: 'Resume' })).toBeVisible()`

Helper guard closure: [ready](#f-text-diet-spec-ts-8-ready).

Helper call bindings: `ready(page, 'mission=titanic&skipBriefing=1&tier=low&touch=1')`.

<a id="a120"></a>

**Contract A120 (f-text-diet.spec.ts:L80)** — 'photo mode shows Capture and gesture tips only'.

- `expect(mode).toBeVisible()`
- `expect(mode.locator('.photo-mode-capture')).toHaveText('Capture')`
- `expect(mode.locator('.photo-mode-tips')).toHaveText('Drag to orbit · pinch to zoom')`
- `expect(mode).not.toContainText(KEY_WORDS)`

Helper guard closure: [ready](#f-text-diet-spec-ts-8-ready).

Helper call bindings: `ready(page, 'mission=titanic&skipBriefing=1&tier=low&touch=1')`.

<a id="a121"></a>

**Contract A121 (f-text-diet.spec.ts:L94)** — 'the HUD has no data chip; Data credits sits in the pause menu; Controls keeps keys'.

- `expect(page.locator('.hud-attribution')).toHaveCount(0)`
- `expect(pause).toBeVisible()`
- `expect(pause.locator('.pause-credits')).toContainText('doi:10.1029/2008GC002332')`
- `expect(pause.getByRole('button', { name: 'Resume' })).toBeVisible()`
- `expect(card).toBeVisible()`
- `expect(card.locator('.controls-card-tabs')).toBeVisible()`
- `expect(card.locator('.how-to-tile')).toHaveCount(0)`

Helper guard closure: [ready](#f-text-diet-spec-ts-8-ready).

Helper call bindings: `ready(page, 'mission=titanic&skipBriefing=1&tier=low')`.

<a id="a122"></a>

**Contract A122 (f-text-diet.spec.ts:L114)** — 'briefing keeps the Enter hint and lists facts once inside About this site'.

- `expect(briefing.locator('.briefing-hint')).toHaveText('OR PRESS ENTER')`
- `expect(new Set(facts).size).toBe(facts.length)`
- `expect(facts.filter((fact) => hazards.includes(fact))).toEqual([])`

Helper guard closure: [ready](#f-text-diet-spec-ts-8-ready).

Helper call bindings: `ready(page, 'mission=titanic&tier=low')`.

### [f-title-audit.spec.ts](../../tests/e2e/f-title-audit.spec.ts) — other

8 expanded cases; sum of assigned weights **269.9s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Shared7 helper contracts also execute inbase-url; root survivor here, project-base survivorbase-url. Different base, no deletion.

History/provenance scope: **R**, `6a8a2c6` — title renderer/input/focus lifecycle; same contract must run at root and project-base. Origin: `6a8a2c6 fix(title): bridge lifecycle, render-state restore, offline title assets (bughunt 13)`.

Profile/skip controls (variables expanded by rows below): `test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **title focus order, selectors and modal Escape return** — keeps button; full list in contract; **117.5s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A003](#a003).
- **saved Continue has first focus and Enter launches the saved mission** — keeps .briefing, .home-screen; full list in contract; **10.2s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A004](#a004).
- **an unavailable saved mission redirects focus and Daily is absent with an empty catalogue** — keeps button, .daily-card; full list in contract; **41.5s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A005](#a005).
- **optional Monterey and font failures preserve usable home and base-aware requests** — keeps .home-scene-caption, .home-mark, .home-sites [data-mission=, .briefing, .fatal; full list in contract; **10.6s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A006](#a006).
- **mission, tile, globe and debug URLs bypass the title** — keeps .home-screen, .briefing, .globe:not(.is-embedded), .fatal; full list in contract; **40.8s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A007](#a007).
- **reduced motion draws once, refreshes after resize and resumes after modal close** — keeps 'reduced motion draws once, refreshes after resize and resumes after modal close'; full list in contract; **4.3s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A008](#a008).
- **home input and quit-to-home preserve gameplay and renderer allocations** — keeps .home-screen, button, perf.geometries, perf.textures, perf.sceneObjects; full list in contract; **33.2s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A009](#a009).
- **title touch navigation › Daily and selector actions work by tap; a CSS-hidden globe stops drawing** — keeps .daily-card, .home-sites, .home-menu, button, .globe.is-embedded .globe-pin, .briefing; full list in contract; **11.8s M**; captures **0/0/0**; bug **R `6a8a2c6`**; contract [A123](#a123).

<a id="a123"></a>

**Contract A123 (f-title-audit.spec.ts:L8)** — 'Daily and selector actions work by tap; a CSS-hidden globe stops drawing'.

Navigation: `page.goto('/?tier=low', { waitUntil: 'domcontentloaded' })`.

- `expect(page.locator('.daily-card')).toBeVisible()`
- `expect(page.locator('.home-sites')).toBeVisible()`
- `expect( page.locator('.home-menu').getByRole('button', { name: 'Free dive', exact: true }), ).toBeFocused()`
- `expect .poll(() => page.locator('.globe.is-embedded .globe-pin').count()) .toBeGreaterThan(0)`
- `expect .poll(() => page .locator('.globe.is-embedded .globe-pin:not(.is-catalogue)') .evaluateAll( (pins) => pins.length > 0 && pins.every( (pin) => parseFloat(getComputedStyle(pin).width) >= 44 && parseFloat(getComputedStyle(pin).height) >= 44, ), ), ) .toBe(true)`
- `expect .poll(() => page.evaluate(() => (window.__game as { homeGlobe: { isOpen: boolean } }).homeGlobe.isOpen), ) .toBe(false)`
- `expect(page.locator('.briefing')).toBeVisible()`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForURL(/[?&]mission=titanic\b/)`; `page.waitForFunction(() => window.__gameReady === true)`.

### [f-title-layout.spec.ts](../../tests/e2e/f-title-layout.spec.ts) — other

9 expanded cases; sum of assigned weights **261.3s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Back/Escape focus fragment matches title-scene at default1280×800; keep copy/layout/48px controls. No step2 deletion.

History/provenance scope: **F**, `c0c6d95` — capability introduced here; no specific failed-before defect located. Origin: `c0c6d95 wip(f-title-d): home layout`.

Selector/fixture constants: `VIEWPORTS = [ { width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 667, height: 375 }, ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **home copy, semantic order and first focus** — keeps .home-screen, .home-kicker, .home-screen h1, .home-tagline, .home-desc, .home-notes; full list in contract; **3.2s M**; captures **0/0/0**; bug **F `c0c6d95`**; contract [A124](#a124).
- **both selector entry buttons restore focus on Back and Escape** — keeps locator('.home-sites')).toBeVisible(); locator('.home-sites')).toBeHidden(); menu.getByRole('button', { name, exact: true })).toBeFocused(); **22.2s M**; captures **0/0/0**; bug **F `c0c6d95`**; contract [A125](#a125).
- **home layout 1920x1080** — keeps .home-menu > .daily-card; full list in contract; **100.9s M**; captures **2/0/0**; bug **F `c0c6d95`**; contract [A126](#a126).
- **home layout 1280x720** — keeps .home-menu > .daily-card; full list in contract; **28.7s M**; captures **2/0/0**; bug **F `c0c6d95`**; contract [A126](#a126).
- **home layout 768x1024** — keeps .home-menu > .daily-card; full list in contract; **26.2s M**; captures **2/0/0**; bug **F `c0c6d95`**; contract [A126](#a126).
- **home layout 390x844** — keeps .home-menu > .daily-card; full list in contract; **20.7s M**; captures **2/0/0**; bug **F `c0c6d95`**; contract [A126](#a126).
- **home layout 320x568** — keeps .home-menu > .daily-card; full list in contract; **17s M**; captures **2/0/0**; bug **F `c0c6d95`**; contract [A126](#a126).
- **home layout 844x390** — keeps .home-menu > .daily-card; full list in contract; **22.3s M**; captures **2/0/0**; bug **F `c0c6d95`**; contract [A126](#a126).
- **home layout 667x375** — keeps .home-menu > .daily-card; full list in contract; **20.1s M**; captures **2/0/0**; bug **F `c0c6d95`**; contract [A126](#a126).

<a id="a124"></a>

**Contract A124 (f-title-layout.spec.ts:L26)** — 'home copy, semantic order and first focus'.

- `expect(page.locator('.home-screen')).toHaveAttribute('aria-label', 'Bathyline home')`
- `expect(page.locator('.home-kicker')).toHaveText('A CINEMATIC OCEAN EXPLORATION GAME')`
- `expect(page.locator('.home-screen h1')).toHaveText('Bathyline')`
- `expect(page.locator('.home-tagline')).toHaveText('Explore the real deep.')`
- `expect(page.locator('.home-desc')).toHaveText( 'Real terrain, simple controls, discoveries worth finding.', )`
- `expect(page.locator('.home-notes')).toContainText('Play in your browser')`
- `expect(page.locator('.home-notes')).toContainText('Touch, keyboard or controller')`
- `expect(page.locator('.home-scene-caption')).toHaveText( /^(Expedition preview|Monterey Canyon · Real GMRT bathymetry)$/, )`
- `expect(page.locator('.home-scene-caveat')).toHaveCount(0)`
- `expect(page.locator('.home-copy')).not.toContainText(/illustrative|reconstructed/i)`
- `expect(order).toEqual([ 'Continue', 'Dive sites', 'Free dive', 'MODE', 'Journal', 'Settings', 'Controls', 'Upgrades', ])`
- `expect(page.getByRole('button', { name: 'Dive sites' })).toBeFocused()`

Helper guard closure: [boot](#f-title-layout-spec-ts-17-boot).

Helper call bindings: `boot(page)`.

<a id="a125"></a>

**Contract A125 (f-title-layout.spec.ts:L61)** — 'both selector entry buttons restore focus on Back and Escape'.

Scope: `const [name, via] of [ ['Dive sites', 'back'], ['Free dive', 'back'], ['Dive sites', 'escape'], ['Free dive', 'escape'], ] as const`.

- `expect(page.locator('.home-sites')).toBeVisible()`
- `expect(page.locator('.home-sites')).toBeHidden()`
- `expect(menu.getByRole('button', { name, exact: true })).toBeFocused()`

Helper guard closure: [boot](#f-title-layout-spec-ts-17-boot).

Helper call bindings: `boot(page)`.

<a id="a126"></a>

**Contract A126 (f-title-layout.spec.ts:L80)** — `home layout ${viewport.width}x${viewport.height}`.

Row expansion: `const viewport of VIEWPORTS`.

- `expect(page.locator('.home-menu > .daily-card')).toBeVisible()`
- `expect(noHScroll, 'nothing leaves the viewport horizontally').toBe(true)`

Scope: `let i = 0; i < boxes.length; const o of boxes.slice(i + 1)`.

- ``expect(a.x < o.r && o.x < a.r && a.y < o.b && o.y < a.b, `${a.sel} overlaps ${o.sel}`).toBe( false, )``

Scope: `let i = 0; i < n`.

- ``expect(box.height, `button ${i} height`).toBeGreaterThanOrEqual(48)``
- ``expect(box.width, `button ${i} width`).toBeGreaterThanOrEqual(48)``
- ``expect( await b.evaluate((el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return hit !== null && el.contains(hit); }), `button ${i} receives taps`, ).toBe(true)``

Scope: unconditional in this body.

- `expect(bb.height).toBeGreaterThanOrEqual(48)`
- `expect(bb.y + bb.height).toBeLessThanOrEqual(viewport.height)`

Helper guard closure: [boot](#f-title-layout-spec-ts-17-boot).

Helper call bindings: `boot(page)`.

### [f-title-scene.spec.ts](../../tests/e2e/f-title-scene.spec.ts) — other

16 expanded cases; sum of assigned weights **185.0s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Default root focus lifecycle shared titleAudit fragments; preserve draw stopping/static motion/layout/counters and unique states.

History/provenance scope: **F**, `4666513` — capability introduced here; no specific failed-before defect located. Origin: `4666513 test(title): F-TITLE-G integration QA and architecture doc`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport, hasTouch: true, isMobile: true })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **home presents the shared title canvas within low budgets** — keeps .home-screen, #viewport, .globe.is-embedded, .home-scene-caption; full list in contract; **5.4s M**; captures **1/0/0**; bug **F `4666513`**; contract [A127](#a127).
- **home presents the shared title canvas within high budgets** — keeps .home-screen, #viewport, .globe.is-embedded, .home-scene-caption; full list in contract; **10.3s M**; captures **1/0/0**; bug **F `4666513`**; contract [A127](#a127).
- **Dive sites hands off to the globe; Back restores title and focus** — keeps .home-sites h2, .globe.is-embedded, .home-sites .mission-select, .home-sites [data-tile=, .home-sites [data-mission=, .home-sites; full list in contract; **8.5s M**; captures **0/0/0**; bug **F `4666513`**; contract [A128](#a128).
- **Dive sites hands off to the globe; Escape restores title and focus** — keeps .home-sites h2, .globe.is-embedded, .home-sites .mission-select, .home-sites [data-tile=, .home-sites [data-mission=, .home-sites; full list in contract; **8s M**; captures **0/0/0**; bug **F `4666513`**; contract [A128](#a128).
- **Free dive hands off to the globe; Back restores title and focus** — keeps .home-sites h2, .globe.is-embedded, .home-sites .mission-select, .home-sites [data-tile=, .home-sites [data-mission=, .home-sites; full list in contract; **10s M**; captures **0/0/0**; bug **F `4666513`**; contract [A128](#a128).
- **Free dive hands off to the globe; Escape restores title and focus** — keeps .home-sites h2, .globe.is-embedded, .home-sites .mission-select, .home-sites [data-tile=, .home-sites [data-mission=, .home-sites; full list in contract; **12s M**; captures **0/0/0**; bug **F `4666513`**; contract [A128](#a128).
- **Free dive launches a tile route and leaves the title inactive** — keeps .home-screen, .globe.is-embedded; full list in contract; **9.2s M**; captures **0/0/0**; bug **F `4666513`**; contract [A129](#a129).
- **OS reduced motion presents a static title and redraws on resize** — keeps `${preference} reduced motion presents a static title and redraws on resize`; full list in contract; **4.4s M**; captures **0/0/0**; bug **F `4666513`**; contract [A130](#a130).
- **saved reduced motion presents a static title and redraws on resize** — keeps `${preference} reduced motion presents a static title and redraws on resize`; full list in contract; **5.5s M**; captures **0/0/0**; bug **F `4666513`**; contract [A130](#a130).
- **covering home modals stop title draws and return to a usable menu** — keeps region, button, .home-menu; full list in contract; **17.6s M**; captures **0/0/0**; bug **F `4666513`**; contract [A131](#a131).
- **quit after a mission lazily presents home, keeps Continue and freezes the sub** — keeps .home-screen, .globe.is-embedded, .briefing; full list in contract; **12.7s M**; captures **0/0/0**; bug **F `4666513`**; contract [A132](#a132).
- **optional title terrain and font failures leave an honest, usable fallback** — keeps .home-scene-caption, .home-sites [data-mission=; full list in contract; **4.2s M**; captures **0/0/0**; bug **F `4666513`**; contract [A133](#a133).
- **title mobile 320x568 › scene plate, copy, menu and selector remain separate and tappable** — keeps .home-menu > .daily-card, .globe.is-embedded; full list in contract; **19.7s M**; captures **2/0/0**; bug **F `4666513`**; contract [A134](#a134).
- **title mobile 390x844 › scene plate, copy, menu and selector remain separate and tappable** — keeps .home-menu > .daily-card, .globe.is-embedded; full list in contract; **24s M**; captures **2/0/0**; bug **F `4666513`**; contract [A134](#a134).
- **title mobile 667x375 › scene plate, copy, menu and selector remain separate and tappable** — keeps .home-menu > .daily-card, .globe.is-embedded; full list in contract; **7s M**; captures **2/0/0**; bug **F `4666513`**; contract [A134](#a134).
- **title mobile 844x390 › scene plate, copy, menu and selector remain separate and tappable** — keeps .home-menu > .daily-card, .globe.is-embedded; full list in contract; **26.5s M**; captures **2/0/0**; bug **F `4666513`**; contract [A134](#a134).

<a id="a127"></a>

**Contract A127 (f-title-scene.spec.ts:L97)** — `home presents the shared title canvas within ${tier} budgets`.

Row expansion: `const tier of ['low', 'high'] as const`.

- `expect(page).toHaveTitle('Bathyline')`
- `expect(page.locator('.home-screen')).toHaveClass(/has-title-scene/)`
- `expect(page.locator('#viewport')).toBeVisible()`
- `expect(page.locator('.globe.is-embedded')).toBeHidden()`
- `expect.poll(async () => (await title(page)).terrainReady).toBe(true)`
- `expect(page.locator('.home-scene-caption')).toHaveText( 'Monterey Canyon · Real GMRT bathymetry', )`
- `expect.poll(async () => (await title(page)).animated).toBe(true)`
- `expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(before)`
- `expect(stats.calls).toBeGreaterThan(0)`
- `expect(stats.calls).toBeLessThanOrEqual(tier === 'low' ? 35 : 60)`
- `expect(stats.triangles).toBeGreaterThan(0)`
- `expect(stats.triangles).toBeLessThanOrEqual(tier === 'low' ? 100_000 : 200_000)`
- `expect(await page.locator('#viewport').count()).toBe(1)`

Helper guard closure: [boot](#f-title-scene-spec-ts-18-boot), [presented](#f-title-scene-spec-ts-23-presented).

Helper call bindings: ``boot(page, `/?tier=${tier}`)``; `presented(page)`.

<a id="a128"></a>

**Contract A128 (f-title-scene.spec.ts:L125)** — `${name} hands off to the globe; ${exit} restores title and focus`.

Row expansion: `const name of ['Dive sites', 'Free dive'] as const`; `const exit of ['Back', 'Escape'] as const`.

- `expect(page.locator('.home-sites h2')).toHaveText(name)`
- `expect(page.locator('.globe.is-embedded')).toBeVisible()`
- `expect.poll(async () => (await title(page)).active).toBe(false)`

Scope: `if name === 'Free dive'`.

- `expect(page.locator('.home-sites .mission-select')).toHaveClass(/is-free-dive/)`
- `expect(page.locator('.home-sites [data-tile="titanic"]')).toBeVisible()`
- `expect(page.locator('.home-sites [data-mission="titanic"]')).toBeHidden()`

Scope: `const key of ['Tab', 'Shift+Tab']`.

- `expect( await page.evaluate(() => { const focused = document.activeElement; return ( focused !== null && focused.closest('.home-sites, .globe.is-embedded') !== null && focused.getClientRects().length > 0 ); }), ).toBe(true)`

Scope: unconditional in this body.

- `expect(page.locator('.home-sites')).toBeHidden()`
- `expect(page.locator('.globe.is-embedded')).toBeHidden()`
- `expect(origin).toBeFocused()`
- `expect.poll(async () => (await title(page)).active).toBe(true)`
- `expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(before)`

Helper guard closure: [boot](#f-title-scene-spec-ts-18-boot), [presented](#f-title-scene-spec-ts-23-presented), [stopped](#f-title-scene-spec-ts-28-stopped).

Helper call bindings: `boot(page)`; `presented(page)`; `stopped(page)`.

<a id="a129"></a>

**Contract A129 (f-title-scene.spec.ts:L164)** — 'Free dive launches a tile route and leaves the title inactive'.

- `expect(new URL(page.url()).searchParams.has('mission')).toBe(false)`
- `expect(page.locator('.home-screen')).toBeHidden()`
- `expect(page.locator('.globe.is-embedded')).toBeHidden()`
- `expect((await title(page)).active).toBe(false)`
- `expect((await title(page)).drawCount).toBe(0)`

Readiness/temporal predicates: `page.waitForURL(/[?&]tile=titanic\b/)`; `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [boot](#f-title-scene-spec-ts-18-boot).

Helper call bindings: `boot(page)`.

<a id="a130"></a>

**Contract A130 (f-title-scene.spec.ts:L180)** — `${preference} reduced motion presents a static title and redraws on resize`.

Row expansion: `const preference of ['OS', 'saved'] as const`.

- `expect.poll(async () => (await title(page)).terrainReady).toBe(true)`
- `expect.poll(async () => (await title(page)).animated).toBe(false)`
- `expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(before)`
- `expect(staticPose.at(-1), 'reduced motion hides title snow').toBe(0)`
- `expect(await pose(), 'title camera and vehicle transforms stay static').toEqual(staticPose)`
- `expect.poll(async () => (await title(page)).animated).toBe(true)`
- `expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(resumed)`

Helper guard closure: [boot](#f-title-scene-spec-ts-18-boot), [presented](#f-title-scene-spec-ts-23-presented), [stopped](#f-title-scene-spec-ts-28-stopped).

Helper call bindings: `boot(page)`; `presented(page)`; `stopped(page)`.

<a id="a131"></a>

**Contract A131 (f-title-scene.spec.ts:L244)** — 'covering home modals stop title draws and return to a usable menu'.

Scope: `const [name, selector] of [ ['Settings', '.settings'], ['Journal', '.journal'], ['Controls', '.settings'], ['Upgrades', '.upgrades'], ]`.

- `expect(dialog).toBeVisible()`
- `expect(dialog).toHaveAccessibleName(name)`

Scope: `const [name, selector] of [ ['Settings', '.settings'], ['Journal', '.journal'], ['Controls', '.settings'], ['Upgrades', '.upgrades'], ]; if name === 'Controls'`.

- `expect(dialog.getByRole('region', { name: 'Controls', exact: true })).toBeVisible()`
- `expect( dialog.getByRole('button', { name: 'Back to Settings', exact: true }), ).toBeFocused()`

Scope: `const [name, selector] of [ ['Settings', '.settings'], ['Journal', '.journal'], ['Controls', '.settings'], ['Upgrades', '.upgrades'], ]`.

- `expect.poll(async () => (await title(page)).active).toBe(false)`
- `expect(dialog).toBeHidden()`
- `expect( page.locator('.home-menu').getByRole('button', { name, exact: true }), ).toBeFocused()`
- `expect.poll(async () => (await title(page)).active).toBe(true)`
- `expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(before)`

Helper guard closure: [boot](#f-title-scene-spec-ts-18-boot), [presented](#f-title-scene-spec-ts-23-presented), [stopped](#f-title-scene-spec-ts-28-stopped).

Helper call bindings: `boot(page)`; `presented(page)`; `stopped(page)`.

<a id="a132"></a>

**Contract A132 (f-title-scene.spec.ts:L276)** — 'quit after a mission lazily presents home, keeps Continue and freezes the sub'.

- `expect(page.locator('.home-screen')).toBeHidden()`
- `expect((await title(page)).drawCount).toBe(0)`
- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(page.locator('.globe.is-embedded')).toBeHidden()`
- `expect(resume).toBeEnabled()`
- `expect(resume).toBeFocused()`
- `expect(new URL(page.url()).pathname).toBe('/')`
- `expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ tier: 'low' })`
- `expect(await pose()).toEqual(before)`
- `expect(page.locator('.home-screen')).toBeHidden()`
- `expect(page.locator('.briefing')).toBeVisible()`
- `expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ mission: 'titanic', tier: 'low', })`
- `expect.poll(async () => (await title(page)).active).toBe(false)`

Helper guard closure: [boot](#f-title-scene-spec-ts-18-boot), [presented](#f-title-scene-spec-ts-23-presented).

Helper call bindings: `boot(page, '/?mission=titanic&skipBriefing=1&tier=low')`; `presented(page)`.

<a id="a133"></a>

**Contract A133 (f-title-scene.spec.ts:L317)** — 'optional title terrain and font failures leave an honest, usable fallback'.

- `expect.poll(() => blocked).toBeGreaterThan(0)`
- `expect.poll(() => blockedFonts).toBeGreaterThan(0)`
- `expect.poll(() => fallbackSettled).toBe(true)`
- `expect(page.locator('.home-scene-caption')).toHaveText('Expedition preview')`
- `expect((await title(page)).terrainReady).toBe(false)`
- `expect(await page.evaluate(() => window.__gameError)).toBeFalsy()`
- `expect(page.locator('.home-sites [data-mission="titanic"]')).toBeVisible()`
- `expect(errors).toEqual([])`

Helper guard closure: [boot](#f-title-scene-spec-ts-18-boot), [presented](#f-title-scene-spec-ts-23-presented).

Helper call bindings: `boot(page)`; `presented(page)`.

<a id="a134"></a>

**Contract A134 (f-title-scene.spec.ts:L362)** — 'scene plate, copy, menu and selector remain separate and tappable'.

Row expansion: `const viewport of [ { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 844, height: 390 }, ]`.

Scope: `if releaseCatalogue`.

- `expect.poll(() => catalogueRequests).toBeGreaterThan(0)`
- `expect(page.locator('.home-menu > .daily-card')).toBeHidden()`

Scope: unconditional in this body.

- `expect(page.locator('.home-menu > .daily-card')).toBeVisible()`
- `expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe( true, )`

Scope: `const button of await page.locator('.home-menu button:visible').all()`.

- `expect(box.width).toBeGreaterThanOrEqual(48)`
- `expect(box.height).toBeGreaterThanOrEqual(48)`
- `expect( await button.evaluate((el) => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); }), (await button.textContent()) ?? 'menu button', ).toBe(true)`

Scope: unconditional in this body.

- `expect(page.locator('.globe.is-embedded')).toBeVisible()`
- `expect.poll(async () => (await title(page)).active).toBe(false)`
- `expect(page.locator('.globe.is-embedded')).toBeHidden()`

Helper guard closure: [boot](#f-title-scene-spec-ts-18-boot), [presented](#f-title-scene-spec-ts-23-presented), [expectMobileRegions](#f-title-scene-spec-ts-37-expectmobileregions).

Helper call bindings: `boot(page)`; `presented(page)`; `expectMobileRegions(page, viewport)`.

### [f-toast-placement.spec.ts](../../tests/e2e/f-toast-placement.spec.ts) — HUD/touch layout

8 expanded cases; sum of assigned weights **407.8s**, 0 fallback keys. Disposition: **fold → hud-touch.spec.ts**.

Overlap: Animal-toast geometry partially overlaps first-minute checks; H9 retains8px offset, same width, long wrap and dismiss hit test at original8 rows.

History/provenance scope: **F**, `e229071` — capability introduced here; no specific failed-before defect located. Origin: `e229071 feat(f-toast-550): contextual hints stack under scan target`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch, isMobile: layout.touch, })`.

Selector/fixture constants: `hud = ['.sonar', '.hud-readouts']`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1600x900-100 › great-blue-hole: animal toast stays clear of HUD and can be dismissed** — keeps .scan-panel, .onboard-hint, .onboard-card; full list in contract; **72.3s M**; captures **2/0/0**; bug **F `e229071`**; contract [A135](#a135).
- **1280x720-100 › monterey-canyon: animal toast stays clear of HUD and can be dismissed** — keeps .scan-panel, .onboard-hint, .onboard-card; full list in contract; **80.1s M**; captures **2/0/0**; bug **F `e229071`**; contract [A135](#a135).
- **390x844-100 › great-blue-hole: animal toast stays clear of HUD and can be dismissed** — keeps .scan-panel, .onboard-hint, .onboard-card; full list in contract; **31.3s M**; captures **2/0/0**; bug **F `e229071`**; contract [A135](#a135).
- **360x640-100 › monterey-canyon: animal toast stays clear of HUD and can be dismissed** — keeps .scan-panel, .onboard-hint, .onboard-card; full list in contract; **41.4s M**; captures **2/0/0**; bug **F `e229071`**; contract [A135](#a135).
- **844x390-100 › monterey-canyon: animal toast stays clear of HUD and can be dismissed** — keeps .scan-panel, .onboard-hint, .onboard-card; full list in contract; **72.2s M**; captures **2/0/0**; bug **F `e229071`**; contract [A135](#a135).
- **390x844-150 › great-blue-hole: animal toast stays clear of HUD and can be dismissed** — keeps .scan-panel, .onboard-hint, .onboard-card; full list in contract; **31.4s M**; captures **2/0/0**; bug **F `e229071`**; contract [A135](#a135).
- **360x640-150 › monterey-canyon: animal toast stays clear of HUD and can be dismissed** — keeps .scan-panel, .onboard-hint, .onboard-card; full list in contract; **41.3s M**; captures **2/0/0**; bug **F `e229071`**; contract [A135](#a135).
- **844x390-150 › great-blue-hole: animal toast stays clear of HUD and can be dismissed** — keeps .scan-panel, .onboard-hint, .onboard-card; full list in contract; **37.8s M**; captures **2/0/0**; bug **F `e229071`**; contract [A135](#a135).

<a id="a135"></a>

**Contract A135 (f-toast-placement.spec.ts:L94)** — `${site}: animal toast stays clear of HUD and can be dismissed`.

Row expansion: `const layout of [ { width: 1600, height: 900, touch: false, scale: 100 }, { width: 1280, height: 720, touch: false, scale: 100 }, ...[100, 150].flatMap((scale) => [ { width: 390, height: 844 }, { width: 360, height: 640 }, { width: 844, height: 390 }, ].map((viewport) => ({ ...viewport, touch: true, scale })), ), ]`; `const site of [ layout.width === 1600 || layout.width === 390 || (layout.width === 844 && layout.scale === 150) ? 'great-blue-hole' : 'monterey-canyon', ]`.

Navigation: ``page.goto( `/?tile=${site}&skipBriefing=1&tier=low&lifeSeed=3${layout.touch ? '&touch=1' : ''}`, { waitUntil: 'domcontentloaded' }, )``.

- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(page.locator('.onboard-hint')).toBeHidden()`
- `expect(spawned.spawned).toBe(true)`
- `expect(spawned.targets).toBeGreaterThan(0)`
- `expect(page.locator('.onboard-card')).toBeHidden()`
- `expect(hint).toContainText( layout.touch ? 'Animal nearby. Hold SCAN to scan, or use PHOTO for a photo.' : 'Animal nearby. Hold G to scan, or use P for a photo.', )`
- `expect(toast.y - target.y - target.height).toBeCloseTo(8, 0)`
- `expect(toast.x + toast.width / 2).toBeCloseTo(target.x + target.width / 2, 0)`
- `expect(toast.width).toBeCloseTo(target.width, 0)`

Scope: `if !layout.touch`.

- `expect(toast.x + toast.width / 2).toBe(layout.width / 2)`

Scope: unconditional in this body.

- `expect(wrappedToast.y - wrappedTarget.y - wrappedTarget.height).toBeCloseTo(8, 0)`
- `expect(wrappedToast.x).toBeCloseTo(wrappedTarget.x, 0)`
- `expect(wrappedToast.width).toBeCloseTo(wrappedTarget.width, 0)`
- `expect(page.locator('.scan-panel')).toBeHidden()`
- `expect(hit.width).toBeGreaterThanOrEqual(44)`
- `expect(hit.height).toBeGreaterThanOrEqual(44)`
- `expect(hit.reachable).toBe(true)`
- `expect(hint).toBeHidden()`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [finishAnimations](#helpers-hudtips-ts-23-finishanimations), [separate](#f-toast-placement-spec-ts-21-separate), [dismissTutorial](#helpers-tutorial-ts-4-dismisstutorial).

Helper call bindings: `clockFramesUntil(page, () => { const game = window.__game as unknown as Probe; // Wildlife can finish loading before POIs; a paused clock cannot // make the scan panel appear while a DOM-only assertion waits. return ( window.__gameReady === true && !!game.life && game.discovery.loaded && game.props.loaded ); })`; `finishAnimations(page, '.onboard-card')`; `separate(page, [...hud, '.scan-panel', '.onboard-card', ...controls])`; `dismissTutorial(page, layout.touch, true)`; `finishAnimations(page, '.onboard-hint')`; `separate(page, [...hud, '.scan-panel', '.onboard-hint', ...controls])`; `separate(page, [...hud, '.onboard-hint', ...controls])`.

### [f-touch-audit.spec.ts](../../tests/e2e/f-touch-audit.spec.ts) — HUD/touch layout

16 expanded cases; sum of assigned weights **1138.4s**, 0 fallback keys. Disposition: **fold → hud-touch.spec.ts**.

Overlap: Same dimensions sometimes asHUD/1390 but different150% fixture/state; keepH2/H3. Menu/Journal journeys are uniqueH12 carry-over.

History/provenance scope: **F**, `e5f7543` — capability introduced here; no specific failed-before defect located. Origin: `e5f7543 170-f-touch-audit: codex package (gates green)`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport, hasTouch: true, isMobile: true })`.

Selector/fixture constants: `controls = [ '.tc-stick', '.tc-slider', '.tc-btn-scan', '.tc-btn-lights', '.tc-btn-sonar', '.tc-btn-photo', '.tc-btn-pause', '.tc-btn-boost', '.hud-journal', ]`; `hud = ['.sonar', '.hud-readouts', '.scan-panel']`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **touch audit 360x640 › fresh dive separates HUD and controls at 80% UI** — keeps .scan-panel, .scan-hint, .tc-rotate-hint, .onboard-card button:visible, .d-sonar-legend, .sonar; full list in contract; **57.5s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A136](#a136).
- **touch audit 360x640 › fresh dive separates HUD and controls at 100% UI** — keeps .scan-panel, .scan-hint, .tc-rotate-hint, .onboard-card button:visible, .d-sonar-legend, .sonar; full list in contract; **108.4s M**; captures **2/0/0**; bug **F `e5f7543`**; contract [A136](#a136).
- **touch audit 360x640 › fresh dive separates HUD and controls at 150% UI** — keeps .scan-panel, .scan-hint, .tc-rotate-hint, .onboard-card button:visible, .d-sonar-legend, .sonar; full list in contract; **93.3s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A136](#a136).
- **touch audit 360x640 › mission objectives and readouts share the phone column** — keeps .objectives-panel, .onboard-card, .hud-readouts; full list in contract; **14.3s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A137](#a137).
- **touch audit 390x844 › fresh dive separates HUD and controls at 150% UI** — keeps .scan-panel, .scan-hint, .tc-rotate-hint, .onboard-card button:visible, .d-sonar-legend, .sonar; full list in contract; **115.2s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A136](#a136).
- **touch audit 390x844 › mission objectives and readouts share the phone column** — keeps .objectives-panel, .onboard-card, .hud-readouts; full list in contract; **15.3s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A137](#a137).
- **touch audit 390x844 › Daily, expanded mode picker and menu exits are reachable by touch** — keeps .home-body, .globe.is-embedded, .home-sites h2, radio, .mode-custom-tag, .briefing; full list in contract; **61.5s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A138](#a138).
- **touch audit 390x844 › journal spoilers, navigation, entries and Close remain reachable** — keeps switch, .jr-body .jr-title, .jr-header, .jr-entries, .home-screen; full list in contract; **2.9s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A139](#a139).
- **touch audit 667x375 › fresh dive separates HUD and controls at 80% UI** — keeps .scan-panel, .scan-hint, .tc-rotate-hint, .onboard-card button:visible, .d-sonar-legend, .sonar; full list in contract; **137.3s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A136](#a136).
- **touch audit 667x375 › fresh dive separates HUD and controls at 100% UI** — keeps .scan-panel, .scan-hint, .tc-rotate-hint, .onboard-card button:visible, .d-sonar-legend, .sonar; full list in contract; **141.1s M**; captures **2/0/0**; bug **F `e5f7543`**; contract [A136](#a136).
- **touch audit 667x375 › fresh dive separates HUD and controls at 150% UI** — keeps .scan-panel, .scan-hint, .tc-rotate-hint, .onboard-card button:visible, .d-sonar-legend, .sonar; full list in contract; **136.1s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A136](#a136).
- **touch audit 667x375 › mission objectives and readouts share the phone column** — keeps .objectives-panel, .onboard-card, .hud-readouts; full list in contract; **17s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A137](#a137).
- **touch audit 667x375 › Daily, expanded mode picker and menu exits are reachable by touch** — keeps .home-body, .globe.is-embedded, .home-sites h2, radio, .mode-custom-tag, .briefing; full list in contract; **53.1s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A138](#a138).
- **touch audit 667x375 › journal spoilers, navigation, entries and Close remain reachable** — keeps switch, .jr-body .jr-title, .jr-header, .jr-entries, .home-screen; full list in contract; **2.4s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A139](#a139).
- **touch audit 844x390 › fresh dive separates HUD and controls at 150% UI** — keeps .scan-panel, .scan-hint, .tc-rotate-hint, .onboard-card button:visible, .d-sonar-legend, .sonar; full list in contract; **164.5s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A136](#a136).
- **touch audit 844x390 › mission objectives and readouts share the phone column** — keeps .objectives-panel, .onboard-card, .hud-readouts; full list in contract; **18.5s M**; captures **0/0/0**; bug **F `e5f7543`**; contract [A137](#a137).

<a id="a136"></a>

**Contract A136 (f-touch-audit.spec.ts:L102)** — `fresh dive separates HUD and controls at ${scale}% UI`.

Row expansion: `const viewport of [ { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 844, height: 390 }, ]`; `const scale of viewport.width === 360 || viewport.width === 667 ? [80, 100, 150] : [150]`.

- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(page.locator('.scan-hint')).toHaveText('HOLD SCAN TO SCAN')`

Scope: `if viewport.width < viewport.height`.

- `expect(page.locator('.tc-rotate-hint')).toBeHidden()`

Scope: unconditional in this body.

- `expect(page.locator('.onboard-card button:visible')).toHaveCount(1)`
- `expect(page.locator('.d-sonar-legend')).toBeHidden()`
- `expect((await page.locator('.sonar').boundingBox())!.width).toBe( viewport.width > viewport.height ? 120 : 96, )`

Scope: `const step of ['move', 'depth', 'lights', 'scan', 'journal']`.

- `expect(page.locator('.onboard-card')).toHaveAttribute('data-step', step)`
- `expect( await page.locator('.onboard-card').evaluate((e) => e.scrollWidth <= e.clientWidth), ).toBe(true)`

Scope: unconditional in this body.

- `expect(page.locator('.onboard-card')).toBeHidden()`
- `expect(page.locator('.onboard-hint')).toBeHidden()`
- `expect(page.locator('.scan-hint')).toHaveText('PAUSE → JOURNAL')`
- `expect( await page.locator('.scan-panel').evaluate((e) => e.scrollWidth <= e.clientWidth), ).toBe(true)`
- `expect(page.locator('.sonar')).toHaveClass(/d-sonar-expanded/)`
- `expect(page.locator('.tc-stick')).toBeVisible()`

Helper guard closure: [ready](#f-touch-audit-spec-ts-7-ready), [separate](#f-touch-audit-spec-ts-12-separate), [reachable](#f-touch-audit-spec-ts-59-reachable), [expectCompactPhoneHud](#helpers-phonehud-ts-17-expectcompactphonehud).

Helper call bindings: `ready(page, dive)`; `separate(page, [...hud, '.onboard-card', ...controls])`; `reachable(button)`; `reachable(page.getByRole('button', { name: 'Skip', exact: true }))`; `expectCompactPhoneHud(page)`; `separate(page, ['.scan-panel', ...controls])`; `separate(page, [ '.sonar', '.tc-btn-scan', '.tc-btn-lights', '.tc-btn-sonar', '.tc-btn-photo', '.tc-btn-pause', '.tc-btn-boost', '.hud-journal', ])`.

<a id="a137"></a>

**Contract A137 (f-touch-audit.spec.ts:L194)** — 'mission objectives and readouts share the phone column'.

Row expansion: `const viewport of [ { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 844, height: 390 }, ]`.

- `expect(page.locator('.objectives-panel')).toBeVisible()`
- `expect(page.locator('.onboard-card')).toBeVisible()`
- `expect( await page.locator('.hud-readouts').evaluate((e) => e.scrollWidth <= e.clientWidth), ).toBe(true)`

Helper guard closure: [ready](#f-touch-audit-spec-ts-7-ready), [separate](#f-touch-audit-spec-ts-12-separate).

Helper call bindings: `ready(page, '/?mission=monterey-canyon&skipBriefing=1&touch=1&tier=low')`; `separate(page, [ '.objectives-panel', '.hud-readouts', '.onboard-card', '.sonar', '.tc-stick', '.tc-slider', '.tc-btn-scan', '.tc-btn-lights', '.tc-btn-sonar', '.tc-btn-photo', '.tc-btn-pause', ])`.

<a id="a138"></a>

**Contract A138 (f-touch-audit.spec.ts:L235)** — 'Daily, expanded mode picker and menu exits are reachable by touch'.

Row expansion: `const viewport of [ { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 844, height: 390 }, ]`.

- `expect((await home.locator('.home-body').boundingBox())!.height).toBeGreaterThan(300)`
- `expect(page.locator('.globe.is-embedded')).toBeHidden()`
- `expect( await menu .locator(':scope > *') .evaluateAll((elements) => elements.map((element) => element.classList.contains('daily-card') ? 'Daily dive' : element.classList.contains('mode-selector') ? 'Mode' : element.textContent, ), ), ).toEqual([ 'Continue', 'Dive sites', 'Free dive', 'Daily dive', 'Mode', 'Journal', 'Settings', 'Controls', 'Upgrades', ])`

Scope: `const name of ['Dive sites', 'Free dive']`.

- `expect(home.locator('.home-sites h2')).toHaveText(name)`
- `expect(page.locator('.globe.is-embedded')).toBeVisible()`
- `expect(page.locator('.globe.is-embedded')).toBeHidden()`
- `expect(origin).toBeFocused()`

Scope: unconditional in this body.

- `expect(mode.getByRole('radio', { name: 'Realistic' })).toBeChecked()`
- `expect(mode.locator('.mode-custom-tag')).toBeVisible()`
- `expect(page.locator('.briefing')).toBeVisible()`

Helper guard closure: [ready](#f-touch-audit-spec-ts-7-ready), [separate](#f-touch-audit-spec-ts-12-separate), [reachable](#f-touch-audit-spec-ts-59-reachable).

Helper call bindings: `ready(page, '/?touch=1&tier=low')`; `separate(page, ['.home-copy', '.home-body'])`; `reachable(origin)`; `separate(page, ['.home-globe-wrap', '.home-sites'])`; `reachable(back)`; `reachable(radio)`; `reachable(select)`; `reachable(menu.getByRole('button', { name: new RegExp(name) }))`; `reachable(briefing.locator('.briefing-begin'))`; `reachable(briefing.getByRole('link', { name: 'Free dive', exact: true }))`.

<a id="a139"></a>

**Contract A139 (f-touch-audit.spec.ts:L303)** — 'journal spoilers, navigation, entries and Close remain reachable'.

Row expansion: `const viewport of [ { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 844, height: 390 }, ]`.

- `expect(journal).toBeVisible()`
- `expect(sites).toHaveCount(catalog.landmarks.length)`
- `expect( journal.getByRole('switch', { name: 'Show spoilers', exact: true }), ).toBeChecked()`
- `expect(journal).toHaveClass(/is-phone/)`
- `expect(journal.locator('.jr-body .jr-title')).toHaveText('RMS Titanic')`
- `expect(journal.locator('.jr-body .jr-title')).toHaveText(title)`
- `expect(journal.locator('.jr-body .jr-title')).not.toHaveText('Undiscovered')`
- `expect(journal.locator('.jr-body .jr-title')).toHaveText('RMS Titanic')`
- `expect(journal).toHaveClass(/at-front/)`
- `expect( await journal.locator('.jr-header').evaluate((e) => e.scrollWidth <= e.clientWidth), ).toBe(true)`
- `expect(journal.locator('.jr-entries')).toBeVisible()`
- `expect(journal).toBeHidden()`
- `expect(page.locator('.home-screen')).toBeVisible()`

Helper guard closure: [ready](#f-touch-audit-spec-ts-7-ready), [reachable](#f-touch-audit-spec-ts-59-reachable).

Helper call bindings: `ready(page, '/?touch=1&tier=low')`; `reachable(journal.locator('.jr-spoilers'))`; `reachable(sites.first())`; `reachable(sites.last())`; `reachable(site)`; `reachable(entries.first())`; `reachable(entries.last())`; `reachable(back)`; `reachable(journal.getByRole('button', { name: 'Back', exact: true }))`; `reachable(journal.locator('.jr-close'))`.

### [f-touch-controls-1392.spec.ts](../../tests/e2e/f-touch-controls-1392.spec.ts) — HUD/touch layout

7 expanded cases; sum of assigned weights **315.0s**, 7 fallback keys. Disposition: **fold → hud-touch.spec.ts**.

Overlap: Per-button bounds overlap HUD sweeps, but48px threshold/dock/Boost latch and Journal native action are unique; H10 survives.

History/provenance scope: **R**, `0edd096` — Scan/reward and Boost/tutorial overlap. [1392 measured overlap and latch behavior](1392-f-touch-controls.md). Origin: `e399c47 wip(1392): touch boost toggle and HUD Journal button (round 1)`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: v, hasTouch: v.touch, isMobile: v.touch })`; `test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **portrait › separates every button, opens Journal through the action, and toggles Boost** — keeps .tc-btn-boost, .pause-menu, button, state.boost; full list in contract; **45s F**; captures **3/0/0**; bug **R `0edd096`**; contract [A140](#a140).
- **landscape › separates every button, opens Journal through the action, and toggles Boost** — keeps .tc-btn-boost, .pause-menu, button, state.boost; full list in contract; **45s F**; captures **3/0/0**; bug **R `0edd096`**; contract [A140](#a140).
- **landscape-small › separates every button, opens Journal through the action, and toggles Boost** — keeps .tc-btn-boost, .pause-menu, button, state.boost; full list in contract; **45s F**; captures **3/0/0**; bug **R `0edd096`**; contract [A140](#a140).
- **tablet › separates every button, opens Journal through the action, and toggles Boost** — keeps .tc-btn-boost, .pause-menu, button, state.boost; full list in contract; **45s F**; captures **3/0/0**; bug **R `0edd096`**; contract [A140](#a140).
- **desktop › separates every button, opens Journal through the action, and toggles Boost** — keeps .tc-btn-boost, .pause-menu, button, state.boost; full list in contract; **45s F**; captures **1/0/0**; bug **R `0edd096`**; contract [A140](#a140).
- **touch boost reset › meter depletion clears the latch and recovery requires another tap** — keeps 'meter depletion clears the latch and recovery requires another tap'; full list in contract; **45s F**; captures **0/0/0**; bug **F `0edd096`**; contract [A141](#a141).
- **touch boost reset › hidden page and dive end clear the latch** — keeps .tc-root; full list in contract; **45s F**; captures **0/0/0**; bug **F `0edd096`**; contract [A142](#a142).

<a id="a140"></a>

**Contract A140 (f-touch-controls-1392.spec.ts:L78)** — 'separates every button, opens Journal through the action, and toggles Boost'.

Row expansion: `const v of [ { width: 390, height: 844, name: 'portrait', touch: true }, { width: 844, height: 390, name: 'landscape', touch: true }, { width: 667, height: 375, name: 'landscape-small', touch: true }, { width: 1024, height: 768, name: 'tablet', touch: true }, { width: 1280, height: 720, name: 'desktop', touch: false }, ]`.

- `expect(journal).toHaveAttribute('title', 'Journal (J)')`

Scope: `if v.touch; if v.width < v.height`.

- `expect(slider.x - dock.x - dock.width).toBeGreaterThanOrEqual(8)`
- `expect(slider.x - dock.x - dock.width).toBeLessThanOrEqual(20)`
- `expect(dock.y).toBeGreaterThanOrEqual(slider.y)`
- `expect(dock.y + dock.height).toBeLessThanOrEqual(slider.y + slider.height)`

Scope: `if v.touch; else of v.width < v.height`.

- `expect(Math.abs(slider.x - dock.x)).toBeLessThanOrEqual(1)`
- `expect(slider.y - dock.y - dock.height).toBeGreaterThanOrEqual(8)`
- `expect(slider.y - dock.y - dock.height).toBeLessThanOrEqual(16)`

Scope: `if v.touch`.

- `expect(boost).toHaveAttribute('aria-pressed', 'false')`
- `expect(boost).toHaveAttribute('aria-pressed', 'true')`
- `expect(boost).toHaveClass(/is-active/)`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).input.state.boost), ).toBe(true)`
- `expect(boost).toHaveAttribute('aria-pressed', 'false')`

Scope: unconditional in this body.

- `expect(await page.evaluate(() => (window.__game as unknown as Game).journal.isOpen)).toBe( true, )`
- `expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe( false, )`

Scope: `if v.touch`.

- `expect(page.locator('.tc-btn-boost')).toHaveAttribute('aria-pressed', 'false')`
- `expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe( false, )`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect( page.locator('.pause-menu').getByRole('button', { name: 'Journal', exact: true }), ).toBeVisible()`

Scope: `else of v.touch`.

- `expect( await page.evaluate(() => (window.__game as unknown as Game).input.state.boost), ).toBe(true)`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).input.state.boost), ).toBe(false)`

Helper guard closure: [boot](#f-touch-controls-1392-spec-ts-17-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [layout](#f-touch-controls-1392-spec-ts-27-layout).

Helper call bindings: `boot(page, v.touch)`; `layout(page)`.

<a id="a141"></a>

**Contract A141 (f-touch-controls-1392.spec.ts:L159)** — 'meter depletion clears the latch and recovery requires another tap'.

- `expect(boost).toHaveAttribute('aria-pressed', 'true')`
- `expect(boost).toHaveAttribute('aria-pressed', 'false')`
- `expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe( false, )`
- `expect(boost).toHaveAttribute('aria-pressed', 'false')`
- `expect(boost).toHaveAttribute('aria-pressed', 'true')`

Helper guard closure: [boot](#f-touch-controls-1392-spec-ts-17-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `boot(page, true)`; `clockFramesUntil(page, () => !(window.__game as unknown as Game).input.touchBoost, 250)`.

<a id="a142"></a>

**Contract A142 (f-touch-controls-1392.spec.ts:L178)** — 'hidden page and dive end clear the latch'.

- `expect(boost).toHaveAttribute('aria-pressed', 'false')`
- `expect(await page.evaluate(() => (window.__game as unknown as Game).input.touchBoost)).toBe( false, )`
- `expect(page.locator('.tc-root')).toBeHidden()`

Helper guard closure: [boot](#f-touch-controls-1392-spec-ts-17-boot), [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `boot(page, true)`.

### [f-touch-stack.spec.ts](../../tests/e2e/f-touch-stack.spec.ts) — HUD/touch layout

6 expanded cases; sum of assigned weights **270.0s**, 6 fallback keys. Disposition: **fold → hud-touch.spec.ts**.

Overlap: Chip height/visibility at844/667 repeats1390 at matching away phase; H6 addsH7 half-height/final≤56px.932×430 row remains.

History/provenance scope: **F**, `83eeaeb` — capability introduced here; no specific failed-before defect located. [collapse/chip contract](f-touch-stack.md). Origin: `83eeaeb wip(f-touch-stack): objective chip and one-line tutorial on touch landscape`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport, hasTouch: true, isMobile: true })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **touch stack 844x390 › tutorial collapses to one line at its last step** — keeps 'tutorial collapses to one line at its last step'; full list in contract; **45s F**; captures **0/0/0**; bug **F `83eeaeb`**; contract [A143](#a143).
- **touch stack 844x390 › objective chip shows when no contact is in range** — keeps locator('.scan-panel')).toBeHidden(); chip).toBeVisible(); chip).toContainText('▸'); box.height).toBeLessThanOrEqual(28); overlaps).toBe(0); **45s F**; captures **0/0/0**; bug **F `83eeaeb`**; contract [A144](#a144).
- **touch stack 667x375 › tutorial collapses to one line at its last step** — keeps 'tutorial collapses to one line at its last step'; full list in contract; **45s F**; captures **0/0/0**; bug **F `83eeaeb`**; contract [A143](#a143).
- **touch stack 667x375 › objective chip shows when no contact is in range** — keeps locator('.scan-panel')).toBeHidden(); chip).toBeVisible(); chip).toContainText('▸'); box.height).toBeLessThanOrEqual(28); overlaps).toBe(0); **45s F**; captures **0/0/0**; bug **F `83eeaeb`**; contract [A144](#a144).
- **touch stack 932x430 › tutorial collapses to one line at its last step** — keeps 'tutorial collapses to one line at its last step'; full list in contract; **45s F**; captures **0/0/0**; bug **F `83eeaeb`**; contract [A143](#a143).
- **touch stack 932x430 › objective chip shows when no contact is in range** — keeps locator('.scan-panel')).toBeHidden(); chip).toBeVisible(); chip).toContainText('▸'); box.height).toBeLessThanOrEqual(28); overlaps).toBe(0); **45s F**; captures **0/0/0**; bug **F `83eeaeb`**; contract [A144](#a144).

<a id="a143"></a>

**Contract A143 (f-touch-stack.spec.ts:L22)** — 'tutorial collapses to one line at its last step'.

Row expansion: `const viewport of [ { width: 844, height: 390 }, { width: 667, height: 375 }, { width: 932, height: 430 }, ]`.

Scope: `const step of ['move', 'depth', 'lights', 'scan']`.

- `expect(card).toHaveAttribute('data-step', step)`

Scope: unconditional in this body.

- `expect(card).toHaveAttribute('data-step', 'journal')`
- `expect(h).toBeLessThanOrEqual(56)`
- `expect(Math.max(...bottoms)).toBeLessThan(viewport.height * 0.5 + 20)`

Helper guard closure: [ready](#f-touch-stack-spec-ts-8-ready).

Helper call bindings: `ready(page, tutorialUrl)`.

<a id="a144"></a>

**Contract A144 (f-touch-stack.spec.ts:L43)** — 'objective chip shows when no contact is in range'.

Row expansion: `const viewport of [ { width: 844, height: 390 }, { width: 667, height: 375 }, { width: 932, height: 430 }, ]`.

- `expect(page.locator('.scan-panel')).toBeHidden()`
- `expect(chip).toBeVisible()`
- `expect(chip).toContainText('▸')`
- `expect(box.height).toBeLessThanOrEqual(28)`
- `expect(overlaps).toBe(0)`

Helper guard closure: [ready](#f-touch-stack-spec-ts-8-ready), [dismissTutorial](#helpers-tutorial-ts-4-dismisstutorial).

Helper call bindings: `ready(page, stackUrl)`; `dismissTutorial(page, true)`.

### [f-verify-1000.spec.ts](../../tests/e2e/f-verify-1000.spec.ts) — perf

25 expanded cases; sum of assigned weights **3962.4s**, 12 fallback keys. Disposition: **retain ordinary capability guard; existing opt-in/local-only restrictions recorded**.

Overlap: Journal top-level13count fragment other suites; synthetic nested-selector repro unique; route/scan≤2min/transit and600 actual samples remain.

History/provenance scope: **U**, `6d0eb2c` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `6d0eb2c test(1000): verify 940/950 hero openings, journal, life disposal`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport, hasTouch: viewport.width === 390, isMobile: viewport.width === 390, storageState: { cookies: [], origins: [] }, serviceWorkers: 'block', })`; `test.skip( tier === 'high' && !!process.env.CI, 'reason: software-GL hosted runners cannot sustain the frame counts; covered by local full e2e', )`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1000 Journal site count excludes nested About the site entries** — keeps .jr-nav-item.is-site; full list in contract; **0.3s M**; captures **0/0/0**; bug **U `6d0eb2c`**; contract [A145](#a145).
- **1000 1600x900 › great-blue-hole low: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 1600x900 › monterey-canyon low: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 1600x900 › challenger-deep low: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **205.6s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147).
- **1000 1600x900 › endurance low: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **84.2s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147).
- **1000 1600x900 › great-blue-hole medium: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 1600x900 › monterey-canyon medium: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 1600x900 › challenger-deep medium: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **218.2s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147).
- **1000 1600x900 › endurance medium: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **161.4s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147).
- **1000 1600x900 › great-blue-hole high: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 1600x900 › monterey-canyon high: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 1600x900 › challenger-deep high: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **603.2s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147); hosted body-time skip.
- **1000 1600x900 › endurance high: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **603.8s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147); hosted body-time skip.
- **1000 390x844 › great-blue-hole low: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 390x844 › monterey-canyon low: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 390x844 › challenger-deep low: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **76.9s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147).
- **1000 390x844 › endurance low: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **85s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147).
- **1000 390x844 › great-blue-hole medium: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 390x844 › monterey-canyon medium: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 390x844 › challenger-deep medium: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **128.3s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147).
- **1000 390x844 › endurance medium: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **50.4s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147).
- **1000 390x844 › great-blue-hole high: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 390x844 › monterey-canyon high: approach, first scan, Journal and debrief** — keeps .jr-body, .mission-debrief .debrief-highlight, state.clearance, state.floor; full list in contract; **45s F**; captures **2/0/0**; bug **U `6d0eb2c`**; contract [A146](#a146).
- **1000 390x844 › challenger-deep high: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **602.8s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147); hosted body-time skip.
- **1000 390x844 › endurance high: first minute, one Journal tag and life=0** — keeps state.elapsedMs, state.clearance, state.floor, state.breached; full list in contract; **602.3s M**; captures **3/0/0**; bug **U `6d0eb2c`**; contract [A147](#a147); hosted body-time skip.

<a id="a145"></a>

**Contract A145 (f-verify-1000.spec.ts:L43)** — '1000 Journal site count excludes nested About the site entries'.

Scope: `const entries of [2, 3, 4]`.

- `expect(page.locator('.jr-nav-item.is-site')).toHaveCount(13 + entries)`
- `expect(page.locator(journalSites)).toHaveCount(13)`
- `expect( await page .locator(journalSites) .evaluateAll((buttons) => buttons.map((button) => (button as HTMLElement).dataset.target)), ).toEqual(catalog.landmarks)`

<a id="a146"></a>

**Contract A146 (f-verify-1000.spec.ts:L106)** — `${site} ${tier}: approach, first scan, Journal and debrief`.

Row expansion: `const viewport of [ { width: 1600, height: 900 }, { width: 390, height: 844 }, ]`; `const tier of ['low', 'medium', 'high']`; `const [site, objective, poi, name, subject] of [ [ 'great-blue-hole', 'stalactites', 'great-blue-hole-stalactites', 'Stalactite gallery', 'stalactite galleries', ], [ 'monterey-canyon', 'canyon-wall', 'monterey-canyon-wall', 'North canyon wall', 'north wall', ], ]`.

Navigation: ``page.goto(`/?mission=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42`)``.

- `expect(start.first).toBe(objective)`
- `expect(state.clearance).toBeGreaterThanOrEqual(state.floor - 1e-6)`
- `expect(complete, 'scan completes in at most two minutes of game frames').toBe(true)`
- `expect(transit).toBeGreaterThan(50)`
- `expect(transit).toBeLessThan(300)`
- `expect(await journalSiteRows(page)).toHaveCount(13)`
- `expect(page.locator('.jr-body')).toContainText(subject)`
- `expect(page.locator('.mission-debrief .debrief-highlight')).toContainText(name)`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [journalContents](#helpers-journal-ts-16-journalcontents).

<a id="a147"></a>

**Contract A147 (f-verify-1000.spec.ts:L202)** — `${site} ${tier}: first minute, one Journal tag and life=0`.

Row expansion: `const viewport of [ { width: 1600, height: 900 }, { width: 390, height: 844 }, ]`; `const tier of ['low', 'medium', 'high']`; `const [site, species, expectedCount] of [ ['challenger-deep', 'hadal-amphipod', tier === 'low' ? 12 : 18], ['endurance', 'anemone', tier === 'low' ? 5 : 8], ] as const`.

Navigation: `page.goto(url)`; ``page.goto(`${url}&life=0`)``.

- `expect(count).toBeGreaterThanOrEqual(expectedCount)`
- `expect(samples).toHaveLength(600)`

Scope: `const [index, state] of samples.entries()`.

- `expect(state.elapsedMs).toBe((index + 1) * 100)`
- `expect(state.clearance).toBeGreaterThanOrEqual(state.floor - 1e-6)`
- `expect(state.breached).toBe(false)`

Scope: unconditional in this body.

- `expect(await journalSiteRows(page)).toHaveCount(13)`
- `expect(tags).toHaveCount(1)`
- `expect(tags).toHaveText('Game addition')`
- `expect(disabled).toEqual({ life: null, targets: 0 })`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [journalContents](#helpers-journal-ts-16-journalcontents), [openJournalCategory](#helpers-journal-ts-84-openjournalcategory).

Helper call bindings: `openJournalCategory(page, site, 'life')`.

### [f-verify-520.spec.ts](../../tests/e2e/f-verify-520.spec.ts) — opening framing

2 expanded cases; sum of assigned weights **49.6s**, 0 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `83bab2b` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `83bab2b test(520): daily-card loading race, 844x390 capture persistence, perf budget tooling`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, storageState: { cookies: [], origins: [] }, })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **lost-city: Low opening at 844×390 retains lighting and renders without console errors** — keeps opening.mode, opening.tier, opening.props.failed, opening.props.skipped, opening.props.full, opening.ambient; full list in contract; **24.8s M**; captures **1/0/0**; bug **U `83bab2b`**; contract [A148](#a148).
- **beebe-vent-field: Low opening at 844×390 retains lighting and renders without console errors** — keeps opening.mode, opening.tier, opening.props.failed, opening.props.skipped, opening.props.full, opening.ambient; full list in contract; **24.8s M**; captures **1/0/0**; bug **U `83bab2b`**; contract [A148](#a148).

<a id="a148"></a>

**Contract A148 (f-verify-520.spec.ts:L42)** — `${site.id}: Low opening at 844×390 retains lighting and renders without console errors`.

Row expansion: `const site of [ { id: 'lost-city', hero: 'poseidon-tower', minAmbient: 12, minFloor: 2.5 }, { id: 'beebe-vent-field', hero: 'beebe-chimney-1', minAmbient: 6, minFloor: 0.1 }, ]`.

Navigation: ``page.goto(`/?tile=${site.id}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, { waitUntil: 'domcontentloaded', })``.

- `expect(opening.mode).toBe('arcade')`
- `expect(opening.tier).toBe('low')`
- `expect(opening.props.failed).toBe(0)`
- `expect(opening.props.skipped).toBe(0)`
- `expect(opening.props.full).toBeGreaterThan(0)`
- `expect(opening.ambient).toBeGreaterThanOrEqual(site.minAmbient)`

Scope: `const floor of opening.floorProxies`.

- `expect(floor).toBeGreaterThanOrEqual(site.minFloor)`

Scope: unconditional in this body.

- `expect(opening.draws).toBeGreaterThan(0)`
- `expect(opening.draws).toBeLessThanOrEqual(1500)`
- `expect(opening.triangles).toBeGreaterThan(10_000)`
- `expect(opening.triangles).toBeLessThanOrEqual(1_500_000)`
- `expect(errors).toEqual([])`

Failure guards: ``throw new Error(`Missing hero: ${heroId}`);``.

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game | undefined; return ( window.__gameReady && g?.props.loaded && g.presets.entered && g.discovery.loaded && g.explore.ready && g.life ); })`.

### [f-verify-530.spec.ts](../../tests/e2e/f-verify-530.spec.ts) — opening framing

6 expanded cases; sum of assigned weights **202.8s**, 0 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: Snow count/maxSize overlap650 but1280×800 versus650 layouts differ; O10 keeps both routes/fill/floor/material.

History/provenance scope: **U**, `4f6351a` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `4f6351a feat(580): credits panel placement, license link hit fix, verify-530 specs`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **530 Titanic tile low: first-frame fill and permanent snow survive the merge** — keeps opening.fill, opening.ambient, opening.floor.every, opening.snowCount, opening.snowVisible, opening.opacity; full list in contract; **19.3s M**; captures **2/0/0**; bug **U `4f6351a`**; contract [A149](#a149).
- **530 Titanic mission low: first-frame fill and permanent snow survive the merge** — keeps opening.fill, opening.ambient, opening.floor.every, opening.snowCount, opening.snowVisible, opening.opacity; full list in contract; **14.8s M**; captures **2/0/0**; bug **U `4f6351a`**; contract [A149](#a149).
- **530 Titanic tile medium: first-frame fill and permanent snow survive the merge** — keeps opening.fill, opening.ambient, opening.floor.every, opening.snowCount, opening.snowVisible, opening.opacity; full list in contract; **23.7s M**; captures **2/0/0**; bug **U `4f6351a`**; contract [A149](#a149).
- **530 Titanic mission medium: first-frame fill and permanent snow survive the merge** — keeps opening.fill, opening.ambient, opening.floor.every, opening.snowCount, opening.snowVisible, opening.opacity; full list in contract; **24.7s M**; captures **2/0/0**; bug **U `4f6351a`**; contract [A149](#a149).
- **530 Titanic tile high: first-frame fill and permanent snow survive the merge** — keeps opening.fill, opening.ambient, opening.floor.every, opening.snowCount, opening.snowVisible, opening.opacity; full list in contract; **53.6s M**; captures **2/0/0**; bug **U `4f6351a`**; contract [A149](#a149).
- **530 Titanic mission high: first-frame fill and permanent snow survive the merge** — keeps opening.fill, opening.ambient, opening.floor.every, opening.snowCount, opening.snowVisible, opening.opacity; full list in contract; **66.7s M**; captures **2/0/0**; bug **U `4f6351a`**; contract [A149](#a149).

<a id="a149"></a>

**Contract A149 (f-verify-530.spec.ts:L24)** — `530 Titanic ${route} ${tier}: first-frame fill and permanent snow survive the merge`.

Row expansion: `const tier of ['low', 'medium', 'high']`; `const route of ['tile', 'mission']`.

Navigation: ``page.goto(`/?${route}=titanic&skipBriefing=1&tutorial=0&tier=${tier}`)``.

- `expect(opening.fill).toBeGreaterThanOrEqual(24)`
- `expect(opening.ambient).toBeGreaterThanOrEqual(24)`
- `expect(opening.floor.every((value) => value >= 0.1)).toBe(true)`
- `expect(opening.snowCount).toBe(tier === 'low' ? 300 : tier === 'medium' ? 1200 : 3000)`
- `expect(opening.snowVisible).toBe(true)`
- `expect(opening.opacity).toBeGreaterThan(0)`
- `expect(opening.density).toBeGreaterThan(0)`
- `expect(opening.foregroundAlpha).toBeGreaterThan(0)`
- `expect(opening.maxSize).toBe(3)`

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as TitanicGame | undefined; return window.__gameReady === true && g?.props.loaded && g.presets.entered; })`.

### [f-verify-610.spec.ts](../../tests/e2e/f-verify-610.spec.ts) — opening framing

5 expanded cases; sum of assigned weights **69.4s**, 0 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `3ce5b87` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `3ce5b87 wip(610-f-verify-pitch-phone): Codex result, gates per .cache/codex/610-f-verify-pitch-phone-result.md`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, storageState: { cookies: [], origins: [] }, serviceWorkers: 'block', })`.

Selector/fixture constants: `sites = ['titanic', 'lost-city', 'great-blue-hole', 'beebe-vent-field', 'monterey-canyon']`; `hudSelectors = [ '.sonar', '.hud-readouts', '.hud-warning', '.hud-notice', '.hud-objective', '.hud-prompt', '.hud-control-tips', '.objectives-panel', '.scan-panel', '.onboard-card', '.onboard-hint', '.explore-caption', '.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause', '.tc-rotate-hint', ]`; `requiredHud = [ '.sonar', '.hud-readouts', '.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **F-VERIFY-610 portrait Low opening pitch › titanic: sub and HUD remain fully visible after 3 s** — keeps opening.viewport, opening.touch, opening.mode, opening.tier, opening.view, opening.hullVisible; full list in contract; **9.8s M**; captures **1/0/0**; bug **U `3ce5b87`**; contract [A150](#a150).
- **F-VERIFY-610 portrait Low opening pitch › lost-city: sub and HUD remain fully visible after 3 s** — keeps opening.viewport, opening.touch, opening.mode, opening.tier, opening.view, opening.hullVisible; full list in contract; **12.4s M**; captures **1/0/0**; bug **U `3ce5b87`**; contract [A150](#a150).
- **F-VERIFY-610 portrait Low opening pitch › great-blue-hole: sub and HUD remain fully visible after 3 s** — keeps opening.viewport, opening.touch, opening.mode, opening.tier, opening.view, opening.hullVisible; full list in contract; **17.8s M**; captures **1/0/0**; bug **U `3ce5b87`**; contract [A150](#a150).
- **F-VERIFY-610 portrait Low opening pitch › beebe-vent-field: sub and HUD remain fully visible after 3 s** — keeps opening.viewport, opening.touch, opening.mode, opening.tier, opening.view, opening.hullVisible; full list in contract; **10.4s M**; captures **1/0/0**; bug **U `3ce5b87`**; contract [A150](#a150).
- **F-VERIFY-610 portrait Low opening pitch › monterey-canyon: sub and HUD remain fully visible after 3 s** — keeps opening.viewport, opening.touch, opening.mode, opening.tier, opening.view, opening.hullVisible; full list in contract; **19s M**; captures **1/0/0**; bug **U `3ce5b87`**; contract [A150](#a150).

<a id="a150"></a>

**Contract A150 (f-verify-610.spec.ts:L77)** — `${site}: sub and HUD remain fully visible after 3 s`.

Row expansion: `const site of sites`.

Navigation: ``page.goto(`/?tile=${site}&tier=low&dynres=0&tutorial=0&lifeSeed=42`, { waitUntil: 'domcontentloaded', })``.

- `expect.soft(errors).toEqual([])`
- `expect.soft(opening.viewport).toEqual({ width: 390, height: 844 })`
- `expect.soft(opening.touch).toBe(true)`
- `expect.soft(opening.mode).toBe('arcade')`
- `expect.soft(opening.tier).toBe('low')`
- `expect.soft(opening.view).toBe('chase')`
- `expect.soft(opening.hullVisible).toBe(true)`
- `expect.soft(opening.props.failed).toBe(0)`
- `expect.soft(opening.props.skipped).toBe(0)`
- `expect.soft(opening.draws).toBeGreaterThan(0)`
- `expect.soft(opening.depth.min, 'hull is beyond the near plane').toBeGreaterThan(-1)`
- `expect.soft(opening.depth.max, 'hull is inside the far plane').toBeLessThan(1)`
- `expect.soft(opening.hull.width).toBeGreaterThan(0)`
- `expect.soft(opening.hull.height).toBeGreaterThan(0)`

Scope: `const selector of requiredHud`.

- ``expect .soft( opening.hud.some((panel) => panel.selector === selector), `${selector} is visible`, ) .toBe(true)``

Scope: `const box of [{ selector: 'sub hull', ...opening.hull }, ...opening.hud]`.

- ``expect.soft(box.x, `${box.selector} left`).toBeGreaterThanOrEqual(0)``
- ``expect.soft(box.y, `${box.selector} top`).toBeGreaterThanOrEqual(0)``
- ``expect.soft(box.x + box.width, `${box.selector} right`).toBeLessThanOrEqual(390)``
- ``expect.soft(box.y + box.height, `${box.selector} bottom`).toBeLessThanOrEqual(844)``

Scope: `const panel of opening.hud`.

- ``expect .soft(overlaps(opening.hull, panel), `sub hull overlaps ${panel.selector}`) .toBe(false)``

Scope: `let i = 0; i < opening.hud.length; const b of opening.hud.slice(i + 1)`.

- ``expect.soft(overlaps(a, b), `${a.selector} overlaps ${b.selector}`).toBe(false)``

Failure guards: `throw new Error('No visible hull geometry to project');`.

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game | undefined; return ( window.__gameReady && g?.props.loaded && g.discovery.loaded && g.presets.entered && g.explore.ready ); })`.

### [f-verify-650.spec.ts](../../tests/e2e/f-verify-650.spec.ts) — opening framing

18 expanded cases; sum of assigned weights **432.0s**, 0 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `bf6d5f7` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `bf6d5f7 wip(650-f-verify-f27-merges): Codex result, gates per .cache/codex/650-f-verify-f27-merges-result.md`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: layout, hasTouch: layout.touch, isMobile: layout.touch, deviceScaleFactor: 1, })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **650 merges 1600×900 › titanic low: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **25.3s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 1600×900 › beebe-vent-field low: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **33.6s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 1600×900 › monterey-canyon low: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **43.6s M**; captures **1/0/0 (+1 if Monterey baseline supplied)**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 1600×900 › titanic medium: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **30.6s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 1600×900 › beebe-vent-field medium: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **47.9s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 1600×900 › monterey-canyon medium: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **75.6s M**; captures **1/0/0 (+1 if Monterey baseline supplied)**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 844×390 › titanic low: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **11.6s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 844×390 › beebe-vent-field low: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **14.5s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 844×390 › monterey-canyon low: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **17.3s M**; captures **1/0/0 (+1 if Monterey baseline supplied)**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 844×390 › titanic medium: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **14.3s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 844×390 › beebe-vent-field medium: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **11.4s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 844×390 › monterey-canyon medium: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **24s M**; captures **1/0/0 (+1 if Monterey baseline supplied)**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 360×640 › titanic low: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **6.4s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 360×640 › beebe-vent-field low: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **10.2s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 360×640 › monterey-canyon low: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **19.6s M**; captures **1/0/0 (+1 if Monterey baseline supplied)**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 360×640 › titanic medium: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **10.2s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 360×640 › beebe-vent-field medium: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **15s M**; captures **1/0/0**; bug **U `bf6d5f7`**; contract [A151](#a151).
- **650 merges 360×640 › monterey-canyon medium: opening intent and rendered work** — keeps canvas, .scan-reticle, snow.visible, snow.count, snow.opacity, snow.maxSize; full list in contract; **20.9s M**; captures **1/0/0 (+1 if Monterey baseline supplied)**; bug **U `bf6d5f7`**; contract [A151](#a151).

<a id="a151"></a>

**Contract A151 (f-verify-650.spec.ts:L79)** — `${site} ${tier}: opening intent and rendered work`.

Row expansion: `const layout of [ { width: 1600, height: 900, touch: false }, { width: 844, height: 390, touch: true }, { width: 360, height: 640, touch: true }, ]`; `const tier of ['low', 'medium']`; `const site of ['titanic', 'beebe-vent-field', 'monterey-canyon']`.

- `expect(page.locator('canvas').first()).toBeVisible()`
- `expect(current.tier).toBe(tier)`
- `expect(current.drawCalls).toBeGreaterThan(0)`
- `expect(current.triangles).toBeGreaterThan(10_000)`

Scope: `if baseline`.

- `expect(current.drawCalls).toBeLessThanOrEqual(baseline.drawCalls)`
- `expect(current.triangles).toBeLessThanOrEqual(baseline.triangles)`

Scope: `if site === 'titanic'`.

- `expect(snow.visible).toBe(true)`
- `expect(snow.count).toBe(tier === 'low' ? 300 : 1200)`
- `expect(snow.opacity).toBe(0.24)`
- `expect(snow.maxSize).toBe(3)`
- `expect(snow.density).toBeGreaterThan(0)`

Scope: `if site === 'beebe-vent-field'`.

- `expect(page.locator('.scan-reticle')).toBeVisible()`
- `expect(framing.clear, JSON.stringify(framing)).toBe(true)`
- `expect(framing.bounds.left).toBeGreaterThanOrEqual(0)`
- `expect(framing.bounds.top).toBeGreaterThanOrEqual(0)`
- `expect(framing.bounds.right).toBeLessThanOrEqual(framing.width)`
- `expect(framing.bounds.bottom).toBeLessThanOrEqual(framing.height)`

Scope: `if site === 'monterey-canyon'`.

- `expect(rocks.count).toBe(tier === 'low' ? 0 : 384)`
- `expect(rocks.buried).toBe(0)`

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Helper guard closure: [opening](#f-verify-650-spec-ts-30-opening).

Helper call bindings: `opening(page, site, tier, layout.touch, baselineURL.replace(/\/$/, ''))`; `opening(page, site, tier, layout.touch)`.

### [f-verify-740.spec.ts](../../tests/e2e/f-verify-740.spec.ts) — Journal/debrief

8 expanded cases; sum of assigned weights **132.5s**, 0 fallback keys. Disposition: **fold → journal-debrief.spec.ts**.

Overlap: Summary/Journal tags overlap1060 only as fragments; J8 all13×2 provenance survives; HUD surface rows carry intoHUD with Skip-toast guard.

History/provenance scope: **R**, `7ac82b5` — Skip tutorial failed to fire completion toast; copy/Journal tags also guarded. Origin: `7ac82b5 fix(740): tutorial Skip fires completion toast; journal/copy regression tests`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch, isMobile: layout.touch, deviceScaleFactor: 1, storageState: { cookies: [], origins: [] }, serviceWorkers: 'block', })`; `test.use({ viewport: { width: layout.width, height: layout.height }, hasTouch: layout.touch, isMobile: layout.touch, storageState: { cookies: [], origins: [] }, serviceWorkers: 'block', })`.

Selector/fixture constants: `panels = [ '.sonar', '.objectives-panel', '.hud-readouts', '.hud-warning', '.hud-notice', '.hud-objective', '.hud-prompt', '.hud-control-tips', '.hud-reset-camera', '.scan-panel', '.onboard-card', '.onboard-hint', '.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause', '.tc-rotate-hint', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **740 Surface 1280x800 › arcade: Blue Hole Surface HUD, scan card and hints stay separate** — keeps .briefing, .hud-power, .hud-current, .onboard-card, .onboard-hint, .scan-panel; full list in contract; **23.8s M**; captures **2/0/0**; bug **R `7ac82b5`**; contract [A152](#a152).
- **740 Surface 1280x800 › realistic: Blue Hole Surface HUD, scan card and hints stay separate** — keeps .briefing, .hud-power, .hud-current, .onboard-card, .onboard-hint, .scan-panel; full list in contract; **19.9s M**; captures **2/0/0**; bug **R `7ac82b5`**; contract [A152](#a152).
- **740 Surface 390x844 › arcade: Blue Hole Surface HUD, scan card and hints stay separate** — keeps .briefing, .hud-power, .hud-current, .onboard-card, .onboard-hint, .scan-panel; full list in contract; **12.9s M**; captures **2/0/0**; bug **R `7ac82b5`**; contract [A152](#a152).
- **740 Surface 390x844 › realistic: Blue Hole Surface HUD, scan card and hints stay separate** — keeps .briefing, .hud-power, .hud-current, .onboard-card, .onboard-hint, .scan-panel; full list in contract; **16.5s M**; captures **2/0/0**; bug **R `7ac82b5`**; contract [A152](#a152).
- **740 Surface 844x390 › arcade: Blue Hole Surface HUD, scan card and hints stay separate** — keeps .briefing, .hud-power, .hud-current, .onboard-card, .onboard-hint, .scan-panel; full list in contract; **10.7s M**; captures **2/0/0**; bug **R `7ac82b5`**; contract [A152](#a152).
- **740 Surface 844x390 › realistic: Blue Hole Surface HUD, scan card and hints stay separate** — keeps .briefing, .hud-power, .hud-current, .onboard-card, .onboard-hint, .scan-panel; full list in contract; **20.4s M**; captures **2/0/0**; bug **R `7ac82b5`**; contract [A152](#a152).
- **740 Journal 1280x800 › all thirteen sites give secrets and staged wildlife exactly one addition tag** — keeps .jr-site-card, .jr-honesty, .jr-body .jr-para, .jr-body, .jr-sources a; full list in contract; **11.6s M**; captures **1/0/0**; bug **R `7ac82b5`**; contract [A153](#a153).
- **740 Journal 390x844 › all thirteen sites give secrets and staged wildlife exactly one addition tag** — keeps .jr-site-card, .jr-honesty, .jr-body .jr-para, .jr-body, .jr-sources a; full list in contract; **16.7s M**; captures **1/0/0**; bug **R `7ac82b5`**; contract [A153](#a153).

<a id="a152"></a>

**Contract A152 (f-verify-740.spec.ts:L75)** — `${mode}: Blue Hole Surface HUD, scan card and hints stay separate`.

Row expansion: `const layout of [ { width: 1280, height: 800, touch: false }, { width: 390, height: 844, touch: true }, // The original dropped 590 failure was at this short-landscape breakpoint. { width: 844, height: 390, touch: true }, ]`; `const mode of ['arcade', 'realistic'] as const`.

Navigation: `page.goto('/?mission=great-blue-hole&tier=low&dynres=0&tutorial=0&lifeSeed=42', { waitUntil: 'domcontentloaded', })`; `page.goto('/?mission=great-blue-hole&tier=low&dynres=0&tutorial=1&lifeSeed=42', { waitUntil: 'domcontentloaded', })`.

- `expect( await page.evaluate(() => (window.__game as unknown as Game).save.get().gameplayMode), ).toBe(mode)`
- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(surface.start).toBe('surface')`
- `expect(surface.y).toBeGreaterThan(-20)`
- `expect(surface.y).toBeLessThanOrEqual(-surface.radius + 1)`

Scope: `const selector of [ '.sonar', '.objectives-panel', '.hud-readouts', ...(layout.touch ? ['.tc-stick', '.tc-slider', '.tc-buttons', '.tc-btn-pause'] : []), ]`.

- `expect(page.locator(selector)).toBeVisible()`

Scope: `if mode === 'realistic'`.

- `expect(page.locator('.hud-power')).toBeVisible()`
- `expect(page.locator('.hud-current')).toBeVisible()`

Scope: unconditional in this body.

- `expect.soft(errors).toEqual([])`

Scope: `const b of boxes`.

- ``expect.soft(b.left, `${b.selector} left`).toBeGreaterThanOrEqual(0)``
- ``expect.soft(b.top, `${b.selector} top`).toBeGreaterThanOrEqual(0)``
- ``expect.soft(b.right, `${b.selector} right`).toBeLessThanOrEqual(layout.width)``
- ``expect.soft(b.bottom, `${b.selector} bottom`).toBeLessThanOrEqual(layout.height)``
- ``expect.soft(b.clips, `${b.selector} clips text`).toBe(false)``

Scope: `let i = 0; i < boxes.length; const b of boxes.slice(i + 1)`.

- ``expect .soft( a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom, `${a.selector} overlaps ${b.selector}: ${JSON.stringify([a, b])}`, ) .toBe(false)``

Scope: unconditional in this body.

- `expect(page.locator('.onboard-card')).toBeVisible()`
- `expect(page.locator('.onboard-card')).toBeHidden()`
- `expect(page.locator('.onboard-hint')).toContainText('Nice work.')`
- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).sub.position.y), ).toBeGreaterThan(-20)`

Failure guards: `throw new Error('No authored contact for the Surface stress case');`.

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [auditSurface](#f-verify-740-spec-ts-130-auditsurface), [dismissTutorial](#helpers-tutorial-ts-4-dismisstutorial).

Helper call bindings: `clockFramesUntil(page, () => { const g = window.__game as unknown as Game | undefined; return !!(window.__gameReady && g?.discovery.loaded && g.props.loaded && g.explore.ready); })`; `auditSurface('surface')`; `dismissTutorial(page, layout.touch, true)`; `auditSurface('surface-card-and-toast')`.

<a id="a153"></a>

**Contract A153 (f-verify-740.spec.ts:L237)** — 'all thirteen sites give secrets and staged wildlife exactly one addition tag'.

Row expansion: `const layout of [ { width: 1280, height: 800, touch: false }, { width: 390, height: 844, touch: true }, ]`.

Navigation: `page.goto('/?tier=low', { waitUntil: 'domcontentloaded' })`.

- `expect(page.locator('.jr-site-card')).toHaveCount(13)`
- `expect(page.locator('.jr-honesty')).toContainText('real survey data')`

Scope: `const site of catalog.landmarks; const kind of ['life', 'secret']`.

- `expect(entry).toBeVisible()`
- `expect(tag).toHaveCount(1)`
- `expect(tag).toHaveText('Game addition')`
- `expect(page.locator('.jr-body .jr-para').first()).toBeVisible()`
- `expect(page.locator('.jr-body')).not.toContainText( /\b(?:illustrative|reconstructed|recreations?)\b/i, )`
- `expect(await title.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true)`

Scope: `const site of catalog.landmarks; const kind of ['life', 'secret']; if kind === 'life'`.

- `expect(page.locator('.jr-sources a').first()).toHaveAttribute( 'href', /^https?:\/\//, )`

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [journalContents](#helpers-journal-ts-16-journalcontents), [openJournalCategory](#helpers-journal-ts-84-openjournalcategory).

Helper call bindings: `openJournalCategory(page, site, kind)`.

### [f-verify-920.spec.ts](../../tests/e2e/f-verify-920.spec.ts) — rendering/visual

6 expanded cases; sum of assigned weights **421.9s**, 0 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `22bda86` — carved-site physics height disagreed with rendered terrain; Monterey/Blue Hole direct mesh verification. Origin: `22bda86 fix: carved-site physics sample near mesh; Monterey free-dive range 16 (920 verification)`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **920 monterey-canyon low: rendered carve and depth agree** — keeps `920 ${site} ${tier}: rendered carve and depth agree`; full list in contract; **32.2s M**; captures **2/0/0**; bug **R `22bda86`**; contract [A154](#a154).
- **920 monterey-canyon medium: rendered carve and depth agree** — keeps `920 ${site} ${tier}: rendered carve and depth agree`; full list in contract; **60.3s M**; captures **2/0/0**; bug **R `22bda86`**; contract [A154](#a154).
- **920 monterey-canyon high: rendered carve and depth agree** — keeps `920 ${site} ${tier}: rendered carve and depth agree`; full list in contract; **174.6s M**; captures **2/0/0**; bug **R `22bda86`**; contract [A154](#a154).
- **920 great-blue-hole low: rendered carve and depth agree** — keeps `920 ${site} ${tier}: rendered carve and depth agree`; full list in contract; **34.5s M**; captures **2/0/0**; bug **R `22bda86`**; contract [A154](#a154).
- **920 great-blue-hole medium: rendered carve and depth agree** — keeps `920 ${site} ${tier}: rendered carve and depth agree`; full list in contract; **42.7s M**; captures **2/0/0**; bug **R `22bda86`**; contract [A154](#a154).
- **920 great-blue-hole high: rendered carve and depth agree** — keeps `920 ${site} ${tier}: rendered carve and depth agree`; full list in contract; **77.6s M**; captures **2/0/0**; bug **R `22bda86`**; contract [A154](#a154).

<a id="a154"></a>

**Contract A154 (f-verify-920.spec.ts:L17)** — `920 ${site} ${tier}: rendered carve and depth agree`.

Row expansion: `const site of ['monterey-canyon', 'great-blue-hole']`; `const tier of ['low', 'medium', 'high']`.

Navigation: ``page.goto(`/?tile=${site}&skipBriefing=1&tier=${tier}&dynres=0&lifeSeed=42`)``.

Scope: `const point of points`.

- `expect(Number.isFinite(measurement.meshY)).toBe(true)`
- `expect(Math.abs(measurement.collision - measurement.meshY)).toBeLessThan(0.002)`
- `expect(measurement.depth).toBe(measurement.y)`
- `expect(Math.abs(measurement.altitude - (measurement.y - measurement.meshY))).toBeLessThan( 0.002, )`
- `expect(measurement.cameraClearance).toBeGreaterThanOrEqual(5.998)`

Scope: unconditional in this body.

- `expect(Math.abs(central.survey - expected)).toBeLessThan(0.1)`
- `expect(Math.abs(central.meshY - expected)).toBeLessThan(site === 'monterey-canyon' ? 5 : 2)`
- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game; return window.__gameReady && g?.props.loaded && g.discovery.loaded; })`.

### [f-verify-hull-lostcity-1290.spec.ts](../../tests/e2e/f-verify-hull-lostcity-1290.spec.ts) — opening framing

12 expanded cases; sum of assigned weights **540.0s**, 12 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: Low1600×900 Endurance/Lost City budget fragments overlapperf-budget, with different settle/freeze; O8 keeps near-plane/actualtip,perf-budget keeps census/counter truth.

History/provenance scope: **U**, `985a1b1` — audit/verification guard; historical defect attribution not proved for this declaration. [1290 audit](1290-f-verify-hull-lostcity.md): actual fixed bug was Terrain.dispose cache retention, guarded by units; e2e opening assertions are verification, not proof of a reproduced collision. Origin: `985a1b1 verify(1290): Terrain.dispose clears height memo; cache and opening-clearance tests`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.touch, isMobile: viewport.touch, deviceScaleFactor: 1, serviceWorkers: 'block', storageState: { cookies: [], origins: [] }, })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1290 desktop › endurance low: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 desktop › endurance high: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 desktop › lost-city low: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 desktop › lost-city high: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 portrait › endurance low: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 portrait › endurance high: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 portrait › lost-city low: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 portrait › lost-city high: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 landscape › endurance low: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 landscape › endurance high: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 landscape › lost-city low: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).
- **1290 landscape › lost-city high: merged opening clears terrain and tower-tip HUD** — keeps opening.props.failed, opening.radius, opening.eyeClearance, opening.nearClearances, opening.calls, opening.triangles; full list in contract; **45s F**; captures **1/0/0**; bug **U `985a1b1`**; contract [A155](#a155).

<a id="a155"></a>

**Contract A155 (f-verify-hull-lostcity-1290.spec.ts:L36)** — `${site} ${tier}: merged opening clears terrain and tower-tip HUD`.

Row expansion: `const viewport of [ { name: 'desktop', width: 1600, height: 900, touch: false }, { name: 'portrait', width: 390, height: 844, touch: true }, { name: 'landscape', width: 844, height: 390, touch: true }, ]`; `const site of ['endurance', 'lost-city']`; `const tier of ['low', 'high']`.

Navigation: ``page.goto( `/?tile=${site}&tier=${tier}&tutorial=0&dynres=0&lifeSeed=42${viewport.touch ? '&touch=1' : ''}`, { waitUntil: 'domcontentloaded', }, )``.

- `expect(errors).toEqual([])`
- `expect(opening.props.failed).toBe(0)`
- `expect(opening.radius).toBe(site === 'endurance' ? 70 : 66)`
- `expect(opening.eyeClearance).toBeGreaterThanOrEqual(6 - 1e-8)`
- `expect(Math.min(...opening.nearClearances)).toBeGreaterThan(0)`

Scope: `if tier === 'low'`.

- `expect(opening.calls).toBeGreaterThan(0)`
- `expect(opening.triangles).toBeGreaterThan(10_000)`
- `expect(opening.calls).toBeLessThanOrEqual(1500)`
- `expect(opening.triangles).toBeLessThanOrEqual(1_500_000)`

Scope: `if opening.tip`.

- `expect(card.visible).toBe(true)`
- `expect(tip.z).toBeGreaterThan(-1)`
- `expect(tip.z).toBeLessThan(1)`
- `expect(tip.x).toBeGreaterThan(0)`
- `expect(tip.x).toBeLessThan(viewport.width)`
- `expect(tip.y).toBeGreaterThan(0)`
- `expect(tip.y).toBeLessThan(viewport.height)`
- `expect( tip.x < card.left - gap || tip.x > card.right + gap || tip.y < card.top - gap || tip.y > card.bottom + gap, 'actual carbonate tip clears the scan card by at least 8 CSS pixels', ).toBe(true)`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil(page, () => { const g = window.__game as unknown as Game; return !!( window.__gameReady && g.props.loaded && g.discovery.loaded && g.presets.entered ); })`.

### [f-verify-lander-firstdisc-1240.spec.ts](../../tests/e2e/f-verify-lander-firstdisc-1240.spec.ts) — onboarding

8 expanded cases; sum of assigned weights **360.0s**, 8 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `0b5681e` — audit/verification guard; historical defect attribution not proved for this declaration. [1240 note](1240-f-verify-lander-firstdisc.md): reproduced sustained-input timer and Pause→Journal defects; authored POI/Journal names legitimately differ. Origin: `0b5681e 1240-f-verify-lander-firstdisc: collect Codex package`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 720 }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, storageState: { cookies: [], origins: [] }, serviceWorkers: 'block', })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **1240 desktop › challenger-deep: scan reward names the POI and opens its authored Journal entry** — keeps .scan-name, .scan-kicker, .scan-hint, .journal .jr-body .jr-title, .journal .jr-body, result.scanned; full list in contract; **45s F**; captures **1/0/0**; bug **U `0b5681e`**; contract [A156](#a156).
- **1240 desktop › endurance: scan reward names the POI and opens its authored Journal entry** — keeps .scan-name, .scan-kicker, .scan-hint, .journal .jr-body .jr-title, .journal .jr-body, result.scanned; full list in contract; **45s F**; captures **1/0/0**; bug **U `0b5681e`**; contract [A156](#a156).
- **1240 desktop › titanic: scan reward names the POI and opens its authored Journal entry** — keeps .scan-name, .scan-kicker, .scan-hint, .journal .jr-body .jr-title, .journal .jr-body, result.scanned; full list in contract; **45s F**; captures **1/0/0**; bug **U `0b5681e`**; contract [A156](#a156).
- **1240 desktop › lost-city: scan reward names the POI and opens its authored Journal entry** — keeps .scan-name, .scan-kicker, .scan-hint, .journal .jr-body .jr-title, .journal .jr-body, result.scanned; full list in contract; **45s F**; captures **1/0/0**; bug **U `0b5681e`**; contract [A156](#a156).
- **1240 portrait touch › challenger-deep: scan reward names the POI and opens its authored Journal entry** — keeps .scan-name, .scan-kicker, .scan-hint, .journal .jr-body .jr-title, .journal .jr-body, result.scanned; full list in contract; **45s F**; captures **1/0/0**; bug **U `0b5681e`**; contract [A156](#a156).
- **1240 portrait touch › endurance: scan reward names the POI and opens its authored Journal entry** — keeps .scan-name, .scan-kicker, .scan-hint, .journal .jr-body .jr-title, .journal .jr-body, result.scanned; full list in contract; **45s F**; captures **1/0/0**; bug **U `0b5681e`**; contract [A156](#a156).
- **1240 portrait touch › titanic: scan reward names the POI and opens its authored Journal entry** — keeps .scan-name, .scan-kicker, .scan-hint, .journal .jr-body .jr-title, .journal .jr-body, result.scanned; full list in contract; **45s F**; captures **1/0/0**; bug **U `0b5681e`**; contract [A156](#a156).
- **1240 portrait touch › lost-city: scan reward names the POI and opens its authored Journal entry** — keeps .scan-name, .scan-kicker, .scan-hint, .journal .jr-body .jr-title, .journal .jr-body, result.scanned; full list in contract; **45s F**; captures **1/0/0**; bug **U `0b5681e`**; contract [A156](#a156).

<a id="a156"></a>

**Contract A156 (f-verify-lander-firstdisc-1240.spec.ts:L51)** — `${site.id}: scan reward names the POI and opens its authored Journal entry`.

Row expansion: `const touch of [false, true]`; `const site of [ { id: 'challenger-deep', poi: 'cd-leggo-amphipod-site', opening: true }, { id: 'endurance', poi: 'endurance-hull', opening: true }, { id: 'titanic', poi: 'titanic-bow', opening: false }, { id: 'lost-city', poi: 'lost-city-poseidon', opening: false }, ]`.

Navigation: ``page.goto( `/?tile=${site.id}&tier=low&dynres=0&lifeSeed=42&tutorial=${tutorial ? 1 : 0}${touch ? '&touch=1' : ''}${site.opening ? '' : `&poi=${site.poi}`}`, { waitUntil: 'domcontentloaded', }, )``.

- `expect(target.candidate).toBe(site.poi)`
- `expect(target.title).not.toBe(target.name)`
- `expect(page.locator('.scan-name')).toHaveText(target.name)`
- `expect(page.locator('.scan-kicker')).toHaveText('NEW ENTRY')`
- `expect(page.locator('.scan-name')).toHaveText(target.name)`
- `expect(page.locator('.scan-hint')).toHaveText( touch ? 'PAUSE → JOURNAL' : 'PRESS J · JOURNAL', )`
- `expect(result.scanned).toBe(site.poi)`
- `expect(result.calls).toBeGreaterThan(0)`
- `expect(result.calls).toBeLessThanOrEqual(1500)`
- `expect(result.triangles).toBeGreaterThan(10_000)`
- `expect(result.triangles).toBeLessThanOrEqual(1_500_000)`

Scope: `if tutorial`.

- `expect(result.step).toBe('move')`
- `expect( await page.evaluate( () => (window.__game as unknown as Game).discovery.scanner.view.completed, ), ).toBe(1)`

Scope: unconditional in this body.

- `expect(page.locator('.journal .jr-body .jr-title')).toHaveText(target.title)`
- `expect(page.locator('.journal .jr-body')).not.toContainText('Scan to unlock')`

Scope: `if tutorial`.

- `expect( await page.evaluate(() => (window.__game as unknown as Game).onboard.tutorial.finished), ).toBe(true)`
- `expect( await page.evaluate( () => JSON.parse(localStorage.getItem('subexplorer.onboard.v1')!).tutorialDone, ), ).toBe(true)`

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `clockFramesUntil(page, () => { const g = window.__game as unknown as Game; return ( window.__gameReady === true && g.props.loaded && g.discovery.loaded && g.discovery.scanner.view.candidateId !== null ); })`; `clockFramesUntil( page, () => (window.__game as unknown as Game).onboard.tutorial.step?.id === 'depth', 250, )`; `clockFramesUntil( page, () => (window.__game as unknown as Game).onboard.tutorial.step?.id === 'lights', 250, )`; `clockFramesUntil( page, () => (window.__game as unknown as Game).onboard.tutorial.step?.id === 'journal', )`; `clockFramesUntil( page, () => (window.__game as unknown as Game).discovery.guide.isOpen, )`.

### [f-visual-fixes.spec.ts](../../tests/e2e/f-visual-fixes.spec.ts) — opening framing

13 expanded cases; sum of assigned weights **714.1s**, 0 fallback keys. Disposition: **fold → opening-framing.spec.ts**.

Overlap: Chase underwater/error fragments overlapvisual-qa, but different pose/light policy. O9 survives; all safe40/15m checks stay ordinary.

History/provenance scope: **R**, `d21b854` — free-dive openings/chase camera above surface, headlight/exposure defects. Origin: `d21b854 F-VISUAL-FIXES: headlight beams, exposure, free-dive openings, chase camera below surface`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, storageState: { cookies: [], origins: [] }, })`.

Selector/fixture constants: `sites = [ { id: 'great-blue-hole', hero: 'karst-grotto', detail: true }, { id: 'hunga-tonga-caldera', hero: 'caldera-tuff-wall', detail: true }, { id: 'titanic', hero: 'bow-hull', detail: true }, { id: 'lost-city', hero: 'poseidon-tower', detail: true }, { id: 'endurance', hero: 'main-hull', detail: true }, { id: 'beebe-vent-field', hero: 'beebe-chimney-1', detail: true }, { id: 'blake-plateau-corals', hero: 'lophelia-mound', detail: true }, { id: 'challenger-deep', hero: 'leggo-lander-marker', detail: false }, { id: 'monterey-canyon', hero: 'canyon-wall-ledge', detail: false }, { id: 'hudson-canyon', hero: 'coral-ledge-mound', detail: false }, { id: 'axial-seamount-ashes', hero: 'mushroom-chimney', detail: false }, { id: 'kamaehuakanaloa', hero: 'hiolo-north-chimney-1', detail: false }, { id: 'bismarck', hero: 'main-hull', detail: false }, ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **F-VISUAL-FIXES composed openings and close lighting › great-blue-hole: underwater free-dive opening and 15 m detail** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **113.5s M**; captures **3/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › hunga-tonga-caldera: underwater free-dive opening and 15 m detail** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **73.1s M**; captures **3/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › titanic: underwater free-dive opening and 15 m detail** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **71.8s M**; captures **3/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › lost-city: underwater free-dive opening and 15 m detail** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **70.6s M**; captures **3/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › endurance: underwater free-dive opening and 15 m detail** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **91.8s M**; captures **3/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › beebe-vent-field: underwater free-dive opening and 15 m detail** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **58.8s M**; captures **3/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › blake-plateau-corals: underwater free-dive opening and 15 m detail** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **90.3s M**; captures **3/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › challenger-deep: underwater free-dive opening** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **16.9s M**; captures **1/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › monterey-canyon: underwater free-dive opening** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **33.2s M**; captures **1/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › hudson-canyon: underwater free-dive opening** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **24.3s M**; captures **1/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › axial-seamount-ashes: underwater free-dive opening** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **16s M**; captures **1/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › kamaehuakanaloa: underwater free-dive opening** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **31s M**; captures **1/0/0**; bug **R `d21b854`**; contract [A157](#a157).
- **F-VISUAL-FIXES composed openings and close lighting › bismarck: underwater free-dive opening** — keeps opening.facing).toBeGreaterThan(0.98); opening.collision).toBe(false); errors).toEqual([]); **22.8s M**; captures **1/0/0**; bug **R `d21b854`**; contract [A157](#a157).

<a id="a157"></a>

**Contract A157 (f-visual-fixes.spec.ts:L76)** — `${site.id}: underwater free-dive opening${site.detail ? ' and 15 m detail' : ''}`.

Row expansion: `const site of sites`.

Navigation: ``page.goto(`/?tile=${site.id}&skipBriefing=1`, { waitUntil: 'domcontentloaded' })``.

- `expect(opening.facing).toBeGreaterThan(0.98)`
- `expect(opening.collision).toBe(false)`
- `expect(errors).toEqual([])`

Failure guards: ``throw new Error(`No safe detail approach for ${heroId}`);``.

Readiness/temporal predicates: `page.waitForFunction(() => { const g = window.__game as unknown as Game | undefined; return window.__gameReady && g?.props.loaded && g.discovery.loaded; })`.

Helper guard closure: [assertUnderwater](#f-visual-fixes-spec-ts-50-assertunderwater).

Helper call bindings: `assertUnderwater(page)`.

### [f1-fixes.spec.ts](../../tests/e2e/f1-fixes.spec.ts) — rendering/visual

5 expanded cases; sum of assigned weights **393.1s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **R**, `3cc0104` — wall colliders followed wrong volume; exposure/output conversion and beams/site scale fixes; numeric assertion here only errors0. Origin: `b764675 wip(f1-fixes): billowing vent smoke`.

Selector/fixture constants: `CASES = [ { name: 'beebe', tile: 'beebe-vent-field', at: '18.54628,-81.71795', depth: 2240, tier: 'high' }, { name: 'lostcity', tile: 'lost-city', at: '30.1233,-42.1195', depth: 780, tier: 'high' }, { name: 'kama', tile: 'kamaehuakanaloa', at: '18.9122,-155.2677', depth: 1150, tier: 'high' }, { name: 'axial', tile: 'axial-seamount-ashes', at: '45.93385,-130.0139', depth: 1520, tier: 'high', }, ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **fixes beebe** — keeps errors).toEqual([]); **46.4s M**; captures **3/0/0**; bug **R `3cc0104`**; contract [A158](#a158).
- **fixes lostcity** — keeps errors).toEqual([]); **110.9s M**; captures **3/0/0**; bug **R `3cc0104`**; contract [A158](#a158).
- **fixes kama** — keeps errors).toEqual([]); **111.4s M**; captures **3/0/0**; bug **R `3cc0104`**; contract [A158](#a158).
- **fixes axial** — keeps errors).toEqual([]); **107s M**; captures **3/0/0**; bug **R `3cc0104`**; contract [A158](#a158).
- **rov lamps** — keeps errors).toEqual([]); **17.4s M**; captures **1/0/0**; bug **R `3cc0104`**; contract [A159](#a159).

<a id="a158"></a>

**Contract A158 (f1-fixes.spec.ts:L38)** — `fixes ${c.name}`.

Row expansion: `const c of CASES`.

Navigation: ``page.goto(`/?tile=${c.tile}&at=${c.at}&depth=${c.depth}&tier=${c.tier}`)``.

- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

<a id="a159"></a>

**Contract A159 (f1-fixes.spec.ts:L68)** — 'rov lamps'.

Navigation: `page.goto('/?tile=titanic&landmark=_test&poi=test-bow')`.

- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

### [f1-ocean.spec.ts](../../tests/e2e/f1-ocean.spec.ts) — rendering/visual

8 expanded cases; sum of assigned weights **243.7s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `6d3724b` — capability introduced here; no specific failed-before defect located. Origin: `6d3724b wip(F1-OCEAN): post stack, Snell lid, beams, snow`.

Selector/fixture constants: `CASES = [ { name: 'shallow', tile: 'monterey-canyon', depth: 12, tier: 'high' }, { name: 'mid', tile: 'monterey-canyon', depth: 150, tier: 'high' }, { name: 'deep', tile: 'titanic', depth: 3800, tier: 'high' }, { name: 'shallow', tile: 'monterey-canyon', depth: 12, tier: 'low' }, { name: 'mid', tile: 'monterey-canyon', depth: 150, tier: 'medium' }, { name: 'reef', tile: 'great-blue-hole', depth: 9, tier: 'high' }, { name: 'reef', tile: 'great-blue-hole', depth: 9, tier: 'low' }, { name: 'deep', tile: 'titanic', depth: 3800, tier: 'low' }, ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **ocean shallow on high** — keeps errors).toEqual([]); **49.7s M**; captures **2/0/0**; bug **F `6d3724b`**; contract [A160](#a160).
- **ocean mid on high** — keeps errors).toEqual([]); **24.2s M**; captures **1/0/0**; bug **F `6d3724b`**; contract [A160](#a160).
- **ocean deep on high** — keeps errors).toEqual([]); **58.7s M**; captures **2/0/0**; bug **F `6d3724b`**; contract [A160](#a160).
- **ocean shallow on low** — keeps errors).toEqual([]); **11.4s M**; captures **2/0/0**; bug **F `6d3724b`**; contract [A160](#a160).
- **ocean mid on medium** — keeps errors).toEqual([]); **18.4s M**; captures **1/0/0**; bug **F `6d3724b`**; contract [A160](#a160).
- **ocean reef on high** — keeps errors).toEqual([]); **49.9s M**; captures **2/0/0**; bug **F `6d3724b`**; contract [A160](#a160).
- **ocean reef on low** — keeps errors).toEqual([]); **19.4s M**; captures **2/0/0**; bug **F `6d3724b`**; contract [A160](#a160).
- **ocean deep on low** — keeps errors).toEqual([]); **12s M**; captures **2/0/0**; bug **F `6d3724b`**; contract [A160](#a160).

<a id="a160"></a>

**Contract A160 (f1-ocean.spec.ts:L35)** — `ocean ${c.name} on ${c.tier}`.

Row expansion: `const c of CASES`.

Navigation: ``page.goto(`/?tile=${c.tile}&depth=${c.depth}&tier=${c.tier}`)``.

- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

### [f1-terrain.spec.ts](../../tests/e2e/f1-terrain.spec.ts) — rendering/visual

12 expanded cases; sum of assigned weights **629.5s**, 0 fallback keys. Disposition: **split: numeric/functional guards ordinary; review captures nightly**.

Overlap: Only error/readiness assertions broadly resemble smoke; terrain close pose/tier matrix and review evidence remain; do not claim equivalent nonblank assertion.

History/provenance scope: **F**, `33f1f17` — capability introduced here; no specific failed-before defect located. Origin: `33f1f17 wip(f1-terrain): PBR triplanar seabed, biomes, near-field detail, instanced scatter`.

Selector/fixture constants: `SITES = [ { tile: 'titanic', x: -60, z: 120, alt: 8, yaw: 0.6 }, { tile: 'lost-city', x: 0, z: 0, alt: 8, yaw: 0.6 }, { tile: 'blake-plateau-corals', x: 0, z: 0, alt: 8, yaw: 0.6 }, { tile: 'great-blue-hole', x: 0, z: 0, alt: 8, yaw: 0.6 }, { tile: 'axial-seamount-ashes', x: 0, z: 0, alt: 8, yaw: 0.6 }, { tile: 'challenger-deep', x: 0, z: 0, alt: 8, yaw: 0.6 }, ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **terrain titanic low** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **23.3s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain titanic high** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **75.1s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain lost-city low** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **23.8s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain lost-city high** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **95.3s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain blake-plateau-corals low** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **34.6s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain blake-plateau-corals high** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **58.3s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain great-blue-hole low** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **45.9s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain great-blue-hole high** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **100.6s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain axial-seamount-ashes low** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **29.2s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain axial-seamount-ashes high** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **41.2s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain challenger-deep low** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **31.1s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).
- **terrain challenger-deep high** — keeps errors.filter((e) => !/favicon|404/.test(e))).toEqual([]); **71.1s M**; captures **2/0/0**; bug **F `33f1f17`**; contract [A161](#a161).

<a id="a161"></a>

**Contract A161 (f1-terrain.spec.ts:L41)** — `terrain ${s.tile} ${tier}`.

Row expansion: `const s of SITES.filter((x) => !only || x.tile === only)`; `const tier of tiers`.

Navigation: ``page.goto(`/?tile=${s.tile}&skipBriefing=1&tier=${tier}`)``.

- `expect(errors.filter((e) => !/favicon|404/.test(e))).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 60_000, })`.

### [f1-touch.spec.ts](../../tests/e2e/f1-touch.spec.ts) — HUD/touch layout

7 expanded cases; sum of assigned weights **180.8s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Fixture layout fragments inHUD table; keep actual axis movement/reset, input modality/PWA guards separately.

History/provenance scope: **F**, `b0bd5fb` — capability introduced here; no specific failed-before defect located. Origin: `b0bd5fb F1-TOUCH: touch controls, touch-friendly menus, PWA manifest and service worker`.

Profile/skip controls (variables expanded by rows below): `test.use({ ...phoneLandscape })`; `test.use({ ...phonePortrait })`; `test.use({ ...tablet })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **phone landscape › stick moves the sub, scan holds, pause opens by touch** — keeps .tc-root, .tc-stick, .pause-menu; full list in contract; **85.3s M**; captures **2/0/0**; bug **F `b0bd5fb`**; contract [A162](#a162).
- **phone landscape › pointer look is hidden on touch and menu buttons are at least 44px** — keeps .pause-menu; full list in contract; **21.4s M**; captures **0/0/0**; bug **F `b0bd5fb`**; contract [A163](#a163).
- **phone landscape › keyboard use hides the controls again** — keeps locator('.tc-root')).toBeVisible(); locator('.tc-root')).toBeHidden(); **10.6s M**; captures **0/0/0**; bug **F `b0bd5fb`**; contract [A164](#a164).
- **phone portrait › controls show and the rotate hint yields to the scan/tutorial HUD** — keeps locator('.tc-stick')).toBeVisible(); locator('.scan-panel')).toBeVisible(); locator('.tc-rotate-hint')).toBeHidden(); **13.3s M**; captures **1/0/0**; bug **F `b0bd5fb`**; contract [A165](#a165).
- **tablet › landscape tablet layout** — keeps locator('.tc-stick')).toBeVisible(); locator('.tc-rotate-hint')).toBeHidden(); **30.9s M**; captures **1/0/0**; bug **F `b0bd5fb`**; contract [A166](#a166).
- **quality on devices › phone and tablet auto-detect low or medium, with dynamic resolution** — keeps ['low', 'medium']).toContain(perf.tier); perf.dynamicResolution).toBe(true); **12.4s M**; captures **0/0/0**; bug **F `b0bd5fb`**; contract [A167](#a167).
- **pwa › manifest is linked and the worker script is served** — keeps 'manifest is linked and the worker script is served'; full list in contract; **6.9s M**; captures **0/0/0**; bug **F `b0bd5fb`**; contract [A168](#a168).

<a id="a162"></a>

**Contract A162 (f1-touch.spec.ts:L65)** — 'stick moves the sub, scan holds, pause opens by touch'.

- `expect(page.locator('.tc-root')).toBeVisible()`
- `expect(page.locator('.tc-stick')).toBeVisible()`
- `expect .poll(async () => { const p = await subPos(page); return Math.hypot(p[0] - before[0], p[2] - before[2]); }) .toBeGreaterThan(0.2)`
- `expect(axis).toBeGreaterThan(0.8)`
- `expect(Math.hypot(after[0] - before[0], after[2] - before[2])).toBeGreaterThan(0.2)`
- `expect .poll(() => page.evaluate( () => (window.__game as { input: { touchAxes: { throttle: number } } }).input.touchAxes .throttle, ), ) .toBe(0)`
- `expect.poll(async () => Math.abs((await subPos(page))[1] - y0)).toBeGreaterThan(0.05)`
- `expect .poll(() => page.evaluate( () => (window.__game as { input: { touchAxes: { ballast: number } } }).input.touchAxes .ballast, ), ) .toBe(0)`
- `expect .poll(() => page.evaluate(() => (window.__game as { input: { touchHeld: Set<string> } }).input.touchHeld.has('scan'), ), ) .toBe(true)`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(page.locator('.tc-root')).toBeHidden()`

Failure guards: `throw new Error('no slider');`.

Helper guard closure: [boot](#f1-touch-spec-ts-19-boot), [centre](#f1-touch-spec-ts-32-centre), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `boot(page)`; `centre(page, '.tc-stick')`; `centre(page, '.tc-btn-scan')`.

<a id="a163"></a>

**Contract A163 (f1-touch.spec.ts:L146)** — 'pointer look is hidden on touch and menu buttons are at least 44px'.

- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(heights.length).toBeGreaterThan(0)`

Scope: `const h of heights`.

- `expect(h).toBeGreaterThanOrEqual(44)`

Scope: unconditional in this body.

- `expect(await page.evaluate(() => document.documentElement.classList.contains('is-touch'))).toBe( true, )`
- `expect( await page.evaluate( () => getComputedStyle(document.querySelector('.settings-pointer-lock') as Element).display, ), ).toBe('none')`

Helper guard closure: [boot](#f1-touch-spec-ts-19-boot).

Helper call bindings: `boot(page)`.

<a id="a164"></a>

**Contract A164 (f1-touch.spec.ts:L165)** — 'keyboard use hides the controls again'.

- `expect(page.locator('.tc-root')).toBeVisible()`
- `expect(page.locator('.tc-root')).toBeHidden()`

Helper guard closure: [boot](#f1-touch-spec-ts-19-boot).

Helper call bindings: `boot(page)`.

<a id="a165"></a>

**Contract A165 (f1-touch.spec.ts:L176)** — 'controls show and the rotate hint yields to the scan/tutorial HUD'.

- `expect(page.locator('.tc-stick')).toBeVisible()`
- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(page.locator('.tc-rotate-hint')).toBeHidden()`

Helper guard closure: [boot](#f1-touch-spec-ts-19-boot).

Helper call bindings: `boot(page)`.

<a id="a166"></a>

**Contract A166 (f1-touch.spec.ts:L188)** — 'landscape tablet layout'.

- `expect(page.locator('.tc-stick')).toBeVisible()`
- `expect(page.locator('.tc-rotate-hint')).toBeHidden()`

Helper guard closure: [boot](#f1-touch-spec-ts-19-boot).

Helper call bindings: `boot(page)`.

<a id="a167"></a>

**Contract A167 (f1-touch.spec.ts:L197)** — 'phone and tablet auto-detect low or medium, with dynamic resolution'.

Navigation: `page.goto('/?tile=titanic&landmark=_test&skipBriefing=1&tier=auto', { waitUntil: 'domcontentloaded', })`.

Scope: `const d of [phoneLandscape, tablet]`.

- `expect(['low', 'medium']).toContain(perf.tier)`
- `expect(perf.dynamicResolution).toBe(true)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000, })`.

<a id="a168"></a>

**Contract A168 (f1-touch.spec.ts:L220)** — 'manifest is linked and the worker script is served'.

Navigation: `page.goto('/?tile=titanic&landmark=_test&skipBriefing=1')`.

- `expect(href).toBeTruthy()`
- `expect(manifest.name).toBe('Bathyline')`

Scope: `const icon of manifest.icons`.

- `expect(r.ok()).toBe(true)`

Scope: unconditional in this body.

- `expect(await sw.text()).not.toContain('__SW_VERSION__')`
- `expect( await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)), ).toBe(0)`

### [f1-vehicles.spec.ts](../../tests/e2e/f1-vehicles.spec.ts) — rendering/visual

1 expanded cases; sum of assigned weights **235.3s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **U**, `7cd7b17` — audit/verification guard; historical defect attribution not proved for this declaration. Origin: `7cd7b17 wip(f1-vehicles): ROV/vehicle highlight fix, screenshot spec, docs`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **hull classes, ROV with tether and cockpit view render** — keeps await page.evaluate(() => (window.__game as unknown as G).subMesh.hullClass)).toBe(cls); locator('.hud-rov')).toBeVisible(); **235.3s M**; captures **7/0/0**; bug **U `7cd7b17`**; contract [A169](#a169).

<a id="a169"></a>

**Contract A169 (f1-vehicles.spec.ts:L21)** — 'hull classes, ROV with tether and cockpit view render'.

Navigation: `page.goto(url)`.

Scope: `const cls of ['A', 'B', 'C']`.

- `expect(await page.evaluate(() => (window.__game as unknown as G).subMesh.hullClass)).toBe(cls)`

Scope: unconditional in this body.

- `expect(page.locator('.hud-rov')).toBeVisible()`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady && (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt === 'test-bow', )`.

### [f2-explore.spec.ts](../../tests/e2e/f2-explore.spec.ts) — scan

16 expanded cases; sum of assigned weights **385.5s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `53c5722` — capability introduced here; no specific failed-before defect located. Origin: `53c5722 wip(f2-explore): secrets, samples, dynamic events; fix test fake and preview subject`.

Profile/skip controls (variables expanded by rows below): `test.use({ ...phone })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **three hidden discoveries: close sonar, reveal, Journal, persistent count and rewards** — keeps .sonar canvas, .scan-name, .jr-progress, .jr-title, .jr-title-row .jr-tag; full list in contract; **140.6s M**; captures **4/0/0**; bug **F `53c5722`**; contract [A170](#a170).
- **samples collect per dive, appear in mission debrief, and reset on restart** — keeps .scan-hint, .scan-name, .mission-debrief .is-samples, .mission-debrief .is-secrets; full list in contract; **40.8s M**; captures **1/0/0**; bug **F `53c5722`**; contract [A171](#a171).
- **short event caption, one witness reward, pause and cooldown** — keeps .explore-caption; full list in contract; **52.6s M**; captures **1/0/0**; bug **F `53c5722`**; contract [A172](#a172).
- **curiosity content loads and sits on the seabed at lost-city** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **4.9s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at axial-seamount-ashes** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **3.2s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at beebe-vent-field** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **10.2s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at challenger-deep** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **7.9s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at kamaehuakanaloa** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **8.5s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at hunga-tonga-caldera** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **6.1s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at hudson-canyon** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **6.5s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at blake-plateau-corals** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **6.5s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at great-blue-hole** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **9.4s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at titanic** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **4.9s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at bismarck** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **3.2s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **curiosity content loads and sits on the seabed at endurance** — keeps stats.secrets).toBe(3); stats.samples).toBe(2); d.depth).toBeGreaterThan(10); d.lift).toBeCloseTo(2); **3.5s M**; captures **0/0/0**; bug **F `53c5722`**; contract [A173](#a173).
- **phone curiosity › the existing touch Scan collects a sample with a 44 px target** — keeps .scan-hint; full list in contract; **76.7s M**; captures **3/0/0**; bug **F `53c5722`**; contract [A174](#a174).

<a id="a170"></a>

**Contract A170 (f2-explore.spec.ts:L99)** — 'three hidden discoveries: close sonar, reveal, Journal, persistent count and rewards'.

Scope: `let i = 0; i < 3`.

- `expect( await page.evaluate( (id) => (window.__game as unknown as Game).explore.faintContacts.some((t) => t.id === id), id, ), ).toBe(false)`
- `expect(page.locator('.sonar canvas')).toHaveAttribute( 'aria-label', /faint unidentified contact/, )`
- `expect(page.locator('.scan-name')).toHaveText('Unidentified contact')`
- `expect(page.locator('.scan-name')).toHaveText(name)`

Scope: unconditional in this body.

- `expect( await page.evaluate(() => (window.__game as unknown as Game).scanner.getTargets().map((t) => t.id), ), ).toEqual(objectives)`
- `expect(await page.evaluate(() => (window.__game as unknown as Game).progress.points)).toBe( initial + 45, )`
- `expect(page.locator('.jr-progress')).toContainText('3/3 secrets')`
- `expect(page.locator('.jr-title')).toHaveText('Lost instrument frame')`
- `expect(page.locator('.jr-title-row .jr-tag')).toHaveText('Game addition')`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).explore.summary().found), ).toBe(3)`
- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction( (id) => (window.__game as unknown as Game).explore.faintContacts.some((t) => t.id === id), id, )`; `page.waitForFunction( () => window.__gameReady && (window.__game as unknown as Game).explore.ready, )`.

Helper guard closure: [boot](#f2-explore-spec-ts-56-boot), [scan](#f2-explore-spec-ts-87-scan), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `boot(page)`; `scan(page, id)`.

<a id="a171"></a>

**Contract A171 (f2-explore.spec.ts:L168)** — 'samples collect per dive, appear in mission debrief, and reset on restart'.

- `expect(page.locator('.scan-hint')).toContainText('TO COLLECT')`
- `expect(page.locator('.scan-name')).toContainText('Sample collected')`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).explore.samples.collected.size), ).toBe(1)`
- `expect(page.locator('.mission-debrief .is-samples')).toContainText('Sediment core')`
- `expect(page.locator('.mission-debrief .is-secrets')).toHaveCount(0)`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).explore.summary().found), ).toBe(0)`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).explore.samples.collected.size), ).toBe(0)`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).explore.samples.collected.size), ).toBe(1)`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady && (window.__game as unknown as Game).explore?.ready, )`.

Helper guard closure: [boot](#f2-explore-spec-ts-56-boot), [scan](#f2-explore-spec-ts-87-scan), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `boot(page, 'monterey-canyon', true)`; `scan(page, id)`; `scan(page, await park(page, 0, true))`.

<a id="a172"></a>

**Contract A172 (f2-explore.spec.ts:L201)** — 'short event caption, one witness reward, pause and cooldown'.

- `expect( await page.evaluate(() => (window.__game as unknown as Game).explore.previewEvent('turbidity')), ).toBe(true)`
- `expect(page.locator('.explore-caption')).toContainText( 'Silt cloud: sediment-laden water flows downslope', )`
- `expect(await page.evaluate(() => (window.__game as unknown as Game).progress.points)).toBe( points + 5, )`
- `expect(page.locator('.explore-caption')).toBeHidden()`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).explore.scheduler.active), ).not.toBeNull()`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).explore.scheduler.active), ).toBeNull()`

Readiness/temporal predicates: `page.waitForFunction( () => (window.__game as unknown as Game).explore.summary().events.length === 1, )`; `page.waitForFunction( () => (window.__game as unknown as Game).explore.scheduler.active === null, undefined, { timeout: 20_000 }, )`.

Helper guard closure: [boot](#f2-explore-spec-ts-56-boot).

Helper call bindings: `boot(page)`.

<a id="a173"></a>

**Contract A173 (f2-explore.spec.ts:L312)** — `curiosity content loads and sits on the seabed at ${site}`.

Row expansion: `const site of [ 'lost-city', 'axial-seamount-ashes', 'beebe-vent-field', 'challenger-deep', 'kamaehuakanaloa', 'hunga-tonga-caldera', 'hudson-canyon', 'blake-plateau-corals', 'great-blue-hole', 'titanic', 'bismarck', 'endurance', ]`.

- `expect(stats.secrets).toBe(3)`
- `expect(stats.samples).toBe(2)`

Scope: `const d of stats.depths`.

- `expect(d.depth).toBeGreaterThan(10)`
- `expect(d.lift).toBeCloseTo(2)`

Helper guard closure: [boot](#f2-explore-spec-ts-56-boot).

Helper call bindings: `boot(page, site)`.

<a id="a174"></a>

**Contract A174 (f2-explore.spec.ts:L265)** — 'the existing touch Scan collects a sample with a 44 px target'.

- `expect(button).toBeVisible()`
- `expect(box!.width).toBeGreaterThanOrEqual(44)`
- `expect(box!.height).toBeGreaterThanOrEqual(44)`
- `expect(page.locator('.scan-hint')).toHaveText('STOWED FOR THIS DIVE')`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).explore.samples.collected.size), ).toBe(1)`

Helper guard closure: [boot](#f2-explore-spec-ts-56-boot), [stepScan](#helpers-scan-ts-7-stepscan), [expectScanPanelFits](#f2-explore-spec-ts-243-expectscanpanelfits).

Helper call bindings: `boot(page)`; `expectScanPanelFits(page)`.

### [f2-life.spec.ts](../../tests/e2e/f2-life.spec.ts) — scan

10 expanded cases; sum of assigned weights **349.5s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `a71782e` — capability introduced here; no specific failed-before defect located. Origin: `a71782e wip(f2-life): e2e for spawn, scan, Journal and photo`.

Profile/skip controls (variables expanded by rows below): .

Selector/fixture constants: `SITES = [ 'monterey-canyon', 'great-blue-hole', 'hunga-tonga-caldera', 'lost-city', 'beebe-vent-field', 'titanic', 'endurance', ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **animals spawn at a site and stay inside the low tier draw-call budget** — keeps info.stats.species, info.draw.species, info.max, info.draw.sparks; full list in contract; **10.3s M**; captures **1/0/0**; bug **F `a71782e`**; contract [A175](#a175).
- **an animal can be scanned: banner, Journal wildlife entry, persistence** — keeps .scan-panel .scan-kicker, .scan-panel .scan-name, .jr-title, .jr-latin i, .jr-sources a; full list in contract; **63.8s M**; captures **2/0/0**; bug **F `a71782e`**; contract [A176](#a176).
- **photo mode names the animal in frame** — keeps locator('.photo-mode')).toBeVisible(); spawned).toBe(true); locator('.photo-mode-caption')).toContainText('Lobate comb jelly'); named).toBe('comb-jelly'); errors).toEqual([]); **22.8s M**; captures **0/0/0**; bug **F `a71782e`**; contract [A177](#a177).
- **rare encounter at monterey-canyon (high tier, draw-call budget)** — keeps res).toBe(true); info.draw.species + info.draw.sparks).toBeLessThanOrEqual(12); info.stats.agents).toBeGreaterThan(0); errors).toEqual([]); **47.6s M**; captures **1/0/0**; bug **F `a71782e`**; contract [A178](#a178).
- **rare encounter at great-blue-hole (high tier, draw-call budget)** — keeps res).toBe(true); info.draw.species + info.draw.sparks).toBeLessThanOrEqual(12); info.stats.agents).toBeGreaterThan(0); errors).toEqual([]); **42s M**; captures **1/0/0**; bug **F `a71782e`**; contract [A178](#a178).
- **rare encounter at hunga-tonga-caldera (high tier, draw-call budget)** — keeps res).toBe(true); info.draw.species + info.draw.sparks).toBeLessThanOrEqual(12); info.stats.agents).toBeGreaterThan(0); errors).toEqual([]); **21.5s M**; captures **1/0/0**; bug **F `a71782e`**; contract [A178](#a178).
- **rare encounter at lost-city (high tier, draw-call budget)** — keeps res).toBe(true); info.draw.species + info.draw.sparks).toBeLessThanOrEqual(12); info.stats.agents).toBeGreaterThan(0); errors).toEqual([]); **47.1s M**; captures **1/0/0**; bug **F `a71782e`**; contract [A178](#a178).
- **rare encounter at beebe-vent-field (high tier, draw-call budget)** — keeps res).toBe(true); info.draw.species + info.draw.sparks).toBeLessThanOrEqual(12); info.stats.agents).toBeGreaterThan(0); errors).toEqual([]); **22.3s M**; captures **1/0/0**; bug **F `a71782e`**; contract [A178](#a178).
- **rare encounter at titanic (high tier, draw-call budget)** — keeps res).toBe(true); info.draw.species + info.draw.sparks).toBeLessThanOrEqual(12); info.stats.agents).toBeGreaterThan(0); errors).toEqual([]); **39.2s M**; captures **1/0/0**; bug **F `a71782e`**; contract [A178](#a178).
- **rare encounter at endurance (high tier, draw-call budget)** — keeps res).toBe(true); info.draw.species + info.draw.sparks).toBeLessThanOrEqual(12); info.stats.agents).toBeGreaterThan(0); errors).toEqual([]); **32.9s M**; captures **1/0/0**; bug **F `a71782e`**; contract [A178](#a178).

<a id="a175"></a>

**Contract A175 (f2-life.spec.ts:L84)** — 'animals spawn at a site and stay inside the low tier draw-call budget'.

- `expect(info.stats.species).toBeGreaterThan(0)`
- `expect(info.draw.species).toBeLessThanOrEqual(info.max)`
- `expect(info.draw.species + info.draw.sparks).toBeLessThanOrEqual(5)`

Scope: `const id of info.stats.liveSpecies`.

- `expect(allowed.has(id), id).toBe(true)`

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction( () => (window.__game as unknown as Game).life!.sim.stats().agents > 5, undefined, { timeout: 20_000 }, )`.

Helper guard closure: [boot](#f2-life-spec-ts-49-boot).

Helper call bindings: `boot(page)`.

<a id="a176"></a>

**Contract A176 (f2-life.spec.ts:L122)** — 'an animal can be scanned: banner, Journal wildlife entry, persistence'.

- `expect(ok).toBe(true)`
- `expect(done).toEqual({ id: 'life:comb-jelly', logged: true })`
- `expect(page.locator('.scan-panel .scan-kicker')).toHaveText('NEW ENTRY')`
- `expect(page.locator('.scan-panel .scan-name')).toHaveText('Lobate comb jelly')`
- `expect(page.locator('.jr-title')).toHaveText('Lobate comb jelly')`
- `expect(page.locator('.jr-latin i')).toHaveText('Bolinopsis infundibulum')`
- `expect(page.locator('.jr-sources a').first()).toHaveAttribute('href', /^https:\/\//)`
- `expect( await page.evaluate(() => (window.__game as unknown as Game).discoveries.isDiscovered( 'monterey-canyon', 'life:comb-jelly', ), ), ).toBe(true)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 60_000 })`.

Helper guard closure: [boot](#f2-life-spec-ts-49-boot), [stepScan](#helpers-scan-ts-7-stepscan), [openJournalCategory](#helpers-journal-ts-84-openjournalcategory), [journalContents](#helpers-journal-ts-16-journalcontents).

Helper call bindings: `boot(page)`; `openJournalCategory(page, 'monterey-canyon', 'life')`.

<a id="a177"></a>

**Contract A177 (f2-life.spec.ts:L190)** — 'photo mode names the animal in frame'.

- `expect(page.locator('.photo-mode')).toBeVisible()`
- `expect(spawned).toBe(true)`
- `expect(page.locator('.photo-mode-caption')).toContainText('Lobate comb jelly')`
- `expect(named).toBe('comb-jelly')`
- `expect(errors).toEqual([])`

Helper guard closure: [boot](#f2-life-spec-ts-49-boot).

Helper call bindings: `boot(page)`.

<a id="a178"></a>

**Contract A178 (f2-life.spec.ts:L252)** — `rare encounter at ${site} (high tier, draw-call budget)`.

Row expansion: `const site of SITES`.

Navigation: ``page.goto(`/?tile=${site}&skipBriefing=1&tier=high&lifeSeed=5`, { waitUntil: 'domcontentloaded', })``.

- `expect(res).toBe(true)`
- `expect(info.draw.species + info.draw.sparks).toBeLessThanOrEqual(12)`
- `expect(info.stats.agents).toBeGreaterThan(0)`
- `expect(errors).toEqual([])`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil(page, () => { const game = window.__game as unknown as Game; return window.__gameReady === true && game.life !== null && game.props.loaded; })`.

### [f2-modes.spec.ts](../../tests/e2e/f2-modes.spec.ts) — missions/modes

6 expanded cases; sum of assigned weights **170.2s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `23f3e3e` — capability introduced here; no specific failed-before defect located. Origin: `23f3e3e wip(f2-modes): codex work`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **two modes, Advanced and Daily at 1280x720** — keeps radio, .mode-advanced, .daily-card-stars, option, .mode-custom-tag, input:checked; full list in contract; **74.7s M**; captures **4/0/0**; bug **F `23f3e3e`**; contract [A179](#a179).
- **two modes, Advanced and Daily at 390x844** — keeps radio, .mode-advanced, .daily-card-stars, option, .mode-custom-tag, input:checked; full list in contract; **33.1s M**; captures **4/0/0**; bug **F `23f3e3e`**; contract [A179](#a179).
- **Daily completion stores today stars and streak separately from settings** — keeps .briefing, .mission-debrief, .daily-card-stars; full list in contract; **35.7s M**; captures **0/0/0**; bug **F `23f3e3e`**; contract [A180](#a180).
- **a fresh arcade pilot gets an accessible Daily dive and a sufficient hull** — keeps .daily-card; full list in contract; **8.7s M**; captures **0/0/0**; bug **F `23f3e3e`**; contract [A181](#a181).
- **a fresh realistic pilot gets an accessible Daily dive and a sufficient hull** — keeps .daily-card; full list in contract; **10s M**; captures **0/0/0**; bug **F `23f3e3e`**; contract [A181](#a181).
- **phone touch › opens Advanced with a tap and shows the Custom tag** — keeps .mode-advanced, .mode-custom-tag, .daily-card; full list in contract; **8s M**; captures **1/0/0**; bug **F `23f3e3e`**; contract [A182](#a182).

<a id="a179"></a>

**Contract A179 (f2-modes.spec.ts:L14)** — `two modes, Advanced and Daily at ${viewport.width}x${viewport.height}`.

Row expansion: `const viewport of [ { width: 1280, height: 720 }, { width: 390, height: 844 }, ]`.

- `expect(mode.getByRole('radio')).toHaveCount(2)`
- `expect(mode.getByRole('radio', { name: 'Arcade' })).toBeChecked()`
- `expect(toggle).toHaveAttribute('aria-expanded', 'false')`
- `expect(mode.locator('.mode-advanced')).toBeHidden()`
- `expect(daily).toBeVisible()`
- `expect(daily).toContainText('Daily dive')`
- `expect(daily.locator('.daily-card-stars')).toHaveAttribute( 'aria-label', 'Best today: 0 of 3 stars', )`
- `expect(daily).toBeInViewport()`
- `expect(toggle).toHaveAttribute('aria-expanded', 'true')`
- `expect(currents.locator('option')).toHaveText(['Off', 'Realistic', 'Exaggerated'])`
- `expect(mode.locator('.mode-custom-tag')).toBeVisible()`
- `expect(mode.locator('input:checked')).toHaveCount(0)`
- `expect .poll(() => page.evaluate( () => (window.__game as { save: { get(): { gameplayMode: string } } }).save.get() .gameplayMode, ), ) .toBe('custom')`

Scope: `const target of [toggle, mode.locator('.mode-seg').first(), currents]`.

- `expect(box!.width).toBeGreaterThanOrEqual(44)`
- `expect(box!.height).toBeGreaterThanOrEqual(44)`

Scope: unconditional in this body.

- `expect(currents).toHaveValue('realistic')`
- `expect(mode.locator('.mode-custom-tag')).toBeHidden()`
- `expect(currents).toHaveValue('off')`
- `expect(mode.locator('.mode-advanced')).toBeHidden()`
- `expect(briefing).toBeVisible()`
- `expect(briefing.locator('.briefing-title')).toContainText('Daily dive')`
- `expect(diveMode.getByRole('radio')).toHaveCount(2)`
- `expect(diveMode.locator('.mode-advanced')).toBeHidden()`
- `expect(briefing.getByRole('link', { name: 'Free dive', exact: true })).toBeVisible()`
- `expect(diveMode.locator('.mode-advanced')).toBeVisible()`
- `expect(page.locator('.objectives-panel')).toHaveCount(0)`
- `expect(page.locator('.briefing')).toHaveCount(0)`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady === true && Boolean((window.__game as { daily?: unknown }).daily), )`; `page.waitForFunction( () => window.__gameReady === true && (window.__game as { mission: unknown }).mission === null, )`.

Helper guard closure: [boot](#f2-modes-spec-ts-6-boot).

Helper call bindings: `boot(page)`.

<a id="a180"></a>

**Contract A180 (f2-modes.spec.ts:L91)** — 'Daily completion stores today stars and streak separately from settings'.

- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(page.locator('.mission-debrief')).toBeVisible()`
- ``expect .poll(() => page.evaluate(({ date }) => { const game = window.__game as { progress: { rating(id: string): number } }; return game.progress.rating(`daily-${date}`); }, data), ) .toBe(3)``
- `expect(streak).toEqual({ version: 1, lastCompletedDate: data.date, streak: 1 })`
- `expect(page.locator('.daily-card-stars')).toHaveAttribute( 'aria-label', 'Best today: 3 of 3 stars · 1 day streak', )`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady === true && Boolean((window.__game as { daily?: unknown }).daily), )`.

Helper guard closure: [boot](#f2-modes-spec-ts-6-boot).

Helper call bindings: `boot(page)`.

<a id="a181"></a>

**Contract A181 (f2-modes.spec.ts:L145)** — `a fresh ${mode} pilot gets an accessible Daily dive and a sufficient hull`.

Row expansion: `const mode of ['arcade', 'realistic'] as const`.

- `expect(page.locator('.daily-card')).toBeVisible()`
- `expect(access.mode).toBe(mode)`
- `expect(access.allowed).toBe(true)`
- `expect(access.lifetime).toBe(0)`
- `expect(access.depth).toBeLessThanOrEqual(access.rating)`

Scope: `if mode === 'realistic'`.

- `expect(access.depth).toBeLessThanOrEqual(1000)`

Readiness/temporal predicates: `page.waitForFunction( () => window.__gameReady === true && Boolean((window.__game as { daily?: unknown }).daily), )`.

Helper guard closure: [boot](#f2-modes-spec-ts-6-boot).

Helper call bindings: `boot(page)`.

<a id="a182"></a>

**Contract A182 (f2-modes.spec.ts:L201)** — 'opens Advanced with a tap and shows the Custom tag'.

- `expect(mode.locator('.mode-advanced')).toBeVisible()`
- `expect(mode.locator('.mode-custom-tag')).toBeVisible()`
- `expect(mode.locator('.mode-advanced')).toBeHidden()`
- `expect(page.locator('.daily-card')).toBeInViewport()`

Helper guard closure: [boot](#f2-modes-spec-ts-6-boot).

Helper call bindings: `boot(page)`.

### [f2-progress.spec.ts](../../tests/e2e/f2-progress.spec.ts) — missions/modes

5 expanded cases; sum of assigned weights **156.1s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `a2dd832` — capability introduced here; no specific failed-before defect located. Origin: `a2dd832 F2-PROGRESS: research points, upgrades workshop, hull-class unlocks, star ratings`.

Profile/skip controls (variables expanded by rows below): .

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **new researcher earns RP, buys a live upgrade and earns a three-star dive** — keeps .upgrades-balance, .pause-menu, .photo-mode, .debrief-stars, .debrief-rating, [data-mission=; full list in contract; **120.1s M**; captures **3/0/0**; bug **F `a2dd832`**; contract [A183](#a183).
- **phone workshop is touch-operable and locks leave four starter missions open** — keeps .upgrades, .upgrades-panel, .home-sites .is-mission:not(:disabled); full list in contract; **4.7s M**; captures **2/0/0**; bug **F `a2dd832`**; contract [A184](#a184).
- **deep free dive uses only unlocked hulls, shared locked mission becomes a rated free dive** — keeps .progress-hull-notice; full list in contract; **10s M**; captures **0/0/0**; bug **F `a2dd832`**; contract [A185](#a185).
- **old discoveries are credited before fitting a deep-mission vehicle** — keeps result).toEqual({ lifetime: 330, vehicle: 'B', completed: 0 }); await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe(old); **7.3s M**; captures **0/0/0**; bug **F `a2dd832`**; contract [A186](#a186).
- **species hook pays once and unlocks a full-depth vehicle on the next dive** — keeps .progress-hull-notice; full list in contract; **14s M**; captures **0/0/0**; bug **F `a2dd832`**; contract [A187](#a187).

<a id="a183"></a>

**Contract A183 (f2-progress.spec.ts:L82)** — 'new researcher earns RP, buys a live upgrade and earns a three-star dive'.

Navigation: `page.goto('/?mission=blake-plateau-corals&skipBriefing=1')`.

- `expect( await page.evaluate( () => (window.__game as { sub: { getState(): { hullClass: string } } }).sub.getState().hullClass, ), ).toBe('A')`
- `expect(upgrades).toBeVisible()`
- `expect(upgrades.locator('.upgrades-balance')).toContainText('90 RP available')`
- `expect(after).toBeCloseTo(before * 1.1)`
- `expect(upgrades.locator('.upgrades-balance')).toContainText('55 RP available')`
- `expect( await page.evaluate( () => (window.__game as { sub: { position: { y: number } } }).sub.position.y, ), ).toBe(held)`
- `expect(upgrades).toBeHidden()`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(page.locator('.photo-mode')).toBeVisible()`
- `expect(page.locator('.photo-mode')).toBeHidden()`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(debrief).toBeVisible()`
- `expect(debrief.locator('.debrief-stars')).toHaveAttribute('aria-label', '3 of 3 stars')`
- `expect(debrief.locator('.debrief-rating')).toContainText('160 research points')`
- `expect(sites.locator('[data-mission="blake-plateau-corals"] .mission-stars')).toHaveText( '★★★', )`
- `expect(sites.locator('[data-mission="titanic"]')).toBeDisabled()`
- `expect(sites.locator('[data-mission="titanic"] .mission-lock')).toContainText( 'Class B · 300 lifetime RP', )`
- `expect(sites.locator('[data-mission="challenger-deep"] .mission-lock')).toContainText( 'Class C · 900 lifetime RP', )`
- `expect(page.locator('[data-upgrade="light-range"]').locator('..')).toContainText( 'Level 1 / 3', )`
- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction( () => (window.__game as { progress: { bonus: boolean } }).progress.bonus, )`.

Helper guard closure: [ready](#f2-progress-spec-ts-8-ready), [scan](#f2-progress-spec-ts-26-scan), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `ready(page)`; `scan(page, id)`.

<a id="a184"></a>

**Contract A184 (f2-progress.spec.ts:L188)** — 'phone workshop is touch-operable and locks leave four starter missions open'.

Navigation: `page.goto('/')`.

- `expect(page.locator('.upgrades')).toBeVisible()`
- `expect(sizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true)`
- `expect( await page .locator('.upgrades-panel') .evaluate((panel) => panel.scrollWidth <= panel.clientWidth), ).toBe(true)`
- `expect(page.locator('.home-sites .is-mission:not(:disabled)')).toHaveCount(4)`

Helper guard closure: [ready](#f2-progress-spec-ts-8-ready).

Helper call bindings: `ready(page)`.

<a id="a185"></a>

**Contract A185 (f2-progress.spec.ts:L216)** — 'deep free dive uses only unlocked hulls, shared locked mission becomes a rated free dive'.

Navigation: `page.goto('/?mission=challenger-deep')`.

- `expect(page.locator('.progress-hull-notice')).toContainText('Class C · 900 lifetime RP')`
- `expect(hull.hullClass).toBe('A')`
- `expect(hull.ratedDepth).toBe(-1000)`
- `expect(await page.evaluate(() => (window.__game as { mission: unknown }).mission)).toBeNull()`

Helper guard closure: [ready](#f2-progress-spec-ts-8-ready).

Helper call bindings: `ready(page)`.

<a id="a186"></a>

**Contract A186 (f2-progress.spec.ts:L237)** — 'old discoveries are credited before fitting a deep-mission vehicle'.

Navigation: `page.goto('/?mission=titanic&skipBriefing=1')`.

- `expect(result).toEqual({ lifetime: 330, vehicle: 'B', completed: 0 })`
- `expect(await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe(old)`

Helper guard closure: [ready](#f2-progress-spec-ts-8-ready).

Helper call bindings: `ready(page)`.

<a id="a187"></a>

**Contract A187 (f2-progress.spec.ts:L273)** — 'species hook pays once and unlocks a full-depth vehicle on the next dive'.

Navigation: `page.goto('/')`; `page.goto('/?mission=challenger-deep&skipBriefing=1')`.

- `expect(earned).toEqual({ first: 15, repeat: 0, lifetime: 914 })`
- `expect( await page.evaluate( () => (window.__game as { subMesh: { hullClass: string } }).subMesh.hullClass, ), ).toBe('C')`
- `expect(page.locator('.progress-hull-notice')).toHaveCount(0)`

Helper guard closure: [ready](#f2-progress-spec-ts-8-ready).

Helper call bindings: `ready(page)`.

### [f3-audio.spec.ts](../../tests/e2e/f3-audio.spec.ts) — audio

3 expanded cases; sum of assigned weights **131.9s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `86b427b` — audio/sliders/first interaction feature, not the pause/tab-return regression. Origin: `86b427b F3-AUDIO: adaptive ambient score, richer SFX, music volume slider`.

Profile/skip controls (variables expanded by rows below): `test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **adaptive audio starts, captions new cues, independent sliders persist** — keeps slider, Mute audio, .captions; full list in contract; **89.2s M**; captures **1/0/0**; bug **F `86b427b`**; contract [A188](#a188).
- **pause and visibility freeze music and preserve pause when the tab returns** — keeps 'pause and visibility freeze music and preserve pause when the tab returns'; full list in contract; **26s M**; captures **0/0/0**; bug **R `04a94f6`**; contract [A189](#a189).
- **touch audio › first touch resumes the graph and music has a usable target** — keeps 'first touch resumes the graph and music has a usable target'; full list in contract; **16.7s M**; captures **1/0/0**; bug **F `86b427b`**; contract [A190](#a190).

<a id="a188"></a>

**Contract A188 (f3-audio.spec.ts:L38)** — 'adaptive audio starts, captions new cues, independent sliders persist'.

Navigation: `page.goto(url)`.

- `expect.poll(async () => (await probe(page)).state).toBe('running')`
- `expect.poll(async () => (await probe(page)).sampleReady).toBe(true)`
- `expect.poll(async () => (await probe(page)).musicGain).toBeCloseTo(0.37, 2)`
- `expect.poll(async () => (await probe(page)).sfxGain).toBeCloseTo(0.65, 2)`
- `expect((await music.boundingBox())!.height).toBeGreaterThanOrEqual(44)`
- `expect.poll(async () => (await probe(page)).masterGain).toBeLessThan(0.005)`
- `expect.poll(async () => (await probe(page)).state).toBe('running')`
- `expect((await probe(page)).muted).toBe(true)`
- `expect((await probe(page)).masterGain).toBe(0)`
- `expect(music).toHaveValue('0.37')`
- `expect(page.getByRole('slider', { name: 'Sound effects volume', exact: true })).toHaveValue( '0.65', )`
- `expect(page.getByLabel('Mute audio')).toBeChecked()`
- `expect.poll(async () => (await probe(page)).musicGain).toBeLessThan(0.005)`
- `expect.poll(async () => (await probe(page)).sfxGain).toBeCloseTo(0.65, 2)`
- `expect(page.locator('.captions')).toContainText('Scan beam hums')`
- `expect.poll(async () => (await probe(page)).score?.swell ?? 0).toBeGreaterThan(0.5)`
- `expect(page.locator('.captions')).toContainText('Manipulator servo')`
- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady)`; `page.waitForFunction(() => window.__gameReady)`.

<a id="a189"></a>

**Contract A189 (f3-audio.spec.ts:L117)** — 'pause and visibility freeze music and preserve pause when the tab returns'.

Navigation: `page.goto(url)`.

- `expect.poll(async () => (await probe(page)).state).toBe('running')`
- `expect.poll(async () => (await probe(page)).state).toBe('suspended')`
- `expect((await probe(page)).masterGain).toBe(0)`
- `expect.poll(async () => (await probe(page)).state).toBe('suspended')`
- `expect((await probe(page)).contextTime).toBe(pausedTime)`
- `expect.poll(async () => (await probe(page)).state).toBe('running')`
- `expect.poll(async () => (await probe(page)).masterGain).toBeGreaterThan(0.5)`
- `expect.poll(async () => (await probe(page)).state).toBe('suspended')`
- `expect((await probe(page)).state).toBe('suspended')`
- `expect((await probe(page)).masterGain).toBe(0)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady)`.

<a id="a190"></a>

**Contract A190 (f3-audio.spec.ts:L96)** — 'first touch resumes the graph and music has a usable target'.

Navigation: `page.goto(url)`.

- `expect.poll(async () => (await probe(page)).state).toBe('running')`
- `expect(box.height).toBeGreaterThanOrEqual(44)`
- `expect(box.width).toBeGreaterThanOrEqual(44)`
- `expect((await probe(page)).musicVolume).toBeGreaterThan(0.6)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady)`.

### [f3-onboard.spec.ts](../../tests/e2e/f3-onboard.spec.ts) — onboarding

8 expanded cases; sum of assigned weights **584.8s**, 2 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Five-step/phone shape fragments inHUD; keep early-action memory, scan interruption, grace/history, Pause-Journal/native PHOTO actions.

History/provenance scope: **R**, `148cb9b` — remember early actions and accept Pause→Journal tutorial completion;1260 follow-up; 090ea99 touch photo exit. Origin: `3ff84e1 wip(f3-onboard): spec, layout tuning`.

Profile/skip controls (variables expanded by rows below): `test.use({ ...phoneLandscape })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **desktop: tutorial starts, advances, skips and stays skipped after reload** — keeps button, .onboard-card; full list in contract; **35.6s M**; captures **2/0/0**; bug **R `148cb9b`**; contract [A191](#a191).
- **scan coaching waits through held progress and interruption until completion** — keeps .onboard-card-text; full list in contract; **45s F**; captures **0/0/0**; bug **R `148cb9b`**; contract [A192](#a192).
- **desktop: Pause opens the controls card for the active device** — keeps .pause-menu, .how-to-tile svg, .controls-card-tabs; full list in contract; **33.5s M**; captures **1/0/0**; bug **R `148cb9b`**; contract [A193](#a193).
- **hints appear once, can be dismissed and are remembered** — keeps .scan-panel, .onboard-hint; full list in contract; **77.5s M**; captures **1/0/0**; bug **R `148cb9b`**; contract [A194](#a194).
- **hints expire after nine seconds and stay remembered after reload** — keeps .scan-panel, .onboard-hint; full list in contract; **94s M**; captures **1/0/0**; bug **R `148cb9b`**; contract [A194](#a194).
- **touch viewport › Journal returns to Pause without switching out of touch mode** — keeps .onboard-card, html, .tc-btn-pause; full list in contract; **45s F**; captures **0/0/0**; bug **R `148cb9b`**; contract [A195](#a195).
- **touch viewport › tutorial card clears the on-screen controls and targets are 44px** — keeps .how-to-tile svg, .controls-card-tabs; full list in contract; **133.9s M**; captures **3/0/0**; bug **R `148cb9b`**; contract [A196](#a196).
- **touch viewport › PHOTO capture, Done, movement and Pause stay reachable with touch alone** — keeps .tc-root, .photo-mode-toast, .pause-menu, .tc-btn-pause; full list in contract; **120.3s M**; captures **0/0/1**; bug **R `148cb9b`**; contract [A197](#a197).

<a id="a191"></a>

**Contract A191 (f3-onboard.spec.ts:L53)** — 'desktop: tutorial starts, advances, skips and stays skipped after reload'.

- `expect(card).toBeVisible()`
- `expect(card).toContainText('Step 1 of 5')`
- `expect(card).toContainText('Hold W to move')`
- `expect(page.getByRole('button', { name: 'Skip tutorial' })).toBeVisible()`
- `expect.poll(() => stepIndex(page), { timeout: 15_000 }).toBe(1)`
- `expect(card).toContainText('Step 2 of 5')`
- `expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)`
- `expect(card).toBeHidden()`
- `expect((await saved(page))?.tutorialDone).toBe(true)`
- `expect(page.locator('.onboard-card')).toBeHidden()`
- `expect( await page.evaluate(() => (window.__game as unknown as Probe).onboard.tutorial.active), ).toBe(false)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

Helper guard closure: [boot](#f3-onboard-spec-ts-26-boot).

Helper call bindings: `boot(page)`.

<a id="a192"></a>

**Contract A192 (f3-onboard.spec.ts:L89)** — 'scan coaching waits through held progress and interruption until completion'.

Navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`.

- `expect(card).toHaveAttribute('data-step', 'scan')`
- `expect(card.locator('.onboard-card-text')).toContainText('Scanning…')`
- `expect(await stepIndex(page)).toBe(3)`
- `expect(card.locator('.onboard-card-text')).not.toContainText('Scanning…')`
- `expect(await stepIndex(page)).toBe(3)`
- `expect(await stepIndex(page)).toBe(4)`
- `expect(card).toHaveAttribute('data-step', 'journal')`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `clockFramesUntil(page, () => { const g = window.__game as unknown as Probe; return ( window.__gameReady === true && g.discovery.loaded && g.discovery.spawnedAt === 'test-bow' && g.scanner.view.candidateId === 'test-bow' ); })`.

<a id="a193"></a>

**Contract A193 (f3-onboard.spec.ts:L124)** — 'desktop: Pause opens the controls card for the active device'.

- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(dialog).toBeVisible()`
- `expect(dialog).toContainText('Showing the layout for your keyboard and mouse')`
- `expect(dialog).toContainText('Rise and sink')`
- `expect(dialog).toBeHidden()`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(howTo).toBeVisible()`
- `expect(howTo).toContainText('Left stick')`
- `expect(howTo.locator('.how-to-tile svg')).toHaveCount(10)`
- `expect(howTo.locator('.controls-card-tabs')).toBeVisible()`

Helper guard closure: [boot](#f3-onboard-spec-ts-26-boot).

Helper call bindings: `boot(page)`.

<a id="a194"></a>

**Contract A194 (f3-onboard.spec.ts:L153)** — dismissal === 'button' ? 'hints appear once, can be dismissed and are remembered' : 'hints expire after nine seconds and stay remembered after reload'.

Row expansion: `const dismissal of ['button', 'expiry'] as const`.

Navigation: `page.goto('/?tile=challenger-deep&poi=cd-leggo-amphipod-site&skipBriefing=1&tier=low', { waitUntil: 'domcontentloaded', })`.

- `expect(hull.hullClass).toBe('C')`
- `expect(hull.ratedRatio).toBeGreaterThanOrEqual(HINT_THRESHOLDS.hull)`
- `expect(hull.ratedRatio).toBeLessThan(1)`
- `expect(hull.hullBreached).toBe(false)`
- `expect(hint).toBeHidden()`
- `expect(hint).toBeHidden()`
- `expect((await saved(page))?.seenHints).not.toContain('near-hull')`
- `expect(hint).toBeVisible({ timeout: 30_000 })`
- `expect(hint).toContainText('Near hull rating')`
- `expect(page.locator('.scan-panel')).toBeVisible()`

Scope: `else of dismissal === 'button'`.

- `expect(hint).toBeVisible()`

Scope: unconditional in this body.

- `expect(hint).toBeHidden()`
- `expect((await saved(page))?.seenHints).toContain('near-hull')`
- `expect((await saved(page))?.seenHints).not.toContain('scan-target')`
- `expect(page.locator('.scan-panel')).toBeVisible()`
- `expect(page.locator('.onboard-hint')).toBeHidden()`

Helper guard closure: [clockFramesUntil](#helpers-clock-ts-14-clockframesuntil).

Helper call bindings: `clockFramesUntil(page, ready)`.

<a id="a195"></a>

**Contract A195 (f3-onboard.spec.ts:L245)** — 'Journal returns to Pause without switching out of touch mode'.

- `expect(page.locator('.onboard-card')).toHaveAttribute('data-step', 'journal')`
- `expect(journal).toBeVisible()`
- `expect.poll(async () => (await saved(page))?.tutorialDone).toBe(true)`
- `expect(journal).toBeHidden()`
- `expect(pause).toBeVisible()`
- `expect(page.locator('html')).toHaveClass(/is-touch/)`
- `expect(page.locator('.tc-btn-pause')).toBeVisible()`
- `expect(page.locator('.onboard-card')).toBeHidden()`

Helper guard closure: [boot](#f3-onboard-spec-ts-26-boot).

Helper call bindings: `boot(page, '&touch=1')`.

<a id="a196"></a>

**Contract A196 (f3-onboard.spec.ts:L264)** — 'tutorial card clears the on-screen controls and targets are 44px'.

- `expect(card).toBeVisible()`
- `expect(card).toContainText('left stick')`
- `expect(box.x).toBeGreaterThanOrEqual(0)`
- `expect(box.x + box.width).toBeLessThanOrEqual(vp.width)`
- `expect(box.y + box.height).toBeLessThanOrEqual(vp.height)`

Scope: `const sel of ['.tc-stick', '.tc-slider', '.tc-buttons']`.

- ``expect(overlap, `${sel} overlaps the card`).toBe(false)``

Scope: `const name of ['Skip']`.

- `expect(b.height).toBeGreaterThanOrEqual(43.9)`

Scope: unconditional in this body.

- `expect(card).toHaveAttribute('data-step', 'depth')`
- `expect(card).toContainText('slider')`
- `expect(card).toBeHidden()`
- `expect(dialog).toContainText('Left stick')`
- `expect(dialog).toContainText('Right slider')`
- `expect(dialog.locator('.how-to-tile svg')).toHaveCount(10)`
- `expect(dialog.locator('.controls-card-tabs')).toBeHidden()`

Helper guard closure: [boot](#f3-onboard-spec-ts-26-boot), [dismissTutorial](#helpers-tutorial-ts-4-dismisstutorial).

Helper call bindings: `boot(page, '&touch=1')`; `dismissTutorial(page, true)`.

<a id="a197"></a>

**Contract A197 (f3-onboard.spec.ts:L307)** — 'PHOTO capture, Done, movement and Pause stay reachable with touch alone'.

- `expect(control).toBeVisible()`
- `expect(box).not.toBeNull()`
- `expect.poll(() => stepIndex(page)).toBe(1)`
- `expect.poll(() => stepIndex(page)).toBe(2)`
- `expect.poll(() => stepIndex(page)).toBe(3)`
- `expect .poll(() => page.evaluate(() => (window.__game as unknown as Probe).scanner.view.candidateId)) .toBe('test-bow')`
- `expect.poll(() => stepIndex(page)).toBe(4)`
- `expect(card).toContainText('Step 5 of 5')`
- `expect(mode).toBeVisible()`
- `expect(page.locator('.tc-root')).toBeHidden()`

Scope: `const name of ['Done', 'Pause']`.

- `expect(box.width).toBeGreaterThanOrEqual(44)`
- `expect(box.height).toBeGreaterThanOrEqual(44)`

Scope: unconditional in this body.

- `expect(mode.locator('.photo-mode-toast')).toHaveText('Saved to Journal')`
- `expect(mode).toBeHidden()`
- `expect(page.locator('.tc-root')).toBeVisible()`
- `expect(card).toBeHidden()`
- `expect((await saved(page))?.tutorialDone).toBe(true)`
- `expect .poll(() => page.evaluate( () => (window.__game as unknown as { sub: { getState(): { speed: number } } }).sub.getState() .speed, ), ) .toBeGreaterThan(0.1)`
- `expect(mode).toBeHidden()`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(page.locator('.tc-btn-pause')).toBeVisible()`

Helper guard closure: [boot](#f3-onboard-spec-ts-26-boot), [hold](#f3-onboard-spec-ts-321-hold), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `boot(page, '&touch=1')`; `hold('.tc-stick', 0.8, 0.2)`; `hold('.tc-slider', 0.5, 0.1)`; `hold('.tc-btn-scan', 0.5, 0.5)`; `hold('.tc-stick', 0.5, 0.2)`.

### [globe-pins.spec.ts](../../tests/e2e/globe-pins.spec.ts) — other

5 expanded cases; sum of assigned weights **225.0s**, 5 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `eb40738` — capability introduced here; no specific failed-before defect located. Origin: `eb40738 feat(f-globe-pins): pins on their true location, clusters, catalogue specks, bigger phone globe`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **globe pins › pins sit on their location: no leaders, small dot, padded hit area, faint catalogue** — keeps .globe.is-embedded .globe-leaders; full list in contract; **45s F**; captures **0/0/0**; bug **F `eb40738`**; contract [A198](#a198).
- **globe pins › a numbered cluster zooms in until its members separate** — keeps 'a numbered cluster zooms in until its members separate'; full list in contract; **45s F**; captures **0/0/0**; bug **F `eb40738`**; contract [A199](#a199).
- **globe pins › Tab reaches a clustered member, shows it alone with its name label** — keeps pin).toBeFocused(); pin).not.toHaveClass(/is-clustered/); pin.locator('.globe-pin-label')).toBeVisible(); **45s F**; captures **0/0/0**; bug **F `eb40738`**; contract [A200](#a200).
- **globe pins › at full zoom, a still-overlapping cluster opens a chooser of its sites** — keeps .globe-chooser-item, .globe:not(.is-embedded); full list in contract; **45s F**; captures **0/0/0**; bug **F `eb40738`**; contract [A201](#a201).
- **globe pins on touch › hit areas are 44 px, the globe is wide, and the first tap names a pin** — keeps .home-sites [data-mission=, .globe-pin-label; full list in contract; **45s F**; captures **0/0/0**; bug **F `eb40738`**; contract [A202](#a202).

<a id="a198"></a>

**Contract A198 (globe-pins.spec.ts:L32)** — 'pins sit on their location: no leaders, small dot, padded hit area, faint catalogue'.

- `expect(page.locator('.globe.is-embedded .globe-leaders')).toHaveCount(0)`
- `expect(dot).toBeGreaterThanOrEqual(10)`
- `expect(dot).toBeLessThanOrEqual(14)`
- `expect(hit).toBeGreaterThanOrEqual(32)`
- `expect(off).toBeLessThan(1)`
- `expect(speck).toHaveCSS('pointer-events', 'none')`

Helper guard closure: [openHomeGlobe](#globe-pins-spec-ts-18-openhomeglobe).

Helper call bindings: `openHomeGlobe(page)`.

<a id="a199"></a>

**Contract A199 (globe-pins.spec.ts:L65)** — 'a numbered cluster zooms in until its members separate'.

- `expect(cluster).toBeVisible()`
- `expect(count).toBeGreaterThanOrEqual(2)`
- `expect(ids).toHaveLength(count)`
- ``expect( page.locator(`.globe.is-embedded .globe-pin[data-landmark="${ids[0]}"]`), ).toHaveClass(/is-clustered/)``
- `expect.poll(() => distance(page), { timeout: 15_000 }).toBeLessThan(before * 0.8)`
- ``expect( page.locator(`.globe.is-embedded .globe-pin[data-landmark="${ids[0]}"]`), ).not.toHaveClass(/is-clustered/, { timeout: 15_000 })``

Helper guard closure: [openHomeGlobe](#globe-pins-spec-ts-18-openhomeglobe).

Helper call bindings: `openHomeGlobe(page)`.

<a id="a200"></a>

**Contract A200 (globe-pins.spec.ts:L85)** — 'Tab reaches a clustered member, shows it alone with its name label'.

- `expect(pin).toBeFocused()`
- `expect(pin).not.toHaveClass(/is-clustered/)`
- `expect(pin.locator('.globe-pin-label')).toBeVisible()`

Helper guard closure: [openHomeGlobe](#globe-pins-spec-ts-18-openhomeglobe).

Helper call bindings: `openHomeGlobe(page)`.

<a id="a201"></a>

**Contract A201 (globe-pins.spec.ts:L98)** — 'at full zoom, a still-overlapping cluster opens a chooser of its sites'.

Navigation: `page.goto('/?tile=titanic&globe=1&tier=low', { waitUntil: 'domcontentloaded' })`.

- `expect(cluster).toBeVisible()`
- `expect(chooser).toBeVisible()`
- `expect(chooser.locator('.globe-chooser-item').first()).toBeFocused()`
- `expect(await chooser.locator('.globe-chooser-item').count()).toBeGreaterThanOrEqual(2)`
- `expect(chooser).toBeHidden()`
- `expect(page.locator('.globe:not(.is-embedded)')).toBeVisible()`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`; `page.waitForFunction(() => (window.__game as { globe: HomeGlobe }).globe.pinCount > 0)`.

<a id="a202"></a>

**Contract A202 (globe-pins.spec.ts:L127)** — 'hit areas are 44 px, the globe is wide, and the first tap names a pin'.

- `expect(box!.width).toBeGreaterThanOrEqual(390 * 0.6)`
- `expect(box!.height).toBeGreaterThanOrEqual(220)`
- `expect(sizes.length).toBeGreaterThan(0)`

Scope: `const w of sizes`.

- `expect(w).toBeGreaterThanOrEqual(44)`

Scope: unconditional in this body.

- `expect(page.locator('.home-sites [data-mission="titanic"]')).toBeVisible()`
- `expect(pin).toHaveClass(/is-active/)`
- `expect(pin.locator('.globe-pin-label')).toBeVisible()`
- `expect(new URL(page.url()).searchParams.get('mission')).toBeNull()`

Helper guard closure: [openHomeGlobe](#globe-pins-spec-ts-18-openhomeglobe).

Helper call bindings: `openHomeGlobe(page)`.

### [globe.spec.ts](../../tests/e2e/globe.spec.ts) — other

4 expanded cases; sum of assigned weights **162.4s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `599c839` — capability introduced here; no specific failed-before defect located. Origin: `599c839 core: C1 globe e2e, polish and docs`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Journal lists the survey species with their OBIS sources** — keeps .jr-hidden-note, .jr-body .jr-title, .jr-latin i, .jr-sources a; full list in contract; **39.2s M**; captures **0/0/0**; bug **F `599c839`**; contract [A203](#a203).
- **globe mission select › opens, freezes the game, pins, Tab and Escape; screenshot** — keeps .globe:not(.is-embedded), .globe:not(.is-embedded) .globe-pin[data-state=, .globe:not(.is-embedded) .globe-pin:focus, .globe:not(.is-embedded) .globe-card; full list in contract; **49.3s M**; captures **1/0/0**; bug **F `599c839`**; contract [A204](#a204).
- **globe mission select › Enter on the Titanic pin starts the Titanic mission** — keeps .globe:not(.is-embedded) .globe-card; full list in contract; **54.5s M**; captures **0/0/0**; bug **F `599c839`**; contract [A205](#a205).
- **globe mission select › axe finds no violations on the open globe** — keeps locator('.globe:not(.is-embedded) .globe-card')).toBeVisible(); axe.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([]); **19.4s M**; captures **0/0/0**; bug **F `599c839`**; contract [A206](#a206).

<a id="a203"></a>

**Contract A203 (globe.spec.ts:L176)** — 'Journal lists the survey species with their OBIS sources'.

- `expect(journal).toBeVisible()`
- `expect(journal.locator('.jr-hidden-note')).toContainText('2 species not yet identified')`
- `expect(rows).toHaveCount(2)`
- `expect(journal.locator('.jr-body .jr-title')).toHaveText('abyssal grenadier')`
- `expect(journal.locator('.jr-latin i')).toHaveText('Coryphaenoides armatus')`
- `expect(journal.locator('.jr-sources a').last()).toHaveAttribute('href', /api\.obis\.org/)`
- `expect(errors).toEqual([])`

Helper guard closure: [boot](#globe-spec-ts-26-boot), [openJournalCategory](#helpers-journal-ts-84-openjournalcategory), [journalContents](#helpers-journal-ts-16-journalcontents).

Helper call bindings: `boot(page, '/?tile=titanic&landmark=_test')`; `openJournalCategory(page, '_test', 'species')`.

<a id="a204"></a>

**Contract A204 (globe.spec.ts:L81)** — 'opens, freezes the game, pins, Tab and Escape; screenshot'.

- `expect(page.locator('.globe:not(.is-embedded)')).toBeVisible()`

Scope: `const id of ['titanic', 'lost-city', 'monterey-canyon']`.

- ``expect( page.locator(`.globe:not(.is-embedded) .globe-pin[data-landmark="${id}"]`), ).toHaveAttribute('data-state', 'mission')``

Scope: `if pending`.

- ``expect( page.locator(`.globe:not(.is-embedded) .globe-pin[data-landmark="${pending}"]`), ).toHaveAttribute('data-state', 'tile')``

Scope: unconditional in this body.

- `expect( page.locator('.globe:not(.is-embedded) .globe-pin[data-state="catalogue"]').first(), ).toBeAttached()`
- `expect(await subPos(page)).toEqual(before)`
- `expect( await page.evaluate( () => (window.__game as { settings: { isOpen: boolean } }).settings.isOpen, ), ).toBe(false)`
- `expect(await globeOpen(page)).toBe(true)`
- `expect(page.locator('.globe:not(.is-embedded) .globe-pin:focus')).toHaveCount(1)`
- `expect(page.locator('.globe:not(.is-embedded) .globe-card')).toBeVisible()`
- `expect(await globeOpen(page)).toBe(false)`
- `expect(page.locator('.globe:not(.is-embedded)')).toBeHidden()`
- `expect( Math.hypot(moved[0] - closed[0], moved[1] - closed[1], moved[2] - closed[2]), ).toBeGreaterThan(0.1)`
- `expect.poll(() => globeOpen(page)).toBe(false)`
- `expect( page.locator('.pause-sites-scroll .mission-item.is-mission').first(), ).toBeVisible()`
- `expect(errors).toEqual([])`

Helper guard closure: [boot](#globe-spec-ts-26-boot), [globeReady](#globe-spec-ts-37-globeready).

Helper call bindings: `boot(page, '/?tile=titanic&globe=1')`; `globeReady(page)`.

<a id="a205"></a>

**Contract A205 (globe.spec.ts:L153)** — 'Enter on the Titanic pin starts the Titanic mission'.

- `expect(page.locator('.globe:not(.is-embedded) .globe-card')).toContainText('MISSION')`
- `expect(url.searchParams.get('mission')).toBe('titanic')`
- `expect(url.searchParams.get('globe')).toBeNull()`
- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForURL(/[?&]mission=titanic\b/)`.

Helper guard closure: [boot](#globe-spec-ts-26-boot), [globeReady](#globe-spec-ts-37-globeready), [tabToPin](#globe-spec-ts-69-tabtopin).

Helper call bindings: `boot(page, '/?tile=lost-city&globe=1')`; `globeReady(page)`; `tabToPin(page, 'titanic')`.

<a id="a206"></a>

**Contract A206 (globe.spec.ts:L166)** — 'axe finds no violations on the open globe'.

- `expect(page.locator('.globe:not(.is-embedded) .globe-card')).toBeVisible()`
- ``expect(axe.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([])``

Helper guard closure: [boot](#globe-spec-ts-26-boot), [globeReady](#globe-spec-ts-37-globeready).

Helper call bindings: `boot(page, '/?tile=titanic&globe=1')`; `globeReady(page)`.

### [mission.spec.ts](../../tests/e2e/mission.spec.ts) — missions/modes

6 expanded cases; sum of assigned weights **202.8s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: Some1280×800 event/banner/debrief predicates overlapd-flow; J5 richer partial/optional branch, mission keeps native scans/abort/briefing/camera.

History/provenance scope: **F**, `3aec307` — capability introduced here; no specific failed-before defect located. Origin: `3aec307 game: scan beam, discoveries, field guide, debrief and mission flow`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **B3 mission flow › briefing freezes the game; Enter starts near the site with objectives** — keeps .briefing-title, .briefing-objectives li.is-primary, .briefing-objectives li.is-secondary, .briefing-section.is-hazards li; full list in contract; **67.4s M**; captures **1/0/0**; bug **F `3aec307`**; contract [A207](#a207).
- **B3 mission flow › scan bow and stern -> banner -> surface -> debrief** — keeps .briefing, .obj-progress, .obj-nav-target, .debrief-title, .debrief-kicker, .debrief-btn; full list in contract; **37.9s M**; captures **2/0/0**; bug **F `3aec307`**; contract [A208](#a208).
- **B3 mission flow › the bare start page boots titanic without a docked mission picker** — keeps .briefing, .objectives-panel, body > .mission-select; full list in contract; **6.6s M**; captures **0/0/0**; bug **F `3aec307`**; contract [A209](#a209).
- **fix S: mission failure, framing and modals › crush depth -> HULL FAILURE banner -> "Dive aborted" debrief -> Dive again** — keeps .debrief-title, .debrief-highlight, .debrief-btn, m.state, m.emitted; full list in contract; **65.2s M**; captures **1/0/0**; bug **F `3aec307`**; contract [A210](#a210).
- **fix S: mission failure, framing and modals › briefing traps Tab focus and Escape returns home without starting the dive** — keeps .home-screen; full list in contract; **16.7s M**; captures **0/0/0**; bug **F `3aec307`**; contract [A211](#a211).
- **fix S: mission failure, framing and modals › approaching a scan target does not move the chase camera** — keeps .hud-warning; full list in contract; **9s M**; captures **0/0/0**; bug **F `3aec307`**; contract [A212](#a212).

<a id="a207"></a>

**Contract A207 (mission.spec.ts:L82)** — 'briefing freezes the game; Enter starts near the site with objectives'.

- `expect(briefing).toBeVisible()`
- `expect(page.locator('.briefing-title')).toHaveText('Titanic dive')`
- `expect(page.locator('.briefing-objectives li.is-primary')).toHaveCount(2)`
- `expect(page.locator('.briefing-objectives li.is-secondary')).toHaveCount(2)`
- `expect(page.locator('.briefing-section.is-hazards li')).not.toHaveCount(0)`
- `expect(page.locator('.briefing-section.is-hazards li:visible')).toHaveCount(0)`
- `expect(page.locator('.briefing-memorial')).toBeVisible()`
- `expect(page.locator('.briefing-controls')).toHaveCount(0)`
- `expect(page.locator('.briefing-section.is-hazards li').first()).toBeVisible()`
- `expect(briefing.getByRole('button', { name: 'View controls' })).toHaveCount(0)`
- `expect(page.locator('.briefing-begin')).toHaveText('Begin dive')`
- `expect(page.locator('.objectives-panel')).toBeHidden()`
- `expect(page.locator('body > .mission-select')).toHaveClass(/is-collapsed/)`
- `expect((await missionProbe(page)).state).toBe('briefing')`
- `expect(Math.hypot(during.x - before.x, during.y - before.y, during.z - before.z)).toBeLessThan( 0.01, )`
- `expect(briefing).toBeHidden()`
- `expect(started.state).toBe('diving')`
- `expect(started.emitted).toEqual(['mission:started'])`
- `expect(payload).toEqual({ missionId: 'titanic', tileId: 'titanic' })`
- `expect .poll(async () => { const text = (await page.locator('.hud-value[data-field="depth"]').textContent()) ?? ''; return Number.parseFloat(text.replaceAll(',', '')); }) .toBeGreaterThan(3000)`
- `expect(panel).toBeVisible()`
- `expect(panel.locator('.obj-progress')).toHaveText('0 of 4 objectives · 0 of 2 primary')`
- `expect(panel.locator('.obj-nav-target')).toHaveText('→ BOW SECTION')`
- `expect(off).toBeLessThan(15)`
- `expect(panel.locator('.obj-nav-range')).toHaveText(/RNG (\d{2,3}) m/)`
- `expect(rng).toBeGreaterThanOrEqual(40)`
- `expect(rng).toBeLessThan(700)`
- `expect.poll(async () => (await subPos(page)).y).toBeLessThan(y0 - 1)`
- `expect((await subPos(page)).y).toBeLessThan(y0 - 1)`
- `expect(page.locator('.hud-help')).toHaveCount(0)`
- `expect(page.locator('.hud-sim-speed')).toHaveText('2× SIM SPEED')`
- `expect(sonar.h).toBe(220)`
- `expect(Math.abs(sonar.w / sonar.h - sonar.aspect)).toBeLessThan(0.01)`
- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [boot](#mission-spec-ts-51-boot).

Helper call bindings: `boot(page, '/?mission=titanic')`.

<a id="a208"></a>

**Contract A208 (mission.spec.ts:L193)** — 'scan bow and stern -> banner -> surface -> debrief'.

- `expect(page.locator('.briefing')).toHaveCount(0)`
- `expect((await missionProbe(page)).state).toBe('diving')`
- `expect(m.state).toBe('diving')`
- `expect(m.objectives.find((o) => o.id === 'find-bow')?.complete).toBe(true)`
- `expect(m.emitted).toEqual(['mission:started', 'mission:objective'])`
- `expect(panel.locator('.obj-progress')).toHaveText('1 of 4 objectives · 1 of 2 primary')`
- `expect(panel.locator('.obj-nav-target')).toHaveText('→ STERN SECTION')`
- `expect(m.state).toBe('primaries-complete')`
- `expect(m.emitted.at(-1)).toBe('mission:primaryComplete')`
- `expect(panel.locator('.obj-nav-target')).toContainText('OPTIONAL →')`
- `expect(banner).toBeVisible({ timeout: 10_000 })`
- `expect(debrief).toHaveCount(0)`
- `expect(debrief).toBeVisible()`
- `expect(m.state).toBe('debrief')`
- `expect(m.emitted.slice(-2)).toEqual(['mission:complete', 'mission:ended'])`
- `expect(m.durationS).toBeGreaterThan(3)`
- `expect(debrief.locator('.debrief-title')).toHaveText('Mission complete')`
- `expect(debrief.locator('.debrief-kicker')).toHaveText('TITANIC DIVE')`
- `expect(debrief.locator('.debrief-btn')).toHaveText([ 'Dive sites', 'Keep exploring', 'Journal', 'Dive again', 'Home', ])`
- `expect(debrief.locator('.debrief-highlight')).toHaveText('Scanned Bow section.')`
- `expect(debrief.locator('[data-field="discoveries"] .debrief-value')).toHaveText('2')`
- `expect(page.url()).toContain('mission=titanic')`
- `expect(await page.evaluate(() => sessionStorage.getItem('b3-restart'))).toBe( JSON.stringify([{ missionId: 'titanic' }]), )`
- `expect(errors, errors.join(' | ')).toEqual([])`

Failure guards: `throw new Error('no stern POI');`.

Readiness/temporal predicates: `page.waitForFunction( () => { const g = window.__game as { discovery: { spawnedAt: string | null }; scanner: { view: { candidateId: string | null } }; }; return ( g.discovery.spawnedAt === 'titanic-bow' && g.scanner.view.candidateId === 'titanic-bow' ); }, undefined, { timeout: 15_000 }, )`; `page.waitForFunction( () => (window.__game as { scanner: { view: { candidateId: string | null } } }).scanner.view .candidateId === 'titanic-stern', undefined, { timeout: 10_000 }, )`.

Helper guard closure: [boot](#mission-spec-ts-51-boot), [holdScanUntil](#mission-spec-ts-69-holdscanuntil), [stepScan](#helpers-scan-ts-7-stepscan).

Helper call bindings: `boot(page, '/?mission=titanic&poi=titanic-bow&skipBriefing=1')`; `holdScanUntil(page, 'find-bow')`; `holdScanUntil(page, 'find-stern')`.

<a id="a209"></a>

**Contract A209 (mission.spec.ts:L307)** — 'the bare start page boots titanic without a docked mission picker'.

Navigation: `page.goto('/?mission=titanic')`.

- `expect(await page.evaluate(() => (window.__game as { meta: { id: string } }).meta.id)).toBe( 'titanic', )`
- `expect(page.locator('.briefing')).toHaveCount(0)`
- `expect(page.locator('.objectives-panel')).toHaveCount(0)`
- `expect(page.locator('body > .mission-select')).toBeHidden()`
- `expect(page.locator('.briefing')).toBeVisible({ timeout: 45_000 })`
- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [boot](#mission-spec-ts-51-boot).

Helper call bindings: `boot(page, '/')`.

<a id="a210"></a>

**Contract A210 (mission.spec.ts:L323)** — 'crush depth -> HULL FAILURE banner -> "Dive aborted" debrief -> Dive again'.

- `expect((await missionProbe(page)).state).toBe('diving')`
- `expect(clockAdvance).toBeGreaterThan(1.6)`
- `expect(clockAdvance).toBeLessThan(2.6)`
- `expect(alert).toBeVisible()`
- `expect(alert).toHaveText('HULL FAILURE — EMERGENCY ASCENT')`
- `expect .poll(async () => (await missionProbe(page)).state, { timeout: 120_000 }) .toBe('debrief')`
- `expect(debrief).toBeVisible()`
- `expect(alert).toBeHidden()`
- `expect(debrief).toHaveClass(/is-aborted/)`
- `expect(debrief.locator('.debrief-title')).toHaveText('Dive aborted')`
- `expect(debrief.locator('.debrief-highlight')).toContainText('Hull failure at')`
- `expect(debrief.locator('.debrief-btn')).toHaveText([ 'Dive sites', 'Dive again', 'Journal', 'Home', ])`
- `expect(m.state).toBe('debrief')`
- `expect(m.emitted).toEqual(['mission:started', 'mission:aborted', 'mission:ended'])`
- `expect( await page.evaluate(() => (window as unknown as { __aborted: unknown[] }).__aborted), ).toEqual([{ missionId: 'titanic', reason: 'crush' }])`
- `expect(st.depth).toBeGreaterThan(st.crush)`
- `expect(st.emergencyBlow).toBe(false)`
- `expect(st.frozen).toBe(true)`
- `expect(debrief).toBeVisible()`

Scope: `let i = 0; i < 5`.

- `expect(await page.evaluate(() => !!document.activeElement?.closest('.mission-debrief'))).toBe( true, )`

Scope: unconditional in this body.

- `expect(page.url()).toContain('mission=titanic')`
- `expect(await page.evaluate(() => sessionStorage.getItem('fixs-restart'))).toBe( JSON.stringify([{ missionId: 'titanic' }]), )`
- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [boot](#mission-spec-ts-51-boot).

Helper call bindings: `boot(page, '/?mission=titanic&skipBriefing=1')`.

<a id="a211"></a>

**Contract A211 (mission.spec.ts:L447)** — 'briefing traps Tab focus and Escape returns home without starting the dive'.

- `expect(briefing).toBeVisible()`

Scope: `let i = 0; i < 4`.

- `expect(await page.evaluate(() => !!document.activeElement?.closest('.briefing'))).toBe(true)`

Scope: unconditional in this body.

- `expect(await page.evaluate(() => !!document.activeElement?.closest('.briefing'))).toBe(true)`
- `expect(briefing).toBeHidden()`
- `expect((await missionProbe(page)).state).toBe('briefing')`
- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(briefing).toBeHidden()`
- `expect((await missionProbe(page)).state).toBe('diving')`
- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [boot](#mission-spec-ts-51-boot).

Helper call bindings: `boot(page, '/?mission=titanic')`.

<a id="a212"></a>

**Contract A212 (mission.spec.ts:L472)** — 'approaching a scan target does not move the chase camera'.

- `expect(Math.hypot(offset.x, offset.y, offset.z)).toBeGreaterThan(90)`
- `expect(offset.x).toBeCloseTo(-offset.chaseBack * Math.sin(offset.yaw), 1)`
- `expect(offset.z).toBeCloseTo(offset.chaseBack * Math.cos(offset.yaw), 1)`
- `expect(page.locator('.hud-warning')).toBeHidden()`
- `expect(errors, errors.join(' | ')).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction( () => (window.__game as { scanner: { view: { candidateId: string | null } } }).scanner.view .candidateId === 'titanic-bow', undefined, { timeout: 15_000 }, )`.

Helper guard closure: [boot](#mission-spec-ts-51-boot).

Helper call bindings: `boot(page, '/?mission=titanic&poi=titanic-bow&skipBriefing=1')`.

### [presets.spec.ts](../../tests/e2e/presets.spec.ts) — rendering/visual

11 expanded cases; sum of assigned weights **396.5s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `cc2cfbc` — capability introduced here; no specific failed-before defect located. Origin: `cc2cfbc core: base-URL fix (C6), wire presets (C3), Lost City pack`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **vent enters and compiles its preset shader** — keeps state.active, state.source, state.stats.draws; full list in contract; **29.8s M**; captures **1/0/0**; bug **F `cc2cfbc`**; contract [A213](#a213).
- **reef enters and compiles its preset shader** — keeps state.active, state.source, state.stats.draws; full list in contract; **20.9s M**; captures **1/0/0**; bug **F `cc2cfbc`**; contract [A213](#a213).
- **canyon enters and compiles its preset shader** — keeps state.active, state.source, state.stats.draws; full list in contract; **41.4s M**; captures **1/0/0**; bug **F `cc2cfbc`**; contract [A213](#a213).
- **brine enters and compiles its preset shader** — keeps state.active, state.source, state.stats.draws; full list in contract; **11.2s M**; captures **1/0/0**; bug **F `cc2cfbc`**; contract [A213](#a213).
- **wreck enters and compiles its preset shader** — keeps state.active, state.source, state.stats.draws; full list in contract; **18.9s M**; captures **1/0/0**; bug **F `cc2cfbc`**; contract [A213](#a213).
- **trench enters and compiles its preset shader** — keeps state.active, state.source, state.stats.draws; full list in contract; **25.2s M**; captures **1/0/0**; bug **F `cc2cfbc`**; contract [A213](#a213).
- **seamount enters and compiles its preset shader** — keeps state.active, state.source, state.stats.draws; full list in contract; **14.9s M**; captures **1/0/0**; bug **F `cc2cfbc`**; contract [A213](#a213).
- **default enters and compiles its preset shader** — keeps state.active, state.source, state.stats.draws; full list in contract; **17.1s M**; captures **1/0/0**; bug **F `cc2cfbc`**; contract [A213](#a213).
- **low tier keeps canyon physics without preset geometry** — keeps state.active).toBe('canyon'); state.stats).toEqual({ draws: 0, particles: 0, lights: 0 }); state.speed).toBeGreaterThan(0); **93.6s M**; captures **0/0/0**; bug **F `cc2cfbc`**; contract [A214](#a214).
- **a frozen frame does not apply canyon current to sub velocity** — keeps result.current).toBeGreaterThan(0); result.unchanged).toBe(true); **100.7s M**; captures **0/0/0**; bug **F `cc2cfbc`**; contract [A215](#a215).
- **Lost City uses clear carbonate flow without smoke or glow in a free dive** — keeps state).toEqual({ active: 'vent', source: 'mission', fluid: 'carbonate', draws: 1, lights: 0, smoke: null, }); errors).toEqual([]); **22.8s M**; captures **1/0/0**; bug **F `cc2cfbc`**; contract [A216](#a216).

<a id="a213"></a>

**Contract A213 (presets.spec.ts:L81)** — `${name} enters and compiles its preset shader`.

Row expansion: `const { name, url, draws, source } of [ { name: 'vent', url: '/?tile=titanic&landmark=_test&preset=vent&at=41.730662,-49.949157&depth=3790', draws: 2, source: 'param', }, { name: 'reef', url: '/?tile=great-blue-hole&preset=reef&depth=20', draws: 1, source: 'param', }, { name: 'canyon', url: '/?tile=monterey-canyon&preset=canyon', draws: 1, source: 'param', }, { name: 'brine', url: '/?tile=titanic&preset=brine&depth=3790', draws: 2, source: 'param', }, { name: 'wreck', url: '/?tile=titanic&preset=wreck&depth=3790', draws: 3, // Titanic's backdrop plus wreck haze and rust motes. source: 'param', }, { name: 'trench', url: '/?tile=challenger-deep&preset=trench&depth=10000', draws: 0, source: 'param', }, { name: 'seamount', url: '/?tile=lost-city&preset=seamount&at=30.124,-42.1195&depth=780', draws: 0, source: 'param', }, { name: 'default', url: '/?tile=titanic&preset=default', draws: 0, source: 'param', }, ]`.

Navigation: ``page.goto(`${url}&tier=medium`, { waitUntil: 'domcontentloaded' })``.

- `expect(state.active).toBe(name)`
- `expect(state.source).toBe(source)`

Scope: `if name === 'vent'`.

- `expect(state.stats.draws).toBeGreaterThanOrEqual(draws)`
- `expect(state.stats.draws).toBeLessThanOrEqual(draws + 1)`

Scope: `else of name === 'vent'`.

- `expect(state.stats.draws).toBe(draws)`

Scope: unconditional in this body.

- `expect(errors).toEqual([])`

Helper guard closure: [waitForPreset](#presets-spec-ts-3-waitforpreset).

Helper call bindings: `waitForPreset(page)`.

<a id="a214"></a>

**Contract A214 (presets.spec.ts:L120)** — 'low tier keeps canyon physics without preset geometry'.

Navigation: `page.goto('/?tile=monterey-canyon&preset=canyon&tier=low', { waitUntil: 'domcontentloaded', })`.

- `expect(state.active).toBe('canyon')`
- `expect(state.stats).toEqual({ draws: 0, particles: 0, lights: 0 })`
- `expect(state.speed).toBeGreaterThan(0)`

Helper guard closure: [waitForPreset](#presets-spec-ts-3-waitforpreset), [enableCurrents](#presets-spec-ts-12-enablecurrents).

Helper call bindings: `waitForPreset(page)`; `enableCurrents(page)`.

<a id="a215"></a>

**Contract A215 (presets.spec.ts:L143)** — 'a frozen frame does not apply canyon current to sub velocity'.

Navigation: `page.goto('/?tile=monterey-canyon&preset=canyon', { waitUntil: 'domcontentloaded' })`.

- `expect(result.current).toBeGreaterThan(0)`
- `expect(result.unchanged).toBe(true)`

Helper guard closure: [waitForPreset](#presets-spec-ts-3-waitforpreset), [enableCurrents](#presets-spec-ts-12-enablecurrents).

Helper call bindings: `waitForPreset(page)`; `enableCurrents(page)`.

<a id="a216"></a>

**Contract A216 (presets.spec.ts:L178)** — 'Lost City uses clear carbonate flow without smoke or glow in a free dive'.

Navigation: `page.goto('/?tile=lost-city&at=30.124,-42.1195&depth=780&tier=medium', { waitUntil: 'domcontentloaded', })`.

- `expect(state).toEqual({ active: 'vent', source: 'mission', fluid: 'carbonate', draws: 1, lights: 0, smoke: null, })`
- `expect(errors).toEqual([])`

Helper guard closure: [waitForPreset](#presets-spec-ts-3-waitforpreset).

Helper call bindings: `waitForPreset(page)`.

### [props.spec.ts](../../tests/e2e/props.spec.ts) — rendering/visual

3 expanded cases; sum of assigned weights **160.7s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `40af5c7` — capability introduced here; no specific failed-before defect located. Origin: `40af5c7 world: prop pipeline with procedural placeholders and GLB loading`.

Profile/skip controls (variables expanded by rows below): .

Selector/fixture constants: `views: Array<[string, string]> = [ ['bow-from-south', '41.73096,-49.94694,0'], // sees the bow's torn aft end ['bow-from-north', '41.73404,-49.94694,180'], // sees the prow head-on ['stern-from-north', '41.72775,-49.94801,190'], // sees the rounded counter stern ['stern-from-south', '41.72503,-49.94865,10'], // sees the stern's torn forward end ]`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **B4 props › loads the fixture props, lights them, and logs no errors** — keeps probe.stats.count, probe.stats.models, probe.stats.procedural, probe.stats.failed, probe.stats.skipped; full list in contract; **25.2s M**; captures **1/0/0**; bug **F `40af5c7`**; contract [A217](#a217).
- **B4 props › Titanic hull ends read differently: prow, torn end, counter stern** — keeps probe.stats.failed; full list in contract; **91.6s M**; captures **8/0/0**; bug **F `40af5c7`**; contract [A218](#a218).
- **B4 props › ?debugProps=1 selects, nudges and rotates a prop and prints its JSON** — keeps li; full list in contract; **43.9s M**; captures **1/0/0**; bug **F `40af5c7`**; contract [A219](#a219).

<a id="a217"></a>

**Contract A217 (props.spec.ts:L52)** — 'loads the fixture props, lights them, and logs no errors'.

Navigation: `page.goto(URL, { waitUntil: 'domcontentloaded' })`.

- `expect(probe.stats.count).toBe(5)`
- `expect(probe.stats.models).toBe(2)`
- `expect(probe.stats.procedural).toBe(3)`
- `expect(probe.stats.failed).toBe(0)`
- `expect(probe.stats.skipped).toBe(0)`
- `expect(evt?.count).toBe(5)`
- `expect(await page.evaluate(() => (window.__game!.headlights as { on: boolean }).on)).toBe(true)`
- `expect(visible).toBeGreaterThanOrEqual(3)`
- `expect(pushed).toBe(true)`
- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [waitForProps](#props-spec-ts-38-waitforprops).

Helper call bindings: `waitForProps(page)`.

<a id="a218"></a>

**Contract A218 (props.spec.ts:L120)** — 'Titanic hull ends read differently: prow, torn end, counter stern'.

Navigation: ``page.goto(`/?tile=titanic&landmark=titanic&depth=3780&debugTerrain=0&at=${at}`, { waitUntil: 'domcontentloaded', })``.

Scope: `const [name, at] of views`.

- `expect(probe.stats.failed).toBe(0)`
- `expect(ends['bow-hull']).toEqual(['prow', 'cut'])`
- `expect(ends['stern-hull']).toEqual(['cut', 'rounded'])`
- `expect(full).toBeGreaterThanOrEqual(1)`

Scope: unconditional in this body.

- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [waitForProps](#props-spec-ts-38-waitforprops).

Helper call bindings: `waitForProps(page)`.

<a id="a219"></a>

**Contract A219 (props.spec.ts:L162)** — '?debugProps=1 selects, nudges and rotates a prop and prints its JSON'.

Navigation: ``page.goto(`${URL}&debugProps=1`, { waitUntil: 'domcontentloaded' })``.

- `expect(panel).toBeVisible()`
- `expect(panel.locator('li')).toHaveCount(5)`
- `expect(json).toContainText('"id": "_test-hull"')`
- `expect .poll(async () => JSON.parse((await json.textContent()) ?? '{}').heading_deg) .toBe(before.heading_deg + 5)`
- `expect(after.lat - before.lat).toBeCloseTo(10 / 111320, 6)`
- `expect(Math.abs(subZAfter - subZ)).toBeLessThan(1)`
- `expect(errors, errors.join(' | ')).toEqual([])`

Helper guard closure: [waitForProps](#props-spec-ts-38-waitforprops).

Helper call bindings: `waitForProps(page)`.

### [settings.spec.ts](../../tests/e2e/settings.spec.ts) — save

7 expanded cases; sum of assigned weights **370.4s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `7ebf78e` — capability introduced here; no specific failed-before defect located. Origin: `7ebf78e core: C5 settings screen, save wiring and accessibility`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **settings screen › Pause settings freezes; changes apply and persist; conflicts survive reload** — keeps [data-action=, .settings-status, .hud-help, p.reduceMotion, p.captions, p.palette; full list in contract; **88.9s M**; captures **1/0/0**; bug **F `7ebf78e`**; contract [A220](#a220).
- **settings screen › Controls view opens from Settings; focus stays inside; no axe violations** — keeps 'Controls view opens from Settings; focus stays inside; no axe violations'; full list in contract; **101.5s M**; captures **0/0/0**; bug **F `7ebf78e`**; contract [A221](#a221).
- **settings screen › briefing returns home on Escape; Settings opens from pause after the dive begins** — keeps .briefing, .home-screen, .pause-menu; full list in contract; **29.4s M**; captures **0/0/0**; bug **F `7ebf78e`**; contract [A222](#a222).
- **settings screen › reset discoveries confirms, preserves other saves, and refreshes this dive** — keeps saved.discoveries, saved.settings, saved.bindings, saved.keys; full list in contract; **75.1s M**; captures **1/0/0**; bug **F `7ebf78e`**; contract [A223](#a223).
- **settings screen › Apply and reload uses saved boot settings and respects the tier URL override** — keeps button; full list in contract; **49.3s M**; captures **1/0/0**; bug **F `7ebf78e`**; contract [A224](#a224).
- **settings screen › reset reports protected and inaccessible discovery storage honestly** — keeps .settings-status; full list in contract; **16.9s M**; captures **0/0/0**; bug **F `7ebf78e`**; contract [A225](#a225).
- **settings screen › protected settings cannot be offered as a reloadable change** — keeps button, .settings-reload-note, .settings-status; full list in contract; **9.3s M**; captures **0/0/0**; bug **F `7ebf78e`**; contract [A226](#a226).

<a id="a220"></a>

**Contract A220 (settings.spec.ts:L75)** — 'Pause settings freezes; changes apply and persist; conflicts survive reload'.

- `expect(dialog).toBeHidden()`
- `expect(dialog).toBeVisible()`
- `expect((await probe(page)).open).toBe(true)`
- `expect(await subPos(page)).toEqual(before)`
- `expect(p.reduceMotion).toBe(true)`
- `expect(p.captions).toBe(true)`
- `expect(p.palette).toBe('highContrast')`
- `expect(dialog.locator('[data-action="thrustForward"]')).toHaveText('Press a key…')`
- `expect(dialog.locator('[data-action="boost"]')).toContainText('Shift')`
- `expect(dialog.locator('.settings-status')).toContainText('removed from Boost')`
- `expect(p.ahead).toEqual(['ShiftLeft', 'ArrowUp'])`
- `expect(p.boost).toEqual(['ShiftRight'])`
- `expect(dialog).toBeHidden()`
- `expect((await probe(page)).open).toBe(false)`
- `expect(p).toMatchObject({ open: false, reduceMotion: true, captions: true, palette: 'highContrast', boost: ['ShiftRight'], ahead: ['ShiftLeft', 'ArrowUp'], })`
- `expect(page.locator('.hud-help')).toHaveCount(0)`
- `expect .poll(() => page.evaluate(() => (window.__game as { rig: { mode: string } }).rig.mode)) .toBe('first-person')`
- `expect(errors).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

Helper guard closure: [boot](#settings-spec-ts-23-boot).

Helper call bindings: `boot(page, '/?tile=titanic')`.

<a id="a221"></a>

**Contract A221 (settings.spec.ts:L141)** — 'Controls view opens from Settings; focus stays inside; no axe violations'.

- `expect(dialog).toBeVisible()`
- `expect(dialog.getByText('Drag on the dive view')).toBeVisible()`
- `expect(inside).toBe(true)`
- ``expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])``
- `expect(dialog).toBeHidden()`

Helper guard closure: [boot](#settings-spec-ts-23-boot).

Helper call bindings: `boot(page, '/?tile=titanic')`.

<a id="a222"></a>

**Contract A222 (settings.spec.ts:L163)** — 'briefing returns home on Escape; Settings opens from pause after the dive begins'.

- `expect(page.locator('.briefing')).toBeVisible()`
- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(page.locator('.pause-menu')).toBeHidden()`
- `expect(page.locator('.briefing')).toBeHidden()`
- `expect(dialog).toBeVisible()`
- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(dialog).toBeHidden()`
- `expect(page.locator('.pause-menu')).toBeVisible()`

Helper guard closure: [boot](#settings-spec-ts-23-boot).

Helper call bindings: `boot(page, '/?mission=titanic')`.

<a id="a223"></a>

**Contract A223 (settings.spec.ts:L186)** — 'reset discoveries confirms, preserves other saves, and refreshes this dive'.

- `expect( await page.evaluate(() => (window.__game as { discoveries: { keys(): string[] } }).discoveries.keys(), ), ).toContain('titanic/test')`
- `expect( await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1')), ).not.toBeNull()`
- `expect( await page.evaluate(() => localStorage.getItem('subexplorer.bindings.v1')), ).not.toBeNull()`
- `expect(dialog).toContainText('Your settings and key bindings stay saved')`
- ``expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])``
- `expect( await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1')), ).not.toBeNull()`
- `expect(new URL(page.url()).search).toBe('?mission=titanic&skipBriefing=1')`
- `expect(saved.discoveries).toBeNull()`
- `expect(saved.settings).toContain('reduceMotion')`
- `expect(saved.bindings).toContain('toggleSettings')`
- `expect(saved.keys).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [boot](#settings-spec-ts-23-boot).

Helper call bindings: `boot(page, '/?mission=titanic&skipBriefing=1')`.

<a id="a224"></a>

**Contract A224 (settings.spec.ts:L265)** — 'Apply and reload uses saved boot settings and respects the tier URL override'.

- `expect(dialog.getByRole('button', { name: 'Apply and reload' })).toBeHidden()`
- `expect(new URL(page.url()).search).toBe('?tile=challenger-deep&tier=low')`
- `expect(applied).toEqual({ detail: 0.5, speed: 2, savedTier: 'high' })`
- `expect(dialog.getByRole('button', { name: 'Apply and reload' })).toBeHidden()`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [boot](#settings-spec-ts-23-boot).

Helper call bindings: `boot(page, '/?tile=challenger-deep&tier=low')`.

<a id="a225"></a>

**Contract A225 (settings.spec.ts:L300)** — 'reset reports protected and inaccessible discovery storage honestly'.

- `expect(dialog.locator('.settings-status')).toContainText('newer version')`
- `expect(await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe( newer, )`
- `expect(dialog.locator('.settings-status')).toContainText('newer version')`
- `expect(await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1'))).toBe( newer, )`
- `expect(dialog.locator('.settings-status')).toContainText('Nothing was reset')`
- `expect( await page.evaluate(() => localStorage.getItem('subexplorer.discoveries.v1')), ).not.toBeNull()`

Failure guards: `throw new Error('denied');`.

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction(() => window.__gameReady === true)`; `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [boot](#settings-spec-ts-23-boot).

Helper call bindings: `boot(page, '/')`.

<a id="a226"></a>

**Contract A226 (settings.spec.ts:L362)** — 'protected settings cannot be offered as a reloadable change'.

- `expect(dialog.getByRole('button', { name: 'Apply and reload' })).toBeHidden()`
- `expect(dialog.locator('.settings-reload-note')).toContainText('newer version')`
- `expect(dialog.locator('.settings-status')).toContainText( 'newer saved version was left intact', )`
- `expect(await page.evaluate(() => localStorage.getItem('subexplorer.settings.v2'))).toBe(newer)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true)`.

Helper guard closure: [boot](#settings-spec-ts-23-boot).

Helper call bindings: `boot(page, '/')`.

### [smoke.spec.ts](../../tests/e2e/smoke.spec.ts) — other

3 expanded cases; sum of assigned weights **79.2s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `b712ec6` — capability introduced here; no specific failed-before defect located. Origin: `b712ec6 Initial commit`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **plain root opens the home shell** — keeps locator('.home-screen')).toBeVisible(); locator('.home-screen h1')).toHaveText('Bathyline'); locator('.pause-menu')).toBeHidden(); **3s M**; captures **0/0/0**; bug **F `b712ec6`**; contract [A227](#a227).
- **boots on "titanic", renders the seafloor, and logs no errors** — keeps .fatal; full list in contract; **19.4s M**; captures **2/0/0**; bug **F `b712ec6`**; contract [A228](#a228).
- **boots on "monterey-canyon", renders the seafloor, and logs no errors** — keeps .fatal; full list in contract; **56.8s M**; captures **2/0/0**; bug **F `b712ec6`**; contract [A228](#a228).

<a id="a227"></a>

**Contract A227 (smoke.spec.ts:L22)** — 'plain root opens the home shell'.

Navigation: `page.goto('/', { waitUntil: 'domcontentloaded' })`.

- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(page.locator('.home-screen h1')).toHaveText('Bathyline')`
- `expect(page.locator('.pause-menu')).toBeHidden()`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

<a id="a228"></a>

**Contract A228 (smoke.spec.ts:L31)** — `boots on "${TILE}", renders the seafloor, and logs no errors`.

Row expansion: `const TILE of TILES`.

Navigation: ``page.goto(`/?tile=${TILE}`, { waitUntil: 'domcontentloaded' })``.

- `expect(depth).toMatch(/\d+\s*m/)`
- `expect(page.locator('.fatal')).toHaveCount(0)`
- `expect(await page.evaluate(() => window.__gameError ?? null)).toBeNull()`
- ``expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([])``
- ``expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([])``
- `expect(chunks).toBeGreaterThan(0)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

### [sub-playtest.spec.ts](../../tests/e2e/sub-playtest.spec.ts) — other

7 expanded cases; sum of assigned weights **164.6s**, 0 fallback keys. Disposition: **retain ordinary capability guard**.

Overlap: No exact same-selector/measure × viewport/site/state duplicate established. Survivor: this capability contract; broad shared boot/visibility/error checks do not replace its stated behavior.

History/provenance scope: **F**, `918eea9` — flight/camera behavior; no specific reproduced defect located for this declaration. Origin: `b712ec6 Initial commit`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **A3 submarine feel › scripted flight: thrust, coast, turn, ballast, camera, sim speed** — keeps 'scripted flight: thrust, coast, turn, ballast, camera, sim speed'; full list in contract; **82.6s M**; captures **2/0/0**; bug **F `918eea9`**; contract [A229](#a229).
- **A3 submarine feel › after turning to ~090 the chase camera sits west of the boat, behind it** — keeps r.heading).toBeGreaterThan(60); r.heading).toBeLessThan(135); r.fwd.x).toBeGreaterThan(0.4); r.camX).toBeLessThan(r.subX); r.lookDotFwd).toBeGreaterThan(0.8); **16.3s M**; captures **0/0/0**; bug **F `918eea9`**; contract [A230](#a230).
- **A3 submarine feel › flying into the seabed pushes out and never clips** — keeps p.altitude).toBeGreaterThan(0); Number.isFinite(p.depth)).toBe(true); p.cameraY).toBeGreaterThan(p.groundUnderCamera); **10.5s M**; captures **0/0/0**; bug **F `918eea9`**; contract [A231](#a231).
- **A3 submarine feel › crush depth fires an emergency blow and locks the controls** — keeps blown).toBe(true); during.emergencyBlow).toBe(true); during.hullStress).toBeGreaterThan(0.5); after.depth).toBeGreaterThan(during.depth); **6.5s M**; captures **0/0/0**; bug **F `918eea9`**; contract [A232](#a232).
- **fix S: free-dive loadout and spawn › QA-B #2: deep tiles fit a hull rated for them; no breach at spawn** — keeps s.hullClass, tile).toBe(cls); s.hullBreached, tile).toBe(false); s.emergencyBlow, tile).toBe(false); line).toContain(`hull ${cls}`); line).toContain('at rating limit'); **18.1s M**; captures **0/0/0**; bug **R `a16840f`**; contract [A233](#a233).
- **fix S: free-dive loadout and spawn › QA-B #3: shallow tile centres spawn submerged over deep water; ?depth= is honoured** — keeps 'QA-B #3: shallow tile centres spawn submerged over deep water; ?depth= is honoured'; full list in contract; **25.5s M**; captures **1/0/0**; bug **R `a16840f`**; contract [A234](#a234).
- **fix S: free-dive loadout and spawn › QA-B #13: an unknown ?tile= boots the default tile with a warning** — keeps locator('.fatal')).toHaveCount(0); (await subInfo(page)).tile).toBe('titanic'); warnings.some((w) => w.includes('does-not-exist'))).toBe(true); **5.1s M**; captures **0/0/0**; bug **R `a16840f`**; contract [A235](#a235).

<a id="a229"></a>

**Contract A229 (sub-playtest.spec.ts:L89)** — 'scripted flight: thrust, coast, turn, ballast, camera, sim speed'.

Navigation: `page.goto('/?tile=titanic&depth=3700', { waitUntil: 'domcontentloaded' })`.

- `expect(start.speed).toBeLessThan(1)`
- `expect(start.headingDeg).toBeCloseTo(0, 1)`
- `expect(cruising.speed).toBeGreaterThan(3)`
- `expect(cruising.z).toBeLessThan(start.z - 10)`
- `expect.poll(async () => (await probe(page)).speed).toBeLessThan(cruising.speed * 0.5)`
- `expect(coasted.speed).toBeLessThan(cruising.speed * 0.5)`
- `expect .poll(async () => { const s = await probe(page); const turned = ((s.headingDeg - cruising.headingDeg + 540) % 360) - 180; return turned > 10 && s.roll < -0.05; }) .toBe(true)`
- `expect(turned).toBeGreaterThan(10)`
- `expect(turning.roll).toBeLessThan(-0.05)`
- `expect.poll(async () => (await probe(page)).headingDeg).not.toBe(turning.headingDeg)`
- `expect(coastingTurn.headingDeg).not.toBe(turning.headingDeg)`
- `expect(dived.depth).toBeLessThan(beforeDive.depth - 3)`
- `expect((await probe(page)).depth).toBeGreaterThan(dived.depth)`
- `expect((await probe(page)).cameraMode).toBe('chase')`
- `expect.poll(async () => (await probe(page)).cameraMode).toBe('first-person')`
- `expect((await probe(page)).cameraMode).toBe('first-person')`
- `expect.poll(async () => (await probe(page)).cameraMode).toBe('chase')`
- `expect((await probe(page)).cameraMode).toBe('chase')`
- `expect((await probe(page)).simSpeed).toBe(1)`
- `expect.poll(async () => (await probe(page)).simSpeed).toBe(2)`
- `expect((await probe(page)).simSpeed).toBe(2)`
- `expect.poll(async () => (await probe(page)).simSpeed).toBe(3)`
- `expect.poll(async () => (await probe(page)).simSpeed).toBe(1)`
- `expect((await probe(page)).simSpeed).toBe(1)`
- `expect(consoleErrors, consoleErrors.join(' | ')).toEqual([])`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

Helper guard closure: [holdUntil](#sub-playtest-spec-ts-75-holduntil).

Helper call bindings: `holdUntil(page, ['w'], (s) => s.speed > 3 && s.z < start.z - 10)`; `holdUntil(page, ['w'], (s) => s.speed > 3)`; `holdUntil(page, ['c'], (s) => s.depth < beforeDive.depth - 3)`; `holdUntil(page, [' '], (s) => s.depth > dived.depth)`.

<a id="a230"></a>

**Contract A230 (sub-playtest.spec.ts:L177)** — 'after turning to ~090 the chase camera sits west of the boat, behind it'.

Navigation: `page.goto('/?tile=titanic&depth=3700', { waitUntil: 'domcontentloaded' })`.

- `expect(r.heading).toBeGreaterThan(60)`
- `expect(r.heading).toBeLessThan(135)`
- `expect(r.fwd.x).toBeGreaterThan(0.4)`
- `expect(r.camX).toBeLessThan(r.subX)`
- `expect(r.lookDotFwd).toBeGreaterThan(0.8)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`; `page.waitForFunction( () => { const g = window.__game as { sub: { getState(): { headingDeg: number } } }; const h = g.sub.getState().headingDeg; return h > 75 && h < 180; }, undefined, { timeout: 60_000 }, )`; `page.waitForFunction( () => { const g = window.__game as { sub: { yawRate: number; position: { x: number } }; rig: { camera: { position: { x: number } } }; }; return Math.abs(g.sub.yawRate) < 0.01 && g.rig.camera.position.x < g.sub.position.x; }, undefined, { timeout: 60_000 }, )`.

<a id="a231"></a>

**Contract A231 (sub-playtest.spec.ts:L237)** — 'flying into the seabed pushes out and never clips'.

Navigation: `page.goto('/?tile=titanic', { waitUntil: 'domcontentloaded' })`.

- `expect(p.altitude).toBeGreaterThan(0)`
- `expect(Number.isFinite(p.depth)).toBe(true)`
- `expect(p.cameraY).toBeGreaterThan(p.groundUnderCamera)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

<a id="a232"></a>

**Contract A232 (sub-playtest.spec.ts:L266)** — 'crush depth fires an emergency blow and locks the controls'.

Navigation: `page.goto('/?tile=titanic', { waitUntil: 'domcontentloaded' })`.

- `expect(blown).toBe(true)`
- `expect(during.emergencyBlow).toBe(true)`
- `expect(during.hullStress).toBeGreaterThan(0.5)`
- `expect(after.depth).toBeGreaterThan(during.depth)`

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`.

<a id="a233"></a>

**Contract A233 (sub-playtest.spec.ts:L350)** — 'QA-B #2: deep tiles fit a hull rated for them; no breach at spawn'.

Scope: `const [tile, cls] of [ ['bismarck', 'B'], ['challenger-deep', 'C'], ['titanic', 'B'], ] as const`.

- `expect(s.hullClass, tile).toBe(cls)`
- `expect(s.hullBreached, tile).toBe(false)`
- `expect(s.emergencyBlow, tile).toBe(false)`
- ``expect(line).toContain(`hull ${cls}`)``

Scope: `const [tile, cls] of [ ['bismarck', 'B'], ['challenger-deep', 'C'], ['titanic', 'B'], ] as const; if tile === 'challenger-deep'`.

- `expect(line).toContain('at rating limit')`

Helper guard closure: [bootTile](#sub-playtest-spec-ts-306-boottile).

Helper call bindings: ``bootTile(page, `/?tile=${tile}`)``.

<a id="a234"></a>

**Contract A234 (sub-playtest.spec.ts:L368)** — 'QA-B #3: shallow tile centres spawn submerged over deep water; ?depth= is honoured'.

- `expect(gbh.y).toBeLessThanOrEqual(-gbh.hullRadius + 1e-6)`
- `expect(gbh.altitude).toBeGreaterThan(25)`
- `expect(gbh.y).toBeLessThan(-gbh.hullRadius - 5)`
- `expect(gbh.depthText).toMatch(/^\d+ m$/)`
- `expect(ht.y).toBeCloseTo(-30, 0)`

Helper guard closure: [bootTile](#sub-playtest-spec-ts-306-boottile).

Helper call bindings: `bootTile(page, '/?tile=great-blue-hole')`; `bootTile(page, '/?tile=hunga-tonga-caldera&depth=30')`.

<a id="a235"></a>

**Contract A235 (sub-playtest.spec.ts:L387)** — 'QA-B #13: an unknown ?tile= boots the default tile with a warning'.

- `expect(page.locator('.fatal')).toHaveCount(0)`
- `expect((await subInfo(page)).tile).toBe('titanic')`
- `expect(warnings.some((w) => w.includes('does-not-exist'))).toBe(true)`

Helper guard closure: [bootTile](#sub-playtest-spec-ts-306-boottile).

Helper call bindings: `bootTile(page, '/?tile=does-not-exist')`.

### [visual-qa.spec.ts](../../tests/e2e/visual-qa.spec.ts) — rendering/visual

14 expanded cases; sum of assigned weights **630.0s**, 14 fallback keys. Disposition: **split: numeric/functional guards ordinary; review captures nightly**.

Overlap: Safe approach/errors partly overlapvisual-fixes; ordinary extracted collision/render guard survives exact QA poses; capturesnightly; east pose unique.

History/provenance scope: **F**, `1835dd4` — capability introduced here; no specific failed-before defect located. Origin: `1835dd4 docs: F-VISUAL-QA all-site visual review and screenshot spec`.

Profile/skip controls (variables expanded by rows below): `test.use({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, // Also remove the CI config's saved low-tier preference. storageState: { cookies: [], origins: [] }, })`; `test.skip(env.VISUAL_QA !== '1', 'Enable with VISUAL_QA=1 to collect site review images.')`.

Selector/fixture constants: `heroes: Record<string, string> = { titanic: 'bow-hull', 'challenger-deep': 'north-wall-scarp', 'lost-city': 'poseidon-tower', 'monterey-canyon': 'canyon-wall-ledge', endurance: 'main-hull', 'axial-seamount-ashes': 'mushroom-chimney', 'hudson-canyon': 'coral-ledge-mound', kamaehuakanaloa: 'hiolo-north-chimney-1', 'beebe-vent-field': 'beebe-chimney-1', 'great-blue-hole': 'karst-grotto', bismarck: 'main-hull', 'hunga-tonga-caldera': 'caldera-tuff-wall', 'blake-plateau-corals': 'lophelia-mound', }`.

Expanded tests (weight in hosted seconds; `M` exact, `F` fallback; captures P/L/I):

- **Phase F visual QA › titanic: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › challenger-deep: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › lost-city: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › monterey-canyon: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › endurance: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › axial-seamount-ashes: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › hudson-canyon: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › kamaehuakanaloa: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › beebe-vent-field: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › great-blue-hole: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › bismarck: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › hunga-tonga-caldera: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › blake-plateau-corals: spawn, hero approach, hero detail** — keeps probe.tile, probe.landmark, probe.draws, probe.failedProps; full list in contract; **45s F**; captures **3/0/0 enabled**; bug **F `1835dd4`**; contract [A236](#a236); requires VISUAL_QA=1.
- **Phase F visual QA › great-blue-hole: authored east grotto close** — keeps clearance.blocked, clearance.eyeBlocked, clearance.floor, clearance.underwater, clearance.failedProps; full list in contract; **45s F**; captures **1/0/0 enabled**; bug **F `1835dd4`**; contract [A237](#a237); requires VISUAL_QA=1.

<a id="a236"></a>

**Contract A236 (visual-qa.spec.ts:L80)** — `${id}: spawn, hero approach, hero detail`.

Row expansion: `const id of landmarkIndex.landmarks`.

Navigation: ``page.goto(`/?tile=${id}&skipBriefing=1`, { waitUntil: 'domcontentloaded', timeout: 120_000, })``.

- ``expect(heroId, `Add a hero mapping for ${id}`).toBeTruthy()``
- `expect(probe.tile).toBe(id)`
- `expect(probe.landmark).toBe(id)`
- `expect(probe.draws).toBeGreaterThan(0)`
- `expect(probe.failedProps).toBe(0)`
- `expect(errors).toEqual([])`

Failure guards: ``throw new Error(`Missing hero ${propId}; props: ${g.props.debugString()}`);``; ``throw new Error(`Empty hero bounds: ${propId}`);``; ``throw new Error(`No collision-free 40/15 m approach for ${propId}`);``.

Readiness/temporal predicates: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 120_000, })`; `page.waitForFunction( () => { const g = window.__game as unknown as Game | undefined; return g?.props.loaded && g.discovery.loaded; }, undefined, { timeout: 90_000 }, )`.

<a id="a237"></a>

**Contract A237 (visual-qa.spec.ts:L213)** — 'great-blue-hole: authored east grotto close'.

Navigation: `page.goto('/?tile=great-blue-hole&skipBriefing=1&tutorial=0')`.

- `expect(clearance.blocked).toBe(false)`
- `expect(clearance.eyeBlocked).toBe(false)`
- `expect(clearance.floor).toBeGreaterThan(1)`
- `expect(clearance.underwater).toBe(true)`
- `expect(clearance.failedProps).toBe(0)`
- `expect(errors).toEqual([])`

Failure guards: `throw new Error('Missing east grotto');`.

Readiness/temporal predicates: `page.waitForFunction( () => { const g = window.__game as unknown as Game | undefined; return window.__gameReady && g?.props.loaded && g.discovery.loaded; }, undefined, { timeout: 120_000 }, )`.

## Shared assertion helpers (included in every referenced contract)

<a id="content-missions-spec-ts-29-teleporttopoi"></a>

**content-missions.spec.ts:29-teleportToPoi**

- ``throw new Error(`No spawn pose for ${id}`);``
- ``throw new Error(`No scan target for ${id}`);``
- ``throw new Error(`${poiId}: no scannable pose; competing candidates: ${observed.join(', ')}`);``

<a id="d-flow-spec-ts-114-scan"></a>

**d-flow.spec.ts:114-scan**

- readiness: `page.waitForFunction( (id) => ( window.__game as { mission: { objectives: Array<{ id: string; complete: boolean }> } } ).mission.objectives.some((o) => o.id === id && o.complete), objectiveId, { timeout: 20_000 }, )`

<a id="d-flow-spec-ts-151-surfacefrompause"></a>

**d-flow.spec.ts:151-surfaceFromPause**

- `expect(page.locator('.pause-menu')).toBeVisible()`
- `expect(surface).toBeVisible()`
- `expect(page.locator('.mission-debrief')).toBeVisible()`

<a id="d-flow-spec-ts-48-boot"></a>

**d-flow.spec.ts:48-boot**

- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="d-flow-spec-ts-53-ready"></a>

**d-flow.spec.ts:53-ready**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded, undefined, { timeout: 20_000 }, )`

<a id="d-flow-spec-ts-84-teleport"></a>

**d-flow.spec.ts:84-teleport**

- ``throw new Error(`no POI ${id}`);``
- readiness: `page.waitForFunction( (id) => (window.__game as { scanner: { view: { candidateId: string | null } } }).scanner.view .candidateId === id, poiId, { timeout: 10_000 }, )`

<a id="d-input-hud-spec-ts-8-ready"></a>

**d-input-hud.spec.ts:8-ready**

- readiness: `page.waitForFunction(() => window.__gameReady === true)`
- readiness: `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`
- navigation: `page.goto(url)`

<a id="d-photo-spec-ts-29-ready"></a>

**d-photo.spec.ts:29-ready**

- readiness: `page.waitForFunction( () => window.__gameReady && (window.__game as { discovery: { spawnedAt: string | null } }).discovery.spawnedAt === 'titanic-bow', )`

<a id="d-scan-spec-ts-9-boot"></a>

**d-scan.spec.ts:9-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => { const g = window.__game as { discovery?: { loaded: boolean; spawnedAt: string | null } }; return ( g.discovery?.loaded && (!new URLSearchParams(location.search).has('poi') || g.discovery.spawnedAt) ); }, undefined, { timeout: 20_000 }, )`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="d-shell-spec-ts-43-expectglobeclearedges"></a>

**d-shell.spec.ts:43-expectGlobeClearEdges**

- `expect .poll(async () => { const [left, right, top, bottom, centre] = await globeEdgePixels(page); return { left: left < 8, right: right < 8, top: top < 8, bottom: bottom < 8, centre: centre > 200, }; }) .toEqual({ left: true, right: true, top: true, bottom: true, centre: true })`

Measurement recipe (selectors,visibility,hit testing,geometry): `async function expectGlobeClearEdges(page: Page): Promise<void> { await expect .poll(async () => { const [left, right, top, bottom, centre] = await globeEdgePixels(page); return { left: left < 8, right: right < 8, top: top < 8, bottom: bottom < 8, centre: centre > 200, }; }) .toEqual({ left: true, right: true, top: true, bottom: true, centre: true }); }`.

<a id="d-shell-spec-ts-8-boot"></a>

**d-shell.spec.ts:8-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="d-sonar-spec-ts-40-waitforzoom"></a>

**d-sonar.spec.ts:40-waitForZoom**

- readiness: `page.waitForFunction(() => { const sonar = ( window.__game as { sonar: { zoom: number | 'tile'; targetZoom: number | 'tile' } } ).sonar; return sonar.zoom === sonar.targetZoom; })`

<a id="d-start-spec-ts-8-boot"></a>

**d-start.spec.ts:8-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true)`
- readiness: `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`
- navigation: ``page.goto(`/?mission=${mission}`)``

<a id="d2-camera-spec-ts-9-dive"></a>

**d2-camera.spec.ts:9-dive**

- `expect(page.locator('.briefing')).toBeHidden()`
- readiness: `page.waitForFunction(() => window.__gameReady === true)`
- readiness: `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`
- navigation: ``page.goto(`/?mission=${site}&skipBriefing=1`)``

<a id="d2-predive-spec-ts-31-boot"></a>

**d2-predive.spec.ts:31-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="discovery-spec-ts-57-boot"></a>

**discovery.spec.ts:57-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded, undefined, { timeout: 20_000 }, )`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="f-a11y-spec-ts-15-cycle"></a>

**f-a11y.spec.ts:15-cycle**

- `expect(indices.length).toBeGreaterThan(0)`
- `expect .poll(() => control.evaluate((el) => ({ focused: document.activeElement === el, outline: getComputedStyle(el).outlineStyle, })), ) .toEqual({ focused: true, outline: 'solid' })`
- `expect(controls.nth(indices[0]!)).toBeFocused()`
- `expect(controls.nth(indices[indices.length - 1]!)).toBeFocused()`

<a id="f-a11y-spec-ts-9-boot"></a>

**f-a11y.spec.ts:9-boot**

- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="f-arcade-access-spec-ts-10-ready"></a>

**f-arcade-access.spec.ts:10-ready**

- readiness: `page.waitForFunction(() => window.__gameReady === true)`
- readiness: `page.waitForFunction(() => { const g = window.__game as { props: { loaded: boolean }; discovery: { loaded: boolean } }; return g.props.loaded && g.discovery.loaded; })`

<a id="f-beebe-plumes-spec-ts-39-load"></a>

**f-beebe-plumes.spec.ts:39-load**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 120_000 })`
- readiness: `page.waitForFunction( () => { const g = window.__game as unknown as Game | undefined; return g?.props.loaded && g.discovery.loaded; }, undefined, { timeout: 90_000 }, )`
- navigation: ``page.goto(`/?tile=beebe-vent-field&skipBriefing=1&tutorial=0&tier=${tier}`, { waitUntil: 'domcontentloaded', timeout: 120_000, })``

<a id="f-bluehole-1030-spec-ts-57-capture"></a>

**f-bluehole-1030.spec.ts:57-capture**

- `expect(sheet).toBeTruthy()`
- `expect(manifest.complete).toBe(true)`
- `expect(manifest.failures).toEqual([])`
- `expect(manifest.captures).toHaveLength(10)`
- `expect(shot.tier).toBe('low')`
- `expect(shot.failedProps).toBe(0)`
- `expect(shot.triangles).toBeGreaterThan(0)`
- `expect(shot.triangles, shot.filename).toBeLessThan(500_000)`

<a id="f-bluehole-squiggle-spec-ts-64-capture"></a>

**f-bluehole-squiggle.spec.ts:64-capture**

- `expect(sheet, stdout).toBeTruthy()`
- `expect(manifest.complete).toBe(true)`
- `expect(manifest.failures).toEqual([])`
- `expect(manifest.captures).toHaveLength(5)`
- `expect(shot.tier).toBe('high')`
- `expect(shot.failedProps).toBe(0)`
- `expect(shot.triangles).toBeGreaterThan(0)`

<a id="f-bughunt-15-spec-ts-29-separate"></a>

**f-bughunt-15.spec.ts:29-separate**

- ``expect .poll(async () => page.evaluate((selectors) => { const issues: string[] = []; const boxes = selectors.flatMap((selector) => { const elements = document.querySelectorAll(selector); // Retain the locator's strict single-element requirement as well. if (elements.length !== 1) { issues.push(`${selector} expected one element, found ${elements.length}`); return []; } const element = elements[0]; const box = element.getBoundingClientRect().toJSON() as DOMRect; const visibility = getComputedStyle(element).visibility; // Match Playwright's visible check: a nonempty box and visibility // other than hidden/collapse. Opacity does not determine visibility. if (box.width <= 0 || box.height <= 0 || visibility !== 'visible') issues.push(`${selector} hidden: ${JSON.stringify(box)}, visibility=${visibility}`); return [{ selector, box }]; }); for (const { selector, box } of boxes) { if (box.x < 0 || box.y < 0 || box.right > innerWidth || box.bottom > innerHeight) issues.push(`${selector} offscreen: ${JSON.stringify(box)}`); } for (let i = 0; i < boxes.length; i++) { const a = boxes[i]; for (const b of boxes.slice(i + 1)) { if ( a.box.left < b.box.right && b.box.left < a.box.right && a.box.top < b.box.bottom && b.box.top < a.box.bottom ) issues.push( `${a.selector} overlaps ${b.selector}: ${JSON.stringify([a.box, b.box])}`, ); } } return issues; }, selectors), ) .toEqual([])``
- ``expect .poll(async () => page.evaluate((selectors) => { const issues: string[] = []; const boxes = selectors.flatMap((selector) => { const elements = document.querySelectorAll(selector); // Retain the locator's strict single-element requirement as well. if (elements.length !== 1) { issues.push(`${selector} expected one element, found ${elements.length}`); return []; } const element = elements[0]; const box = element.getBoundingClientRect().toJSON() as DOMRect; const visibility = getComputedStyle(element).visibility; // Match Playwright's visible check: a nonempty box and visibility // other than hidden/collapse. Opacity does not determine visibility. if (box.width <= 0 || box.height <= 0 || visibility !== 'visible') issues.push(`${selector} hidden: ${JSON.stringify(box)}, visibility=${visibility}`); return [{ selector, box }]; }); for (const { selector, box } of boxes) { if (box.x < 0 || box.y < 0 || box.right > innerWidth || box.bottom > innerHeight) issues.push(`${selector} offscreen: ${JSON.stringify(box)}`); } for (let i = 0; i < boxes.length; i++) { const a = boxes[i]; for (const b of boxes.slice(i + 1)) { if ( a.box.left < b.box.right && b.box.left < a.box.right && a.box.top < b.box.bottom && b.box.top < a.box.bottom ) issues.push( `${a.selector} overlaps ${b.selector}: ${JSON.stringify([a.box, b.box])}`, ); } } return issues; }, selectors), )``

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function separate(page: Page, selectors: string[]): Promise<void> { await expect .poll(async () => page.evaluate((selectors) => { const issues: string[] = []; const boxes = selectors.flatMap((selector) => { const elements = document.querySelectorAll(selector); // Retain the locator's strict single-element requirement as well. if (elements.length !== 1) { issues.push(`${selector} expected one element, found ${elements.length}`); return []; } const element = elements[0]; const box = element.getBoundingClientRect().toJSON() as DOMRect; const visibility = getComputedStyle(element).visibility; // Match Playwright's visible check: a nonempty box and visibility // other than hidden/collapse. Opacity does not determine visibility. if (box.width <= 0 || box.height <= 0 || visibility !== 'visible') issues.push(`${selector} hidden: ${JSON.stringify(box)}, visibility=${visibility}`); return [{ selector, box }]; }); for (const { selector, box } of boxes) { if (box.x < 0 || box.y < 0 || box.right > innerWidth || box.bottom > innerHeight) issues.push(`${selector} offscreen: ${JSON.stringify(box)}`); } for (let i = 0; i < boxes.length; i++) { const a = boxes[i]; for (const b of boxes.slice(i + 1)) { if ( a.box.left < b.box.right && b.box.left < a.box.right && a.box.top < b.box.bottom && b.box.top < a.box.bottom ) issues.push( `${a.selector} overlaps ${b.selector}: ${JSON.stringify([a.box, b.box])}`, ); } } return issues; }, selectors), ) .toEqual([]); }``.

<a id="f-bughunt-18-spec-ts-25-ready"></a>

**f-bughunt-18.spec.ts:25-ready**

- navigation: ``page.goto(`/?${query}&tutorial=0&tier=low`, { waitUntil: 'domcontentloaded' })``

<a id="f-bughunt-18-spec-ts-51-drag"></a>

**f-bughunt-18.spec.ts:51-drag**

- `expect.poll(async () => (await camera(page)).freeLook).toBe(true)`

<a id="f-bughunt-4-spec-ts-10-separate"></a>

**f-bughunt-4.spec.ts:10-separate**

- `expect(page.locator(a)).toBeVisible()`
- `expect(page.locator(b)).toBeVisible()`
- ``expect(overlap, `${a} overlaps ${b}: ${JSON.stringify({ first, second })}`).toBe(false)``

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function separate(page: Page, a: string, b: string) { await expect(page.locator(a)).toBeVisible(); await expect(page.locator(b)).toBeVisible(); const first = (await page.locator(a).boundingBox())!; const second = (await page.locator(b).boundingBox())!; const overlap = first.x < second.x + second.width && second.x < first.x + first.width && first.y < second.y + second.height && second.y < first.y + first.height; expect(overlap, `${a} overlaps ${b}: ${JSON.stringify({ first, second })}`).toBe(false); }``.

<a id="f-bughunt-4-spec-ts-3-ready"></a>

**f-bughunt-4.spec.ts:3-ready**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`

<a id="f-bughunt-960-spec-ts-28-reachable"></a>

**f-bughunt-960.spec.ts:28-reachable**

- `expect(target).toBeInViewport({ ratio: 1 })`
- `expect( await target.evaluate((e) => { const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && (hit === e || e.contains(hit)); }), ).toBe(true)`

Measurement recipe (selectors,visibility,hit testing,geometry): `async function reachable(target: Locator): Promise<void> { await target.scrollIntoViewIfNeeded(); await expect(target).toBeInViewport({ ratio: 1 }); expect( await target.evaluate((e) => { const r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && (hit === e || e.contains(hit)); }), ).toBe(true); }`.

<a id="f-bughunt-hud-touch-overlap-1390-spec-ts-40-layout"></a>

**f-bughunt-hud-touch-overlap-1390.spec.ts:40-layout**

- `expect.soft(issues, phase).toEqual([])`

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function layout(page: Page, phase: string): Promise<void> { // The objectives panel republishes --obj-panel-bottom from a ResizeObserver, which // runs in the next real rendering step (not on the fake clock). Wait for one // so a measurement taken right after a content change sees the settled layout. await page.evaluate( () => new Promise<void>((resolve) => { const observer = new ResizeObserver(() => { observer.disconnect(); resolve(); }); observer.observe(document.body); }), ); // Read the entire composed HUD together, including transient reward notices. const issues = await page.evaluate((selectors) => { const boxes = selectors.flatMap((selector) => { const element = document.querySelector<HTMLElement>(selector); if (!element?.checkVisibility()) return []; return [{ selector, box: element.getBoundingClientRect() }]; }); const issues: string[] = []; for (const { selector, box } of boxes) { if (box.x < 0 || box.y < 0 || box.right > innerWidth || box.bottom > innerHeight) issues.push(`${selector} offscreen: ${JSON.stringify(box)}`); } for (let i = 0; i < boxes.length; i++) { const a = boxes[i]; for (const b of boxes.slice(i + 1)) { if ( a.box.left < b.box.right && b.box.left < a.box.right && a.box.top < b.box.bottom && b.box.top < a.box.bottom ) issues.push(`${a.selector} overlaps ${b.selector}: ${JSON.stringify([a.box, b.box])}`); } } return issues; }, selectors); expect.soft(issues, phase).toEqual([]); }``.

<a id="f-debrief-720-spec-ts-31-contained"></a>

**f-debrief-720.spec.ts:31-contained**

- `expect(target).toBeVisible()`
- `expect(await target.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1)`
- `expect(box.x).toBeGreaterThanOrEqual(0)`
- `expect(box.y).toBeGreaterThanOrEqual(0)`
- `expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)`
- `expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)`

<a id="f-first-minute-620-spec-ts-24-ready"></a>

**f-first-minute-620.spec.ts:24-ready**

- readiness: `page.waitForFunction(() => window.__gameReady === true)`
- readiness: `page.waitForFunction(() => (window.__game as unknown as Game).discovery.loaded)`

<a id="f-first-minute-620-spec-ts-29-hold"></a>

**f-first-minute-620.spec.ts:29-hold**

- readiness: `page.waitForFunction( () => (window.__game as { cameraTips: { moved: boolean } }).cameraTips.moved, )`
- readiness: `page.waitForFunction( () => (window.__game as { cameraTips: { moved: boolean } }).cameraTips.moved, )`

<a id="f-flow-audit-510-spec-ts-125-firstactions"></a>

**f-flow-audit-510.spec.ts:125-firstActions**

- `expect(page.locator('.onboard-card')).toHaveAttribute('data-step', 'scan')`

<a id="f-flow-audit-510-spec-ts-40-contained"></a>

**f-flow-audit-510.spec.ts:40-contained**

- ``expect(offender, `${target} must not clip text horizontally`).toBe('')``

<a id="f-flow-audit-510-spec-ts-65-pause"></a>

**f-flow-audit-510.spec.ts:65-pause**

- `expect(page.locator('.pause-menu')).toBeVisible()`

<a id="f-flow-audit-510-spec-ts-74-closejournal"></a>

**f-flow-audit-510.spec.ts:74-closeJournal**

- `expect(page.locator('.journal')).toBeHidden()`

<a id="f-flow-audit-510-spec-ts-95-holdtouchuntilstep"></a>

**f-flow-audit-510.spec.ts:95-holdTouchUntilStep**

- `expect .poll(async () => { await page.clock.fastForward(250); return page.evaluate(() => (window.__game as unknown as Game).onboard.tutorial.index); }) .toBe(step)`

<a id="f-hud-layout-spec-ts-12-boot"></a>

**f-hud-layout.spec.ts:12-boot**

- `expect(page.locator('.onboard-card')).toBeVisible()`
- `expect(page.locator('.scan-panel')).toBeVisible()`
- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- navigation: `page.goto(url + (touch ? '&touch=1' : ''), { waitUntil: 'domcontentloaded' })`

<a id="f-hud-layout-spec-ts-26-clearlayout"></a>

**f-hud-layout.spec.ts:26-clearLayout**

- `expect(box.width, box.selector).toBeGreaterThan(0)`
- `expect(box.height, box.selector).toBeGreaterThan(0)`
- `expect(box.x, box.selector).toBeGreaterThanOrEqual(0)`
- `expect(box.y, box.selector).toBeGreaterThanOrEqual(0)`
- `expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width)`
- `expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height)`
- ``expect(overlaps, `${a.selector} overlaps ${b.selector}`).toBe(false)``

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function clearLayout(page: Page, selectors: string[]): Promise<void> { const viewport = page.viewportSize()!; // One renderer round trip observes a coherent layout, rather than waiting // for WebGL separately for every rectangle at every tutorial step. const boxes = await page.evaluate( (selectors) => selectors.map((selector) => { const element = document.querySelector<HTMLElement>(selector)!; const box = element.getBoundingClientRect(); return { selector, x: box.x, y: box.y, width: box.width, height: box.height }; }), selectors, ); for (const box of boxes) { expect(box.width, box.selector).toBeGreaterThan(0); expect(box.height, box.selector).toBeGreaterThan(0); expect(box.x, box.selector).toBeGreaterThanOrEqual(0); expect(box.y, box.selector).toBeGreaterThanOrEqual(0); expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width); expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height); } for (let i = 0; i < boxes.length; i++) { for (const b of boxes.slice(i + 1)) { const a = boxes[i]!; const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height; expect(overlaps, `${a.selector} overlaps ${b.selector}`).toBe(false); } } }``.

<a id="f-journal-debrief-1060-spec-ts-18-fits"></a>

**f-journal-debrief-1060.spec.ts:18-fits**

- `expect(await panel.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1)`
- `expect(box.x).toBeGreaterThanOrEqual(0)`
- `expect(box.y).toBeGreaterThanOrEqual(0)`
- `expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)`
- `expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)`

<a id="f-monterey-portrait-hud-spec-ts-24-boot"></a>

**f-monterey-portrait-hud.spec.ts:24-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`
- navigation: ``page.goto(`/?tile=monterey-canyon&tier=low&touch=1&skipBriefing=1&${query}`)``

<a id="f-monterey-portrait-hud-spec-ts-45-expectclearlayout"></a>

**f-monterey-portrait-hud.spec.ts:45-expectClearLayout**

- `expect(m.boxes.map((b) => b.selector)).toEqual( expect.arrayContaining(['.sonar', '.hud-readouts']), )`
- `expect(b.x, b.selector).toBeGreaterThanOrEqual(0)`
- `expect(b.y, b.selector).toBeGreaterThanOrEqual(0)`
- `expect(b.x + b.width, b.selector).toBeLessThanOrEqual(m.w)`
- `expect(b.y + b.height, b.selector).toBeLessThanOrEqual(m.h)`
- ``expect(covers, `${b.selector} must not cover the submarine`).toBe(false)``
- ``expect(overlaps, `${a.selector} overlaps ${b.selector}`).toBe(false)``
- `expect(m.sx).toBeGreaterThan(40)`
- `expect(m.sx).toBeLessThan(m.w - 40)`
- `expect(m.sy).toBeGreaterThan(40)`
- `expect(m.sy).toBeLessThan(m.h - 40)`

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function expectClearLayout(page: Page): Promise<void> { const selectors = HUD; const m = await page.evaluate((selectors) => { const boxes = selectors.flatMap((selector) => { const el = document.querySelector<HTMLElement>(selector); if (!el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return []; const r = el.getBoundingClientRect(); return [{ selector, x: r.x, y: r.y, width: r.width, height: r.height }]; }); const game = window.__game as { sub: Submarine; rig: { camera: Camera } }; const p = game.sub.position.clone().project(game.rig.camera); return { boxes, w: innerWidth, h: innerHeight, sx: ((p.x + 1) / 2) * innerWidth, sy: ((1 - p.y) / 2) * innerHeight, }; }, selectors); expect(m.boxes.map((b) => b.selector)).toEqual( expect.arrayContaining(['.sonar', '.hud-readouts']), ); for (const b of m.boxes) { expect(b.x, b.selector).toBeGreaterThanOrEqual(0); expect(b.y, b.selector).toBeGreaterThanOrEqual(0); expect(b.x + b.width, b.selector).toBeLessThanOrEqual(m.w); expect(b.y + b.height, b.selector).toBeLessThanOrEqual(m.h); const covers = m.sx >= b.x && m.sx <= b.x + b.width && m.sy >= b.y && m.sy <= b.y + b.height; expect(covers, `${b.selector} must not cover the submarine`).toBe(false); } for (let i = 0; i < m.boxes.length; i++) { for (const b of m.boxes.slice(i + 1)) { const a = m.boxes[i]!; const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height; expect(overlaps, `${a.selector} overlaps ${b.selector}`).toBe(false); } } expect(m.sx).toBeGreaterThan(40); expect(m.sx).toBeLessThan(m.w - 40); expect(m.sy).toBeGreaterThan(40); expect(m.sy).toBeLessThan(m.h - 40); }``.

<a id="f-save-soak-spec-ts-28-ready"></a>

**f-save-soak.spec.ts:28-ready**

- `expect(page.locator('.briefing')).toBeVisible()`

<a id="f-text-diet-spec-ts-8-ready"></a>

**f-text-diet.spec.ts:8-ready**

- readiness: `page.waitForFunction(() => window.__gameReady === true)`
- navigation: ``page.goto(`/?${query}`)``

<a id="f-title-layout-spec-ts-17-boot"></a>

**f-title-layout.spec.ts:17-boot**

- `expect(page.locator('.home-screen')).toBeVisible()`
- `expect(page.locator('.home-menu .daily-card')).toBeVisible()`
- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- navigation: `page.goto('/', { waitUntil: 'domcontentloaded' })`

<a id="f-title-scene-spec-ts-18-boot"></a>

**f-title-scene.spec.ts:18-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="f-title-scene-spec-ts-23-presented"></a>

**f-title-scene.spec.ts:23-presented**

- `expect.poll(async () => (await title(page)).active).toBe(true)`
- `expect.poll(async () => (await title(page)).drawCount).toBeGreaterThan(0)`

<a id="f-title-scene-spec-ts-28-stopped"></a>

**f-title-scene.spec.ts:28-stopped**

- `expect((await title(page)).drawCount).toBe(before)`

<a id="f-title-scene-spec-ts-37-expectmobileregions"></a>

**f-title-scene.spec.ts:37-expectMobileRegions**

- `expect(region.content.x, region.name).toBeGreaterThanOrEqual(0)`
- `expect(region.content.right, region.name).toBeLessThanOrEqual(viewport.width)`
- ``expect(box.x, `${region.name} scroller`).toBeGreaterThanOrEqual(0)``
- ``expect(box.right, `${region.name} scroller`).toBeLessThanOrEqual(viewport.width)``
- ``expect(box.y, `${region.name} scroller`).toBeGreaterThanOrEqual(0)``
- ``expect(box.bottom, `${region.name} scroller`).toBeLessThanOrEqual(viewport.height)``
- `expect(a.y, name).toBeGreaterThanOrEqual(0)`
- `expect(a.bottom, name).toBeLessThanOrEqual(viewport.height)`
- ``expect( a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom, `${name} overlaps ${other}`, ).toBe(false)``

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function expectMobileRegions( page: Page, viewport: { width: number; height: number }, ): Promise<void> { const regions = await page .locator('.home-copy, .home-body, .home-scene-plate') .evaluateAll((elements) => { const rect = (element: Element) => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }; return elements.map((element) => { const content = rect(element); const visible = { ...content }; const scrollports = []; // Under 600px, the whole home panel scrolls; taller layouts scroll the // menu body. Clip only to real scrolling ancestors, never the viewport // or home shell: an element overflowing without a scroller must fail. for ( let parent = element.parentElement; parent && !parent.classList.contains('home-screen'); parent = parent.parentElement ) { const style = getComputedStyle(parent); if (style.display !== 'contents' && /^(auto|scroll)$/.test(style.overflowY)) { const scrollport = rect(parent); scrollports.push(scrollport); visible.y = Math.max(visible.y, scrollport.y); visible.bottom = Math.min(visible.bottom, scrollport.bottom); } } return { name: element.className, content, visible, scrollports }; }); }); for (const region of regions) { // Horizontal overflow is never allowed, including in offscreen content. expect(region.content.x, region.name).toBeGreaterThanOrEqual(0); expect(region.content.right, region.name).toBeLessThanOrEqual(viewport.width); for (const box of region.scrollports) { expect(box.x, `${region.name} scroller`).toBeGreaterThanOrEqual(0); expect(box.right, `${region.name} scroller`).toBeLessThanOrEqual(viewport.width); expect(box.y, `${region.name} scroller`).toBeGreaterThanOrEqual(0); expect(box.bottom, `${region.name} scroller`).toBeLessThanOrEqual(viewport.height); } } const visible = regions.filter(({ visible: box }) => box.bottom > box.y); for (let i = 0; i < visible.length; i++) { const { name, visible: a } = visible[i]; expect(a.y, name).toBeGreaterThanOrEqual(0); expect(a.bottom, name).toBeLessThanOrEqual(viewport.height); for (const { name: other, visible: b } of visible.slice(i + 1)) { expect( a.x < b.right && b.x < a.right && a.y < b.bottom && b.y < a.bottom, `${name} overlaps ${other}`, ).toBe(false); } } }``.

<a id="f-toast-placement-spec-ts-21-separate"></a>

**f-toast-placement.spec.ts:21-separate**

- `expect(box.visible, box.selector).toBe(true)`
- `expect(box.width, box.selector).toBeGreaterThan(0)`
- `expect(box.height, box.selector).toBeGreaterThan(0)`
- ``expect(box.fits, `${box.selector} clips text`).toBe(true)``
- `expect(box.x, box.selector).toBeGreaterThanOrEqual(0)`
- `expect(box.y, box.selector).toBeGreaterThanOrEqual(0)`
- `expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width)`
- `expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height)`
- ``expect( a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height, `${a.selector} overlaps ${b.selector}`, ).toBe(false)``

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function separate(page: Page, selectors: string[]): Promise<void> { const boxes = await page.evaluate( (selectors) => selectors.map((selector) => { const element = document.querySelector<HTMLElement>(selector)!; const r = element.getBoundingClientRect(); return { selector, x: r.x, y: r.y, width: r.width, height: r.height, visible: getComputedStyle(element).visibility === 'visible', fits: element.scrollWidth <= element.clientWidth, }; }), selectors, ); const viewport = page.viewportSize()!; for (const box of boxes) { expect(box.visible, box.selector).toBe(true); expect(box.width, box.selector).toBeGreaterThan(0); expect(box.height, box.selector).toBeGreaterThan(0); expect(box.fits, `${box.selector} clips text`).toBe(true); expect(box.x, box.selector).toBeGreaterThanOrEqual(0); expect(box.y, box.selector).toBeGreaterThanOrEqual(0); expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width); expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height); } for (let i = 0; i < boxes.length; i++) { const a = boxes[i]; for (const b of boxes.slice(i + 1)) { expect( a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height, `${a.selector} overlaps ${b.selector}`, ).toBe(false); } } }``.

<a id="f-touch-audit-spec-ts-12-separate"></a>

**f-touch-audit.spec.ts:12-separate**

- `expect .poll(() => page.evaluate( (selectors) => selectors.every((selector) => { const el = document.querySelector<HTMLElement>(selector); return ( !!el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility === 'visible' ); }), selectors, ), ) .toBe(true)`
- `expect(box.x, box.selector).toBeGreaterThanOrEqual(0)`
- `expect(box.y, box.selector).toBeGreaterThanOrEqual(0)`
- `expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width)`
- `expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height)`
- ``expect( a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height, `${a.selector} overlaps ${b.selector}`, ).toBe(false)``

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function separate(page: Page, selectors: string[]): Promise<void> { const viewport = page.viewportSize()!; // Observe one layout snapshot. Hundreds of separate browser round trips can // exhaust a shard while WebGL is rendering, even when every box is correct. await expect .poll(() => page.evaluate( (selectors) => selectors.every((selector) => { const el = document.querySelector<HTMLElement>(selector); return ( !!el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 && getComputedStyle(el).visibility === 'visible' ); }), selectors, ), ) .toBe(true); const boxes = await page.evaluate( (selectors) => selectors.map((selector) => { const el = document.querySelector<HTMLElement>(selector)!; const box = el.getBoundingClientRect(); return { selector, x: box.x, y: box.y, width: box.width, height: box.height }; }), selectors, ); for (const box of boxes) { expect(box.x, box.selector).toBeGreaterThanOrEqual(0); expect(box.y, box.selector).toBeGreaterThanOrEqual(0); expect(box.x + box.width, box.selector).toBeLessThanOrEqual(viewport.width); expect(box.y + box.height, box.selector).toBeLessThanOrEqual(viewport.height); } for (let i = 0; i < boxes.length; i++) { const a = boxes[i]; for (const b of boxes.slice(i + 1)) { expect( a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height, `${a.selector} overlaps ${b.selector}`, ).toBe(false); } } }``.

<a id="f-touch-audit-spec-ts-59-reachable"></a>

**f-touch-audit.spec.ts:59-reachable**

- `expect(target).toBeVisible()`
- `expect(box.width).toBeGreaterThanOrEqual(44)`
- `expect(box.height).toBeGreaterThanOrEqual(44)`
- ``expect( box.receivesTap, `the centre of the touch target must receive the tap: ${JSON.stringify(box)}`, ).toBe(true)``

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function reachable(target: Locator): Promise<void> { await expect(target).toBeVisible(); await target.scrollIntoViewIfNeeded(); const box = await target.evaluate((element) => { const r = element.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { width: r.width, height: r.height, x: r.x, y: r.y, hit: hit?.className, receivesTap: hit !== null && element.contains(hit), }; }); expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); expect( box.receivesTap, `the centre of the touch target must receive the tap: ${JSON.stringify(box)}`, ).toBe(true); }``.

<a id="f-touch-audit-spec-ts-7-ready"></a>

**f-touch-audit.spec.ts:7-ready**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="f-touch-controls-1392-spec-ts-17-boot"></a>

**f-touch-controls-1392.spec.ts:17-boot**

- navigation: ``page.goto(`/?mission=titanic&skipBriefing=1&tier=low${touch ? '&touch=1' : ''}`)``

<a id="f-touch-controls-1392-spec-ts-27-layout"></a>

**f-touch-controls-1392.spec.ts:27-layout**

- `expect(issues).toEqual([])`

Measurement recipe (selectors,visibility,hit testing,geometry): ``async function layout(page: Page): Promise<void> { const issues = await page.evaluate(() => { const elements = [ ...document.querySelectorAll<HTMLElement>( '.tc-stick, .tc-slider, .tc-btn, .hud-journal, .sonar, .hud-readouts, ' + '.objectives-panel, .scan-panel, .scan-objective-chip, ' + '.onboard-card, .hud-notice, .hud-reset-camera', ), ].filter((el) => el.checkVisibility()); const boxes = elements.map((el) => ({ name: el.className, r: el.getBoundingClientRect() })); const issues: string[] = []; for (const { name, r } of boxes) { if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) issues.push(`${name} offscreen: ${JSON.stringify(r)}`); } for (let i = 0; i < boxes.length; i++) { const a = boxes[i]; for (const b of boxes.slice(i + 1)) { if ( a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom ) issues.push(`${a.name} overlaps ${b.name}: ${JSON.stringify([a.r, b.r])}`); } } for (const el of elements.filter((el) => el.matches('.tc-btn, .hud-journal'))) { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); if (!el.contains(hit)) issues.push(`${el.className} cannot receive a tap`); if ( document.documentElement.classList.contains('is-touch') && (r.width < 48 || r.height < 48) ) issues.push(`${el.className} below 48px`); } return issues; }); expect(issues).toEqual([]); }``.

<a id="f-touch-stack-spec-ts-8-ready"></a>

**f-touch-stack.spec.ts:8-ready**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="f-verify-650-spec-ts-30-opening"></a>

**f-verify-650.spec.ts:30-opening**

- readiness: `page.waitForFunction(() => { const g = window.__game as unknown as Game | undefined; return window.__gameReady && g?.props.loaded && g.discovery.loaded && g.explore.ready && g.life; })`
- navigation: ``page.goto( `${origin}/?tile=${site}&skipBriefing=1&tutorial=0&tier=${tier}&dynres=0&lifeSeed=42${touch ? '&touch=1' : ''}`, )``

<a id="f-verify-740-spec-ts-130-auditsurface"></a>

**f-verify-740.spec.ts:130-auditSurface**

- `expect.soft(errors).toEqual([])`
- ``expect.soft(b.left, `${b.selector} left`).toBeGreaterThanOrEqual(0)``
- ``expect.soft(b.top, `${b.selector} top`).toBeGreaterThanOrEqual(0)``
- ``expect.soft(b.right, `${b.selector} right`).toBeLessThanOrEqual(layout.width)``
- ``expect.soft(b.bottom, `${b.selector} bottom`).toBeLessThanOrEqual(layout.height)``
- ``expect.soft(b.clips, `${b.selector} clips text`).toBe(false)``
- ``expect .soft( a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom, `${a.selector} overlaps ${b.selector}: ${JSON.stringify([a, b])}`, ) .toBe(false)``

<a id="f-visual-fixes-spec-ts-50-assertunderwater"></a>

**f-visual-fixes.spec.ts:50-assertUnderwater**

- `expect(eye.sub).toBeLessThan(0)`
- `expect(eye.mode).toBe('chase')`
- `expect(eye.y).toBeLessThanOrEqual(-2 + 1e-6)`
- `expect(eye.y).toBeGreaterThanOrEqual(eye.floor - 1e-6)`

<a id="f1-touch-spec-ts-19-boot"></a>

**f1-touch.spec.ts:19-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => { const g = window.__game as { discovery?: { loaded: boolean; spawnedAt: string | null } }; return g.discovery?.loaded && g.discovery.spawnedAt; }, undefined, { timeout: 20_000 }, )`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="f1-touch-spec-ts-32-centre"></a>

**f1-touch.spec.ts:32-centre**

- ``throw new Error(`no box for ${selector}`);``

<a id="f2-explore-spec-ts-243-expectscanpanelfits"></a>

**f2-explore.spec.ts:243-expectScanPanelFits**

- `expect(panel).not.toBeNull()`
- `expect(panel!.x).toBeGreaterThanOrEqual(0)`
- `expect(panel!.y).toBeGreaterThanOrEqual(0)`
- `expect(panel!.x + panel!.width).toBeLessThanOrEqual(viewport.width)`
- `expect(panel!.y + panel!.height).toBeLessThanOrEqual(viewport.height)`
- ``expect(overlaps, `Scan result overlaps ${selector}`).toBe(false)``

<a id="f2-explore-spec-ts-56-boot"></a>

**f2-explore.spec.ts:56-boot**

- readiness: `page.waitForFunction( () => window.__gameReady === true && (window.__game as unknown as Game).explore?.ready, undefined, { timeout: 60_000 }, )`
- navigation: ``page.goto(`/?${mission ? 'mission' : 'tile'}=${site}&skipBriefing=1&tier=low&life=0`, { waitUntil: 'domcontentloaded', })``

<a id="f2-explore-spec-ts-87-scan"></a>

**f2-explore.spec.ts:87-scan**

- readiness: `page.waitForFunction( (id) => (window.__game as unknown as Game).scanner.view.candidateId === id, id, )`

<a id="f2-life-spec-ts-49-boot"></a>

**f2-life.spec.ts:49-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 60_000 })`
- readiness: `page.waitForFunction(() => (window.__game as unknown as Game).life !== null, undefined, { timeout: 20_000, })`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="f2-modes-spec-ts-6-boot"></a>

**f2-modes.spec.ts:6-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true)`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="f2-progress-spec-ts-26-scan"></a>

**f2-progress.spec.ts:26-scan**

- `expect( await page.evaluate( (poi) => ( window.__game as { discoveries: { isDiscovered(site: string, poi: string): boolean } } ).discoveries.isDiscovered('blake-plateau-corals', poi), id, ), ).toBe(true)`
- ``throw new Error(`Missing scan target: ${poi}`);``
- readiness: `page.waitForFunction( (poi) => (window.__game as { scanner: { view: { candidateId: string } } }).scanner.view.candidateId === poi, id, { timeout: 10_000 }, )`

<a id="f2-progress-spec-ts-8-ready"></a>

**f2-progress.spec.ts:8-ready**

- readiness: `page.waitForFunction(() => window.__gameReady === true)`
- readiness: `page.waitForFunction( () => (window.__game as { discovery: { loaded: boolean } }).discovery.loaded, )`

<a id="f3-onboard-spec-ts-26-boot"></a>

**f3-onboard.spec.ts:26-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => { const g = window.__game as unknown as Probe; return ( g.discovery.loaded && g.discovery.spawnedAt === 'test-bow' && g.scanner.view.candidateId === 'test-bow' ); }, undefined, { timeout: 45_000 }, )`
- navigation: `page.goto(url + extra, { waitUntil: 'domcontentloaded' })`

<a id="f3-onboard-spec-ts-321-hold"></a>

**f3-onboard.spec.ts:321-hold**

- `expect(control).toBeVisible()`
- `expect(box).not.toBeNull()`

<a id="globe-pins-spec-ts-18-openhomeglobe"></a>

**globe-pins.spec.ts:18-openHomeGlobe**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction(() => { const g = (window.__game as { homeGlobe: HomeGlobe }).homeGlobe; return g.textureReady && g.pinCount > 0; })`
- navigation: `page.goto('/?tier=low', { waitUntil: 'domcontentloaded' })`

<a id="globe-spec-ts-26-boot"></a>

**globe.spec.ts:26-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="globe-spec-ts-37-globeready"></a>

**globe.spec.ts:37-globeReady**

- readiness: `page.waitForFunction( () => { const g = (window.__game as { globe: GlobeProbe }).globe; return g.isOpen && g.textureReady && g.pinCount > 0; }, undefined, { timeout: 30_000 }, )`

<a id="globe-spec-ts-69-tabtopin"></a>

**globe.spec.ts:69-tabToPin**

- ``throw new Error(`Tab never reached the ${id} pin`);``

<a id="helpers-clock-ts-14-clockframesuntil"></a>

**helpers/clock.ts:14-clockFramesUntil**

- `expect .poll( async () => { // One rendered frame per advance, even on a slow software GPU. Movement // callers use 250 ms, the engine clamp, so held input earns sim time. await page.clock.fastForward(frameMs); return page.evaluate(ready); }, { timeout: 45_000, intervals: [20] }, ) .toBe(true)`

<a id="helpers-clock-ts-33-withclockframes"></a>

**helpers/clock.ts:33-withClockFrames**

- `expect .poll( async () => { if (done) return true; const before = auxiliaryClosures; try { // This helper waits for work, not a duration of simulation. One // frame per poll lets RAF/timer callbacks finish without spending // three software-GPU renders on every 50 ms polling interval. await page.clock.fastForward(50); } catch (error) { // Clock advancement targets every page in the context. Axe closes // its temporary finishRun page while this call can still be using // it. Retry only that auxiliary-page race, proving our game page // is alive; genuine closures and the work's own errors still fail. if ( auxiliaryClosures === before || page.isClosed() || !(error instanceof Error) || !error.message.includes('Target page, context or browser has been closed') ) throw error; await page.evaluate(() => document.readyState); } return done; }, { timeout: 45_000, intervals: [20] }, ) .toBe(true)`
- `throw error;`
- `throw new Error('Game page closed while pumping clock frames');`

<a id="helpers-hudtips-ts-23-finishanimations"></a>

**helpers/hudTips.ts:23-finishAnimations**

- `expect(page.locator(selector)).toBeVisible()`

<a id="helpers-journal-ts-16-journalcontents"></a>

**helpers/journal.ts:16-journalContents**

- `expect(page.locator('.journal.at-front')).toBeVisible()`

<a id="helpers-journal-ts-84-openjournalcategory"></a>

**helpers/journal.ts:84-openJournalCategory**

- `expect(journal.locator('.jr-entries')).toBeVisible()`
- `expect(group).toBeVisible()`

<a id="helpers-phonehud-ts-17-expectcompactphonehud"></a>

**helpers/phoneHud.ts:17-expectCompactPhoneHud**

- `expect(page.locator('.d-sonar-legend')).toBeHidden()`
- `expect((await page.locator('.sonar').boundingBox())!.width).toBe(landscape ? 120 : 96)`
- `expect(page.locator('.d2-sonar-controls')).toBeHidden()`
- `expect(page.locator('.onboard-card button:visible')).toHaveCount(1)`
- `expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible()`
- `expect(metrics.textHeight).toBeLessThanOrEqual(metrics.lineHeight * 2)`
- `expect(metrics.clips).toBe(false)`
- `expect(metrics.coversSub, 'tutorial must clear the projected submarine centre').toBe(false)`
- `expect(metrics.depthSpeedOffset).toBeLessThanOrEqual(1)`
- `expect(metrics.statusHullOffset).toBeLessThanOrEqual(3)`
- `expect(metrics.secondRowBelowFirst).toBe(true)`
- `expect(page.locator('.d-scan-edge')).toBeVisible()`
- `expect(page.locator('.d-scan-edge')).toHaveText(/\S/)`
- `expect(page.locator('.d-scan-edge')).toBeHidden()`
- `expect(page.locator('.d-scan-objective-hint')).toBeHidden()`
- `expect(page.locator('.objectives-panel .obj-list')).toBeHidden()`
- `expect(page.locator('.scan-hint')).toHaveText(/\S/)`

Measurement recipe (selectors,visibility,hit testing,geometry): `async function expectCompactPhoneHud(page: Page): Promise<void> { await expect(page.locator('.d-sonar-legend')).toBeHidden(); const landscape = (page.viewportSize()?.width ?? 0) > (page.viewportSize()?.height ?? 0); expect((await page.locator('.sonar').boundingBox())!.width).toBe(landscape ? 120 : 96); await expect(page.locator('.d2-sonar-controls')).toBeHidden(); await expect(page.locator('.onboard-card button:visible')).toHaveCount(1); await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible(); const metrics = await page.evaluate(() => { const card = document.querySelector<HTMLElement>('.onboard-card')!; const text = card.querySelector<HTMLElement>('.onboard-card-phone-text')!; const game = window.__game as { sub: Submarine; rig: { camera: Camera } }; const projected = game.sub.position.clone().project(game.rig.camera); const x = ((projected.x + 1) / 2) * innerWidth; const y = ((1 - projected.y) / 2) * innerHeight; const r = card.getBoundingClientRect(); const depth = document .querySelector('[data-field="depth"]')! .parentElement!.getBoundingClientRect(); const speed = document .querySelector('[data-field="speed"]')! .parentElement!.getBoundingClientRect(); const status = document .querySelector('[data-field="status"]')! .parentElement!.getBoundingClientRect(); const hull = document.querySelector('.hull-gauge')!.getBoundingClientRect(); return { textHeight: text.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(text).lineHeight), clips: text.scrollWidth > text.clientWidth || text.scrollHeight > text.clientHeight, coversSub: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom, depthSpeedOffset: Math.abs(depth.top - speed.top), statusHullOffset: Math.abs(status.top - hull.top), secondRowBelowFirst: status.top >= depth.bottom, }; }); expect(metrics.textHeight).toBeLessThanOrEqual(metrics.lineHeight * 2); expect(metrics.clips).toBe(false); expect(metrics.coversSub, 'tutorial must clear the projected submarine centre').toBe(false); expect(metrics.depthSpeedOffset).toBeLessThanOrEqual(1); expect(metrics.statusHullOffset).toBeLessThanOrEqual(3); expect(metrics.secondRowBelowFirst).toBe(true); if (await page.locator('.scan-panel').isVisible()) { // Dim cards describe a distant/logged contact; their waypoint still leads the approach. // An active scan prompt owns guidance and suppresses the duplicate edge readout. const navigation = await page.evaluate(() => { const g = window.__game as { scanner: { view: { objectiveId: string | null } }; save: Save; mission: { objectives: Array<{ poiId: string; title: string }> } | null; }; const id = g.scanner.view.objectiveId; const approach = g.mission?.objectives.find((o) => o.poiId === id)?.title.startsWith('Head to ') ?? false; return id !== null && (g.save.get().gameplay.visualHints || approach); }); if ((await page.locator('.scan-panel').getAttribute('data-tone')) === 'dim' && navigation) { await expect(page.locator('.d-scan-edge')).toBeVisible(); await expect(page.locator('.d-scan-edge')).toHaveText(/\S/); } else await expect(page.locator('.d-scan-edge')).toBeHidden(); await expect(page.locator('.d-scan-objective-hint')).toBeHidden(); await expect(page.locator('.objectives-panel .obj-list')).toBeHidden(); await expect(page.locator('.scan-hint')).toHaveText(/\S/); } }`.

<a id="helpers-phonehud-ts-7-expectobjectiveguidance"></a>

**helpers/phoneHud.ts:7-expectObjectiveGuidance**

- `expect(current).toBeHidden()`
- `expect(page.locator('.scan-name')).toHaveText(/\S/)`
- `expect(page.locator('.scan-hint')).toHaveText(/\S/)`
- `expect(current).toBeVisible()`

<a id="helpers-scan-ts-7-stepscan"></a>

**helpers/scan.ts:7-stepScan**

- `throw new Error('Cannot advance a scan while the dive is frozen');`
- `throw new Error('The real scan control must be held before advancing scan time');`
- ``throw new Error(`Expected scan candidate ${id ?? 'in range'}, got ${candidateId}`);``
- ``throw new Error( `Scan did not complete for ${candidateId}: ${JSON.stringify(scanner.view)}`, );``

<a id="helpers-titleaudit-ts-14-boot"></a>

**helpers/titleAudit.ts:14-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true)`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="helpers-titleaudit-ts-21-idle"></a>

**helpers/titleAudit.ts:21-idle**

- `expect(await draws(page)).toBe(before)`

<a id="helpers-titleaudit-ts-33-trapped"></a>

**helpers/titleAudit.ts:33-trapped**

- `expect( await page.evaluate((sel) => { const focused = document.activeElement as HTMLElement; return ( document.querySelector(sel)!.contains(focused) && focused.getClientRects().length > 0 && !focused.closest('[hidden]') ); }, selector), ).toBe(true)`

<a id="helpers-tutorial-ts-4-dismisstutorial"></a>

**helpers/tutorial.ts:4-dismissTutorial**

- `expect(card).toBeHidden()`
- `expect(card).not.toHaveAttribute('data-step', step!)`
- `expect(card).toBeHidden()`

<a id="mission-spec-ts-51-boot"></a>

**mission.spec.ts:51-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => (window.__game as { discovery?: { loaded: boolean } } | undefined)?.discovery?.loaded, undefined, { timeout: 20_000 }, )`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="mission-spec-ts-69-holdscanuntil"></a>

**mission.spec.ts:69-holdScanUntil**

- readiness: `page.waitForFunction( (id) => ( window.__game as { mission: { objectives: Array<{ id: string; complete: boolean }> } } ).mission.objectives.some((o) => o.id === id && o.complete), objectiveId, { timeout: 20_000 }, )`

<a id="presets-spec-ts-12-enablecurrents"></a>

**presets.spec.ts:12-enableCurrents**

- readiness: `page.waitForFunction(() => { const g = window.__game as { currents: { status: string }; presets: { current: { length(): number } }; }; return g.currents.status === 'ready' && g.presets.current.length() > 0; })`

<a id="presets-spec-ts-3-waitforpreset"></a>

**presets.spec.ts:3-waitForPreset**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => (window.__game?.presets as { entered?: boolean } | undefined)?.entered === true, undefined, { timeout: 30_000 }, )`

<a id="props-spec-ts-38-waitforprops"></a>

**props.spec.ts:38-waitForProps**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- readiness: `page.waitForFunction( () => (window.__game?.props as { loaded?: boolean } | undefined)?.loaded === true, undefined, { timeout: 30_000 }, )`

<a id="settings-spec-ts-23-boot"></a>

**settings.spec.ts:23-boot**

- readiness: `page.waitForFunction(() => window.__gameReady === true, undefined, { timeout: 45_000 })`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="sub-playtest-spec-ts-306-boottile"></a>

**sub-playtest.spec.ts:306-bootTile**

- readiness: `page.waitForFunction( () => window.__gameReady === true && (window.__game as { props: { loaded: boolean } }).props.loaded, undefined, { timeout: 45_000 }, )`
- navigation: `page.goto(url, { waitUntil: 'domcontentloaded' })`

<a id="sub-playtest-spec-ts-75-holduntil"></a>

**sub-playtest.spec.ts:75-holdUntil**

- `expect.poll(async () => reached(await probe(page))).toBe(true)`

## Uncertain historical bug attribution: separate roster

Every listed declaration remains guarded. This roster is deliberately distinct from proved R regressions. A progress note or originating audit commit is evidence of intent, not proof its browser assertion failed before a product fix.

- [A068](#a068) — 26 expanded cases, 1090 desktop › titanic: Low opening and real 60 s idle render without clipping or errors; evidence `69cf61f`; retain ordinary capability guard; existing opt-in/local-only restrictions recorded. No specific pre-fix product failure located in followed file history; source guard retained.
- [A069](#a069) — 6 expanded cases, 1090 desktop › monterey-canyon: chase arm clears terrain during forward travel and a turn; evidence `69cf61f`; retain ordinary capability guard; existing opt-in/local-only restrictions recorded. No specific pre-fix product failure located in followed file history; source guard retained.
- [A078](#a078) — 10 expanded cases, titanic low: render opening, scan, reload twice and read authored Journal; evidence `0d14061`; retain ordinary capability guard. No specific pre-fix product failure located in followed file history; source guard retained.
- [A079](#a079) — 1 expanded cases, 830 Low wall relief is present and leaves the opening scan clear; evidence `0d14061`; retain ordinary capability guard. No specific pre-fix product failure located in followed file history; source guard retained.
- [A088](#a088) — 15 expanded cases, 720 debrief/Journal 1600x900 › titanic: short summary, Journal, resume and exit; evidence `a8d2e4d`; fold → journal-debrief.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A090](#a090) — 4 expanded cases, Endurance low: hull-close lighting stays finite and horizon renders; evidence `193f2a9`; retain ordinary capability guard. [snow/hull readback correction](1180-f-endurance-snow-sonar.md)
- [A091](#a091) — 6 expanded cases, desktop Low event review › plume: visible spawn, live cue, sighting and bounded active frame; evidence `7ddb454`; retain ordinary capability guard. feature/phone redesign4eb3478, not proof every bounded-frame threshold failed beforehand
- [A092](#a092) — 20 expanded cases, great-blue-hole Medium desktop: opening stays below 900k rendered triangles; evidence `370eba3`; retain ordinary capability guard. 370eba3 added ceiling guard; [1120/1230 CI triage](f-ci-triage2.md) identifies timeouts/splitting, not permission to drop rendered budget assertions
- [A093](#a093) — 26 expanded cases, 620 round 1 desktop › first minute titanic; evidence `ed98895`; retain ordinary capability guard; existing opt-in/local-only restrictions recorded. [first minute findings](f-firstminute.md), [HUD correction](f-hud-overlap.md)
- [A094](#a094) — 3 expanded cases, 620 guidance desktop › idle guidance expires at twelve seconds and Controls remains available; evidence `ed98895`; retain ordinary capability guard; existing opt-in/local-only restrictions recorded. [first minute findings](f-firstminute.md), [HUD correction](f-hud-overlap.md)
- [A095](#a095) — 3 expanded cases, 620 guidance desktop › animal hint and strip fade on the first actual move; scan stays separate; evidence `ed98895`; retain ordinary capability guard; existing opt-in/local-only restrictions recorded. [first minute findings](f-firstminute.md), [HUD correction](f-hud-overlap.md)
- [A096](#a096) — 9 expanded cases, 510 flow 1600x900 › titanic: Home -> opening -> Journal -> debrief -> Home; evidence `f91bd0d`; fold → journal-debrief.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A097](#a097) — 20 expanded cases, F-GEO-SCARP wall heroes › challenger-deep: north-wall-scarp wide wall screenshot; evidence `182261e`; split: numeric/functional guards ordinary; review captures nightly. No specific pre-fix product failure located in followed file history; source guard retained.
- [A098](#a098) — 8 expanded cases, titanic low desktop: horizon and opening remain readable; evidence `545d3b3`; fold → opening-framing.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A103](#a103) — 10 expanded cases, 1060 Journal/debrief 1600x900 › titanic: expandable groups, single tag and short debrief over 3 rounds; evidence `a3a5c4f`; fold → journal-debrief.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A110](#a110) — 1 expanded cases, free dive: portrait HUD panels do not overlap; evidence `6b10dc2`; fold → hud-touch.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A111](#a111) — 1 expanded cases, mission with tutorial: card, objectives, scan and readouts stay separate; evidence `6b10dc2`; fold → hud-touch.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A112](#a112) — 13 expanded cases, titanic opening stays within the Low-tier frame geometry budget; evidence `5ef9d64`; retain ordinary capability guard. [1350 audit](1350-f-bughunt-mobile-perf.md): orientationchange fixed in render units; census/render-budget e2e coverage itself is verification
- [A145](#a145) — 1 expanded cases, 1000 Journal site count excludes nested About the site entries; evidence `6d0eb2c`; retain ordinary capability guard; existing opt-in/local-only restrictions recorded. No specific pre-fix product failure located in followed file history; source guard retained.
- [A146](#a146) — 12 expanded cases, 1000 1600x900 › great-blue-hole low: approach, first scan, Journal and debrief; evidence `6d0eb2c`; retain ordinary capability guard; existing opt-in/local-only restrictions recorded. No specific pre-fix product failure located in followed file history; source guard retained.
- [A147](#a147) — 12 expanded cases, 1000 1600x900 › challenger-deep low: first minute, one Journal tag and life=0; evidence `6d0eb2c`; retain ordinary capability guard; existing opt-in/local-only restrictions recorded. No specific pre-fix product failure located in followed file history; source guard retained.
- [A148](#a148) — 2 expanded cases, lost-city: Low opening at 844×390 retains lighting and renders without console errors; evidence `83bab2b`; fold → opening-framing.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A149](#a149) — 6 expanded cases, 530 Titanic tile low: first-frame fill and permanent snow survive the merge; evidence `4f6351a`; fold → opening-framing.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A150](#a150) — 5 expanded cases, F-VERIFY-610 portrait Low opening pitch › titanic: sub and HUD remain fully visible after 3 s; evidence `3ce5b87`; fold → opening-framing.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A151](#a151) — 18 expanded cases, 650 merges 1600×900 › titanic low: opening intent and rendered work; evidence `bf6d5f7`; fold → opening-framing.spec.ts. No specific pre-fix product failure located in followed file history; source guard retained.
- [A155](#a155) — 12 expanded cases, 1290 desktop › endurance low: merged opening clears terrain and tower-tip HUD; evidence `985a1b1`; fold → opening-framing.spec.ts. [1290 audit](1290-f-verify-hull-lostcity.md): actual fixed bug was Terrain.dispose cache retention, guarded by units; e2e opening assertions are verification, not proof of a reproduced collision
- [A156](#a156) — 8 expanded cases, 1240 desktop › challenger-deep: scan reward names the POI and opens its authored Journal entry; evidence `0b5681e`; retain ordinary capability guard. [1240 note](1240-f-verify-lander-firstdisc.md): reproduced sustained-input timer and Pause→Journal defects; authored POI/Journal names legitimately differ
- [A169](#a169) — 1 expanded cases, hull classes, ROV with tether and cockpit view render; evidence `7cd7b17`; retain ordinary capability guard. No specific pre-fix product failure located in followed file history; source guard retained.

## Pickaxe and integrity evidence

- `git log -S` base-url: `b0bd5fb F1-TOUCH: touch controls, touch-friendly menus, PWA manifest and service worker; 7e1ee24 wip(f0-core): app systems, config/procedural/css splits, quality v2, asset service; cc2cfbc core: base-URL fix (C6), wire presets (C3), Lost City pack`.
- `git log -S` tip: `985a1b1 verify(1290): Terrain.dispose clears height memo; cache and opening-clearance tests`.
- `git log -S` clearance: `e6010bc feat(690): f-bluehole-grotto (Codex)`.
- `git log -S` triangles: `370eba3 wip(875): fidelity rollout (Codex)`.
- `git log -S` boost: `e399c47 wip(1392): touch boost toggle and HUD Journal button (round 1)`.
- `git log -S` journal: `90609f4 wip(f-journal-mobile): phone sheet, site page chips and rows, About this site, data credit; 6d0eb2c test(1000): verify 940/950 hero openings, journal, life disposal`.
- `git log -S` carve: `22bda86 fix: carved-site physics sample near mesh; Monterey free-dive range 16 (920 verification)`.

Read-only discovery lists matched on entry/source/line/title between local andCI:806 each,95 entry files. Counts here also include shared title helper declarations in both entry specs. No e2e was run and no runtime passing assertion or serial timing is claimed. Validate this Markdown, its case counts/timing matches and sole-file diff; full application gates are outside this analysis-only request.
