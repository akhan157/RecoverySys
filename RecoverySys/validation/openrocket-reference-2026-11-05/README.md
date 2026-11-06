# OpenRocket 23.09 Reference Benchmark Lane (Corrected)

This folder contains the self-contained, version-pinned OpenRocket 23.09 reference execution lane comparing actual OpenRocket simulation outputs to RecoverySys public APIs ([`src/lib/simulation.js`](file:///home/ak/RecoverySys/src/lib/simulation.js)).

## Directory Layout & File Manifest

| File | Purpose |
| :--- | :--- |
| [`ASSIGNMENT.md`](./ASSIGNMENT.md) | Formal lane scope, non-negotiables, invariants, falsifiers, and acceptance criteria. |
| [`sources.json`](./sources.json) | Pinned upstream source URLs, git commit hashes, licenses, and SHA-256 digests. |
| [`reference-vehicle.json`](./reference-vehicle.json) | Complete deterministic vehicle geometry, mass schedule, motor, and parachute manifests. |
| [`OpenRocketDriver.java`](./OpenRocketDriver.java) | Headless Java harness fully parsing manifest via bundled `javax.json`, executing OR core engine and extracting real events. |
| [`compare.mjs`](./compare.mjs) | ESM comparison runner calling RecoverySys `runSimulation` and `computeDescentRate` with clock separation and supplemental diagnostics. |
| [`controls.test.mjs`](./controls.test.mjs) | Meaningful negative controls, mutation tests, and integrity verifications using `node:test`. |
| [`test-runner.sh`](./test-runner.sh) | End-to-end execution pipeline running memory checks, unique mkdtemp creation, controls, simulation runs, and comparison. |
| [`COMPARISON.md`](./COMPARISON.md) | Detailed comparative analysis, physical divergence breakdown, and parent review notes. |

## External Artifacts Storage

All raw simulation CSVs, downloaded JARs, compiled classes, and logs are stored **strictly outside git**.
Shared input assets:
```
<primary-git-root>/../RecoverySys-artifacts/online-validation-2026-11-05/openrocket/
```
Files stored in the shared external directory:
- `OpenRocket-23.09.jar` (Official release fat JAR, SHA-256: `65cc0ab68a536fc33fc02a84c416725523a82745e100356efd9ff890b43bfcd0`, size 71,758,139 bytes; local observed byte identity)
- `I200W.eng` (Tripoli certified motor file, SHA-256: `927f60b020cc4f7181925871578319a2e5ddc0500e05c4c124cc709bdd419781`)

Each execution of `test-runner.sh` creates a fresh unique `mktemp -d` external directory (e.g. `/tmp/or-reference-run-XXXXXX`) containing:
- `reproduction-manifest.json` (Commit SHA, dirty status, environment, and input SHA-256 hashes)
- `or-reference-controlled-cd-flight-timeseries.csv` (Controlled Cd=0.50 flight timeseries)
- `or-reference-controlled-cd-summary.properties` (Key flight milestones, observed masses, and event markers)
- `or-reference-native-aero-flight-timeseries.csv` (Native Barrowman 6-DOF flight timeseries)
- `or-reference-native-aero-summary.properties` (Native flight milestones, observed masses, and event markers)
- `comparison-results.json` (Full comparison matrix and supplemental diagnostics)
- `output-hashes.txt` (SHA-256 hashes of all generated outputs)

## Prerequisites

1. **Operating System:** Linux x86_64
2. **Java Runtime:** Eclipse Adoptium / Temurin OpenJDK 17 (`JAVA_HOME`, `JAVA_BIN`, or `PATH`)
3. **Display Server:** `xvfb-run` (Virtual Framebuffer for AWT/Swing headless initialization)
4. **Node.js:** v18+ (Node v26 available)
5. **Memory:** $\ge 2\text{ GiB}$ free RAM (verified automatically before compilation and execution)

## Execution & Reproduction Instructions

To execute the entire verification pipeline:

```bash
cd RecoverySys/validation/openrocket-reference-2026-11-05
export JAVA_HOME="/home/ak/opt/jdk17"  # Or your Java 17 path
./test-runner.sh
```

No push, PR, release, or external contact. Author cannot self-accept; parent independently reviews and reruns.
