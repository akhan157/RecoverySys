"""RecoveryBay — a cylindrical airframe bay that houses recovery components."""

import math
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.component import Component


@dataclass
class RecoveryBay:
    """
    A cylindrical recovery bay with tracked packed-volume utilisation.

    Attributes:
        name:               Human-readable label (e.g. "Drogue Bay", "Main Bay").
        diameter_mm:        Inner diameter of the bay in millimetres.
        length_mm:          Usable length of the bay in millimetres.
        assigned_components: Components assigned to this bay.
    """

    name: str = ""
    diameter_mm: float = 0.0
    length_mm: float = 0.0
    assigned_components: list = field(default_factory=list)

    @property
    def volume_cm3(self) -> float:
        """Cylindrical volume of the bay in cubic centimetres."""
        if self.diameter_mm <= 0 or self.length_mm <= 0:
            return 0.0
        radius_cm = (self.diameter_mm / 2.0) / 10.0
        length_cm = self.length_mm / 10.0
        return math.pi * (radius_cm ** 2) * length_cm

    @property
    def packed_volume_used_cm3(self) -> float:
        """Sum of packed volumes of all assigned components."""
        return sum(c.packed_volume_cm3 for c in self.assigned_components)

    @property
    def available_volume_cm3(self) -> float:
        """Remaining usable volume in cubic centimetres."""
        return max(0.0, self.volume_cm3 - self.packed_volume_used_cm3)

    @property
    def fill_fraction(self) -> float:
        """Fraction of bay volume used (0.0 – 1.0+). >1.0 means overfull."""
        if self.volume_cm3 <= 0:
            return 0.0
        return self.packed_volume_used_cm3 / self.volume_cm3

    def is_valid(self) -> bool:
        return self.diameter_mm >= 10 and self.length_mm >= 50
