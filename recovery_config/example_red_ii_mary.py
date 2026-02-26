"""
example_red_ii_mary.py

Demonstrates how to assemble the RED II-MARY rocket (Binghamton AeroBing)
using the foundational data structures. This is a DUAL_DEPLOY_SINGLE_SEP
configuration: one separation joint, drogue at apogee, main via Jolly Logic
Chute Release at 300 m AGL.

Run with: python -m recovery_config.example_red_ii_mary
"""

from __future__ import annotations

from .enums import (
    RecoveryArchitecture,
    BayRole,
    SeparationMechanism,
    ComponentType,
)
from .models import Rocket, RocketSection, RecoveryBay
from .components import (
    Parachute,
    ShockCord,
    MechanicalRelease,
    Altimeter,
)
from . import physics


def build_red_ii_mary() -> Rocket:
    # ── 1. Sections — what physically separates ────────────────────────────
    nosecone_payload = RocketSection(
        name="Nosecone+Payload",
        dry_mass_kg=1.8,        # Nosecone + payload bay + ballast
        motor_mass_kg=0.0,
        notes="G10 filament-wound nosecone, payload bay with camera",
    )

    aft_fin_can = RocketSection(
        name="Aft Fin Can",
        dry_mass_kg=2.4,        # Aft airframe, fins, motor mount, retainer
        motor_mass_kg=0.52,     # AeroTech J350W casing (0.28 kg) + propellant (0.24 kg) at apogee
        notes="4\" Blue Tube airframe, G10 fins, 54mm motor mount",
    )

    # ── 2. Shared Recovery Bay ─────────────────────────────────────────────
    # Single-sep: one bay houses drogue + main + avionics
    shared_bay = RecoveryBay(
        name="Shared Recovery Bay",
        role=BayRole.SHARED_BAY,
        inner_diameter_mm=98.0,     # 4\" Blue Tube ID ≈ 98 mm
        length_mm=380.0,
        separation_mechanism=SeparationMechanism.EJECTION_CHARGE,
        section_above_id="Nosecone+Payload",
        section_below_id="Aft Fin Can",
        shear_pin_count=3,
    )

    # ── 3. Rocket object ───────────────────────────────────────────────────
    rocket = Rocket(
        name="RED II-MARY",
        architecture=RecoveryArchitecture.DUAL_DEPLOY_SINGLE_SEP,
        sections=[nosecone_payload, aft_fin_can],
        bays=[shared_bay],
        target_apogee_m=1524.0,             # 5000 ft AGL
        drogue_deploy_velocity_ms=2.0,      # ~0 at apogee, small residual
        main_deploy_altitude_m=304.8,       # 1000 ft AGL
        main_deploy_velocity_ms=12.5,       # Descent rate under drogue
        launch_site_elevation_m=488.0,      # Binghamton area ~1600 ft ASL
    )

    # ── 4. Components ──────────────────────────────────────────────────────
    drogue = Parachute(
        id="fc_iris_ultra_18_drogue",
        manufacturer="Fruity Chutes",
        model_name='Iris Ultra 18"',
        component_type=ComponentType.DROGUE,
        mass_kg=0.065,
        packed_volume_cm3=75.0,
        nominal_diameter_m=0.457,
        drag_coefficient=1.50,
    )

    main_chute = Parachute(
        id="fc_iris_ultra_36_main",
        manufacturer="Fruity Chutes",
        model_name='Iris Ultra 36"',
        component_type=ComponentType.PARACHUTE,
        mass_kg=0.198,
        packed_volume_cm3=280.0,
        nominal_diameter_m=0.914,
        drag_coefficient=1.55,
    )

    chute_release = MechanicalRelease(
        id="jl_chute_release_3",
        manufacturer="Jolly Logic",
        model_name="Chute Release 3",
        component_type=ComponentType.MECHANICAL_RELEASE,
        mass_kg=0.042,
        packed_volume_cm3=50.0,
        min_altitude_m=30.0,
        max_altitude_m=914.0,
        max_parachute_diameter_m=1.22,
    )

    altimeter = Altimeter(
        id="pf_stratologger_cf",
        manufacturer="PerfectFlite",
        model_name="StratoLoggerCF",
        component_type=ComponentType.ALTIMETER,
        mass_kg=0.022,
        packed_volume_cm3=28.0,
        channel_count=2,
    )

    drogue_cord = ShockCord(
        id="shock_cord_drogue",
        manufacturer="Generic",
        model_name='9/16" Tubular Nylon, 15 ft',
        component_type=ComponentType.SHOCK_CORD,
        mass_kg=0.180,
        packed_volume_cm3=120.0,
        length_m=4.57,
        tensile_strength_n=11120.0,
        elongation_fraction=0.12,
    )

    for comp in [drogue, main_chute, chute_release, altimeter, drogue_cord]:
        rocket.add_component(comp)
        shared_bay.assign_component(comp.id)

    return rocket


