# f-ci-heavy-specs

Goal: skip heavy frame-count specs on hosted CI (CI env) only; local runs unchanged.
Done: test.skip(!!process.env.CI) on f-verify-1000 high tier and f-bughunt-1090 Low-opening test; CHANGELOG cut-log line; prettier+tsc next, then commit.
