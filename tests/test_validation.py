"""
Unit tests for validation/validator.py rules.

Each screen's validation is tested for:
  - Valid inputs → no errors
  - Missing/zero required fields → hard errors
  - Boundary-condition soft warnings

Run with:
    pytest tests/test_validation.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from validation.validator import (
    validate_screen2,
    validate_screen3,
    validate_screen4,
    validate_screen5,
)


# ── Screen 2: Bay Dimensions ──────────────────────────────────────────────────

class TestValidateScreen2:
    def _bay(self, label="Main Bay", diameter=76.0, length=300.0):
        return {"label": label, "diameter_mm": diameter, "length_mm": length}

    def test_valid_single_bay(self):
        result = validate_screen2([self._bay()])
        assert result.valid
        assert len(result.errors) == 0

    def test_valid_two_bays(self):
        result = validate_screen2([self._bay("Drogue Bay"), self._bay("Main Bay")])
        assert result.valid

    def test_diameter_zero_errors(self):
        result = validate_screen2([self._bay(diameter=0.0)])
        assert not result.valid
        assert any("Diameter" in e.message for e in result.errors)

    def test_diameter_below_minimum_errors(self):
        result = validate_screen2([self._bay(diameter=5.0)])
        assert not result.valid
        assert any("10 mm" in e.message for e in result.errors)

    def test_length_zero_errors(self):
        result = validate_screen2([self._bay(length=0.0)])
        assert not result.valid
        assert any("Length" in e.message for e in result.errors)

    def test_length_below_minimum_errors(self):
        result = validate_screen2([self._bay(length=30.0)])
        assert not result.valid
        assert any("50 mm" in e.message for e in result.errors)

    def test_both_invalid_produces_two_errors(self):
        result = validate_screen2([self._bay(diameter=0.0, length=0.0)])
        assert len(result.errors) == 2


# ── Screen 3: Section Masses ──────────────────────────────────────────────────

class TestValidateScreen3:
    def _sec(self, label="Section A", mass=2.0):
        return {"label": label, "mass_kg": mass}

    def test_valid_two_sections(self):
        result = validate_screen3([self._sec("Nose", 1.5), self._sec("Booster", 4.0)])
        assert result.valid

    def test_zero_mass_errors(self):
        result = validate_screen3([self._sec("Nose", 0.0)])
        assert not result.valid
        assert any("greater than 0" in e.message for e in result.errors)

    def test_negative_mass_errors(self):
        result = validate_screen3([self._sec("Nose", -1.0)])
        assert not result.valid

    def test_heavy_mass_warns(self):
        result = validate_screen3([self._sec("Booster", 60.0)])
        assert result.valid  # Warning, not error
        assert any("lbs" in w.message for w in result.warnings)

    def test_very_heavy_total_warns(self):
        result = validate_screen3([
            self._sec("A", 80.0),
            self._sec("B", 80.0),
        ])
        assert result.valid  # heavy mass is a warning, not a hard error
        # Warning triggered when both per-section (>50 kg) and total (>150 kg) thresholds hit
        assert len(result.warnings) > 0

    def test_three_sections_valid(self):
        result = validate_screen3([
            self._sec("Nose", 1.0),
            self._sec("Payload", 2.0),
            self._sec("Booster", 5.0),
        ])
        assert result.valid


# ── Screen 4: Descent Profile ─────────────────────────────────────────────────

class TestValidateScreen4:
    def _profile(self, apogee=5.0, drogue=30.0, main=6.0, fos=4.0):
        return {
            "velocity_at_apogee_ms": apogee,
            "drogue_descent_rate_ms": drogue,
            "target_main_descent_rate_ms": main,
            "target_fos": fos,
        }

    def test_valid_defaults(self):
        result = validate_screen4(self._profile())
        assert result.valid

    def test_zero_apogee_velocity_errors(self):
        result = validate_screen4(self._profile(apogee=0.0))
        assert not result.valid
        assert any("apogee" in e.message.lower() for e in result.errors)

    def test_drogue_too_high_errors(self):
        result = validate_screen4(self._profile(drogue=150.0))
        assert not result.valid
        assert any("Drogue" in e.message for e in result.errors)

    def test_main_too_high_errors(self):
        result = validate_screen4(self._profile(main=25.0))
        assert not result.valid

    def test_main_exceeds_drogue_errors(self):
        result = validate_screen4(self._profile(drogue=10.0, main=15.0))
        assert not result.valid
        assert any("should not exceed" in e.message for e in result.errors)

    def test_fos_below_minimum_errors(self):
        result = validate_screen4(self._profile(fos=0.5))
        assert not result.valid

    def test_fos_above_maximum_errors(self):
        result = validate_screen4(self._profile(fos=25.0))
        assert not result.valid

    def test_fos_boundary_values(self):
        assert validate_screen4(self._profile(fos=1.0)).valid
        assert validate_screen4(self._profile(fos=20.0)).valid

    def test_drogue_boundary_values(self):
        # main=1.0 keeps main <= drogue at both boundaries
        assert validate_screen4(self._profile(drogue=1.0, main=1.0)).valid
        assert validate_screen4(self._profile(drogue=100.0, main=6.0)).valid


# ── Screen 5: Component Selection ────────────────────────────────────────────

class TestValidateScreen5:
    def test_all_roles_filled_passes(self):
        result = validate_screen5(
            required_cord_roles=["main_cord"],
            selected_components={"main_cord": object()},
            bay_fill_fractions={"Main Bay": 0.5},
        )
        assert result.valid

    def test_missing_cord_role_errors(self):
        result = validate_screen5(
            required_cord_roles=["main_cord"],
            selected_components={},
            bay_fill_fractions={"Main Bay": 0.5},
        )
        assert not result.valid
        assert any("main_cord" in e.field or "shock cord" in e.message.lower()
                   for e in result.errors)

    def test_cord_role_is_none_errors(self):
        result = validate_screen5(
            required_cord_roles=["drogue_cord"],
            selected_components={"drogue_cord": None},
            bay_fill_fractions={"Drogue Bay": 0.3},
        )
        assert not result.valid

    def test_bay_overfull_errors(self):
        result = validate_screen5(
            required_cord_roles=["main_cord"],
            selected_components={"main_cord": object()},
            bay_fill_fractions={"Main Bay": 1.05},
        )
        assert not result.valid
        assert any("exceed" in e.message for e in result.errors)

    def test_bay_nearly_full_warns(self):
        result = validate_screen5(
            required_cord_roles=["main_cord"],
            selected_components={"main_cord": object()},
            bay_fill_fractions={"Main Bay": 0.90},
        )
        assert result.valid  # warning only
        assert len(result.warnings) > 0

    def test_dual_deploy_requires_both_cords(self):
        result = validate_screen5(
            required_cord_roles=["drogue_cord", "main_cord"],
            selected_components={"drogue_cord": object()},  # main_cord missing
            bay_fill_fractions={"Drogue Bay": 0.4, "Main Bay": 0.3},
        )
        assert not result.valid
        error_fields = [e.field for e in result.errors]
        assert "main_cord" in error_fields
