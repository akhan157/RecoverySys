from petlog.storage import (
    active_session,
    connect,
    export_session,
    init_db,
    record_collector_result,
    start_session,
    stop_session,
    summary_for_today,
    summary_for_session,
)


def test_session_lifecycle_and_check_persistence(tmp_path):
    conn = connect(tmp_path / "petlog.sqlite")
    init_db(conn)

    session_id = start_session(conn, started_at="2026-06-18T12:00:00Z")
    assert active_session(conn)["id"] == session_id

    payload = {
        "status": "ok",
        "failure_reason": None,
        "location_point": {
            "lat": 40.0,
            "lon": -73.0,
            "observed_at": "2026-06-18T12:05:00Z",
            "collected_at": "2026-06-18T12:10:00Z",
            "freshness_age_seconds": 300,
            "freshness_class": "usable",
            "accuracy_m": 20.0,
            "confidence": "recovery_grade",
            "new_vs_repeated": "new",
            "recovery_grade": True,
        },
    }

    record = record_collector_result(
        conn,
        outside_session_id=session_id,
        collector_name="GoogleFindMyTools",
        payload=payload,
        checked_at="2026-06-18T12:10:00Z",
    )

    assert record["check_attempt_id"] == 1
    assert record["location_point_id"] == 1
    assert summary_for_session(conn, session_id)["recovery_grade_rate"] == 1.0

    stopped_id = stop_session(conn, ended_at="2026-06-18T12:20:00Z")
    assert stopped_id == session_id
    assert active_session(conn) is None

    exported = export_session(conn, session_id)
    assert exported["outside_session"]["id"] == session_id
    assert len(exported["check_attempts"]) == 1
    assert len(exported["location_points"]) == 1


def test_repeated_check_does_not_create_new_location_point(tmp_path):
    conn = connect(tmp_path / "petlog.sqlite")
    init_db(conn)
    session_id = start_session(conn)

    first_payload = {
        "status": "ok",
        "failure_reason": None,
        "location_point": {
            "lat": 40.0,
            "lon": -73.0,
            "observed_at": "2026-06-18T12:05:00Z",
            "collected_at": "2026-06-18T12:10:00Z",
            "freshness_age_seconds": 300,
            "freshness_class": "usable",
            "accuracy_m": 20.0,
            "confidence": "recovery_grade",
            "new_vs_repeated": "new",
            "recovery_grade": True,
        },
    }
    repeated_payload = {
        "status": "ok",
        "failure_reason": None,
        "location_point": {
            **first_payload["location_point"],
            "collected_at": "2026-06-18T12:20:00Z",
            "new_vs_repeated": "repeated",
            "recovery_grade": False,
        },
    }

    record_collector_result(
        conn,
        outside_session_id=session_id,
        collector_name="GoogleFindMyTools",
        payload=first_payload,
    )
    repeated_record = record_collector_result(
        conn,
        outside_session_id=session_id,
        collector_name="GoogleFindMyTools",
        payload=repeated_payload,
    )

    assert repeated_record["location_point_id"] is None
    assert repeated_record["repeated_location_point_id"] == 1
    assert summary_for_session(conn, session_id)["check_attempts"] == 2
    assert summary_for_session(conn, session_id)["location_points"] == 1


def test_today_summary_uses_checked_at_and_collected_at_date_columns(tmp_path):
    conn = connect(tmp_path / "petlog.sqlite")
    init_db(conn)
    session_id = start_session(conn)
    payload = {
        "status": "ok",
        "failure_reason": None,
        "location_point": {
            "lat": 40.0,
            "lon": -73.0,
            "observed_at": "2026-06-18T12:05:00Z",
            "collected_at": "2026-06-18T12:10:00Z",
            "freshness_age_seconds": 300,
            "freshness_class": "usable",
            "accuracy_m": 20.0,
            "confidence": "recovery_grade",
            "new_vs_repeated": "new",
            "recovery_grade": True,
        },
    }

    record_collector_result(
        conn,
        outside_session_id=session_id,
        collector_name="GoogleFindMyTools",
        payload=payload,
    )

    summary = summary_for_today(conn)
    assert set(summary) >= {"check_attempts", "location_points", "recovery_grade_rate"}
