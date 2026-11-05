# 1.3.0 release gates

Prepared 2026-11-05 for the working `1.3.0-rc.2` candidate. This is an execution
record; it is not a stable-release approval. See the dated qualification record
for actual results. The published rc.1 remains a separate artifact.

| Gate | Status / required evidence |
| --- | --- |
| Clean Node 22 install and full check | Record final run in qualification document. |
| Node 24 / 26 checks | Three-major CI matrix added; record local and remote runs separately. |
| Compatibility rule decision | Owner's instruction to complete the roadmap authorizes series-chain warnings. Links/swivel now screened for elongation snatch/main-snatch proxy; swivel also for opening shock. Thresholds unchanged. |
| Screen/Brief/print/transfers/currentness | Fresh-context JSON/share/saved-reload workflow and consumer/boundary tests. Record results and any exclusions. |
| Version and dependency identity | rc.2 prepared across web/package/lock/Tauri/Cargo/display; build check now enforces agreement. Audit refreshed. |
| Windows portable workflow | OPEN: actual rc.2 archive SHA-256, Windows OS/build, reviewer, date, launch, create/import/run/edit/rerun/save/reopen, JSON/share and both print modes. Automated process-alive smoke is additional evidence only. |
| macOS workflow | OPEN: actual rc.2 archive SHA-256, macOS version, architecture, reviewer/date, launch and same workflows. Record each tested architecture separately; an arm64 launch does not qualify Intel. |
| Observed field trials | OPEN: 10–15 actual participants using `v1-field-trial.md`, anonymized results in `field-trial-results.csv`; no synthetic participant rows. |
| Physics comparisons | OPEN: 21 review-only cases, zero accepted comparisons/real-flight cases. Reviewer checks units, source, tolerance, model identity, scope; records decision and identity before promotion. |
| Engineering catalog | OPEN: source packet rechecks three pages; remaining 37-record/35-difference historical packet and exact variant identities need field-by-field decisions. No engineering values silently changed. |
| Stable promotion | OPEN until required qualification is recorded: final clean commit, remote checks, platform scope stated, changelog/notes matching artifact, stable tag, web/portable archives, SHA256SUMS.txt, published hashes verified, live Pages identity verified. |

## Manual platform evidence template

Copy for each tested artifact; leave unknown fields blank rather than inventing
results. Attach permitted screenshots/logs beside the completed record.

```text
candidate:
source_commit:
artifact_filename:
artifact_sha256:
os_version:
architecture:
reviewer:
observed_at:
launch:
create_import_stage_and_mass_review:
select_parts_and_read_unknowns:
run_edit_stale_rerun:
save_close_reopen:
json_share_transfer:
brief_print:
checklist_print:
flight_record_candidate_evidence:
issues_and_artifact_paths:
decision_and_scope:
```

## Model and later-track decisions

Retain and disclose the fixed-5,000-ft compatibility drogue sample, mid-phase
drogue-only landing-energy rate, and sea-level suggestion ranking in rc.2.
They remain different sampling policies with no new accuracy claim. M7 requires
an equivalent-input comparison and independent evidence before changing model
outputs or assumptions identity. Record each discrepancy with inputs, source
artifact/hash, units, expected/observed values, uncertainty, and scope.

M8 remains research-only per `M8-architecture-decision-report.md`: browser
JavaScript is authoritative. Reopen after M6/M7 evidence, then compare engines,
select a documented role, qualify privacy/security and fallback, and test host
packaging. No hosted compute or silent upload is enabled by this work.

M9 remains after core qualification: existing read-only source staging/diff
commands can gather proposals. Next implementation requires exact identity,
per-field provenance, explicit reviewer decisions, prior-value retention and
rollback. A failed/rate-limited fetch cannot remove a part or overwrite data.
