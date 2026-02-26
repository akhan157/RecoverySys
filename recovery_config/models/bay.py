"""
bay.py — RecoveryBay

A RecoveryBay is an internal cylindrical compartment that houses recovery
hardware. It is distinct from a RocketSection: a Section is what physically
separates; a Bay is the interior space on one side of a separation joint.

VOLUME TRACKING MODEL:
  gross_volume        — full cylinder: π * r² * L
  usable_volume       — gross minus bulkhead thickness allowances
  packed_component_volumes — sum of packed_volume_cm3 for each assigned component
  available_volume    — usable minus packed (must remain > 0 for a valid config)

EJECTION CHARGE LINK:
  Each bay that uses EJECTION_CHARGE or HYBRID separation has exactly one
  ejection charge event. The charge size is calculated in physics.py using the
  bay's usable volume and altitude (air density correction).

SECTION LINKING:
  section_above_id and section_below_id are the names of the two RocketSection
  objects connected by this bay's separation joint. The physics engine uses
  both section masses to calculate snatch force on the shock cord anchored here.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from ..enums import BayRole, SeparationMechanism


@dataclass
class RecoveryBay:
    """
    One internal recovery compartment with volume tracking.

    Attributes
    ----------
    name : str
        e.g. "Forward Main Bay", "Aft Drogue Bay", "Shared Recovery Bay"
    role : BayRole
        Semantic classification used for UI routing and validation.
    inner_diameter_mm : float
        Inner diameter of the body tube at this bay location.
    length_mm : float
        Usable interior length (exclude bulkhead thickness from this measurement).
    separation_mechanism : SeparationMechanism
        How the joint at the aft end of this bay opens.
    section_above_id : str
        Name of the RocketSection directly above (nose-side of) this joint.
    section_below_id : str
        Name of the RocketSection directly below (aft-side of) this joint.
    assigned_component_ids : list[str]
        Component IDs packed into this bay. Populated by the assembly engine.
    shear_pin_count : int
        Number of shear pins holding this joint closed. Used in ejection charge
        sizing (each pin adds resistance the charge must overcome).
    """

    name: str
    role: BayRole
    inner_diameter_mm: float
    length_mm: float
    separation_mechanism: SeparationMechanism
    section_above_id: str
    section_below_id: str

    assigned_component_ids: list[str] = field(default_factory=list)
    shear_pin_count: int = 2

    # ── Volume calculations ───────────────────────────────────────────────────

    @property
    def gross_volume_cm3(self) -> float:
        """Full cylindrical interior volume."""
        r_cm = (self.inner_diameter_mm / 2.0) / 10.0
        l_cm = self.length_mm / 10.0
        return math.pi * (r_cm ** 2) * l_cm

    def packed_volume_cm3(self, component_volumes: dict[str, float]) -> float:
        """
        Total packed volume of all components assigned to this bay.

        Parameters
        ----------
        component_volumes : dict[str, float]
            Mapping of {component_id: packed_volume_cm3} for the full
            component inventory. Only IDs in assigned_component_ids are summed.
        """
        return sum(
            component_volumes.get(cid, 0.0)
            for cid in self.assigned_component_ids
        )

    def available_volume_cm3(self, component_volumes: dict[str, float]) -> float:
        """
        Remaining free volume after packing. Must be >= 0 for a valid config.
        A value < 0 means the selected components physically do not fit.
        """
        return self.gross_volume_cm3 - self.packed_volume_cm3(component_volumes)

    def packing_utilization(self, component_volumes: dict[str, float]) -> float:
        """Fraction of gross volume consumed by packed components (0.0–1.0+)."""
        if self.gross_volume_cm3 == 0:
            return float("inf")
        return self.packed_volume_cm3(component_volumes) / self.gross_volume_cm3

    # ── Helpers ───────────────────────────────────────────────────────────────

    def assign_component(self, component_id: str) -> None:
        if component_id not in self.assigned_component_ids:
            self.assigned_component_ids.append(component_id)

    def remove_component(self, component_id: str) -> None:
        self.assigned_component_ids = [
            cid for cid in self.assigned_component_ids if cid != component_id
        ]

    def __repr__(self) -> str:
        return (
            f"RecoveryBay(name={self.name!r}, role={self.role.value}, "
            f"ID={self.inner_diameter_mm:.0f}mm x L={self.length_mm:.0f}mm, "
            f"gross={self.gross_volume_cm3:.1f} cm³)"
        )
