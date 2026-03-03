"""Component — a single physical recovery hardware item from the catalog."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Component:
    """
    A physical recovery component loaded from the component catalog.

    Attributes:
        id:                      Unique identifier (used as dict key).
        name:                    Display name (e.g. "Rocketman 36\" Nylon Chute").
        manufacturer:            Manufacturer name.
        category:                One of: parachute | shock_cord | quick_link |
                                 altimeter | other
        compatible_architectures: List of architecture keys this component is
                                  legal for. Use ["all"] to match every architecture.
        tensile_strength_n:      Rated tensile/breaking strength in Newtons.
                                 None for components that are not structural
                                 (e.g. parachutes, altimeters).
        elongation_percentage:   Maximum elastic elongation as a percentage
                                 of natural length (e.g. 30 for 30%).
                                 None for non-cord components.
        cord_length_m:           Natural (unstretched) length in metres.
                                 None for non-cord components.
        packed_volume_cm3:       Volume when packed/folded in cubic centimetres.
        mass_g:                  Component mass in grams.
        notes:                   Free-text notes (e.g. deployment bag type,
                                 temperature rating).
    """

    id: str = ""
    name: str = ""
    manufacturer: str = ""
    category: str = ""
    compatible_architectures: list = field(default_factory=list)
    tensile_strength_n: Optional[float] = None
    elongation_percentage: Optional[float] = None
    cord_length_m: Optional[float] = None
    packed_volume_cm3: float = 0.0
    mass_g: float = 0.0
    notes: str = ""

    def is_compatible_with(self, architecture_key: str) -> bool:
        """Return True if this component works with the given architecture."""
        return (
            "all" in self.compatible_architectures
            or architecture_key in self.compatible_architectures
        )

    def is_shock_cord(self) -> bool:
        return self.category == "shock_cord"

    def is_structural(self) -> bool:
        """Return True if this component has a tensile strength rating."""
        return self.tensile_strength_n is not None and self.tensile_strength_n > 0
