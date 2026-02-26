"""
physics.py — Physics engine for the recovery system designer.

All functions are pure (no side effects, no class state). They take primitives
and return primitives. This makes them easy to unit test and easy to call from
any UI layer.

MODULE CONTENTS:
  ISA Atmosphere
    isa_density(altitude_asl_m)          → air density at altitude (kg/m³)
    isa_temperature(altitude_asl_m)      → temperature (K)

  Parachute Sizing
    terminal_velocity(mass, density, cd, diameter)  → Vt (m/s)
    required_diameter(mass, density, cd, target_vt) → D (m)

  Ejection Charge Sizing
    ejection_charge_g(volume_cm3, altitude_asl_m, shear_pins, pin_force_n)
      → recommended FFFF black powder mass (grams)

  Shock Cord & Rigging FOS
    snatch_force_n(m_above, m_below, velocity, cord_length, elongation)
      → peak snatch force (N)
    cord_fos(tensile_strength_n, snatch_force_n) → FOS (dimensionless)
    min_breaking_strength_required(snatch_force_n, min_fos) → MBS (N)

  Descent Rate Validation
    is_descent_rate_safe(velocity_ms, limit_ms) → bool
    landing_ke_j(mass_kg, velocity_ms) → kinetic energy at touchdown (J)
"""

from __future__ import annotations

import math


# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

G_MS2       = 9.80665   # Standard gravity (m/s²)
ISA_T0_K    = 288.15    # Sea-level standard temperature (K)
ISA_P0_PA   = 101325.0  # Sea-level standard pressure (Pa)
ISA_L_KM    = 0.0065    # Temperature lapse rate (K/m), troposphere
R_GAS       = 8.314462  # Universal gas constant (J/(mol·K))
M_AIR       = 0.0289644 # Molar mass of dry air (kg/mol)

# Black powder (FFFF) ejection charge empirical constant.
# Source: Fruity Chutes / Rouse-Tech published guidelines.
# Typical range: 0.6–1.2 g per 100 in³ (6.1–7.3 g per 1000 cm³) at sea level.
# We use 0.006 g/cm³ as the base; altitude correction is applied separately.
BP_FFFF_BASE_G_PER_CM3 = 0.006

# NAR/Tripoli recommended minimum FOS for recovery train hardware
FOS_MINIMUM_SHOCK_CORD   = 4.0
FOS_MINIMUM_RIGGING      = 4.0

# Range safety descent rate limit (m/s) — NFPA 1127 / typical waiver limits
SAFE_DESCENT_RATE_MS = 9.14   # 30 ft/s


# ─────────────────────────────────────────────────────────────────────────────
# ISA ATMOSPHERE
# ─────────────────────────────────────────────────────────────────────────────

def isa_temperature(altitude_asl_m: float) -> float:
    """
    International Standard Atmosphere temperature (K) in the troposphere.
    Valid for 0–11,000 m ASL. Clamps to tropopause above that.

    T(h) = T₀ - L·h
    """
    h = min(altitude_asl_m, 11000.0)
    return ISA_T0_K - ISA_L_KM * h


def isa_density(altitude_asl_m: float) -> float:
    """
    ISA air density (kg/m³) at a given altitude above sea level.

    Uses the barometric formula for the troposphere:
      ρ = P·M / (R·T)
      P = P₀·(T/T₀)^(g·M / (R·L))

    Parameters
    ----------
    altitude_asl_m : float
        Altitude above sea level in meters.
        For AGL → ASL: pass (agl_m + launch_site_elevation_m).

    Returns
    -------
    float
        Air density in kg/m³. Sea level standard ≈ 1.225 kg/m³.
    """
    T = isa_temperature(altitude_asl_m)
    exponent = (G_MS2 * M_AIR) / (R_GAS * ISA_L_KM)
    P = ISA_P0_PA * (T / ISA_T0_K) ** exponent
    return (P * M_AIR) / (R_GAS * T)


# ─────────────────────────────────────────────────────────────────────────────
# PARACHUTE SIZING
# ─────────────────────────────────────────────────────────────────────────────

def terminal_velocity(
    suspended_mass_kg: float,
    air_density_kgm3: float,
    drag_coefficient: float,
    diameter_m: float,
) -> float:
    """
    Steady-state descent velocity under a parachute.

    Vt = sqrt( 2·W / (ρ·Cd·A) )

    Parameters
    ----------
    suspended_mass_kg : float
        Mass of the section hanging beneath the chute.
    air_density_kgm3 : float
        Air density at deployment altitude (use isa_density()).
    drag_coefficient : float
        Canopy Cd (see Parachute class docstring for typical values).
    diameter_m : float
        Inflated canopy diameter.
    """
    area_m2 = math.pi * (diameter_m / 2.0) ** 2
    denom = air_density_kgm3 * drag_coefficient * area_m2
    if denom == 0:
        return float("inf")
    return math.sqrt(2.0 * suspended_mass_kg * G_MS2 / denom)


def required_diameter(
    suspended_mass_kg: float,
    air_density_kgm3: float,
    drag_coefficient: float,
    target_velocity_ms: float,
) -> float:
    """
    Minimum parachute diameter to achieve a target descent rate.

    Derived from Vt formula: D = sqrt( 8·W / (π·ρ·Cd·Vt²) )

    Parameters
    ----------
    target_velocity_ms : float
        Maximum acceptable descent rate (e.g. SAFE_DESCENT_RATE_MS = 9.14 m/s).
    """
    if target_velocity_ms == 0:
        return float("inf")
    weight_n = suspended_mass_kg * G_MS2
    numerator = 8.0 * weight_n
    denominator = math.pi * air_density_kgm3 * drag_coefficient * (target_velocity_ms ** 2)
    if denominator == 0:
        return float("inf")
    return math.sqrt(numerator / denominator)


