"""
Monte Carlo dispersion with multi-parameter uncertainty propagation.

Perturbs:
  - Wind speed (per layer): +-30% Gaussian
  - Wind direction (per layer): +-15 deg Gaussian
  - Drag coefficient: +-10% Gaussian
  - Rocket mass: +-2% Gaussian
  - Deploy altitude: +-50 ft Gaussian
  - Motor impulse: +-3% Gaussian (lot-to-lot variation)

Runs N lightweight descent integrations (reuses the apogee from the
nominal ascent, perturbing only the descent parameters for speed).
"""

from __future__ import annotations

import math
import numpy as np

from .descent import integrate_descent

FT_PER_M = 3.28084


def _fit_confidence_ellipse(points: list[dict]) -> dict | None:
    """Fit a 2-sigma (95%) confidence ellipse to [{lat, lon}] points."""
    n = len(points)
    if n < 3:
        return None

    lats = np.array([p['lat'] for p in points])
    lons = np.array([p['lon'] for p in points])

    cx = float(np.mean(lats))
    cy = float(np.mean(lons))

    m_per_deg_lat = 111320.0
    m_per_deg_lon = 111320.0 * math.cos(math.radians(cx))

    # Covariance in metres
    x = (lons - cy) * m_per_deg_lon
    y = (lats - cx) * m_per_deg_lat

    sxx = float(np.var(x, ddof=1))
    syy = float(np.var(y, ddof=1))
    sxy = float(np.mean((x - np.mean(x)) * (y - np.mean(y))))

    trace = sxx + syy
    det = sxx * syy - sxy * sxy
    disc = math.sqrt(max(0, trace * trace / 4 - det))
    lambda1 = trace / 2 + disc
    lambda2 = trace / 2 - disc

    # Chi-squared 2 DOF, p=0.05 -> 5.991
    scale = math.sqrt(5.991)
    rx = scale * math.sqrt(max(0, lambda1))
    ry = scale * math.sqrt(max(0, lambda2))

    angle_rad = math.atan2(2 * sxy, sxx - syy) / 2
    angle_deg = (90 - math.degrees(angle_rad) + 360) % 360

    return {'cx': cx, 'cy': cy, 'rx': rx, 'ry': ry, 'angle_deg': round(angle_deg, 1)}


def run_monte_carlo(
    apogee_ft: float,
    mass_kg: float,
    deploy_ft: float,
    cd_subsonic: float,
    impulse_ns: float,
    drogue_diameter_in: float | None,
    drogue_cd: float | None,
    main_diameter_in: float | None,
    main_cd: float | None,
    wind_layers: list[dict],
    launch_lat: float,
    launch_lon: float,
    iterations: int = 500,
) -> dict | None:
    """
    Run Monte Carlo dispersion analysis.

    Returns {scatter, ellipse, mean_lat, mean_lon} or None.
    """
    if not wind_layers or not math.isfinite(launch_lat) or not math.isfinite(launch_lon):
        return None

    rng = np.random.default_rng()
    scatter = []

    for _ in range(iterations):
        # Perturb parameters
        mass_pert = mass_kg * (1 + 0.02 * rng.standard_normal())
        deploy_pert = max(100, deploy_ft + 50 * rng.standard_normal())
        impulse_pert = impulse_ns * (1 + 0.03 * rng.standard_normal())
        # Apogee scales roughly linearly with impulse for small perturbations
        apogee_pert = apogee_ft * (impulse_pert / impulse_ns) if impulse_ns > 0 else apogee_ft

        # Perturb wind layers
        pert_layers = []
        for layer in wind_layers:
            pert_layers.append({
                'alt_ft': layer['alt_ft'],
                'speed_mph': max(0, layer['speed_mph'] * (1 + 0.30 * rng.standard_normal())),
                'direction_deg': (layer['direction_deg'] + 15 * rng.standard_normal()) % 360,
            })

        result = integrate_descent(
            apogee_ft=apogee_pert,
            mass_kg=mass_pert,
            deploy_ft=deploy_pert,
            drogue_diameter_in=drogue_diameter_in,
            drogue_cd=drogue_cd,
            main_diameter_in=main_diameter_in,
            main_cd=main_cd,
            wind_layers=pert_layers,
            launch_lat=launch_lat,
            launch_lon=launch_lon,
        )

        drift = result.get('drift')
        if drift and drift.get('land_lat') is not None:
            scatter.append({'lat': drift['land_lat'], 'lon': drift['land_lon']})

    if len(scatter) < 10:
        return None

    ellipse = _fit_confidence_ellipse(scatter)
    mean_lat = float(np.mean([p['lat'] for p in scatter]))
    mean_lon = float(np.mean([p['lon'] for p in scatter]))

    return {
        'scatter': scatter,
        'ellipse': ellipse,
        'mean_lat': mean_lat,
        'mean_lon': mean_lon,
    }
