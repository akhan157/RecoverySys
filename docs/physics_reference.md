# Physics Reference — FOS Calculation Method

This document explains the equations used by the calculator.

---

## Overview

The peak shock force on a recovery cord is modelled using the **energy method**:
the kinetic energy of the two separating rocket sections is equated to the work
done by the cord as it stretches to its elastic limit.

This is a conservative (worst-case) model. It assumes:
- The cord behaves as a linear spring.
- All kinetic energy is absorbed by the cord (no energy lost to air drag
  during the cord's extension, no deployment bag snatch).
- Both bodies are moving toward their maximum separation simultaneously.

---

## Step-by-Step Calculation

### 1. Reduced Mass

When two bodies separate and then are arrested by a cord, only the
**reduced mass** of the system contributes to the cord's loading:

```
reduced_mass = (m1 × m2) / (m1 + m2)     [kg]
```

Where:
- `m1` = mass of body 1 (e.g. nose section) in kg
- `m2` = mass of body 2 (e.g. booster section) in kg

This is the effective inertial mass for the two-body collision problem.

### 2. Kinetic Energy at Cord Engagement

```
KE = 0.5 × reduced_mass × velocity²      [J = kg·m²/s²]
```

Where:
- `velocity` = relative velocity between the two bodies at the moment the
  cord becomes taut, in m/s. This equals the rocket's velocity at the
  deployment event (apogee velocity, drogue descent rate, etc.).

### 3. Cord Extension (Δx)

The maximum elastic extension of the shock cord:

```
delta_x = cord_length × (elongation_percentage / 100)     [m]
```

Where:
- `cord_length` = natural (unstretched) length of the cord in metres
- `elongation_percentage` = manufacturer-rated maximum elongation
  (e.g. 15 for nylon webbing, up to 100 for bungee)

### 4. Peak Force

Using the work-energy theorem for a linearly elastic cord
(area under a linear force-extension curve = ½ × F_max × delta_x = KE):

```
F_peak = (2 × KE) / delta_x     [N]
```

### 5. Factor of Safety

```
FOS = tensile_strength / F_peak     [dimensionless]
```

Where `tensile_strength` is the manufacturer-rated breaking strength of
the component (shock cord or quick link) in Newtons.

---

## Result Tiers

| Tier | Condition | Meaning |
|---|---|---|
| **PASS** | `FOS ≥ target_FOS` | Component is within safe limits |
| **WARNING** | `target_FOS × 0.9 ≤ FOS < target_FOS` | Marginal — within 10% of limit |
| **FAIL** | `FOS < target_FOS × 0.9` | Component does not meet target |

The **limiting FOS** for an event is the minimum FOS across all structural
components (shock cord and quick link, if present).

---

## Back-Calculated Required Strength

When an event fails, the calculator shows the minimum tensile strength
the limiting component would need to exactly meet the target FOS:

```
required_strength = target_FOS × F_peak     [N]
```

---

## Units Reference

| Quantity | Unit | Symbol |
|---|---|---|
| Mass | kilogram | kg |
| Velocity | metres per second | m/s |
| Force | Newton | N (= kg·m/s²) |
| Energy | Joule | J (= N·m) |
| Length | metre | m |
| Volume | cubic centimetre | cm³ |

---

## Limitations and Conservatism

1. **Linear cord assumption:** Real nylon webbing is not perfectly linear.
   The actual peak force may be lower if the cord's stiffness is progressive.

2. **No drag term:** Air drag on the parachute canopy during cord extension
   reduces the effective velocity and thus the peak force. Ignoring drag is
   conservative (overestimates the force).

3. **No dynamic load factor:** Some references apply a dynamic load factor
   (typically 1.5–2.0×) on top of the quasi-static calculation. This
   calculator does not apply an additional DLF; the target FOS is expected
   to provide adequate margin.

4. **Deployment bag snatch force:** A poorly packed deployment bag can add
   an impulsive snatch force at line-stretch that is not captured by this
   model. Proper packing technique and a correctly sized deployment bag
   are assumed.

For critical applications, supplement this tool with a full dynamic
simulation or consult with a certified Level 3 flyer or rocketry engineer.
