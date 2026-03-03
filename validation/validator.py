"""
Validation layer — per-screen input validation before the physics engine runs.

All validation functions return a ValidationResult. Hard errors block
navigation (Next button disabled). Soft warnings are displayed but do
not block navigation.

A final pre-physics guard validates that DeploymentEvent inputs are
physically sensible before any calculation is attempted.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FieldError:
    """A hard validation error that blocks screen progression."""
    field: str
    message: str


@dataclass
class FieldWarning:
    """A soft warning that is displayed but does not block progression."""
    field: str
    message: str


@dataclass
class ValidationResult:
    errors: list = field(default_factory=list)      # list[FieldError]
    warnings: list = field(default_factory=list)    # list[FieldWarning]

    @property
    def valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, field: str, message: str) -> None:
        self.errors.append(FieldError(field=field, message=message))

    def add_warning(self, field: str, message: str) -> None:
        self.warnings.append(FieldWarning(field=field, message=message))


# ── Screen 2: Bay Dimensions ──────────────────────────────────────────────────

def validate_screen2(bay_data: list[dict]) -> ValidationResult:
    """
    Validate recovery bay dimension inputs.

    Args:
        bay_data: List of dicts, one per bay.
                  Each dict: {"label": str, "diameter_mm": float, "length_mm": float}

    Returns:
        ValidationResult with errors and warnings.
    """
    result = ValidationResult()
    for bay in bay_data:
        label = bay.get("label", "Bay")
        diameter = bay.get("diameter_mm")
        length = bay.get("length_mm")

        if diameter is None or diameter <= 0:
            result.add_error(
                f"{label}_diameter",
                f"{label}: Diameter must be a positive number.",
            )
        elif diameter < 10:
            result.add_error(
                f"{label}_diameter",
                f"{label}: Diameter must be at least 10 mm.",
            )

        if length is None or length <= 0:
            result.add_error(
                f"{label}_length",
                f"{label}: Length must be a positive number.",
            )
        elif length < 50:
            result.add_error(
                f"{label}_length",
                f"{label}: Length must be at least 50 mm.",
            )
    return result


# ── Screen 3: Section Masses ──────────────────────────────────────────────────

def validate_screen3(section_data: list[dict]) -> ValidationResult:
    """
    Validate section mass inputs.

    Args:
        section_data: List of dicts, one per section.
                      Each dict: {"label": str, "mass_kg": float}
    """
    result = ValidationResult()
    total_mass = 0.0

    for sec in section_data:
        label = sec.get("label", "Section")
        mass = sec.get("mass_kg")

        if mass is None or not isinstance(mass, (int, float)):
            result.add_error(
                f"{label}_mass",
                f"{label}: Mass must be a number.",
            )
            continue

        if mass <= 0:
            result.add_error(
                f"{label}_mass",
                f"{label}: Mass must be greater than 0 kg.",
            )
            continue

        if mass > 50:
            result.add_warning(
                f"{label}_mass",
                f"{label}: Mass {mass:.1f} kg seems high — confirm units are kg, not lbs.",
            )

        total_mass += mass

    if total_mass > 150:
        result.add_warning(
            "total_mass",
            f"Total rocket mass ({total_mass:.1f} kg) exceeds typical HPR limits. "
            "Please verify all section masses.",
        )

    return result


# ── Screen 4: Descent Profile ─────────────────────────────────────────────────

def validate_screen4(profile_data: dict) -> ValidationResult:
    """
    Validate descent profile inputs.

    Args:
        profile_data: Dict with keys:
            velocity_at_apogee_ms, drogue_descent_rate_ms,
            target_main_descent_rate_ms, target_fos
    """
    result = ValidationResult()

    apogee_v = profile_data.get("velocity_at_apogee_ms")
    drogue = profile_data.get("drogue_descent_rate_ms")
    main = profile_data.get("target_main_descent_rate_ms")
    fos = profile_data.get("target_fos")

    if apogee_v is None or apogee_v <= 0:
        result.add_error(
            "velocity_at_apogee_ms",
            "Velocity at apogee must be a positive number (m/s).",
        )

    if drogue is None or not (1 <= drogue <= 100):
        result.add_error(
            "drogue_descent_rate_ms",
            "Drogue descent rate must be between 1 and 100 m/s.",
        )

    if main is None or not (1 <= main <= 20):
        result.add_error(
            "target_main_descent_rate_ms",
            "Main descent rate must be between 1 and 20 m/s.",
        )

    if drogue is not None and main is not None and drogue > 0 and main > drogue:
        result.add_error(
            "target_main_descent_rate_ms",
            "Main descent rate should not exceed drogue descent rate.",
        )

    if fos is None or not (1.0 <= fos <= 20.0):
        result.add_error(
            "target_fos",
            "Target FOS must be between 1.0 and 20.0.",
        )

    return result


# ── Screen 5: Component Selection ────────────────────────────────────────────

def validate_screen5(
    required_cord_roles: list[str],
    selected_components: dict,
    bay_fill_fractions: dict[str, float],
) -> ValidationResult:
    """
    Validate component selections and bay volume usage.

    Args:
        required_cord_roles:  Cord role keys that must be filled
                              (from architecture deployment_events).
        selected_components:  Dict of role_key → Component.
        bay_fill_fractions:   Dict of bay_label → fill fraction (0.0–1.0+).
    """
    result = ValidationResult()

    for role in required_cord_roles:
        if role not in selected_components or selected_components[role] is None:
            label = role.replace("_", " ").title()
            result.add_error(
                role,
                f"A shock cord is required for '{label}' before calculating.",
            )

    for bay_label, fraction in bay_fill_fractions.items():
        if fraction > 1.0:
            result.add_error(
                f"{bay_label}_volume",
                f"{bay_label}: Selected components exceed available bay volume "
                f"({fraction * 100:.0f}% used). Remove a component or choose a larger bay.",
            )
        elif fraction > 0.85:
            result.add_warning(
                f"{bay_label}_volume",
                f"{bay_label}: Bay is {fraction * 100:.0f}% full. "
                "Ensure components can be packed safely.",
            )

    return result


# ── Pre-physics guard ─────────────────────────────────────────────────────────

def validate_physics_inputs(rocket, selected_components: dict) -> ValidationResult:
    """
    Final sanity check before DeploymentEvent objects are constructed.
    Validates that all physics inputs are physically sensible.

    Args:
        rocket:               Completed Rocket object.
        selected_components:  Dict of role_key → Component.
    """
    result = ValidationResult()

    for section in rocket.sections:
        if section.mass_kg <= 0:
            result.add_error(
                "section_mass",
                f"Section '{section.name}' has mass <= 0. Cannot compute FOS.",
            )

    for role, component in selected_components.items():
        if component is None:
            continue
        if component.category != "shock_cord":
            continue

        label = role.replace("_", " ").title()

        if not component.elongation_percentage or component.elongation_percentage <= 0:
            result.add_error(
                role,
                f"{label}: elongation_percentage must be > 0. "
                "Check the component catalog entry.",
            )

        if not component.cord_length_m or component.cord_length_m <= 0:
            result.add_error(
                role,
                f"{label}: cord_length_m must be > 0. "
                "Check the component catalog entry.",
            )

        if not component.tensile_strength_n or component.tensile_strength_n <= 0:
            result.add_error(
                role,
                f"{label}: tensile_strength_n must be > 0. "
                "Check the component catalog entry.",
            )

        # Pre-check delta_x to surface division-by-zero before it happens
        if (
            component.cord_length_m
            and component.elongation_percentage
            and component.cord_length_m * (component.elongation_percentage / 100.0) <= 0
        ):
            result.add_error(
                role,
                f"{label}: Computed cord extension is zero — FOS would be undefined.",
            )

    return result
