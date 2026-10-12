# f-journal-mobile

Owner phone feedback: "The journal is just hard to navigate on mobile", and less text at every menu (facts and hazards belong in a learn-more panel, once).

## What changed

- `src/ui/Journal.ts`
  - Phone sheet (`.journal.is-phone`, set from `matchMedia('(max-width: 760px), (max-height: 520px) and (pointer: coarse)')`, re-rendered on change): full screen, sticky header with a back arrow (hidden at the top level), the title and Close as a 48 px icon button (`aria-label="Close Journal"`). No contents tree, no "Contents" button. Levels: front page (site rows with `3/8` badges, a "This dive" tag, then a Photos row) -> site page (entry rows) -> entry. Back goes up one level and focuses the article. Escape and the shell's close paths are unchanged.
  - "Show spoilers" is a real switch (`role="switch"`, same `.jr-spoilers input`). It sits under the contents tree on desktop (with the `N / M LOGGED` count) and moves to the end of the contents/site/locked-entry pages on a phone.
  - Site page (all devices): title, meta line, memorial note, one summary paragraph, progress chips (`4/8 entries`, species, animals, secrets), the entry rows grouped under quiet headings (locked names stay hidden behind one "N more to find" line with a short how-to), then one collapsed "About this site" (the mission overview too, when the page shows the catalogue summary instead), then the data credit line. The sentence-style progress line and the "Read the entries" button are gone.
  - "About this site" holds facts, hazards and references. `src/ui/journalAbout.ts` merges the briefing's and catalogue's facts (near-duplicates by shared content words, 70% of the shorter line) and strips hull-rating sentences from hazards and facts, so Titanic keeps "Crushing pressure: about 380 atmospheres" without the "hull is rated to 6,500 m" sentence, and Great Blue Hole / Challenger's hull-only hazards disappear. Reference links show their hostname, not the whole URL.
  - Data credit: "Seabed data: GMRT Synthesis - Ryan et al. (2009) - CC BY 4.0", from `data/tiles/index.json` (`source`), loaded with the sites. Nothing is shown for synthetic terrain.
  - Front page: chips (`9/84 entries`, `2/13 sites scanned`) replace the lead sentence; cards show `3/8` (aria-label keeps the full sentence); the honesty note sits below the list. "Overview" replaces "About the site" for the site-level group.
  - Desktop stays two-pane; the header is now "Journal", the site name and a Close icon.
- `src/styles/journal.css`: header, switch, chips, rows, phone sheet rules; in short landscape the site's text sits left and its entries right.
- Tests: `tests/e2e/helpers/journal.ts` drives both layouts (`journalContents`, `journalFront`, `openJournalSite`, `openJournalEntry`, `journalEntries`, `journalFirstOfKind`, `setJournalSpoilers`, `openJournalCategory`). Updated the specs that pinned the old header/toggle/tree on phones (`f-bughunt-880`, `f-verify-740`, `f-verify-1000`, `f-debrief-720`, `f-journal-debrief-1060`, `f-flow-audit-510`, `f-touch-audit`) and the text pins (`f-briefing-900`, `f2-explore`, `f2-life`, `d-flow`). New unit tests: `journalAbout.test.ts`, a phone-sheet block in `journalGroups.test.ts`.

## Screenshots (`.cache/codex/shots/f-journal-mobile/`)

`portrait-*`, `landscape-*`, `small-*` (667x375), `desktop-*`: `1-contents`, `2-site` (Titanic with the bow, stern and boilers logged), `3-site-bottom`, `4-about` (About this site open), `5-entry`. Script: `tools/journal-mobile-shots.mjs`.

## Notes

- Not done by this package: the Titanic fact "By default you start beside the first objective..." still reads as a site fact (it lives in `mission.json`; the spawn rework owns it).
- The site page's entry rows duplicate the desktop tree's entries (the same buttons in two regions); specs that query by role name scope to `.jr-nav`.
- The terrain credit text is built in the Journal, since `ui/DataCredits.ts` from f-text-diet is not on main yet; fold the two together at merge if wanted.
