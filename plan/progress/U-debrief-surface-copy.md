# U-debrief-surface-copy

- Changed: the debrief fallback headline in `src/game/MissionRouter.ts` is now "Dive summary" instead of "Back at the surface" (partial dive, including a pause-menu end while still submerged). "All objectives complete", "Primaries complete" and "Dive aborted" are unchanged. Test pins updated in `tests/e2e/journal-debrief.spec.ts`, `tests/unit/journalData.test.ts`, `tests/unit/missionRouter.test.ts` and `tests/unit/debriefReopen.test.ts`.
- Gates: `PW_PORT=4420 tools/gates.sh` passed (unit 194 files / 4435 tests, python 167, content, build, prettier/attribution, e2e smoke 3/3, project-base 8/8). Targeted vitest on the three unit files: 190/190.
- Not run: the full `journal-debrief.spec.ts` e2e (its pinned lines were only text-updated; smoke and project-base do not cover them).
