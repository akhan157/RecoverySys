# IFC-96-S catalog mass correction — result (2026-11-07)

Status: author-complete, checks green, awaiting parent review and merge.
Author cannot self-accept. This record is committed with the change; find the
commit with `git log --oneline -1 -- RecoverySys/docs/history/iris96-mass-fix-2026-11-07/RESULT.md`.

## Pin and scope

- Worktree: session lane `t3-af50c626`, branch `t3/af50c626`.
- Base/HEAD: `6665b2bd1fa2780af0106e20f16ebbb53efad2e4`.
- Package release identity: `1.3.0-rc.2` / `V1.3 RC2`, unchanged.
- Unique scope: the `ifc-096-s` `main_chute` catalog `specs.weight_g` value.

## Change

Applied the reviewed patch
`RecoverySys/docs/history/catalog-review-2026-11-07/ifc-096-s-weight.patch`
after `git apply --check` passed. One production line:

```diff
-      weight_g: 46,
+      weight_g: 462,
```

`RecoverySys/src/data/parts.js` SHA-256 changed from
`520ef5ccb3b2115bdc6dc0cab5e29c83ae34b2f1e5686cfe38d16f6b04d08f20` to
`1994da00a2ed3c1286fdad71f5df14b59907e8ef41c06ddd8a0940084bb2cea7`.
No other part, field, physics constant, threshold, model or product ID changed.
`src/data/catalogProvenance.js`, `VERSION`, `package.json`, registers, task
board and `GOAL-HANDOFF.md` are unchanged.

## Source and approval

- Parent review: `RecoverySys/docs/history/catalog-review-2026-11-07/REVIEW.md`
  (mass proposal section). Author packet: `e89099e`.
- Manufacturer page:
  `https://shop.fruitychutes.com/collections/iris-ultra-compact-chutes/products/iris-ultra-compact-parachute-96inch-50lbs-20fps-28lbs-15fps`
  identifying `IFC-96-S` (captured variant `IFC-96-S-YB`) at 16.3 oz.
- Archived reader-proxy capture hash:
  `14941d71bfda686e8ebdf4623a0c62f2c66402d7ec4f5af7f2112b83a950ac66`
  (outside git; reader proxy, not a direct HTTP-200 capture).
- Conversion: `16.3 × 28.349523125 = 462.0972269375 g`; 462 g is the integer
  appropriate to the published precision.
- Approval: the owner replied "Ok" to the explicit exact-field approval
  question naming `ifc-096-s` `specs.weight_g` 46 → 462. This satisfies the
  sourcing contract's human-review requirement for this one field only.
- Provenance status is unchanged: Fruity Chutes remains an `unverified`
  catalog-import family. This correction does not promote any
  manufacturer-wide verified status.

## Persistence behavior (inspected, not assumed)

The expectation that a saved full-part selection keeps its old weight until
the user reselects the part does **not** match the code for catalog parts:

- `saveConfigToStorage` writes full part objects, but `loadSaved()` ->
  `normalizeStoredPayload()` -> `normalizeConfig()` replaces every non-custom
  part with the live `PARTS` entry matched by `(id, category)`
  (`src/lib/payloadBoundary.js:155-160`). `buildInitialState` rehydrates the
  same way. A reload after this update therefore shows 462 g without
  reselection. The old `46` bytes can remain in `localStorage` until the next
  config write, but they are not what the app displays.
- An already-open in-memory session keeps the previously selected 46 g object
  until the part is reselected or the app reloads.
- Custom parts are full snapshots and are preserved: a saved custom copy with
  46 g still loads at 46 g until the user edits it. No custom or saved bytes
  were rewritten by this change.
- Share links and imported JSON reference catalog parts by id and rehydrate
  from live `PARTS`, so they also pick up 462 g.

Probe (outside git) through the real payload boundary:

```text
savedCatalogWeightAfterLoad: 462
savedCustomWeightAfterLoad: 46
```

## Testing

Focused regression test added in `RecoverySys/src/test/recoveryMass.test.js`
(one `it`). It loads the real catalog entry and runs `computeRecoveryMass`;
it asserts `weight_g = 462`, total `462 g`, share `462/2500 = 0.1848`, and no
exceed flag.

