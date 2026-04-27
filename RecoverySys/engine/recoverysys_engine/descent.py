"""
Dynamic descent integration with parachute inflation model.

Instead of computing a single terminal velocity and drawing a straight line,
this integrates the actual descent ODE:

    dv/dt = g - D(v, h) / m
    dh/dt = -v   (v positive = downward speed)

with D using altitude-varying density and a time-dependent Cd that models
the parachute inflation transient (sigmoidal ramp from 0 to rated Cd).

Wind drift is computed simultaneously — horizontal displacement is
accumulated at each integration step using the local wind vector.
"""

from __future__ import annotations

import math

import numpy as np
from scipy.integrate import solve_ivp

from .atmosphere import isa, G0

FT_PER_M = 3.28084
M_PER_FT = 1.0 / FT_PER_M
MPH_TO_MPS = 0.44704


def _inflation_cd(t_since_deploy: float, rated_cd: float, fill_time_s: float = 1.0) -> float:
    """
    Sigmoidal parachute inflation model.

    Cd ramps from 0 to rated_cd over fill_time_s using a logistic curve.
    The inflection point is at fill_time_s/2, and 95% inflation is reached
    at t = fill_time_s.
    """
    if t_since_deploy <= 0:
        return 0.0
    if t_since_deploy >= fill_time_s * 2:
        return rated_cd
    # Logistic sigmoid centered at fill_time_s/2, k chosen so f(fill_time_s)~0.95
    k = 6.0 / fill_time_s  # steepness
    x = t_since_deploy - fill_time_s / 2
    frac = 1.0 / (1.0 + math.exp(-k * x))
    return rated_cd * frac


def _interpolate_wind(alt_ft: float, layers: list[dict]) -> tuple[float, float]:
    """
    Interpolate wind speed (m/s) and direction (deg) at altitude.

    Parameters
    ----------
    alt_ft : altitude in feet
    layers : sorted list of {alt_ft, speed_mph, direction_deg}

    Returns
    -------
    (speed_mps, direction_deg)
    """
    if not layers:
        return 0.0, 0.0
    if len(layers) == 1:
        return layers[0]['speed_mph'] * MPH_TO_MPS, layers[0]['direction_deg']

    # Below lowest
    if alt_ft <= layers[0]['alt_ft']:
        return layers[0]['speed_mph'] * MPH_TO_MPS, layers[0]['direction_deg']
    # Above highest
    if alt_ft >= layers[-1]['alt_ft']:
        return layers[-1]['speed_mph'] * MPH_TO_MPS, layers[-1]['direction_deg']

    # Interpolate between bracketing layers
    for i in range(len(layers) - 1):
        lo, hi = layers[i], layers[i + 1]
        if lo['alt_ft'] <= alt_ft <= hi['alt_ft']:
            frac = (alt_ft - lo['alt_ft']) / (hi['alt_ft'] - lo['alt_ft'])
            speed = lo['speed_mph'] + frac * (hi['speed_mph'] - lo['speed_mph'])
            # Angular interpolation (shortest path)
            d_dir = hi['direction_deg'] - lo['direction_deg']
            if d_dir > 180:
                d_dir -= 360
            if d_dir < -180:
                d_dir += 360
            direction = (lo['direction_deg'] + frac * d_dir) % 360
            return speed * MPH_TO_MPS, direction

    return layers[-1]['speed_mph'] * MPH_TO_MPS, layers[-1]['direction_deg']


def _project_point(lat: float, lon: float, bearing_deg: float, dist_m: float) -> tuple[float, float]:
    """Great-circle projection from (lat, lon) along bearing for dist_m."""
    R = 6_371_000.0
    lat1 = math.radians(lat)
    lon1 = math.radians(lon)
    brng = math.radians(bearing_deg)
    lat2 = math.asin(
        math.sin(lat1) * math.cos(dist_m / R) +
        math.cos(lat1) * math.sin(dist_m / R) * math.cos(brng)
    )
    lon2 = lon1 + math.atan2(
        math.sin(brng) * math.sin(dist_m / R) * math.cos(lat1),
        math.cos(dist_m / R) - math.sin(lat1) * math.sin(lat2)
    )
    return math.degrees(lat2), math.degrees(lon2)


