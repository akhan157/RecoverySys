# Universal Rocketry Exchange

**Status:** DRAFT — Office Hours design
**Project:** RecoverySys
**Branch:** `main`
**Date:** 2026-08-14

## Problem Statement

Individual rocketeers often keep the vehicle design in one specialist tool and the
motor/thrust model in another. RecoverySys then requires manual re-entry of
recovery-relevant vehicle specifications before it can perform recovery planning.
That transcription creates avoidable unit, revision, and interpretation errors.

The desired first outcome is a local, reviewed import of physical vehicle data
from an OpenRocket project into RecoverySys. The user should be able to bring in
relevant values without retyping them, while still seeing what each value means,
where it came from, and which values need judgment.

This is not a request for RecoverySys to replace OpenRocket's vehicle-design or
ascent model, or OpenMotor's internal-ballistics model. It is a coordination
boundary between specialist tools.

## Demand Evidence

The idea came from the product owner while considering data exchange with popular
rocketry tools. The first audience identified was an individual rocketeer. The
clearest desired benefit was importing rocket physical specifications instead of
entering them manually. No external user interviews, usage metrics, or accepted
interop corpus exists yet; usefulness remains a hypothesis to test with real
`.ork` files and rocketeers.

## Product Thesis

RecoverySys should become a **recovery-focused exchange coordinator**, not a
universal simulator or automatic synchronizer.

- OpenRocket remains the source for vehicle-design values and its own ascent
  simulation.
- OpenMotor or another RASP producer remains the source for motor/thrust-curve
  data. RecoverySys already supports local `.eng` import.
- RecoverySys owns recovery inputs, compatibility findings, recovery analysis,
  recovery brief generation, and the interpretation of its own model outputs.
- Imported values are snapshots with provenance, not live links or silent
  overwrites.

“Universal” describes the adapter contract and future direction. The first
visible adapter is OpenRocket only.

## Landscape Findings

The current ecosystem is connected by point-to-point adapters and a few shared
data formats, not by one neutral master project format.

| Tool or source | Primary role | Useful boundary for RecoverySys | Interoperability constraint |
| --- | --- | --- | --- |
| OpenRocket | Vehicle design and ascent simulation | Vehicle identity, mass and geometry candidates, later external ascent references | `.ork` is a ZIP container with `rocket.ork` XML and may include embedded `thrustcurves/*.rse`; it is not a lossless universal vehicle model |
| RockSim | Vehicle design and simulation | A future design-source adapter if real users depend on it | `.rkt` is a bridge format, but field semantics vary by consumer |
| RASAero II | Aerodynamic and flight analysis | Later external aerodynamic/trajectory references or CSV observations | Its documented RockSim import emphasizes the outer mold line and excludes internal components |
| RocketPy | Python 6-DOF trajectory and descent simulation | Later high-fidelity external trajectory/descent references | The existing `RocketSerializer` bridge requires Python/Java/OpenRocket tooling and documents limited `.ork` coverage |
| OpenMotor | Internal motor ballistics | Motor metadata or a generated thrust-curve source | Native `.ric` is tool-specific; `.eng` is the practical shared output and is already supported |
| RASP `.eng` | Motor thrust-curve interchange | Direct motor input to RecoverySys | Shared format, but curve identity, metadata, and source still need provenance |

The practical implication is that “universal rocketry” should mean a stable
RecoverySys exchange boundary with source-specific adapters. It should not mean
one parser that claims all tools share the same vehicle, motor, or physics
semantics.

OpenRocket's archive structure makes a single-file import richer than a
vehicle-only import: the archive may carry the selected design, saved simulation
data, and embedded motor metadata/curves. The first adapter should inspect and
record those as separate source artifacts, not flatten them into one ambiguous
RecoverySys value. In particular, an embedded `.rse` motor curve is not the same
contract as the existing RASP `.eng` path.

When simulation data is saved, the archive may also carry top-level results such
as maximum altitude, maximum velocity, time to apogee, flight time, and
deployment velocity, plus typed flight-data branches and events. These are
optional external-reference candidates: they must retain the exact simulation
configuration, motor selection, source version, and saved-data identity. They
must not silently become RecoverySys inputs or results.

The landscape also confirms the authority split:

- design tools own design representations;
- motor tools own internal-ballistics outputs;
- aerodynamic/trajectory tools own their model outputs;
- RecoverySys owns recovery planning, compatibility interpretation, and its own
  current/stale/evidence state.

