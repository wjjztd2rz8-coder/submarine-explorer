# V-closeup-artifacts

Three close-frame goldens had one object that read as a rendering error. Findings and fixes:

## Blue Hole east, close frame

- Cause: the "shard" at the top edge was a blue tang 2.7 m from the lens (only its underside and tail forked into view). The mid-frame fish was another tang 6 m away, drawn 1.6 m long (the readability floor in `defs.ts` inflated a 34 cm fish to 4.7x).
- Fix: `LifeRender.sync` shrinks animals close to the camera (scaled by body length, capped at 5 m to 10 m), so nothing clips the lens or fills the view. `drawnSize` floor stops growing at 15 cm, so mid-sized fish are about 1.15 m instead of 1.6 m. The Monterey opening snapshot moved by 1-2 m for this reason.
- After: the frame shows only the gallery. Known gap: no life in this frame at all.

## Endurance, close frame

- Cause: pale animals under the hemisphere fill plus headlights saturated to near white, and squat lobster / anemone colours were close to sand and fog.
- Fix: shared life material mattes specular (x0.4) and softly caps lit radiance (knee 0.28, ceiling 0.45) per hue. Squat lobster and anemone colours moved to warmer tones in `catalogueInvert.ts`.
- After: lobsters read as salmon-orange animals, anemone fan tan. Small distant polyps still pale.

## Titanic, close frame

- Cause: the auto-picked pose looked down 35 degrees at the mud and a loose plate; paint was dusty pink after warm light.
- Fix: new `tools/titanic-poses.json` (same mechanism as the other sites) frames the hull face from the starboard quarter; `titanicBow.ts` paint is rustier (rustiness .85, muted .25) and darker (x0.68).
- After: rust-brown hull with portholes and rusticles filling the frame.

## Simplification

Merges the three one-off ideas into existing mechanisms: the pose uses the existing per-site pose-table path, the life cap lives in the one shared life material, and the keep-out reuses the existing per-animal scale. No new props or settings.
