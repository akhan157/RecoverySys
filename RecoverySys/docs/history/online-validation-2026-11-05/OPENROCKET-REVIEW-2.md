# Corrected OpenRocket reference run — parent verification

Implementation commit: `532550ce01a084304e688366fb24088c9f921492`
(Antigravity Gemini 3.8 Flash high). Parent hardening follow-up:
`a97d80339de8d12f0991173dd6d02561b599a7ec` and
`cb706dd06e2974a95a4901854e76239554ce7810`
(Codex `gpt-6.1-sol` high). Reviewer is a different model family from the
author. No author self-acceptance occurred.

## Scope

This is a diagnostic two-engine fixture comparison, not flight validation, not
model acceptance, and not a release gate. Production physics, catalog values,
canonical corpus status and thresholds are unchanged. Raw JARs, classes, CSVs,
properties, controls and metadata remain outside git under
`../RecoverySys-artifacts/online-validation-2026-11-05/openrocket/`.

## What the parent reproduced

Full guarded runner executed twice by the parent:

- Pre-fix run (dirty tree, one-line pending test fix):
  `run-A5PBuu`, controls 19/20 because control 2C asserted a basename-form
  error message the guard never emits (`Checksum verification failed for
  OpenRocket-23.09.jar`); the guard itself correctly threw
  `Checksum verification failed: <path>`. Fixed in `cb706dd` by asserting the
  invariant `Checksum verification failed` prefix. Both OpenRocket runs and
  the comparison completed.
- Final run from committed clean tree `cb706dd`
  (`reproduction-manifest.json` records commit and `git_status: clean`):
  `run-Oa0rH3`, **20/20 controls**, both OpenRocket executions
  (controlled Cd 0.50 and native Barrowman), comparison JSON, event/summary
  CSVs and output hashes. Exit 0.
- Standalone control suite with exported Java paths:
  20/20 pass (`JAVA_BIN/JAVAC_BIN` must point at a Java 17 toolchain; without
  them the two driver-spawning groups fail for environmental, not product,
  reasons).

Inputs were hash-gated before execution: OpenRocket 23.09 JAR SHA-256
`65cc0ab68a536fc33fc02a84c416725523a82745e100356efd9ff890b43bfcd0`
(observed bytes; upstream publishes no digest) and I200W motor
`927f60b020cc4f7181925871578319a2e5ddc0500e05c4c124cc709bdd419781`.

## Findings the correction resolved

- Clocks are now disentangled: RecoverySys `total_time_s` is descent-only
  (48 s); estimated launch-to-landing adds integer-rounded `apogee_t_s`
  (58 s). OpenRocket reports 50.96 s descent and 61.23 s flight
  (controlled), 52.15 s and 62.63 s (native). The initial 48-vs-61.23 s
  comparison is withdrawn.
- The Java driver now actually parses and validates `reference-vehicle.json`
  (unit/mass/motor-curve guards), and manifest mutations demonstrably change
  engine input and output (Control Group 4).
- Observed values are extracted from trajectory events/samples, not hardcoded
  literals; missing required events now fail the run.
- Fresh unique run directories, machine-readable metadata, input/output hashes
  and clean-tree provenance replace evidence overwrites.

## What the run shows — and does not show

Controlled-Cd apogee agrees closely with the public RecoverySys estimate
(about 0.01% on this fixture); native OpenRocket aerodynamics differ by about
3% on apogee and 4.6% on time-to-apogee. Main-phase descent differs because
OpenRocket retains both deployed canopies after main deployment while
RecoverySys models the main alone: sampled OpenRocket touchdown speed
(5.319 m/s) matches the aggregate-Cd-area diagnostic (5.3189 m/s) rather than
the single-main calculation (5.9467 m/s). This confirms a structural model
difference; it does not assign causality for every remaining delta, does not
establish flight accuracy, and creates no acceptance tolerance.

Remaining provenance limits: upstream publishes no JAR digest (hash is
observed bytes); the Java runtime download checksum was not independently
captured; the I200W `.eng` header does not establish redistribution rights.
The recovery `terminal_velocity` properties are samples near deployment/landing
events, not proven terminal equilibrium.

## Disposition

Verified as a bounded, reproducible, diagnostic two-engine comparison at
`cb706dd`. Suitable to cite as a simulator-comparison reference for M7
discussion. Not accepted-for-comparison, not real-flight evidence, not
physical acceptance, and no release/physics/catalog decision follows from it
alone.
