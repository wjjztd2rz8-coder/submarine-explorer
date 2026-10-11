# f-tutorial-order

Changes

- Tutorial.remember(event) records a lights/scan/journal/photo done before its step (never advances the current step); advance() then auto-skips following steps already done. forgetEarly() clears on a new dive.
- onboard system calls remember on scan:complete (not scan:started), lights, photo, journal when they do not match the current step.
- Unit test: "events done out of order skip their step on arrival"; existing pinned assertions unchanged.

Gates: PW_PORT=4733 tools/gates.sh green (build, unit, python, content, attribution, prettier, e2e).
