# V-titanic-palette-2

## What changed

- Titanic bow and stern `muted` 0.6 to 0.75, and the muted target made greyer (less red), so the lit hull is grey-brown instead of pink. `muted` is only used by Titanic, so other wrecks are unaffected; the shared plate shader is untouched.
- Rusticle geometry colours (root/tip) and per-instance shade deepened to ochre-brown.
- Railing bar colour changed from orange-brown to a duller brown (shared with Bismarck, slight).
- Colour only; no geometry or budget change.

## Screenshots

`.cache/codex/shots/V-titanic-palette-2/`: before-, r1-, r2-, r3- for titanic poses 1-3 (r3 is final), plus Endurance pose 3 before/r2 (identical apart from animated life).

## Gates

`PW_PORT=4874 tools/gates.sh` all PASS, no snapshots changed.

## What remains

- At pose 3 a few rusticle roots under the headlight still read slightly orange.
- Rust streaks remain subtle; stronger streaking needs a shader change.
