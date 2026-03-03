"""
Screen 5 — Component Selection.

The most complex screen. Renders a filtered component browser, lets the
user assign components to their roles (shock cords and quick links per
deployment event, parachutes per bay), and shows real-time bay volume
utilisation as a progress bar.
"""

import math
import streamlit as st

from config.architectures import ARCHITECTURES
from data.component_loader import (
    get_by_category_and_architecture,
    get_by_architecture,
)
from models.component import Component
from models.recovery_bay import RecoveryBay
from validation.validator import validate_screen5


# ── Helpers ───────────────────────────────────────────────────────────────────

def _component_label(c: Component) -> str:
    parts = [c.name]
    if c.manufacturer:
        parts.append(f"({c.manufacturer})")
    extras = []
    if c.tensile_strength_n:
        kn = c.tensile_strength_n / 1000
        extras.append(f"{kn:.1f} kN")
    if c.elongation_percentage:
        extras.append(f"{c.elongation_percentage:.0f}% elong.")
    if c.cord_length_m:
        extras.append(f"{c.cord_length_m:.1f} m")
    if extras:
        parts.append("— " + ", ".join(extras))
    return " ".join(parts)


def _none_option() -> str:
    return "— None —"


def _build_bay_objects(arch_key: str, bay_dimensions: dict) -> dict[str, RecoveryBay]:
    """Reconstruct RecoveryBay objects from session state data."""
    arch_cfg = ARCHITECTURES[arch_key]
    bays = {}
    for label in arch_cfg["bay_labels"]:
        dims = bay_dimensions.get(label, {})
        bays[label] = RecoveryBay(
            name=label,
            diameter_mm=dims.get("diameter_mm", 0.0),
            length_mm=dims.get("length_mm", 0.0),
        )
    return bays


def _build_volume_map(
    bays: dict[str, RecoveryBay],
    bay_roles: dict[str, str],
    selected: dict[str, Component],
    parachute_bays: dict[str, Component],
) -> dict[str, float]:
    """
    Compute packed volume used per bay.

    bay_roles:      cord_role → bay_label  (from deployment_events config)
    selected:       cord_role → Component
    parachute_bays: bay_label → Component (parachute)
    """
    usage: dict[str, float] = {label: 0.0 for label in bays}

    # Cord and quick link volumes by bay
    for role, component in selected.items():
        if component is not None:
            bay_label = bay_roles.get(role)
            if bay_label and bay_label in usage:
                usage[bay_label] += component.packed_volume_cm3

    # Parachute volumes by bay
    for bay_label, chute in parachute_bays.items():
        if chute is not None and bay_label in usage:
            usage[bay_label] += chute.packed_volume_cm3

    return usage


