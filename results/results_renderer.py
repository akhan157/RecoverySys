"""
Results Renderer — assembles DeploymentEvent objects from session state
and renders FOS result cards in the Streamlit UI.

This is the only layer that wires models + physics + display together.
"""

import io
import streamlit as st
from datetime import datetime

from config.architectures import ARCHITECTURES, VELOCITY_SOURCE_LABELS
from models.rocket import Rocket
from models.rocket_section import RocketSection
from models.recovery_bay import RecoveryBay
from models.component import Component
from models.deployment_event import DeploymentEvent, RESULT_PASS, RESULT_WARNING, RESULT_FAIL
from utils.format import fmt_force, fmt_fos, fmt_mass, fmt_energy, fmt_length, fmt_velocity
from validation.validator import validate_physics_inputs


# ── Session state assembly ────────────────────────────────────────────────────

def _build_rocket_from_session() -> Rocket:
    """Reconstruct a Rocket object from st.session_state."""
    arch_key = st.session_state["arch_selection"]
    arch_cfg = ARCHITECTURES[arch_key]

    # Sections
    section_masses: dict = st.session_state.get("section_masses", {})
    sections = [
        RocketSection(name=label, mass_kg=section_masses.get(label, 1.0))
        for label in arch_cfg["section_labels"]
    ]

    # Recovery bays
    bay_dimensions: dict = st.session_state.get("bay_dimensions", {})
    recovery_bays = {}
    for label in arch_cfg["bay_labels"]:
        dims = bay_dimensions.get(label, {})
        recovery_bays[label] = RecoveryBay(
            name=label,
            diameter_mm=dims.get("diameter_mm", 0.0),
            length_mm=dims.get("length_mm", 0.0),
        )

    # Descent profile
    profile: dict = st.session_state.get("descent_profile", {})

    return Rocket(
        architecture=arch_key,
        sections=sections,
        recovery_bays=recovery_bays,
        velocity_at_apogee_ms=profile.get("velocity_at_apogee_ms", 5.0),
        drogue_descent_rate_ms=profile.get("drogue_descent_rate_ms", 30.0),
        target_main_descent_rate_ms=profile.get("target_main_descent_rate_ms", 6.0),
        target_fos=profile.get("target_fos", 4.0),
    )


# ── Result card rendering ─────────────────────────────────────────────────────

def _render_event_card(event: DeploymentEvent, target_fos: float) -> None:
    """Render a single DeploymentEvent result card."""
    tier = event.result_tier

    if tier == RESULT_PASS:
        container = st.success
        icon = "✅"
    elif tier == RESULT_WARNING:
        container = st.warning
        icon = "⚠️"
    else:
        container = st.error
        icon = "❌"

    container(f"{icon} **{event.event_name}** — Limiting FOS: {fmt_fos(event.limiting_fos)} (target: {fmt_fos(target_fos)})")

    if not event.ok:
        st.error(f"Calculation error: {event.error_message}")
        return

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Peak Force (F_peak)", fmt_force(event.f_peak_n))
    with col2:
        st.metric("Cord FOS", fmt_fos(event.cord_fos),
                  delta=f"{event.cord_fos - target_fos:+.2f} vs target",
                  delta_color="normal" if event.cord_fos >= target_fos else "inverse")
    with col3:
        if event.quick_link_fos is not None:
            st.metric("Quick Link FOS", fmt_fos(event.quick_link_fos),
                      delta=f"{event.quick_link_fos - target_fos:+.2f} vs target",
                      delta_color="normal" if event.quick_link_fos >= target_fos else "inverse")
        else:
            st.metric("Quick Link FOS", "—")
    with col4:
        st.metric("Limiting FOS", fmt_fos(event.limiting_fos))

    with st.expander("Full calculation detail"):
        detail_col1, detail_col2 = st.columns(2)
        with detail_col1:
            st.write("**Inputs**")
            st.write(f"- Body 1 mass: {fmt_mass(event.m1_kg)}")
            st.write(f"- Body 2 mass: {fmt_mass(event.m2_kg)}")
            st.write(f"- Velocity: {fmt_velocity(event.velocity_ms)}")
            st.write(f"- Cord: {event.shock_cord.name}")
            st.write(f"- Cord length: {fmt_length(event.shock_cord.cord_length_m)}")
            st.write(f"- Elongation: {event.shock_cord.elongation_percentage:.0f}%")
            st.write(f"- Tensile strength: {fmt_force(event.shock_cord.tensile_strength_n)}")
        with detail_col2:
            st.write("**Computed Values**")
            st.write(f"- Reduced mass: {fmt_mass(event.reduced_mass_kg)}")
            st.write(f"- Kinetic energy: {fmt_energy(event.kinetic_energy_j)}")
            st.write(f"- Cord extension (Δx): {fmt_length(event.delta_x_m)}")
            st.write(f"- Peak force: {fmt_force(event.f_peak_n)}")

    if tier == RESULT_FAIL:
        req_kn = event.required_tensile_strength_n / 1000
        st.error(
            f"**Action required:** To achieve FOS {fmt_fos(target_fos)}, "
            f"the {event.limiting_component_name} needs a tensile strength of at least "
            f"**{req_kn:.2f} kN** ({event.required_tensile_strength_n:.0f} N). "
            f"Consider a stronger cord or a higher-elongation cord to reduce peak force."
        )
    elif tier == RESULT_WARNING:
        st.warning(
            f"**Marginal:** FOS is within 10% of target. "
            f"Consider a slightly stronger or longer cord to add margin."
        )


