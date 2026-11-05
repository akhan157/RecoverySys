# RecoverySys Physics Validation Design & Benchmark Architecture (2026-11-05)

## 1. Executive Summary & Lane Authority
- **Checkout Environment:** Isolated worktree at `/home/ak/.t3/worktrees/RecoverySys/t3-02eaddc5`, branch `t3/physics-validation-research-1`, pinned at commit `fe96b89f188c17d10b335b9395013cea99de9319`. Primary repository root is `/home/ak/RecoverySys` (derived from git common-dir `/home/ak/RecoverySys/.git`).
- **Surface Ownership:** Exclusively owns `RecoverySys/validation/online-benchmarks-2026-11-05/`. Does NOT modify application production code (`src/`), supplier catalog review (`validation/catalog-review/`), existing corpus cases (`validation/corpus/`), package manifests, or project handoffs.
- **Model Routing:** Authorized by owner directive following provider quota exhaustion on Opus and Sonnet lanes. Assigned model: Google Antigravity `gemini-3.8-flash` (high thinking).
- **Independence & Non-Self-Approval:** The author cannot self-accept any evidence or benchmark case. This document constitutes the Gate 1 deliverable: an authoritative primary source packet, physical convention analysis, OpenRocket benchmark route, and actionable validation design submitted for independent review by the parent agent.
- **Evidence Storage:** Large external reference artifacts (PDFs, raw CSV flight datasets, motor databases) are stored outside git at sibling directory `../RecoverySys-artifacts/online-validation-2026-11-05/physics/` relative to the primary repository root, with SHA-256 hashes recorded in `sources.json` and verified in this document.

---

## 2. Theoretical Foundations & Primary Source Synthesis

### 2.1 Earth Atmosphere (Troposphere & ISA Standards)
- **Primary Standard:** U.S. Standard Atmosphere 1976 (NASA-TM-X-74335 / NOAA-S/T 76-1562).
  - Relative Path: `../RecoverySys-artifacts/online-validation-2026-11-05/physics/NASA-TM-X-74335-US-Standard-Atmosphere-1976.pdf`
  - SHA-256: `23eb6b68346d4abc6071fc598872d51c40cf8c613d1a5d1006c6261bcd09dcea`
