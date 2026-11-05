#!/usr/bin/env python3
"""
Independent Reference Calculator for Online Physics Benchmarks (2026-11-05).

Calculates independent closed-form analytical references from first principles
and source-verified standard constants. This module DOES NOT import or call
any production code (no oracle tautology). Uses Python standard library only.
"""

import math
import json
import sys


def compute_isa_2500m():
    """
    Benchmark 1: 2,500m matched-coordinate atmosphere T, P, rho.
    Source: U.S. Standard Atmosphere 1976 (NASA-TM-X-74335, p. 2-4).
    Standard constants:
      T0 = 288.15 K
      P0 = 101325.0 Pa
      g0 = 9.80665 m/s^2
      R_star = 8314.32 J/(kmol*K)
      M0 = 28.9644 kg/kmol
      L = -0.0065 K/m'
      R = R_star / M0 = 287.05307204775516 J/(kg*K)
      exponent n = (g0 * M0) / (R_star * (-L)) = 5.255876113278519
    """
    h_m = 2500.0
    T0 = 288.15
    P0 = 101325.0
    g0 = 9.80665
    R_star = 8314.32
    M0 = 28.9644
    L = -0.0065

    R_air = R_star / M0
    exponent = (g0 * M0) / (R_star * (-L))

    T = T0 + L * h_m
    P = P0 * math.pow(T / T0, exponent)
    rho = P / (R_air * T)

    return {
        "benchmarkId": "isa-troposphere-analytic-2500m",
        "inputs": {"altitude_m": h_m},
        "constants": {
            "T0_K": T0,
            "P0_Pa": P0,
            "g0_m_s2": g0,
            "R_star_J_kmol_K": R_star,
            "M0_kg_kmol": M0,
            "R_air_J_kg_K": R_air,
            "lapse_rate_K_m": L,
            "barometric_exponent": exponent,
        },
        "metrics": {
            "temperature_K": {
                "value": T,
                "rounded": round(T, 4),
                "unit": "K",
                "tolerance": {"absolute": 0.01, "basis": "source-stated"},
            },
            "pressure_Pa": {
                "value": P,
                "rounded": round(P, 2),
                "unit": "Pa",
                "tolerance": {"relative": 0.0001, "basis": "analyst-derived"},
            },
            "density_kg_m3": {
                "value": rho,
                "rounded": round(rho, 5),
                "unit": "kg/m^3",
                "tolerance": {"relative": 0.0001, "basis": "analyst-derived"},
            },
        },
    }


def compute_terminal_descent_48in():
    """
    Benchmark 2: 48-inch nominal area, 5 kg, sea level, Cd 0.8.
    Source: Knacke (1992) Parachute Recovery Systems Design Manual, Chapter 5.
    Exact inch = 0.0254 m.
    D = 48 * 0.0254 = 1.2192 m
    radius = 0.6096 m
    Area = pi * r^2 = 1.167454032599... m^2
    Sea level rho = 1.225 kg/m^3
    v_term = sqrt(2 * m * g / (rho * Cd * S0))
    """
    diameter_in = 48.0
    inch_to_m = 0.0254
    mass_kg = 5.0
    cd = 0.8
    rho = 1.225
    g = 9.80665
    ft_per_m = 3.28084

    radius_m = (diameter_in * inch_to_m) / 2.0
    area_m2 = math.pi * radius_m * radius_m
    v_mps = math.sqrt((2.0 * mass_kg * g) / (rho * cd * area_m2))
    v_fps = v_mps * ft_per_m
    energy_J = 0.5 * mass_kg * v_mps * v_mps

    return {
        "benchmarkId": "terminal-descent-nominal-48in-sea-level",
        "inputs": {
            "chuteSpecs": {"diameter_in": diameter_in, "cd": cd},
            "mass_kg": mass_kg,
            "altitude_ft": 0,
        },
        "intermediate": {
            "radius_m": radius_m,
            "area_m2": area_m2,
            "terminal_velocity_mps": v_mps,
        },
        "metrics": {
            "descent_rate_fps": {
                "value": v_fps,
                "rounded": round(v_fps, 6),
                "unit": "ft/s",
                "tolerance": {"relative": 0.0001, "basis": "analyst-derived"},
            },
            "landing_energy_J": {
                "value": energy_J,
                "rounded": round(energy_J, 6),
                "unit": "J",
                "tolerance": {"relative": 0.0002, "basis": "analyst-derived"},
            },
        },
    }


