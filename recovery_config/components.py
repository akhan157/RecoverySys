"""
components.py — Component class hierarchy

Design principles:
  1. Component is the base class. It holds everything the database and UI need.
  2. Subclasses add type-specific physics fields and methods.
  3. Architecture compatibility is enforced via two layers:
       - compatible_architectures: hard filter (set membership check)
       - constraint_tags: soft labels the UI interprets contextually
  4. The JSON component database stores each record flat (see component_db.json).
     The loader (db.py, to be written) deserializes into the correct subclass
     based on the 'component_type' field.

ARCHITECTURE TAG CONTRACT:
  A component with compatible_architectures = {all three} is universally usable.
  A component that omits an architecture is hidden in the UI when that arch is
  selected. This prevents, for example, a Jolly Logic Chute Release from
  appearing in a Dual-Sep build.

CONSTRAINT TAG EXAMPLES (free-form strings, enumerated here for reference):
  "requires_shared_bay"       — must be in a SHARED_BAY role bay
  "requires_dual_channel"     — altimeter needs 2+ pyro outputs
  "no_ejection_for_main"      — main is deployed mechanically, not by charge
  "max_tube_diameter_3in"     — won't fit in 3" or smaller airframe
  "redundancy_recommended"    — NAR/TRA safety recommendation for this component
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from .enums import ComponentType, RecoveryArchitecture

_ALL_ARCHITECTURES: frozenset[RecoveryArchitecture] = frozenset(RecoveryArchitecture)


# ─────────────────────────────────────────────────────────────────────────────
# BASE COMPONENT
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Component:
    """
    Base class for all recovery system components.

    Attributes
    ----------
    id : str
        Unique slug, e.g. "fruity_chutes_iris_ultra_36".
    manufacturer : str
    model_name : str
    component_type : ComponentType
    mass_kg : float
        Dry mass of the component as it would be packed for flight.
    packed_volume_cm3 : float
        Volume of the component when packed (chutes in deployment bag,
        cords coiled, altimeters with sled, etc.).
    unit_cost_usd : float
    compatible_architectures : frozenset[RecoveryArchitecture]
        Architectures this component is valid for. The UI hides incompatible
        components. Default: all architectures.
    constraint_tags : frozenset[str]
        Soft constraint labels. See module docstring for examples.
    datasheet_url : str
        Link to manufacturer datasheet or product page.
    """

    id: str
    manufacturer: str
    model_name: str
    component_type: ComponentType
    mass_kg: float
    packed_volume_cm3: float
    unit_cost_usd: float = 0.0
    compatible_architectures: frozenset[RecoveryArchitecture] = field(
        default_factory=lambda: _ALL_ARCHITECTURES
    )
    constraint_tags: frozenset[str] = field(default_factory=frozenset)
    datasheet_url: str = ""

    def is_compatible_with(self, architecture: RecoveryArchitecture) -> bool:
        return architecture in self.compatible_architectures

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(id={self.id!r}, model={self.model_name!r})"


# ─────────────────────────────────────────────────────────────────────────────
# PARACHUTE  (main or drogue)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Parachute(Component):
    """
    Drag-producing recovery canopy.

    The terminal_velocity method is the primary physics output. It is called
    twice per deployment event: once for the section mass it is decelerating,
    and once (for main chutes) to verify the descent rate meets range safety
    requirements (typically < 9 m/s for HPR).

    Attributes
    ----------
    nominal_diameter_m : float
        Inflated diameter. For toroidal chutes, this is the outer diameter.
    drag_coefficient : float
        Cd values by type (approximate):
          - Flat circular:  0.75
          - Hemispherical:  0.80
          - Elliptical:     1.0
          - Toroidal:       1.5–2.2
          - Cruciform:      0.65
    deployment_bag_included : bool
        Whether a deployment bag is included in the packed_volume_cm3 figure.
    """

    nominal_diameter_m: float = 0.0
    drag_coefficient: float = 0.75
    material: str = ""
    deployment_bag_included: bool = False

    def reference_area_m2(self) -> float:
        return math.pi * (self.nominal_diameter_m / 2.0) ** 2

    def terminal_velocity_ms(
        self,
        suspended_mass_kg: float,
        air_density_kgm3: float,
    ) -> float:
        """
        Steady-state descent velocity under this canopy.

        Vt = sqrt( 2 * W / (ρ * Cd * A) )

        Parameters
        ----------
        suspended_mass_kg : float
            Mass hanging below the chute (the section it is decelerating).
        air_density_kgm3 : float
            Air density at deployment altitude. Compute with physics.isa_density().
        """
        area = self.reference_area_m2()
        denom = air_density_kgm3 * self.drag_coefficient * area
        if denom == 0:
            return float("inf")
        weight_n = suspended_mass_kg * 9.81
        return math.sqrt(2 * weight_n / denom)


# ─────────────────────────────────────────────────────────────────────────────
# SHOCK CORD
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ShockCord(Component):
    """
    Elastic tether connecting two sections across a separation joint.

    The FOS calculation here uses the two-body reduced-mass impulse model,
    which is the physically correct approach for a snatch load:

      F_snatch = μ * v² / δ
      where μ = (m1 * m2) / (m1 + m2)  [reduced mass]
            v = relative velocity at cord taut (≈ deployment velocity)
            δ = cord elongation distance = length * elongation_fraction

    FOS = tensile_strength_n / F_snatch

    Typical minimum acceptable FOS values (per Tripoli/NAR guidance):
      - Shock cords: 4:1
      - Quick links:  4:1
      - Eye nuts:     4:1

    Attributes
    ----------
    length_m : float
        Unstretched cord length. Longer cords reduce snatch force (more δ).
    material : str
        e.g. "tubular_nylon", "flat_nylon", "kevlar", "elastic_bungee"
    tensile_strength_n : float
        Rated minimum breaking strength in Newtons.
    elongation_fraction : float
        Fraction of cord length that constitutes elastic stretch at peak load.
        Tubular nylon: ~0.10–0.15. Kevlar: ~0.02. Bungee: ~0.50+.
    """

    length_m: float = 0.0
    material: str = ""
    tensile_strength_n: float = 0.0
    elongation_fraction: float = 0.12

    def snatch_force_n(
        self,
        mass_above_kg: float,
        mass_below_kg: float,
        deployment_velocity_ms: float,
    ) -> float:
        """
        Peak snatch force using the reduced-mass model.

        Parameters
        ----------
        mass_above_kg : float
            Total mass of the section above the separation joint.
        mass_below_kg : float
            Total mass of the section below the separation joint.
        deployment_velocity_ms : float
            Rocket velocity at ejection. For drogue: ~0. For main: descent vel.
        """
        if mass_above_kg + mass_below_kg == 0:
            return 0.0
        mu = (mass_above_kg * mass_below_kg) / (mass_above_kg + mass_below_kg)
        delta_m = self.length_m * self.elongation_fraction
        if delta_m == 0:
            return float("inf")
        return mu * (deployment_velocity_ms ** 2) / delta_m

    def factor_of_safety(
        self,
        mass_above_kg: float,
        mass_below_kg: float,
        deployment_velocity_ms: float,
    ) -> float:
        """
        FOS = rated_tensile_strength / peak_snatch_force.
        Returns inf if snatch force is zero (static/zero-velocity deployment).
        """
        f = self.snatch_force_n(mass_above_kg, mass_below_kg, deployment_velocity_ms)
        if f == 0:
            return float("inf")
        return self.tensile_strength_n / f


# ─────────────────────────────────────────────────────────────────────────────
# RIGGING HARDWARE (quick links, eye nuts, swivels)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class RiggingHardware(Component):
    """
    Load-bearing hardware in the recovery train (quick links, eye nuts, etc.).
    FOS is calculated the same way as ShockCord — same snatch force, different
    rated strength. Every piece in the recovery train must pass the FOS check.

    Attributes
    ----------
    working_load_limit_n : float
        WLL (working load limit) as rated by manufacturer.
    minimum_breaking_strength_n : float
        MBS — what actually breaks it. Use this for FOS calculations, not WLL.
    """

    working_load_limit_n: float = 0.0
    minimum_breaking_strength_n: float = 0.0

    def factor_of_safety(self, peak_snatch_force_n: float) -> float:
        if peak_snatch_force_n == 0:
            return float("inf")
        return self.minimum_breaking_strength_n / peak_snatch_force_n


# ─────────────────────────────────────────────────────────────────────────────
# ALTIMETER / FLIGHT COMPUTER
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Altimeter(Component):
    """
    Barometric flight computer with pyrotechnic output channels.

    channel_count drives compatibility with deployment architectures:
      - 1 channel: can trigger apogee event only → SINGLE_DEPLOY or
                   DUAL_DEPLOY_SINGLE_SEP with mechanical main release
      - 2 channels: full dual-deploy capability

    Attributes
    ----------
    channel_count : int
        Number of independent pyro output channels.
    max_altitude_m : float
        Manufacturer-rated maximum operating altitude.
    has_gps : bool
    has_logging : bool
    """

    channel_count: int = 2
    max_altitude_m: float = 30000.0
    has_gps: bool = False
    has_logging: bool = True

    def __post_init__(self) -> None:
        if self.channel_count < 2:
            # Single-channel altimeters cannot drive dual-deploy without help
            object.__setattr__(
                self,
                "compatible_architectures",
                frozenset({
                    RecoveryArchitecture.SINGLE_DEPLOY,
                    RecoveryArchitecture.DUAL_DEPLOY_SINGLE_SEP,
                }),
            )
            object.__setattr__(
                self,
                "constraint_tags",
                self.constraint_tags | frozenset({"requires_mechanical_main_release"}),
            )


# ─────────────────────────────────────────────────────────────────────────────
# MECHANICAL RELEASE (e.g. Jolly Logic Chute Release)
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class MechanicalRelease(Component):
    """
    Altitude-triggered mechanical device that releases the main parachute
    without a pyrotechnic charge.

    ARCHITECTURE CONSTRAINT (hard):
      Only valid for DUAL_DEPLOY_SINGLE_SEP. In a dual-sep rocket, the forward
      and aft bays are physically separated at different joints — the main chute
      is already in a dedicated bay opened by its own ejection charge, so a
      mechanical release has no role to play and would be hidden by the UI.

    HOW IT WORKS (single-sep context):
      Both drogue and main are packed in the shared bay (or the main is packed
      in a forward section accessible via the single separation joint). The
      drogue deploys at apogee. The Chute Release holds the main in its bag
      until the programmed altitude, then mechanically opens to let it inflate.
      This eliminates the need for a second ejection charge.

    Attributes
    ----------
    min_altitude_m / max_altitude_m : float
        Programmable altitude range for main deployment trigger.
    max_parachute_diameter_m : float
        Maximum main chute diameter the device can hold (physical size limit).
    """

    min_altitude_m: float = 30.0
    max_altitude_m: float = 914.0
    max_parachute_diameter_m: float = 1.22

    def __post_init__(self) -> None:
        # Hard-coded architecture restriction — see class docstring.
        object.__setattr__(
            self,
            "compatible_architectures",
            frozenset({RecoveryArchitecture.DUAL_DEPLOY_SINGLE_SEP}),
        )
        object.__setattr__(
            self,
            "constraint_tags",
            self.constraint_tags | frozenset({"requires_shared_bay", "no_ejection_for_main"}),
        )


# ─────────────────────────────────────────────────────────────────────────────
# EJECTION CANISTER / CHARGE HOLDER
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class EjectionCanister(Component):
    """
    Pyrotechnic charge holder (e-match + black powder or commercial charge).

    The calculated charge size is stored here after physics.ejection_charge_g()
    runs. This keeps the output co-located with the hardware that will hold it.

    Attributes
    ----------
    max_bay_volume_cm3 : float
        Maximum bay volume this canister is rated to pressurize safely.
    calculated_charge_g : float | None
        Set by the physics engine after the ejection charge calculation runs.
        None until the calculation is performed.
    """

    max_bay_volume_cm3: float = 0.0
    calculated_charge_g: float | None = None
