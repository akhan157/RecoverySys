# OpenRocket Reference Validation Correction Assignment

## 1. Worktree & Identity Confirmation
- **Worktree Root:** `<prepared isolated worktree>`
- **Application Directory:** `RecoverySys/` (relative to repository root)
- **Branch:** `t3/openrocket-reference-correction`
- **Pinned Base Commit (HEAD):** `df5e0fe9154b3e24f2194d7a23407e123cd0f30d`
- **Owned Surface:** `RecoverySys/validation/openrocket-reference-2026-11-05/` exclusively
- **Assigned Model:** Google Antigravity `gemini-3.8-flash` (implementation sub-agent)
- **Authority Boundaries:** Author cannot self-accept. Parent independently reviews and reruns. No edits to production (`RecoverySys/src/`), dependencies, corpus, other lanes, parent history, handoff, or acceptance register. No push, PR, release, or external contact.

## 2. Motivation & Citations
- **Context:** Following the initial uncommitted OpenRocket reference attempt (`9a96110e`), parent review in `RecoverySys/docs/history/online-validation-2026-11-05/OPENROCKET-REVIEW-1.md` recorded **rework required; no acceptance**.
- **Initial Evidence Preservation:** Initial packet and outputs were preserved read-only at `../RecoverySys-artifacts/online-validation-2026-11-05/openrocket/initial-uncommitted-9a96110e/` and are not overwritten. Raw JAR (`OpenRocket-23.09.jar`) and motor (`I200W.eng`) remain in `../RecoverySys-artifacts/online-validation-2026-11-05/openrocket/`.
- **Review Findings Addressed:**
  1. *Clock mismatch:* `compare.mjs` labeled `runSimulation.total_time_s` as total flight duration, when RecoverySys computes descent-only duration (~48 s). Comparing 48 s with OpenRocket's launch-to-landing time (~61.23 s) produced an invalid 21.61% flight-time delta. Clocks must be separated: descent-only vs launch-to-landing (estimated flight = `apogee_t_s + total_time_s` with rounding limits) and event-derived OpenRocket ascent/descent/landing.
  2. *Recovery configuration mismatch:* In OpenRocket dual deployment, both drogue and main canopies remain deployed after main deployment. In RecoverySys `runSimulation`, the main descent phase uses main alone. Touchdown velocity (5.32 m/s) matches aggregate canopy area ($A_{\text{sum}} = 0.8209\text{ m}^2$) at burned-out mass. Both-canopies-remain-deployed must be preserved as an explicit model difference without silent alteration or claimed phase equivalence.
  3. *Manifest ignored by Java:* `OpenRocketDriver.java` parsed `--manifest` but hardcoded all rocket geometry, mass, CD, and recovery parameters. Rework must parse and validate the SAME manifest (`reference-vehicle.json`) in Java using bundled `javax.json` and in Node.
  4. *Reported observations included constants:* Burnout time (1.803 s) and burnout mass (2.175616 kg) were hardcoded literals rather than event/trajectory extracts. CSV launch mass was 2.357335 kg vs declared 2.357504 kg. Real event extraction and trajectory values must be reported and nominal inputs explicitly labeled.
  5. *Mixed metrics:* Supplemental `computeDescentRate` calls used dry mass, while public `runSimulation` used launch mass. Supplemental single-chute and aggregate-area checks must be explicitly labeled as diagnostic supplements, distinct from public `runSimulation`.
  6. *Inadequate controls:* Mutated checksum test was an inequality tautology (`"$ACTUAL_JAR_SHA" = "$FAKE_HASH"`), bypassing the actual guard. Real verification routines must be exercised.
  7. *Reproduction overwrote evidence:* Every invocation must use a unique `mkdtemp` external run directory, never overwriting initial or shared evidence. Clean commit reference is required before final execution.
  8. *Unsupported assertions:* Remove unverified claims of 100 Hz integration, finite canopy opening time, exact input matching, and motor license certainty.

## 3. Approved Mechanism & Implementation Design
1. **Engine & Provenance:**
   - Version-pinned OpenRocket 23.09 official engine (Git commit `6c89a3c60118226e562e19625d8fd439854b1246`).
   - Local observed JAR SHA-256: `65cc0ab68a536fc33fc02a84c416725523a82745e100356efd9ff890b43bfcd0` (size 71,758,139 bytes). Note GitHub release API digest is null; documented as local observed byte identity.
   - Motor: AeroTech I200W (`I200W.eng`), SHA-256 `927f60b020cc4f7181925871578319a2e5ddc0500e05c4c124cc709bdd419781`. Ancestry and licensing labeled as Tripoli certified data from ThrustCurve / OR distribution; no speculative claims.
