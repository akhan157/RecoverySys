# OpenRocket reference comparison

This is a diagnostic comparison of public RecoverySys APIs with an executed
OpenRocket 23.09 engine. It supplies no flight accuracy acceptance or engineering
sign-off. Parent review and exact evidence identities are recorded in
`../../docs/history/online-validation-2026-11-05/`.

The controlled case uses baseline Cd 0.50; the native case uses OpenRocket's
component aerodynamics. Neither case fits inputs to the resulting trajectory.
Geometry, motor, mass, canopy dimensions and deployment altitude come from
`reference-vehicle.json`. Shared guards check redundant unit representations,
mass arithmetic and the separate motor file's curve. The supported fixture is
calm, vertical, sea-level ISA. The Java driver is a low-level component: use the
guarded reproduction runner to validate the whole two-engine configuration.

RecoverySys's `total_time_s` is descent only. Estimated launch-to-landing time
adds `apogee_t_s`; both are integer-rounded public values. OpenRocket's descent
and flight durations come from apogee and ground-hit events. Its apogee event
time can differ from the sampled maximum-altitude time. Public burnout time is
also integer-rounded; percentage differences do not measure integration error.

RecoverySys's descent uses launch mass and one altitude per phase. Its main
phase uses the main alone. OpenRocket's motor mass depletes and both deployed
canopies remain present after main deployment. These are different descent
models. Supplemental dry-mass sea-level calculations use summed Cd-area to
probe that difference; they do not replace the public simulation outputs.
The diagnostic aggregate diameter is weighted by each canopy's Cd.

OpenRocket properties with legacy `terminal_velocity` names contain samples
immediately before main deployment or landing. The runner records their actual
sample times/altitudes. It does not prove terminal equilibrium. Event CSVs
preserve deployment times and device names; deployment altitude fields are
nearby trajectory samples, not exact interpolated event heights. Nominal launch
mass differs slightly from the first available trajectory mass sample.

The original report's 48 s versus 61.23 s flight comparison used different
clocks and is withdrawn. The corrected fixture gives approximately 48 s versus
51 s descent and 58 s versus 61 s estimated flight in the controlled case.
Rounded public apogee differs from controlled OpenRocket by about 0.06 m, and
from native OpenRocket by about 17 m. These are fixture observations, not exact
parity or an acceptance tolerance. Remaining differences have several possible
causes; this run does not isolate a causal contribution for each one.

Each run writes fresh raw JSON, CSV, events, controls, metadata and logs outside
git. Read the generated comparison for exact numbers. The JAR hash records
observed bytes, not an upstream-published digest. Runtime download verification
and motor redistribution rights remain unestablished. No production physics,
catalog values, corpus acceptance or release gate is changed.
