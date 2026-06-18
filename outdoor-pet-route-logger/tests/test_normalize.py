from datetime import datetime, timezone

from petlog.normalize import freshness_class, normalize_locations


def test_freshness_class_thresholds():
    assert freshness_class(599) == "usable"
    assert freshness_class(600) == "stale"
    assert freshness_class(1800) == "stale"
    assert freshness_class(1801) == "failed"


def test_normalize_marks_recovery_grade_new_point():
    collected_at = datetime(2026, 6, 18, 12, 10, tzinfo=timezone.utc)

    result = normalize_locations(
        [
            {
                "latitude": 40.0,
                "longitude": -73.0,
                "time": datetime(2026, 6, 18, 12, 5, tzinfo=timezone.utc).timestamp(),
                "accuracy": 20.0,
            }
        ],
        collected_at=collected_at,
        previous_observed_at=None,
    )

    assert result["status"] == "ok"
    assert result["location_point"]["freshness_class"] == "usable"
    assert result["location_point"]["recovery_grade"] is True
    assert result["location_point"]["new_vs_repeated"] == "new"


def test_normalize_marks_repeated_point_not_recovery_grade():
    collected_at = datetime(2026, 6, 18, 12, 10, tzinfo=timezone.utc)

    result = normalize_locations(
        [
            {
                "latitude": 40.0,
                "longitude": -73.0,
                "time": datetime(2026, 6, 18, 12, 5, tzinfo=timezone.utc).timestamp(),
                "accuracy": 20.0,
            }
        ],
        collected_at=collected_at,
        previous_observed_at="2026-06-18T12:05:00Z",
    )

    assert result["location_point"]["new_vs_repeated"] == "repeated"
    assert result["location_point"]["recovery_grade"] is False


def test_normalize_no_coordinate_location_fails():
    result = normalize_locations(
        [],
        collected_at=datetime(2026, 6, 18, 12, 10, tzinfo=timezone.utc),
        previous_observed_at=None,
    )

    assert result["status"] == "failed"
    assert result["failure_reason"] == "no_coordinate_location"
    assert result["location_point"] is None
