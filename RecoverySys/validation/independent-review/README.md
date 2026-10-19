# Independent analytic review packet

Regenerate with `python3 scripts/physics-reference.py`. The standalone calculator
imports no application model code. It uses the documented drag-force balance,
ideal-gas troposphere relation and exact international inch/foot conversions.
It is a reproducible reviewer aid, not independent experimental validation.

The 2026-10-19 output finds three numerical differences beyond the recorded
regression tolerances, approximately 0.0009–0.0021%. The reference uses
R=287.05287 and an exponent derived from g/(R L); production uses R=287.058 and
5.2559. Exact ft/m conversion also differs slightly from the rounded production
constant. Rounded landing energy agrees. These tiny differences illustrate why
an analyst-derived 1e-9 tolerance must not be treated as measurement accuracy.

Reviewer tasks:
1. Check source constants, equations, area convention, units and altitude domain.
2. Decide a justified numerical-comparison tolerance separately from uncertainty
   in Cd, mass, actual deployment and atmospheric conditions.
3. Record reviewer identity, date, artifact version and decision in the corpus
   provenance before accepting any comparison case.
4. Add independent measured descent/load/flight evidence with uncertainty and
   permissions. Do not treat related OpenRocket files as physics observations.

No acceptance, simulation change or Python runtime dependency is introduced.
The browser engine remains authoritative; this script is offline review tooling.
