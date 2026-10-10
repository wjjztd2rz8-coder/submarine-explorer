# F-PHONE-PASS

Captured 844x390 touch landscape (GOLDEN_LAYOUTS=landscape GOLDEN_MODE=mission) for Titanic, Lost City, Blue Hole, Beebe, Challenger lander and Endurance. Before/after shots: .cache/codex/shots/f-phone-pass/{before,after}/.

Capture tool fix: golden-shots.mjs phone layouts used a mouse click on Begin, which dropped touch mode (desktop HUD showed at 844x390, covering ~60% of frame). Now isMobile + tap.

Fixed: sonar map too small/illegible (96 -> 120 px, contour labels hidden when compact); mission title truncation (prefix hidden on phone landscape); layout offsets for scan stack and credit chip.

Open: Blue Hole minimap is a flat teal tile with a small hole (palette/zoom, Codex 1200/1250); Endurance and Titanic spawn framing puts the sub under the PHOTO/SONAR buttons and the Endurance hull is small; long titles (Lost City, Lighthouse Reef) still ellipsis.
