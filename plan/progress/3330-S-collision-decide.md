# S-collision — crest and seam candidate decision

Director item **S-collision**; report-only decision, 2026-10-23.

**Do not collect either candidate. No compliant small fix was established.**
Propose deleting the four expected-failure contact cases as an explicit acceptance
of the coarse scarp proxy's known upper-wall gaps. This report does **not** delete
tests, change assertions or claim that the collision defect is repaired.

## Baseline and evidence reviewed

Registered worktree branch: `codex/3330-S-collision-decide`, initially clean at
`ec7e4bcd4a17e21e1bade6a437b1ad5b7fbaf9c5`.
Pinned main for the decision commit:
`4af4ccf23b85f85edb3c4259b82f596ffa8518a6`.
The relevant source and three focused capability files are byte-identical
between those revisions; `git diff main --` on those paths was empty before
experimentation. Main advanced during this session; the commit uses the pinned
revision rather than following subsequent changes.

Read `plan/DIRECTOR.md`, both complete uncommitted candidate diffs, the seam
candidate's `plan/progress/3050-S-verify-seam-contact-impact.md`, and
`plan/progress/3300-S-verify-seam-contact-small.md`. Also read the contact
mechanism and original witnesses in
`plan/progress/2950-S-verify-monterey-crest.md`, the attachment report, and the
overnight collection decisions. There is no crest-candidate progress note in
its worktree. Neither candidate worktree was modified. Neither contains a
candidate commit to cherry-pick: both retain their edits above `f8a4d49`.

The backlog description conflates two defects. All four `it.fails` cases are
in `tests/unit/montereyScarpSupport.test.ts` and exercise **Monterey prop boxes**.
The seam candidate repairs **Lost City terrain support**; its consumer tests
are ordinary tests in its unmerged diff, not these four expected failures.

## Why the crest candidate is not a small collection

The production diff adds 41 lines and deletes one in `scarp.ts`; it adds no
per-frame statements or collider count. It precomputes sampled deformed profile
sections, clips them at each emitted box's actual heights, and unions their Z
extents with the existing raw-profile estimate. It does address the measured
height-scaling/lift mismatch. **The per-frame line allowance is not the reason
to reject this candidate.**

However, it retains the old estimate and adds a second envelope calculation,
including section subdivision, deformation and clipping. That is additive
machinery rather than a simpler replacement. More materially,
`buildScarp` passes the same boxes to `impostorFromBoxes`: changing these boxes
changes distant rendered walls at all three presets and all three tiers.
The unmodified equivalence spec confirms geometry and collision digest changes
in **all nine** combinations; placement and material digests remain unchanged.
The full-detail mesh construction is untouched, but the impostor is visible
geometry, so this is broader than a contact-only correction.

The accompanying test diff changes 18 existing geometry/collision digest values
and adds nine full-detail geometry digests. Pinning full-detail output is useful,
but those new pins do not establish that the changed impostors are acceptable.
A digest update can be legitimate for an independently validated intended
change; it is not, by itself, evidence that existing geometric contracts can
safely be replaced. No visual acceptance exists here. Its added contact cases
also duplicate the four cases already collected on main.

Independent temporary run with only its source diff, the existing four contact
assertions promoted to ordinary `it`, and unchanged equivalence hashes:
**21 passed / 9 failed, 3 files, 49.86 s**. All four contact cases pass; all nine
equivalence cases fail. The other existing collider and terrain checks pass.
No candidate baselines or additional tests were imported.

## Why the seam candidate cannot satisfy this task

Its production diff adds 42 lines and deletes six in `Terrain.ts`. The stored
Float32 boundary selection, adjacent support at exact edges/corners, and
endpoint clamping add work to the repeatedly called height sampler. Keeping
only one axis, removing corner support, choosing a fixed side, or adding an
epsilon loses cases covered by its own tests. The prior small-fix report
documents the same limits and the retained 0.161 m clearance shortfall.
There is no demonstrated reduction to approximately ten extra query lines.

More decisively, applying the entire sampler correction while preserving main's
already-collected Low routing leaves **all four Monterey contact assertions
failing**: **4 failed / 1 passed, 19.71 s**. An initial patch application rejected
old surrounding comments; it changed no source. The reported experiment used
the same complete 42-addition/six-deletion sampler change transplanted afterward.
The failed-application run is a separate baseline confirmation, not evidence
for the candidate. The seam correction therefore does not turn any of the
requested expected failures green, even if its runtime cost were accepted.

## Small-fix boundary and deletion proposal

