# OpenRocket 23.09 reference runner

Executes the actual pinned OpenRocket engine and public RecoverySys APIs for
one diagnostic fixture. See [COMPARISON.md](COMPARISON.md) for model and clock
differences. No engineering acceptance is implied.

Prerequisites: Linux, Node, Java 17/Javac, `xvfb-run`, and at least 2 GiB
available memory. Place official `OpenRocket-23.09.jar` and captured
`I200W.eng` under the primary-root-relative sibling path
`../RecoverySys-artifacts/online-validation-2026-11-05/openrocket/`, or set
`ARTIFACTS_DIR`. Expected observed hashes and provenance limits are in
[sources.json](sources.json). No automatic installation is performed.

From the repository root (set JAVA_HOME to your Java 17 installation):

```bash
./RecoverySys/validation/openrocket-reference-2026-11-05/test-runner.sh
```

The script also works by absolute path from other working directories.
`JAVA_BIN` and `JAVAC_BIN` can override the executables. Each invocation creates
a new `run-*` directory under the external artifact directory; `RUNS_DIR` can
select another parent. Existing output directories are never reused by the
runner. Comparison-only invocation refuses to overwrite its JSON output.
Comparison also requires matching manifest/motor hashes, run IDs and simulator
modes from the run metadata and both Java summaries. Earlier unstamped runs
remain historical artifacts and must be rerun for use with this comparator.

The runner verifies assets and shared manifest consistency, serializes runtime
and clean/dirty source metadata, compiles with a 512 MiB heap and two processors,
runs controls and both simulations, then compares their outputs. Controls
exercise the same checksum routine as the runner, negative inputs, Java manifest
mutation, unit/configuration inconsistencies and malformed summary numbers.
Java processes use Xvfb through `xvfb-run`; they are synchronous and exit on
completion. Raw run outputs and retained mutation fixtures remain outside git.

Guard numerical consistency bounds check arithmetic and serialized unit
conversion only. They do not set physics agreement tolerances. Standalone Java
driver use bypasses the runner's complete cross-engine manifest guards.