def compute_cardinal_wind_drift_3000ft():
    """
    Benchmark 3: Constant 15 mph wind FROM South (180 deg).
    Apogee: 3000 ft, deploy: 500 ft, drogue: 60 fps, main: 20 fps.
    Wind speed: 15 mph = 15 * 5280 / 3600 = 22.0 fps.
    Wind direction: 180 deg (FROM South) -> Drift bearing: 0 deg (True North).
    Phase 1 (drogue): (3000 - 500) / 60 = 41.6667 s -> drift = 22 * 41.6667 = 916.6667 ft.
    Phase 2 (main): 500 / 20 = 25.0 s -> drift = 22 * 25 = 550.0 ft.
    Total drift: 1466.6667 ft North.
    """
    apogee_ft = 3000.0
    deploy_ft = 500.0
    drogue_fps = 60.0
    main_fps = 20.0
    wind_mph = 15.0
    wind_dir_deg = 180.0

    mph_to_fps = 5280.0 / 3600.0
    wind_fps = wind_mph * mph_to_fps

    drogue_dist = apogee_ft - deploy_ft
    drogue_time_s = drogue_dist / drogue_fps
    drogue_drift_ft = wind_fps * drogue_time_s

    main_dist = deploy_ft
    main_time_s = main_dist / main_fps
    main_drift_ft = wind_fps * main_time_s

    total_drift_ft = drogue_drift_ft + main_drift_ft
    bearing_deg = (wind_dir_deg + 180.0) % 360.0

    return {
        "benchmarkId": "cardinal-wind-drift-north-3000ft",
        "inputs": {
            "simulation": {
                "apogee_ft": apogee_ft,
                "deploy_ft": deploy_ft,
                "drogue_fps": drogue_fps,
                "main_fps": main_fps,
            },
            "specs": {
                "wind_speed_mph": wind_mph,
                "wind_direction_deg": wind_dir_deg,
                "wind_surface_alt_ft": 0,
            },
        },
        "intermediate": {
            "wind_fps": wind_fps,
            "drogue_time_s": drogue_time_s,
            "main_time_s": main_time_s,
            "drogue_drift_ft": drogue_drift_ft,
            "main_drift_ft": main_drift_ft,
        },
        "metrics": {
            "drift_ft": {
                "value": total_drift_ft,
                "rounded": round(total_drift_ft),
                "unit": "ft",
                "tolerance": {"absolute": 1.0, "basis": "analyst-derived"},
            },
            "bearing_deg": {
                "value": bearing_deg,
                "rounded": round(bearing_deg, 1),
                "unit": "deg",
                "tolerance": {"absolute": 0.1, "basis": "source-stated"},
            },
        },
    }


