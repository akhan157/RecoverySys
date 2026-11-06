# Online analytic comparison design

This packet provides four executable mathematical agreement checks. Original
research and failed assumptions remain in git history. Production physics,
thresholds, catalog values and canonical corpus status are unchanged.

## Method and independent references

`reference_calculator.py` uses Python standard-library calculations and imports
no production code. `adapter.js` calls real exported production functions and
imports their model identity from production constants. The runner checks the
six proposals against the existing schema, then checks frozen inputs, values,
units, model identity and numeric bounds against four independent references.
Schema agreement alone cannot establish numerical agreement.

| Check | Declared reference | Preset numerical allowance |
| --- | --- | --- |
| Atmosphere | Barometric equation at matched numeric height 2500 m; T0=288.15 K, P0=101325 Pa, g0=9.80665 m/s², R*=8314.32 J/(kmol K), M0=28.9644 kg/kmol, lapse=-0.0065 K/m. | Temperature absolute 0.01 K; pressure and density relative 0.0001. |
| Terminal descent | 48-inch circular nominal diameter, 5 kg, declared nominal-area Cd=0.8, density=1.225 kg/m³, g=9.80665 m/s². | Speed relative 0.0001; derived energy relative 0.0002. |
| Wind | Constant 15 mph FROM south; apogee/deployment 3000/500 ft, drogue/main 60/20 ft/s; direction north. | Distance absolute 1 ft; bearing absolute 0.1 degree. |
| Snatch arithmetic | 1500 lbf, 20 ft, 25% extension, 6 kg, 65 ft/s; rounded compatibility constants 4.448 N/lbf and 3.28084 ft/m. | Force proxy, rating margin and energy margin relative 0.001. |

All bounds are analyst-defined numerical comparison criteria, not source-stated
physical uncertainty or vehicle accuracy. Atmosphere bounds cover the declared
gas-constant/exponent differences; descent bounds cover density and rounded
conversion differences, with energy twice the rate allowance. Wind bounds cover
presentation rounding. Snatch bounds allow rounded unit conversions in a
mathematical proxy, without establishing material strength or measured load.
Bounds were retained or tightened from the reviewed design, never widened to
make engine results pass.

The atmosphere comparison matches the numeric coordinate rather than claiming
geometric/geopotential equivalence. R*/M0 and the exponent are calculated
independently: pressure is approximately 74682.53 Pa. Earlier incorrect pressure
and mixed constants are superseded. Terminal area is approximately 1.16745403 m²,
speed 30.37473 ft/s and energy 214.28650 J under the declared density. Runtime
reports retain full calculated precision. Energy is derived in the adapter
from observed speed and mass, not separately returned by production.

## Source and inspection scope

- [U.S. Standard Atmosphere 1976](https://ntrs.nasa.gov/citations/19770009539):
  downloaded PDF with actual byte hash. Printed pages 2-4 (PDF18-20) were
  rendered and inspected for Tables2-4 and standard gravity, gas constant,
  pressure, temperature and lapse-rate conventions. Mean dry-air molecular
  weight is the declared standard-model value used in the calculation.
- [NASA Glenn flight equations](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-equations-with-drag/):
  drag balance and constant-density coast equations; HTML inspected without
  claiming a captured-byte hash.
- [NOAA wind conventions](https://www.weather.gov/hfo/windbarbinfo):
  wind direction means where wind comes from; HTML uncaptured in this packet.
- Knacke manual, OpenRocket documentation/motor data and public telemetry were
  downloaded. Capturing them does not verify every extracted coefficient or
  hardware claim. No generic opening coefficient, material strength, sensor
  accuracy or broader dataset license is accepted by these four checks.

Exact metadata and nine captured-file hashes are in `sources.json`; uncaptured
HTML records explicitly use null artifacts. Raw files stay outside git at
`../RecoverySys-artifacts/online-validation-2026-11-05/physics/` relative to the
primary repository root. A declared nominal-area/Cd pair does not resolve an
unspecified manufacturer's area convention. The snatch case checks a screening
assumption rather than a structural certificate.

## Failure controls and execution

Five original control groups exercise corrupted reference pressure, feet versus
meters, reversed wind, wrong Cd and five invalid-input examples. Adapter input
rejection is distinct from rejection by the production API; these controls do
not change production defaults. Native Node tests also reject frozen-proposal
value/input/unit/model drift, widened bounds, duplicate metrics, missing or
unbounded tolerances and nonfinite values.

From repository root:

```bash
node --test --test-concurrency=2 RecoverySys/validation/online-benchmarks-2026-11-05/adapter.test.js
node RecoverySys/validation/online-benchmarks-2026-11-05/run-benchmarks.js
```

Python3, Node and the project's existing Ajv are required. No new dependency or
production engine integration is introduced. App/packet cwd invocation is also
supported. Each execution writes to a fresh external directory and records the
git commit and relevant source dirty-state, preserving previous evidence.
Proposal cases stay review-only and outside the canonical corpus.

## Exclusions and remaining evidence

- Constant-density coast is excluded: production starts a powered launch with
  varying density and Mach drag, without the proposed burnout-state seam.
  Testing a separate toy integrator would not qualify that production path.
- Prometheus flight comparison is blocked: CSV does not establish the proposed
  14.5kg mass, 24/120-inch recovery configuration, Cd, atmospheric inputs or
  measurement uncertainty. The earlier 15% band is unaccepted. Its CSV version
  field does not establish hardware revision. Dataset discovery is not a
  matched-input flight-validation case.
- Juno metadata records drogue-only ejection, not nominal dual deployment. Its
  four stored files have separate byte hashes. No inferred sensor uncertainty
  or pressure-disturbance duration is accepted.
- Version-pinned actual OpenRocket execution is a separate lane; source
  inspection is not a simulator run. Task-local runtimes may be used without
  a global Java installation.
- Actual Windows/Mac workflows still require OS interaction; hosted desktop
  sessions can provide it. Intel execution is distinct from arm64 launch. No
  bare-metal or physical-inkjet requirement is added.
- The 10-15 participant protocol concerns observed app use with users' plans;
  launches are not required for usability evidence. Physical flight/load claims
  need separate measured inputs, observations and uncertainty.

No author self-acceptance, canonical case promotion, independent engineering
acceptance or general flight-accuracy claim is made by this packet.
