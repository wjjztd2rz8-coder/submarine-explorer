# Status — 2026-09-16 (end of Fable planning session)

Done: research docs, 68-landmark catalog, Tier-0 scaffold (green), master plan, work packages, owner decisions (plan/DECISIONS.md), A5 art direction.
In flight when session ended (agents write directly into this repo): A1 terrain detail/LOD, A2 atmosphere/post, A3 sub feel/input, A4 audio.

## Integration checklist — run by Fable (Opus/Sonnet subscription is near its cap; keep them for build packages only)

1. `git status` to see what A1–A4 produced; read each package's doc (docs/terrain.md, docs/atmosphere.md, docs/playtest-A3.md, docs/audio.md).
2. `npm run build && npm test && npm run test:py && npm run test:e2e`; fix conflicts in the shared files src/core/Config.ts and src/main.ts (each agent was told to make only additive edits).
3. Read tests/e2e/screenshots/_.png and docs/img/atmosphere-_.png; confirm no black frames, no visible cell grid, distinct looks at 10 / 300 / 3800 m.
4. `npm run dev` and play ?tile=monterey-canyon and ?tile=titanic at ?tier=medium on this Mac; confirm 60 fps.
5. Run the QA pass brief (plan/WORK-PACKAGES.md, "Cross-cutting") to write plan/QA-A.md, then commit Phase A.
6. Start Phase B (B1–B4) from plan/WORK-PACKAGES.md; B2 and B3 can start immediately, B1 and B4 are Opus.
   Budget note: subscription models at 88% as of 2026-09-16 evening; launch at most 2 build packages at a time until it resets.

## Phase A agents were stopped at 2026-09-16 evening (subscription cap). Where each was:

- A1 terrain: code done, unit tests passing; was about to run build + e2e. Needs: e2e run, screenshot check, docs/terrain.md check.
- A2 atmosphere: code mostly done; was adding the depth-band EventBus event. Needs: finish event, three depth screenshots, docs/atmosphere.md.
- A3 sub feel: code + tests done; was writing docs/playtest-A3.md. Needs: that doc, e2e run.
- A4 audio: build passing; was about to run e2e. Needs: e2e run, ATTRIBUTION rows check, docs/audio.md check.
  State after stop: `tsc` clean, 107 unit tests pass (was 51). e2e not yet re-run. Each package can be resumed by re-pasting its brief with "the previous agent got this far: <line above>; finish it".

## Update 2026-09-16 late: Phase A finished by Fable

- A2 render modules wired into main.ts (Atmosphere, Headlights, MarineSnow, surface lid); `?depth=` spawn param; L toggles headlights; post pass driven by band grade; low tier renders without post.
- Docs written: docs/terrain.md, docs/atmosphere.md. QA findings: plan/QA-A.md (sonar minimap bug on Titanic tile is the one real defect).
- Gates: tsc clean, 107 unit, 9 py, 9 e2e all green. Nothing committed yet.
- Next: commit Phase A (owner to say when), then Phase B (B1–B4) after the subscription resets Thursday 12:10 AM CST. B2/B3 are Sonnet, B1/B4 Opus. Fix QA-A #1 in the same Sonnet session as B3.