### Adapter priority hypothesis

This is a technical/product-priority hypothesis, not an authoritative usage
ranking; no public community survey established a reliable popularity order.

1. **OpenRocket vehicle snapshot:** highest immediate value because it supplies
   design inputs and optional saved results in one local archive.
2. **RASP `.eng` and OpenMotor context:** already the strongest shared motor
   boundary; preserve the existing `.eng` path and add native `.ric` only if
   motor-design provenance becomes a real user need.
3. **RockSim `.rkt`:** likely the next design-source adapter if target users use
   RockSim; expect conversion-specific semantics rather than assuming `.rkt` is
   a universal model.
4. **RASAero II references:** useful for high-speed aerodynamic/trajectory
   comparisons and exported tabular data, but not a recovery-hardware source.
5. **RocketPy references:** potentially valuable for high-fidelity trajectory and
   descent comparisons, but its Python/Java bridge and model identity make it a
   later integration, not a first browser-native adapter.

Sources:

- OpenRocket third-party compatibility: <https://wiki.openrocket.info/Third-Party_Compatibility>
- OpenRocket file specification/source: <https://openrocket.readthedocs.io/en/latest/dev_guide/file_specification.html>
- OpenRocket archive writer: <https://github.com/openrocket/openrocket/blob/unstable/core/src/main/java/info/openrocket/core/file/GeneralRocketSaver.java>
- OpenRocket embedded motor writer: <https://github.com/openrocket/openrocket/blob/unstable/core/src/main/java/info/openrocket/core/file/motor/RockSimMotorWriter.java>
- OpenRocket saver and saved-flight-data implementation: <https://github.com/openrocket/openrocket/blob/unstable/core/src/main/java/info/openrocket/core/file/openrocket/OpenRocketSaver.java>
- OpenRocket supported file-version list: <https://github.com/openrocket/openrocket/blob/unstable/core/src/main/java/info/openrocket/core/file/openrocket/importt/DocumentConfig.java>
- OpenRocket mass and flight-data type definitions: <https://github.com/openrocket/openrocket/blob/unstable/core/src/main/java/info/openrocket/core/simulation/FlightDataType.java>
- OpenRocket example `.ork` fixture: <https://github.com/openrocket/openrocket/blob/unstable/core/src/main/resources/datafiles/examples/A%20simple%20model%20rocket.ork>
- RASAero II import and output notes: <https://www.rasaero.com/dl_software_ii.htm>
- RocketPy documentation: <https://docs.rocketpy.org/en/latest/>
- RocketSerializer: <https://github.com/RocketPy-Team/RocketSerializer>
- OpenMotor: <https://github.com/reilleya/openMotor>
- RASP format: <https://www.thrustcurve.org/info/raspformat.html>

## Agreed Premises

1. The first measurable win is eliminating manual recovery-spec entry.
2. The first transfer is one-way: OpenRocket project to RecoverySys snapshot.
3. Ambiguous mass and geometry are candidates requiring confirmation, not facts
   inferred from plausible-looking XML.
4. Every accepted value carries units, source identity, mapping status, and an
   explicit semantic meaning.
5. RecoverySys does not silently replace existing plan values or simulation
   outputs.
6. Future tools may implement the same exchange contract, but broad support is
   deferred until the OpenRocket workflow proves useful.
7. Cross-tool disagreements remain visible as side-by-side references with
   source/model identity and deltas; the adapter never averages or silently
   selects a winner.
8. The first mass proposal is a configuration-specific saved pre-launch (`t=0`)
   candidate; component-derived or semantically incomplete mass remains review
   context.
9. Recovery-bay mapping presents plausible tube candidates for user selection;
   it never chooses a largest tube or usable volume automatically.
10. Saved external results are limited initially to compact summaries and event
    markers; typed flight-data branches are reported but not imported.
11. The first accepted snapshot selects one stage and configuration. Multi-stage
    inspection is retained as source context, with multi-stage snapshots planned
    as a later expansion.

## Constraints

- **Local-first:** a user-selected `.ork` file is parsed locally; the source file
  is not uploaded to a service.
- **Fail closed:** malformed XML, unsupported versions, ambiguous selections, and
  non-finite values produce an actionable import state rather than partial
  silent application.
- **No false precision:** nominal tube geometry is not presented as usable
  recovery-bay volume without user confirmation.
