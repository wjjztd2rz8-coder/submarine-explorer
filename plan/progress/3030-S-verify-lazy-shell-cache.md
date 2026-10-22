# 3030 — S-verify: lazy preview shell/cache contract

Item: `plan/DIRECTOR.md` Backlog 9, **S-verify / S-bughunt [Codex, standing]**.

## Checkout, provenance and ownership

Audited checkout: `f8a4d49162d8172aa9a7c10237125e402ab30515`, initially clean.
Read Director rules/rubric, newest evening review, overnight log through run 80,
`P2-sub-screen.md`, 2880 progress/result, `F-MOBILE-AUDIT.md`,
`F-BUGHUNT-9.md`, `F-BUGHUNT-13.md`, worker/plugin/registration code and existing
capability specs. The 2880 result wrapper says PASS including e2e; its detailed
report instead records browser startup restrictions and five tooling failures.
Those wrapper labels are not browser evidence for this audit.

Git provenance, rather than an assumed introducing merge:

- `git log --first-parent --diff-filter=A -- src/ui/SubScreen.ts` identifies
  `e45186f432037226305079cb8ad0876abe29ea3f`. Its sole parent is
  `db59571de03c90aa0f204d514f05e72553d625f2`. The screen arrived directly on the
  first-parent history; there is **no two-parent introducing merge object**.
- Initial screen integration range: `db59571..da3ed5c` (creation `e45186f`, layout
  and preview follow-up `2b340dd`, formatting `da3ed5c`). Run 71 records it as merged.
- Later portrait merge: `90cd44b9ab0ce68b1f54d9028d5a6997895f8171`.
  Lifecycle/focus audit merge: `c6e9cd9754dabebcc3d39b3b40d93d0c80ff07ff`
  (2880 tip `0082ddb1cf16ab427bda917fa529b146192f04ad`).

Checked launched/queued briefs, result/progress notes and active worktree changes
before editing. 2920–2970 results and the uncollected 2930 power/focus, 2940 e2e,
2970 attachment changes remain separate. 2980–3000 own scarp/contact/mission/event
work; 3010 owns Terrain and its capability tests; 3020 owns TerrainMaterial and
its ready tests. No other worktree modified `public/sw.js` or either owned PWA
spec. Nothing was collected or copied from them. The builds use this checkout,
without their pending changes.

## Existing shipped contract

`src/app/systems/shell.ts` imports `SubScreen` statically. Opening its preview
executes `import('../sub/SubMesh.js')` inside `startPreview`; no separate source
module named SubPreview exists. CSS joins the main stylesheet. The procedural
vehicle code is bundled; this preview import needs no additional model download.

The build plugin enumerates **all emitted JS/CSS/HTML**, irrespective of whether
chunks are entries, dynamic entries or shared dependencies. It also includes the
existing static manifest/icons/share assets. VERSION hashes worker logic, emitted
names, HTML and shipped non-tile bytes. This is stronger than merely caching
chunks already visited by a document.

The stamped worker requires every PRECACHE add to succeed before `skipWaiting`.
A failed required add prevents successful installation; it does not activate or
delete the previous shell. Optional title fonts/marks and Monterey terrain use
best-effort installation. Navigation is network-first with the installed shell
as offline/HTTP-error fallback; successful network HTML does not overwrite that
fallback. Required JS/CSS use the current version's shell cache first. Scope
namespaces isolate deployment caches; cache keys retain full URLs, including
queries. The normal emitted import URLs have no query suffix.

Registration is limited to secure production pages with the API, outside
webdriver automation, and is deferred until page load. Complete installation and
worker control must already have occurred. This does **not** promise a first
uncached visit will work offline. Other content is available only if fetched and
successfully cached under control (apart from optional install-time title assets).
Never-visited sites/mission content are not all predownloaded. Cache eviction or
unavailable storage can still remove offline availability.

## Production artifact audit

Normal `npm run build` (strict TypeScript plus Vite) ran twice using the existing
writable native config-bundle approach from `tools/gates.sh`, without changing
configs, plugins or tooling:

```sh
node --input-type=module - <<'JS'
import { build } from 'rolldown';
await build({ input: 'vite.config.ts', platform: 'node', external: ['vite'],
  output: { file: '.cache/3030/vite.config.mjs', format: 'esm' } });
JS
npm run build -- --outDir .cache/3030/root --config .cache/3030/vite.config.mjs --configLoader native
VITE_BASE=/submarine-explorer/ npm run build -- --outDir .cache/3030/pages --config .cache/3030/vite.config.mjs --configLoader native
```

Both transformed 301 modules and succeeded, with the existing large-chunk warning.
Both artifacts were built **before test edits**, and their HTML records the audited
SHA, production mode and `golden-dirty=false`. Later test/note edits do not change
the audited production sources. No duplicate artifact builds were needed.

A temporary Node audit (`.cache/3030/audit.mjs`, log `audit.log`, structured output
`evidence.json`) parses emitted JS with the installed Rolldown parser, follows
static and dynamic import expressions, inspects HTML/CSS URLs, verifies actual
files, and parses the stamped PRECACHE. It does not evaluate any game module.
All seven emitted JS import edges per build resolve to existing precached files.

