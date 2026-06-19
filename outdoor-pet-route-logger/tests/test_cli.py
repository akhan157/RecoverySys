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
    assert run_payload["checks"][0]["record"]["location_point_id"] == 1
    assert run_payload["checks"][1]["record"]["location_point_id"] is None
    assert run_payload["checks"][1]["record"]["repeated_location_point_id"] == 1

    assert cli.main(["--db", str(db_path), "summary", "--session", "1"]) == 0
    summary = json.loads(capsys.readouterr().out)
    assert summary["check_attempts"] == 2
    assert summary["location_points"] == 1
    assert summary["repeated_checks"] == 1
