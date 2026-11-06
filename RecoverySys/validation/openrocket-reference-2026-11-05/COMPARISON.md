# OpenRocket 23.09 Reference Benchmark vs RecoverySys (Corrected)

## 1. Executive Summary & Review Rectifications

This document reports the corrected, version-pinned reference simulation of **OpenRocket 23.09** against the public simulation and descent rate APIs of **RecoverySys** (`runSimulation` and `computeDescentRate` in [`src/lib/simulation.js`](file:///home/ak/RecoverySys/src/lib/simulation.js)).

This rework directly addresses and rectifies all findings from `RecoverySys/docs/history/online-validation-2026-11-05/OPENROCKET-REVIEW-1.md`:
1. **Clock Disambiguation:** In the initial report, RecoverySys `runSimulation.total_time_s` was mislabeled as total flight duration, generating an erroneous 21.61% flight-time divergence. In production RecoverySys, `total_time_s` represents **descent-only duration** ($\Delta t_{\text{drogue}} + \Delta t_{\text{main}} = 48\text{ s}$). When separated:
   - **Descent Duration:** RecoverySys $48\text{ s}$ vs OpenRocket $50.96\text{ s}$ (delta: **$-5.81\%$**).
   - **Total Flight Duration (Launch-to-Landing):** RecoverySys sum ($t_{\text{apogee}} + t_{\text{descent}} \approx 10 + 48 = 58\text{ s}$) vs OpenRocket $61.23\text{ s}$ (delta: **$-5.28\%$**).
2. **Recovery Configuration Diagnosis:** In OpenRocket dual deployment, the drogue parachute is deployed at apogee and **remains deployed** alongside the main parachute after main deployment at $200\text{ ft}$ ($60.96\text{ m}$). In RecoverySys `runSimulation`, the main descent phase models the main parachute alone (`below_deploy_fps = main_fps ?? drogue_fps`).
   - The observed OpenRocket touchdown velocity of **$5.32\text{ m/s}$** ($17.45\text{ fps}$) exactly matches the aggregate canopy area ($A_{\text{sum}} = A_{\text{main}} + A_{\text{drogue}} = 0.6567 + 0.1642 = 0.8209\text{ m}^2$) at burned-out mass:
     $$v_{\text{terminal, dual}} = \sqrt{\frac{2 \cdot m_{\text{dry}} \cdot g}{\rho_0 \cdot C_D \cdot (A_{\text{main}} + A_{\text{drogue}})}} = 5.3189\text{ m/s}$$
   - Single main parachute alone at sea level and burned-out dry mass yields **$5.95\text{ m/s}$** ($19.51\text{ fps}$), an $11.8\%$ difference attributable entirely to the un-jettisoned drogue canopy.
   - This difference is preserved as an explicit model distinction; no phase equivalence, parameter tuning, or silent alterations are introduced.
3. **Shared Manifest Parity:** The Java driver (`OpenRocketDriver.java`) was rewritten to parse and validate the shared manifest (`reference-vehicle.json`) via `javax.json` bundled directly inside `OpenRocket-23.09.jar`. No geometry, mass, recovery, or environment values bypass the manifest.
4. **Honest Event & Mass Extraction:** Observed quantities are extracted directly from trajectory branches and simulation events (`BURNOUT`, `APOGEE`, `RECOVERY_DEVICE_DEPLOYMENT`, `GROUND_HIT`) rather than hardcoded constants. Observed launch mass ($2.357335\text{ kg}$) is reported alongside nominal declared mass ($2.357504\text{ kg}$).
5. **Separation of Public vs Supplemental Metrics:** Public `runSimulation` trajectory outputs (which use launch mass for conservative drift analysis) are presented in a primary table; isolated-canopy and aggregate-area dry-mass checks are presented separately as diagnostic supplements.

---

## 2. Provenance & Pinned Assets

| Asset | Official Origin | Pinned Version / Tag / Commit | Verified SHA-256 | Provenance Notes |
| :--- | :--- | :--- | :--- | :--- |
| **OpenRocket Engine** | GitHub `openrocket/openrocket` | Tag: `release-23.09`<br>Commit: `6c89a3c60118226e562e19625d8fd439854b1246`<br>Asset: `OpenRocket-23.09.jar` | `65cc0ab68a536fc33fc02a84c416725523a82745e100356efd9ff890b43bfcd0` | Size 71,758,139 bytes. GitHub release API returns `digest=null`; SHA-256 is an observed local byte identity. |
| **Java Runtime** | Eclipse Adoptium / Temurin | Version: `17.0.21+9` (64-bit Server VM) | Task-local environment (configurable via `JAVA_HOME`/`JAVA_BIN`) | No committed absolute host paths; verified Java 17 toolchain on host. |
| **Motor Database Record** | Tripoli Motor Testing (1999) | Motor: AeroTech I200W (`I200W.eng`) | `927f60b020cc4f7181925871578319a2e5ddc0500e05c4c124cc709bdd419781` | Certified Tripoli data hosted on ThrustCurve.org / OpenRocket bundled library. |
| **Base Commit** | RecoverySys Repository | Git SHA: `df5e0fe9154b3e24f2194d7a23407e123cd0f30d` | Branch: `t3/openrocket-reference-correction` | Verified pinned base. |

---

## 3. Input Alignment & Parameter Mapping

Both simulators ingest identical physical inputs from `reference-vehicle.json`:

| Parameter | Value | RecoverySys Public API (`specs`/`config`) | OpenRocket Driver (`reference-vehicle.json`) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Total Launch Mass** | $2.357504\text{ kg}$ ($2,357.5\text{ g}$) | `specs.rocket_mass_g = "2357.504"` | `mass.total_launch_mass_kg` (observed in OR: $2.357335\text{ kg}$) | Matched |
| **Vehicle Dry Mass** | $2.000000\text{ kg}$ | `computeDescentRate` parameter | `stage.setOverrideMass(2.000)` | Matched |
| **Motor Casing Mass** | $0.175616\text{ kg}$ | Inherent in burn mass schedule | `motor.getEmptyMass()` | Matched |
| **Burned-Out Dry Mass** | $2.175616\text{ kg}$ | Vehicle dry + casing ($2.0 + 0.175616$) | `mass.burned_out_mass_kg` (observed in OR: $2.175616\text{ kg}$) | Matched |
| **Motor Total Impulse** | $326.7849\text{ Ns}$ | `specs.motor_total_impulse_ns = "326.7849"` | `customMotor.totalImpulse_ns` / RASP curve integration | Matched |
| **Motor Burn Time** | $1.803\text{ s}$ | `specs.burn_time_s = "1.803"` | RASP motor curve time | Matched |
| **Airframe Outer Diam** | $0.10\text{ m}$ ($3.937\text{ in}$) | `specs.airframe_id_in = "3.937007874"` | `body_tube.outer_radius_m * 2` | Matched |
| **Subsonic Baseline $C_D$** | $0.50$ | `specs.drag_cd = "0.50"` | `stage.setOverrideCD(0.50)` (Controlled mode) | Matched |
| **Drogue Diameter & $C_D$** | $0.4572\text{ m}$ ($18\text{ in}$), $C_D = 1.50$ | `config.drogue_chute.specs` | `Parachute.setDiameter(0.4572)`, `setCD(1.50)` | Matched |
| **Main Diameter & $C_D$** | $0.9144\text{ m}$ ($36\text{ in}$), $C_D = 1.50$ | `config.main_chute.specs` | `Parachute.setDiameter(0.9144)`, `setCD(1.50)` | Matched |
| **Main Deploy Altitude** | $60.96\text{ m}$ ($200\text{ ft}$) | `specs.main_deploy_alt_ft = "200"` | `DeploymentConfiguration.setDeployAltitude(60.96)` | Matched |
| **Atmospheric Model** | U.S. Standard 1976 / ISA | `src/lib/atmosphere.js` | OpenRocket ISA atmospheric model | Matched |
| **Standard Gravity** | $9.80665\text{ m/s}^2$ | Standard constant $g_0$ | `MatchedEnvironmentListener` override $g_0$ | Matched |

---

## 4. Benchmark Results Matrix

### Table 1: Primary Public Trajectory Benchmark Comparison

Comparison of RecoverySys public API (`runSimulation`, launch-mass drift configuration) with OpenRocket actual simulations:

| Metric | Unit | RecoverySys (Public API) | OR Controlled ($C_D = 0.50$) | Delta % (Controlled) | OR Native (Barrowman) | Delta % (Native) | Analysis / Explanation |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Apogee Altitude** | m | 542.24 | 542.30 | **$-0.01\%$** | 559.02 | **$-3.00\%$** | Controlled $C_D=0.50$ produces exact ascent parity ($0.06\text{ m}$ delta). Native Barrowman computes $C_D \approx 0.42$, yielding $16.7\text{ m}$ higher apogee. |
| **Apogee Altitude** | ft | 1779.0 | 1779.2 | **$-0.01\%$** | 1834.0 | **$-3.00\%$** | Direct conversion using $3.28084\text{ ft/m}$. |
| **Time to Apogee** | s | 10.00 | 10.27 | **$-2.66\%$** | 10.42 | **$-4.03\%$** | RecoverySys outputs integer-rounded apogee time (`Math.round(apogee_time)` = $10\text{ s}$); OpenRocket event time is continuous ($10.27\text{ s}$). |
| **Motor Burnout Time** | s | 2.00 | 1.80 | **$+10.93\%$** | 1.80 | **$+10.93\%$** | RecoverySys outputs integer-rounded burnout time (`Math.round(burn_time)` = $2\text{ s}$); OpenRocket event time is $1.803\text{ s}$. |
| **Descent Duration** | s | 48.00 | 50.96 | **$-5.81\%$** | 52.21 | **$-8.06\%$** | Descent-only clock (apogee to landing). RecoverySys assumes instantaneous terminal descent at launch mass. |
| **Estimated Flight Duration** | s | 58.00 | 61.23 | **$-5.28\%$** | 62.63 | **$-7.39\%$** | Launch-to-landing clock sum ($t_{\text{apogee}} + t_{\text{descent}}$). Replaces prior erroneous 21.61% delta. |
| **Drogue Descent Velocity** | m/s | 12.60 | 11.93 | **$+5.59\%$** | 11.93 | **$+5.59\%$** | RecoverySys public presentation rate ($41.3\text{ fps}$) evaluated at launch mass; OpenRocket terminal speed is evaluated at burned-out mass. |
| **Main Touchdown Velocity** | m/s | 6.20 | 5.32 | **$+16.54\%$** | 5.32 | **$+16.54\%$** | Model difference: RecoverySys public presentation rate ($20.3\text{ fps}$) models single main chute at launch mass; OpenRocket maintains both chutes deployed at dry mass. |

---

### Table 2: Supplemental Diagnostic Terminal Descent Checks

Diagnostic evaluations isolating canopy drag configurations, mass states, and altitude-density effects:

| Diagnostic Case | Formula / Condition | RS Analytical (m/s) | RS Analytical (fps) | OR Observed (m/s) | Delta % | Physical Diagnostic Finding |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Dry Mass, Sea Level, Aggregate Dual Chutes (36 in + 18 in)** | $\sqrt{\frac{2 \cdot m_{\text{dry}} \cdot g}{\rho_0 \cdot C_D \cdot (A_{\text{main}} + A_{\text{drogue}})}}$ | 5.32 | 17.45 | 5.32 | **$-0.01\%$** | Aggregate canopy area ($0.8209\text{ m}^2$) matches OpenRocket touchdown speed to within $0.01\%$, confirming both canopies actively contribute drag. |
| **Dry Mass, Sea Level, Single Main Chute (36 in)** | $\sqrt{\frac{2 \cdot m_{\text{dry}} \cdot g}{\rho_0 \cdot C_D \cdot A_{\text{main}}}}$ | 5.95 | 19.51 | 5.32 | **$+11.84\%$** | Single main parachute speed ($5.95\text{ m/s}$) is $11.8\%$ faster than OpenRocket because the drogue is assumed disconnected in single-canopy models. |
| **Launch Mass, Sea Level, Single Main Chute (36 in)** | $\sqrt{\frac{2 \cdot m_{\text{launch}} \cdot g}{\rho_0 \cdot C_D \cdot A_{\text{main}}}}$ | 6.19 | 20.31 | 5.32 | **$+16.37\%$** | RecoverySys public conservative drift presentation rate ($20.3\text{ fps}$) accounts for launch-mass conservatism. |
| **Dry Mass, Mid-Drogue Alt, Single Drogue Chute (18 in)** | `computeDescentRate(drogue, m_dry, alt_mid)` | 12.11 | 39.73 | 11.93 | **$+1.48\%$** | Density-corrected drogue speed at mid-descent altitude ($\approx 300\text{ m}$) agrees with OpenRocket steady-state pre-main terminal speed within $1.5\%$. |

---

## 5. Model Discrepancies & Physics Findings

1. **Dual-Deployment Parachute Mechanics:**
   - OpenRocket treats deployed parachutes as permanent aerodynamic additions unless cutaway events are explicitly configured in simulation listeners.
   - RecoverySys treats recovery as sequential piecewise phases, where Phase 2 uses the main parachute alone.
   - **Conclusion:** The $11.8\%$ difference in steady-state touchdown descent speed between single-chute analytical formulas and OpenRocket is not a numerical defect or transient atmospheric artifact; it is an exact mathematical consequence of dual-canopy drag ($A_{\text{sum}} = 0.8209\text{ m}^2$ vs $A_{\text{main}} = 0.6567\text{ m}^2$).
2. **Clock Definitions:**
   - RecoverySys `runSimulation.total_time_s` strictly represents descent duration ($\Delta t_{\text{drogue}} + \Delta t_{\text{main}}$).
   - Comparing descent duration to descent duration ($48\text{ s}$ vs $50.96\text{ s}$) yields a modest $5.81\%$ difference attributable to deceleration transients and launch-mass drift conservatism.
   - Summing estimated time-to-apogee and descent duration ($10 + 48 = 58\text{ s}$) yields a $5.28\%$ difference relative to OpenRocket's total flight time ($61.23\text{ s}$).
3. **Ascent Integration Parity:**
   - Under controlled $C_D = 0.50$, the RecoverySys 1-DOF RK4 integrator ($dt = 0.02\text{ s}$) and OpenRocket's 6-DOF engine converge to within **$0.06\text{ m}$ ($0.01\%$)** on a $542\text{ m}$ apogee.
   - This verifies that 1-DOF vertical point-mass assumptions closely approximate 6-DOF rigid body mechanics on a stable vertical launch rail.

---

## 6. Review & Acceptance Status

- **Status:** **Rework Complete; Independent Review Pending.**
- **Self-Acceptance:** In accordance with `AGENTS.md`, the implementation author does not self-accept. The parent reviewer independently reruns `test-runner.sh` and verifies evidence.
- **Production Integrity:** No changes were made to production code (`RecoverySys/src/`), dependencies, corpus cases, or acceptance registers.
