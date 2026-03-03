"""
Integration tests for models/deployment_event.py.

Tests the full calculation chain from inputs to FOS result tiers,
using real Component and RocketSection objects.

Run with:
    pytest tests/test_deployment_event.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.component import Component
from models.deployment_event import (
    DeploymentEvent,
    RESULT_PASS,
    RESULT_WARNING,
    RESULT_FAIL,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_cord(
    tensile_n=13344.0,
    elongation_pct=15.0,
    cord_length_m=3.0,
    name="Test Cord",
) -> Component:
    return Component(
        id="test_cord",
        name=name,
        manufacturer="Test",
        category="shock_cord",
        compatible_architectures=["all"],
        tensile_strength_n=tensile_n,
        elongation_percentage=elongation_pct,
        cord_length_m=cord_length_m,
        packed_volume_cm3=120.0,
        mass_g=180.0,
    )


def make_quick_link(tensile_n=13344.0) -> Component:
    return Component(
        id="test_ql",
        name="Test Quick Link",
        manufacturer="Test",
        category="quick_link",
        compatible_architectures=["all"],
        tensile_strength_n=tensile_n,
        packed_volume_cm3=8.0,
        mass_g=45.0,
    )


def make_event(
    m1=1.5,
    m2=4.0,
    velocity=10.0,
    cord=None,
    quick_link=None,
    target_fos=4.0,
    event_name="Test Event",
) -> DeploymentEvent:
    if cord is None:
        cord = make_cord()
    return DeploymentEvent(
        event_name=event_name,
        m1_kg=m1,
        m2_kg=m2,
        velocity_ms=velocity,
        shock_cord=cord,
        quick_link=quick_link,
        target_fos=target_fos,
    )


# ── Computation correctness ───────────────────────────────────────────────────

class TestDeploymentEventComputation:
    def test_ok_flag_set_on_valid_inputs(self):
        event = make_event()
        assert event.ok

    def test_reduced_mass_correct(self):
        event = make_event(m1=1.5, m2=4.0)
        expected = (1.5 * 4.0) / (1.5 + 4.0)
        assert abs(event.reduced_mass_kg - expected) < 1e-9

    def test_kinetic_energy_correct(self):
        event = make_event(m1=1.5, m2=4.0, velocity=10.0)
        rm = (1.5 * 4.0) / (1.5 + 4.0)
        expected = 0.5 * rm * 100.0
        assert abs(event.kinetic_energy_j - expected) < 1e-9

    def test_delta_x_correct(self):
        cord = make_cord(cord_length_m=3.0, elongation_pct=15.0)
        event = make_event(cord=cord)
        assert abs(event.delta_x_m - 0.45) < 1e-9

    def test_f_peak_correct(self):
        event = make_event()
        expected = (2 * event.kinetic_energy_j) / event.delta_x_m
        assert abs(event.f_peak_n - expected) < 1e-9

    def test_cord_fos_correct(self):
        cord = make_cord(tensile_n=13344.0)
        event = make_event(cord=cord)
        expected = 13344.0 / event.f_peak_n
        assert abs(event.cord_fos - expected) < 1e-9

    def test_quick_link_fos_computed_when_provided(self):
        ql = make_quick_link(tensile_n=10000.0)
        event = make_event(quick_link=ql)
        assert event.quick_link_fos is not None
        expected = 10000.0 / event.f_peak_n
        assert abs(event.quick_link_fos - expected) < 1e-9

    def test_quick_link_fos_none_when_not_provided(self):
        event = make_event(quick_link=None)
        assert event.quick_link_fos is None

    def test_limiting_fos_is_minimum_of_cord_and_ql(self):
        # Give quick link a lower strength than the cord
        cord = make_cord(tensile_n=13344.0)
        ql = make_quick_link(tensile_n=5000.0)
        event = make_event(cord=cord, quick_link=ql)
        assert event.limiting_fos == event.quick_link_fos
        assert event.limiting_fos <= event.cord_fos

    def test_limiting_fos_is_cord_when_no_ql(self):
        event = make_event(quick_link=None)
        assert event.limiting_fos == event.cord_fos


# ── Result tier classification ────────────────────────────────────────────────

class TestResultTierClassification:
    def test_pass_when_fos_exceeds_target(self):
        # Strong cord + low velocity → high FOS → PASS
        cord = make_cord(tensile_n=100_000.0, cord_length_m=6.0)
        event = make_event(velocity=5.0, cord=cord, target_fos=4.0)
        assert event.result_tier == RESULT_PASS

    def test_fail_when_fos_well_below_target(self):
        # Weak cord + high velocity → low FOS → FAIL
        cord = make_cord(tensile_n=500.0, cord_length_m=1.0)
        event = make_event(velocity=40.0, cord=cord, target_fos=4.0)
        assert event.result_tier == RESULT_FAIL

    def test_warning_when_fos_just_below_target(self):
        # Craft a scenario where FOS is just inside the warning band (90–100% of target)
        # Use binary-search logic: find a tensile strength where
        # target * 0.9 <= FOS < target
        cord = make_cord(cord_length_m=6.0, elongation_pct=15.0)
        target_fos = 4.0
        # Calculate the F_peak for our standard scenario first
        from physics.fos_calculator import (
            calc_reduced_mass, calc_kinetic_energy, calc_delta_x, calc_f_peak
        )
        rm = calc_reduced_mass(1.5, 4.0)
        ke = calc_kinetic_energy(rm, 10.0)
        dx = calc_delta_x(6.0, 15.0)
        fp = calc_f_peak(ke, dx)

        # Set tensile strength to give FOS of exactly target * 0.95 (in the warning band)
        tensile_for_warning = target_fos * 0.95 * fp
        cord_warning = make_cord(
            tensile_n=tensile_for_warning,
            cord_length_m=6.0,
            elongation_pct=15.0,
        )
        event = make_event(velocity=10.0, cord=cord_warning, target_fos=target_fos)
        assert event.result_tier == RESULT_WARNING

    def test_passes_target_at_exact_target_fos(self):
        from physics.fos_calculator import (
            calc_reduced_mass, calc_kinetic_energy, calc_delta_x, calc_f_peak
        )
        rm = calc_reduced_mass(1.5, 4.0)
        ke = calc_kinetic_energy(rm, 10.0)
        dx = calc_delta_x(3.0, 15.0)
        fp = calc_f_peak(ke, dx)
        target = 4.0
        cord = make_cord(tensile_n=target * fp, cord_length_m=3.0, elongation_pct=15.0)
        event = make_event(velocity=10.0, cord=cord, target_fos=target)
        assert event.result_tier == RESULT_PASS


# ── Back-calculated required strength ────────────────────────────────────────

class TestRequiredTensileStrength:
    def test_back_calc_equals_target_times_fpeak(self):
        event = make_event(target_fos=4.0)
        expected = 4.0 * event.f_peak_n
        assert abs(event.required_tensile_strength_n - expected) < 1e-6


# ── Error handling for bad inputs ─────────────────────────────────────────────

class TestDeploymentEventErrorHandling:
    def test_invalid_cord_missing_elongation(self):
        bad_cord = Component(
            id="bad",
            name="Bad Cord",
            manufacturer="Test",
            category="shock_cord",
            compatible_architectures=["all"],
            tensile_strength_n=13344.0,
            elongation_percentage=None,  # Missing!
            cord_length_m=3.0,
            packed_volume_cm3=100.0,
            mass_g=100.0,
        )
        event = make_event(cord=bad_cord)
        assert not event.ok
        assert event.error_message is not None

    def test_invalid_zero_mass(self):
        event = make_event(m1=0.0)
        assert not event.ok

    def test_result_tier_is_fail_on_error(self):
        bad_cord = Component(
            id="bad2",
            name="Bad Cord 2",
            manufacturer="Test",
            category="shock_cord",
            compatible_architectures=["all"],
            tensile_strength_n=13344.0,
            elongation_percentage=0.0,  # Zero → division by zero path
            cord_length_m=3.0,
            packed_volume_cm3=100.0,
            mass_g=100.0,
        )
        event = make_event(cord=bad_cord)
        assert event.result_tier == RESULT_FAIL
