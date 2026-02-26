"""
rocket.py — Rocket (top-level vehicle object)

The Rocket object is the root of the configuration tree. Architecture is set
once at construction and drives all downstream validation constraints.

ARCHITECTURE ROUTING TABLE:
  ┌────────────────────────────┬──────────┬────────────┬───────┬──────────────┐
  │ Architecture               │ Sections │ Sep Joints │  Bays │ Ejec. Events │
  ├────────────────────────────┼──────────┼────────────┼───────┼──────────────┤
  │ SINGLE_DEPLOY              │    1     │     0      │  0–1  │      0       │
  │ DUAL_DEPLOY_SINGLE_SEP     │    2     │     1      │  1–2  │      1       │
  │ DUAL_DEPLOY_DUAL_SEP       │    3     │     2      │   2   │      2       │
  └────────────────────────────┴──────────┴────────────┴───────┴──────────────┘

SINGLE_SEP NOTE:
  In single-sep, a mechanical release (e.g. Jolly Logic) can replace the second
  ejection event. The bay count can be 1 (shared) or 2 (split electronics).
  The validation engine checks for this and routes accordingly.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from ..enums import RecoveryArchitecture

if TYPE_CHECKING:
    from .section import RocketSection
    from .bay import RecoveryBay
    from ..components import Component


# Architecture constraint lookup table.
# Tuple: (required_section_count, min_bays, max_bays, ejection_events)
_ARCH_CONSTRAINTS: dict[RecoveryArchitecture, tuple[int, int, int, int]] = {
    RecoveryArchitecture.SINGLE_DEPLOY:          (1, 0, 1, 0),
    RecoveryArchitecture.DUAL_DEPLOY_SINGLE_SEP: (2, 1, 2, 1),
    RecoveryArchitecture.DUAL_DEPLOY_DUAL_SEP:   (3, 2, 2, 2),
}


@dataclass
class Rocket:
    """
    Top-level vehicle definition.

    Attributes
    ----------
    name : str
        Project name, e.g. "RED II-MARY".
    architecture : RecoveryArchitecture
        Selected recovery architecture. Set once; changing it invalidates
        the section/bay/component configuration.
    sections : list[RocketSection]
        Ordered nose→aft. Count must satisfy architecture constraints.
    bays : list[RecoveryBay]
        Recovery compartments. Count must satisfy architecture constraints.
    components : dict[str, Component]
        Full inventory of components keyed by component_id. Components are
        assigned to specific bays via bay.assigned_component_ids.
    target_apogee_m : float
        Projected apogee in meters AGL. Used in ISA density lookups.
    drogue_deploy_velocity_ms : float
        Rocket velocity at apogee ejection (typically ~0 m/s for well-timed
        dual-deploy; may be non-zero if using barometric trigger with lag).
    main_deploy_altitude_m : float
        Target altitude AGL for main parachute deployment.
    main_deploy_velocity_ms : float
        Rocket velocity under drogue at main deployment altitude. This is the
        input to the shock cord snatch force calculation for the main event.
    launch_site_elevation_m : float
        Launch site elevation ASL. Used to compute air density at deployment
        altitudes correctly (AGL + elevation = ASL for ISA lookup).
    """

    name: str
    architecture: RecoveryArchitecture

    sections: list["RocketSection"] = field(default_factory=list)
    bays: list["RecoveryBay"] = field(default_factory=list)
    components: dict[str, "Component"] = field(default_factory=dict)

    # Flight parameters
    target_apogee_m: float = 0.0
    drogue_deploy_velocity_ms: float = 0.0
    main_deploy_altitude_m: float = 305.0   # 1000 ft AGL default
    main_deploy_velocity_ms: float = 0.0
    launch_site_elevation_m: float = 0.0

    # ── Architecture constraints ──────────────────────────────────────────────

    @property
    def _constraints(self) -> tuple[int, int, int, int]:
        return _ARCH_CONSTRAINTS[self.architecture]

    @property
    def required_section_count(self) -> int:
        return self._constraints[0]

    @property
    def min_bays(self) -> int:
        return self._constraints[1]

    @property
    def max_bays(self) -> int:
        return self._constraints[2]

    @property
    def ejection_event_count(self) -> int:
        return self._constraints[3]

    # ── Validation ───────────────────────────────────────────────────────────

    def validate(self) -> list[str]:
        """
        Returns a list of human-readable error strings.
        An empty list means the configuration is structurally valid.
        This does NOT validate physics (use physics.py for that).
        """
        errors: list[str] = []
        arch = self.architecture.value

        # Section count
        if len(self.sections) != self.required_section_count:
            errors.append(
                f"[Sections] '{arch}' requires exactly "
                f"{self.required_section_count} section(s), "
                f"got {len(self.sections)}."
            )

        # Bay count
        n_bays = len(self.bays)
        if not (self.min_bays <= n_bays <= self.max_bays):
            errors.append(
                f"[Bays] '{arch}' requires {self.min_bays}–{self.max_bays} "
                f"bay(s), got {n_bays}."
            )

        # Section IDs referenced by bays must exist
        section_names = {s.name for s in self.sections}
        for bay in self.bays:
            for ref in (bay.section_above_id, bay.section_below_id):
                if ref not in section_names:
                    errors.append(
                        f"[Bay '{bay.name}'] References unknown section "
                        f"'{ref}'. Valid sections: {sorted(section_names)}."
                    )

        # Component architecture compatibility
        for cid, comp in self.components.items():
            if not comp.is_compatible_with(self.architecture):
                errors.append(
                    f"[Component '{cid}'] '{comp.model_name}' is not "
                    f"compatible with architecture '{arch}'."
                )

        # Volume overflows
        packed_vols = {
            cid: comp.packed_volume_cm3
            for cid, comp in self.components.items()
        }
        for bay in self.bays:
            avail = bay.available_volume_cm3(packed_vols)
            if avail < 0:
                errors.append(
                    f"[Bay '{bay.name}'] Components overflow by "
                    f"{abs(avail):.1f} cm³. Reduce packed volume or "
                    f"increase bay length."
                )

        return errors

    # ── Convenience accessors ─────────────────────────────────────────────────

    def section_by_name(self, name: str) -> "RocketSection | None":
        return next((s for s in self.sections if s.name == name), None)

    def bay_by_name(self, name: str) -> "RecoveryBay | None":
        return next((b for b in self.bays if b.name == name), None)

    def add_component(self, component: "Component") -> None:
        self.components[component.id] = component

    def total_recovery_mass_kg(self) -> float:
        """Sum of all component masses. Does not include airframe sections."""
        return sum(c.mass_kg for c in self.components.values())

    def __repr__(self) -> str:
        return (
            f"Rocket(name={self.name!r}, "
            f"arch={self.architecture.value}, "
            f"sections={len(self.sections)}, "
            f"bays={len(self.bays)}, "
            f"components={len(self.components)})"
        )