The current scarp error is upstream of the shared sphere-versus-box resolver.
The boxes omit actual exposed rock; the resolver correctly returns no contact
when an 8 m sphere cannot reach any box. Enlarging the hull, adding a universal
padding/bias, or forcing collision at a stored witness would hide the mismatch
and change unrelated contacts. Site or witness branches are excluded.
The existing triangulated surface collider is a solid **floor** resolved upward,
not a wall/overhang solver; attaching it to the wall would fill water below
projected faces and is not an equivalent small replacement.

A proper build-time correction must obtain Z extents at the emitted deformed
heights while retaining the taper and open undercuts. The candidate supplies
that extra calculation without replacing the old one and couples its result
to visible impostors. Separating old visual boxes from repaired collision boxes
would retain two proxy representations; replacing the proxy builder and proving
its geometry/contact contracts is a larger follow-up. Neither is established
as a net-simpler small fix by the supplied work. This is a bounded engineering
decision about these candidates and constraints, not a proof that every future
algorithm must exceed ten lines or that build-time fixes are forbidden.

If this limitation is accepted, delete **only** the opening `describe.each`
block and its four `it.fails` cases from `montereyScarpSupport.test.ts`, plus the
then-unused `beforeAll`/`describe` imports. Keep the independent fifth test,
`Monterey wall instances sit above the real sloping seabed`, and all ordinary
collider, taper, geometry, placement and material assertions. Do not replace
the cases with `skip`, weaker comparisons, new tolerances or passing gap checks.
Record the accepted cut in Director/CHANGELOG when executing that separate
decision. No such cut is executed by this report.

Deletion would remove roughly 20 seconds of real-tile setup and the alarm that
currently fires when a known gap unexpectedly becomes covered. It would **not**
restore collision coverage. Accepting it explicitly accepts that a hull centred
on these exposed triangles can miss the coarse collision proxy. Keep these
unchanged witnesses here and in the original crest report for future work:

| Tier / bank | World hit X, Y, Z (m)                                        | Nearest own box distance (m) |
| ----------- | ------------------------------------------------------------ | ---------------------------: |
| Medium east | -3163.2892858326386, -683.1464822505408, -1225.2099228866075 |            9.360112283916749 |
| High west   | -3560.0766535933194, -683.4531795296268, -1371.4533774318256 |            8.149165352155592 |
| Medium west | -3557.4308128991584, -683.4689631139613, -1371.4533774318256 |            8.149165352155592 |
| Low west    | -3496.5580549895044, -662.3061831088266, -1513.2715592500074 |             9.45478446437934 |

These are ray hits on shipped indexed triangles with face normal Z below -0.25,
below sea level and more than 100 m above the sampled seabed. Hull radius stays
8 m. The baseline temporary ordinary-test run fails all four unchanged
`expect(collides).toBe(true)` assertions, with the fifth test passing:
**4 failed / 1 passed, 20.95 s**. Fixture validation remains outside the contact
assertion throughout, so missing content cannot masquerade as the defect.

## Validation and delivery

All temporary source/test edits and diagnostic logging were restored byte for
byte before final checks. The only retained tracked change is this report.
No production change, baseline update, assertion relaxation, deletion, site
branch, package number in code, dependency, merge, push or rendering.

Commands and raw experiment logs are under `/tmp/scarp-collision-assessment/`:

```sh
npm test -- tests/unit/montereyScarpSupport.test.ts --configLoader runner --cache=false --maxWorkers=1
npm test -- tests/unit/montereyScarpSupport.test.ts tests/unit/geo-colliders.test.ts tests/unit/scarpTerrain.test.ts --configLoader runner --cache=false --maxWorkers=1
```

Final restored-state focused run: **PASS, 3 files / 26 passed / 4 expected fail
(30 total), 43.45 s**, exit 0; `final-focused.log`. The expected failures remain
expected failures, not repaired contacts. Changed-file Prettier, `git diff
--check`, byte comparisons against saved source/test originals, and empty diffs
for `src/`, `tests/`, `tools/` and Director: **PASS**.
Full gates and browser tests are unnecessary for the retained documentation-only
change; the temporary candidates' failing runs are evidence, not shipped code.

The registered worktree's `.git` points outside the permitted writable roots to
`/home/vijay/submarine-explorer/.git/worktrees/3330-S-collision-decide`.
Creating a fresh branch failed with `index.lock: Read-only file system`.
Approval policy is `never`; shared Git metadata cannot be written here.
The delivery commit uses independent Git metadata under
`/tmp/scarp-collision-assessment/review.git`, with this worktree as its work tree,
and a fresh `codex/3330-S-collision-small` branch based on pinned main. The
report-only commit is exported to
`/tmp/scarp-collision-assessment/3330-S-collision-decide.bundle` for import.
The registered branch/HEAD and both candidate worktrees remain unchanged.
