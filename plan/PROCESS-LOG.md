# Process log

Changes to how the work is done (tooling, scheduling, agent use), with the reason and the evidence. The owner delegated this on 2026-10-01; the only hard constraint is the usage floors.

- **2026-10-01 night**
  - **Usage endpoint:** the Claude usage endpoint returned 429 for hours, and two runs were skipped. ai-limits now caches readings, backs off after errors and falls back to rate-limit headers.
  - **Start gate:** the Claude start gate no longer depends on Codex budget (Codex at 4% had blocked runs while Claude was at 98%).
  - **Timer:** it moved from 90 to 30 minutes so finished runs don't leave idle gaps.
  - **Codex watchdog:** it now re-arms after Codex's 5-hour reset.
  - **Codex queue:** added the queue and `tools/codex-dispatch.sh`, so Codex gets work while Claude is out of budget (it had sat idle for hours).
  - **Metrics:** added `tools/usage-sample.sh` (30-min metrics) and `tools/efficiency.sh` (summary).
  - **Director's brief:** added `plan/DIRECTOR.md`, so runs review packages against a rubric and send weak work back.
