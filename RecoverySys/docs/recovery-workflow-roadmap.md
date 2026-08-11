# Recovery workflow roadmap

Future-only backlog for turning current estimates into a clearer recovery
planning workflow. Confidence, evidence-coverage, mission-envelope, and stale
result foundations now exist in code, but this document does not claim accepted
validation or complete cross-artifact production capability.


## Phase 0 — foundation (highest priority)

- **Research/design complete:** define shared vocabulary, evidence/provenance posture, stale-result dependency, and review boundaries.
- Create a case corpus and review process using analytic, trusted-simulator, metamorphic, and eventually real-flight evidence.
- **Dependency:** the implemented confidence/stale foundation must be extended
  with accepted evidence, broader corpus coverage, and cross-artifact parity.
- **Not yet validated production capability:** no accepted cases or real-flight cases are present.

## Phase 1 — mission envelope

- Define required inputs and visible assumptions for motor, mass, geometry, weather, deployment altitude, and landing area.
- Add envelope review for out-of-scope or high-sensitivity conditions, without changing existing simulation result contracts.
- **Dependency:** current model limitations plus reviewed comparison cases.
- **Research/design complete:** workflow scope only. **Validated production capability:** no.

## Phase 2 — hardware fit and deployment plan

- Make packing, component compatibility, redundancy, deployment sequence, and checklist review explicit.
- Link each warning to the relevant user input, catalog provenance, or manufacturer documentation.
- **Dependency:** preserve compatibility and parts contracts; require reviewed hardware assumptions and human review.
- **Research/design complete:** intended workflow boundary. **Validated production capability:** no.

## Phase 3 — loads and drift

- Compare shock-load, landing-energy, descent, wind, and dispersion outputs against documented references and sensitivity cases.
- Present assumptions, influential variables, and insufficient-confidence outcomes rather than false precision.
- **Dependency:** corpus cases, model identity, and stale-result behavior; no universal tolerance or accuracy claim.
- **Research/design complete:** target evidence categories. **Validated production capability:** no.

## Phase 4 — recovery brief

- Produce a reviewable brief covering mission envelope, hardware fit, deployment plan, loads, drift, assumptions, evidence, and unresolved checks.
- Support print/share/export without changing existing persistence or result contracts until separately designed and reviewed.
- **Dependency:** Phases 1–3, accessible labeling, and explicit user/engineering/range sign-off boundaries.
- **Research/design complete:** brief contents. **Validated production capability:** no.

## Exit posture

No phase authorizes a launch or establishes certification. Future implementation must retain current contracts, document migrations if contracts eventually change, and distinguish research/design completion from evidence-backed production capability.
