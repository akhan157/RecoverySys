# Online evidence register — 2026-11-05

Primary-source research supports this release's review packet. It does not
supply observed user trials, measured loads, independent reviewer acceptance,
or Windows/macOS manual qualification. Access date for every link below:
2026-11-05. Publication dates differ from access dates.

| Need | Primary source | Use and limit |
| --- | --- | --- |
| Terminal speed and ascent force balance | [NASA Glenn flight equations with drag](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/flight-equations-with-drag/) | Derive Cd scaling, fixed-case drag monotonicity and no-liftoff invariants; no vehicle-specific accuracy claim. |
| Atmosphere constants and layers | [U.S. Standard Atmosphere 1976](https://ntrs.nasa.gov/citations/19770009539) | Analytic 11 km reference; independent constant/height-convention review remains open. |
| Approximate atmospheric fits | [NASA Glenn metric atmosphere](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/earth-atmosphere-equation-metric/) | Confirms layered atmosphere and 11 km troposphere. Its educational curve-fit constants differ from ISA constants; do not treat the formulas as identical. |
| Wind direction | [NOAA NWS wind barbs](https://www.weather.gov/hfo/windbarbinfo) | Wind directions describe where wind comes from; cardinal drift cases check the opposite bearing and mph/ft/s conversion. No local weather or measured wind profile is supplied. |
| Separate simulator comparison route | [OpenRocket technical documentation](https://openrocket.info/documentation.html) | Identify versioned simulator assumptions and export an equivalent-input reference in future. Imported saved results remain external references; none is promoted as a benchmark here. |
| Manufacturer engineering data | [Catalog source packet](../validation/catalog-review/README.md) | Three product pages rechecked; six category records and fourteen field differences staged. Remaining candidates and identity decisions are open. Bulk feed rate-limited. |
| Runtime support | [Node Release Working Group](https://github.com/nodejs/Release) | Qualify maintained even-major lines 22, 24, 26; remove the unbounded future-major claim and Node 20. CI now defines the same three-major matrix. |
| Dependency advisory | [fast-uri advisory](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) | Advisory identifies fixed 3.1.9; lockfile updated from 3.1.8 to 3.1.9. Full and production npm audits report zero on this date. |

The seven new cases in corpus 0.3.0 are review-only. Atmospheric numerical
allowance (0.01%) covers constant/exponent differences; algebraic ratios allow
floating-point error (1e-12); rounded drift compares rounded feet; categorical
invariants use exact 0/1. Dispersion repeatability checks identical-seed output
and sample count only. It has an internal protocol citation and no independent
numerical or uncertainty reference. No new case claims field evidence.

Next data to collect: equivalent-input, versioned OpenRocket outputs; actual
canopy-area/Cd conventions; component rating conventions and exact variants;
measured descent/load records with uncertainty; per-part provenance; and
observed workflows on each release platform. Public design files with shared
lineage must not be counted as independent vehicles or trials.
