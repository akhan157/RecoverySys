# RecoverySys

Browser-based dual-deploy recovery bay configurator for high-power rocketry.

**[Live demo →](https://akhan157.github.io/RecoverySys/)**

---

RecoverySys helps rocketeers design and validate dual-deploy recovery systems before going to the field. Pick components from a catalog of real hardware, check bay compatibility, and run a physics simulation to predict flight performance and landing scatter.

## Features

- **189-part catalog** — parachutes, deployment charges, harnesses, and hardware with real specs
- **Compatibility checks** — bay volume fit, parachute diameter clearance, shock-cord load limits
- **Flight simulation** — RK45 ODE integrator with ISA atmosphere and altitude-dependent air density
- **Monte Carlo wind analysis** — 500-run scatter, p95 drift radius, 1-sigma landing ellipse
- **Map overlay** — predicted landing coordinates rendered on a Leaflet map
- **75 automated tests** — simulation logic, compatibility rules, and UI state

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React, Vite, JavaScript, Leaflet |
| Simulation | Python, SciPy, NumPy, FastAPI ([recoverysys-engine](https://github.com/akhan157/recoverysys-engine)) |
| Deployment | GitHub Pages via GitHub Actions |

## Run locally

```bash
cd RecoverySys
npm install
npm run dev
```

The app runs fully client-side with a built-in simulation fallback. To connect the full Python backend, see [recoverysys-engine](https://github.com/akhan157/recoverysys-engine).

## Related

- **[recoverysys-engine](https://github.com/akhan157/recoverysys-engine)** — the Python simulation core: RK45 ascent, dual-deploy descent, drift, Monte Carlo scatter, FastAPI service

---

Built for the Aerobing Rocketry Team at Binghamton University.
