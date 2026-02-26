"""
section.py — RocketSection

A RocketSection represents one physical piece of the rocket that travels as a
free body after a separation event. This is the key concept that distinguishes
"sectional mass" from "total rocket mass."

WHY THIS MATTERS FOR SHOCK CORD FOS:
  When the ejection charge fires, the two sections connected by the shock cord
  are initially moving at the same velocity. As the cord plays out and goes
  taut, the snatch force is governed by the *reduced mass* of the two-body
  system. Using total rocket mass would overestimate the impulse and give a
  false sense of safety. Using just one section's mass underestimates it.
  The correct model uses both masses.

SECTION COUNTS BY ARCHITECTURE:
  SINGLE_DEPLOY          → 1 section  (no in-flight separation)
  DUAL_DEPLOY_SINGLE_SEP → 2 sections (one separation joint)
  DUAL_DEPLOY_DUAL_SEP   → 3 sections (two separation joints)

  For DUAL_DEPLOY_DUAL_SEP, ordered nose→aft:
    [0] Nosecone          — separates at apogee for drogue
    [1] Mid-Body + Avionics — stays with drogue cord
    [2] Aft Fin Can + Motor — lower section, carries propellant mass
"""

from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class RocketSection:
    """
    One separating physical piece of the rocket.

    Attributes
    ----------
    name : str
        Human-readable label, e.g. "Nosecone+Payload", "Aft Fin Can".
    dry_mass_kg : float
        Mass of this section with no propellant. Includes airframe, fins,
        any hardware permanently in this section.
    motor_mass_kg : float
        Total mass of motor assembly at the time of the relevant deployment
        event (casing + remaining propellant). Only non-zero for the aft
        section that carries the motor. At apogee most propellant is burned,
        but the casing mass remains.
    notes : str
        Optional field for component assembly notes (e.g. "Includes Raven4
        altimeter sled").
    """

    name: str
    dry_mass_kg: float
    motor_mass_kg: float = 0.0
    notes: str = ""

    # ── Derived properties ────────────────────────────────────────────────────

    @property
    def total_mass_kg(self) -> float:
        """Mass used in all dynamics calculations."""
        return self.dry_mass_kg + self.motor_mass_kg

    def kinetic_energy_at_deployment(self, velocity_ms: float) -> float:
        """
        Translational KE of this section at the instant of deployment.

        KE = 0.5 * m * v²

        This is used as a sanity-check input alongside the snatch force model.
        It also gives you the energy the shock cord must absorb if the cord
        is fully elastic (worst-case bound).

        Parameters
        ----------
        velocity_ms : float
            Rocket velocity at the moment the ejection charge fires.
            For drogue: ~0 m/s (apogee). For main: descent velocity at
            the programmed deployment altitude.
        """
        return 0.5 * self.total_mass_kg * (velocity_ms ** 2)

    def __repr__(self) -> str:
        return (
            f"RocketSection(name={self.name!r}, "
            f"dry={self.dry_mass_kg:.3f} kg, "
            f"motor={self.motor_mass_kg:.3f} kg, "
            f"total={self.total_mass_kg:.3f} kg)"
        )
