# f-debrief-zero

Debrief with 0 scans: `src/ui/Debrief.ts` picks "Keep exploring" as the one filled primary when
`stats.discoveries.length === 0` and the action exists; "Dive sites" moves to the first quiet link.
Otherwise unchanged (Dive sites primary). Spec `tests/e2e/f-debrief-720.spec.ts` round 1 (0 scans)
asserts keep-exploring primary and dive-sites in `.debrief-secondary`; round 2 asserts the old behaviour.
Finding 3 (bracket across label) was already fixed in f-hud-overlap; no change here.
