# f-rusticles

Why: Titanic rusticles were large, uniform orange cones that read as thorns.

Changes (src/world/props/wrecks):

- instances.ts: new thin strand geometry (flared root, beaded stalk, sagging tip, 8 height segments); hangRusticle now shorter, thin with varied thickness, near-vertical hang, ochre-to-brown instance colour (root 0x8a5424 to tip 0x4a2a14).
- ship.ts: rusticlesAlong places clumps of 3-8 strands (one clump per ~2 strands of density) with shared reach and the odd long one, leaving bare steel between. Applies to Titanic bow/stern and Bismarck. Still instanced.

Screenshots (.cache/golden, Titanic):

- before: 2026-10-10-164554/titanic-2.png, titanic-3.png
- after: 2026-10-10-164912/titanic-2.png, titanic-3.png
  (Intermediate too-thin attempts: 164704, 164808.)

Gates: PW_PORT=5731 tools/gates.sh, all passed (build, unit, python, content, attribution, prettier, e2e smoke, e2e-base) after formatting the progress note.
