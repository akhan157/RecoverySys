"""
International Standard Atmosphere (ISA) — troposphere model.

Returns density, temperature, pressure, and speed of sound at a given
geometric altitude. Valid from sea level to 11,000 m (tropopause).
"""

import math

# ISA sea-level constants
T0 = 288.15       # K — sea-level temperature
P0 = 101325.0     # Pa — sea-level pressure
RHO0 = 1.225      # kg/m^3 — sea-level density
LAPSE = 0.0065    # K/m — troposphere lapse rate
G0 = 9.80665      # m/s^2 — standard gravity
R_AIR = 287.058    # J/(kg*K) — specific gas constant for dry air
GAMMA = 1.4        # ratio of specific heats for air

# Derived exponents
_GP = G0 / (R_AIR * LAPSE)  # ~5.2559


def isa(alt_m: float) -> tuple[float, float, float, float]:
    """
    Compute ISA properties at altitude.

    Parameters
    ----------
    alt_m : float
        Geometric altitude in metres (clamped to [0, 11000]).

    Returns
    -------
    rho : float — air density (kg/m^3)
    T : float — temperature (K)
    P : float — pressure (Pa)
    a : float — speed of sound (m/s)
    """
    h = max(0.0, min(alt_m, 11000.0))
    T = T0 - LAPSE * h
    P = P0 * (T / T0) ** _GP
    rho = P / (R_AIR * T)
    a = math.sqrt(GAMMA * R_AIR * T)
    return rho, T, P, a


def density(alt_m: float) -> float:
    """Shorthand: return only density at altitude."""
    return isa(alt_m)[0]


def speed_of_sound(alt_m: float) -> float:
    """Shorthand: return only speed of sound at altitude."""
    return isa(alt_m)[3]
