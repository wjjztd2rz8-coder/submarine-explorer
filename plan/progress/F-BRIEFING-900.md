# F-BRIEFING-900 — compact mission briefing

2026-10-08. Implementation complete; rendered acceptance and after screenshots
remain pending because this sandbox blocks browsers and localhost servers.

## Result

- Objectives now lead the card. Titanic and Great Blue Hole each show three
  prioritised facts and three hazards. Other sites use their first three of each.
- One native **More about this site** disclosure holds the existing summary,
  remaining facts/hazards and controls. Every bullet remains unchanged; no
  mission/content JSON was edited and no bullets were merged.
- The Journal loads the parsed mission briefing and offers the same disclosure
  with the complete summary, facts and hazards, available before any scan.
  Its existing catalogue facts, entries, sources and unlocks remain intact.
- **Begin dive** is the only filled button. **Free dive** is a real text link
  retaining the site's free-dive route; **Back to home** and **Advanced** are
  quiet controls. The start radios form one compact, keyboard-operable toggle:
  **Start: near the first target / at the surface**. Saved choices and preview
  callbacks use the existing code.
- Portrait styling removes the oversized sticky footer, compacts metadata and
  settings, and uses the existing DM Sans font for the longer lists. Targets
  remain at least 44 px tall. Titanic's memorial note stays visible by default.
  Native summaries join the focus trap; Enter on a summary or link keeps its
  own action instead of starting the dive.

Priority order (original zero-based bullet indices): Titanic facts **1, 0, 3**
(orientation, discovery, survey resolution), hazards **3, 4, 1** (fragility,
visibility/current, hull rating). Great Blue Hole facts **0, 1, 3** (dimensions,
platform, protected status), hazards **0, 1, 2** (coral, drop-off/current, light).
The existing effective-hull substitution in mission routing is unchanged.

## Three review rounds

1. Reordered objectives and bounded previews; preserved the rest behind one
   disclosure. Added the mission overview to Journal site pages before the scan
   lock. Reviewed native disclosure and link keyboard handling.
2. Compacted phone metadata, start/settings and actions; kept touch targets and
   the memorial. Added six viewport/site browser cases plus two Journal cases.
   Updated existing tests for the link, collapsed controls and removed visual
   Dive settings heading. Corrected the unit fixture's missing `shellBaseHref`.
3. Ran build, unit/Python suites, strict content validation and formatting.
   Attempted the complete e2e suite and briefing suite with `--repeat-each=3`.
   Both stop before tests start. No browser checks or screenshots are claimed
   as passed; the 390×844 no-scroll requirement still needs rendered acceptance.

## Checks

- `npm run build -- --outDir dist-briefing-900`: pass (TypeScript + production
  bundle; existing large-chunk warning).
- `npm test`: **1,480 passed across 147 files** after the fixture correction.
- `npm run test:py`: **148 passed**.
- `npm run check:content`: **13 sites pass**, zero errors or warnings.
- Prettier on changed files and `git diff --check`: pass.
- Briefing Playwright test discovery: **8 cases listed**; TypeScript passes.
  JSON imports include the native Node import attribute required by the runner.
- `PW_PORT=4190 PW_OUTDIR=dist-briefing-900 npm run test:e2e`: blocked at preview
  startup. A direct preview attempt reports `listen EPERM ... 127.0.0.1:4190`.
- `PW_PORT=4190 PW_OUTDIR=dist-briefing-900 npx playwright test
tests/e2e/f-briefing-900.spec.ts --repeat-each=3`: same startup block.
- Browser skill setup found no connected browser (`browsers.list()` returned
  `[]`). Direct Playwright Chromium startup also fails with
  `sandbox_host_linux.cc:41 ... shutdown: Operation not permitted`.

The browser spec waits for props/fonts, captures the default briefing, checks
three bullets per list and every objective, and asserts **no vertical or
horizontal panel overflow at 390×844 and 1600×900**. It exercises Enter/Space on
the disclosure, complete-copy retention, axe, the Free dive link's Enter action
and the Journal disclosure before a scan. Existing predive tests cover saved
start choices and preview pose persistence.

## Before / after screenshots

The before images are the director's supplied **510** audit baseline, copied
unchanged locally; they are not fresh captures. The shared `shots` directory
is a symlink outside the writable workspace, so this task uses the writable
`.cache/codex/900-f-briefing-compact/` sibling. Browser tests will produce
`after.png` alongside each `before.png`. No after images were fabricated.

| Site            | Viewport | Before                                                                                      | After                  |
| --------------- | -------- | ------------------------------------------------------------------------------------------- | ---------------------- |
| Titanic         | 1600×900 | [Screenshot](../../.cache/codex/900-f-briefing-compact/1600x900/titanic/before.png)         | Pending browser access |
| Titanic         | 390×844  | [Screenshot](../../.cache/codex/900-f-briefing-compact/390x844/titanic/before.png)          | Pending browser access |
| Titanic         | 844×390  | [Screenshot](../../.cache/codex/900-f-briefing-compact/844x390/titanic/before.png)          | Pending browser access |
| Great Blue Hole | 1600×900 | [Screenshot](../../.cache/codex/900-f-briefing-compact/1600x900/great-blue-hole/before.png) | Pending browser access |
| Great Blue Hole | 390×844  | [Screenshot](../../.cache/codex/900-f-briefing-compact/390x844/great-blue-hole/before.png)  | Pending browser access |
| Great Blue Hole | 844×390  | [Screenshot](../../.cache/codex/900-f-briefing-compact/844x390/great-blue-hole/before.png)  | Pending browser access |

The baseline portrait Titanic image shows the sticky settings/actions covering
most of the site information and objectives. The default desktop Blue Hole
image shows four facts, four hazards and three competing actions. After QA
must check the full default card at portrait, readable bullet wraps, distinct
start selection, and access to disclosures/Begin in landscape.

To finish rendered acceptance in a browser-capable environment:

```bash
npm run build -- --outDir dist-briefing-900
PW_PORT=4190 PW_OUTDIR=dist-briefing-900 npx playwright test tests/e2e/f-briefing-900.spec.ts --repeat-each=3
PW_PORT=4190 PW_OUTDIR=dist-briefing-900 npm run test:e2e
```

Inspect all six `after.png` images, replace the pending table cells with image
links, and record the actual panel overflow results. The requested paired
visual QA is outstanding until that review passes.
