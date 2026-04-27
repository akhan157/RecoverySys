"""Pydantic request/response models for the simulation API."""

from __future__ import annotations
from pydantic import BaseModel, Field


# ── Request ──────────────────────────────────────────────────────────────────

class ChuteSpec(BaseModel):
    diameter_in: float
    cd: float

class WindLayer(BaseModel):
    altitude_ft: float = 0
    speed_mph: float
    direction_deg: float = 0

class ThrustPoint(BaseModel):
    t: float
    thrust_N: float

class MonteCarloConfig(BaseModel):
    enabled: bool = False
    iterations: int = 500

class SimulationRequest(BaseModel):
    rocket_mass_kg: float
    motor_total_impulse_ns: float
    burn_time_s: float
    airframe_od_in: float = 4.0
    cd: float = 0.5
    main_deploy_alt_ft: float = 700
    fidelity: str = 'simple'

    main_chute: ChuteSpec | None = None
    drogue_chute: ChuteSpec | None = None

    wind_layers: list[WindLayer] | None = None
    launch_lat: float | None = None
    launch_lon: float | None = None

    thrust_curve: list[ThrustPoint] | None = None
    propellant_mass_kg: float | None = None

    monte_carlo: MonteCarloConfig | None = None


# ── Response ─────────────────────────────────────────────────────────────────
# Matches the contract in engineApi.js transformEngineResponse()

class TimelinePoint(BaseModel):
    t: float
    alt: float

class ShockLoad(BaseModel):
    peak_load_lbs: float
    safety_factor: float
    strain_energy_J: float
    status: str

class DriftVector(BaseModel):
    dx_ft: float
    dy_ft: float

class DriftResult(BaseModel):
    drift_ft: int
    drift_m: int
    bearing_deg: float | None = None
    land_lat: float | None = None
    land_lon: float | None = None
    drogue_drift_ft: int
    main_drift_ft: int
    drogue_time_s: int
    main_time_s: int
    drogue_vector: DriftVector
    main_vector: DriftVector

class ConfidenceEllipse(BaseModel):
    cx: float
    cy: float
    rx: float
    ry: float
    angle_deg: float

class ScatterPoint(BaseModel):
    lat: float
    lon: float

class MonteCarloResult(BaseModel):
    scatter: list[ScatterPoint]
    ellipse: ConfidenceEllipse | None = None
    mean_lat: float
    mean_lon: float

class SimulationResponse(BaseModel):
    apogee_ft: float
    apogee_t_s: float
    burnout_t_s: float | None = None
    apogee_method: str = 'rk45'
    drogue_fps: float | None = None
    main_fps: float | None = None
    phase1_time_s: float
    phase2_time_s: float | None = None
    total_time_s: float | None = None
    deploy_ft: float
    drift_ft: float = 0
    timeline: list[TimelinePoint]
    shock_load: ShockLoad | None = None
    drift: DriftResult | None = None
    monte_carlo: MonteCarloResult | None = None
