import json

from petlog import cli


def test_parse_interval_seconds():
    assert cli.parse_interval_seconds("0") == 0
    assert cli.parse_interval_seconds("30s") == 30
    assert cli.parse_interval_seconds("10m") == 600
    assert cli.parse_interval_seconds("1h") == 3600


def test_run_records_bounded_checks_and_session_summary(tmp_path, monkeypatch, capsys):
    db_path = tmp_path / "petlog.sqlite"

    def fake_collect(**kwargs):
        repeated = kwargs["previous_observed_at"] == "2026-06-19T12:00:00Z"
        return {
            "status": "ok",
            "failure_reason": None,
            "collector": "GoogleFindMyTools",
            "device_number": kwargs["device_number"],
            "location_point": {
                "lat": 40.0,
                "lon": -73.0,
                "observed_at": "2026-06-19T12:00:00Z",
                "collected_at": "2026-06-19T12:01:00Z",
                "freshness_age_seconds": 60,
                "freshness_class": "usable",
                "accuracy_m": 20.0,
                "confidence": "recovery_grade",
                "new_vs_repeated": "repeated" if repeated else "new",
                "recovery_grade": not repeated,
            },
        }

    monkeypatch.setattr(cli.googlefindmytools, "collect", fake_collect)

    assert cli.main(["--db", str(db_path), "session", "start"]) == 0
    capsys.readouterr()

    assert (
        cli.main(
            [
                "--db",
                str(db_path),
                "run",
                "--collector",
                "googlefindmytools",
                "--device-number",
                "3",
                "--interval",
                "0",
                "--max-checks",
                "2",
            ]
        )
        == 0
    )
    run_payload = json.loads(capsys.readouterr().out)
    assert run_payload["status"] == "completed"
    assert len(run_payload["checks"]) == 2
    first_point = run_payload["checks"][0]["collector_result"]["location_point"]
    assert first_point["coordinates"] == "redacted"
    assert "lat" not in first_point
    assert "lon" not in first_point
    assert run_payload["checks"][0]["record"]["location_point_id"] == 1
    assert run_payload["checks"][1]["record"]["location_point_id"] is None
    assert run_payload["checks"][1]["record"]["repeated_location_point_id"] == 1

    assert cli.main(["--db", str(db_path), "summary", "--session", "1"]) == 0
    summary = json.loads(capsys.readouterr().out)
    assert summary["check_attempts"] == 2
    assert summary["location_points"] == 1
    assert summary["repeated_checks"] == 1
    assert summary["usable_checks"] == 2


def test_public_collector_payload_can_show_coordinates():
    payload = {
        "status": "ok",
        "raw_output": "raw",
        "location_point": {"lat": 40.0, "lon": -73.0, "freshness_class": "usable"},
    }

    redacted = cli.public_collector_payload(payload, show_coordinates=False)
    visible = cli.public_collector_payload(payload, show_coordinates=True)

    assert "raw_output" not in redacted
    assert redacted["location_point"]["coordinates"] == "redacted"
    assert "lat" not in redacted["location_point"]
    assert visible["location_point"]["lat"] == 40.0


def test_repeated_detection_crosses_session_boundary(tmp_path, monkeypatch, capsys):
    db_path = tmp_path / "petlog.sqlite"

    def fake_collect(**kwargs):
        repeated = kwargs["previous_observed_at"] == "2026-06-19T12:00:00Z"
        return {
            "status": "ok",
            "failure_reason": None,
            "collector": "GoogleFindMyTools",
            "device_number": kwargs["device_number"],
            "location_point": {
                "lat": 40.0,
                "lon": -73.0,
                "observed_at": "2026-06-19T12:00:00Z",
                "collected_at": "2026-06-19T12:45:00Z",
                "freshness_age_seconds": 2700,
                "freshness_class": "failed",
                "accuracy_m": 20.0,
                "confidence": "weak",
                "new_vs_repeated": "repeated" if repeated else "new",
                "recovery_grade": False,
            },
        }

    monkeypatch.setattr(cli.googlefindmytools, "collect", fake_collect)

    assert cli.main(["--db", str(db_path), "session", "start"]) == 0
    capsys.readouterr()
    assert cli.main(["--db", str(db_path), "check"]) == 0
    capsys.readouterr()
    assert cli.main(["--db", str(db_path), "session", "stop"]) == 0
    capsys.readouterr()

    assert cli.main(["--db", str(db_path), "session", "start"]) == 0
    capsys.readouterr()
    assert cli.main(["--db", str(db_path), "check"]) == 0
    second_check = json.loads(capsys.readouterr().out)

    assert second_check["record"]["location_point_id"] is None
    assert second_check["record"]["repeated_location_point_id"] == 1
