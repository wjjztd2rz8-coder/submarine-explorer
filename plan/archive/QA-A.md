# QA notes — Phase A (2026-09-16)

Verified by Fable after integrating the stopped A1–A4 agents. State: `tsc` clean, 107 unit tests, 9 Python tests, 9 e2e tests (3 atmosphere, 2 smoke, 3 sub playtest, 1 frame-difference check).

## Findings, by severity

1. **Sonar minimap is wrong on the Titanic tile** (medium). In `docs/img/atmosphere-3800.png` the map shows a narrow green strip offset to the right with the "RMS Titanic" label drawn outside the frame. Monterey renders correctly. Likely an aspect/scale bug in `src/ui/Sonar.ts` for near-square tiles or for landmark labels near the edge. Owner: next Sonnet session (UI).
2. **Faint cell-aligned pattern from altitude in the surface band** (low). Visible in `docs/img/atmosphere-10.png` at 615 m altitude. Suspect texture repeat vs. cell size; see docs/terrain.md "Known gaps".
3. **A2 items not finished** (low, documented): Fresnel surface lid, chromatic aberration and god rays in the post shader. Uniforms exist, shader does not read them.
4. **No fps measurement recorded** on this Mac for the medium tier. Run `?tile=monterey-canyon&tier=medium&debugTerrain=1` and note the number in docs/terrain.md.
5. **Playtest doc** `docs/playtest-A3.md` was written by the A3 agent; its ten checks are covered by `tests/e2e/sub-playtest.spec.ts` and unit tests. Not re-verified by hand.
6. **Audio** was not audibly verified (headless). Unit tests cover the echo-delay maths; ATTRIBUTION.md has rows for the audio sources.

## Not regressions

- The Titanic plain is genuinely flat (≈640 m relief over 25×33 km); a dark frame with only a headlight pool is correct at 3,800 m.
