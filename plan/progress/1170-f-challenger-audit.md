# 1170 Challenger Deep / Endurance audit

Scope: read-only scene research plus small, site-specific data/config fixes. Do not edit hero geometry, Lost City, or Blue Hole content. Two rounds: baseline audit, then verification of fixes.

## Plan

1. Capture Challenger Deep and Endurance with `GOLDEN_SITES=challenger-deep,endurance tools/golden.sh`, including desktop and portrait views. Inspect opening, approach, and detail frames for empty/flat areas and readability.
2. Trace amphipod spawning, sediment ripple settings, and lamp range. Change only demonstrated data/config issues; preserve real depth bands and label staged encounters honestly.
3. Check the Journal's factual claims against primary research and expedition/heritage sources. Correct inaccurate or stale text at the data level and record sources.
4. Capture the same views after changes, run `tools/gates.sh` plus relevant existing checks, and record results and geometry handoffs.

## Progress

- Repository starts clean; no applicable `AGENTS.md` found.
- Round 1 baseline capture launched with High tier, desktop and portrait layouts, deterministic life seed 42, and both requested sites only.
- Existing site-local configuration is in `src/core/config/deepOpenings.ts`; sediment settings are in the two relevant `BIOMES` entries. Journal text comes from landmark guide data and wildlife data.
- Round 1: golden build passed, preview bind failed with `listen EPERM` at `127.0.0.1:4298`. Found the exact owner-cited historical set in `/home/vijay/submarine-explorer/.cache/golden/2026-10-09-191533`, inspected all six Challenger/Endurance frames, and copied those frames and the pose manifest to `.cache/1170/baseline`. These are historical evidence, not captures of this branch.
- Baseline focused verification: four existing unit files, 31 tests passed. Amphipods already spawn; the visual issue is weak grouping/placement, not an empty or invalid depth band.
- Changes: Challenger staged patch 19 m ahead / 9 m lateral -> 24 m / 5 m, 12/18 individuals -> 18/30 (Low/other tiers); Challenger ripple wavelength 0.55 -> 1.2 m; Endurance wavelength 0.55 -> 0.8 m and ripple strength 0.35 -> 0.2. No change to light intensities/ranges, ambient exposure, animal scale or geometry.
- Journal corrections: dated 8,336 m fish record in another trench; 2–5 cm amphipod specimen range; Eastern/Central 2019 dive schedule; Endurance star below name; protection measures and dates; survey-grid wording; removal of continuous-search implication. Primary sources recorded in each site's `sources.md`.
- Round 2: same golden command built successfully and again failed at the preview bind. No new PNGs were produced. Existing focused checks passed again (31 tests); all four tiers preserve the staged group through 60 seconds and pass desktop/portrait sightline and hull-clearance checks.
- Full gates passed build, Python, strict content, attribution and formatting. Unit run: 1,623 passed, one existing biome snapshot failed because of the intended two-site material config changes. Updated only the six corresponding biome/uniform hashes; its three tests pass on recheck, with all terrain-buffer/shader and unrelated-site hashes preserved.
- Both browser gates failed to start their preview server. A direct run of the same preview command confirmed `listen EPERM` at `127.0.0.1:4273`.
- Final static rerun: `GATES_CONFIG_MODE=writable PW_PORT=4273 tools/gates.sh --no-e2e` exited 0. Config, build, all 1,624 unit tests across 163 files, 148 Python tests, strict content validation, attribution and formatting passed. Browser checks remain dependent on sandbox support for local preview servers.

## Final report

See `1170-f-challenger-audit-report.md` for the frame inventory, final configuration, source checks and validation limits. Research, small fixes and static checks are finished. Fresh captures and browser validation are blocked by the sandbox; visual acceptance remains outstanding.
