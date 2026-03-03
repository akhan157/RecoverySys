"""Rocket — top-level model that holds the complete rocket configuration."""

from dataclasses import dataclass, field
from typing import Optional

from models.rocket_section import RocketSection
from models.recovery_bay import RecoveryBay


@dataclass
class Rocket:
    """
    The complete rocket configuration being evaluated.

    Built incrementally across the 5 wizard screens and read by
    ResultsRenderer to assemble DeploymentEvent objects.

    Attributes:
        architecture:              Architecture key (matches ARCHITECTURES dict).
        sections:                  Ordered list of RocketSection objects.
                                   Index 0 is the forwardmost section.
        recovery_bays:             Dict of bay_label → RecoveryBay.
        velocity_at_apogee_ms:     Rocket velocity at apogee in m/s.
                                   For rockets with coast phase this is near 0;
                                   for boost-to-apogee designs it may be higher.
        drogue_descent_rate_ms:    Terminal velocity under drogue in m/s.
        target_main_descent_rate_ms: Target touchdown velocity under main in m/s.
        target_fos:                Minimum acceptable Factor of Safety.
    """

    architecture: str = ""
    sections: list = field(default_factory=list)
    recovery_bays: dict = field(default_factory=dict)
    velocity_at_apogee_ms: float = 30.0
    drogue_descent_rate_ms: float = 30.0
    target_main_descent_rate_ms: float = 6.0
    target_fos: float = 4.0

    def get_velocity(self, source_key: str) -> float:
        """
        Resolve a velocity_source key from the architecture config to
        the corresponding numeric value on this Rocket instance.

        Args:
            source_key: One of "velocity_at_apogee_ms", "drogue_descent_rate_ms",
                        "target_main_descent_rate_ms".

        Returns:
            Velocity in m/s.

        Raises:
            KeyError: If source_key is not a recognised velocity field.
        """
        mapping = {
            "velocity_at_apogee_ms": self.velocity_at_apogee_ms,
            "drogue_descent_rate_ms": self.drogue_descent_rate_ms,
            "target_main_descent_rate_ms": self.target_main_descent_rate_ms,
        }
        if source_key not in mapping:
            raise KeyError(
                f"Unknown velocity_source key '{source_key}'. "
                f"Valid keys: {list(mapping.keys())}"
            )
        return mapping[source_key]

    def resolve_section_mass(self, index_spec) -> float:
        """
        Resolve a section_indices entry to a mass in kg.

        Supports:
          - int:  direct index into self.sections
          - "N+": sum of all sections from index N onward

        Args:
            index_spec: int or str (e.g. 0, 1, "1+", "2+")

        Returns:
            Total mass in kg for the resolved section(s).
        """
        if isinstance(index_spec, int):
            return self.sections[index_spec].mass_kg
        if isinstance(index_spec, str) and index_spec.endswith("+"):
            start = int(index_spec[:-1])
            return sum(s.mass_kg for s in self.sections[start:])
        raise ValueError(
            f"Invalid section index spec '{index_spec}'. "
            "Use an integer or 'N+' notation."
        )

    def to_dict(self) -> dict:
        """Serialize to a plain dict for export/debugging."""
        return {
            "architecture": self.architecture,
            "sections": [
                {"name": s.name, "mass_kg": s.mass_kg} for s in self.sections
            ],
            "recovery_bays": {
                label: {
                    "diameter_mm": bay.diameter_mm,
                    "length_mm": bay.length_mm,
                    "volume_cm3": round(bay.volume_cm3, 1),
                }
                for label, bay in self.recovery_bays.items()
            },
            "velocity_at_apogee_ms": self.velocity_at_apogee_ms,
            "drogue_descent_rate_ms": self.drogue_descent_rate_ms,
            "target_main_descent_rate_ms": self.target_main_descent_rate_ms,
            "target_fos": self.target_fos,
        }