- **No semantic guessing:** mass inclusion (motor, payload, recovery hardware,
  stage) must be visible. Unknown inclusion semantics remain candidates or are
  excluded.
- **No replacement authority:** imported OpenRocket apogee or recovery outputs,
  if supported later, remain labeled external references and do not become the
  RecoverySys result.
- **Security:** the XML parser treats local files as untrusted input, enforces
  size and structural limits, and does not resolve external entities or fetch
  network resources.
- **Support is explicit:** the adapter declares the OpenRocket format/version
  range it supports and records the source version when available.
- **Optional archive content:** missing saved simulations or embedded motor
  metadata must not block vehicle candidates; the preview reports those artifacts
  as unavailable rather than requiring a richer `.ork` file.

## Exchange Contract

The contract is a versioned, tool-neutral envelope. It is an internal RecoverySys
contract first; publishing it for community adoption is a later decision.

### Envelope

```text
RecoveryExchangeEnvelope
  contractVersion
  project
  source
  vehicleCandidates[]
  motorContext[]              optional, metadata-only in first adapter
  externalResults[]           optional, reference-only
  warnings[]
```

### Project and source identity

`project` identifies the imported snapshot:

- `name`
- `selectedConfiguration` — nullable until the user chooses one
- `selectedStage` — nullable for single-stage projects

`source` identifies where the snapshot came from without asserting that the
source tool has a trustworthy revision number:

- `sourceFilename`
- `sourceHash` — content hash of the imported file
- `importedAt`
- `sourceTool`
- `sourceToolVersion` — nullable when unavailable

The content hash is the stable source identity. The importer must not invent a
human revision label that the source file does not contain.

The first adapter may inspect multi-stage projects, but an accepted snapshot
requires exactly one selected stage and configuration for stage-dependent
values. It must preserve sibling-stage identity as source context rather than
flattening stages into one ambiguous vehicle. The exchange envelope should leave
room for a later multi-stage RecoverySys snapshot workflow.

### Vehicle candidates

Each candidate has both the source representation and the proposed RecoverySys
value:

- `targetField` — the RecoverySys field, if one is proposed;
- `sourcePath` — the OpenRocket component/property path;
- `sourceValue` and `sourceUnit`;
- `normalizedValue` and `normalizedUnit`;
- `semantic` — what the value includes or represents;
- `status` — `mapped`, `needs-confirmation`, `unavailable`, or `excluded`;
- `reason` — required when status is not `mapped`;
- `confidence` — a mapping confidence label, never a statistical safety claim.

The first target fields are limited to values that RecoverySys currently uses or
needs for recovery planning:

- total rocket mass, with explicit inclusion semantics;
- nominal airframe/recovery-bay inner diameter candidates;
- nominal tube or candidate-bay length;
- optional airframe name and overall vehicle length as identity/context.

`usableBayLength` and `bayObstructionVolume` must not be inferred from nominal
OpenRocket component dimensions. The user may confirm or edit them in the
review step.

Mass requires stricter handling than geometry. OpenRocket may persist
component-level mass overrides and saved flight-data series such as `mass` and
`motor_mass`, but it does not guarantee a single whole-vehicle value with
RecoverySys's required inclusion semantics. A time-series mass is a candidate
only when the selected configuration, branch, and reference time are known;
otherwise the adapter reports it as ambiguous or unavailable.

For the first adapter, the preferred reference is the saved mass at pre-launch
(`t=0`) for the selected configuration and motor assignment. If those
identities or an aligned time/mass pair are not explicit, the value remains
`needs-confirmation` or `unavailable` rather than being applied to
`rocket_mass_g`.

Body-tube inner diameter is also a derived candidate: the source stores outer
radius and wall thickness, so the adapter may calculate an inner diameter only
when both values are valid and the component is a plausible tube candidate.
That still does not establish usable recovery-bay length or obstruction volume.

The parser must preserve automatic and filled modes instead of applying a
generic numeric coercion. OpenRocket can encode a radius as `auto <number>` and
wall thickness as `filled`; an automatic radius is a nominal derived candidate
that requires confirmation, while a filled component cannot produce an inner
diameter from wall-thickness subtraction. Raw source values remain visible in
the preview.

The first adapter lists plausible body-tube candidates for recovery-bay
selection. It must not choose the largest tube automatically or infer a bay from
component order, because payload, motor, structural, and recovery tubes can all
appear in the same hierarchy.

### Motor context

`motorContext[]` records embedded motor identity without making the first
adapter a second thrust-curve engine:

