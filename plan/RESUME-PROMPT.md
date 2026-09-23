Resume Submarine Explorer orchestration (repo /home/vijay/submarine-explorer).

OpenAI sessions: substitute GPT-6 Astra for Fable and GPT-6 Sol for both
Sonnet and Opus throughout these instructions and the plan. Keep the original
Claude guidance. The current owner request authorizes implementation through
Sol subagents, with orchestrator review and iteration after each package.

Read the **latest OpenAI continuation checkpoint** at the top of STATUS.md
before the historical steps below. It records completed C6/C3 work, existing
untracked content, review findings, and the usage-related stopping point.
Do not repeat completed packages just because an older table says pending.

1. Read plan/STATUS.md ("resume here" table), plan/progress/*.md, and your memory notes (budget: $20 plan; 1–2 agents at a time; Sonnet for content/QA/docs, Opus for engine; commit a green checkpoint before the window ends).
2. Other agents/sessions may have committed or left uncommitted work since the last checkpoint (dc66674). Run `git log --oneline dc66674..HEAD` and `git status`; review their changes against plan/PHASE-B-CONTRACTS.md and plan/PHASE-C-CONTRACTS.md, run the gates (`npm run build`, `npm test`, `npm run test:py`, `npm run test:e2e`, `python3 tools/check_attribution.py`), fix or send back anything wrong, then commit a checkpoint.
3. A Sonnet agent was writing data/landmarks/{lost-city,monterey-canyon,challenger-deep}/ when usage ran out. Validate each with `python3 tools/validate_landmark.py <id>`; keep complete ones, finish or remove incomplete ones.
4. Continue in this order, one or two agents at a time: base-URL fix (6 files, plan/progress/C6.md, Opus) → wire C3 presets (Opus) → finish C5 settings (Opus) → remaining landmark packs (Sonnet, one pack at a time) → C1 e2e/docs → Phase C QA (Sonnet) → docs → commit.
5. Do not push, create a repo or enable Pages without the owner's go-ahead.
