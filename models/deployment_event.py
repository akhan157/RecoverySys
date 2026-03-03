"""
DeploymentEvent — runtime-calculated two-body FOS model for one deployment.

Takes section masses, velocity, and shock cord as inputs and exposes
all intermediate and final computed values as properties.
Physics delegated entirely to fos_calculator.py pure functions.
"""

from dataclasses import dataclass
from typing import Optional

from models.component import Component
from physics.fos_calculator import (
    calc_reduced_mass,
    calc_kinetic_energy,
    calc_delta_x,
    calc_f_peak,
    calc_fos,
    PhysicsInputError,
)


# Result tier constants
RESULT_PASS = "pass"
RESULT_WARNING = "warning"
RESULT_FAIL = "fail"

# Warning band: FOS within 10% below target is a warning, not a hard fail
WARNING_BAND = 0.10


@dataclass
class DeploymentEvent:
    """
    A single shock cord deployment event with computed FOS values.

    Attributes (inputs):
        event_name:  Display label for this event (e.g. "Drogue Deployment").
        m1_kg:       Mass of body 1 at separation in kilograms.
        m2_kg:       Mass of body 2 at separation in kilograms.
        velocity_ms: Relative velocity at cord engagement in m/s.
        shock_cord:  Component with cord_length_m, elongation_percentage,
                     and tensile_strength_n populated.
        quick_link:  Optional Component with tensile_strength_n (the
                     quick link connecting cord to airframe or parachute).
        target_fos:  Target minimum FOS, used for result tier classification.
    """

    event_name: str
    m1_kg: float
    m2_kg: float
    velocity_ms: float
    shock_cord: Component
    quick_link: Optional[Component]
    target_fos: float

    # Cached computed values (populated on first access via _compute)
    _computed: bool = False
    _reduced_mass_kg: float = 0.0
    _kinetic_energy_j: float = 0.0
    _delta_x_m: float = 0.0
    _f_peak_n: float = 0.0
    _cord_fos: float = 0.0
    _quick_link_fos: Optional[float] = None
    _compute_error: Optional[str] = None

    def __post_init__(self) -> None:
        self._run_computation()

    def _run_computation(self) -> None:
        """Execute the full calculation chain. Stores error string on failure."""
        try:
            self._reduced_mass_kg = calc_reduced_mass(self.m1_kg, self.m2_kg)
            self._kinetic_energy_j = calc_kinetic_energy(
                self._reduced_mass_kg, self.velocity_ms
            )
            self._delta_x_m = calc_delta_x(
                self.shock_cord.cord_length_m,
                self.shock_cord.elongation_percentage,
            )
            self._f_peak_n = calc_f_peak(self._kinetic_energy_j, self._delta_x_m)
            self._cord_fos = calc_fos(self.shock_cord.tensile_strength_n, self._f_peak_n)

            if self.quick_link is not None and self.quick_link.tensile_strength_n:
                self._quick_link_fos = calc_fos(
                    self.quick_link.tensile_strength_n, self._f_peak_n
                )
            else:
                self._quick_link_fos = None

            self._computed = True
        except PhysicsInputError as exc:
            self._compute_error = str(exc)
            self._computed = False

    # ── Computed properties ──────────────────────────────────────────────────

    @property
    def ok(self) -> bool:
        """True if computation completed without error."""
        return self._computed

    @property
    def error_message(self) -> Optional[str]:
        return self._compute_error

    @property
    def reduced_mass_kg(self) -> float:
        return self._reduced_mass_kg

    @property
    def kinetic_energy_j(self) -> float:
        return self._kinetic_energy_j

    @property
    def delta_x_m(self) -> float:
        return self._delta_x_m

    @property
    def f_peak_n(self) -> float:
        return self._f_peak_n

    @property
    def cord_fos(self) -> float:
        return self._cord_fos

    @property
    def quick_link_fos(self) -> Optional[float]:
        return self._quick_link_fos

    @property
    def limiting_fos(self) -> float:
        """Lowest FOS across all structural components for this event."""
        candidates = [self._cord_fos]
        if self._quick_link_fos is not None:
            candidates.append(self._quick_link_fos)
        return min(candidates) if candidates else 0.0

    @property
    def limiting_component_name(self) -> str:
        """Name of the component that produces the limiting FOS."""
        if self._quick_link_fos is not None and self._quick_link_fos < self._cord_fos:
            return self.quick_link.name if self.quick_link else "Quick Link"
        return self.shock_cord.name

    @property
    def result_tier(self) -> str:
        """
        Three-tier classification:
          RESULT_PASS    — limiting_fos >= target_fos
          RESULT_WARNING — limiting_fos in [target_fos*(1-WARNING_BAND), target_fos)
          RESULT_FAIL    — limiting_fos < target_fos*(1-WARNING_BAND)
        """
        if not self._computed:
            return RESULT_FAIL
        if self.limiting_fos >= self.target_fos:
            return RESULT_PASS
        if self.limiting_fos >= self.target_fos * (1 - WARNING_BAND):
            return RESULT_WARNING
        return RESULT_FAIL

    @property
    def required_tensile_strength_n(self) -> float:
        """
        Back-calculated tensile strength (N) the limiting component would
        need in order to exactly meet target_fos. Useful for FAIL state
        actionable message.
        """
        return self.target_fos * self._f_peak_n
