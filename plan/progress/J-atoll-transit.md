# J-atoll-transit

Changed: 1-star debrief next-step now reads "Finish the optional objectives for 2 stars; some are a long transit away." (src/ui/Debrief.ts, shared, no site branch). Blue Hole's western atoll objective hint now says "Optional: head about 6 km west", matching the eastern one's distance cue.

Reused: the existing debrief "next" line and the objectives' hint text. No new card, toast or chip.

Tests: debrief unit and e2e expectations updated for the new text.

Gates: PW_PORT=4871 tools/gates.sh all PASS (python, content, build, unit, e2e, e2e-base, attribution, prettier).