- manufacturer and designation;
- diameter, length, delays, and source archive path;
- source digest or other motor identity when available;
- whether an embedded curve is present;
- `metadata-only` status.

The first adapter does not convert embedded `.rse` curves into the existing
RecoverySys `.eng` path.

### External results

The envelope carries optional reference-only results such as OpenRocket apogee,
maximum velocity, or deployment events. Such records require:

- source tool and version;
- source simulation configuration and motor selection;
- result timestamp/import timestamp;
- model identity where available;
- units and assumptions;
- an explicit `external-reference` status.

The first adapter may present saved external results beside RecoverySys results,
but never feeds them into RecoverySys calculations or labels them as RecoverySys
results.

The first adapter imports compact simulation summaries and event markers only:
for example maximum altitude, maximum velocity, time to apogee, flight time,
deployment-related events, simulator/calculator identity, and the selected
configuration. Typed flight-data branches and datapoints are not imported in
this version; the preview reports their presence and omission explicitly.

### Cross-tool comparison

When an external result and a RecoverySys result describe the same intended
quantity, the plan shows both values, units, source/model identity,
configuration, and a calculated delta where comparison is valid. It does not
average, silently choose, or declare one simulator universally correct. An
unresolved mismatch remains visible as review context.


## Adapter Contract

Each tool adapter must expose the same conceptual operations:

1. **Detect:** identify the source format and supported version range.
2. **Parse:** read the local source into candidates without applying them.
3. **Normalize:** convert units and names into the exchange envelope.
4. **Classify:** mark each candidate as mapped, needs confirmation, unavailable,
   or excluded, with a reason.
5. **Validate:** reject malformed, non-finite, contradictory, or unsupported data.

An adapter must not perform RecoverySys calculations, silently choose a stage or
bay, overwrite a plan, or claim that an external result is a RecoverySys result.

## First Adapter: OpenRocket

### Included

- local `.ork` file selection and archive-member inspection;
- format/version detection;
- first-release OpenRocket file versions `1.10` and `1.11`;
- rocket name and source identity;
- selected configuration and stage candidates;
- conditional saved pre-launch-mass candidates with inclusion context;
- airframe and tube geometry candidates;
- embedded motor metadata and source identity, without curve conversion;
- saved OpenRocket summary/event reference candidates;
- unit normalization into the RecoverySys schema;
- a reviewed import preview;
- side-by-side display of accepted external results and RecoverySys results;
- creation of a new RecoverySys vehicle snapshot after acceptance;
- mapping diagnostics and source provenance.

### Excluded from the first adapter

- automatic live synchronization;
- export back to `.ork`;
- automatic refresh when the file changes;
- automatic usable-bay inference;
- automatic mapping of every OpenRocket component to a RecoverySys catalog part;
- conversion of embedded `.rse` curves into RecoverySys motor calculations;
- use of OpenRocket results as RecoverySys calculation inputs or results;
- importing full typed flight-data branches or datapoints;
- flattening a multi-stage project into one RecoverySys snapshot;
- batch import;
- importing OpenRocket versions outside `1.10` and `1.11` before fixture review;

OpenRocket component names may be retained as source context, but catalog-part
selection remains a RecoverySys/user decision unless a mapping is unambiguous
and separately verified.

## User Flow

1. User chooses **Import vehicle snapshot** and selects a local `.ork` file.
2. RecoverySys inspects the archive and reports the source tool/version, rocket
   name, configuration/stage candidates, embedded motor metadata, saved simulation
   data, and unsupported conditions.
3. A compact preview table shows each vehicle candidate's source path, source
   value/unit, normalized RecoverySys value/unit, semantic meaning, and status.
4. The preview separately shows motor metadata and saved OpenRocket results as
   reference artifacts, never as RecoverySys values.
5. The user chooses exactly one intended configuration and stage, chooses the
   recovery-bay candidate, confirms mass inclusion, and supplies or edits usable
   geometry where the file cannot establish it.
6. The user accepts selected candidates. RecoverySys creates a new vehicle
   snapshot rather than overwriting an existing plan.
7. RecoverySys marks any affected simulation as needing a fresh run, then shows
   accepted OpenRocket references beside RecoverySys results with source/model
   identity visible.
8. The user reviews RecoverySys findings and estimates under the normal current,
   stale, evidence, and unresolved-check rules.

## Approaches Considered

### Approach A: Targeted OpenRocket importer

