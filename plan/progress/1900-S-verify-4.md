# 1900 — S-verify, fourth pass

Audited from `9d23755^1` (`422c25a`) through the merged build at `8beae85`, focusing on V-titanic (`9d23755`) and V-rewards-look (`d445643`). Two passes: reproduce and repair Journal defects; then check isolation, costs, lifecycle and accessibility regressions.

## Confirmed bugs fixed

- The new “next unlock” hint ignored migration grants. A legacy save with 150 lifetime RP and zero discoveries already owns the rewards through 15 discoveries, but the picker advertised an unlock at 3. It now checks ownership through the existing `Progress.ownsCosmetic`: next at 20 for that save, and no next-unlock hint when all discovery rewards are owned. Selected values, swatches and grants survive migration to v2 and reload.
- Refreshing the Journal rebuilt Cosmetics as a closed disclosure and lost focus from its select. Reused the existing category expansion map and focus restoration to retain the disclosure, select or summary on desktop and phone, including crossing the phone breakpoint. Site navigation retains its existing phone behavior.
- Clarified the existing hint to “sub changes next dive”: photo frames are read at capture time and apply immediately.

No new player-facing element or setting. The existing hint and native picker are retained. No site branches, config mutation, new helper abstraction or package-named spec.

## Isolation and Low-tier cost

A temporary comparison loaded the actual parent sources from `git archive 9d23755^1`, then compared them with this checkout. All non-Titanic biome values and the default biome match. Vertex attributes, indices, instance matrices/colors and object transforms match for Bismarck, Endurance and every scatter kit, at Low/Medium/High/Ultra, including impostors. Existing terrain isolation snapshots pass unchanged. The comparison probe was removed; permanent guards extend the existing wreck capability tests.

Plate variation is used only by the Titanic bow/stern. It changes vertex colors during construction, without adding geometry, shader features or per-frame work. A regression checks that painting a plated hull does not affect later default paint calls. Rusticle girth defaults to one; regression coverage checks unchanged default clumps/random-stream consumption and radial-only scaling of individual strands.

Titanic's denser clumps intentionally increase triangle counts. Exact comparison at seed 1234 and the existing wreck-test dimensions:

| Near hull / tier | Parent triangles | Merged triangles | Draws before / after |
| ---------------- | ---------------: | ---------------: | -------------------: |
| Bow / Low        |           39,372 |           48,336 |                3 / 3 |
| Stern / Low      |           29,868 |           39,480 |                3 / 3 |
| Bow / High       |          195,306 |          235,158 |                6 / 6 |
| Stern / High     |          144,056 |          173,324 |                5 / 5 |

Low remains below the existing 180,000-triangle near-hull budget; High remains below 700,000. Existing tier thinning, omitted Low railings/openings and LOD behavior remain intact. These are geometry budgets, not a real-phone frame-time measurement; the owner's phone performance check remains open.

## Photo and swatch audit

- One photo status element remains inside the top panel in normal flow, below the caption. Fake-timer coverage runs twice: success lasts 2.5 seconds, errors 6 seconds, replacement cancels the previous deadline, success clears error styling, exit clears the timer and status, and disposal leaves no timer behind. No toast lifecycle bug found.
- Photo card `object-fit: contain` preserves the full capture and baked border. Added a browser assertion to the existing photo capability spec, alongside caption/status placement assertions.
- Swatches are noninteractive previews beside native, labeled selects; the selected option provides the color/choice name without relying on color alone. Shared focus-visible styling covers selects; the previews add no tab stop. Added browser checks for all four accessible names, selected swatches, Tab/Shift+Tab, focus styling, migration reload and focus through responsive rebuilding.

## Validation

- Initial six targeted capability files: **98 tests passed**.
- Four added Journal cases failed before the fixes (migration hint at 3 instead of 20 / incorrectly present; Cosmetics closed on refresh in both layouts), then passed after the fixes.
- Expanded nine-file audit: **243 tests passed**, covering wrecks, terrain/scatter isolation, Journal, cosmetics, save soak/migration, modal focus and photo mode. After adding the final paint isolation check, all **36 wreck tests passed** (244 distinct targeted tests in total).
- Production build/typecheck and strict content validation passed. Changed files pass Prettier; `git diff --check` passes.
- Browser tests were attempted with the built app, but the preview server cannot listen in this sandbox: `listen EPERM 127.0.0.1:4630`. Browser assertions are added but have not run here; Playwright successfully lists all nine tests in the two extended browser specs.
- Broad `GATES_CONFIG_MODE=writable ... tools/gates.sh --no-e2e` was attempted. Four of 166 Python tests fail because the CI build manifest subprocess hits `spawnSync git EPERM`; the other 162 pass. Full unit/gate result recorded below. Read-only shared dependencies required the repository's existing writable-config mode.
