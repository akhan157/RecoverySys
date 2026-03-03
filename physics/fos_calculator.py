"""
Physics engine — pure functions only.

No imports from models, Streamlit, or session state.
All functions are stateless and raise PhysicsInputError on invalid inputs.
This module is the ground truth for all FOS calculations and is
independently unit-testable without any Streamlit context.

Equations implemented:
  reduced_mass   = (m1 * m2) / (m1 + m2)             [kg]
  KE             = 0.5 * reduced_mass * velocity^2    [J]
  delta_x        = cord_length * (elongation / 100)   [m]
  F_peak         = (2 * KE) / delta_x                 [N]
  FOS            = tensile_strength / F_peak           [dimensionless]
"""


class PhysicsInputError(ValueError):
    """Raised when a physics function receives an invalid input."""

    def __init__(self, field: str, message: str) -> None:
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


def _require_positive(value: float, field: str) -> None:
    """Raise PhysicsInputError if value is not a finite positive number."""
    if not isinstance(value, (int, float)):
        raise PhysicsInputError(field, f"Must be a number, got {type(value).__name__}")
    if value != value:  # NaN check
        raise PhysicsInputError(field, "Must be a finite number, got NaN")
    if value <= 0:
        raise PhysicsInputError(field, f"Must be greater than 0, got {value}")


def calc_reduced_mass(m1_kg: float, m2_kg: float) -> float:
    """
    Compute the reduced mass of two colliding bodies.

    Args:
        m1_kg: Mass of body 1 in kilograms.
        m2_kg: Mass of body 2 in kilograms.

    Returns:
        Reduced mass in kilograms.

    Raises:
        PhysicsInputError: If either mass is not a positive number.
    """
    _require_positive(m1_kg, "m1_kg")
    _require_positive(m2_kg, "m2_kg")
    return (m1_kg * m2_kg) / (m1_kg + m2_kg)


def calc_kinetic_energy(reduced_mass_kg: float, velocity_ms: float) -> float:
    """
    Compute the kinetic energy at the moment of shock cord engagement.

    Args:
        reduced_mass_kg: Reduced mass of the two-body system in kg.
        velocity_ms:     Relative velocity at cord engagement in m/s.

    Returns:
        Kinetic energy in Joules.

    Raises:
        PhysicsInputError: If either argument is not a positive number.
    """
    _require_positive(reduced_mass_kg, "reduced_mass_kg")
    _require_positive(velocity_ms, "velocity_ms")
    return 0.5 * reduced_mass_kg * (velocity_ms ** 2)


def calc_delta_x(cord_length_m: float, elongation_percentage: float) -> float:
    """
    Compute the maximum elastic extension of the shock cord.

    Args:
        cord_length_m:        Natural (unstretched) cord length in metres.
        elongation_percentage: Maximum elongation as a percentage (e.g. 30 for 30%).

    Returns:
        Maximum extension delta_x in metres.

    Raises:
        PhysicsInputError: If either argument is not positive, or if the resulting
                           delta_x is zero (which would cause division by zero in
                           calc_f_peak).
    """
    _require_positive(cord_length_m, "cord_length_m")
    _require_positive(elongation_percentage, "elongation_percentage")
    delta_x = cord_length_m * (elongation_percentage / 100.0)
    if delta_x <= 0:
        raise PhysicsInputError(
            "delta_x",
            "Computed cord extension is zero or negative. "
            "Check cord_length_m and elongation_percentage.",
        )
    return delta_x


def calc_f_peak(kinetic_energy_j: float, delta_x_m: float) -> float:
    """
    Compute the peak impulsive force on the shock cord using the
    energy method (work-energy theorem for elastic cord):
        F_peak = (2 * KE) / delta_x

    Args:
        kinetic_energy_j: Kinetic energy at cord engagement in Joules.
        delta_x_m:        Elastic extension of the cord in metres.

    Returns:
        Peak force in Newtons.

    Raises:
        PhysicsInputError: If either argument is not a positive number.
    """
    _require_positive(kinetic_energy_j, "kinetic_energy_j")
    _require_positive(delta_x_m, "delta_x_m")
    return (2.0 * kinetic_energy_j) / delta_x_m


def calc_fos(tensile_strength_n: float, f_peak_n: float) -> float:
    """
    Compute the Factor of Safety for a structural component.

    Args:
        tensile_strength_n: Rated tensile strength of the component in Newtons.
        f_peak_n:           Peak applied force in Newtons.

    Returns:
        Factor of Safety (dimensionless). Values >= target_fos are safe.

    Raises:
        PhysicsInputError: If either argument is not a positive number.
    """
    _require_positive(tensile_strength_n, "tensile_strength_n")
    _require_positive(f_peak_n, "f_peak_n")
    return tensile_strength_n / f_peak_n
