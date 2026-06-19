"""GoogleFindMyTools collector adapter."""

from __future__ import annotations

import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from petlog.normalize import normalize_locations


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TOOL_DIR = (
    PROJECT_ROOT / "spikes" / "collector-access" / "vendor" / "GoogleFindMyTools"
)
DEFAULT_PYTHON = (
    PROJECT_ROOT
    / "spikes"
    / "collector-access"
    / ".venv312"
    / "Scripts"
    / "python.exe"
)
LOCAL_TZ = datetime.now().astimezone().tzinfo


def collect(
    *,
    device_number: str = "3",
    tool_dir: Path = DEFAULT_TOOL_DIR,
    python_executable: Path | None = None,
    timeout_seconds: int = 120,
    previous_observed_at: str | None = None,
) -> dict[str, Any]:
    collected_at = datetime.now(timezone.utc)
    output = run_tool(tool_dir, device_number, timeout_seconds, python_executable)
    locations = parse_locations(output)
    result = normalize_locations(
        locations,
        collected_at=collected_at,
        previous_observed_at=previous_observed_at,
    )
    result["collector"] = "GoogleFindMyTools"
    result["device_number"] = device_number
    result["raw_output"] = output
    return result


def run_tool(
    tool_dir: Path,
    device_number: str,
    timeout_seconds: int,
    python_executable: Path | None = None,
) -> str:
    if not tool_dir.exists():
        raise FileNotFoundError(f"GoogleFindMyTools directory not found: {tool_dir}")
    python = python_executable or (DEFAULT_PYTHON if DEFAULT_PYTHON.exists() else Path(sys.executable))
    if not python.exists():
        raise FileNotFoundError(f"Python executable not found: {python}")

    completed = subprocess.run(
        [str(python), "main.py"],
        cwd=tool_dir,
        input=f"{device_number}\n",
        text=True,
        capture_output=True,
        timeout=timeout_seconds,
        check=False,
    )
    output = completed.stdout + completed.stderr
    if completed.returncode != 0:
        raise RuntimeError(output)
    return output


def parse_locations(output: str) -> list[dict[str, object]]:
    blocks = output.split("----------------------------------------")
    locations: list[dict[str, object]] = []
    for block in blocks:
        lat = find_value(block, "Latitude")
        lon = find_value(block, "Longitude")
        observed = find_value(block, "Time")
        if lat is None or lon is None or observed is None:
            continue

        observed_local = datetime.strptime(observed, "%Y-%m-%d %H:%M:%S").replace(
            tzinfo=LOCAL_TZ
        )
        locations.append(
            {
                "latitude": float(lat),
                "longitude": float(lon),
                "altitude": parse_optional_float(find_value(block, "Altitude")),
                "accuracy": parse_optional_float(find_value(block, "Accuracy")),
                "time": int(observed_local.timestamp()),
                "status": parse_optional_int(find_value(block, "Status")),
                "is_own_report": parse_bool(find_value(block, "Is Own Report")),
            }
        )
    return locations


def find_value(text: str, key: str) -> str | None:
    match = re.search(rf"^{re.escape(key)}:\s*(.+?)\s*$", text, re.MULTILINE)
    return match.group(1) if match else None


def parse_optional_float(value: str | None) -> float | None:
    return float(value) if value not in (None, "") else None


def parse_optional_int(value: str | None) -> int | None:
    return int(value) if value not in (None, "") else None


def parse_bool(value: str | None) -> bool | None:
    if value == "True":
        return True
    if value == "False":
        return False
    return None
