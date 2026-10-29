# V-bismarck-patches

2026-10-29. Low tier, mission opening (`GOLDEN_MODE=mission`), desktop 1600x900.
Shots: `.cache/codex/shots/V-bismarck-patches/{before,after}/{bismarck,endurance}-1-mission.png`.

## Cause and change

- Hard patch edges: the shared terrain shader blended slot B over slot A with a +/-0.07 smoothstep on the macro noise, so the patch boundary was a few metres wide. Widened to +/-0.2 (`src/shaders/terrain.frag.glsl`); every biome gets soft-edged tint variation, Endurance included. No site branch.
- Bismarck's patch colour (`colorB`) was much paler than its base; toned to 0x4f4a44 in the site's biome data.
- Snow: the far brightness cap was a dead literal (3.6) above the real maximum (1.8). Now `water.snowMaxBrightness` (1.4) feeds both the CPU mirror and the shader uniform, so lamp flare cannot wash the frame. Unit test updated to assert the cap.

## Result (honest)

Bismarck and Endurance seabeds now read as smooth mottling; no polygon edges visible. Bismarck readability 0.144 (cutoff 0.125, was above before and stays above). The Low-tier mission shots barely show snow, so the snow cap is verified by unit test, not visually. Bismarck still has a dark upper frame (not this item). Rating: Bismarck ~3.2 -> ~3.4, Endurance ~3.0 -> ~3.2 (small gain, as expected).

No cuts; nothing added to the UI.

Note: the terrain shader and the Bismarck biome feed the cross-site isolation snapshot (`beebeIsolation`); it was regenerated because the shared blend change is intentional. Beebe also gets the softer patch edge (it was skipped by that test). The new snow uniform lives only on the permanent snow, not the wreck haze.
