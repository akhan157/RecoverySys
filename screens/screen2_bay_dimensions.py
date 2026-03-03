"""
Screen 2 — Recovery Bay Dimensions.

Dynamically renders 1 or 2 bay dimension forms based on the architecture
chosen in Screen 1. Computed bay volume is displayed in real time.
"""

import math
import streamlit as st

from config.architectures import ARCHITECTURES
from validation.validator import validate_screen2


def _bay_volume_cm3(diameter_mm: float, length_mm: float) -> float:
    """Cylindrical bay volume in cm³."""
    if diameter_mm <= 0 or length_mm <= 0:
        return 0.0
    r_cm = (diameter_mm / 2.0) / 10.0
    l_cm = length_mm / 10.0
    return math.pi * r_cm ** 2 * l_cm


def render() -> None:
    """Render Screen 2 and handle Back/Next navigation."""
    arch_key = st.session_state.get("arch_selection", "single_deploy")
    arch_cfg = ARCHITECTURES[arch_key]

    st.subheader("Step 2 of 5 — Recovery Bay Dimensions")
    st.write(
        "Enter the **inner** diameter and usable length of each recovery bay. "
        "These are used to calculate available packing volume."
    )
    st.divider()

    bay_labels = arch_cfg["bay_labels"]
    bay_data = []

    # Load any previously saved bay values
    saved_bays: dict = st.session_state.get("bay_dimensions", {})

    for label in bay_labels:
        st.markdown(f"**{label}**")
        saved = saved_bays.get(label, {})
        col1, col2, col3 = st.columns([2, 2, 2])

        with col1:
            diameter = st.number_input(
                "Inner Diameter (mm)",
                min_value=0.0,
                value=float(saved.get("diameter_mm", 76.0)),
                step=1.0,
                key=f"bay_{label}_diameter",
            )
        with col2:
            length = st.number_input(
                "Usable Length (mm)",
                min_value=0.0,
                value=float(saved.get("length_mm", 300.0)),
                step=10.0,
                key=f"bay_{label}_length",
            )
        with col3:
            volume = _bay_volume_cm3(diameter, length)
            st.metric("Computed Volume", f"{volume:.1f} cm³")

        bay_data.append({"label": label, "diameter_mm": diameter, "length_mm": length})
        st.divider()

    # Validate
    validation = validate_screen2(bay_data)

    for err in validation.errors:
        st.error(err.message)
    for warn in validation.warnings:
        st.warning(warn.message)

    col_back, col_next = st.columns(2)
    with col_back:
        if st.button("← Back", use_container_width=True):
            st.session_state.current_screen = 1
            st.rerun()
    with col_next:
        if st.button(
            "Next →",
            type="primary",
            use_container_width=True,
            disabled=not validation.valid,
        ):
            st.session_state.bay_dimensions = {
                bay["label"]: {
                    "diameter_mm": bay["diameter_mm"],
                    "length_mm": bay["length_mm"],
                }
                for bay in bay_data
            }
            st.session_state.current_screen = 3
            st.rerun()
