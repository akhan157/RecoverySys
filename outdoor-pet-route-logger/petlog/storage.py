"""SQLite persistence for reliability-first collection."""

from __future__ import annotations

import json
import sqlite3
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB_PATH = Path("petlog.sqlite")


SCHEMA = """
pragma foreign_keys = on;

create table if not exists outside_sessions (
  id integer primary key,
  started_at text not null,
  ended_at text,
  notes text
);

create table if not exists collector_runs (
  id integer primary key,
  collector_name text not null,
  collector_version text,
  started_at text not null,
  finished_at text,
  status text not null,
  raw_status text
);

create table if not exists check_attempts (
  id integer primary key,
  outside_session_id integer not null references outside_sessions(id),
  collector_run_id integer references collector_runs(id),
  scheduled_for text not null,
  checked_at text not null,
  status text not null,
  failure_reason text,
  repeated_location_point_id integer references location_points(id),
  raw_payload text
);

create table if not exists location_points (
  id integer primary key,
  outside_session_id integer not null references outside_sessions(id),
  check_attempt_id integer not null references check_attempts(id),
  observed_at text not null,
  collected_at text not null,
  lat real not null,
  lon real not null,
  accuracy_m real,
  confidence text,
  freshness_age_seconds integer not null,
  freshness_class text not null,
  recovery_grade integer not null
);

create index if not exists idx_outside_sessions_active
on outside_sessions(ended_at);

create index if not exists idx_check_attempts_session_checked_at
on check_attempts(outside_session_id, checked_at);

create unique index if not exists idx_location_points_session_observed_at
on location_points(outside_session_id, observed_at);
"""


def now_iso() -> str:
    return utc_iso(datetime.now(timezone.utc))


