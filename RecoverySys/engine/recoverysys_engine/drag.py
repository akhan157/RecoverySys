"""
Mach-dependent drag coefficient model for ogive-nose HPR rockets.

Piecewise-linear Cd(M) curve derived from wind-tunnel and CFD data for
typical 4:1 ogive nosecones at zero angle of attack. The transonic drag
rise (M 0.8-1.2) is the dominant effect missing from constant-Cd sims.

The user-entered Cd is treated as the *subsonic* value. The curve scales
relative to that baseline.
"""


def cd_at_mach(mach: float, cd_subsonic: float) -> float:
    """
    Return drag coefficient adjusted for Mach number.

    The shape is:
      M < 0.6  : Cd = cd_subsonic (incompressible regime)
      0.6-0.8  : gentle rise (Prandtl-Glauert compressibility correction)
      0.8-1.0  : sharp rise — transonic drag divergence
      1.0-1.2  : peak — normal shock on nose
      1.2-2.0  : gradual decrease (supersonic, oblique shock)
      > 2.0    : leveled off (wave drag dominant)

    Multipliers are ratios vs. subsonic Cd, from Gregorek & Barrowman
    data for 4:1 ogive HPR airframes.
    """
    if mach < 0.0:
        mach = 0.0

    if mach <= 0.6:
        return cd_subsonic
    elif mach <= 0.8:
        # Linear ramp: 1.0 → 1.1
        frac = (mach - 0.6) / 0.2
        return cd_subsonic * (1.0 + 0.1 * frac)
    elif mach <= 1.0:
        # Transonic drag rise: 1.1 → 1.8
        frac = (mach - 0.8) / 0.2
        return cd_subsonic * (1.1 + 0.7 * frac)
    elif mach <= 1.2:
        # Peak and start of decline: 1.8 → 1.6
        frac = (mach - 1.0) / 0.2
        return cd_subsonic * (1.8 - 0.2 * frac)
    elif mach <= 2.0:
        # Supersonic decline: 1.6 → 1.2
        frac = (mach - 1.2) / 0.8
        return cd_subsonic * (1.6 - 0.4 * frac)
    else:
        return cd_subsonic * 1.2
