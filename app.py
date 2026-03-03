"""
Rocket Recovery Safety Calculator — Streamlit entry point.

Run with:
    streamlit run app.py

Or deploy directly to Streamlit Community Cloud by pointing it at this file.
"""

import logging
import streamlit as st

from data.component_loader import load_catalog

# Screen renderers
from screens import (
    screen1_architecture,
    screen2_bay_dimensions,
    screen3_section_masses,
    screen4_descent_profile,
    screen5_components,
)
from results import results_renderer

logging.basicConfig(level=logging.INFO)

# ── Page configuration ────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Rocket Recovery Safety Calculator",
    page_icon="🚀",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ── One-time startup: load component catalog ──────────────────────────────────

if "component_catalog" not in st.session_state:
    try:
        st.session_state.component_catalog = load_catalog()
    except FileNotFoundError:
        st.error(
            "Component catalog not found. "
            "Ensure `data/components.json` exists in the project directory."
        )
        st.stop()
    except Exception as exc:
        st.error(f"Failed to load component catalog: {exc}")
        st.stop()

# ── Session state initialisation ─────────────────────────────────────────────

if "current_screen" not in st.session_state:
    st.session_state.current_screen = 1

# ── Progress indicator ────────────────────────────────────────────────────────

current = st.session_state.current_screen
total_screens = 5

if current <= total_screens:
    step_labels = [
        "Architecture",
        "Bay Dimensions",
        "Section Masses",
        "Descent Profile",
        "Components",
    ]
    cols = st.columns(total_screens)
    for i, (col, label) in enumerate(zip(cols, step_labels), start=1):
        with col:
            if i < current:
                st.markdown(f"<div style='text-align:center;color:#4CAF50'>✓ {label}</div>",
                            unsafe_allow_html=True)
            elif i == current:
                st.markdown(f"<div style='text-align:center;font-weight:bold'>● {label}</div>",
                            unsafe_allow_html=True)
            else:
                st.markdown(f"<div style='text-align:center;color:#aaa'>○ {label}</div>",
                            unsafe_allow_html=True)
    st.write("")

# ── Screen routing ────────────────────────────────────────────────────────────

if current == 1:
    screen1_architecture.render()
elif current == 2:
    screen2_bay_dimensions.render()
elif current == 3:
    screen3_section_masses.render()
elif current == 4:
    screen4_descent_profile.render()
elif current == 5:
    screen5_components.render()
elif current == 6:
    results_renderer.render()
else:
    st.error(f"Unknown screen: {current}")
    st.session_state.current_screen = 1
    st.rerun()