# ── Report text generation ────────────────────────────────────────────────────

def _generate_report(rocket: Rocket, events: list[DeploymentEvent]) -> str:
    """Generate a plain-text summary report for download."""
    lines = [
        "=" * 60,
        "ROCKET RECOVERY SAFETY REPORT",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "=" * 60,
        "",
        f"Architecture:  {ARCHITECTURES[rocket.architecture]['label']}",
        f"Target FOS:    {fmt_fos(rocket.target_fos)}",
        "",
        "SECTIONS:",
    ]
    for sec in rocket.sections:
        lines.append(f"  {sec.name}: {fmt_mass(sec.mass_kg)}")

    lines += [
        "",
        "DESCENT PROFILE:",
        f"  Velocity at apogee:  {fmt_velocity(rocket.velocity_at_apogee_ms)}",
        f"  Drogue descent rate: {fmt_velocity(rocket.drogue_descent_rate_ms)}",
        f"  Main descent rate:   {fmt_velocity(rocket.target_main_descent_rate_ms)}",
        "",
        "=" * 60,
        "RESULTS BY DEPLOYMENT EVENT",
        "=" * 60,
    ]

    overall = RESULT_PASS
    for event in events:
        tier = event.result_tier
        if tier == RESULT_FAIL:
            overall = RESULT_FAIL
        elif tier == RESULT_WARNING and overall == RESULT_PASS:
            overall = RESULT_WARNING

        lines += [
            "",
            f"EVENT: {event.event_name}",
            f"  Status:          {tier.upper()}",
            f"  Cord:            {event.shock_cord.name}",
            f"  Velocity:        {fmt_velocity(event.velocity_ms)}",
            f"  Reduced mass:    {fmt_mass(event.reduced_mass_kg)}",
            f"  Kinetic energy:  {fmt_energy(event.kinetic_energy_j)}",
            f"  Cord extension:  {fmt_length(event.delta_x_m)}",
            f"  Peak force:      {fmt_force(event.f_peak_n)}",
            f"  Cord FOS:        {fmt_fos(event.cord_fos)}",
        ]
        if event.quick_link_fos is not None:
            lines.append(f"  Quick link FOS:  {fmt_fos(event.quick_link_fos)}")
        lines.append(f"  Limiting FOS:    {fmt_fos(event.limiting_fos)}")

    lines += [
        "",
        "=" * 60,
        f"OVERALL RESULT: {overall.upper()}",
        "=" * 60,
    ]
    return "\n".join(lines)