Paths in the following table are relative to the indicated base. Every listed
file exists, is nonempty, and belongs to the mandatory stamped shell cache.

| Dependency / edge                                                                | Root `/`                         | Pages `/submarine-explorer/`                         |
| -------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------- |
| Navigation HTML                                                                  | `''` resolves `/` → `index.html` | `''` resolves `/submarine-explorer/` → `index.html`  |
| HTML entry, containing SubScreen and shared engine/vehicle code                  | `assets/index-DVbnDA-0.js`       | `assets/index-vn2UbF_S.js`                           |
| Entry → preview dynamic import                                                   | `assets/SubMesh-ORyJSFKy.js`     | `assets/SubMesh-C70LmhMJ.js`                         |
| Preview → static shared dependency                                               | back to `index-DVbnDA-0.js`      | back to `index-vn2UbF_S.js`                          |
| HTML stylesheet, including `.ss-*`; no residual CSS imports                      | `assets/index-BbYnatZ5.css`      | `assets/index-C0oO5EfM.css`                          |
| Entry → gameplay dynamic import (also audited, not needed to first open preview) | `assets/systems-B79SOetM.js`     | `assets/systems-CrmEvatk.js`                         |
| Systems → static dependencies                                                    | SubMesh + entry above            | SubMesh + entry above                                |
| Systems → loader dynamic import; loader → static entry                           | `assets/GLTFLoader-Cg3guYhA.js`  | `assets/GLTFLoader-CJ4zC6mS.js`                      |
| Stamped VERSION                                                                  | `f11e426f9695`                   | `03442670a037`                                       |
| Required shell cache                                                             | `subexp-%2F-shell-f11e426f9695`  | `subexp-%2Fsubmarine-explorer%2F-shell-03442670a037` |

Each exact stamped PRECACHE contains **14 entries**: the navigation key `''`, all
four emitted JS files, the one CSS file, `manifest.webmanifest`, `favicon.svg`,
five `icons/*` PNGs and `share/bathyline-og-1200x630.png`. The production list does
not separately contain `index.html`; the mandatory `''` navigation response
caches its HTML. All entries are relative, so none accidentally caches a Pages
asset at origin root. No missing chunk, incorrect version or enumeration defect
was found; `tools/pwaPlugin.ts` remains read-only.

The three CSS font URLs resolve within each correct base and exist:
`fonts/dm-sans-latin-400-normal.woff2`, `dm-sans-latin-600-normal.woff2`,
`source-serif-4-latin-600-normal.woff2`. They are optional title assets, separate
from the mandatory list. No extra preview CSS chunk or CSS image dependency was
emitted. The optional fonts cached successfully in the artifact fixture, without
promoting them into a mandatory offline guarantee.

## VM/cache outcomes and meaningful coverage

The temporary audit reuses the **actual `worker` fixture** from
`tests/unit/serviceWorker.test.ts`: it strips the test registration, transpiles
that fixture, supplies the same spy library, and passes each untouched stamped
worker to its VM. Its fetch adapter returns bytes from the appropriate build
output; a new fixture starts with empty CacheStorage. Only the worker is
executed. No game code, browser or WebGL runs. For failed-update checks, a second
fixture first installs the complete artifact under a synthetic previous VERSION;
the candidate fixture shares those cache maps, fails its own installation, and
the previous fixture still returns exact HTML and all compiled JS/CSS offline.
This checks usable retained bytes, without claiming browser update lifecycle
acceptance or pretending to have built a historical deployment. The fetch adapter
models successful same-origin URL-to-file responses; it does not check a live
host's MIME types, response headers, redirects or real CacheStorage quotas.

| Check                                                                        | Root and Pages outcome                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cold install, no preview request/open before installation                    | All 14 required keys stored under that worker's scoped shell; skipWaiting succeeds                      |
| Activate, then network loss, first reads of every compiled JS/CSS dependency | Byte-identical to disk; no module/style network calls                                                   |
| Competing wrong bytes seeded in the current assets cache                     | Shell bytes still selected for every compiled dependency                                                |
| Offline navigation                                                           | One network attempt, rejection, byte-identical installed HTML fallback                                  |
| Optional font reads offline                                                  | Byte-identical successful install-time copies, no network                                               |
| Preview JS unavailable (404) during new install                              | Install rejects; no skipWaiting/deletion; previous worker still serves its complete HTML/JS/CSS offline |
| Entry JS unavailable during new install                                      | Same outcome                                                                                            |
| Main CSS unavailable during new install                                      | Same outcome                                                                                            |
| Old document's unseen historical chunk after new activation                  | Previous versioned cache deleted; offline request rejects (synthetic historical URL witness)            |

The baseline focused worker/plugin suite passed **25 tests**. Existing guards
already covered inert development workers, generic required-shell rejection,
root/Pages navigation fallback, deployment HTML pairing, mutable asset refresh,
quota-tolerant runtime writes, persistent tiles, optional-title failure, scoped
cache cleanup, and cross-origin/out-of-scope/non-GET/range passthrough. These are
retained rather than reimplemented in production.