def render() -> None:
    """Render Screen 5 and handle Back/Calculate navigation."""
    arch_key = st.session_state.get("arch_selection", "single_deploy")
    arch_cfg = ARCHITECTURES[arch_key]
    catalog: list[Component] = st.session_state.get("component_catalog", [])

    st.subheader("Step 5 of 5 — Component Selection")
    st.write(
        "Select the shock cords, quick links, and parachutes for your recovery system. "
        "Bay volume usage is tracked in real time."
    )
    st.divider()

    # ── Build bay objects ────────────────────────────────────────────────────
    bay_dimensions = st.session_state.get("bay_dimensions", {})
    bays = _build_bay_objects(arch_key, bay_dimensions)

    # ── Track cord/quick-link selection per deployment event ─────────────────
    saved_components: dict = st.session_state.get("selected_components", {})
    selected_components: dict[str, Component | None] = {}
    bay_roles: dict[str, str] = {}  # cord_role → bay_label
    required_cord_roles: list[str] = []

    for event in arch_cfg["deployment_events"]:
        cord_role = event["cord_role"]
        ql_role = event.get("quick_link_role")
        bay_role = event.get("bay_role", arch_cfg["bay_labels"][0])

        st.markdown(f"### {event['name']}")

        # ── Shock cord ───────────────────────────────────────────────────────
        cords = get_by_category_and_architecture(catalog, "shock_cord", arch_key)
        cord_options = [_none_option()] + [_component_label(c) for c in cords]
        cord_ids = [None] + [c.id for c in cords]

        saved_cord_id = (saved_components.get(cord_role) or {}).get("id") if isinstance(
            saved_components.get(cord_role), dict
        ) else getattr(saved_components.get(cord_role), "id", None)

        saved_cord_idx = (
            cord_ids.index(saved_cord_id) if saved_cord_id in cord_ids else 0
        )

        cord_col, ql_col = st.columns(2)
        with cord_col:
            selected_cord_label = st.selectbox(
                "Shock Cord",
                options=cord_options,
                index=saved_cord_idx,
                key=f"cord_{cord_role}",
            )
        selected_cord_idx = cord_options.index(selected_cord_label)
        selected_cord = cords[selected_cord_idx - 1] if selected_cord_idx > 0 else None
        selected_components[cord_role] = selected_cord
        bay_roles[cord_role] = bay_role
        required_cord_roles.append(cord_role)

        # ── Quick link ───────────────────────────────────────────────────────
        if ql_role:
            qls = get_by_category_and_architecture(catalog, "quick_link", arch_key)
            ql_options = [_none_option()] + [_component_label(c) for c in qls]
            ql_ids = [None] + [c.id for c in qls]

            saved_ql_id = getattr(saved_components.get(ql_role), "id", None)
            saved_ql_idx = ql_ids.index(saved_ql_id) if saved_ql_id in ql_ids else 0

            with ql_col:
                selected_ql_label = st.selectbox(
                    "Quick Link (optional)",
                    options=ql_options,
                    index=saved_ql_idx,
                    key=f"ql_{ql_role}",
                )
            selected_ql_idx = ql_options.index(selected_ql_label)
            selected_ql = qls[selected_ql_idx - 1] if selected_ql_idx > 0 else None
            selected_components[ql_role] = selected_ql
            bay_roles[ql_role] = bay_role

        st.divider()

    # ── Parachute selection per bay ──────────────────────────────────────────
    st.markdown("### Parachutes")
    parachutes = get_by_category_and_architecture(catalog, "parachute", arch_key)
    chute_options = [_none_option()] + [_component_label(c) for c in parachutes]
    chute_ids = [None] + [c.id for c in parachutes]

    parachute_bays: dict[str, Component | None] = {}
    saved_chutes: dict = st.session_state.get("selected_parachutes", {})

    for bay_label in arch_cfg["bay_labels"]:
        saved_chute_id = getattr(saved_chutes.get(bay_label), "id", None)
        saved_chute_idx = chute_ids.index(saved_chute_id) if saved_chute_id in chute_ids else 0

        selected_chute_label = st.selectbox(
            f"{bay_label} — Parachute (optional, for volume tracking)",
            options=chute_options,
            index=saved_chute_idx,
            key=f"chute_{bay_label}",
        )
        selected_chute_idx = chute_options.index(selected_chute_label)
        parachute_bays[bay_label] = (
            parachutes[selected_chute_idx - 1] if selected_chute_idx > 0 else None
        )

    st.divider()

    # ── Bay volume progress bars ─────────────────────────────────────────────
    st.markdown("### Bay Volume Utilisation")
    volume_usage = _build_volume_map(bays, bay_roles, selected_components, parachute_bays)

    bay_fill_fractions: dict[str, float] = {}
    for bay_label, bay in bays.items():
        used = volume_usage.get(bay_label, 0.0)
        capacity = bay.volume_cm3
        fraction = used / capacity if capacity > 0 else 0.0
        bay_fill_fractions[bay_label] = fraction

        fill_pct = min(fraction, 1.0)
        col_label, col_bar = st.columns([1, 3])
        with col_label:
            st.write(f"**{bay_label}**")
        with col_bar:
            if fraction > 1.0:
                st.error(
                    f"{used:.1f} / {capacity:.1f} cm³  ({fraction * 100:.0f}%) — OVERFULL"
                )
            elif fraction > 0.85:
                st.warning(
                    f"{used:.1f} / {capacity:.1f} cm³  ({fraction * 100:.0f}%) — Nearly full"
                )
            else:
                st.progress(fill_pct, text=f"{used:.1f} / {capacity:.1f} cm³  ({fraction * 100:.0f}%)")

    st.divider()

    # ── Validate ─────────────────────────────────────────────────────────────
    validation = validate_screen5(
        required_cord_roles=required_cord_roles,
        selected_components=selected_components,
        bay_fill_fractions=bay_fill_fractions,
    )

    for err in validation.errors:
        st.error(err.message)
    for warn in validation.warnings:
        st.warning(warn.message)

    col_back, col_calc = st.columns(2)
    with col_back:
        if st.button("← Back", use_container_width=True):
            st.session_state.current_screen = 4
            st.rerun()
    with col_calc:
        if st.button(
            "Calculate FOS Results",
            type="primary",
            use_container_width=True,
            disabled=not validation.valid,
        ):
            st.session_state.selected_components = selected_components
            st.session_state.selected_parachutes = parachute_bays
            st.session_state.current_screen = 6  # Results screen
            st.rerun()