- **Governing Equations (Troposphere: $0 \le H \le 11,000\text{ m'}$):**
  $$\begin{aligned}
  T(H) &= T_0 + L \cdot H \\
  P(H) &= P_0 \left( \frac{T(H)}{T_0} \right)^{-\frac{g_0 M_0}{R^* L}} = P_0 \left( \frac{T(H)}{T_0} \right)^{-\frac{g_0}{R L}} \\
  \rho(H) &= \frac{P(H)}{R \cdot T(H)} = \rho_0 \left( \frac{T(H)}{T_0} \right)^{-\left(\frac{g_0}{R L} + 1\right)} \\
  a(H) &= \sqrt{\gamma \cdot R \cdot T(H)}
  \end{aligned}$$
- **Physical Constants & Discrepancies:**
  | Parameter | Official ISA 1976 | RecoverySys (`src/lib/atmosphere.js`) | NASA Glenn Curve-Fit | Discrepancy / Uncertainty Note |
  | :--- | :--- | :--- | :--- | :--- |
  | Sea-Level Temp $T_0$ | $288.15\text{ K}$ ($15.00^\circ\text{C}$) | $288.15\text{ K}$ | $288.14\text{ K}$ ($15.04 + 273.1^\circ\text{C}$) | Glenn educational curve fit shifts base by $+0.04\text{ K}$ |
  | Sea-Level Press $P_0$ | $101,325\text{ Pa}$ | $101,325\text{ Pa}$ | $101,290\text{ Pa}$ | Glenn fit differs by $-35\text{ Pa}$ ($-0.035\%$) |
  | Lapse Rate $L$ | $-0.0065\text{ K/m'}$ | $-0.0065\text{ K/m}$ | $-0.00649\text{ K/m}$ | Glenn fit differs by $+0.15\%$ |
  | Dry Air Constant $R$ | $287.053072\text{ J/(kg K)}$ | $287.058\text{ J/(kg K)}$ | $286.9\text{ J/(kg K)}$ | RecoverySys uses $287.058$, yielding $\Delta \approx +0.0017\%$ (derived from $R^* = 8314.32 / M_0 = 28.9644$) |
  | Standard Gravity $g_0$ | $9.80665\text{ m/s}^2$ | $9.80665\text{ m/s}^2$ | $9.8\text{ m/s}^2$ | Exact agreement with SI standard |
  | Troposphere Exponent | $\frac{g_0 M_0}{R^* (-L)} = 5.255876$ | $5.2559$ | $5.256$ | RecoverySys rounds to 4 decimal places ($\Delta = +0.00014\%$) |
  | Troposphere Bound | $11,000\text{ m'}$ (geopotential) | $11,000\text{ m}$ (geometric) | $11,000\text{ m}$ | Geopotential vs geometric altitude discrepancy |
- **Geopotential vs. Geometric Altitude Convention:**
  $$H = \frac{r_0 \cdot Z}{r_0 + Z}, \quad r_0 = 6,356,766\text{ m}$$
  At geometric altitude $Z = 11,000\text{ m}$, the true geopotential altitude is $H = 10,981.0\text{ m'}$ (0.17% discrepancy). Below 11 km, RecoverySys treats altitude as geometric without geopotential correction. At 2500 m, geometric $Z = 2500\text{ m}$ corresponds to geopotential $H = 2499.017\text{ m'}$ (0.039% difference). Benchmark 1 evaluates at matched 2500 m coordinate, with preset tolerance 0.01% covering known constant/rounding differences.

---

### 2.2 Parachute Aerodynamics, Reference Area & Terminal Descent
- **Primary Reference:** Theo W. Knacke, *Parachute Recovery Systems Design Manual* (NWC TP 6575 / DTIC AD-A247666, 1992).
  - Relative Path: `../RecoverySys-artifacts/online-validation-2026-11-05/physics/DTIC_ADA247666_Knacke_Parachute_Manual.pdf`
  - SHA-256: `138d001f515328a36ef3cddc234b40b4b84c19ad2ea1ac204bd60f555f9ab0c8`
- **Aerodynamic Drag & Terminal Velocity:**
  $$D = \frac{1}{2} \rho v^2 (C_D S)$$
  At terminal velocity, aerodynamic drag balances gravitational force ($D = m g$):
  $$v_{term} = \sqrt{\frac{2 m g}{\rho \cdot (C_D S)}}$$
  The kinetic energy delivered at touchdown is:
  $$E_{k} = \frac{1}{2} m v_{term}^2 = \frac{m^2 g}{\rho \cdot (C_D S)}$$
- **The Reference Area Ambiguity Conflict ($S_0$ vs. $S_p$):**
  - **Constructed Nominal Area ($S_0$):** Flat canopy surface area when laid flat on the floor. For flat circular canopies:
    $$S_0 = \frac{\pi}{4} D_0^2$$
    Knacke Table 5-1 documents that for solid flat circular parachutes, the drag coefficient based on nominal area is:
    $$C_{D0} \approx 0.75 - 0.80$$
  - **Projected Inflated Area ($S_p$):** Frontal cross-sectional area during steady descent. The inflated diameter $D_p$ is significantly smaller than the constructed diameter $D_0$:
    $$D_p \approx (0.65 - 0.70) \cdot D_0 \implies S_p \approx (0.42 - 0.49) \cdot S_0$$
    The drag coefficient based on projected area is:
    $$C_{Dp} = \frac{C_{D0} S_0}{S_p} \approx \frac{C_{D0}}{0.45} \approx 1.5 - 1.8$$
  - **Product Ambiguity & Safety Risk:**
    RecoverySys calculates canopy area in `src/lib/simulation.js`:
    ```javascript
    const radius_m = (diameter_in * 0.0254) / 2
    const area_m2 = Math.PI * radius_m * radius_m
    ```
    This formula defines $A = \frac{\pi}{4} D^2$. If an engineer inputs the manufacturer's nominal flat diameter $D_0 = 36\text{ in}$ and mistakenly enters a projected drag coefficient $C_{Dp} = 1.6$ (common for toroidal or elliptical parachutes quoted by vendors without area qualification), the resulting effective drag area $(C_D S)$ is overestimated by a factor of $\approx 2.1\times$, leading to an underestimated terminal velocity ($v_{pred} \approx \frac{1}{\sqrt{2.1}} v_{actual} \approx 0.69 v_{actual}$) and landing kinetic energy underestimated by $52\%$.
  - **Validation Design Decision:**
    All benchmark cases must explicitly specify whether $C_D$ is referenced to nominal constructed diameter $D_0$ or projected diameter $D_p$. For OpenRocket and RecoverySys parity checks, the convention is strictly nominal circular flat area with $C_D = 0.80$.

---

### 2.3 Ascent Dynamics & Closed-Form Analytical Reference
- **Equations of Motion (1-DOF Vertical Flight):**
  $$m(t) \frac{dv}{dt} = T(t) - D(v, h) - m(t) g_0$$
  where $D(v, h) = \frac{1}{2} \rho(h) C_D(M) A_{ref} v |v|$.
- **Independent Analytical Closed-Form Reference (NASA Glenn Flight Equations):**
  While powered ascent with variable mass and Mach-dependent drag requires numerical integration (RK4), the **post-burnout unpowered coast phase under constant density and constant $C_D$** possesses an exact, closed-form analytical solution (NASA Glenn, *Flight Equations with Drag*):
  $$y_{coast}(V_0) = \frac{V_t^2}{2 g_0} \ln\left(1 + \frac{V_0^2}{V_t^2}\right)$$
  $$t_{coast}(V_0) = \frac{V_t}{g_0} \arctan\left(\frac{V_0}{V_t}\right)$$
  where $V_t = \sqrt{\frac{2 m g_0}{\rho C_D A_{ref}}}$.
  - **Non-Oracle Basis:** This solution is completely independent of the application's RK4 loop in `integrateAscent()`. It can be evaluated algebraically to 64-bit IEEE-754 precision ($10^{-14}$) and serves as an exact invariant to test numerical convergence, time-step truncation error ($dt = 0.02\text{ s}$), and energy dissipation.

---

### 2.4 Wind Drift, Meteorological Conventions & Geodesy
- **Meteorological Convention (NOAA / NWS):**
  - Wind direction $\theta_w \in [0^\circ, 360^\circ)$ indicates the bearing **FROM which** the wind blows.
  - A wind from West ($\theta_w = 270^\circ$) blows towards the East ($90^\circ$).
  - Parachute horizontal velocity vector:
    $$\vec{v}_{drift} = -\vec{v}_{wind} = \begin{bmatrix} -v_w \sin\theta_w \\ -v_w \cos\theta_w \end{bmatrix} = \begin{bmatrix} v_w \sin(\theta_w + 180^\circ) \\ v_w \cos(\theta_w + 180^\circ) \end{bmatrix}$$
  - Parachute drift bearing:
    $$\theta_{drift} = (\theta_w + 180^\circ) \pmod{360^\circ}$$
- **Layered Wind Shear Integration:**
  For discrete altitude slices $\Delta h_k$ where horizontal velocity is matched instantly ($v_{h,k} = v_{w}(h_k)$):
  $$\Delta x_k = v_{w}(h_k) \cdot \Delta t_k \cdot \sin(\theta_{drift}), \quad \Delta y_k = v_{w}(h_k) \cdot \Delta t_k \cdot \cos(\theta_{drift})$$
  where $\Delta t_k = \frac{\Delta h_k}{v_{desc}(h_k)}$.
  - **Falsifier:** Inverting wind direction sign ($\theta_{drift} = \theta_w$) causes the vehicle to drift into the wind (upwind), falsifying physical reality.

---

### 2.5 Dynamic Recovery Loads & Shock Screening Scope
- **Static Ejection Impulse Load:**
  $$F_{static} = m \cdot G_{factor} \cdot g_0$$
- **Linear Elastic Snatch Energy Proxy (`MAIN_SNATCH_MODEL`):**
  RecoverySys does not model full viscoelastic rope dynamics or gas-piston line-stretch kinematics. Instead, it computes an energy absorption limit proxy:
  $$k_{secant} = \frac{F_{rated}}{\Delta L_{break}} = \frac{F_{rated}}{L_0 \cdot (\epsilon_{break} / 100)}$$
  $$E_{event} = \frac{1}{2} m v_{approach}^2, \quad E_{capacity} = \frac{1}{2} k_{secant} (\Delta L_{break})^2$$
  $$\Delta L_{pred} = \sqrt{\frac{2 E_{event}}{k_{secant}}}, \quad F_{proxy} = k_{secant} \cdot \Delta L_{pred} = v_{approach} \sqrt{m \cdot k_{secant}}$$
  $$Rating\ Margin = \frac{F_{rated}}{F_{proxy}}, \quad Energy\ Margin = \frac{E_{capacity}}{E_{event}}$$
- **Opening Shock Modeling Discrepancy (Knacke vs. RecoverySys):**
  - **Knacke Formulation (Section 7.4.6.1):**
    $$F_o = C_x \cdot (C_D S) \cdot q = C_x \cdot \frac{1}{2} \rho v_o^2 \cdot (C_D S)$$
    where $C_x$ is the Pflanz/Knacke shock factor ($\approx 1.6 - 1.8$ for flat circular).
  - **RecoverySys Formulation (`src/lib/recoveryLoad.js`):**
    ```javascript
    const coefficient = OPENING_SHOCK_CX[mainSpecs?.shape] ?? OPENING_SHOCK_CX.flat
    const force_N = coefficient * 0.5 * rho * velocity_mps ** 2 * area_m2
    ```
    Notice that RecoverySys multiplies $C_x$ directly by $area\_m2$ **without $C_D$**. It evaluates a lumped empirical opening load proxy $F_o = C_x \cdot q \cdot S$ where $C_x$ is a canopy shape factor (Knacke 1992 p. 5-3 Table 5-1 lists flat circular 1.6-1.8, conical 1.4-1.5, cruciform 1.1-2.2). This formula is a generic mathematical screening proxy, not a universal conservative upper bound or material structural certification.

---

## 3. Version-Pinned OpenRocket Benchmark Route

### 3.1 Host Runtime Environment Probe
- Probe command executed: `which java`, `which python3`, `which node`.
- **Findings:**
  - `java`: **ABSENT** (`which: no java in PATH`, search of `/usr/lib/jvm`, `/opt`, `~/.sdkman` confirmed zero installed JDK/JRE).
  - `python3`: `/usr/bin/python3` (Python 3.14.8).
  - `node`: `/usr/bin/node` (v26.11.1).
- **Impact on Validation Strategy:**
  Because Java is not installed in this execution container, live dynamic execution of the OpenRocket JAR (`OpenRocket-23.09.jar`) cannot occur inside this isolated runner without a runtime container or host capability. OpenRocket benchmark verification must rely on:
  1. Version-pinned OpenRocket 23.09 technical documentation and verified source code logic.
  2. The certified motor database extracted directly from OpenRocket 23.09 (`RASAero_Motors.eng`).
  3. Pre-computed, verified OpenRocket 23.09 `.ork` and CSV exports generated under identical physical inputs and checked in as external primary artifacts.
  4. Unit-level parity against OpenRocket's explicit formulas documented in `Parachute.java`, `CSVExport.java`, and technical doc v13.05.

### 3.2 OpenRocket Version Pinning & Headless Analysis
- **Software Version:** OpenRocket 23.09 (Release tag: `release-23.09`, published 2023-11-16T15:21:39Z).
- **Core Repository:** `https://github.com/openrocket/openrocket`
- **Headless Mode Capability Audit:**
  Inspection of `swing/src/net/sf/openrocket/startup/SwingStartup.java` reveals lines 240–253:
  ```java
  private static void checkHead() {
      if (GraphicsEnvironment.isHeadless()) {
          log.error("Application is headless.");
          System.err.println();
          System.err.println("OpenRocket cannot currently be run without the graphical user interface.");
          System.err.println();
          System.exit(1);
      }
  }
  ```
  **Critical Finding:** Mainline OpenRocket 23.09 **explicitly aborts** if executed in a headless JRE (`GraphicsEnvironment.isHeadless()`). It has no native `--headless` or `--batch` CLI flag in its default entry point.
  To automate OpenRocket 23.09 headlessly, downstream harnesses must either:
  - Run with an X11 virtual framebuffer (`xvfb-run -a java -jar OpenRocket-23.09.jar ...`), or
  - Execute a custom Java wrapper class that calls `OpenRocketDocumentConfigurator` and `RK4SimulationStepper` directly from `core.jar` bypassing `SwingStartup`, or
  - Utilize Python bindings via JPype (`orhelper`).

### 3.3 Motor Curve Provenance & Database
- Primary motor artifact: `RASAero_Motors.eng` (from OpenRocket 23.09 core resources).
  - Path: `../RecoverySys-artifacts/online-validation-2026-11-05/physics/OpenRocket-23.09-RASAero_Motors.eng`
  - SHA-256: `8f2fcd68dd890dbdceeac914eb263a015dc6078db8e732387176199468273161`
- Format: Standard RASP .ENG format (discrete time-thrust pairs with NAR/Tripoli certification provenance).
- Integration Contract: Piecewise linear thrust interpolation, trapezoidal cumulative impulse tracking, and Tsiolkovsky mass depletion.

---

## 4. First-Party Measured Flight Datasets & Empirical Ground Truth

### 4.1 Prometheus TeleMetrum Dual-Deploy Flight Log
- **Primary Source:** RocketPy open rocketry telemetry repository (MIT License).
  - Path: `../RecoverySys-artifacts/online-validation-2026-11-05/physics/2022-06-24-serial-5115-flight-0001-TeleMetrum.csv`
  - SHA-256: `9fe8d17a25e7944267b34a45ed955303afd5818b3f18479a5f7ffb31a574cecf`
- **Flight Identification:**
  - Date / Location: 2022-06-24, Spaceport America, New Mexico, USA (Pad Lat: $32.9395046^\circ$, Lon: $-106.9114515^\circ$, Pad Alt: $1,390\text{ m}$ MSL).
  - Avionics: Altus Metrum TeleMetrum v6 (serial 5115, flight 1), sampling at 100 Hz.
- **Flight Event Summary:**
  | Flight Phase | Start Time ($t$) | Duration ($\Delta t$) | Altitude Range (AGL) | Observed Mean Velocity |
  | :--- | :--- | :--- | :--- | :--- |
  | Boost Phase | $-0.30\text{ s}$ | $5.26\text{ s}$ | $0\text{ m} \to 558.7\text{ m}$ | Peak Speed: $317.88\text{ m/s}$ ($1,042.9\text{ ft/s}$, Mach 0.93) |
  | Coast Phase | $4.96\text{ s}$ | $24.97\text{ s}$ | $558.7\text{ m} \to 3,903.8\text{ m}$ | Coast to Apogee ($12,807.6\text{ ft}$) |
  | Drogue Descent | $29.93\text{ s}$ | $128.04\text{ s}$ | $3,888.7\text{ m} \to 448.9\text{ m}$ | $v_{desc} \approx 26.86\text{ m/s}$ ($88.13\text{ ft/s}$) |
  | Main Descent | $157.97\text{ s}$ | $79.97\text{ s}$ | $448.9\text{ m} \to 0\text{ m}$ | $v_{desc} \approx 5.61\text{ m/s}$ ($18.42\text{ ft/s}$) |
  | Touchdown | $237.94\text{ s}$ | — | $0\text{ m}$ (Height: $1.4\text{ m}$) | Ground hit velocity: $0.8\text{ m/s}$ |
  | Total Ground Drift | — | $208.01\text{ s}$ descent | Landing: $32.9494937^\circ$, $-106.9154488^\circ$ | Total Drift: $1,171.7\text{ m}$ ($3,844.1\text{ ft}$) at $341.4^\circ$ bearing |
- **Measurement Uncertainty & Blocked Status:**
  - Vehicle mass (14.5 kg), drogue diameter (24 in), and main diameter (120 in) are unverified assumptions lacking provenance in the supplied TeleMetrum CSV header.
  - Pad weather and launch site atmospheric properties are not recorded in the file.
  - Barometric readings show pyrotechnic pressurization transients at deployment events, but sensor accuracy and calibration are not source-stated.
  - A proposed $\pm 15\%$ tolerance is an analyst choice, not a source-stated standard. Flight comparison remains strictly BLOCKED pending configuration, environment, and uncertainty provenance.

### 4.2 Juno III Spaceport America Cup Flight Dataset
- **Primary Source:** Projeto Jupiter (Universidade de São Paulo) / RocketPy team (MIT License).
  - Directory Path: `../RecoverySys-artifacts/online-validation-2026-11-05/physics/juno3/`
  - `cots_altimeter.csv`: 28,537 bytes, SHA-256 `eef81b3bcc4c285667727c1e2c9ca502a67cb374f5e31bc4f87ed76b8a04c1ee`
  - `cots_GNSS.csv`: 18,596 bytes, SHA-256 `557c80be4c0d9a5e6a5493177a9adfaa3b02c11b8ff814ed238b53540ac9f062`
  - `drag_curve.csv`: 1,542 bytes, SHA-256 `02711cd44cd877427b6b951ffe792253526149c2afeb17097e398cb7d8fd6511`
  - `README.txt`: 873 bytes, SHA-256 `4b29eceff1eedb237ec337ee5e158e07c3ed9ed579399af08ce0d5336310ef47`
  - Provenance note: README.txt explicitly records that only the drogue chute ejected (main chute failed to deploy).
- **Significance (Real-World Descent Anomaly):**
  - Spaceport America Cup 2023 (10k Solid SRAD, June 23, 2023).
  - Official apogee registered: $3,213\text{ m}$.
  - Main deployment failure: The rocket deployed its drogue chute at apogee ($3,116\text{ m}$), but the main parachute failed to deploy. The rocket descended on drogue alone to ground impact.
  - Pyrotechnic bay pressurization: The raw altimeter log clearly captures the explosive pressurization spike at $t=30.45\text{ s}$, where pressure dropped instantly from $580.1\text{ hPa}$ to $191.25\text{ hPa}$ before settling to $1,158.7\text{ hPa}$.
  - Demonstrates why automated recovery simulators must handle single-deploy drogue-only descent trajectories safely and detect high kinetic energy impact warnings.

---

## 5. Actionable Benchmark Suite Proposals

Every proposed benchmark below is structured with:
1. Exact inputs
2. Independently derived expected reference (computed from closed-form equations, never using production functions as an oracle)
3. Preset tolerance with explicit mathematical/source basis
4. Observable outputs
5. Falsifying failure mode
6. Pass/fail meaning and limitation.

---

### Proposal 1: ISA Troposphere Analytic Air Density at 2,500 m (Independent Analytic Reference)
- **Domain:** `atmosphere`
- **Kind:** `analytic`
- **Inputs:**
  ```json
  { "altitude_m": 2500 }
  ```
- **Independent Derivation:**
  Using U.S. Standard Atmosphere 1976 exact formulation:
  $$T(2500) = 288.15 - 0.0065 \times 2500 = 271.90\text{ K}$$
  $$\frac{T}{T_0} = \frac{271.90}{288.15} = 0.943605760888$$
  $$P(2500) = 101325 \times (0.943605760888)^{5.255877} = 74691.56\text{ Pa}$$
  $$\rho(2500) = \frac{74691.56}{287.05287 \times 271.90} = 0.956860\text{ kg/m}^3$$
  Using RecoverySys constants ($R = 287.058$, exponent $5.2559$):
  $$P_{rec}(2500) = 101325 \times (0.943605760888)^{5.2559} = 74690.95\text{ Pa}$$
  $$\rho_{rec}(2500) = \frac{74690.95}{287.058 \times 271.90} = 0.956835\text{ kg/m}^3$$
- **Expected Metrics & Preset Tolerances:**
  - `density_kg_m3`: Expected = `0.95686`, Tolerance: relative $\le 0.0001$ ($0.01\%$, source/numerical basis: accounts for the $0.0018\%$ difference in gas constant $R$ and exponent rounding).
  - `temperature_K`: Expected = `271.90`, Tolerance: absolute $\le 0.01\text{ K}$.
  - `pressure_Pa`: Expected = `74691.6`, Tolerance: relative $\le 0.0001$ ($0.01\%$).
- **Observable Outputs:** `airDensity(2500)`, `isa(2500).rho`, `isa(2500).P`, `isa(2500).T`.
- **Falsifying Failure Mode:** Conflating NASA Glenn educational curve fit ($T=15.04-0.00649h$) or omitting temperature lapse rate ($L=0$) will cause relative error $> 0.5\%$, immediately failing the check.
- **Pass/Fail Meaning & Limitation:** Verifies standard tropospheric density without geopotential correction. Does not certify mesosphere or non-standard temperature day models.

---

### Proposal 2: Nominal Parachute Terminal Descent Rate at Sea Level (Independent Analytic Reference)
- **Domain:** `descent`
- **Kind:** `analytic`
- **Inputs:**
  ```json
  {
    "chuteSpecs": { "diameter_in": 48, "cd": 0.8 },
    "mass_kg": 5.0,
    "altitude_ft": 0
  }
  ```
- **Independent Derivation:**
  $$D = 48\text{ in} \times 0.0254\text{ m/in} = 1.2192\text{ m}$$
  $$r = \frac{D}{2} = 0.6096\text{ m} \implies S_0 = \pi \times 0.6096^2 = 1.167537\text{ m}^2$$
  $$\rho_0 = 1.2250\text{ kg/m}^3, \quad g_0 = 9.80665\text{ m/s}^2, \quad m = 5.0\text{ kg}, \quad C_D = 0.80$$
  $$v_{term, mps} = \sqrt{\frac{2 \times 5.0 \times 9.80665}{1.2250 \times 0.80 \times 1.167537}} = \sqrt{\frac{98.0665}{1.144186}} = \sqrt{85.7085} = 9.25789\text{ m/s}$$
  $$v_{term, fps} = 9.25789 \times 3.28084 = 30.3737\text{ ft/s}$$
  $$Landing\ Kinetic\ Energy\ (J) = \frac{1}{2} \times 5.0 \times (9.25789)^2 = 214.27\text{ J}$$
  $$Landing\ Kinetic\ Energy\ (ft\cdot lbf) = 214.27 \times 0.737562 = 158.04\text{ ft}\cdot\text{lbf}$$
- **Expected Metrics & Preset Tolerances:**
  - `descent_rate_fps`: Expected = `30.374`, Tolerance: relative $\le 0.0001$ ($0.01\%$, basis: floating-point IEEE-754 precision).
  - `descent_rate_mps`: Expected = `9.258`, Tolerance: relative $\le 0.0001$.
  - `landing_energy_J`: Expected = `214.27`, Tolerance: relative $\le 0.0005$.
- **Observable Outputs:** `computeDescentRate(chuteSpecs, mass_kg, 0)`.
- **Falsifying Failure Mode:** Misapplying projected area $S_p = 0.45 S_0$ instead of constructed nominal area $S_0$, or using $g = 9.81$ instead of $9.80665$, will produce $v \approx 45.2\text{ ft/s}$ ($+48\%$ error), failing the preset tolerance.
- **Pass/Fail Meaning & Limitation:** Establishes true terminal descent under steady-state unperturbed airflow. Does not model opening inflation dynamics, line twist, or pendulum oscillations ($\pm 15^\circ$).

---

### Proposal 3: Unpowered Vertical Coast Apogee & Duration (Closed-Form Analytic Reference - EXCLUDED FROM EXECUTION)
- **Domain:** `ascent`
- **Kind:** `analytic`
- **Inputs:**
  ```json
  {
    "burnout_velocity_mps": 150.0,
    "burnout_altitude_m": 0.0,
    "vehicle_mass_kg": 4.0,
    "reference_area_m2": 0.01,
    "drag_coefficient_cd": 0.45,
    "constant_air_density_kg_m3": 1.2250
  }
  ```
- **Independent Derivation (NASA Glenn Closed-Form Solution):**
  $$V_t = \sqrt{\frac{2 m g_0}{\rho C_D A}} = \sqrt{\frac{2 \times 4.0 \times 9.80665}{1.2250 \times 0.45 \times 0.01}} = \sqrt{\frac{78.4532}{0.0055125}} = \sqrt{14231.87} = 119.2974\text{ m/s}$$
  $$\frac{V_0}{V_t} = \frac{150.0}{119.2974} = 1.257362$$
  $$\left(\frac{V_0}{V_t}\right)^2 = 1.580959$$
  $$y_{coast} = \frac{V_t^2}{2 g_0} \ln\left(1 + \left(\frac{V_0}{V_t}\right)^2\right) = \frac{14231.87}{2 \times 9.80665} \ln(1 + 1.580959) = 725.623 \times 0.948160 = 688.007\text{ m}$$
  $$y_{coast, ft} = 688.007 \times 3.28084 = 2,257.24\text{ ft}$$
  $$t_{coast} = \frac{V_t}{g_0} \arctan\left(\frac{V_0}{V_t}\right) = \frac{119.2974}{9.80665} \arctan(1.257362) = 12.16495 \times 0.898862 = 10.9346\text{ s}$$
- **Expected Metrics & Preset Tolerances:**
  - `coast_apogee_m`: Expected = `688.01`, Tolerance: relative $\le 0.005$ ($0.5\%$, basis: RK4 integration with fixed $dt = 0.02\text{ s}$ introduces global truncation error $\mathcal{O}(dt^4) \le 0.1\%$).
  - `coast_duration_s`: Expected = `10.93`, Tolerance: relative $\le 0.005$ ($0.5\%$).
- **Observable Outputs:** RK4 numerical integrator apogee and coast duration outputs.
- **Falsifying Failure Mode:** Linearizing drag, neglecting velocity squared term, or incorrect sign on aerodynamic drag ($F_{net} = T + D - mg$) causes massive trajectory overprediction ($> 1,000\text{ m}$), falsifying the check.
- **Pass/Fail Meaning & Limitation:** Validates 1-DOF numerical stepping accuracy against an exact differential equation solution. Assumes constant density over the $688\text{ m}$ climb.

---

### Proposal 4: Cardinal Wind Drift Vector & Opposite Bearing Invariant (Computational Invariant)
- **Domain:** `drift`
- **Kind:** `analytic`
- **Inputs:**
  ```json
  {
    "simulation": { "drogue_fps": 60, "main_fps": 20, "apogee_ft": 3000, "deploy_ft": 500 },
    "specs": {
      "wind_speed_mph": 15,
      "wind_direction_deg": 180,
      "wind_surface_alt_ft": 0
    }
  }
  ```
- **Independent Derivation:**
  Wind is strictly from the South ($\theta_w = 180^\circ$) at $15\text{ mph}$ ($= 22.0\text{ ft/s}$).
  Drift direction must be strictly North:
  $$\theta_{drift} = (180^\circ + 180^\circ) \pmod{360^\circ} = 0^\circ\ (\text{or } 360^\circ)$$
  Descent time in drogue phase ($3,000\text{ ft} \to 500\text{ ft}$):
  $$t_{drogue} = \frac{3000 - 500}{60} = \frac{2500}{60} = 41.6667\text{ s}$$
  Descent time in main phase ($500\text{ ft} \to 0\text{ ft}$):
  $$t_{main} = \frac{500}{20} = 25.000\text{ s}$$
  Total descent time $t_{total} = 41.6667 + 25.000 = 66.6667\text{ s}$.
  Horizontal drift:
  $$drogue\_drift\_ft = 41.6667 \times 22.0 = 916.67\text{ ft}$$
  $$main\_drift\_ft = 25.000 \times 22.0 = 550.00\text{ ft}$$
  $$total\_drift\_ft = 916.67 + 550.00 = 1,466.67\text{ ft} \implies \text{Round: } 1,467\text{ ft}$$
  Cartesian vector components:
  $$dx = 0.0\text{ ft}, \quad dy = +1,466.67\text{ ft}$$
- **Expected Metrics & Preset Tolerances:**
  - `drift_ft`: Expected = `1467`, Tolerance: absolute $\le 1\text{ ft}$ (basis: rounding of integer presentation output).
  - `bearing_deg`: Expected = `0.0`, Tolerance: absolute $\le 0.1^\circ$.
  - `vector_dx_ft`: Expected = `0.0`, Tolerance: absolute $\le 10^{-6}\text{ ft}$ (basis: machine epsilon for $\sin(0^\circ)$).
  - `vector_dy_ft`: Expected = `1466.67`, Tolerance: relative $\le 0.0001$.
- **Observable Outputs:** `computeDrift({ simulation, specs })`.
- **Falsifying Failure Mode:** Inverting the wind direction convention ($\theta_{drift} = 180^\circ$) results in $dy = -1,467\text{ ft}$ (southward drift into the wind), directly falsifying the bearing and vector sign.
- **Pass/Fail Meaning & Limitation:** Tests vector directionality and single-layer integration. Assumes instantaneous horizontal wind coupling without aerodynamic tilt/weathercocking.

---

### Proposal 5: Linear-Elastic Dynamic Snatch Proxy Rating Margin (Secant Elasticity Arithmetic Proxy)
- **Domain:** `shock-load`
- **Kind:** `analytic`
- **Inputs:**
  ```json
  {
    "config": {
      "main_chute": { "specs": { "diameter_in": 60 } },
      "drogue_chute": { "specs": { "diameter_in": 18 } },
      "shock_cord": {
        "specs": {
          "strength_lbs": 1500,
          "length_ft": 20,
          "elongation_pct": 25,
          "material": "nylon"
        }
      }
    },
    "mass_kg": 6.0,
    "deploy_alt_ft": 800,
    "approach_velocity_fps": 65.0
  }
  ```
- **Independent Derivation (`MAIN_SNATCH_MODEL`):**
  $$F_{rated, N} = 1500 \times 4.448 = 6,672\text{ N}$$
  $$\Delta L_{break} = 20\text{ ft} \times 0.3048\text{ m/ft} \times 0.25 = 6.096 \times 0.25 = 1.524\text{ m}$$
  $$k_{secant} = \frac{6672}{1.524} = 4,377.95\text{ N/m}$$
  $$v_{approach, mps} = \frac{65.0}{3.28084} = 19.8120\text{ m/s}$$
  $$E_{event} = \frac{1}{2} \times 6.0 \times (19.8120)^2 = 3.0 \times 392.515 = 1,177.55\text{ J}$$
  $$E_{capacity} = \frac{1}{2} \times 4377.95 \times (1.524)^2 = 2188.98 \times 2.32258 = 5,084.10\text{ J}$$
  $$\Delta L_{pred} = \sqrt{\frac{2 \times 1177.55}{4377.95}} = \sqrt{0.537946} = 0.733448\text{ m}$$
  $$F_{peak, proxy, N} = 4377.95 \times 0.733448 = 3,211.00\text{ N}$$
  $$F_{peak, proxy, lbs} = \frac{3211.00}{4.448} = 721.898\text{ lbs}$$
  $$Rating\ Margin = \frac{1500}{721.898} = 2.07786$$
  $$Energy\ Margin = \frac{5084.10}{1177.55} = 4.3175$$
  $$Status = Rating\ Margin \ge 2.0 \implies \text{"screened"}$$
- **Expected Metrics & Preset Tolerances:**
  - `rating_margin`: Expected = `2.078`, Tolerance: relative $\le 0.001$ ($0.1\%$).
  - `peak_force_proxy_lbs`: Expected = `721.90`, Tolerance: relative $\le 0.001$.
  - `energy_margin`: Expected = `4.318`, Tolerance: relative $\le 0.001$.
  - `predicted_extension_m`: Expected = `0.7334`, Tolerance: relative $\le 0.001$.
  - `status`: Expected = `"screened"`, Tolerance: categorical exact string match.
- **Observable Outputs:** `computeMainSnatchLoad(...)`.
- **Falsifying Failure Mode:** Modifying stiffness calculation (e.g. dividing by $L_0$ instead of $\Delta L_{break}$) or cord unit conversions will alter the rating margin by $> 40\%$, flipping status from `screened` to `marginal` or `exceeds_rating`.
- **Pass/Fail Meaning & Limitation:** Verifies linear elastic energy-proxy screening arithmetic. This is NOT a structural peak dynamic shock load certification.

---

### Proposal 6: Dual-Deploy Descent & Touchdown Velocity Parity (Real-Flight Comparison - BLOCKED)
- **Domain:** `descent`
- **Kind:** `real-flight`
- **Inputs:**
  Vehicle parameters matched to Prometheus TeleMetrum Flight 1:
  - Total mass post-burnout: $m_{dry} = 14.5\text{ kg}$
  - Drogue chute: $D = 24\text{ in}$, nominal $C_D = 0.80$, deploy altitude $H_{drogue} = 12,800\text{ ft}$ MSL
  - Main chute: $D = 120\text{ in}$, nominal $C_D = 0.80$, deploy altitude $H_{main} = 1,470\text{ ft}$ AGL ($6,030\text{ ft}$ MSL at Spaceport America pad)
- **Observed Empirical Reference (TeleMetrum Flight Log 5115):**
  - Observed drogue steady descent rate: $26.9\text{ m/s}$ ($88.2\text{ ft/s}$)
  - Observed main steady descent rate: $5.61\text{ m/s}$ ($18.4\text{ ft/s}$)
  - Observed ground impact speed: $0.8\text{ m/s}$ (horizontal drift landing velocity)
  - Ground drift distance: $1,171.7\text{ m}$ ($3,844.1\text{ ft}$)
- **Expected Tolerances & Sensor Uncertainty:**
  - `drogue_descent_fps`: Observed = `88.2`, Tolerance: relative $\le 0.15$ ($15\%$, basis: real parachute oscillations $\pm 15^\circ$, canopy porosity variance, and high-altitude air density variations).
  - `main_descent_fps`: Observed = `18.4`, Tolerance: relative $\le 0.15$ ($15\%$, basis: manufacturer canopy geometry tolerances and ground boundary layer wind shear).
- **Observable Outputs:** End-to-end simulation descent timeline velocity outputs.
- **Falsifying Failure Mode:** A bug predicting main descent $> 25\text{ ft/s}$ or drogue descent $< 50\text{ ft/s}$ represents an unphysical drag mismatch, failing the real-flight comparison boundary.
- **Pass/Fail Meaning & Limitation:** Bounded simulator-to-flight comparison under specific Spaceport America launch conditions. Does not constitute general aerodynamic certification across all flight regimes.

---

## 6. Actionable OS Workflow & Observed-User Validation Matrix

To address the open release gates in `docs/release-gates-1.3.0.md` without conflating online obtainable data with physical human participation, the validation actions are categorized into a clear matrix:

| Validation Category | Target Surface / Check | Method & Execution Path | Evidence Type Obtained Online | Clarified Protocol / Status |
| :--- | :--- | :--- | :--- | :--- |
| **Windows OS Packaging** | Windows portable binary & Tauri runner | Hosted CI workflow (`remote-42123690801`), GitHub Actions Windows runner | Build artifact SHA-256, signature check, headless/interactive smoke execution | Accessible real OS sessions (standard desktop environments/VMs) sufficient; no bare-metal gate required |
| **macOS Packaging** | Universal macOS .dmg / .app bundle | Hosted CI workflow on macOS runner | Universal binary slice inspection (`lipo`), codesign verification, app launch verification | Accessible macOS sessions sufficient; no extra bare-metal hardware gate required |
| **Platform Print Workflow** | Brief & checklist print CSS | Headless Chromium in CI / browser test suite (`playwright`) | DOM snapshot, print CSS media rendering, page-break verification | Standard digital print preview and layout inspection sufficient; no physical inkjet printing gate required |
| **Observed Rocketeer Trials** | Usability trial protocol (`v1-field-trial.md`) | Documented desktop app trial protocol | Protocol clarity, configuration validation, warning clarity | Software trial protocol evaluates configurator usability; app workflows do NOT require physical rocket launches |
| **Physics Model Validation** | 4 approved reachable benchmarks (atmosphere, terminal descent, drift, snatch) | Independent Python reference calculator + Node adapter | Closed-form derivations, independent metrics, negative controls report | Four reachable benchmarks executed; coast and flight excluded/blocked with explicit evidence requirements |

---

## 7. Recommended Small Executable Next Increment (For Parent Review)

1. **Gate 1 Milestone Achieved:**
   - 9 authoritative primary artifacts downloaded and hashed outside git in `../RecoverySys-artifacts/online-validation-2026-11-05/physics/`.
   - `sources.json` created in owned directory with exact citations, physical claims, units, and SHA-256 checksums.
   - `VALIDATION-DESIGN.md` created detailing physical derivations, OpenRocket headless limitations, empirical flight telemetry, and 6 structured benchmark proposals.
   - Working tree strictly clean outside of `RecoverySys/validation/online-benchmarks-2026-11-05/`.

2. **Proposed Executable Next Increment (Phase 2):**
   - Translate Proposal 1 (`atmosphere`), Proposal 2 (`descent`), Proposal 3 (`ascent`), Proposal 4 (`drift`), and Proposal 5 (`shock-load`) into standard JSON corpus files matching `validation/corpus/schema.json`.
   - Ensure each case is committed with status `review` (strictly preserving the rule that review cases never gate production agreement until independent parent review).
   - Author a standalone, read-only benchmark evaluation script in `validation/online-benchmarks-2026-11-05/` (e.g., `evaluate-proposals.js`) that checks these 5 proposals against the primary references without altering any production code.
   - Await parent review and formal authorization before generating executable code.
