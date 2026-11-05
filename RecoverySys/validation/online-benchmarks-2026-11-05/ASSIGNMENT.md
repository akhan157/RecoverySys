# Physics Validation Research & Benchmark Design Assignment (2026-11-05)

## 1. Assignment Metadata & Pin
- **Repository Root:** `/home/ak/RecoverySys` (derived from git common-dir `/home/ak/RecoverySys/.git`)
- **Isolated Worktree:** `/home/ak/.t3/worktrees/RecoverySys/t3-02eaddc5`
- **Application Path:** `RecoverySys/` (relative to git root)
- **Branch:** `t3/physics-validation-research-1`
- **Pinned Base Commit (HEAD):** `fe96b89f188c17d10b335b9395013cea99de9319`
- **Integration Branch Target:** `evidence/online-validation-2026-11-05`
- **Assigned Model:** Google Antigravity `gemini-3.8-flash` (high thinking)
- **Assigned Surface:** `RecoverySys/validation/online-benchmarks-2026-11-05/` exclusively
- **Raw Artifacts Path:** `../RecoverySys-artifacts/online-validation-2026-11-05/physics/` (relative to primary repo root `/home/ak/RecoverySys`)

## 2. Motivation & Citations
- **Context:** Following the 1.3.0-rc.2 release candidate qualification checkpoint (`docs/GOAL-HANDOFF.md`), independent physics acceptance and real-flight validation remain open release gates (`docs/release-gates-1.3.0.md`).
- **Lane History:** The initial Opus lane (`t3/recovery-validation-research`) and follow-up Sonnet lane failed due to provider quota limits prior to generating research or edits (`docs/history/online-validation-2026-11-05/ORCHESTRATION.md`).
- **Owner Directive:** The owner authorized selecting alternative working Antigravity models to execute the physics validation lane without waiting for quota resets. This lane operates as the replacement physics research lane using Gemini high.
- **Independence:** Author cannot self-accept. The parent agent independently reviews, verifies, and integrates results.

## 3. Scope Boundaries

### In Scope (Gate 1 Deliverable)
1. **Primary Online Source Packet:**
   - Gather authoritative, retrievable primary sources, equations, physical constants, reference tables, and standard conventions across six physics domains:
     - Earth Atmosphere (ISA / U.S. Standard Atmosphere 1976, layer bounds, geopotential vs geometric altitude, constants).
     - Terminal Descent (aerodynamic drag force, terminal velocity, reference area $S$ conventions—projected vs constructed/nominal surface area—exact $C_D$ definitions, and landing kinetic energy).
     - 1-DOF Ascent Dynamics & Drag (equations of motion, Mach-dependent drag rise, speed of sound, motor thrust integration, mass depletion).
     - Wind Drift & Coordinate Transformations (meteorological vs flight heading conventions, Cardinal wind directions, layered wind shear vs log friction layers, geodetic displacement).
     - Recovery Shock & Load Screening (static ejection impulse, Knacke dynamic snatch proxy, Pflanz/opening shock factor $C_x$, elastic strain energy, and material safety factor boundaries).
     - Statistical Dispersion & Numerical Validation (PRNG reproducibility, Monte Carlo sample size requirements, bivariate normal confidence ellipses).
2. **Version-Pinned OpenRocket Benchmark Route:**
   - Probe local runtime capabilities (Java, Python, Node).
   - Document OpenRocket official software version pinning (e.g. 23.09), CLI headless simulation execution (`--help`, `--export-csv`), simulation listener/stepper settings, motor database provenance (.eng / .rse from ThrustCurve.org / NAR S&T), and output unit alignments.
3. **First-Party Measured Flight/Descent/Load Data Search:**
   - Search public repositories (Zenodo, NASA Open Data, university rocketry competition telemetry) for instrumented flight datasets (barometric altimeter, GPS, IMU, load cell).
   - Document sensor types, provenance, open reuse permissions (CC BY, MIT, Public Domain), uncertainty estimates, and explicit reasons for any missing/unobtainable data.
4. **Validation Design & Benchmark Suite Specification:**
   - `sources.json`: Machine-readable catalog with organization, title, URL, access date, claims, units, reference artifact relative path and SHA-256 hash, and reuse limitations.
   - `VALIDATION-DESIGN.md`: Rigorous engineering design specifying independent analytical references (deriving values independently without using production functions as oracles), preset tolerances with documented physical/numerical basis, observable outputs, falsifying failure modes, pass/fail criteria, and testing boundaries.
   - Separate invariants, analytic closed-form references, simulator comparisons, and real-flight observation categories.
   - Actionable OS workflow and observed-user validation matrix (distinguishing online-obtainable evidence from physical participant observations).

### Out of Scope (Strict Non-Negotiables)
- **No modification of production code** (`src/`, `src-tauri/`, etc.).
- **No modification of catalog data** or catalog review files (`catalog-review/` is owned by a concurrent assignment).
- **No modification of existing 21 corpus cases** (`validation/corpus/`), `validation/manifest.json`, or existing qualification records (`docs/GOAL-HANDOFF.md`, `ROADMAP.md`, task boards).
- **No executable harness code** or test script generation during Gate 1 (Gate 1 is strictly source packet + design).
- **No physics or threshold tweaking** to artificially force test passage.
- **No case promotion** from draft/review to accepted.
- **No invented or synthetic flight data** represented as measured rocketry flight observations.
- **No external contact, paid services, or global package installations.**
- **No git pushes, PR creation, or branch watching.**

## 4. Evidence Storage & Hash Integrity
- Large/raw downloaded reference artifacts (PDFs, raw datasets, JAR files) are stored outside git at:
  `../RecoverySys-artifacts/online-validation-2026-11-05/physics/` relative to the primary repo root (`/home/ak/RecoverySys`).
- Every downloaded file is verified with its SHA-256 hash recorded in `sources.json` and `VALIDATION-DESIGN.md`.
- Only minimal excerpts, equations, tables, and structured JSON/markdown metadata are committed to git in `RecoverySys/validation/online-benchmarks-2026-11-05/`.

## 5. Falsification & Decision Rules
- **Tautology Rejection:** An expected benchmark value cannot be derived from `src/lib/simulation.js` or `recoveryLoad.js`. Every expected value must be independently computed from first-principles equations or trusted external tools.
- **Preset Tolerances:** Tolerances must be justified based on floating-point precision ($10^{-12}$), quadrature step size (e.g. RK4 $dt=0.02\text{ s}$ truncation error), or atmospheric constant variances ($\sim 0.01\%$), never retrofitted to fit existing simulator outputs.
- **Failure Mode Visibility:** Each proposed benchmark must explicitly state what physical or algorithmic defect would falsify the check (e.g., inverted wind direction, missing Mach drag rise, wrong parachute reference area convention).

## 6. Gate 1 Deliverable & Handback Format
Upon completion of Gate 1 research and design:
1. Verify working tree status: only `RecoverySys/validation/online-benchmarks-2026-11-05/` contains new files.
2. Commit the owned packet with an explicit non-self-approval commit message.
3. Report:
   - Git HEAD and commit SHA.
   - List of primary sources, URLs, download paths, and SHA-256 hashes.
   - Gate 1 validation design summary and next executable increment proposal.
   - Exact physical constraints, conventions, and missing/unresolved data.
   - Stop and await parent review.
