"""Normalize collector output into the route logger contract."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


USABLE_SECONDS = 10 * 60
FAILED_SECONDS = 30 * 60
DEFAULT_MAX_RECOVERY_ACCURACY_M = 100.0


def utc_from_epoch(seconds: int | float) -> datetime:
    return datetime.fromtimestamp(float(seconds), timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def freshness_class(age_seconds: int) -> str:
    if age_seconds < USABLE_SECONDS:
        return "usable"
    if age_seconds <= FAILED_SECONDS:
        return "stale"
    return "failed"


def latest_coordinate_location(locations: list[dict[str, Any]]) -> dict[str, Any] | None:
    with_coords = [
        item
        for item in locations
        if "latitude" in item and "longitude" in item and "time" in item
    ]
    if not with_coords:
        return None
    return max(with_coords, key=lambda item: int(item["time"]))


def normalize_locations(
    locations: list[dict[str, Any]],
    *,
    collected_at: datetime,
    previous_observed_at: str | None,
    max_recovery_accuracy_m: float = DEFAULT_MAX_RECOVERY_ACCURACY_M,
) -> dict[str, Any]:
    latest = latest_coordinate_location(locations)
    if not latest:
        return {
            "status": "failed",
            "failure_reason": "no_coordinate_location",
            "location_point": None,
            "raw_location_count": len(locations),
        }

    observed_at = utc_from_epoch(latest["time"])
    age_seconds = max(0, int((collected_at - observed_at).total_seconds()))
    klass = freshness_class(age_seconds)
    accuracy = latest.get("accuracy")
    has_recovery_accuracy = (
        isinstance(accuracy, (int, float)) and float(accuracy) <= max_recovery_accuracy_m
    )
    new_vs_repeated = "new"
    if previous_observed_at and previous_observed_at == iso(observed_at):
        new_vs_repeated = "repeated"

    recovery_grade = (
        klass == "usable" and has_recovery_accuracy and new_vs_repeated == "new"
    )

    return {
        "status": "ok",
        "failure_reason": None,
        "location_point": {
            "lat": latest["latitude"],
            "lon": latest["longitude"],
            "observed_at": iso(observed_at),
            "collected_at": iso(collected_at),
            "freshness_age_seconds": age_seconds,
            "freshness_class": klass,
            "accuracy_m": accuracy,
            "confidence": "recovery_grade" if recovery_grade else "weak",
            "new_vs_repeated": new_vs_repeated,
            "recovery_grade": recovery_grade,
            "source_status": latest.get("status"),
            "is_own_report": latest.get("is_own_report"),
        },
        "raw_location_count": len(locations),
    }
