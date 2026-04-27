"""
RecoverySys Engine — FastAPI application.

GET  /api/health    → {status: 'ok', version: '0.1.0'}
POST /api/simulate  → SimulationResponse
"""

from __future__ import annotations

import math

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .ascent import integrate_ascent, FT_PER_M
from .descent import integrate_descent
from .montecarlo import run_monte_carlo
from .schemas import SimulationRequest, SimulationResponse

app = FastAPI(title='RecoverySys Engine', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/api/health')
def health():
    return {'status': 'ok', 'version': '0.1.0'}


@app.post('/api/simulate', response_model=SimulationResponse)
def simulate(req: SimulationRequest):
    mass_kg = req.rocket_mass_kg
    impulse = req.motor_total_impulse_ns
    burn_s = req.burn_time_s
    deploy_ft = req.main_deploy_alt_ft
    cd_sub = req.cd

    if mass_kg <= 0 or impulse <= 0:
        return _error_response(deploy_ft)

    # Frontal area
    radius_m = (req.airframe_od_in * 0.0254) / 2
    area_m2 = math.pi * radius_m * radius_m

    # Parse thrust curve
    thrust_curve = None
    if req.thrust_curve and len(req.thrust_curve) >= 2:
        thrust_curve = np.array([[p.t, p.thrust_N] for p in req.thrust_curve])

    # ── Ascent ───────────────────────────────────────────────────────────────
    ascent = integrate_ascent(
        impulse_ns=impulse,
        total_mass_kg=mass_kg,
        burn_s=burn_s,
        area_m2=area_m2,
        cd_subsonic=cd_sub,
        thrust_curve=thrust_curve,
        propellant_mass_kg=req.propellant_mass_kg,
    )

    apogee_ft = ascent['apogee_m'] * FT_PER_M
    if not math.isfinite(apogee_ft) or apogee_ft <= deploy_ft:
        return _error_response(deploy_ft)

    apogee_method = 'rk45-curve' if thrust_curve is not None else 'rk45'

    # ── Wind layers ──────────────────────────────────────────────────────────
    wind_layers = []
    if req.wind_layers:
        wind_layers = [
            {'alt_ft': w.altitude_ft, 'speed_mph': w.speed_mph, 'direction_deg': w.direction_deg}
            for w in req.wind_layers
        ]

    # ── Descent ──────────────────────────────────────────────────────────────
    descent = integrate_descent(
        apogee_ft=apogee_ft,
        mass_kg=mass_kg,
        deploy_ft=deploy_ft,
        drogue_diameter_in=req.drogue_chute.diameter_in if req.drogue_chute else None,
        drogue_cd=req.drogue_chute.cd if req.drogue_chute else None,
        main_diameter_in=req.main_chute.diameter_in if req.main_chute else None,
        main_cd=req.main_chute.cd if req.main_chute else None,
        wind_layers=wind_layers,
        launch_lat=req.launch_lat,
        launch_lon=req.launch_lon,
    )

    # Merge ascent + descent timelines
    ascent_timeline = ascent.get('timeline', [])
    descent_timeline = descent.get('timeline', [])

    # Offset descent times by apogee time
    apogee_t = ascent['apogee_t_s']
    for pt in descent_timeline:
        pt['t'] = round(pt['t'] + apogee_t, 2)

    # Drop last ascent point (apogee) to avoid duplicate
    if ascent_timeline:
        timeline = ascent_timeline[:-1] + descent_timeline
    else:
        timeline = descent_timeline

    # Simple drift estimate (for the status bar)
    drift_data = descent.get('drift')
    drift_ft_simple = drift_data['drift_ft'] if drift_data else 0

    # ── Monte Carlo ──────────────────────────────────────────────────────────
    mc_result = None
    if (
        req.monte_carlo and req.monte_carlo.enabled
        and wind_layers
        and req.launch_lat is not None
        and req.launch_lon is not None
    ):
        mc_result = run_monte_carlo(
            apogee_ft=apogee_ft,
            mass_kg=mass_kg,
            deploy_ft=deploy_ft,
            cd_subsonic=cd_sub,
            impulse_ns=impulse,
            drogue_diameter_in=req.drogue_chute.diameter_in if req.drogue_chute else None,
            drogue_cd=req.drogue_chute.cd if req.drogue_chute else None,
            main_diameter_in=req.main_chute.diameter_in if req.main_chute else None,
            main_cd=req.main_chute.cd if req.main_chute else None,
            wind_layers=wind_layers,
            launch_lat=req.launch_lat,
            launch_lon=req.launch_lon,
            iterations=req.monte_carlo.iterations,
        )

    return SimulationResponse(
        apogee_ft=round(apogee_ft),
        apogee_t_s=round(ascent['apogee_t_s'], 1),
        burnout_t_s=round(ascent['burnout_t_s'], 1),
        apogee_method=apogee_method,
        drogue_fps=descent['drogue_fps'],
        main_fps=descent['main_fps'],
        phase1_time_s=descent['phase1_time_s'],
        phase2_time_s=descent['phase2_time_s'],
        total_time_s=descent['total_time_s'],
        deploy_ft=deploy_ft,
        drift_ft=drift_ft_simple,
        timeline=timeline,
        shock_load=None,  # TODO: dynamic shock model
        drift=drift_data,
        monte_carlo=mc_result,
    )


def _error_response(deploy_ft: float) -> SimulationResponse:
    """Return a minimal response when simulation can't run."""
    return SimulationResponse(
        apogee_ft=0,
        apogee_t_s=0,
        phase1_time_s=0,
        deploy_ft=deploy_ft,
        timeline=[],
    )


def run():
    """Entry point for `recoverysys-engine` CLI command."""
    import uvicorn
    uvicorn.run(
        'recoverysys_engine.main:app',
        host='0.0.0.0',
        port=8000,
        reload=True,
    )
