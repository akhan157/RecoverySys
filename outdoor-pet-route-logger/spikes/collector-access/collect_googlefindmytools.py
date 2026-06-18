#!/usr/bin/env python
"""Collect one GoogleFindMyTools location sample and emit normalized JSON."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from normalize_google_find_hub import normalize


ROOT = Path(__file__).resolve().parent
DEFAULT_TOOL_DIR = ROOT / "vendor" / "GoogleFindMyTools"
LOCAL_TZ = datetime.now().astimezone().tzinfo


def run_tool(tool_dir: Path, device_number: str, timeout_seconds: int) -> str:
    completed = subprocess.run(
        [sys.executable, "main.py"],
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--device-number", default="3")
    parser.add_argument("--tool-dir", type=Path, default=DEFAULT_TOOL_DIR)
    parser.add_argument("--timeout-seconds", type=int, default=120)
    parser.add_argument("--previous-observed-at")
    parser.add_argument("--raw-output", type=Path)
    args = parser.parse_args()

    collected_at = datetime.now(timezone.utc)
    output = run_tool(args.tool_dir, args.device_number, args.timeout_seconds)
    if args.raw_output:
        args.raw_output.write_text(output, encoding="utf-8")

    locations = parse_locations(output)
    result = normalize(
        locations,
        collected_at=collected_at,
        previous_observed_at=args.previous_observed_at,
        max_recovery_accuracy_m=100.0,
    )
    result["collector"] = "GoogleFindMyTools"
    result["device_number"] = args.device_number
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
