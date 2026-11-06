#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================================="
echo "OpenRocket Reference Validation - Corrected Reproduction Runner"
echo "Working directory: $SCRIPT_DIR"
echo "=================================================================="

# 1. Derive Primary Git Root and Shared Raw Artifacts Directory
COMMON_DIR="$(git rev-parse --git-common-dir)"
PRIMARY_ROOT="$(cd "$COMMON_DIR/.." && pwd)"
SHARED_ARTIFACTS_DIR="${ARTIFACTS_DIR:-$(cd "$PRIMARY_ROOT/.." && pwd)/RecoverySys-artifacts/online-validation-2026-11-05/openrocket}"

echo "Primary Git Root:    $PRIMARY_ROOT"
echo "Shared Artifacts:    $SHARED_ARTIFACTS_DIR"

# 2. Resource Gate: Check Available Memory (Free >= 2 GiB)
echo -n "Checking system available memory... "
AVAIL_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
AVAIL_GIB=$(awk "BEGIN {printf \"%.2f\", $AVAIL_KB / 1024 / 1024}")
echo "${AVAIL_GIB} GiB available."

if [ "$AVAIL_KB" -lt 2097152 ]; then
  echo "ERROR: Available memory is below 2 GiB threshold (${AVAIL_GIB} GiB). Aborting per assignment limits." >&2
  exit 1
fi

# 3. Locate and Verify Java 17 Runtime (Configurable, no hardcoded hostpaths)
JAVA_BIN="${JAVA_BIN:-${JAVA_HOME:+$JAVA_HOME/bin/java}}"
JAVA_BIN="${JAVA_BIN:-java}"
JAVAC_BIN="${JAVAC_BIN:-${JAVA_HOME:+$JAVA_HOME/bin/javac}}"
JAVAC_BIN="${JAVAC_BIN:-javac}"

if ! command -v "$JAVA_BIN" >/dev/null 2>&1; then
  echo "ERROR: Java binary not found at '$JAVA_BIN'. Please set JAVA_HOME or JAVA_BIN." >&2
  exit 1
fi
if ! command -v "$JAVAC_BIN" >/dev/null 2>&1; then
  echo "ERROR: Java compiler not found at '$JAVAC_BIN'. Please set JAVA_HOME or JAVAC_BIN." >&2
  exit 1
fi

JAVA_VERSION_STR="$("$JAVA_BIN" -version 2>&1 | head -n 1)"
echo "Using Java runtime:  $JAVA_VERSION_STR"

# 4. Verify Shared Input Assets and Hashes
OR_JAR="$SHARED_ARTIFACTS_DIR/OpenRocket-23.09.jar"
MOTOR_ENG="$SHARED_ARTIFACTS_DIR/I200W.eng"
EXPECTED_JAR_SHA="65cc0ab68a536fc33fc02a84c416725523a82745e100356efd9ff890b43bfcd0"
EXPECTED_MOTOR_SHA="927f60b020cc4f7181925871578319a2e5ddc0500e05c4c124cc709bdd419781"

if [ ! -f "$OR_JAR" ]; then
  echo "ERROR: OpenRocket 23.09 JAR not found at $OR_JAR" >&2
  exit 1
fi
node "$SCRIPT_DIR/guards.mjs" asset "$OR_JAR" "$EXPECTED_JAR_SHA"
node "$SCRIPT_DIR/guards.mjs" asset "$MOTOR_ENG" "$EXPECTED_MOTOR_SHA"
node "$SCRIPT_DIR/guards.mjs" manifest "$SCRIPT_DIR/reference-vehicle.json" "$MOTOR_ENG"
ACTUAL_JAR_SHA="$EXPECTED_JAR_SHA"
ACTUAL_MOTOR_SHA="$EXPECTED_MOTOR_SHA"
echo "Verified inputs:     JAR SHA-256: ${ACTUAL_JAR_SHA:0:16}... Motor SHA-256: ${ACTUAL_MOTOR_SHA:0:16}..."

# 5. Create Unique External Run Directory (Never overwrite initial or shared evidence)
mkdir -p "${RUNS_DIR:-$SHARED_ARTIFACTS_DIR}"
RUN_DIR="$(mktemp -d "${RUNS_DIR:-$SHARED_ARTIFACTS_DIR}/run-XXXXXX")"
exec > >(tee "$RUN_DIR/execution.log") 2>&1
CLASSES_DIR="$RUN_DIR/classes"
mkdir -p "$CLASSES_DIR"
echo "External Run Dir:    $RUN_DIR"

# 6. Serialize metadata with a JSON encoder (runtime strings contain quotes).
JAVA_BIN="$JAVA_BIN" node "$SCRIPT_DIR/metadata.mjs" "$RUN_DIR" "$OR_JAR" "$MOTOR_ENG"

# 7. Compile OpenRocketDriver into isolated classes directory (max 2 jobs, -Xmx512m)
echo -n "Compiling OpenRocketDriver.java... "
"$JAVAC_BIN" -J-Xmx512m -J-XX:ActiveProcessorCount=2 -cp "$OR_JAR" -d "$CLASSES_DIR" "$SCRIPT_DIR/OpenRocketDriver.java"
echo "Done."

# 8. Execute Comprehensive Controls Suite
echo -e "\n--- Executing Controls & Invariant Checks ---"
JAVA_BIN="$JAVA_BIN" JAVAC_BIN="$JAVAC_BIN" ARTIFACTS_DIR="$SHARED_ARTIFACTS_DIR" CONTROLS_DIR="$RUN_DIR" \
  node --test --test-concurrency=2 "$SCRIPT_DIR/controls.test.mjs"

# 9. Execute Run 1: Controlled Cd = 0.50
echo -e "\n--- Executing OpenRocket Run 1: Controlled Cd = 0.50 ---"
xvfb-run -a "$JAVA_BIN" -Xmx512m -XX:ActiveProcessorCount=2 \
  -cp "$CLASSES_DIR:$OR_JAR" \
  OpenRocketDriver \
  --manifest "$SCRIPT_DIR/reference-vehicle.json" \
  --motor "$MOTOR_ENG" \
  --artifacts-dir "$RUN_DIR" \
  --mode "controlled_cd" \
  --output-prefix "or-reference-controlled-cd"

# 10. Execute Run 2: Native Barrowman Aerodynamics
echo -e "\n--- Executing OpenRocket Run 2: Native Barrowman Aerodynamics ---"
xvfb-run -a "$JAVA_BIN" -Xmx512m -XX:ActiveProcessorCount=2 \
  -cp "$CLASSES_DIR:$OR_JAR" \
  OpenRocketDriver \
  --manifest "$SCRIPT_DIR/reference-vehicle.json" \
  --motor "$MOTOR_ENG" \
  --artifacts-dir "$RUN_DIR" \
  --mode "native_aero" \
  --output-prefix "or-reference-native-aero"

# 11. Execute Comparison Analysis with RecoverySys Public APIs
echo -e "\n--- Executing RecoverySys Comparison Analysis ---"
node "$SCRIPT_DIR/compare.mjs" --artifacts-dir "$RUN_DIR"

# 12. Record Output Hashes in Run Directory
echo -n "Recording output artifact hashes... "
cd "$RUN_DIR"
sha256sum or-reference-controlled-cd* or-reference-native-aero* comparison-results.json > output-hashes.txt
cd "$SCRIPT_DIR"
echo "Done."

echo -e "\n=================================================================="
echo "RUN COMPLETED SUCCESSFULLY"
echo "All outputs preserved at: $RUN_DIR"
echo "=================================================================="