The material coverage gap was that the plugin fixture supplied only an initial
chunk, and the worker fixture's required list was fixed to `app.js`. Neither
explicitly protected install-time coverage and cache selection for a previously
unopened dynamic/shared JS/CSS chain. Only the existing capability specs changed:

- `pwaPlugin.test.ts`: supplies entry/dynamic/shared/CSS output and a sourcemap;
  asserts all required emitted files are included, map excluded, scope-relative
  resolution at both bases, and a shared lazy dependency byte change alters
  VERSION even when its filename stays the same. Prior worker/static/mutable/tile
  version assertions remain.
- `serviceWorker.test.ts`: allows a supplied precache/stamped source in the
  existing fixture. Both bases install a representative lazy/shared/CSS chain,
  switch offline before first use, and assert exact content despite conflicting
  assets-cache entries. The required-install regression now targets a transitive
  lazy dependency with a 404 or quota failure and explicitly checks preservation
  of previous shell bytes, no skipWaiting/claim/deletion, and later successful
  complete installation. Existing runtime quota and scope guards remain.

**Clean production result.** No allowed routing correction was necessary.

## Deployment limit

Current activation calls `clients.claim()` and deletes obsolete versioned caches
for its own base. Consequently, an already-open old document may reference an
old hashed lazy URL which it never loaded. After the new worker activates, that
old cache can be gone; offline retrieval then fails. The VM witness seeds a
synthetic historical chunk, observes activation delete that cache, and observes
the unseen URL reject offline. It does not simulate a real browser update race.
The existing deployment-navigation guard protects installed fallback HTML while
its worker remains current; it does not retain every historical document's
chunks after replacement. No activation redesign, retention machinery or new
historical-chunk guarantee is proposed or implemented here.

## Simplicity and limits

Changes add capability assertions and this note only. No production fix, new
surface, setting, guidance, site branch, layout patch, runtime config mutation,
loading change or precache-policy expansion. Existing snapshots, tolerances,
instance counts and resource budgets are unchanged. No package identifiers enter
source/test comments. No authored site data or geometry changed; real GMRT, all
13 site identities, hero set pieces, scan/Journal/discoveries, life, input,
accessibility and Arcade defaults are untouched.

This applies the rubric to dependency correctness and understandable offline
behavior. VM results establish cache routing and dependency-byte availability
under the fixture, not JavaScript execution, GPU behavior, offline game rendering,
successful unaided play, browser installation/update/eviction behavior, real-phone
performance or visual Phone-OK. Readability, beauty, composition and real-phone
acceptance remain with Claude/owner. E2e mode is **none**; no browser was launched,
no game rendered, and no screenshots captured.

## Validation

- Baseline worker/plugin: **2 files / 25 tests passed**.
- Extended worker/plugin: **2 files / 28 tests passed**.
- Focused worker/plugin plus existing registration/touch capability spec:
  **3 files / 49 tests passed**, `.cache/3030/focused.log`.
- Root and Pages strict TypeScript/production builds: **passed**; logs
  `.cache/3030/root-build.log`, `pages-build.log`.
- Parsed emitted graph + stamped-worker artifact VM checks: **passed** at both
  bases, `.cache/3030/audit.log` and `evidence.json`.
- Required `GATES_CONFIG_MODE=writable bash tools/gates.sh --no-e2e`:
  **exit 1, `FAIL gates (e2e=none)`**. Log `.cache/3030/gates.log`; detailed run
  `.cache/runs/20261021-084011-3-1izsWA/`.
- Gate **passes**: writable config bundle, strict content, TypeScript/root
  production build, **192 unit files / 3,392 tests** (529.06 seconds), attribution,
  and repository-wide Prettier. No worker/plugin assertion failures.
- Gate **failures / environment blocks**: Python ran **167 tests, 5 failures**.
  Four `test_ci_build_manifest` cases encounter `spawnSync git EPERM`:
  `test_both_bases_survive_copy_and_verify_all_provenance_fields`,
  `test_every_manifest_mismatch_is_rejected`,
  `test_missing_output_or_manifest_and_workflow_sha_mismatch_fail`,
  `test_symlinks_missing_public_data_and_manifest_overwrite_are_rejected`.
  `test_golden_tooling` reports `Unexpected end of JSON input` from its Node
  subprocess. These unmodified tooling/environment paths match earlier audit
  evidence; no repairs attempted. A passing wrapper from another run would not
  override these recorded failures.
- Final owned-file Prettier and `git diff --check`: **passed**. Only
  `tests/unit/serviceWorker.test.ts`, `tests/unit/pwaPlugin.test.ts` and this note
  changed; production and tooling diffs are empty. Checkout SHA remains pinned.
- **E2e: none**. Browser tests were deliberately excluded; no browser assertion
  pass, hosted CI result or real-device acceptance is claimed. No merge, push or
  tag performed.