def utc_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def connect(db_path: Path = DEFAULT_DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("pragma foreign_keys = on")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def start_session(
    conn: sqlite3.Connection, *, notes: str | None = None, started_at: str | None = None
) -> int:
    if active_session(conn):
        raise ValueError("An outside session is already active")
    cursor = conn.execute(
        "insert into outside_sessions(started_at, notes) values (?, ?)",
        (started_at or now_iso(), notes),
    )
    conn.commit()
    return int(cursor.lastrowid)


def stop_session(conn: sqlite3.Connection, *, ended_at: str | None = None) -> int:
    session = active_session(conn)
    if session is None:
        raise ValueError("No active outside session")
    conn.execute(
        "update outside_sessions set ended_at = ? where id = ?",
        (ended_at or now_iso(), session["id"]),
    )
    conn.commit()
    return int(session["id"])


def active_session(conn: sqlite3.Connection) -> sqlite3.Row | None:
    return conn.execute(
        """
        select *
        from outside_sessions
        where ended_at is null
        order by started_at desc, id desc
        limit 1
        """
    ).fetchone()


def latest_location_observed_at(
    conn: sqlite3.Connection, outside_session_id: int
) -> str | None:
    row = conn.execute(
        """
        select observed_at
        from location_points
        where outside_session_id = ?
        order by observed_at desc, id desc
        limit 1
        """,
        (outside_session_id,),
    ).fetchone()
    return str(row["observed_at"]) if row else None


def record_collector_result(
    conn: sqlite3.Connection,
    *,
    outside_session_id: int,
    collector_name: str,
    payload: dict[str, Any],
    scheduled_for: str | None = None,
    checked_at: str | None = None,
) -> dict[str, int | None]:
    checked = checked_at or now_iso()
    started = payload.get("started_at") or checked
    finished = payload.get("finished_at") or checked
    raw_payload = json.dumps(payload, sort_keys=True)
    status = str(payload.get("status") or "failed")
    failure_reason = payload.get("failure_reason")

    collector_run_id = conn.execute(
        """
        insert into collector_runs(
          collector_name, collector_version, started_at, finished_at, status, raw_status
        )
        values (?, ?, ?, ?, ?, ?)
        """,
        (
            collector_name,
            payload.get("collector_version"),
            started,
            finished,
            status,
            raw_payload,
        ),
    ).lastrowid

    location_point = payload.get("location_point")
    repeated_location_point_id = None
    if isinstance(location_point, dict) and location_point.get("new_vs_repeated") == "repeated":
        repeated_location_point_id = find_location_point_id(
            conn, outside_session_id, str(location_point["observed_at"])
        )

    check_attempt_id = conn.execute(
        """
        insert into check_attempts(
          outside_session_id, collector_run_id, scheduled_for, checked_at, status,
          failure_reason, repeated_location_point_id, raw_payload
        )
        values (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            outside_session_id,
            collector_run_id,
            scheduled_for or checked,
            checked,
            status,
            failure_reason,
            repeated_location_point_id,
            raw_payload,
        ),
    ).lastrowid

    location_point_id = None
    if (
        status == "ok"
        and isinstance(location_point, dict)
        and location_point.get("new_vs_repeated") != "repeated"
    ):
        location_point_id = insert_location_point(
            conn,
            outside_session_id=outside_session_id,
            check_attempt_id=int(check_attempt_id),
            point=location_point,
        )

    conn.commit()
    return {
        "collector_run_id": int(collector_run_id),
        "check_attempt_id": int(check_attempt_id),
        "location_point_id": location_point_id,
        "repeated_location_point_id": repeated_location_point_id,
    }


def find_location_point_id(
    conn: sqlite3.Connection, outside_session_id: int, observed_at: str
) -> int | None:
    row = conn.execute(
        """
        select id
        from location_points
        where outside_session_id = ? and observed_at = ?
        limit 1
        """,
        (outside_session_id, observed_at),
    ).fetchone()
    return int(row["id"]) if row else None


def insert_location_point(
    conn: sqlite3.Connection,
    *,
    outside_session_id: int,
    check_attempt_id: int,
    point: dict[str, Any],
) -> int:
    cursor = conn.execute(
        """
        insert into location_points(
          outside_session_id, check_attempt_id, observed_at, collected_at, lat, lon,
          accuracy_m, confidence, freshness_age_seconds, freshness_class, recovery_grade
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            outside_session_id,
            check_attempt_id,
            point["observed_at"],
            point["collected_at"],
            point["lat"],
            point["lon"],
            point.get("accuracy_m"),
            point.get("confidence"),
            point["freshness_age_seconds"],
            point["freshness_class"],
            1 if point.get("recovery_grade") else 0,
        ),
    )
    return int(cursor.lastrowid)


def summary_for_today(conn: sqlite3.Connection) -> dict[str, Any]:
    today = datetime.now().astimezone().date()
    start_utc, end_utc = local_day_utc_bounds(today)
    return summary_where(
        conn,
        attempts_predicate="checked_at >= ? and checked_at < ?",
        attempts_params=(start_utc, end_utc),
        points_predicate="collected_at >= ? and collected_at < ?",
        points_params=(start_utc, end_utc),
    )


def local_day_utc_bounds(day: date) -> tuple[str, str]:
    local_tz = datetime.now().astimezone().tzinfo
    start = datetime.combine(day, time.min, tzinfo=local_tz)
    end_exclusive = start + timedelta(days=1)
    if end_exclusive <= start:
        raise ValueError(f"Invalid local day bounds for {day}")
    return utc_iso(start), utc_iso(end_exclusive)


def summary_for_session(conn: sqlite3.Connection, session_id: int) -> dict[str, Any]:
    return summary_where(
        conn,
        attempts_predicate="outside_session_id = ?",
        attempts_params=(session_id,),
        points_predicate="outside_session_id = ?",
        points_params=(session_id,),
    )


def summary_where(
    conn: sqlite3.Connection,
    *,
    attempts_predicate: str,
    attempts_params: tuple[Any, ...],
    points_predicate: str,
    points_params: tuple[Any, ...],
) -> dict[str, Any]:
    attempt_rows = conn.execute(
        f"""
        select
          status,
          repeated_location_point_id,
          raw_payload
        from check_attempts
        where {attempts_predicate}
        """,
        attempts_params,
    ).fetchall()
    points = conn.execute(
        f"""
        select
          count(*) as total,
          sum(case when recovery_grade = 1 then 1 else 0 end) as recovery_grade_count,
          sum(case when freshness_class = 'usable' then 1 else 0 end) as usable_count,
          sum(case when freshness_class = 'stale' then 1 else 0 end) as stale_count,
          sum(case when freshness_class = 'failed' then 1 else 0 end) as freshness_failed_count
        from location_points
        where {points_predicate}
        """,
        points_params,
    ).fetchone()
    attempt_metrics = summarize_attempt_rows(attempt_rows)
    total_attempts = attempt_metrics["check_attempts"]
    recovery_grade_count = int(points["recovery_grade_count"] or 0)
    return {
        "check_attempts": total_attempts,
        "ok_checks": attempt_metrics["ok_checks"],
        "failed_checks": attempt_metrics["failed_checks"],
        "repeated_checks": attempt_metrics["repeated_checks"],
        "usable_checks": attempt_metrics["usable_checks"],
        "stale_checks": attempt_metrics["stale_checks"],
        "freshness_failed_checks": attempt_metrics["freshness_failed_checks"],
        "recovery_grade_checks": attempt_metrics["recovery_grade_checks"],
        "location_points": int(points["total"] or 0),
        "usable_points": int(points["usable_count"] or 0),
        "stale_points": int(points["stale_count"] or 0),
        "freshness_failed_points": int(points["freshness_failed_count"] or 0),
        "recovery_grade_points": recovery_grade_count,
        "recovery_grade_rate": (
            recovery_grade_count / total_attempts if total_attempts else None
        ),
    }


def summarize_attempt_rows(rows: list[sqlite3.Row]) -> dict[str, int]:
    metrics = {
        "check_attempts": 0,
        "ok_checks": 0,
        "failed_checks": 0,
        "repeated_checks": 0,
        "usable_checks": 0,
        "stale_checks": 0,
        "freshness_failed_checks": 0,
        "recovery_grade_checks": 0,
    }
    for row in rows:
        metrics["check_attempts"] += 1
        if row["status"] == "ok":
            metrics["ok_checks"] += 1
        else:
            metrics["failed_checks"] += 1
        if row["repeated_location_point_id"] is not None:
            metrics["repeated_checks"] += 1
        point = raw_payload_location_point(row["raw_payload"])
        if not point:
            continue
        freshness = point.get("freshness_class")
        if freshness == "usable":
            metrics["usable_checks"] += 1
        elif freshness == "stale":
            metrics["stale_checks"] += 1
        elif freshness == "failed":
            metrics["freshness_failed_checks"] += 1
        if point.get("recovery_grade"):
            metrics["recovery_grade_checks"] += 1
    return metrics


def raw_payload_location_point(raw_payload: str | None) -> dict[str, Any] | None:
    if not raw_payload:
        return None
    try:
        payload = json.loads(raw_payload)
    except json.JSONDecodeError:
        return None
    point = payload.get("location_point") if isinstance(payload, dict) else None
    return point if isinstance(point, dict) else None


def export_session(conn: sqlite3.Connection, session_id: int) -> dict[str, Any]:
    session = conn.execute(
        "select * from outside_sessions where id = ?", (session_id,)
    ).fetchone()
    if session is None:
        raise ValueError(f"Unknown outside session: {session_id}")
    attempts = conn.execute(
        """
        select id, scheduled_for, checked_at, status, failure_reason,
               repeated_location_point_id
        from check_attempts
        where outside_session_id = ?
        order by checked_at, id
        """,
        (session_id,),
    ).fetchall()
    points = conn.execute(
        """
        select id, check_attempt_id, observed_at, collected_at, lat, lon, accuracy_m,
               confidence, freshness_age_seconds, freshness_class, recovery_grade
        from location_points
        where outside_session_id = ?
        order by observed_at, id
        """,
        (session_id,),
    ).fetchall()
    return {
        "outside_session": dict(session),
        "summary": summary_for_session(conn, session_id),
        "check_attempts": [dict(row) for row in attempts],
        "location_points": [dict(row) for row in points],
    }
