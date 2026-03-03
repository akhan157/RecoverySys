"""
Screen 3 — Section Masses.

Dynamically renders 2 or 3 section mass inputs based on the architecture.
Labels are context-sensitive from the architecture configuration.
Displays total rocket mass in real time.
"""

import streamlit as st

from config.architectures import ARCHITECTURES
from validation.validator import validate_screen3


def render() -> None:
    """Render Screen 3 and handle Back/Next navigation."""
    arch_key = st.session_state.get("arch_selection", "single_deploy")
    arch_cfg = ARCHITECTURES[arch_key]

    st.subheader("Step 3 of 5 — Section Masses")
    st.write(
        "Enter the mass of each airframe section **including all internal components, "
        "motor hardware, and propellant** for the worst-case flight condition."
    )
    st.info(
        "**Tip:** For an upper-stage or deployed motor, use the loaded (full propellant) mass. "
        "This gives the conservative (highest) FOS calculation."
    )
    st.divider()

    section_labels = arch_cfg["section_labels"]
    saved_sections: dict = st.session_state.get("section_masses", {})
    section_data = []
    total_mass = 0.0

    for label in section_labels:
        saved_mass = saved_sections.get(label, 1.0)
        mass = st.number_input(
            f"{label} — Mass (kg)",
            min_value=0.0,
            value=float(saved_mass),
            step=0.05,
            format="%.3f",
            key=f"section_{label}_mass",
        )
        section_data.append({"label": label, "mass_kg": mass})
        total_mass += mass if mass > 0 else 0

    st.divider()
    st.metric("Total Rocket Mass", f"{total_mass:.3f} kg")

    # Validate
    validation = validate_screen3(section_data)

    for err in validation.errors:
        st.error(err.message)
    for warn in validation.warnings:
        st.warning(warn.message)

    col_back, col_next = st.columns(2)
    with col_back:
        if st.button("← Back", use_container_width=True):
            st.session_state.current_screen = 2
            st.rerun()
    with col_next:
        if st.button(
            "Next →",
            type="primary",
            use_container_width=True,
            disabled=not validation.valid,
        ):
            st.session_state.section_masses = {
                sec["label"]: sec["mass_kg"] for sec in section_data
            }
            st.session_state.current_screen = 4
            st.rerun()
