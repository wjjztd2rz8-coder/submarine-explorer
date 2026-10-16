# V-beebe-lighting

## What changed

- `spire.ts`: the torn-rim treatment (wall drop plus teeth) now applies to any irregular stack that is crusted, not only Lost City trunks. Beebe's main and side stacks (and the crusted side spires in `crustChimney.ts`) get jagged mouths instead of flat stump tops. Net change is one condition; no new helper.
- `data/landmarks/beebe-vent-field/site.json`: `atmosphere.lamps` (existing per-site table) tones headlight and fill to 0.55 and 0.6 of the preset, so close sulfide keeps its texture instead of washing beige. No material repainting, no shared-code branches.
- Snapshots (props geometry, Beebe isolation, merge counts, Low sweep) and the authored-policy expectation updated for the intended change only.

## Evidence

Before: `.cache/golden/2026-10-16-135921/beebe-vent-field-{2,3}.png`. After: `.cache/golden/2026-10-16-152620/beebe-vent-field-{2,3}.png` (worktree). Close pose now shows crust texture and warm brown against dark water; stack mouths are ragged.

## Honest rating

About 3.8 (from 3.6). Other sites are untouched by the lighting change (Beebe data only); the rim change reaches only crusted irregular spires, which are Beebe's.

## Remaining weakness

Close pose is still mid-brown rather than dark basalt/sulfide with a strong warm glow; the vent glow itself is faint on the main stack. The far vent at right is the warmest thing in frame.
