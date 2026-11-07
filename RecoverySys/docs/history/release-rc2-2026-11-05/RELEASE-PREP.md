# rc.2 release preparation — 2026-11-07

Author-verified documentation increment. Parent acceptance is reserved; this is
not a release, tag, stable promotion or manual qualification. The prepared
`gh release create` command below was **not executed**.

## Source and run identity

| Item | Value |
| --- | --- |
| Candidate | `1.3.0-rc.2` |
| App directory | `RecoverySys/` relative to the repository root |
| Tested pin | `dafec8d1985d863169d1ba275c46ea74a7da4ea3` |
| Pull request | [#16](https://github.com/akhan157/RecoverySys/pull/16) |
| Actions run | [42123690801](https://github.com/akhan157/RecoverySys/actions/runs/42123690801) |
| Run workflow | `Node checks`, event `pull_request`, conclusion `success` |
| Run timing | created `2026-11-05T22:42:03Z`, updated `2026-11-05T22:47:08Z` |
| Version identity | `VERSION`/package `1.3.0-rc.2`; display `V1.3 RC2` |

`gh run view 42123690801` returned `headSha` equal to the tested pin, five
successful jobs and `conclusion: success`. The five jobs were Node 22/24/26
checks, Windows portable build and macOS universal portable build.

## Fresh archive acquisition — 2026-11-07

Raw downloads stay outside git. The external preparation root was:

```text
$HOME/RecoverySys-artifacts/1.3.0-rc.2/release-prep-2026-11-07/
```

Commands actually run from the app checkout:

```bash
gh run download 42123690801 -R akhan157/RecoverySys \
  --dir "$HOME/RecoverySys-artifacts/1.3.0-rc.2/release-prep-2026-11-07/raw-download"
sha256sum raw-download/web-candidate-42123690801/RecoverySys-web.zip \
          raw-download/windows-portable-42123690801/RecoverySys-Portable.zip \
          raw-download/macos-portable-42123690801/RecoverySys-macos-universal.zip
unzip -t <each-archive>
```

`unzip -t` reported no errors for all three archives. The fresh download also
contained the E2E report, Windows/macOS evidence text and runner-side hashes;
those are supporting artifacts, not manual-workflow qualification.

| Archive | Bytes | Fresh SHA-256 | Runner hash | Historical records | CRC |
| --- | --- | --- | --- | --- | --- |
| `RecoverySys-web.zip` | 297550 | `775381299b1abad67429c0dff13d5ea450a12e10302c23c93aa05df3bfbc4538` | matches | `REMOTE-CI.md` + `EVIDENCE.json` match | OK |
| `RecoverySys-Portable.zip` | 2733669 | `ba06af039213b18fe4c4219e92fb78dbecec581aaaa395af03e0053e75185399` | matches (case-normalized) | `REMOTE-CI.md` + `EVIDENCE.json` match | OK |
| `RecoverySys-macos-universal.zip` | 5965736 | `b09d19741ba461683a96929880edbe06fe11d26a9fb05be30a9f3dbb7ce37c1b` | matches | `REMOTE-CI.md` + `EVIDENCE.json` match | OK |

The Windows runner emitted uppercase SHA-256; comparison was case-normalized.
No archive was rebuilt. `SHA256SUMS.txt` in this directory is the release-asset
manifest. The three verified archives were hard-linked into a flat external
`release-assets/` directory beside a copy of the manifest, and
`sha256sum -c SHA256SUMS.txt` returned `OK` for all three.

The source archive layout observed on 2026-11-07:

- Web: `dist/` payload tree, including the built assets and landing bundle.
- Windows: `README.txt` and `RecoverySys.exe` (portable, no installer).
- macOS: `RecoverySys.app` with `Contents/MacOS/recoverysys`, `Info.plist` and
  `_CodeSignature/`; universal slices were verified by the hosted job.

## Live Pages and current-main distinction

The live app at <https://akhan157.github.io/RecoverySys/> serves `V1.3 RC2`
with 10 skeleton tabs, referenced assets and the current landing bundle. The
parent reported `npm run verify:pages` passing on 2026-11-07; the author also
ran the same script directly and observed:

```text
pages ok — https://akhan157.github.io/RecoverySys/ serves V1.3 RC2, 10 skeleton tabs, 3 assets, and the current landing page
```

The latest successful Pages deployment run is `42166251348`, created
`2026-11-06T05:04:54Z`, event `push`, head
`60b986469900365de34bcc169cce7ad84adcfcae` (the merge of PR #16). The deploy
workflow runs `verify-pages.mjs` after deployment, so that run contains its own
live verification.

Identity boundaries:

- Archives: built at `dafec8d`, carrying supplier snapshot
  `2026-11-05T20:00:13.007Z`.
- Live Pages: deployed at `60b9864`. Its application source and
  `public/supplier-prices.json` are the same as `dafec8d`; the only app-tree
  difference between those two commits is a test-file timeout change.
- Current `main`: `ad67fea6c25343bfdd17eb8178c6b9ec57729b88` has a later
  supplier snapshot, `fetchedAt: 2026-11-07T06:04:21.595Z` on all 103 offers.
  Prices and stock values are unchanged. Those later timestamps are therefore
  in neither the archives nor the live Pages deployment.
- No deploy run exists after `42166251348`. The supplier-snapshot workflow
  commits with its repository token, and such pushes do not enqueue the Pages
  workflow. This is `[INFERENCE]` from the workflow definition and the observed
  run list; the observed fact is that the latest deploy head is `60b9864`, not
  `ad67fea`.

## Prepared draft-release command (not run)

The tag and release do not currently exist; `gh release list` shows only rc.1
and older stable releases. Run the following from the repository root after
this documentation increment is accepted and merged. It creates a draft
prerelease targeting the tested pin and uploads the three re-verified archives:

```bash
ARTIFACTS="$HOME/RecoverySys-artifacts/1.3.0-rc.2/release-prep-2026-11-07/release-assets"

gh release create v1.3.0-rc.2 \
  --repo akhan157/RecoverySys \
  --draft \
  --prerelease \
  --target dafec8d1985d863169d1ba275c46ea74a7da4ea3 \
  --title "RecoverySys 1.3.0-rc.2" \
  --notes-file RecoverySys/docs/releases/1.3.0-rc.2.md \
  "$ARTIFACTS/RecoverySys-web.zip" \
  "$ARTIFACTS/RecoverySys-Portable.zip" \
  "$ARTIFACTS/RecoverySys-macos-universal.zip" \
  RecoverySys/docs/history/release-rc2-2026-11-05/SHA256SUMS.txt
```

Preflight immediately before running it, from the repository root:

```bash
REPO_ROOT="$PWD"
(cd "$ARTIFACTS" && sha256sum -c \
  "$REPO_ROOT/RecoverySys/docs/history/release-rc2-2026-11-05/SHA256SUMS.txt")
gh release view v1.3.0-rc.2 --repo akhan157/RecoverySys   # must fail: tag absent
git rev-parse dafec8d1985d863169d1ba275c46ea74a7da4ea3  # must be the full pin
```

## Falsifiers — stop instead of publishing

- Any ZIP hash differs from `SHA256SUMS.txt`, `REMOTE-CI.md`, `EVIDENCE.json`
  or this document; or `unzip -t` fails.
- The downloaded run head is not `dafec8d...`, the run conclusion is not
  `success`, or fewer/more than the expected five jobs are present.
- A `v1.3.0-rc.2` tag/release already exists, or the target resolves to another
  commit; do not overwrite or move an existing tag.
- The release assets are rebuilt from `ad67fea`, another main commit, or a dirty
  tree rather than the re-verified run artifacts.
- Release notes claim manual Windows/macOS qualification, observed trials,
  physics acceptance, catalog approval or stable status.
- The live Pages claim is repeated without a passing `verify-pages` result or
  without confirming the current deploy head; do not silently substitute
  `ad67fea` for the deployed `60b9864`.
- Manifest, notes and historical records disagree on archive names or hashes.

## Remaining external gates

Unchanged from the historical register in `EVIDENCE.json`: 15 rows —
9 `PASS`, 2 `in_progress`, 4 `blocked`, 0 `not_run`, 0 `FAIL`. Still open:

- Windows and macOS actual manual workflows (launch smoke is additional
  evidence only; Intel Mac launch untested).
- 10–15 actual observed rocketeer trials.
- Independent physics/comparison acceptance and any accepted/real-flight cases;
  the 21 corpus cases remain review-only.
- Exact catalog variant/source decisions and engineering-value approval.
- Stable promotion, stable tag, published release and live-download verification
  after an explicit qualification decision.

No application source, version, workflow, register, task board, package
manifest or handoff was changed by this preparation; only the release-asset
checksum manifest and documentation were added. No tag, release, publish or
push was performed. This document records author checks only; parent review and
acceptance remain required.
