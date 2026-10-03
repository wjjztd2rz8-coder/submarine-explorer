# F-COSMETICS — sub paint and lens trims

## Plan

- Add a data-driven catalogue: current paint plus seven rewards, two lens trims
  plus the current lenses. Use best total stars (3/6/10/15), three stars at any
  Director hero site, any secret and a three-day Daily streak.
- Extend the existing progress save additively, keeping its key/version and
  current-look defaults. Sanitize selections and preserve earned streak rewards.
- Add touch-sized choices to the existing workshop, with lock requirements,
  selected state and keyboard focus retained after updates.
- Apply paint through material uniforms and tint lens materials on every tier;
  retain geometry, beam settings and Arcade site access.
- Cover unlocks, migration, selection persistence, defaults and material changes
  with unit tests; run gates and document browser screenshot acceptance.

## Progress

- Read Progress/Save, research rewards, Daily completion, Journal/workshop and
  vehicle vertex-colour materials. No title or HUD layout changes are needed.
- Implemented `src/game/Cosmetics.ts` with eight paint choices (Stock plus seven
  rewards) and two earned trims plus Stock lenses. Names are short and plain.

| Choice                    | Reward                                         |
| ------------------------- | ---------------------------------------------- |
| Red paint                 | 3 total stars                                  |
| Blue paint                | 6 total stars                                  |
| Green paint               | 10 total stars                                 |
| Gold paint                | 15 total stars                                 |
| Orange paint              | 3 stars at any of the five Director hero sites |
| Violet paint / Amber trim | Find any secret                                |
| Silver paint / Blue trim  | Earn a three-day Daily streak                  |

- Total stars sum saved best ratings, including dated Daily ratings. Repeat and
  aborted dives cannot farm stars. Spending RP does not change cosmetic access.
- Added `cosmetics` and `dailyBestStreak` to the progress record without changing
  the storage key/version. Migration recovers rating reward tokens before
  checking selections, defaults old/invalid/unearned choices independently to
  Stock, and retains future-version write protection. Daily startup imports the
  existing saved streak; completion records the maximum so rewards remain earned
  after a missed day.
- Added the picker inside the existing research workshop: scrollable fieldsets,
  native buttons at least 44 px tall, swatches, visible requirements, disabled
  locked choices, `aria-pressed` selection and retained keyboard focus/scroll.
- Material uniforms remap fairing vertex colours while retaining dark fittings,
  accent boundaries, textures and rim lighting. Stock uses the original RGBA
  vertex colour. Lens tint follows lights on/off; scene light colours, beam
  range, intensity and gameplay profiles stay intact. Hull changes retain paint.
- Application wiring consists of startup/live sub selection, Daily startup
  credit and a completion credit. No title scene or HUD layout files changed.

## Validation

- `tools/gates.sh --no-e2e`: PASS build, unit, Python, strict content, attribution
  and Prettier. Full suite: 100 files / 1,073 tests. Includes 29 new checks for
  catalogue/defaults, threshold and hero unlocks, secret credit, lasting streak
  rewards, old/damaged/future saves, selection isolation/persistence, gameplay
  isolation, all four tiers and three hulls, live sub updates and listener cleanup.
- Material checks exercise Three.js's actual standard shader source and compile
  hook without WebGL, including this version's RGBA vertex-colour varying. They
  verify geometry/vertex data and render budgets remain unchanged, lens dimming,
  stock restoration and selection retention across hull swaps.
- The supplied dependency symlink targets a read-only tree. Validation used a
  temporary copy under `/tmp/f-cosmetics-validation`; the original symlink is
  restored afterwards. No dependency or lockfile changes.
- Browser/e2e and visual acceptance are deferred to the orchestrator as requested.
  No screenshots or browser pass are claimed.

## Screenshots the orchestrator should check

1. Workshop on desktop and 390×844 / 320×568 phones with a fresh save: Stock is
   selected, requirements are visible, choices fit without horizontal scrolling,
   tap targets remain at least 44 px and Back is reachable by scrolling.
2. Workshop after 3/6/10/15 best total stars, one three-star hero site, a secret
   and three consecutive successful Daily completions: each specified reward
   becomes available; tapping retains focus and selected state after reload.
3. Chase/orbit sub shots for A/B/C on Low, Medium, High and Ultra: compare Stock
   with Blue paint and Amber trim at the same pose. Check fairing/accent colours,
   retained dark fittings, decals, shape and beam/terrain illumination. Toggle
   lamps off/on and select Stock again; check tint and brightness restoration.
4. At Titanic on a fresh Arcade save, check the original-look sub and deep site
   access. Select earned paint during a loaded dive, then reload another site:
   appearance follows the choice and hull fitting/depth access is unchanged.

Debug setup in an isolated test profile can use the existing `window.__game`
handles: `progress.finish(site, objectives)` uses best-site stars,
`progress.award('secret', 'titanic/find-1')` unlocks Violet/Amber and
`progress.recordDailyStreak(3)` unlocks Silver/Blue. Use the UI to select choices;
also verify the real Daily completion path for the streak acceptance shot.
