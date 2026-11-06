# Initial OpenRocket execution review

Parent review on 2026-11-05: **rework required; no acceptance**. Author was
Antigravity Gemini 3.8 Flash (high); reviewer is Codex Sol (high). The author
reported completion from branch `t3/openrocket-reference-run`, base
`0149dcc026e719831f540c1b1a780e726b35cc60`, but left nine files uncommitted.
The integration branch has not imported that packet or its conclusions.

The initial packet and existing CSV/properties/class outputs were preserved
without rerunning or overwriting them at
`../RecoverySys-artifacts/online-validation-2026-11-05/openrocket/initial-uncommitted-9a96110e/`.
Its `snapshot-manifest.json` records byte hashes for every captured file.
Large JAR/motor inputs remain in the parent artifact directory. Observed SHA-256:
JAR `65cc0ab68a536fc33fc02a84c416725523a82745e100356efd9ff890b43bfcd0`;
motor `927f60b020cc4f7181925871578319a2e5ddc0500e05c4c124cc709bdd419781`.

## Findings requiring correction

1. **Different clocks were compared.** `compare.mjs` labels
   `runSimulation.total_time_s` as total flight duration; production computes
   this from the two descent phases only. A direct primary-checkout probe
   reproduces descent 48 s, rounded time to apogee 10 s and approximate
   launch-to-landing sum 58 s. Comparing 48 s with OpenRocket's 61.2328 s
   cannot support the reported 21.61% total-flight difference or its explanation.
   Report descent and launch-to-landing separately, with rounding limits.
2. **Recovery configurations differ.** Both OpenRocket chutes remain deployed;
   RecoverySys's main phase uses the main alone. [INFERENCE] The observed
   5.3192 m/s touchdown speed agrees with the independent sum-of-canopy-areas
   calculation (5.318884 m/s), whereas main alone gives 5.946693 m/s at sea
   level and burned-out mass. Verify actual OpenRocket deployed devices/events
   and drag contributions. Preserve this initial case as a model difference;
   any added matched case must state its declared mechanism before execution.
   Do not claim density/transients explain a 12% speed gap without measurement.
3. **Manifest is ignored by Java.** The driver parses `--manifest` but never
   opens it; geometry, mass, recovery and environment are hardcoded. Replace
   this with a validated shared configuration and audit actual model values.
   Mutation tests must demonstrate a manifest change reaches the actual engine.
4. **Reported observations include constants.** Burnout time and burned-out
   mass are assigned literals, not measured events/trajectory values. Initial
   CSV launch mass is 2.357335 kg rather than the declared 2.357504 kg. Extract
   events, phase times and mass observations honestly; label nominal inputs.
5. **Metrics are mixed.** Supplemental `computeDescentRate` calls use dry mass;
   the actual `runSimulation` descent uses launch mass. Give each a distinct
   label and align comparison density/height and canopy state. Velocity at one
   sample is not automatically a proven terminal rate; no fallback from missing
   terminal data to a mean rate. Reject missing/non-finite metrics.
6. **Controls are not adequate.** The checksum control merely compares the
   real hash with zeros, bypassing the guard. Exercise the actual verifier with
   a mutated fixture. Require specific missing-motor failure, a positive input
   baseline before negative mass, malformed summaries and manifest mutations.
7. **Reproduction overwrites evidence.** Use fresh unique external run paths,
   capture source commit/dirty state, runtime identity, input/source hashes,
   commands, event logs and output hashes. Do not rewrite a tracked result JSON
   or initial artifacts. Use configurable Java paths, with no host paths in
   committed records. Commit the implementation before its final evidence run.
8. **Claims exceed evidence.** A close rounded apogee does not prove identical
   gravity, density or kinetic energy. Production RK4 step is 0.02 s and public
   burnout is rounded to an integer; the initial report describes these
   incorrectly. Remove unsupported finite canopy-opening-time, 100 Hz, motor
   license/certification, exact-input and conservative-margin assertions.

## Provenance check and next scope

Official GitHub API lookup confirms `release-23.09` points to commit
`6c89a3c60118226e562e19625d8fd439854b1246`. Release metadata reports the JAR
size 71,758,139 bytes but no upstream digest; the local SHA is an observed byte
identity, not a vendor-published checksum. Runtime provenance needs an official
download/checksum record or an explicit limitation. Motor ancestry must be
checked rather than inferred from another source packet's release label.

Authorize a bounded correction lane using the available Antigravity Gemini
model, preserving the initial output. It may change only the OpenRocket packet,
not production, dependencies, corpus, tolerances or release gates. First design
must state clocks, canopy state, public API fields, and measured versus nominal
quantities before new execution. No tolerance fitting. Parent must review and
rerun the committed implementation. Independent engineering acceptance and
real-flight qualification remain open.
