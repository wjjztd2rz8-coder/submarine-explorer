# V-eight-sites-lit (e): Blake Plateau coral mound lit at the opening

Shots: `.cache/codex/shots/V-eight-sites-lit-e/{before,after2}-{desktop,portrait}.png` (mission opening, High tier, 1600x900 and 390x844; `after-*` is an earlier, greyer tint).

## What changed

- `src/world/props/geo/coral.ts`: the coral-mound body and the instanced colonies get the existing `vertexGlow` self-lit lift (as chimneys, Lost City and Monterey scarps already do), warm-white tint, so the mound keeps vertex-colour form (pale tops, darker undersides) beyond headlight range. No new code path, no site id; Hudson Canyon's mounds share the feature and are lifted the same way. Per-site data could not carry this: the mound is a procedural prop with no per-site tint field, and site ambient was already lifted in (b).

## Tier behaviour

Same shader injection on every tier; no extra draw calls or geometry. Vase sponges are left unlit.

## Rating (conservative)

| Shot           | Before | After |
| -------------- | ------ | ----- |
| Blake desktop  | 3.7    | 4.0   |
| Blake portrait | 3.7    | 4.0   |

## Gaps

- At 160 m the mound is a pale grey-tan lump with visible colony texture and a darker lower edge; it reads as warm-grey rather than ivory, and the shadow side is subtle.
