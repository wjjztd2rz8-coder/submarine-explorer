# V-monterey-striation (addendum to V-monterey-wall-clarity)

Change: scarp wall vertex colour now fades toward the wall's mean tone with camera distance
(`calmWithDistance` in `src/world/props/geo/scarp.ts`, applies to every scarp wall; near rock is
unchanged), and the Monterey bedding-relief normal fade in `materials.ts` starts closer.

- Before: `plan/progress/V-monterey-striation/before.png`
- After: `plan/progress/V-monterey-striation/after.png`

Honest rating: 5/10 (was about 4.5). Distant left-hand rock is visibly calmer and less
high-contrast, but the stripes remain: most of the read comes from displaced ledge geometry
(lighting on the ledges), not colour or normals, so a colour/normal fade cannot remove it. No
single wall face reads as the scan target in the first 10 s.

Remains: distance-based reduction of ledge displacement amplitude (needs LOD or a coarser
second mesh; baked geometry is not camera aware), and a pose/composition change so the target
wall fills the view.
