# F-BUGHUNT-2 — verification and fixes

2026-10-02. Two audit passes completed in this worktree. No commit made.

## Confirmed bugs fixed

1. **Live mode changes left the wrong hull fitted.** Submarine initialization fitted a hull once, while MissionSelect and globe access updated whenever the saved mode changed. A fresh Titanic pilot switching Arcade → Realistic kept Class B; switching from a Realistic free dive → Arcade kept Class A, allowing pressure failure despite Arcade access. The submarine now refits on mode changes and research updates. Free-dive clearance and the HUD rating-limit note are recomputed, including when a hull unlocks during a dive. Both new subscriptions are disposed. The submarine mesh follows its existing per-frame hull update.
2. **Home and briefings consumed controls-hint dives; missions counted twice.** Camera initialization incremented the persisted count, then `mission:started` incremented it again. Counting now starts on the mission event or the first active free-dive frame. Home/briefing time consumes neither the three-dive allowance nor its 20-second hint window. Learning move/turn/ballast still persists and suppresses later hints.
3. **Reset-camera listener and control-use closure survived controls-system disposal.** `HUD.onResetCamera` now returns an unsubscribe function tracked by the camera system. Disposal also clears the module's control-use callback so it does not retain the previous dive context. Existing canvas and bus handlers remain tracked.
4. **Daily boot could mix dates across UTC midnight.** The URL date was compared before catalogue loading, but `dailyDive` received a fresh UTC date afterward. The accepted date is now captured before any boot loading and reused for validation and the seed. An already-running Daily remains dated to its original run while the home card rolls over independently.
5. **Purchases overrode Daily Low light.** The progress system reapplies the saved light preset after upgrades; the Daily system previously enforced its modifier only on settings changes. It now also reapplies conditions after progress changes, with a disposed subscription. A regression uses the real progress system and actual light-upgrade purchases, and verifies saved preferences remain intact.

## Second-pass checks

- Added migration coverage for partial Custom saves: missing gameplay/options, Gentle, valid `false` values and an invalid retired light value. Valid settings survive and absent/invalid keys receive defaults. Realistic saves without gameplay keys restore their preset. Existing Gentle/Exaggerated persistence tests continue to pass. No migration/schema change was needed.
- Reviewed `Progress.canDive`/`hullFor`, MissionSelect locks, globe access, workshop copy and composed mission openings. Only Realistic gates by research; Custom retains the merged behavior. The workshop explicitly describes research hull unlocks as Realistic and Arcade's automatic fitting. Daily candidates intentionally use research entitlement, as specified by F2-MODES, even in Arcade. The composed opening remains limited to Arcade, near-site choices, loaded props and non-Daily runs.
- Fake-clock coverage verifies home-card UTC rollover, unchanged active Daily data, timer removal, and unsubscribed settings/progress refresh and enforcement. Camera regressions verify one count per mission start, the full three-free-dive allowance, learned controls persistence and reset-handler disposal.
- Reviewed touch placement and the existing bounding-box e2e assertions. No CSS change is claimed: browser execution is unavailable here. Follow up with narrow landscape (667×375/568×320), portrait (390×844), enlarged UI scale and long tutorial/scan text. The short-landscape column is `100vw - 438px` before safe-area effects, so those smaller widths warrant explicit overflow checks. These are unverified layout risks, not reproduced overlap findings.

## Validation

- `npm test`: **PASS — 770 tests in 77 files**.
- `npm run build`: **PASS**, including strict TypeScript. Existing large-chunk advisory only.
- `npx prettier --write` run on every changed source/test file and this report; final formatting and diff whitespace checks pass.
- Targeted Playwright attempt: `PW_PORT=4242 npx playwright test tests/e2e/f-hud-layout.spec.ts tests/e2e/f2-modes.spec.ts` could not start its web server. Direct preview confirms `listen EPERM 127.0.0.1:4242`; direct Chromium launch also fails at `sandbox_host_linux.cc` with Operation not permitted. **No browser pass or new screenshots claimed.** Rerun these specs plus `d2-predive.spec.ts` and progression/access specs outside this sandbox.
- The original external read-only `node_modules` symlink prevented Vite configuration writes. Dependencies were copied into ignored `.cache/node_modules` and the local ignored symlink redirected there. No tracked dependency or lockfile changes.
