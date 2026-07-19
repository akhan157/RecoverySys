# RecoverySys

RecoverySys is a recovery-first, local-first planning tool for high-power rocketry (HPR). Assemble a recovery-bay configuration, review compatibility warnings, and explore estimated flight and landing behavior before launch—without an account or application backend.

## Start here

- **[Try the live demo](https://akhan157.github.io/RecoverySys/)**
- **[Latest release: v1.2.0.1](https://github.com/akhan157/RecoverySys/releases/tag/v1.2.0.1)**
- **[Windows installer available in the v1.2.0.0 release](https://github.com/akhan157/RecoverySys/releases/tag/v1.2.0.0)**

## What it does

- Configure main and drogue parachutes, shock cord, chute protection, quick links, and related hardware from the built-in catalog.
- Enter rocket, motor, airframe, deployment, and wind specifications; search ThrustCurve.org or import a RASP `.eng` thrust curve.
- Estimate ascent, apogee, descent, drift, shock load, and landing energy, with a dispersion map for predicted landing behavior.
- Check packing, bay volume, parachute, harness, and other recovery-system compatibility warnings.
- Compare configurations, save and restore locally, export or import JSON, copy share links, and print a recovery checklist.

## Scope and safety

RecoverySys is a transparent recovery-planning aid, not flight-certification software or a substitute for engineering review, field procedures, manufacturer guidance, or range rules. Results are estimates based on simplifying assumptions and may differ from actual flight performance.

It is deliberately narrower than a full flight simulator: it does not provide 6-DOF aerodynamics, stability or rail-exit analysis, detailed motor/airframe performance modeling, accounts, backend persistence, or collaboration. Verify catalog and entered specifications, recovery hardware, deployment settings, weather, and launch decisions independently before flight. RecoverySys does not guarantee safe, legal, or successful operation.

Configurations and preferences are stored in browser `localStorage`; share links encode configuration data in the URL. Motor search, map tiles, and web fonts are optional network-dependent features.

## Quality status

CI runs on Node 22. The project check covers formatting, linting, the 113-test suite, and the production build (`npm run check`).

## Documentation

- [User guide and local-first details](RecoverySys/README.md)
- [Windows desktop build](RecoverySys/DESKTOP.md)
- [Roadmap and explicit deferrals](RecoverySys/ROADMAP.md)
- [Changelog](RecoverySys/CHANGELOG.md)

## Local development

From the `RecoverySys` directory (Node.js `^20.19.0 || ^22.13.0 || >=24.0.0`, npm `>=10`):

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run check
npm run preview
```
