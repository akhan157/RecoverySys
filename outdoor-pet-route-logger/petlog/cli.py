"""Command-line interface for the outdoor pet route logger."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from petlog import googlefindmytools
from petlog.storage import (
    DEFAULT_DB_PATH,
    active_session,
    connect,
    export_session,
    init_db,
    latest_location_observed_at,
    record_collector_result,
    start_session,
    stop_session,
    summary_for_today,
)


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    conn = connect(args.db)
    init_db(conn)
    try:
        return args.func(conn, args)
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="petlog")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    subcommands = parser.add_subparsers(required=True)

    session_parser = subcommands.add_parser("session")
    session_subcommands = session_parser.add_subparsers(required=True)
    start_parser = session_subcommands.add_parser("start")
    start_parser.add_argument("--notes")
    start_parser.set_defaults(func=cmd_session_start)
    stop_parser = session_subcommands.add_parser("stop")
    stop_parser.set_defaults(func=cmd_session_stop)

    check_parser = subcommands.add_parser("check")
    check_parser.add_argument("--collector", default="googlefindmytools")
    check_parser.add_argument("--device-number", default="3")
    check_parser.add_argument("--tool-dir", type=Path, default=googlefindmytools.DEFAULT_TOOL_DIR)
    check_parser.add_argument("--python", type=Path, default=googlefindmytools.DEFAULT_PYTHON)
    check_parser.add_argument("--timeout-seconds", type=int, default=120)
    check_parser.set_defaults(func=cmd_check)

    summary_parser = subcommands.add_parser("summary")
    summary_parser.add_argument("--today", action="store_true")
    summary_parser.set_defaults(func=cmd_summary)

    export_parser = subcommands.add_parser("export")
    export_parser.add_argument("--session", type=int, required=True)
    export_parser.set_defaults(func=cmd_export)

    return parser


def cmd_session_start(conn: Any, args: argparse.Namespace) -> int:
    session_id = start_session(conn, notes=args.notes)
    print_json({"outside_session_id": session_id, "status": "started"})
    return 0


def cmd_session_stop(conn: Any, args: argparse.Namespace) -> int:
    session_id = stop_session(conn)
    print_json({"outside_session_id": session_id, "status": "stopped"})
    return 0


def cmd_check(conn: Any, args: argparse.Namespace) -> int:
    session = active_session(conn)
    if session is None:
        raise ValueError("Start an outside session before recording a check")

    collector = args.collector.lower().replace("-", "").replace("_", "")
    previous_observed_at = latest_location_observed_at(conn, int(session["id"]))
    if collector != "googlefindmytools":
        raise ValueError(f"Unsupported collector: {args.collector}")

    try:
        payload = googlefindmytools.collect(
            device_number=args.device_number,
            tool_dir=args.tool_dir,
            python_executable=args.python,
            timeout_seconds=args.timeout_seconds,
            previous_observed_at=previous_observed_at,
        )
    except Exception as exc:
        payload = {
            "status": "failed",
            "failure_reason": type(exc).__name__,
            "location_point": None,
            "collector": "GoogleFindMyTools",
            "device_number": args.device_number,
            "raw_error": str(exc),
        }
    record = record_collector_result(
        conn,
        outside_session_id=int(session["id"]),
        collector_name="GoogleFindMyTools",
        payload=payload,
    )
    public_payload = {key: value for key, value in payload.items() if key != "raw_output"}
    response = {"record": record, "collector_result": public_payload}
    if "raw_output" in payload:
        response["raw_output_stored"] = True
    print_json(response)
    return 0


def cmd_summary(conn: Any, args: argparse.Namespace) -> int:
    if not args.today:
        raise ValueError("Only --today is implemented")
    print_json(summary_for_today(conn))
    return 0


def cmd_export(conn: Any, args: argparse.Namespace) -> int:
    print_json(export_session(conn, args.session))
    return 0


def print_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, indent=2, sort_keys=True))


if __name__ == "__main__":
    raise SystemExit(main())