def compute_secant_snatch_arithmetic():
    """
    Benchmark 4: Secant linear-elastic snatch arithmetic.
    Declared parameters: 1500 lb, 20 ft, 25%, 6 kg, 65 fps.
    Constants:
      N_PER_LBF = 4.448
      FT_PER_M = 3.28084
    Formulas:
      break_extension_m = length_ft * 0.3048 * (elongation_pct / 100) = 1.524 m
      strength_N = strength_lbs * 4.448 = 6672.0 N
      k = strength_N / break_extension_m = 4377.9528 N/m
      v_mps = 65.0 / 3.28084 = 19.8120 m/s
      event_energy_J = 0.5 * 6.0 * v_mps^2 = 1177.5452 J
      capacity_energy_J = 0.5 * k * break_extension_m^2 = 5084.064 J
      predicted_extension_m = sqrt(2 * event_energy_J / k) = 0.733476 m
      peak_force_proxy_N = k * predicted_extension_m = 3211.1227 N
      peak_force_proxy_lbs = peak_force_proxy_N / 4.448 = 721.925 lbf
      rating_margin = strength_lbs / peak_force_proxy_lbs = 2.078
      energy_margin = capacity_energy_J / event_energy_J = 4.318
    """
    strength_lbs = 1500.0
    length_ft = 20.0
    elongation_pct = 25.0
    mass_kg = 6.0
    v_fps = 65.0

    n_per_lbf = 4.448
    ft_per_m = 3.28084

    break_extension_m = length_ft * 0.3048 * (elongation_pct / 100.0)
    strength_N = strength_lbs * n_per_lbf
    secant_stiffness = strength_N / break_extension_m

    v_mps = v_fps / ft_per_m
    event_energy_J = 0.5 * mass_kg * (v_mps**2)
    capacity_energy_J = 0.5 * secant_stiffness * (break_extension_m**2)

    pred_extension_m = math.sqrt((2.0 * event_energy_J) / secant_stiffness)
    peak_force_N = secant_stiffness * pred_extension_m
    peak_force_lbs = peak_force_N / n_per_lbf

    rating_margin = strength_lbs / peak_force_lbs
    energy_margin = capacity_energy_J / event_energy_J

    return {
        "benchmarkId": "linear-elastic-snatch-energy-margin-nylon",
        "inputs": {
            "config": {
                "main_chute": {"specs": {"diameter_in": 60}},
                "drogue_chute": {"specs": {"diameter_in": 18}},
                "shock_cord": {
                    "specs": {
                        "strength_lbs": strength_lbs,
                        "length_ft": length_ft,
                        "elongation_pct": elongation_pct,
                        "material": "nylon",
                    }
                },
            },
            "mass_kg": mass_kg,
            "deploy_alt_ft": 800,
            "approach_velocity_fps": v_fps,
        },
        "intermediate": {
            "break_extension_m": break_extension_m,
            "secant_stiffness_N_per_m": secant_stiffness,
            "velocity_mps": v_mps,
            "event_energy_J": event_energy_J,
            "capacity_energy_J": capacity_energy_J,
            "predicted_extension_m": pred_extension_m,
        },
        "metrics": {
            "peak_force_proxy_lbs": {
                "value": peak_force_lbs,
                "rounded": round(peak_force_lbs, 3),
                "unit": "lbf",
                "tolerance": {"relative": 0.001, "basis": "analyst-derived"},
            },
            "rating_margin": {
                "value": rating_margin,
                "rounded": round(rating_margin, 3),
                "unit": "dimensionless",
                "tolerance": {"relative": 0.001, "basis": "analyst-derived"},
            },
            "energy_margin": {
                "value": energy_margin,
                "rounded": round(energy_margin, 3),
                "unit": "dimensionless",
                "tolerance": {"relative": 0.001, "basis": "analyst-derived"},
            },
        },
    }


def compute_all_references():
    return {
        "calculator": "independent-first-principles-reference-calculator",
        "version": "1.0.0",
        "standard_library_only": True,
        "references": {
            "isa-troposphere-analytic-2500m": compute_isa_2500m(),
            "terminal-descent-nominal-48in-sea-level": compute_terminal_descent_48in(),
            "cardinal-wind-drift-north-3000ft": compute_cardinal_wind_drift_3000ft(),
            "linear-elastic-snatch-energy-margin-nylon": compute_secant_snatch_arithmetic(),
        },
    }


if __name__ == "__main__":
    data = compute_all_references()
    if "--json" in sys.argv or len(sys.argv) == 1:
        print(json.dumps(data, indent=2))
    else:
        for bid, bench in data["references"].items():
            print(f"=== {bid} ===")
            for mname, mval in bench["metrics"].items():
                print(f"  {mname}: {mval['value']:.6f} {mval['unit']} (tolerance {mval['tolerance']})")
