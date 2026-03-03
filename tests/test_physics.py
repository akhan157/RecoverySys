"""
Unit tests for physics/fos_calculator.py pure functions.

All tests use hand-calculated expected values to verify each function
in isolation. No Streamlit context required.

Run with:
    pytest tests/test_physics.py -v
"""

import math
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from physics.fos_calculator import (
    calc_reduced_mass,
    calc_kinetic_energy,
    calc_delta_x,
    calc_f_peak,
    calc_fos,
    PhysicsInputError,
)

TOLERANCE = 1e-9  # floating point comparison tolerance


# ── calc_reduced_mass ─────────────────────────────────────────────────────────

class TestCalcReducedMass:
    def test_equal_masses(self):
        # (2 * 2) / (2 + 2) = 1.0
        assert abs(calc_reduced_mass(2.0, 2.0) - 1.0) < TOLERANCE

    def test_typical_rocket_masses(self):
        # nose 1.5 kg, booster 4.0 kg → (1.5 * 4.0) / (1.5 + 4.0) = 6.0 / 5.5
        expected = (1.5 * 4.0) / (1.5 + 4.0)
        assert abs(calc_reduced_mass(1.5, 4.0) - expected) < TOLERANCE

    def test_very_unequal_masses_approaches_smaller(self):
        # If m2 >> m1, reduced mass ≈ m1
        rm = calc_reduced_mass(1.0, 1000.0)
        assert rm < 1.0
        assert rm > 0.999  # should be very close to 1.0

    def test_zero_m1_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_reduced_mass(0.0, 2.0)
        assert exc_info.value.field == "m1_kg"

    def test_negative_m2_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_reduced_mass(1.0, -1.0)
        assert exc_info.value.field == "m2_kg"

    def test_nan_raises(self):
        with pytest.raises(PhysicsInputError):
            calc_reduced_mass(float("nan"), 1.0)


# ── calc_kinetic_energy ───────────────────────────────────────────────────────

class TestCalcKineticEnergy:
    def test_known_value(self):
        # KE = 0.5 * 1.09 * 30^2 = 0.5 * 1.09 * 900 = 490.5
        rm = calc_reduced_mass(1.5, 4.0)
        ke = calc_kinetic_energy(rm, 30.0)
        expected = 0.5 * rm * 30.0 ** 2
        assert abs(ke - expected) < TOLERANCE

    def test_zero_velocity_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_kinetic_energy(1.0, 0.0)
        assert exc_info.value.field == "velocity_ms"

    def test_zero_mass_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_kinetic_energy(0.0, 30.0)
        assert exc_info.value.field == "reduced_mass_kg"

    def test_scales_with_velocity_squared(self):
        ke1 = calc_kinetic_energy(1.0, 10.0)
        ke2 = calc_kinetic_energy(1.0, 20.0)
        assert abs(ke2 / ke1 - 4.0) < TOLERANCE  # 20^2 / 10^2 = 4


# ── calc_delta_x ──────────────────────────────────────────────────────────────

class TestCalcDeltaX:
    def test_known_value(self):
        # 3.0 m cord, 15% elongation → delta_x = 3.0 * 0.15 = 0.45 m
        assert abs(calc_delta_x(3.0, 15.0) - 0.45) < TOLERANCE

    def test_100_percent_elongation(self):
        # 5 m cord, 100% elongation → delta_x = 5.0 m
        assert abs(calc_delta_x(5.0, 100.0) - 5.0) < TOLERANCE

    def test_zero_length_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_delta_x(0.0, 15.0)
        assert exc_info.value.field == "cord_length_m"

    def test_zero_elongation_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_delta_x(3.0, 0.0)
        assert exc_info.value.field == "elongation_percentage"

    def test_negative_elongation_raises(self):
        with pytest.raises(PhysicsInputError):
            calc_delta_x(3.0, -5.0)


# ── calc_f_peak ───────────────────────────────────────────────────────────────

