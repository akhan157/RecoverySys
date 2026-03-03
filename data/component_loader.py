"""
ComponentLoader — loads, validates, and queries the component catalog.

Reads components.json once at startup and caches the result.
Malformed entries are logged as warnings and skipped; the app does not crash.
"""

import json
import logging
import os
from functools import lru_cache
from typing import Optional

from models.component import Component

logger = logging.getLogger(__name__)

# Path to the JSON catalog relative to this file's directory
_CATALOG_PATH = os.path.join(os.path.dirname(__file__), "components.json")

# Required string fields in every catalog entry
_REQUIRED_FIELDS = {
    "id", "name", "manufacturer", "category",
    "compatible_architectures", "packed_volume_cm3", "mass_g",
}

# Valid category values
_VALID_CATEGORIES = {"parachute", "shock_cord", "quick_link", "altimeter", "other"}


def _validate_entry(entry: dict) -> Optional[str]:
    """
    Return an error message string if the entry is malformed, else None.
    """
    missing = _REQUIRED_FIELDS - set(entry.keys())
    if missing:
        return f"Missing fields: {missing}"
    if entry.get("category") not in _VALID_CATEGORIES:
        return f"Unknown category: {entry.get('category')!r}"
    if not isinstance(entry.get("compatible_architectures"), list):
        return "compatible_architectures must be a list"
    if entry.get("category") == "shock_cord":
        for field in ("tensile_strength_n", "elongation_percentage", "cord_length_m"):
            if entry.get(field) is None:
                return f"shock_cord entry missing required field: {field}"
    return None


def load_catalog(catalog_path: str = _CATALOG_PATH) -> list[Component]:
    """
    Load and parse the component catalog from a JSON file.

    Args:
        catalog_path: Path to the components.json file.
                      Defaults to data/components.json.

    Returns:
        List of valid Component objects. Malformed entries are skipped.

    Raises:
        FileNotFoundError: If the catalog file does not exist.
        json.JSONDecodeError: If the file is not valid JSON.
    """
    with open(catalog_path, "r", encoding="utf-8") as fh:
        raw = json.load(fh)

    if not isinstance(raw, list):
        raise ValueError("components.json must contain a JSON array at the top level.")

    components: list[Component] = []
    for i, entry in enumerate(raw):
        error = _validate_entry(entry)
        if error:
            logger.warning("Skipping catalog entry %d (%r): %s", i, entry.get("id"), error)
            continue
        components.append(
            Component(
                id=entry["id"],
                name=entry["name"],
                manufacturer=entry["manufacturer"],
                category=entry["category"],
                compatible_architectures=entry["compatible_architectures"],
                tensile_strength_n=entry.get("tensile_strength_n"),
                elongation_percentage=entry.get("elongation_percentage"),
                cord_length_m=entry.get("cord_length_m"),
                packed_volume_cm3=float(entry.get("packed_volume_cm3", 0)),
                mass_g=float(entry.get("mass_g", 0)),
                notes=entry.get("notes", ""),
            )
        )

    logger.info("Loaded %d components from catalog (%d skipped).",
                len(components), len(raw) - len(components))
    return components


def get_by_category(catalog: list[Component], category: str) -> list[Component]:
    """Return all components with the given category."""
    return [c for c in catalog if c.category == category]


def get_by_architecture(catalog: list[Component], architecture_key: str) -> list[Component]:
    """Return components compatible with the given architecture key."""
    return [c for c in catalog if c.is_compatible_with(architecture_key)]


def get_by_category_and_architecture(
    catalog: list[Component], category: str, architecture_key: str
) -> list[Component]:
    """Return components matching both category and architecture."""
    return [
        c for c in catalog
        if c.category == category and c.is_compatible_with(architecture_key)
    ]


def get_by_id(catalog: list[Component], component_id: str) -> Optional[Component]:
    """Return the component with the given id, or None."""
    for c in catalog:
        if c.id == component_id:
            return c
    return None
