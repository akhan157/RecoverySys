"""
Screen 4 — Descent Profile.

Collects the descent velocity parameters and target FOS. Fields are
pre-populated with safe conservative defaults. Inline help text explains
each value.
"""

import streamlit as st

from config.architectures import ARCHITECTURES
from validation.validator import validate_screen4

# Sensible defaults for first-time users
_DEFAULTS = {
    "velocity_at_apogee_ms": 5.0,
    "drogue_descent_rate_ms": 30.0,
    "target_main_descent_rate_ms": 6.0,
    "target_fos": 4.0,
}


def render() -> None:
    """Render Screen 4 and handle Back/Next navigation."""
    arch_key = st.session_state.get("arch_selection", "single_deploy")
    arch_cfg = ARCHITECTURES[arch_key]
    is_dual = arch_cfg["bay_count"] > 1

    st.subheader("Step 4 of 5 — Descent Profile & Target FOS")
    st.write(
        "Enter the descent velocities for your flight profile. "
        "Default values are shown — adjust them to match your actual design."
    )
    st.divider()

    saved: dict = st.session_state.get("descent_profile", {})

    # ── Apogee velocity ──────────────────────────────────────────────────────
    apogee_v = st.number_input(
        "Velocity at Apogee (m/s)",
        min_value=0.0,
        value=float(saved.get("velocity_at_apogee_ms", _DEFAULTS["velocity_at_apogee_ms"])),
        step=0.5,
        format="%.1f",
        key="apogee_velocity",
    )
    st.caption(
        "The rocket's speed at the moment recovery is triggered. "
        "For a typical coast-to-apogee flight this is near 0–10 m/s. "
        "Higher values produce higher shock loads."
    )

    st.divider()

    # ── Drogue descent rate (only shown for dual-deploy architectures) ───────
    if is_dual:
        drogue_rate = st.number_input(
            "Drogue Descent Rate (m/s)",
            min_value=0.0,
            value=float(saved.get("drogue_descent_rate_ms", _DEFAULTS["drogue_descent_rate_ms"])),
            step=1.0,
            format="%.1f",
            key="drogue_descent_rate",
        )
        st.caption(
            "Terminal velocity under drogue parachute. "
            "Typical range: 20–40 m/s. This is the velocity at which the main shock "
            "cord engages during main deployment."
        )
        st.divider()
    else:
        # For single-deploy, drogue rate is not relevant — set to apogee velocity
        drogue_rate = apogee_v

    # ── Main descent rate ────────────────────────────────────────────────────
    main_rate = st.number_input(
        "Target Main Descent Rate (m/s)",
        min_value=0.0,
        value=float(saved.get("target_main_descent_rate_ms", _DEFAULTS["target_main_descent_rate_ms"])),
        step=0.5,
        format="%.1f",
        key="main_descent_rate",
    )
    st.caption(
        "Target touchdown velocity under main parachute. "
        "Typical safe range: 4–8 m/s. Used for parachute sizing reference (not FOS calculation)."
    )

    st.divider()

    # ── Target FOS ───────────────────────────────────────────────────────────
    target_fos = st.number_input(
        "Target Factor of Safety (FOS)",
        min_value=1.0,
        max_value=20.0,
        value=float(saved.get("target_fos", _DEFAULTS["target_fos"])),
        step=0.5,
        format="%.1f",
        key="target_fos",
    )
    st.caption(
        "Minimum acceptable ratio of component tensile strength to peak shock load. "
        "A FOS of 4.0 is a common HPR standard: the component must be rated at "
        "least 4× the expected peak force."
    )

    # ── Validate ─────────────────────────────────────────────────────────────
    profile_data = {
        "velocity_at_apogee_ms": apogee_v,
        "drogue_descent_rate_ms": drogue_rate,
        "target_main_descent_rate_ms": main_rate,
        "target_fos": target_fos,
    }
    validation = validate_screen4(profile_data)

    for err in validation.errors:
        st.error(err.message)
    for warn in validation.warnings:
        st.warning(warn.message)

    col_back, col_next = st.columns(2)
    with col_back:
        if st.button("← Back", use_container_width=True):
            st.session_state.current_screen = 3
            st.rerun()
    with col_next:
        if st.button(
            "Next →",
            type="primary",
            use_container_width=True,
            disabled=not validation.valid,
        ):
            st.session_state.descent_profile = profile_data
            st.session_state.current_screen = 5
            st.rerun()
