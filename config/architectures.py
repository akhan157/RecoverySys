"""
Architecture configuration map.

This is the single extension point for new rocket configurations.
Adding a new architecture means adding one entry to ARCHITECTURES —
no changes to screen, validation, or results code.

Each architecture defines:
  - section_count:       how many RocketSection inputs Screen 3 renders
  - section_labels:      human-readable labels for each section input
  - bay_count:           how many RecoveryBay dimension forms Screen 2 renders
  - bay_labels:          human-readable labels for each bay input
  - deployment_events:   list of two-body events the ResultsRenderer creates

deployment_event keys:
  - name:            display label for the result card
  - section_indices: [i, j] where i/j are indices into rocket.sections
                     Use "N+" notation to mean "sum of sections N onward"
                     e.g. [0, "1+"] = section 0 vs. (section 1 + section 2 + ...)
  - velocity_source: key on the Rocket object that provides velocity_ms
                     one of: "velocity_at_apogee_ms" | "drogue_descent_rate_ms"
                             | "target_main_descent_rate_ms"
  - cord_role:       key in selected_components dict for this event's shock cord
  - quick_link_role: key in selected_components for this event's quick link (optional)
  - bay_role:        which bay (by bay label) this event's components live in
"""

ARCHITECTURES: dict = {
    "single_deploy": {
        "label": "Single Deploy",
        "description": (
            "One ejection charge deploys a single parachute at apogee. "
            "The entire rocket descends under one canopy."
        ),
        "section_count": 2,
        "section_labels": ["Forward Section (nose + payload)", "Aft Section (motor + fins)"],
        "bay_count": 1,
        "bay_labels": ["Recovery Bay"],
        "deployment_events": [
            {
                "name": "Apogee / Main Deployment",
                "section_indices": [0, 1],
                "velocity_source": "velocity_at_apogee_ms",
                "cord_role": "main_cord",
                "quick_link_role": "main_quick_link",
                "bay_role": "Recovery Bay",
            }
        ],
    },

    "dual_deploy_single_sep": {
        "label": "Dual Deploy — Single Separation",
        "description": (
            "One separation point. A drogue deploys at apogee, then the main "
            "deploys at low altitude. Both parachutes share one recovery bay "
            "in the same airframe section."
        ),
        "section_count": 2,
        "section_labels": ["Forward Section (nose + payload)", "Aft Section (motor + fins)"],
        "bay_count": 2,
        "bay_labels": ["Drogue Bay", "Main Bay"],
        "deployment_events": [
            {
                "name": "Drogue Deployment (Apogee)",
                "section_indices": [0, 1],
                "velocity_source": "velocity_at_apogee_ms",
                "cord_role": "drogue_cord",
                "quick_link_role": "drogue_quick_link",
                "bay_role": "Drogue Bay",
            },
            {
                "name": "Main Deployment (Low Altitude)",
                "section_indices": [0, 1],
                "velocity_source": "drogue_descent_rate_ms",
                "cord_role": "main_cord",
                "quick_link_role": "main_quick_link",
                "bay_role": "Main Bay",
            },
        ],
    },

    "dual_deploy_dual_sep": {
        "label": "Dual Deploy — Dual Separation",
        "description": (
            "Two separation points. Nose cone separates at apogee (drogue in nose). "
            "Payload/booster joint separates at low altitude (main in payload bay). "
            "Three airframe sections."
        ),
        "section_count": 3,
        "section_labels": [
            "Nose Cone",
            "Payload / Mid Section",
            "Booster (motor + fins)",
        ],
        "bay_count": 2,
        "bay_labels": ["Drogue Bay (Nose)", "Main Bay (Payload)"],
        "deployment_events": [
            {
                "name": "Drogue Deployment (Apogee) — Nose Separation",
                "section_indices": [0, "1+"],
                "velocity_source": "velocity_at_apogee_ms",
                "cord_role": "drogue_cord",
                "quick_link_role": "drogue_quick_link",
                "bay_role": "Drogue Bay (Nose)",
            },
            {
                "name": "Main Deployment (Low Altitude) — Payload/Booster Separation",
                "section_indices": [1, 2],
                "velocity_source": "drogue_descent_rate_ms",
                "cord_role": "main_cord",
                "quick_link_role": "main_quick_link",
                "bay_role": "Main Bay (Payload)",
            },
        ],
    },
}

# Convenience: ordered list of architecture keys for Screen 1 radio display
ARCHITECTURE_KEYS: list[str] = list(ARCHITECTURES.keys())

# Map velocity_source keys to human-readable labels (used in result cards)
VELOCITY_SOURCE_LABELS: dict[str, str] = {
    "velocity_at_apogee_ms": "Velocity at Apogee",
    "drogue_descent_rate_ms": "Drogue Descent Rate",
    "target_main_descent_rate_ms": "Main Descent Rate",
}
