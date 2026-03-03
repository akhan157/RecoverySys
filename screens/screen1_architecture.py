"""
Screen 1 — Architecture Selection.

The user selects the rocket's recovery architecture. This choice drives
every dynamic UI decision downstream: how many bays (Screen 2), how
many sections (Screen 3), and which deployment events are calculated.
"""

import streamlit as st

from config.architectures import ARCHITECTURES


def render() -> None:
    """Render Screen 1 and handle Next navigation."""
    st.title("Rocket Recovery Safety Calculator")
    st.subheader("Step 1 of 5 — Recovery Architecture")
    st.write(
        "Select the recovery architecture for your rocket. "
        "This determines how many separation points and recovery bays your configuration has."
    )
    st.divider()

    # Build radio options from the ARCHITECTURES config
    arch_keys = list(ARCHITECTURES.keys())
    arch_labels = [ARCHITECTURES[k]["label"] for k in arch_keys]

    # Determine default selection
    current_arch = st.session_state.get("arch_selection", arch_keys[0])
    current_index = arch_keys.index(current_arch) if current_arch in arch_keys else 0

    selected_label = st.radio(
        "Recovery Architecture",
        options=arch_labels,
        index=current_index,
        label_visibility="collapsed",
    )
    selected_key = arch_keys[arch_labels.index(selected_label)]

    # Show description for selected architecture
    arch_cfg = ARCHITECTURES[selected_key]
    st.info(arch_cfg["description"])

    # Summary of what this architecture entails
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Separation Points", arch_cfg["section_count"] - 1)
    with col2:
        st.metric("Airframe Sections", arch_cfg["section_count"])
    with col3:
        st.metric("Recovery Bays", arch_cfg["bay_count"])

    st.divider()
    if st.button("Next →", type="primary", use_container_width=True):
        st.session_state.arch_selection = selected_key
        st.session_state.current_screen = 2
        st.rerun()
