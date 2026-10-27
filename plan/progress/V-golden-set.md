# V-golden-set (backlog 7, Haiku)

Adds Kama (kamaehuakanaloa), Hunga (hunga-tonga-caldera) and Axial (axial-seamount-ashes) to the default golden set, so the contact sheet covers all ten sites (seven default hero entries plus these three).

## Change

- `tools/golden-shots.mjs`: three entries appended to `defaultHeroes`, using the same hero IDs and low-tier poses that the `GOLDEN_SITES` path already uses from `extraHeroes` in `tools/golden-options.mjs`. Kama and Hunga take their poses from `tools/lowtier-poses.json`; Axial is free-dive. No new mechanism. The usage header notes the default set.
- `selectGoldenHeroes` already skips a site that is present in the defaults, so `GOLDEN_SITES=all` does not duplicate these entries.

## Verification

- `GOLDEN_PORT=4884 GOLDEN_SITES=kamaehuakanaloa,hunga-tonga-caldera,axial-seamount-ashes GOLDEN_LAYOUTS=desktop tools/golden.sh`: exit 0. Contact sheet `.cache/golden/2026-10-27-214344/index.html` lists all three sites (9 captures, 3 per site). Manifest provenance is clean (`dirty: false`, sha = the wip commit).
- Gotcha: the default port 4298 was held by another worktree's preview (V-endurance-accent). `golden.sh` uses `--strictPort`, but its readiness loop accepted the foreign server, so the first runs captured that worktree's build (`dirty: true`). Those runs are discarded. Use `GOLDEN_PORT` to avoid it.
- Gates: `PW_PORT=4883 tools/gates.sh` passed: python, content, build, unit, e2e (smoke), e2e-base, attribution, prettier (`gates (e2e=smoke)`).
