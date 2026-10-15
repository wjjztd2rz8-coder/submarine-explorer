# S-journal-picture

A first scan of a POI or animal now files a still of the moment as a photo of it (same PhotoStore,
`canvasThumbnail` and cosmetic frame as photo mode; no new pipeline). The scan event arms a capture
that the existing `render.capture` stage reads on the same frame's draw; no toast or shutter.
The Journal entry shows the newest photo of the entry as a full-width picture directly under the
title (`.jr-hero`). The photo grid at the bottom now appears only once an entry has two or more
photos (one photo is the hero; the d-photo spec was updated for that).

See: tests/e2e/s-journal-picture.spec.ts (desktop, phone portrait, phone landscape); shots in
.cache/codex/shots/S-journal-picture/.

Known gaps: stills share the 24-photo cap, so a full store drops the oldest photo; secrets and
samples (not POI/animal entries) get no still; the hero cannot be deleted from the entry, only from
the Photos page.