2. **Shared Validated Manifest:**
   - Both OpenRocket Java driver and Node comparison driver parse the SAME `reference-vehicle.json`.
   - Java driver uses `javax.json` bundled in `OpenRocket-23.09.jar` without new dependencies.
   - All physical parameters (dimensions, stage masses, CG, CD override, parachute diameters, CD, deployment events/altitudes, environment) are ingested from the manifest.
   - Strict validation: negative mass, missing sections, non-numeric values, or invalid events trigger clean exceptions.
3. **Event Extraction & Trajectory Metrics:**
   - Trajectory events extracted directly from `FlightDataBranch.getEvents()`: `BURNOUT`, `APOGEE`, `RECOVERY_DEVICE_DEPLOYMENT` (drogue and main), and `GROUND_HIT`.
   - Real masses extracted from `FlightDataType.TYPE_MASS` at launch, burnout, and landing.
   - Drogue phase velocity and descent rate extracted over actual drogue descent window (apogee to main deploy).
   - Main phase terminal velocity extracted before ground impact.
4. **Clock and Model Parity Accounting:**
   - Public RecoverySys `runSimulation`: reports `total_time_s` as descent-only duration ($t_{\text{descent}} = \Delta t_{\text{drogue}} + \Delta t_{\text{main}}$) using launch mass; estimated total flight is $t_{\text{flight}} = t_{\text{apogee}} + t_{\text{descent}}$. RecoverySys RK4 integration step is $dt = 0.02\text{ s}$ with integer-rounded burnout and apogee time.
   - OpenRocket: integrates 6-DOF equations with event-derived ascent time, coast to apogee, drogue descent, main descent, and ground hit.
   - Recovery configuration: OpenRocket maintains both drogue and main canopies deployed. Reported terminal descent (5.32 m/s) reflects aggregate canopy area.
   - Supplemental diagnostic calculations: evaluate isolated main, isolated drogue, and aggregate area at both launch mass and dry mass at sea level and deployment altitude, clearly labeled as supplemental.
5. **Execution & Resource Limits:**
   - Host Temurin JDK 17 configured via `JAVA_HOME`/`JAVA_BIN`/`JAVAC_BIN`. No committed absolute host paths.
   - Memory check: `free -h` verifies $\ge 2\text{ GiB}$ available before compiling or running.
   - Process limits: `max 2` compiler/test jobs, `-Xmx512m`, `-XX:ActiveProcessorCount=2`.
   - Headless execution via `xvfb-run -a` with process cleanup.
   - Fresh external run directory created via `mktemp -d` under `/tmp/or-ref-XXXXXX` or `$ARTIFACTS_DIR/runs/` on every invocation.
6. **Meaningful Controls:**
   - Baseline valid run verifies clean execution.
   - Negative mass input triggers immediate rejection in both RecoverySys and OpenRocketDriver.
   - Missing motor file triggers clean non-zero error exit in OpenRocketDriver.
   - Checksum integrity guard actually verifies file bytes against declared SHA-256 and fails on mutated input.
   - Manifest mutation control: modifying vehicle mass or geometry in manifest demonstrably changes OpenRocket simulation output.
   - Missing/non-finite summary values rejected by comparison validator.

## 4. Invariants & Falsifiers

### Invariants
1. Both simulators execute from the same shared manifest without hardcoded bypasses.
2. Clocks are rigorously distinguished: descent-only duration vs launch-to-landing duration.
3. Both-canopies-remain-deployed in OpenRocket is documented as an explicit model difference.
4. No tuning, tolerance relaxation, or production physics modifications.
5. All large raw CSV and JSON run artifacts reside outside git in external run directories.

### Falsifiers
- **F1 (Hardcoded Bypass):** Java driver failing to reflect manifest changes falsifies manifest parity.
- **F2 (Clock Conflation):** Comparing RecoverySys descent-only time directly to OpenRocket flight time falsifies valid comparison.
- **F3 (Tautological Control):** A control test that passes without invoking the actual verification routine falsifies test integrity.
- **F4 (Silent Phase Equivalence):** Claiming RecoverySys single-chute descent matches OpenRocket dual-deployed descent without accounting for aggregate area falsifies aerodynamic honesty.
- **F5 (Self-Acceptance):** Claiming final physics pass or self-approving this lane falsifies process compliance.

## 5. Scope Boundaries
- **In Scope:** `RecoverySys/validation/openrocket-reference-2026-11-05/` files (`ASSIGNMENT.md`, `reference-vehicle.json`, `OpenRocketDriver.java`, `compare.mjs`, `test-runner.sh`, `controls.test.mjs`, `COMPARISON.md`, `README.md`, `sources.json`).
- **Out of Scope:** Any edits to `RecoverySys/src/`, `RecoverySys/src-tauri/`, `RecoverySys/validation/corpus/`, `manifest.json`, `GOAL-HANDOFF.md`, or acceptance registers.
