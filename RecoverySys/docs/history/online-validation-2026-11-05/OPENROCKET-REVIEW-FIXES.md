# Follow-up fixes for two review findings

Implementation and verified clean-source pin:
`63190097e2c25e4253f969efa747e38823180257`.
Author: Codex gpt-6.1-sol; these small follow-ups are author-verified.
No separate independent acceptance of the follow-up code is claimed.

- Comparisons now require the current manifest's byte hash to match metadata
  and both Java summaries. Motor hash, execution run ID, mode, simulator name,
  version and upstream commit must also match. Old unstamped summaries fail
  closed; preserved historical artifacts were not rewritten.
- OpenRocket's fin setter now receives sweep before height. The mutation
  control uses unequal values (0.12 m sweep, 0.08 m height) and checks actual
  OpenRocket component getters, so the original swap cannot hide behind the
  baseline's equal dimensions.
- Regression controls reject the heavier-manifest/old-summary case through
  `runComparison`, before it writes a report. They also reject mixed run IDs,
  swapped modes, changed motors and mismatched simulator identity.

Executed from the primary checkout with Java 17 selected through JAVA_HOME:
`./RecoverySys/validation/openrocket-reference-2026-11-05/test-runner.sh`.
Result: **21/21 controls passed**, both controlled-Cd and native-aero reference
executions completed, comparison completed, process exit 0. The baseline
fixture has equal fin sweep and height, so its numeric results remain unchanged.
All hashes listed in `output-hashes.txt` were independently recomputed and
matched after execution. Metadata records the above commit and a clean tree.

External evidence directory, relative to the primary git root:
`../RecoverySys-artifacts/online-validation-2026-11-05/openrocket/run-jdYMFJ/`.

| File | SHA-256 |
| --- | --- |
| comparison-results.json | 562e9357139f166f91bb5d9fe38d5b604accf7bdc20d97e426099a7438f2b9db |
| reproduction-manifest.json | 4eaf99e5a59f6894ed2554a299f909793e8d541237de66a4b677c4c31f349449 |
| execution.log | 06b967bb4773f3b4974f90bd64a6a280d8704a5e6031d9dcacfd2c1263204e0c |
| output-hashes.txt | 47385367d5b22b8a830ceee4d20a25f66b115a93dea1a94279241adf6d94b663 |

Scope remains diagnostic comparison only. No production app physics/catalog,
dependency, canonical corpus or release gate was changed. No push or release.
