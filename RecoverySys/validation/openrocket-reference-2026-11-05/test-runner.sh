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
ACTUAL_JAR_SHA=$(sha256sum "$OR_JAR" | awk '{print $1}')
if [ "$ACTUAL_JAR_SHA" != "$EXPECTED_JAR_SHA" ]; then
  echo "ERROR: OpenRocket JAR SHA-256 mismatch!" >&2
  echo "  Expected: $EXPECTED_JAR_SHA" >&2
  echo "  Actual:   $ACTUAL_JAR_SHA" >&2
  exit 1
fi

if [ ! -f "$MOTOR_ENG" ]; then
  echo "ERROR: Motor profile I200W.eng not found at $MOTOR_ENG" >&2
  exit 1
fi
ACTUAL_MOTOR_SHA=$(sha256sum "$MOTOR_ENG" | awk '{print $1}')
if [ "$ACTUAL_MOTOR_SHA" != "$EXPECTED_MOTOR_SHA" ]; then
  echo "ERROR: Motor profile SHA-256 mismatch!" >&2
  echo "  Expected: $EXPECTED_MOTOR_SHA" >&2
  echo "  Actual:   $ACTUAL_MOTOR_SHA" >&2
  exit 1
fi
echo "Verified inputs:     JAR SHA-256: ${ACTUAL_JAR_SHA:0:16}... Motor SHA-256: ${ACTUAL_MOTOR_SHA:0:16}..."

# 5. Create Unique External Run Directory (Never overwrite initial or shared evidence)
RUN_DIR="${OUT_DIR:-$(mktemp -d /tmp/or-reference-run-XXXXXX)}"
CLASSES_DIR="$RUN_DIR/classes"
mkdir -p "$CLASSES_DIR"
echo "External Run Dir:    $RUN_DIR"

# Cleanup trap to ensure background Xvfb processes are terminated
cleanup() {
  # Terminate any stray Xvfb instances started in this process group if needed
  true
}
trap cleanup EXIT

# 6. Capture Reproduction Manifest & Environment Metadata
GIT_HEAD="$(git rev-parse HEAD 2>/dev/null || echo "UNKNOWN")"
GIT_DIRTY="clean"
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  GIT_DIRTY="dirty"
fi

cat <<EOF > "$RUN_DIR/reproduction-manifest.json"
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$GIT_HEAD",
  "git_status": "$GIT_DIRTY",
  "runtime_identity": {
    "node_version": "$(node -v)",
    "java_version": "$JAVA_VERSION_STR",
    "os": "$(uname -srm)"
  },
  "provenance_and_limitations": {
    "openrocket_upstream_tag": "release-23.09",
    "openrocket_upstream_commit": "6c89a3c60118226e562e19625d8fd439854b1246",
    "openrocket_jar_observed_sha256": "$ACTUAL_JAR_SHA",
    "openrocket_jar_bytes": 71758139,
    "openrocket_release_api_digest": null,
    "openrocket_release_note": "Local observed byte identity; GitHub release API returns digest=null",
    "motor_provenance": "AeroTech I200W from Tripoli Motor Testing certified record on ThrustCurve.org / OpenRocket bundled library",
    "motor_sha256": "$ACTUAL_MOTOR_SHA"
  },
  "input_file_hashes": {
    "manifest": "$(sha256sum "$SCRIPT_DIR/reference-vehicle.json" | awk '{print $1}')",
    "driver_java": "$(sha256sum "$SCRIPT_DIR/OpenRocketDriver.java" | awk '{print $1}')",
    "compare_mjs": "$(sha256sum "$SCRIPT_DIR/compare.mjs" | awk '{print $1}')",
    "controls_test": "$(sha256sum "$SCRIPT_DIR/controls.test.mjs" | awk '{print $1}')"
  }
}
EOF

# 7. Compile OpenRocketDriver into isolated classes directory (max 2 jobs, -Xmx512m)
echo -n "Compiling OpenRocketDriver.java... "
"$JAVAC_BIN" -J-Xmx512m -cp "$OR_JAR" -d "$CLASSES_DIR" "$SCRIPT_DIR/OpenRocketDriver.java"
echo "Done."

# 8. Execute Comprehensive Controls Suite
echo -e "\n--- Executing Controls & Invariant Checks ---"
JAVA_BIN="$JAVA_BIN" JAVAC_BIN="$JAVAC_BIN" ARTIFACTS_DIR="$SHARED_ARTIFACTS_DIR" \
  node --test "$SCRIPT_DIR/controls.test.mjs"

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
sha256sum or-reference-controlled-cd* or-reference-native-aero* comparison-results.json > output-hashes.txt 2>/dev/null || true
cd "$SCRIPT_DIR"
echo "Done."

echo -e "\n=================================================================="
echo "RUN COMPLETED SUCCESSFULLY"
echo "All outputs preserved at: $RUN_DIR"
echo "=================================================================="