1. Pre-fix falsifier, original catalog value 46:

```bash
npx vitest run src/test/recoveryMass.test.js --maxWorkers=2
```

Exit 1, `1 failed | 9 passed`; `AssertionError: expected 46 to be 462`.
Log: `/tmp/opencode/evidence/iris96/focused-prefix-fail.log`
(SHA-256 `844cba2e9389a91fab7f836168754d4d6dd344b8d8da081f7ca7069d8ba26935`).

2. Same command after the one-field change:

```bash
npx vitest run src/test/recoveryMass.test.js --maxWorkers=2
```

Exit 0, 10/10 passed. Log:
`/tmp/opencode/evidence/iris96/focused-postfix-pass.log`
(SHA-256 `0f74383cdfa2696ad1160441045e560e582025fa0ff9109a9fca705d72ae61cd`).

3. Full gate:

```bash
npm run check
```

Exit 0: Prettier clean; `parts catalog valid (225 parts)`; validation corpus
valid (21 cases); lint clean; 51 test files / 482 tests passed (worker cap 2);
production build OK; build identity `1.3.0-rc.2 / V1.3 RC2`.
Log: `/tmp/opencode/evidence/iris96/npm-run-check.log`
(SHA-256 `a475a27460e75a820a57ea50a26f811e2796fec3f08377b55100ef43c2010a8c`).

4. Headless production Chromium check (`vite preview` of the built app):

- Entered rocket mass 2500 g, selected the catalog part in `Main Chute`,
  opened `RECOVERY_BRIEF`.
- Card spec text `96" Ø Cd 2.2 462g flat / nylon`; row `Main Chute |
96" Iris Ultra Compact (Spectra) | 462 g`; known total `462 g`; share
  `18.5%`; no limit or warning mislabeled; zero console/page errors.
- Result JSON: `/tmp/opencode/evidence/iris96/browser-check.json`
  (SHA-256 `c0364afac6b0d69e15af619b1c8836e9f3aa44f3ad5c41b15fcaab1fc931bc08`),
  `pass: true`.
- Screenshot: `/tmp/opencode/evidence/iris96/mass-section-462g.png`
  (SHA-256 `1af061cb00aab8040f59ae1a73774e0ef96919a20e8a7515370630ac90dd8a85`).
  Full-page shot: `recovery-brief-462g.png`
  (SHA-256 `28e3aab7f1d1c7aed9ce830bbb442c2f800067b67c90857c9ecb3501734d5658`).
- Preview server and Chromium were stopped after the check; port 4174 was
  confirmed closed.

## Rollback

Revert the lane commit (`git revert <lane-commit-sha>`); it restores
`weight_g: 46` and removes the focused test, CHANGELOG entry and this record.
Alternatively apply the inverse of the reviewed patch to `parts.js`. No data
migration is involved. Users whose custom copies were derived from the old
value are unaffected either way.

## Deliberately not done

- No push, PR, tag, release or deploy; parent owns integration.
- The historical catalog-review validator
  (`RecoverySys/validation/catalog-review/review-2026-11-07/validate-review.mjs`)
  pins the pre-fix `PARTS` hash `520ef5cc...`. It remains unchanged and will
  report a hash mismatch if run against post-fix bytes; it was not run or
  relaxed, because its job is to validate the historical review input.
- The immutable rc.2 draft archives at `dafec8d` were not edited or relabeled;
  they cannot be made to contain this correction.
- No manufacturer-wide verification, source re-capture, or catalog version
  change.
- No saved, imported or custom part snapshot was rewritten.

## Parent verification (merged `d7f3a33`)

- `npm run check`: pass — 51 files / 482 unit tests, format, lint, catalog,
  corpus, build, build identity (1.3.0-rc.2).
- Persistence probe: saved catalog selection reloads at 462 g; a saved custom
  copy keeps its entered 46 g.
- Production-build Chromium check (preview on 4174, deterministic routing):
  catalog card and Recovery Brief show 462 g, 18.5% of 2,500 g, no 46 g; no
  console/page errors.
- Evidence kept outside the repo in `RecoverySys-artifacts/iris96-mass-fix-2026-11-07/`.
