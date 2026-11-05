# Release qualification — 2026-11-05

Working candidate: `1.3.0-rc.2`. This record supersedes current-state statements
in the historical rc.1 qualification; historical evidence remains tied to rc.1.
No stable release or manual/flight qualification is declared here.

Starting application commit: `3a98e9a`; source branch fast-forwarded through the
two supplier-only updates to `3592a95`. Latest previously observed Node checks
and Pages deployment both succeeded at `3a98e9a` (runs `41914063998` and
`41914063989`). Those remote runs do not qualify the rc.2 changes.

## Changes under qualification

- OpenRocket import indexes geometry/motor/stage nodes during one structural
  traversal, uses direct XML child fields and retains the structural limit.
  Corpus timeouts are unchanged; jsdom suites use two workers on every host.
- Series-chain findings close links/swivel snatch and swivel opening-shock
  coverage. The owner authorized the warning-output change on 2026-11-05.
  Exact existing 1/1.5 strength-margin and 0.7/1 opening-load boundaries remain.
- The full transfer matrix exposed a 300 ms warning gap after input changes.
  Findings are now memoized synchronously from current inputs before rendering,
  with initial-render/edit regression tests that advance no timers.
- Brief and checklist print artifacts share provenance, result state, evidence
  posture and mission-envelope/unresolved-check content.
- Supported runtime majors are bounded to 22/24/26 and CI defines all three.
- rc.2 package/web/Tauri/Cargo/display identities agree; build verification
  checks every file and the display candidate number.
- fast-uri updated to 3.1.9; full/production npm audits report zero advisories.
- Corpus 0.3.0 has 21 review-only cases, including seven new analytic or
  metamorphic cases. Numeric metrics require explicit tolerance bounds.
- Primary-source research and six manufacturer category records/fourteen staged
  differences are recorded in `online-evidence-2026-11-05.md` and
  `validation/catalog-review/README.md`. The bulk feed returned HTTP 429;
  no complete catalog refresh is claimed.

## Measured local checks

Linux x86_64. Official Node 22.23.4 and 24.22.2 binaries downloaded from
nodejs.org and verified against their published SHA-256 lists. Native Node
26.11.1 is the development runtime. Runs are serialized to avoid cross-runtime
contention. Earlier checks are explicitly distinguished from final checks.

| Check | Observed result |
| --- | --- |
| Clean dependency installs | Separate `npm ci` passed on Node 22.23.4, 24.22.2 and 26.11.1; 425 installed packages on each run. |
| Focused regression checks | Node 22: OpenRocket + load-path, 66/66 passed. |
| Initial Node 22 full check | 50 files / 479 tests passed; format/catalog/corpus/lint/build/identity passed. This run preceded corpus expansion and final print changes. |
| Node 24 full check | 50 files / 479 tests passed; 21-case corpus, format/catalog/lint/build/identity passed. |
| Final clean-install Node 22 check | Pass: 51 files / 481 tests; format/catalog/corpus/lint/build/identity pass. |
| Final clean-install Node 24 check | Pass: 51 files / 481 tests; all check gates pass. |
| Final clean-install Node 26 check | Pass: 51 files / 481 tests; all check gates pass. |
| Full production browser suite | Pending final run; includes the added fresh-context transfer matrix. |
| Full and production npm audits | Zero advisories, 2026-11-05. |
| Benchmark/provenance reports | Generated successfully; no acceptance decisions. |
| Live published baseline | Original main verifier passes against public rc.1: 10 tabs, referenced assets and landing. rc.2 deployment remains pending. |
| Remote rc.2 matrix/portable jobs | Pending branch publication and workflow execution. |

The existing WorkspaceBoundary recovery test deliberately throws a caught
render error; its expected log does not mean the suite failed. The first new
browser-matrix attempt used a nonexistent spaced share-button label; that test
locator was corrected to the actual Export label before final qualification. The broader run then
exposed the real debounced-warning race described above; that implementation
was corrected before repeating the complete suite.

## Parity scope

The new workflow transfers one deterministic plan through JSON, share-link and
saved reload in fresh contexts. Receivers withhold current estimates before
rerun, then compare values/units, unresolved findings and input identity to the
source. Fresh record and candidate-evidence intake contexts preserve historical
prediction values, units and identity without creating a current plan result.
Both print modes expose model/input identity, current/stale status and
shared checks. Candidate evidence retains prediction identity, units and
unreviewed posture. Editing mass withholds stale estimates and marks print.
Existing browser workflows cover custom motor/part/source transfer, Flight Log
intake/dedupe, invalid payloads, demo protection and corrupt-store preservation.
This is representative contract qualification, not every possible combination
of inputs, browsers, printers or physical assemblies.

## Open release gates

[Release gates and platform template](release-gates-1.3.0.md) defines concrete
remaining evidence: rc.2 Windows/macOS manual workflows and artifact hashes,
10–15 observed user trials, independent physics comparisons, per-part catalog
review and final publication/Pages verification. No participant rows, reviewer
identities, accepted comparisons, measured flights or platform results were
invented. Stable promotion waits for an evidence-backed qualification decision.

The retained drogue sampling/ranking policies remain disclosed. M7 model
changes, M8 Python integration and M9 expansion remain behind their evidence
and architecture gates.