class TestCalcFPeak:
    def test_known_value(self):
        # F_peak = (2 * 490.5) / 0.45 = 981.0 / 0.45 = 2180 N
        rm = calc_reduced_mass(1.5, 4.0)
        ke = calc_kinetic_energy(rm, 30.0)
        dx = calc_delta_x(3.0, 15.0)
        fp = calc_f_peak(ke, dx)
        expected = (2 * ke) / dx
        assert abs(fp - expected) < TOLERANCE

    def test_zero_delta_x_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_f_peak(490.5, 0.0)
        assert exc_info.value.field == "delta_x_m"

    def test_zero_ke_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_f_peak(0.0, 0.45)
        assert exc_info.value.field == "kinetic_energy_j"

    def test_longer_cord_lower_force(self):
        # Same KE, longer cord → lower F_peak
        ke = 490.5
        fp_short = calc_f_peak(ke, 0.45)
        fp_long = calc_f_peak(ke, 0.90)
        assert fp_long < fp_short
        assert abs(fp_short / fp_long - 2.0) < TOLERANCE


# ── calc_fos ──────────────────────────────────────────────────────────────────

class TestCalcFos:
    def test_known_value(self):
        # Cord strength 13344 N, F_peak 2000 N → FOS = 6.672
        fos = calc_fos(13344.0, 2000.0)
        assert abs(fos - 13344.0 / 2000.0) < TOLERANCE

    def test_fos_equals_one_at_limit(self):
        fos = calc_fos(1000.0, 1000.0)
        assert abs(fos - 1.0) < TOLERANCE

    def test_zero_tensile_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_fos(0.0, 1000.0)
        assert exc_info.value.field == "tensile_strength_n"

    def test_zero_f_peak_raises(self):
        with pytest.raises(PhysicsInputError) as exc_info:
            calc_fos(1000.0, 0.0)
        assert exc_info.value.field == "f_peak_n"


# ── End-to-end calculation chain ──────────────────────────────────────────────

class TestFullCalculationChain:
    """Verify the complete chain with known hand-calculated values."""

    def test_typical_hpr_scenario(self):
        """
        Scenario:
          - Nose cone: 1.5 kg, Booster: 4.0 kg
          - Velocity at apogee: 10 m/s
          - Cord: 1" nylon, 3 m, 15% elongation, 13344 N tensile
          - Expected FOS should be comfortable for typical HPR
        """
        m1, m2 = 1.5, 4.0
        velocity = 10.0
        cord_length = 3.0
        elongation_pct = 15.0
        tensile = 13344.0

        rm = calc_reduced_mass(m1, m2)
        ke = calc_kinetic_energy(rm, velocity)
        dx = calc_delta_x(cord_length, elongation_pct)
        fp = calc_f_peak(ke, dx)
        fos = calc_fos(tensile, fp)

        # Verify intermediate values
        assert abs(rm - (1.5 * 4.0 / 5.5)) < TOLERANCE
        assert abs(ke - 0.5 * rm * 100.0) < TOLERANCE
        assert abs(dx - 0.45) < TOLERANCE

        # FOS should be well above a typical 4.0 target for these parameters
        assert fos > 4.0

    def test_high_velocity_scenario_reduces_fos(self):
        """Higher velocity should reduce FOS."""
        m1, m2 = 1.5, 4.0
        cord_length = 3.0
        elongation_pct = 15.0
        tensile = 13344.0

        rm = calc_reduced_mass(m1, m2)

        ke_low = calc_kinetic_energy(rm, 10.0)
        ke_high = calc_kinetic_energy(rm, 30.0)
        dx = calc_delta_x(cord_length, elongation_pct)

        fp_low = calc_f_peak(ke_low, dx)
        fp_high = calc_f_peak(ke_high, dx)

        fos_low = calc_fos(tensile, fp_low)
        fos_high = calc_fos(tensile, fp_high)

        assert fos_high < fos_low
        # KE scales as v^2, so F_peak scales as v^2, FOS scales as 1/v^2
        # fos_low / fos_high should ≈ (30/10)^2 = 9
        assert abs(fos_low / fos_high - 9.0) < 1e-6
