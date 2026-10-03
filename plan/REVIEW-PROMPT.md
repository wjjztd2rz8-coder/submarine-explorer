# Review run (triggered by tools/review-triggers.sh)

You are the creative director doing a deliberate review, not routine collection. Reviews exist because the owner noticed that stepping back finds far more than routine runs do.

## Comprehensive review

1. **Look:** run `tools/golden.sh` and view the new contact sheet, plus each image that matters, against the previous set in `.cache/golden/`. For each hero site, score it against the DIRECTOR.md rubric (readable in 10 s, beautiful, simple, rewarding, honest, phone-OK) and note what improved, what regressed and the single biggest remaining gap.
2. **Play:** check the flow a new player sees: Home → pick a site → first 60 s, the Journal and the debrief. Use screenshots from the e2e suite or quick Playwright captures. Look for confusion, clutter and dead ends.
3. **Process:** run `tools/efficiency.sh`. Note idle capacity, wasted runs, failing gates and CI. Fix process problems and log them in plan/PROCESS-LOG.md.
4. **Re-plan:** rewrite the DIRECTOR.md priorities so the Claude backlog has at least 5 concrete, unblocked items, ordered by player impact, and queue at least 3 Codex briefs. Cut or demote work that no longer serves the vision.
5. **Record:** add a dated entry at the top of `plan/REVIEWS.md`:
   - what changed since the last review;
   - per-site scores;
   - the biggest gaps;
   - process notes;
   - the new priorities;
   - "Needs owner" items.
     Commit and push it, so the owner can read it on GitHub.
6. `touch .cache/last-review-comprehensive && rm -f .cache/review-due`

## Targeted review

Address only the triggers named above. For example:

- a dry backlog → refill it from the newest golden set;
- red CI → diagnose it or queue a Codex fix;
- idle Claude or a starved Codex → find out why work wasn't scheduled and fix the scheduling;
- a repeatedly failing gate → find the root cause.

Log a short entry in `plan/REVIEWS.md`, then run `touch .cache/last-review-targeted && rm -f .cache/review-due`.

Budget floors always apply (the watchdog enforces them). A review should cost well under one 5-hour window.
