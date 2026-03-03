"""RocketSection — one physical segment of the rocket with its own mass."""

from dataclasses import dataclass, field


@dataclass
class RocketSection:
    """
    A single airframe segment (e.g. nose cone, payload bay, booster).

    Attributes:
        name:    Human-readable label for this section.
        mass_kg: Total mass of this section in kilograms (including all
                 internal components, motor propellant, etc.).
    """

    name: str = ""
    mass_kg: float = 0.0

    def is_valid(self) -> bool:
        return bool(self.name) and self.mass_kg > 0