# ─────────────────────────────────────────────────────────────────────────────
# EJECTION CHARGE SIZING
# ─────────────────────────────────────────────────────────────────────────────

def ejection_charge_g(
    bay_volume_cm3: float,
    altitude_asl_m: float,
    shear_pin_count: int = 2,
    shear_pin_force_n: float = 44.5,   # ~10 lbf per #2-56 nylon shear pin
    safety_multiplier: float = 1.5,
) -> float:
    """
    Recommended FFFF black powder ejection charge mass (grams).

    METHOD:
      1. Base charge = volume × empirical constant (calibrated at sea level).
      2. Altitude correction: air is less dense at altitude, so more powder
         is needed to build the same pressure. Correction = ρ₀/ρ_alt.
      3. Shear pin load: add charge to overcome pin shear force during
         pressurization (modeled as additional effective volume).
      4. Apply safety multiplier (default 1.5×) to account for real-world
         variation in powder granularity, moisture, and canister geometry.

    IMPORTANT: This is a starting estimate only. Always ground-test at 2×
    and 3× calculated charge and verify separation before flight.

    Parameters
    ----------
    bay_volume_cm3 : float
        Usable interior volume of the bay being pressurized.
    altitude_asl_m : float
        Deployment altitude ASL (site elevation + AGL deployment altitude).
    shear_pin_count : int
        Number of nylon shear pins in the separation joint.
    shear_pin_force_n : float
        Shear force per pin (N). Default: ~44.5 N (~10 lbf) for #2-56 nylon.
    safety_multiplier : float
        Multiplicative safety factor applied to the base estimate.
    """
    rho_sl  = isa_density(0.0)
    rho_alt = isa_density(altitude_asl_m)
    altitude_correction = rho_sl / rho_alt if rho_alt > 0 else 1.0

    # Base charge from volume
    base_charge_g = bay_volume_cm3 * BP_FFFF_BASE_G_PER_CM3

    # Additional charge to overcome shear pin resistance.
    # We approximate the extra pressure needed and convert to equivalent volume.
    # Simple empirical add-on: ~0.1 g per pin is a common rule of thumb.
    shear_pin_charge_g = shear_pin_count * 0.1

    total_g = (base_charge_g + shear_pin_charge_g) * altitude_correction * safety_multiplier
    return round(total_g, 2)


# ─────────────────────────────────────────────────────────────────────────────
# SHOCK CORD & RIGGING FOS
# ─────────────────────────────────────────────────────────────────────────────

def snatch_force_n(
    mass_above_kg: float,
    mass_below_kg: float,
    deployment_velocity_ms: float,
    cord_length_m: float,
    elongation_fraction: float = 0.12,
) -> float:
    """
    Peak snatch force on the shock cord using the two-body reduced-mass model.

    F = μ · v² / δ
    where  μ = (m₁ · m₂) / (m₁ + m₂)   [reduced mass]
           δ = cord_length × elongation_fraction   [elastic stretch distance]

    Physical interpretation:
      The two sections decelerate each other through the cord. The reduced mass
      μ is always less than either individual mass, so the force is less than
      you'd calculate with either mass alone. Using total mass is conservative
      but can lead to over-specification.

    Parameters
    ----------
    mass_above_kg : float
        Total mass of the section above (nose-side of) the separation joint.
    mass_below_kg : float
        Total mass of the section below (aft-side of) the separation joint.
    deployment_velocity_ms : float
        Rocket velocity at moment of separation. Near zero at apogee for drogue;
        equal to drogue descent velocity at main deployment altitude.
    cord_length_m : float
        Unstretched cord length in meters.
    elongation_fraction : float
        Fraction of cord length that elastically stretches at peak load.
        Tubular nylon: 0.10–0.15. Kevlar: 0.01–0.03. Bungee: 0.40–0.60.
    """
    m_total = mass_above_kg + mass_below_kg
    if m_total == 0 or cord_length_m == 0 or elongation_fraction == 0:
        return 0.0
    mu = (mass_above_kg * mass_below_kg) / m_total
    delta_m = cord_length_m * elongation_fraction
    return mu * (deployment_velocity_ms ** 2) / delta_m


def cord_fos(
    tensile_strength_n: float,
    peak_snatch_force_n: float,
) -> float:
    """FOS = rated_breaking_strength / peak_snatch_force."""
    if peak_snatch_force_n == 0:
        return float("inf")
    return tensile_strength_n / peak_snatch_force_n


def min_breaking_strength_required(
    peak_snatch_force_n: float,
    min_fos: float = FOS_MINIMUM_SHOCK_CORD,
) -> float:
    """
    Minimum rated breaking strength a cord/link must have to pass FOS check.
    Use this to filter the component database to only show qualifying hardware.
    """
    return peak_snatch_force_n * min_fos


# ─────────────────────────────────────────────────────────────────────────────
# DESCENT RATE VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

def is_descent_rate_safe(
    velocity_ms: float,
    limit_ms: float = SAFE_DESCENT_RATE_MS,
) -> bool:
    """True if the descent velocity is within the safety limit."""
    return velocity_ms <= limit_ms


def landing_ke_joules(
    mass_kg: float,
    velocity_ms: float,
) -> float:
    """
    Kinetic energy at touchdown.
    KE = 0.5 · m · v²
    Useful for estimating airframe damage potential and recovery field safety.
    """
    return 0.5 * mass_kg * (velocity_ms ** 2)
