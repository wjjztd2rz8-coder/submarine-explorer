# U-scan-fish-lock-landscape

## Root cause

Partly as described. The candidate pick already preferred the marked objective, but the "keep the beam locked" step in `Scanner.update` retained any active scan while `phase === 'scanning'`, even if the objective had since become eligible (in reach and in the cone). A wildlife scan started first therefore kept the reticle for the whole hold. A school of fish then chained one partial scan into the next (each fish leaves, the next in the cone takes over), so the objective never got the beam. Separately, when the beam left the objective for a moment, any fish inside the cone became the candidate and took over the in-progress objective scan.

## Change (src/game/Scanner.ts, one block)

- An active scan keeps its lock only if it is a fixed POI or the objective is not an eligible candidate. Wildlife and samples (not in the fixed target list) yield to an eligible objective mid-hold. Fixed POIs still keep their lock, so retargeting guidance does not swap a running scan (existing test unchanged).
- An in-progress objective scan, while still in range, is not handed to another contact when the beam is briefly off it: the scan goes to interrupted and resumes on turning back.
  No HUD change, no site branches, no config changes.

## Tests

Extended tests/unit/gameScanner.test.ts (new describe "objective priority over passing contacts"): objective takes the beam from a wildlife scan; wildlife keeps the lock while the objective is outside the cone; fish in the cone does not take an in-progress objective scan. gameScanner, e2eScan, progressScan unit files pass (55). The full unit suite exceeded the sandbox time limit here, so it was not run in full.

## Gates

PW_PORT=4871 tools/gates.sh: python, content, build, unit, e2e smoke, e2e-base and attribution pass. Prettier flagged plan/DIRECTOR.md, which this package does not touch (already unformatted on main); the note formatting it flagged was fixed.
No e2e spec was changed; none asserts fish-over-objective behavior.