def integrate_descent(
    apogee_ft: float,
    mass_kg: float,
    deploy_ft: float,
    drogue_diameter_in: float | None,
    drogue_cd: float | None,
    main_diameter_in: float | None,
    main_cd: float | None,
    wind_layers: list[dict] | None = None,
    launch_lat: float | None = None,
    launch_lon: float | None = None,
) -> dict:
    """
    Integrate descent from apogee to ground.

    Two-phase:
      1) Drogue: apogee → deploy_ft (or ballistic if no drogue)
      2) Main: deploy_ft → ground (or drogue continues if no main)

    Returns dict with descent rates, phase times, timeline, drift data.
    """
    wind_layers = wind_layers or []
    has_coords = (
        launch_lat is not None and launch_lon is not None
        and math.isfinite(launch_lat) and math.isfinite(launch_lon)
    )

    apogee_m = apogee_ft * M_PER_FT
    deploy_m = deploy_ft * M_PER_FT

    # Chute areas
    def _chute_area(diameter_in):
        if not diameter_in or diameter_in <= 0:
            return 0.0
        r_m = (diameter_in * 0.0254) / 2
        return math.pi * r_m * r_m

    drogue_area = _chute_area(drogue_diameter_in)
    main_area = _chute_area(main_diameter_in)
    drogue_cd_val = drogue_cd if drogue_cd and drogue_cd > 0 else 0.0
    main_cd_val = main_cd if main_cd and main_cd > 0 else 0.0

    # Accumulate drift
    dx_m = 0.0  # east displacement
    dy_m = 0.0  # north displacement
    drogue_dx = 0.0
    drogue_dy = 0.0
    main_dx = 0.0
    main_dy = 0.0

    timeline_points = []
    dt_step = 0.25  # fixed step for simplicity and drift accumulation

    def _terminal_v(rho, cd_eff, area):
        """Instantaneous terminal velocity for reference."""
        denom = rho * cd_eff * area
        if denom <= 0:
            return 100.0  # ballistic fallback
        return math.sqrt(2 * mass_kg * G0 / denom)

    # ── Phase 1: Drogue (apogee → deploy_ft) ──
    h = apogee_m
    v = 0.0  # start at zero downward velocity (apogee)
    t = 0.0
    t_deploy_start = 0.0
    phase1_time = 0.0
    drogue_fps_sampled = None

    while h > deploy_m and t < 600:
        alt_ft = h * FT_PER_M
        rho = isa(h)[0]

        # Inflation transient
        t_since = t - t_deploy_start
        if drogue_area > 0 and drogue_cd_val > 0:
            cd_eff = _inflation_cd(t_since, drogue_cd_val, fill_time_s=0.8)
            area_eff = drogue_area
        else:
            # Ballistic — small body drag
            cd_eff = 0.3
            area_eff = 0.01  # ~1 sq in cross-section

        # Equation of motion (v positive = downward)
        drag_accel = 0.5 * rho * cd_eff * area_eff * v * abs(v) / mass_kg
        dv = G0 - drag_accel
        v += dv * dt_step
        v = max(v, 0.0)  # can't go upward
        h -= v * dt_step

        # Wind drift
        if wind_layers:
            w_mps, w_dir = _interpolate_wind(alt_ft, wind_layers)
            drift_bearing = (w_dir + 180) % 360
            brng_rad = math.radians(drift_bearing)
            step_e = w_mps * dt_step * math.sin(brng_rad)
            step_n = w_mps * dt_step * math.cos(brng_rad)
            drogue_dx += step_e
            drogue_dy += step_n

        t += dt_step

        # Sample for timeline
        if len(timeline_points) == 0 or t - timeline_points[-1]['t'] >= 0.5:
            timeline_points.append({'t': round(t, 2), 'alt': round(max(0, h * FT_PER_M), 1)})

        # Sample drogue descent rate after inflation settles
        if drogue_fps_sampled is None and t_since > 2.0:
            drogue_fps_sampled = v * FT_PER_M

    phase1_time = t
    if drogue_fps_sampled is None:
        drogue_fps_sampled = v * FT_PER_M if v > 0 else 0.0

    # ── Phase 2: Main (deploy_ft → ground) ──
    phase2_start_t = t
    t_main_deploy = t
    main_fps_sampled = None

    if main_area > 0 and main_cd_val > 0:
        # Main deploys — drogue drag drops, main inflates
        while h > 0 and t < 600:
            alt_ft = h * FT_PER_M
            rho = isa(h)[0]

            t_since_main = t - t_main_deploy
            cd_eff = _inflation_cd(t_since_main, main_cd_val, fill_time_s=1.5)
            area_eff = main_area

            drag_accel = 0.5 * rho * cd_eff * area_eff * v * abs(v) / mass_kg
            dv = G0 - drag_accel
            v += dv * dt_step
            v = max(v, 0.0)
            h -= v * dt_step

            if wind_layers:
                w_mps, w_dir = _interpolate_wind(alt_ft, wind_layers)
                drift_bearing = (w_dir + 180) % 360
                brng_rad = math.radians(drift_bearing)
                step_e = w_mps * dt_step * math.sin(brng_rad)
                step_n = w_mps * dt_step * math.cos(brng_rad)
                main_dx += step_e
                main_dy += step_n

            t += dt_step
            if t - timeline_points[-1]['t'] >= 0.5:
                timeline_points.append({'t': round(t, 2), 'alt': round(max(0, h * FT_PER_M), 1)})

            if main_fps_sampled is None and t_since_main > 3.0:
                main_fps_sampled = v * FT_PER_M

        if main_fps_sampled is None:
            main_fps_sampled = v * FT_PER_M if v > 0 else 0.0
    else:
        # No main — drogue to ground
        while h > 0 and t < 600:
            alt_ft = h * FT_PER_M
            rho = isa(h)[0]

            if drogue_area > 0 and drogue_cd_val > 0:
                cd_eff = drogue_cd_val  # fully inflated by now
                area_eff = drogue_area
            else:
                cd_eff = 0.3
                area_eff = 0.01

            drag_accel = 0.5 * rho * cd_eff * area_eff * v * abs(v) / mass_kg
            dv = G0 - drag_accel
            v += dv * dt_step
            v = max(v, 0.0)
            h -= v * dt_step

            if wind_layers:
                w_mps, w_dir = _interpolate_wind(alt_ft, wind_layers)
                drift_bearing = (w_dir + 180) % 360
                brng_rad = math.radians(drift_bearing)
                main_dx += w_mps * dt_step * math.sin(brng_rad)
                main_dy += w_mps * dt_step * math.cos(brng_rad)

            t += dt_step
            if t - timeline_points[-1]['t'] >= 0.5:
                timeline_points.append({'t': round(t, 2), 'alt': round(max(0, h * FT_PER_M), 1)})

        main_fps_sampled = None

    phase2_time = t - phase2_start_t
    total_time = t

    # Ensure landing point in timeline
    if timeline_points and timeline_points[-1]['alt'] > 0:
        timeline_points.append({'t': round(t, 2), 'alt': 0.0})

    # Total drift
    dx_m = drogue_dx + main_dx
    dy_m = drogue_dy + main_dy
    drift_m = math.sqrt(dx_m * dx_m + dy_m * dy_m)
    drift_ft = drift_m * FT_PER_M
    drogue_drift_ft = math.sqrt(drogue_dx**2 + drogue_dy**2) * FT_PER_M
    main_drift_ft = math.sqrt(main_dx**2 + main_dy**2) * FT_PER_M

    bearing_deg = None
    land_lat = None
    land_lon = None
    if drift_m > 0:
        bearing_deg = (math.degrees(math.atan2(dx_m, dy_m)) + 360) % 360
        if has_coords:
            land_lat, land_lon = _project_point(launch_lat, launch_lon, bearing_deg, drift_m)

    return {
        'drogue_fps': round(drogue_fps_sampled, 1) if drogue_fps_sampled else None,
        'main_fps': round(main_fps_sampled, 1) if main_fps_sampled else None,
        'phase1_time_s': round(phase1_time),
        'phase2_time_s': round(phase2_time) if main_area > 0 else None,
        'total_time_s': round(total_time),
        'timeline': timeline_points,
        'drift': {
            'drift_ft': round(drift_ft),
            'drift_m': round(drift_m),
            'bearing_deg': round(bearing_deg, 1) if bearing_deg is not None else None,
            'land_lat': land_lat,
            'land_lon': land_lon,
            'drogue_drift_ft': round(drogue_drift_ft),
            'main_drift_ft': round(main_drift_ft),
            'drogue_time_s': round(phase1_time),
            'main_time_s': round(phase2_time),
            'drogue_vector': {'dx_ft': round(drogue_dx * FT_PER_M, 1), 'dy_ft': round(drogue_dy * FT_PER_M, 1)},
            'main_vector': {'dx_ft': round(main_dx * FT_PER_M, 1), 'dy_ft': round(main_dy * FT_PER_M, 1)},
        } if wind_layers else None,
    }
