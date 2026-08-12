# RecoverySys release qualification record

**Checkpoint:** `08b891a` plus the verified M5 guided-first-plan qualification increment
**App release:** `1.2.0.1`
**Verification date:** 2026-08-11
**Local runtime:** Node `v26.4.0`, npm `12.0.2`

This is a development/release-qualification record, not a supported-platform or
evidence-qualified release claim. The browser JavaScript implementation remains
the sole production simulation authority.

## Verified local gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Clean dependency install | Pass | `npm ci` |
| Formatting | Pass | `npm run format:check` |
| Parts catalog | Pass | 225 parts |
| Validation corpus | Pass | 14 review cases; no accepted comparison or flight cases |
| Lint | Pass | `npm run lint`, zero warnings |
| Unit/component tests | Pass | 34 files, 281 tests |
| Production build | Pass | `npm run build` |
| Browser E2E | Pass | 36/36: Chromium desktop and Pixel 5 mobile |
| Guided first-plan qualification | Pass | New/resume/import-invalid/stale/insufficient paths plus keyboard step activation in both E2E projects |
| Print artifact media inspection | Pass | Chromium E2E verifies brief/checklist section separation; `PrintChecklist.brief.test.jsx` verifies stale estimate withholding |
| Diff hygiene | Pass | `git diff --check` |

The M5 increment keeps the canonical Recovery Brief confidence/evidence posture
visible in GuidedReview results. It does not change simulation calculations,
evidence status, or approval boundaries.

## Open release gates

- **Supported runtime:** the clean install above used Node 26. CI is pinned to
  Node 22; a fresh Node 22 qualification run remains required before a supported
  runtime claim.
- **Windows:** the portable artifact still needs a fresh Windows launch and
  recorded hash on the integrated checkpoint.
- **macOS:** no macOS host has exercised the universal artifact; macOS support
  remains unverified.
- **Independent evidence:** the corpus remains review-only. No accepted trusted
  simulator comparison, independent reviewer metadata, manufacturer/test data,
  or traceable real-flight observation is available.
- **Broader artifact parity:** Chromium print-media inspection now verifies distinct brief/checklist section visibility, while print contract tests verify stale estimate withholding. Full screen, export/import, share, and Flight Log parity still require the remaining M4 transfer/evidence-loop review before claiming a fully qualified release.

## Deferred tracks

M7 evidence-led model decisions, M8 advanced/optional compute architecture, and
M9 longer-term expansion remain deferred. The Python engine remains research-only
and is not wired into the frontend, release authority, or desktop bundle.
