# Hosted rc.2 evidence

[PR #16](https://github.com/akhan157/RecoverySys/pull/16), qualified head
`dafec8d1985d863169d1ba275c46ea74a7da4ea3`.
[Pull-request workflow run 42123690801](https://github.com/akhan157/RecoverySys/actions/runs/42123690801)
passed all five jobs. The duplicate push run `42123645739` also succeeded;
artifacts below are specifically from the pull-request run.

| Job | Observed scope |
| --- | --- |
| Node 22.23.4 | Full check: 51 files / 481 tests; format, catalog, corpus, lint, build and identity pass. Full Chromium desktop/mobile suite: 96 passed, zero skipped/failures/errors. |
| Node 24.22.2 | Full check: 51 files / 481 tests and all check gates pass. |
| Node 26.13.0 | Full check: 51 files / 481 tests and all check gates pass. This differs from local 26.11.1 and is recorded separately. |
| Windows portable | Build, required ZIP files/no nested ZIP, SHA-256 and process alive 15 seconds. Runner image `windows-2025-vs2026`. |
| macOS universal | Build, strict deep signature verification, Intel/Apple Silicon slices, SHA-256 and process alive 15 seconds on `macos-26-arm64`. Intel launch was not tested. |

Downloaded archives were checked again locally for CRC, runner-hash agreement,
Windows archive layout, and Mac Info.plist/executable and fat-binary slices.
Mac CFBundleExecutable is lowercase `recoverysys`, version `1.3.0-rc.2`.
An initial local verifier assumed an uppercase binary name; it was corrected
to read Info.plist. No product change was needed. Hosted web payloads match
all 20 local web files byte for byte; ZIP compression/timestamps differ.

| Archive | SHA-256 |
| --- | --- |
| RecoverySys-web.zip | `775381299b1abad67429c0dff13d5ea450a12e10302c23c93aa05df3bfbc4538` |
| RecoverySys-Portable.zip | `ba06af039213b18fe4c4219e92fb78dbecec581aaaa395af03e0053e75185399` |
| RecoverySys-macos-universal.zip | `b09d19741ba461683a96929880edbe06fe11d26a9fb05be30a9f3dbb7ce37c1b` |

Raw artifacts/logs and `verification.json` are outside git at
`../RecoverySys-artifacts/1.3.0-rc.2/remote-42123690801/` relative to git root.
Retrieved with `gh run download 42123690801 --dir <external-path>` and
`gh run view 42123690801 --log`; the JUnit report records 96 tests, zero failures,
zero errors and zero skipped. Exact paths/hashes are in `EVIDENCE.json`.

These automated results close the hosted software gate only. No actual manual
Windows/Mac workflow, participant observation, independent physics acceptance,
catalog approval or stable release is inferred from a green build or a live
process. This records evidence; it is not author self-approval of those gates.

## Addendum — 2026-11-07: fresh artifact re-download

The measurements above are unchanged. A second download of run `42123690801`
on 2026-11-07 into an external
`RecoverySys-artifacts/1.3.0-rc.2/release-prep-2026-11-07/raw-download/`
directory reproduced all three archives byte for byte:

| Archive | Fresh SHA-256 | Historical match | CRC |
| --- | --- | --- | --- |
| `RecoverySys-web.zip` | `775381299b1abad67429c0dff13d5ea450a12e10302c23c93aa05df3bfbc4538` | yes | `unzip -t` OK |
| `RecoverySys-Portable.zip` | `ba06af039213b18fe4c4219e92fb78dbecec581aaaa395af03e0053e75185399` | yes | `unzip -t` OK |
| `RecoverySys-macos-universal.zip` | `b09d19741ba461683a96929880edbe06fe11d26a9fb05be30a9f3dbb7ce37c1b` | yes | `unzip -t` OK |

Download was `gh run download 42123690801 -R akhan157/RecoverySys --dir
<external-path>`; hashes were compared with this file and `EVIDENCE.json`.
Runner-side hashes agreed, including the uppercase Windows PowerShell output.
No archive was rebuilt or modified. The fresh download also retained the E2E
report and platform launch/slice evidence, but those do not close manual
workflow gates. See `SHA256SUMS.txt` and `RELEASE-PREP.md` for the staged
release-asset manifest and prepared (not executed) draft-release command.
