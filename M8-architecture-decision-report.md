# M8 Architecture Decision Report

**Scope:** branch research only. This report inspects the Python engine, browser simulation contract, packaging/deployment, and security posture. It makes no frontend changes, does not wire a runtime, and makes no production-readiness claim.

## Decision summary

1. **Keep `src/lib/simulation.js` as the sole production simulation authority.** Do not route browser runs to Python in M8.
2. **Keep `engine/` explicitly research/deferred-only.** It may support numerical investigation, but its outputs must not gate releases, populate user-facing results, or be described as a second runtime engine.
3. **Preserve the static/local-first deployment model.** GitHub Pages serves the Vite artifact; Tauri embeds the SPA. Neither target currently packages or launches the Python service.
4. **Require a contract-and-evidence gate before any future Python promotion:** versioned request/response schema, browser/Python parity adapters, deterministic seeded dispersion, accepted comparison cases, and explicit model identity/versioning. This is a future architecture requirement, not M8 implementation.

The existing project plan already fixes these boundaries: browser JavaScript is the sole production authority, Python cannot gate a release, and there is no required backend (`RecoverySys/docs/v2-execution-plan.md:9-18`).

## Evidence inventory

| Area | Observed evidence | Architectural consequence |
|---|---|---|
| Browser authority | `RecoverySys/README.md:15-17` names `src/lib/simulation.js` as the sole production authority and says Python is deferred-only. | Avoid dual runtime behavior and result drift. |
| Python packaging | `RecoverySys/engine/pyproject.toml:1-19` defines a separate `recoverysys-engine` package with NumPy, SciPy, FastAPI, Uvicorn, and Pydantic; no lockfile or container definition exists under `engine/`. | Python is a research/service package, not part of the shipped SPA/Tauri artifact. |
| Python route | `RecoverySys/engine/recoverysys_engine/main.py:21-37` exposes FastAPI `/api/health` and `/api/simulate`; `main.py:168-176` runs Uvicorn on `0.0.0.0:8000` with `reload=True`. | A future service deployment would need explicit hardening and lifecycle ownership; current local-first targets must not silently depend on it. |
| CI/deploy | `RecoverySys/.github/workflows/check.yml:1-25` runs Node checks only. `RecoverySys/.github/workflows/deploy.yml:18-49` builds/tests/uploads the Vite artifact; desktop jobs build Tauri but never install Python. | There is no CI evidence for Python parity or a deployed engine. |
| Tauri bundle | `RecoverySys/src-tauri/tauri.conf.json:6-26` embeds `../dist` and has bundling disabled by default; `src-tauri/Cargo.toml:12-19` contains only Tauri/Serde dependencies. | Current desktop packaging has no Python sidecar, interpreter, or service bridge. |
| Web deployment | `RecoverySys/vite.config.js:4-11` selects `/RecoverySys/` for Pages and `./` for Tauri. `RecoverySys/README.md:65-67` documents the Pages base path. | Keep deployment static; an API endpoint would be a new deployment contract, not a config toggle. |
| Local-first boundary | `RecoverySys/README.md:69-73` states no backend/account, local storage on-device, offline core operation, and only optional external motor search/map/font requests. `SECURITY.md:17-21` repeats that normal use does not transmit configuration data. | Do not add a required remote Python dependency; it changes privacy, availability, and threat boundaries. |
| Prior security finding | `RecoverySys/CHANGELOG.md:40-45` records deletion of `lib/engineApi.js`: it had no callers and could read an attacker-controlled `localStorage('recoverysys-engine-url')` and POST config data. | Never restore a user-configurable engine URL or arbitrary cross-origin simulation target. |
| CSP/network | `RecoverySys/index.html:7-14` allows self scripts, inline bootstrap, Google fonts, unpkg Leaflet, OpenStreetMap tile images, and ThrustCurve connections; it deliberately has no `unsafe-eval`. `src/components/DispersionMap.jsx:90-109` uses Leaflet CSS SRI and OSM tiles. | External requests are bounded and visible; adding an engine origin requires a reviewed CSP/privacy decision. |

## Python/browser contract comparison

These are materially different implementations, not interchangeable backends.

### Inputs and field names

- Browser `runSimulation` parses `rocket_mass_g`, `motor_total_impulse_ns`, `burn_time_s`, `airframe_id_in`, `drag_cd`, and `main_deploy_alt_ft` (`RecoverySys/src/lib/simulation.js:688-704`).
- Python `SimulationRequest` expects SI mass and fields `rocket_mass_kg`, `motor_total_impulse_ns`, `burn_time_s`, `airframe_od_in`, `cd`, and `main_deploy_alt_ft` (`RecoverySys/engine/recoverysys_engine/schemas.py:26-45`).
- Python thrust points are `{t, thrust_N}` (`schemas.py:18-20`); browser custom motors carry a richer persisted object and pass `customMotor.curve`/`propellant_kg` (`simulation.js:701-715`).

**Risk:** a thin HTTP adapter cannot safely forward browser state by field renaming alone. Units, naming, optional fields, and persistence shape must be versioned and validated.

### Ascent model

- Browser uses fixed-step RK4 at `dt = 0.02` seconds, vertical 1-DOF dynamics, Mach-dependent drag, and no rail-loss or nozzle-pressure term (`simulation.js:201-305`; constraints `simulation.js:6-30`).
- Python uses SciPy adaptive RK45 with `max_step=0.5`, tight tolerances, and adds a pressure-thrust correction based on assumed nozzle area/exit pressure (`engine/recoverysys_engine/ascent.py:103-145`).
- Both support thrust-curve interpolation and propellant depletion, but solver behavior and the pressure term differ.