def run_analysis(rocket: Rocket) -> None:
    launch_asl = rocket.launch_site_elevation_m

    print(f"\n{'='*60}")
    print(f"  {rocket.name} — Recovery System Analysis")
    print(f"{'='*60}")

    # ── Structural validation ──────────────────────────────────────────────
    errors = rocket.validate()
    print(f"\n[Validation] {'PASS' if not errors else 'FAIL'}")
    for e in errors:
        print(f"  ✗ {e}")

    # ── Bay volume summary ─────────────────────────────────────────────────
    packed_vols = {cid: c.packed_volume_cm3 for cid, c in rocket.components.items()}
    for bay in rocket.bays:
        gross  = bay.gross_volume_cm3
        packed = bay.packed_volume_cm3(packed_vols)
        avail  = bay.available_volume_cm3(packed_vols)
        util   = bay.packing_utilization(packed_vols) * 100
        print(f"\n[Bay: {bay.name}]")
        print(f"  Gross volume : {gross:.1f} cm³")
        print(f"  Packed       : {packed:.1f} cm³  ({util:.0f}% utilized)")
        print(f"  Available    : {avail:.1f} cm³  {'(OK)' if avail >= 0 else '(OVERFLOW)'}")

    # ── Ejection charge calculation ────────────────────────────────────────
    apogee_asl = launch_asl + rocket.target_apogee_m
    for bay in rocket.bays:
        charge_g = physics.ejection_charge_g(
            bay_volume_cm3=bay.gross_volume_cm3,
            altitude_asl_m=apogee_asl,
            shear_pin_count=bay.shear_pin_count,
        )
        print(f"\n[Ejection Charge: {bay.name}]")
        print(f"  Deployment altitude : {apogee_asl:.0f} m ASL")
        print(f"  Recommended FFFF    : {charge_g:.2f} g")
        print(f"  Ground test at      : {charge_g * 2:.2f} g and {charge_g * 3:.2f} g")

    # ── Shock cord FOS ─────────────────────────────────────────────────────
    # For single-sep: one cord, one event (the apogee separation)
    drogue_cord = rocket.components.get("shock_cord_drogue")
    if drogue_cord and isinstance(drogue_cord, ShockCord):
        nose = rocket.section_by_name("Nosecone+Payload")
        aft  = rocket.section_by_name("Aft Fin Can")
        if nose and aft:
            f_snatch = physics.snatch_force_n(
                mass_above_kg=nose.total_mass_kg,
                mass_below_kg=aft.total_mass_kg,
                deployment_velocity_ms=rocket.drogue_deploy_velocity_ms,
                cord_length_m=drogue_cord.length_m,
                elongation_fraction=drogue_cord.elongation_fraction,
            )
            fos = physics.cord_fos(drogue_cord.tensile_strength_n, f_snatch)
            min_mbs = physics.min_breaking_strength_required(f_snatch)
            print(f"\n[Shock Cord FOS — Apogee Event]")
            print(f"  Section above ({nose.name}): {nose.total_mass_kg:.2f} kg")
            print(f"  Section below ({aft.name}) : {aft.total_mass_kg:.2f} kg")
            print(f"  Deployment velocity        : {rocket.drogue_deploy_velocity_ms:.1f} m/s")
            print(f"  Peak snatch force          : {f_snatch:.1f} N")
            print(f"  Cord tensile strength       : {drogue_cord.tensile_strength_n:.0f} N")
            print(f"  FOS                        : {fos:.1f}  (min required: {physics.FOS_MINIMUM_SHOCK_CORD:.1f})")
            print(f"  {'PASS' if fos >= physics.FOS_MINIMUM_SHOCK_CORD else 'FAIL — upgrade cord'}")

    # ── Descent rates ──────────────────────────────────────────────────────
    main_chute_obj = rocket.components.get("fc_iris_ultra_36_main")
    if main_chute_obj and isinstance(main_chute_obj, Parachute):
        total_mass = sum(s.total_mass_kg for s in rocket.sections)
        rho_main = physics.isa_density(launch_asl + rocket.main_deploy_altitude_m)
        vt_main = main_chute_obj.terminal_velocity(total_mass, rho_main)
        print(f"\n[Descent Rate — Main Parachute]")
        print(f"  Suspended mass   : {total_mass:.2f} kg")
        print(f"  Canopy diameter  : {main_chute_obj.nominal_diameter_m:.2f} m")
        print(f"  Air density      : {rho_main:.4f} kg/m³")
        print(f"  Terminal velocity: {vt_main:.2f} m/s  ({vt_main * 3.281:.1f} ft/s)")
        safe = physics.is_descent_rate_safe(vt_main)
        print(f"  Range safety     : {'PASS (< 9.14 m/s)' if safe else 'FAIL — too fast'}")
        ke = physics.landing_ke_joules(total_mass, vt_main)
        print(f"  Landing KE       : {ke:.1f} J")

    print(f"\n{'='*60}\n")


if __name__ == "__main__":
    rocket = build_red_ii_mary()
    run_analysis(rocket)
