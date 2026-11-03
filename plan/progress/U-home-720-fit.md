# U-home-720-fit: Home panel fits 1280x720

Source: `plan/progress/U-play-walkthrough-2.md`, ranked issue 1. At 1280x720 the desktop Home
panel was taller than the viewport and the Settings/Controls row was clipped.

## Measurement before the change

Probe at 1280x720 with the Daily card visible: Controls row bottom at 724 px, panel bottom at
about 691 px. Clipped by the menu scroller.

## What changed

- `src/ui/ModeSelector.ts`: new optional constructor flag `advancedBesideSegments`. When set, the
  Advanced toggle sits on the segment row beside Arcade/Realistic instead of on its own row below
  the description. Briefing and Settings do not pass the flag and keep their DOM.
- `src/ui/Home.ts`: Home passes the flag. The doc comment is updated.
- `src/styles/home.css`: new `.home-menu .mode-selector-row` flex rule (segments take the free
  width, toggle keeps its 48 px height). The short-landscape rules that placed the toggle in a grid
  row are removed, since the toggle no longer sits in that grid.

Why beside the segments and not beside the label: the extra row was 48 px plus 6 px gap. Putting
the toggle on the label line only saved the label height (about 23 px), which is not enough.
Beside the segments removes the whole extra row (about 54 px), which is what the 720 px budget needs.

## Tests

- `tests/e2e/f-title-layout.spec.ts`: for each desktop viewport (width >= 960, height >= 501) the
  menu must sit inside the visible `.home-body` scroller, and that scroller must be inside the
  viewport. The existing reachability loop scrolls each button into view, so it could not catch
  clipping. It fails on the pre-change layout (menu bottom 707 vs body bottom 677 at 1280x720).
- Existing specs that reference the toggle (`d-shell`, `f2-modes`, `d-currents`, `presets`,
  `d2-predive`, `settings`) still locate it by role or class. They needed no edits; all 73 pass.

Known remaining behaviour: at 1280x720 the "Play in your browser / Touch, keyboard or controller"
notes sit below the menu inside the same scroller and are not visible without scrolling. This is
secondary text and was already below the fold before this change. Settings and Controls are fully
visible.

## Screenshot

`/home/vijay/subexp-wt/U-home-720-fit/.cache/U-home-720-fit/home-1280x720-after.png`
Shows Dive, Dive sites, Free dive, Daily dive, Game mode with Advanced on the segment row,
Journal, Your sub, Settings and Controls, all inside the panel.

## Gates

`PW_PORT=4312 tools/gates.sh`: GATES_EXIT=0. Phases: python, content, build, unit (194 files,
4440 tests), e2e (smoke), e2e-base, attribution, prettier all PASS.