**Risk:** same nominal inputs can produce different apogee, burnout, and timeline outputs. Numerical agreement cannot be assumed from shared variable names.

### Descent and drift model

- Browser uses one terminal velocity per phase, no deployment transient, and layered wind interpolation (`simulation.js:31-45`, `simulation.js:738-782`).
- Python integrates transient inflation and descent at a fixed `0.25` s step, includes ballistic fallback, and accumulates horizontal drift throughout descent (`engine/recoverysys_engine/descent.py:110-243`, `:244-337`).

**Risk:** Python is not a drop-in implementation of the browser result contract; descent times, rates, timeline, and drift will diverge by design.

### Monte Carlo model and result shape

- Browser perturbs mass, impulse, Cd, deployment altitude, wind speed, and direction, and scales descent rates (`simulation.js:528-633`). It uses `Math.random()` and returns `meanLat`/`meanLon`.
- Python perturbs mass, deployment altitude, impulse, wind speed, and direction (`montecarlo.py:89-120`); despite its module docstring, the implementation does not perturb Cd. It uses an unseeded NumPy generator (`montecarlo.py:89`) and returns `mean_lat`/`mean_lon` (`montecarlo.py:133-138`).

**Risk:** dispersion is neither reproducible nor shape-compatible across runtimes. A future evidence gate requires an explicit seed and canonical naming; “confidence ellipse” must remain model output, not a flight-success probability.

### Response and failure semantics

- Browser returns `null` for invalid mass/impulse or apogee at/below deployment (`simulation.js:699-700`, `:735-736`), which feeds the app’s no-result/stale-result posture.
- Python returns a minimal `SimulationResponse` with zero values (`main.py:44-45`, `:157-165`).
- Python currently sets `shock_load=None` with a TODO (`main.py:138-153`), while browser returns shock load, main snatch load, and landing energy (`simulation.js:789-827`).
- Python exposes `apogee_method` values `rk45`/`rk45-curve` (`main.py:67-72`), while browser exposes `rk4`, `rk4-curve`, heuristic, and no-OD variants (`simulation.js:712-733`).

**Risk:** replacing browser calls with Python would alter UI state transitions and materially remove or rename user-visible outputs, even if the HTTP call succeeded.

## Packaging and deployment decision

### Current targets

- **Web:** GitHub Pages static Vite output (`deploy.yml:18-49`), with `/RecoverySys/` base path (`vite.config.js:6`). No server process is available on Pages.
- **Windows:** Tauri embeds frontend assets and the portable script ships only `RecoverySys.exe` plus `README.txt` (`DESKTOP.md:8-10`, `scripts/package-portable.ps1:23-43`). WebView2 is an external system prerequisite (`DESKTOP.md:27-36`).
- **macOS:** workflow creates a universal app archive and verifies architecture/signature, but the app is ad-hoc signed and not notarized (`DESKTOP.md:46-62`; `deploy.yml:90-125`).

### M8 consequence

Do not add Python to frontend wiring, Tauri commands, or release workflows. A Python-backed architecture would require choosing and documenting one of two new products:

1. **Hosted API:** contradicts the current no-backend/local-first boundary and requires auth/privacy, availability, CORS, rate limiting, data retention, and deployment controls.
2. **Desktop sidecar:** requires bundling a Python runtime/dependencies, process lifecycle/health handling, update/signing rules, platform-specific artifacts, and offline failure behavior. Current Tauri Rust code has no sidecar bridge (`src-tauri/src/lib.rs:1-7`).

Neither option is evidenced or release-ready in this branch.

## Security decision

1. Keep the engine absent from shipped runtime paths. The historical `engineApi.js` deletion removed a real attacker-controlled URL exfiltration path (`CHANGELOG.md:40-45`).
2. If Python is ever exposed as a service, remove `allow_origins=['*']` and broad methods/headers from `main.py:23-28`; bind only to an intentional interface, disable `reload=True`, and define authentication/origin policy. These are hardening requirements, not completed work.
3. Do not allow an origin or engine URL from `localStorage`, query parameters, share links, imported JSON, or `.eng` content to control network destinations.
4. Preserve the current CSP and review every new origin. Existing CSP already limits `connect-src` to self and ThrustCurve (`index.html:14`); a future engine origin would be an explicit security/privacy change.
5. Treat `.eng` imports and share links as untrusted input. Keep parser/schema/size limits and migration behavior; do not make imported metadata executable or use it to select a service endpoint.

## Future promotion gate (not M8 implementation)

A Python promotion should be considered only after all of the following exist:

- Canonical versioned request/response schema with units, optionality, field names, result identity, and failure semantics.
- One browser-authority adapter and one Python adapter against the same corpus; accepted comparison cases are independently reviewed. The project’s validation plan requires deterministic outcomes, model identity checks, finite outputs, and accepted-case gating (`docs/v2-execution-plan.md:123-159`).
- A declared model identity for each solver/physics behavior; solver or assumption changes update identity and affected cases (`docs/v2-execution-plan.md:34-43`).
- Seeded/reproducible Monte Carlo with explicit output naming and no probability/safety overclaim (`simulation.js:518-527`; `docs/v2-execution-plan.md:9-18`).
- Security and deployment design for either a hosted API or signed desktop sidecar, including origin policy, lifecycle, offline behavior, dependency provenance, and artifact verification.
- Evidence-backed release qualification across web and desktop targets; no macOS support claim before host verification (`docs/v2-execution-plan.md:466-515`).

## What this report does not claim

No Python/browser parity was executed, no production API was deployed, no frontend integration was added, and no release qualification was performed. This is an architecture decision and risk report based on repository evidence, not a production-ready implementation or flight-validation claim.