# ── Main render function ──────────────────────────────────────────────────────

def render() -> None:
    """Render the results screen."""
    st.subheader("FOS Results")

    # Build rocket from session
    try:
        rocket = _build_rocket_from_session()
    except Exception as exc:
        st.error(f"Could not assemble rocket configuration: {exc}")
        if st.button("← Go Back"):
            st.session_state.current_screen = 5
            st.rerun()
        return

    selected_components: dict = st.session_state.get("selected_components", {})
    arch_key = rocket.architecture
    arch_cfg = ARCHITECTURES[arch_key]

    # Pre-physics validation guard
    guard = validate_physics_inputs(rocket, selected_components)
    if not guard.valid:
        st.error("Configuration errors must be resolved before calculating:")
        for err in guard.errors:
            st.error(f"• {err.message}")
        if st.button("← Go Back to Components"):
            st.session_state.current_screen = 5
            st.rerun()
        return

    # Assemble DeploymentEvents
    events: list[DeploymentEvent] = []
    for event_cfg in arch_cfg["deployment_events"]:
        cord_role = event_cfg["cord_role"]
        ql_role = event_cfg.get("quick_link_role")
        velocity_source = event_cfg["velocity_source"]

        m1 = rocket.resolve_section_mass(event_cfg["section_indices"][0])
        m2 = rocket.resolve_section_mass(event_cfg["section_indices"][1])
        velocity = rocket.get_velocity(velocity_source)
        cord: Component = selected_components.get(cord_role)
        quick_link: Component | None = selected_components.get(ql_role) if ql_role else None

        if cord is None:
            st.error(f"No shock cord selected for '{event_cfg['name']}'. Go back to Step 5.")
            continue

        event = DeploymentEvent(
            event_name=event_cfg["name"],
            m1_kg=m1,
            m2_kg=m2,
            velocity_ms=velocity,
            shock_cord=cord,
            quick_link=quick_link,
            target_fos=rocket.target_fos,
        )
        events.append(event)

    if not events:
        st.error("No deployment events could be calculated.")
        if st.button("← Go Back"):
            st.session_state.current_screen = 5
            st.rerun()
        return

    # Overall summary banner
    overall_tier = RESULT_PASS
    for ev in events:
        if ev.result_tier == RESULT_FAIL:
            overall_tier = RESULT_FAIL
            break
        if ev.result_tier == RESULT_WARNING:
            overall_tier = RESULT_WARNING

    st.markdown("---")
    if overall_tier == RESULT_PASS:
        st.success(
            f"✅ **All deployment events pass** your target FOS of {fmt_fos(rocket.target_fos)}."
        )
    elif overall_tier == RESULT_WARNING:
        st.warning(
            f"⚠️ **One or more events are marginal** — FOS is close to your target of "
            f"{fmt_fos(rocket.target_fos)}. Review the flagged events below."
        )
    else:
        st.error(
            f"❌ **One or more events fail** to meet your target FOS of "
            f"{fmt_fos(rocket.target_fos)}. Review the failed events and adjust your hardware."
        )
    st.markdown("---")

    # Individual event cards
    for event in events:
        _render_event_card(event, rocket.target_fos)
        st.markdown("")

    st.divider()

    # Download report
    report_text = _generate_report(rocket, events)
    st.download_button(
        label="Download Plain-Text Report",
        data=report_text.encode("utf-8"),
        file_name=f"recovery_fos_report_{datetime.now().strftime('%Y%m%d_%H%M')}.txt",
        mime="text/plain",
    )

    st.divider()
    col_back, col_restart = st.columns(2)
    with col_back:
        if st.button("← Edit Components", use_container_width=True):
            st.session_state.current_screen = 5
            st.rerun()
    with col_restart:
        if st.button("Start Over", use_container_width=True):
            # Clear all wizard state
            for key in [
                "current_screen", "arch_selection", "bay_dimensions",
                "section_masses", "descent_profile", "selected_components",
                "selected_parachutes",
            ]:
                st.session_state.pop(key, None)
            st.rerun()
