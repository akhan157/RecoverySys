"""
enums.py — Controlled vocabularies for the recovery system designer.

All routing logic in the app keys off RecoveryArchitecture. Every other enum
is either a classification tag (BayRole, ComponentType) or a constraint
descriptor (SeparationMechanism). Do not add strings where an enum belongs.
"""

from enum import Enum


# ─────────────────────────────────────────────────────────────────────────────
# PRIMARY ARCHITECTURE SELECTOR
# This is the first thing the user picks. It drives:
#   - How many RocketSections are required
#   - How many RecoveryBays are created
#   - Which components are shown in the selector UI
#   - How many ejection charge events are computed
# ─────────────────────────────────────────────────────────────────────────────

class RecoveryArchitecture(Enum):
    # One deployment event (apogee only). Typically streamers or small rockets.
    SINGLE_DEPLOY = "single_deploy"

    # Two deployment events, one physical separation joint.
    # The drogue and main share one bay, OR a mechanical release (e.g. Jolly
    # Logic Chute Release) holds the main until target altitude.
    # Example: Binghamton RED II-MARY.
    DUAL_DEPLOY_SINGLE_SEP = "dual_deploy_single_sep"

    # Two deployment events, two physical separation joints.
    # Nosecone separates at apogee (drogue), aft coupler separates at altitude
    # (main). Requires two independent bays and two ejection charge events.
    DUAL_DEPLOY_DUAL_SEP = "dual_deploy_dual_sep"


# ─────────────────────────────────────────────────────────────────────────────
# SEPARATION MECHANISM
# Describes how a given coupler joint is opened. Stored on RecoveryBay, not
# on the Rocket, because different joints on the same rocket can use different
# mechanisms (e.g. forward joint uses black powder, aft uses a CO2 system).
# ─────────────────────────────────────────────────────────────────────────────

class SeparationMechanism(Enum):
    EJECTION_CHARGE = "ejection_charge"   # Black powder (FFFF) or commercial
    CO2_SYSTEM      = "co2_system"        # CO2 piston, e.g. Tender Descender
    MECHANICAL      = "mechanical"        # Spring, gravity, shear pin only
    HYBRID          = "hybrid"            # Charge + mechanical assist


# ─────────────────────────────────────────────────────────────────────────────
# BAY ROLE
# Semantic label for what a bay is responsible for. Drives UI layout and
# determines which parachute types + hardware are offered as options.
# ─────────────────────────────────────────────────────────────────────────────

class BayRole(Enum):
    DROGUE_BAY   = "drogue_bay"    # Aft bay — holds drogue, fires at apogee
    MAIN_BAY     = "main_bay"      # Forward bay — holds main, fires at altitude
    SHARED_BAY   = "shared_bay"    # Single-sep: one bay for both chutes + avionics
    AVIONICS_BAY = "avionics_bay"  # Electronics sled only (no chute packed here)


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT TYPE
# Used to route type-specific field rendering and physics calculations.
# ─────────────────────────────────────────────────────────────────────────────

class ComponentType(Enum):
    PARACHUTE          = "parachute"
    DROGUE             = "drogue"
    SHOCK_CORD         = "shock_cord"
    ALTIMETER          = "altimeter"
    MECHANICAL_RELEASE = "mechanical_release"  # e.g. Jolly Logic Chute Release
    EJECTION_CANISTER  = "ejection_canister"
    QUICK_LINK         = "quick_link"
    EYE_NUT            = "eye_nut"
    BATTERY            = "battery"
    SWITCH             = "switch"
