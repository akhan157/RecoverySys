# Physics research review and amended implementation scope

Author: Antigravity Gemini 3.8 Flash high. Research pin:
`96d4252fe4fe07062982c5d68c56b141660b78f9`, base `fe96b89`.
Reviewer: Codex gpt-6.1-sol high (different family). Research merged for
revision/history retention; no case/model/physical acceptance is granted.

Useful evidence: the downloaded atmosphere, parachute manual, OpenRocket
documentation/motor file and Prometheus CSV exist and their recorded byte
hashes match. Juno metadata explicitly reports only drogue ejection. Raw data
discovery is useful; it does not establish a matched-input flight benchmark.

## Required corrections before execution

- Three source records put `primary-html-cached-in-session-brain` in SHA-256
  fields and refer to a nonexistent path. Capture actual bytes/hash or use
  null/explicitly uncaptured metadata. The Juno artifact refers to a directory
  while hashing a file; enumerate exact files. Pin mutable repository sources.
- Independent arithmetic falsifies the proposed 2500 m pressure: its own
  barometric formula gives approximately 74682.53 Pa, not 74691.56 Pa. Do not
  widen tolerance to absorb a wrong reference. Distinguish US1976 constants
  from other ISA/ICAO sets; 8314.32/28.9644 is about 287.053072, not 287.05287.
  Verify cited pages before attributing exact constants to the standard.
- Terminal 48-inch area from exact inch conversion is about 1.16745403 m²,
  speed about 30.374731 ft/s and energy about 214.286504 J under rho=1.225.
  Recompute references programmatically from declared inputs, without importing
  production functions as the oracle. Floating-point epsilon does not justify
  a 0.01% tolerance; document actual constant/conversion/rounding allowances.
- Geometric/geopotential density discrepancies and bounds in the design
  contradict one another. Use explicitly matched altitude coordinates; no
  unsupported physical accuracy tolerance. Sources do not state the proposed
  engineering comparison tolerances.
- Constant-density coast with arbitrary burnout state is not exposed by the
  production ascent API. Do not compare it to varying-density powered ascent
  or expose a new production seam in this increment. Retain as not executable
  against the current model, not PASS.
- Prometheus 14.5 kg / 24-inch / 120-inch inputs and sensor uncertainty claims
  lack provenance in the supplied CSV. A chosen ±15% band is not source-stated
  acceptance. Keep flight comparison blocked on configuration/environment and
  uncertainty evidence; no promotion or validation claim. Derived event-window
  summaries may be reported separately, with reproducible extraction and limits.
- The OS/user matrix invents extra gates: observed app workflows do not require
  rocket launches, bare-metal hosts or physical inkjet output. Accessible real
  OS sessions and the documented app trial protocol are sufficient for those
  specific observations. Do not add or waive gate requirements.
- Opening-force and material-specific coefficient claims need exact page/table
  citations and convention checks. Describe the current proxy as implemented;
  do not infer universal conservatism or alter physics to match a reference.

## Approved bounded implementation

Implement four independently calculated checks in the owned research directory:
2500 m matched-coordinate atmosphere; 48-inch nominal-area terminal descent;
constant wind from south; linear-elastic snatch proxy arithmetic. Correct and
schema-check proposal data. Adapter calls the actual public production APIs;
expected calculations live separately and do not import production code.
Add negative controls proving unit/sign/coefficient/reference corruption is
detected. Report all differences, preset bounds, basis, model identity and
scope; failures must exit nonzero. No silent skips, no tolerance increases
after observing engine output, and no expected values copied from that output.

Keep coast and flight explicitly excluded/blocked with reasons. Do not move
files into the production corpus, change its manifest/status, add dependencies,
alter production physics/thresholds, or close physical/manual evidence gates.
An independent OpenRocket execution lane may probe isolated user-local Java or
existing container/Xvfb capabilities; lack of a globally installed Java alone
does not prove simulator execution is unavailable. No global installations,
paid services or production engine switch are approved.

Parent will review and rerun results in the integrated primary checkout before
recording any bounded comparison acceptance. Author cannot self-accept.
