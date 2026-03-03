"""Formatting helpers for display values in the Streamlit UI."""


def fmt_force(newtons: float) -> str:
    """Format a force value with appropriate units (N or kN)."""
    if abs(newtons) >= 1000:
        return f"{newtons / 1000:.2f} kN"
    return f"{newtons:.1f} N"


def fmt_fos(fos: float) -> str:
    """Format a FOS value to 2 decimal places."""
    return f"{fos:.2f}"


def fmt_mass(kg: float) -> str:
    """Format a mass in kg."""
    return f"{kg:.3f} kg"


def fmt_volume(cm3: float) -> str:
    """Format a volume in cm³."""
    return f"{cm3:.1f} cm³"


def fmt_velocity(ms: float) -> str:
    """Format a velocity in m/s."""
    return f"{ms:.1f} m/s"


def fmt_energy(joules: float) -> str:
    """Format an energy value in J or kJ."""
    if abs(joules) >= 1000:
        return f"{joules / 1000:.2f} kJ"
    return f"{joules:.1f} J"


def fmt_length(metres: float) -> str:
    """Format a length — uses cm for values < 1 m, m otherwise."""
    if metres < 1.0:
        return f"{metres * 100:.1f} cm"
    return f"{metres:.2f} m"


def result_tier_label(tier: str) -> str:
    """Return a human-readable label for a result tier constant."""
    return {"pass": "PASS", "warning": "MARGINAL", "fail": "FAIL"}.get(tier, tier.upper())


def result_tier_emoji(tier: str) -> str:
    """Return a status icon for a result tier (text-safe)."""
    return {"pass": "[PASS]", "warning": "[MARGINAL]", "fail": "[FAIL]"}.get(
        tier, "[?]"
    )
