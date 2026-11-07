# Release preparation result — 1.3.0-rc.2 docs — 2026-11-07

Status: author-verified documentation increment only. Parent review and
acceptance are reserved; this file is not a self-approval.

## Pin and workspace

| Item | Value |
| --- | --- |
| Worktree | `/home/ak/.t3/worktrees/RecoverySys/t3-bdd270d1` |
| Branch | `t3/prepare-rc2-release-docs` |
| Base / committed HEAD before work | `ad67fea6c25343bfdd17eb8178c6b9ec57729b88` |
| Artifact source pin | `dafec8d1985d863169d1ba275c46ea74a7da4ea3` |
| Hosted run | `42123690801`, workflow `Node checks`, event `pull_request`, success |

The local `ASSIGNMENT.md` was written before edits and is deliberately not
committed. The commit containing this file is reported to the parent; use
`git log -1 --format=%H` on this branch for its full SHA.

## Files changed

- `RecoverySys/docs/releases/1.3.0-rc.2.md` (new): concise notes, three archive
  hashes, tested pin and bounded scope.
- `RecoverySys/docs/history/release-rc2-2026-11-05/RELEASE-PREP.md` (new):
  provenance, checks, prepared draft-release command and falsifiers.
- `RecoverySys/docs/history/release-rc2-2026-11-05/SHA256SUMS.txt` (new):
  release-asset manifest.
- `RecoverySys/docs/history/release-rc2-2026-11-05/REMOTE-CI.md`: appended a
  dated 2026-11-07 addendum; all prior measurements remain intact.
- `.gitignore`: added `/RecoverySys-artifacts/`.
- `RecoverySys/docs/history/release-prep-2026-11-07/RESULT.md` (new): this file.

Not edited: application source, `public/`, `VERSION`, package/lock, Tauri/Cargo,
workflows, tests, README, CHANGELOG, `EVIDENCE.json`, release-gate record, task
board or `GOAL-HANDOFF.md`.

## Commands actually run

```bash
gh run download 42123690801 -R akhan157/RecoverySys \
  --dir "$HOME/RecoverySys-artifacts/1.3.0-rc.2/release-prep-2026-11-07/raw-download"

sha256sum raw-download/web-candidate-42123690801/RecoverySys-web.zip \
          raw-download/windows-portable-42123690801/RecoverySys-Portable.zip \
          raw-download/macos-portable-42123690801/RecoverySys-macos-universal.zip

unzip -t <each-archive>                       # all: No errors detected
cd release-assets && sha256sum -c SHA256SUMS.txt   # all three: OK
cd RecoverySys && node scripts/verify-pages.mjs     # pages ok (V1.3 RC2)
node /tmp/opencode/validate-release-docs.mjs        # ALL DOCUMENT CHECKS PASSED
git diff --check                                    # OK
```

Additional read-only observations:

```bash
gh run view 42123690801 -R akhan157/RecoverySys \
  --json headSha,conclusion,event,workflowName
gh run list -R akhan157/RecoverySys --workflow=deploy.yml --branch=main --limit=6
```

## Verified hashes

Fresh download on 2026-11-07:

| Archive | Bytes | SHA-256 | Historical records |
| --- | --- | --- | --- |
| `RecoverySys-web.zip` | 297550 | `775381299b1abad67429c0dff13d5ea450a12e10302c23c93aa05df3bfbc4538` | match `REMOTE-CI.md` + `EVIDENCE.json` |
| `RecoverySys-Portable.zip` | 2733669 | `ba06af039213b18fe4c4219e92fb78dbecec581aaaa395af03e0053e75185399` | match; runner hash uppercase but equal |
| `RecoverySys-macos-universal.zip` | 5965736 | `b09d19741ba461683a96929880edbe06fe11d26a9fb05be30a9f3dbb7ce37c1b` | match `REMOTE-CI.md` + `EVIDENCE.json` |

`unzip -t` returned OK for all three. No rebuild or archive modification was
performed. The fresh download's E2E report and platform evidence text were
retained but are not manual-workflow qualification.

## Live Pages / current-main observation

- `node scripts/verify-pages.mjs` output:
  `pages ok — https://akhan157.github.io/RecoverySys/ serves V1.3 RC2, 10 skeleton tabs, 3 assets, and the current landing page`.
  The parent separately reported `npm run verify:pages` passing on 2026-11-07.
- Latest successful Pages deployment: run `42166251348`, head
  `60b986469900365de34bcc169cce7ad84adcfcae`, event `push`, created
  `2026-11-06T05:04:54Z`.
- Current `main` is `ad67fea6c25343bfdd17eb8178c6b9ec57729b88`; it carries
  supplier `fetchedAt` timestamps `2026-11-07T06:04:21.595Z` for all 103 offers.
  Prices and stock are unchanged from the `2026-11-05T20:00:13.007Z` snapshot.
- The archives were built at `dafec8d` with the older supplier snapshot. The
  live Pages deploy at `60b9864` has the same application source and supplier
  data as `dafec8d` (only a test-file difference between those commits). No
  deploy run exists after `42166251348`; therefore the 2026-11-07 timestamp
  refresh on `main` is not live. See `RELEASE-PREP.md` for the `[INFERENCE]`
  about token-pushed supplier commits not enqueueing the Pages workflow.

## Deliberately not done

- No tag, GitHub release, publish, push, deploy, Pages change or stable
  promotion. The prepared `gh release create` command was not run.
- No archive rebuild, manual Windows/macOS workflow, participant trial,
  independent physics/comparison acceptance, catalog decision or engineering
  value change.
- No edits to the register, task board, `EVIDENCE.json`, release-gate record or
  `GOAL-HANDOFF.md`; historical measurements were preserved.

## Remaining external gates

Unchanged: 15 register rows — 9 `PASS`, 2 `in_progress`, 4 `blocked`, 0
`not_run`, 0 `FAIL`. Open items are Windows/macOS manual workflows, 10–15
observed rocketeer trials, independent physics/comparison acceptance, exact
catalog variant/source decisions, and stable promotion/publication.

## Acceptance

Author-verified only. The parent must independently review the diff, re-run the
hash/manifest/link checks it considers necessary, and decide acceptance. No
claim of approval, manual qualification or stable release is made here.
