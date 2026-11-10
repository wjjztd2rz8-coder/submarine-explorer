# U-phone-landscape-hud

Phone landscape HUD is symmetric. `src/styles/hud-layout.css` (landscape touch block) now uses
`grid-template-columns: var(--hud-side) minmax(0,1fr) var(--hud-side)` (176 px each) with areas
`'sonar guide hud' / 'sonar . bar'`. The guidance card is centred in the middle track, sonar owns
the left edge, readouts and Journal the right edge. No per-element offsets; the old 250 px
readout width and the bar-above-card arrangement are gone (net fewer rules).

See it: `PW_RENDER_REVIEW=1 PW_OUTDIR=dist PW_PORT=4711 npx playwright test tests/e2e/phone-landscape-hud.spec.ts`;
shots in `.cache/codex/shots/U-phone-landscape-hud/` (844x390, 932x430, 667x375).

Spec: `tests/e2e/phone-landscape-hud.spec.ts` (card centre within 4 px of viewport centre, sonar left,
readouts/Journal right, no overlap with touch controls). Portrait and desktop CSS unchanged.

Known gaps: safe-area insets cannot be emulated in Playwright; padding is symmetric on both sides
so a notch with equal insets keeps the centre. Pause lives in the touch dock (not the HUD grid).