Parse `.ork`, map recovery-relevant candidates, and defer a shared contract until
more tools are requested. This is the fastest experiment but risks creating a
one-off importer that does not establish the universal boundary.

### Approach B: Versioned exchange contract plus OpenRocket adapter

Define the neutral envelope and adapter behavior now, but ship only the
OpenRocket adapter first. This preserves future multi-tool expansion while
keeping the initial user-visible scope narrow.

### Approach C: External conversion pipeline

Use a local CLI or sidecar to convert `.ork`, `.rkt`, and future formats into
normalized JSON consumed by RecoverySys. This could broaden format coverage but
adds distribution, lifecycle, security, and desktop-integration complexity.

## Recommended Approach

Use **Approach B**. Implement the contract as a stable internal boundary and
build the OpenRocket adapter as the first producer. Keep the current `.eng`
parser as a separate motor/thrust producer rather than forcing fundamentally
different source types into one file parser.

The contract should be implemented only far enough to support the reviewed
OpenRocket snapshot flow. Do not build a generic adapter SDK, live sync engine,
community standard, or multi-tool conversion service until the first workflow
shows repeated value.

## Success Criteria

The first experiment should be evaluated against real inputs, not only synthetic
fixtures:

The checked-in implementation baseline currently contains six provenance-
recorded fixtures: five upstream `1.10` examples and one `1.11` archive produced
by the pinned OpenRocket unstable saver. This is enough to begin parser
development, but it does not satisfy the real-input or observed-workflow
release gates above.

- 25–40 real `.ork` files covering single-stage snapshots, multi-stage source
  context, mass overrides, multiple motor configurations, and unusual component
  layouts;
- at least 10–15 target rocketeers or equivalent observed workflows;
- at least 90% of supported-version files produce a useful preview;
- no unnoticed motor, recovery-hardware, payload, or stage mass double-counting;
- ambiguous mass and geometry are never silently accepted;
- at least 80% of proposed mapped fields are accepted without correction;
- median setup time is reduced by at least 50%, or by a meaningful 3–5 minutes;
- at least 70% of test users prefer the import flow for their next vehicle.

A kill signal is a median saving below two minutes, repeated requests for live
sync before the snapshot flow is useful, or frequent manual interpretation of
mass and bay semantics that makes the importer look more authoritative than it
is.

## Risks

- **Wrong-but-plausible mass:** expose inclusion semantics and require confirmation.
- **Nominal geometry mistaken for usable volume:** keep usable dimensions user-set
  until a trustworthy mapping exists.
- **Source staleness:** display filename, hash, and import time; later reimport
  must produce a diff, not an overwrite.
- **Format drift:** maintain versioned fixtures and fail closed on unknown
  semantics.
- **Weak product pull:** measure repeated use and time saved; do not infer demand
  from technical feasibility.
- **Positioning drift:** call the first feature an OpenRocket vehicle snapshot
  importer, not universal synchronization.

## Open Questions

1. Which OpenRocket versions and `.ork` variants should the first adapter support?
2. How does a real `.ork` represent selected stages, motor configurations, mass
   overrides, and recovery components in the versions users actually have?
3. Which mass semantic can RecoverySys safely consume automatically, if any?
4. Should the first preview show candidate bay components or only vehicle-level
   physical specs?
5. What exact RecoverySys fields are required to run a useful recovery plan, and
   which can remain user-entered?
6. Should source XML be retained only as a hash/metadata record, or should a
   bounded sanitized subset be stored for later inspection?
7. Which future tool is the next adapter after OpenRocket, and does it produce a
   stable interchange format or require another parser?

## Distribution Plan

The feature belongs in the existing local-first web/Tauri application. It uses a
browser file picker for `.ork` input and does not require a hosted backend. The
exchange envelope remains an internal versioned contract until real adapter
consumers justify publication.

## External References

- OpenRocket file specification/source: \
  <https://openrocket.readthedocs.io/en/latest/dev_guide/file_specification.html>
- OpenRocket project: <https://github.com/openrocket/openrocket>
- RASP thrust-curve format: <https://www.thrustcurve.org/info/raspformat.html>

## Concrete Next Action

Collect 3–5 real OpenRocket `.ork` projects representing the intended workflow.
For each, record the physical values currently entered manually in RecoverySys,
what those values include, and which recovery-bay dimensions require human
judgment. Use that corpus to validate whether the proposed exchange contract is
actually useful before implementing the adapter.
