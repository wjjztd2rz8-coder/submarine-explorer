# V-kama-axial-approach

## What changed

- Axial (`data/landmarks/axial-seamount-ashes/mission.json`): sulfide smoke opacity 0.9 -> 0.7 and `riseHeightM` 45 (preset override, data only). The plume no longer towers over the chimneys at the 110 m opening, so the cluster and its warm glow read as the subject.
- Kama (`src/world/props/geo/pillow.ts`): the pillow heap gets the shared `vertexGlow` (warm, as the smokers use), and the iron-bacteria mats get an emissive of their own colour as the lit accent. No site branch; no new code paths.

## Before / after (worktree `.cache/golden/`)

- Axial mission opening: before `2026-10-27-070311/axial-seamount-ashes-1-mission.png`, after `2026-10-27-070709/axial-seamount-ashes-1-mission.png`.
- Kama 95 m approach: before `2026-10-27-070120/kamaehuakanaloa-2.png`, after `2026-10-27-072336/kamaehuakanaloa-2.png` (also `...-3.png`).
- Kama mission opening (130 m, `2026-10-27-070709/kamaehuakanaloa-1-mission.png`): the heap is a small shadow on a steep slope; unchanged in practice.

## Rating (honest)

Axial ~3.5 (was 3.2): chimneys plus glow visible, plume is a smaller backdrop. Kama ~3.4 (was 3.1): the heap is now a readable brown mound at 95 m, but the orange accent is small and the mound looks somewhat clay-like.

## Still weak

- Kama mission opening faces a steep slope; the subject is distant and tiny there, needs opening pose/range tuning rather than materials.
- Pillow surface lacks the glassy sheen; the lit accent could be a real vent shimmer with orange glow light.
- Low-tier draw calls unchanged (materials only). Not merged.
