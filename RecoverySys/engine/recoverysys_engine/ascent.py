"""
RK45 ascent integration — powered flight + coast to apogee.

Integrates the 1-DOF vertical equation of motion:
    dv/dt = (T(t) - D(v, h) - m(t)*g) / m(t)
    dh/dt = v

where:
    T(t)   = thrust interpolated from .eng curve (or constant avg)
    D      = 0.5 * rho(h) * Cd(M) * A * v^2 — Mach-dependent drag
    m(t)   = dry_mass + propellant(t) — Tsiolkovsky mass depletion
    g      = 9.80665 m/s^2
"""

from __future__ import annotations

import numpy as np
from scipy.integrate import solve_ivp

from .atmosphere import isa, G0
from .drag import cd_at_mach

FT_PER_M = 3.28084
APCP_ISP = 195.0  # s — typical APCP specific impulse


def _interp_thrust(t: float, curve: np.ndarray) -> float:
    """Linear interpolation of thrust from Nx2 array [[t, F], ...]."""
    if t <= curve[0, 0]:
        return float(curve[0, 1])
    if t >= curve[-1, 0]:
        return 0.0
    return float(np.interp(t, curve[:, 0], curve[:, 1]))


def integrate_ascent(
    impulse_ns: float,
    total_mass_kg: float,
    burn_s: float,
    area_m2: float,
    cd_subsonic: float,
    thrust_curve: np.ndarray | None = None,
    propellant_mass_kg: float | None = None,
) -> dict:
    """
    Integrate powered + coast phases to apogee using RK45.

    Parameters
    ----------
    impulse_ns : total motor impulse (N*s)
    total_mass_kg : liftoff mass including propellant
    burn_s : motor burn time (s)
    area_m2 : frontal reference area (m^2)
    cd_subsonic : user-entered subsonic Cd
    thrust_curve : optional Nx2 array of [[t, thrust_N], ...]
    propellant_mass_kg : optional known propellant mass (from .eng file)

    Returns
    -------
    dict with keys:
        apogee_m, apogee_t_s, burnout_t_s, burnout_v_mps,
        timeline: list of {t, alt} dicts (alt in feet, t in seconds)
    """
    # Propellant mass
    if propellant_mass_kg is not None and propellant_mass_kg > 0:
        prop_kg = min(propellant_mass_kg, total_mass_kg * 0.60)
    else:
        prop_kg = min(impulse_ns / (APCP_ISP * G0), total_mass_kg * 0.55)
    dry_kg = total_mass_kg - prop_kg

    use_curve = thrust_curve is not None and len(thrust_curve) >= 2
    avg_thrust = impulse_ns / burn_s if burn_s > 0 else 0.0

    # Cumulative impulse from curve (for Tsiolkovsky mass depletion)
    if use_curve:
        cum_impulse = np.zeros(len(thrust_curve))
        for i in range(1, len(thrust_curve)):
            dt = thrust_curve[i, 0] - thrust_curve[i - 1, 0]
            cum_impulse[i] = cum_impulse[i - 1] + 0.5 * (thrust_curve[i - 1, 1] + thrust_curve[i, 1]) * dt
        total_curve_impulse = cum_impulse[-1] if cum_impulse[-1] > 0 else impulse_ns
    else:
        cum_impulse = None
        total_curve_impulse = impulse_ns

    def mass_at_t(t: float) -> float:
        """Mass at time t accounting for propellant burn."""
        if t >= burn_s:
            return dry_kg
        if use_curve:
            burned_impulse = float(np.interp(t, thrust_curve[:, 0], cum_impulse))
            frac = burned_impulse / total_curve_impulse
        else:
            frac = t / burn_s
        return total_mass_kg - prop_kg * min(frac, 1.0)

    def thrust_at_t(t: float) -> float:
        if t >= burn_s:
            return 0.0
        if use_curve:
            return _interp_thrust(t, thrust_curve)
        return avg_thrust

    # State vector: [altitude_m, velocity_m_s]
    def deriv(t, y):
        h, v = y
        h = max(h, 0.0)
        rho, T, P, a_sound = isa(h)

        m = mass_at_t(t)
        F_thrust = thrust_at_t(t)

        # Nozzle exit pressure correction (approximate)
        # At altitude, Pe > Pa → extra thrust. Typical HPR nozzle Ae ~ 0.001 m^2
        # Pe ~ 1 atm at sea level (optimally expanded). Effect: ~2-5% at altitude.
        nozzle_area = area_m2 * 0.15  # ~15% of airframe cross-section
        P_exit = 101325.0  # assume optimally expanded at sea level
        F_pressure = max(0.0, (P_exit - P) * nozzle_area) if F_thrust > 0 else 0.0

        # Mach-dependent drag
        speed = abs(v)
        mach = speed / a_sound if a_sound > 0 else 0.0
        cd = cd_at_mach(mach, cd_subsonic)
        F_drag = 0.5 * rho * cd * area_m2 * v * abs(v)  # opposes motion

        dv = (F_thrust + F_pressure - F_drag - m * G0) / m
        dh = v
        return [dh, dv]

    # Apogee event: velocity crosses zero (coast phase)
    def apogee_event(t, y):
        return y[1]  # v = 0
    apogee_event.terminal = True
    apogee_event.direction = -1  # trigger when v goes from + to -

    # Integrate up to a generous max time
    max_t = burn_s + 300.0  # 5 min coast should be more than enough
    sol = solve_ivp(
        deriv,
        [0, max_t],
        [0.0, 0.0],  # start on pad, v=0
        method='RK45',
        events=apogee_event,
        max_step=0.5,
        rtol=1e-8,
        atol=1e-8,
    )

    if sol.status < 0:
        return {
            'apogee_m': 0.0, 'apogee_t_s': 0.0,
            'burnout_t_s': burn_s, 'burnout_v_mps': 0.0,
            'timeline': [],
        }

    # Extract results
    t_arr = sol.t
    h_arr = sol.y[0]
    v_arr = sol.y[1]

    apogee_m = float(np.max(h_arr))
    apogee_idx = int(np.argmax(h_arr))
    apogee_t_s = float(t_arr[apogee_idx])

    # Find burnout velocity
    burnout_idx = int(np.searchsorted(t_arr, burn_s, side='right'))
    burnout_idx = min(burnout_idx, len(v_arr) - 1)
    burnout_v_mps = float(v_arr[burnout_idx])

    # Build timeline sampled at ~0.5s intervals
    timeline = []
    last_t = -1.0
    for i in range(len(t_arr)):
        if t_arr[i] - last_t >= 0.5 or i == 0 or i == len(t_arr) - 1:
            timeline.append({
                't': round(float(t_arr[i]), 2),
                'alt': round(max(0.0, float(h_arr[i])) * FT_PER_M, 1),
            })
            last_t = t_arr[i]

    # Ensure apogee point is included
    if timeline and abs(timeline[-1]['t'] - apogee_t_s) > 0.01:
        timeline.append({
            't': round(apogee_t_s, 2),
            'alt': round(apogee_m * FT_PER_M, 1),
        })

    return {
        'apogee_m': apogee_m,
        'apogee_t_s': apogee_t_s,
        'burnout_t_s': float(burn_s),
        'burnout_v_mps': burnout_v_mps,
        'timeline': timeline,
    }
