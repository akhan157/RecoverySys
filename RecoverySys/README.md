# RecoverySys

RecoverySys is a local-first recovery-bay configuration and flight-estimation tool for high-power rocketry. It helps you assemble recovery hardware, review configuration warnings, and explore simulated flight and landing behavior before a launch.

**Version 1.2.0.1**

## Capabilities

- Configure recovery-bay components from the built-in parts catalog, including main and drogue parachutes, shock cord, and related hardware.
- Enter rocket, motor, airframe, deployment, and wind specifications.
- Search motor data through ThrustCurve.org or import a RASP `.eng` motor file for a thrust-curve simulation.
- Run an ascent, descent, drift, shock-load, and landing-energy estimate.
- Review mission-envelope, evidence-posture, stale-result, compatibility, provenance, and deterministic sensitivity disclosures alongside estimates.

The browser JavaScript implementation in `src/lib/simulation.js` is the sole
production simulation authority. Python engine material is research and
deferred-only; it is not used by the application or release builds.
- Review compatibility checks and warnings for the selected configuration.
- Generate a Monte Carlo dispersion map with predicted drift vectors and uncertainty circles. This is an estimate of modeled dispersion, not a statistical confidence guarantee.
- Compare a saved Config A with the current Config B.
- Save and restore configurations in the browser, copy share links, import/export JSON, and print a recovery checklist.
- Use light or dark appearance modes.

## Local development

RecoverySys supports Node.js `^20.19.0 || ^22.13.0 || >=24.0.0` and npm `>=10`.
CI runs on Node 22.

From this directory:

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run build        # create the production build in dist/
npm run preview      # preview the production build locally
npm test             # run the test suite once
npm run test:watch   # run tests in watch mode
npm run lint         # lint src/
npm run format:check # check formatting
npm run validate:corpus # validate reproducible comparison cases
npm run report:catalog-provenance # summarize catalog-source posture
npm run check        # formatting, catalog/corpus validation, lint, unit tests, and build
```

## Portable Windows release

The Windows release is a no-install portable ZIP. It embeds the Vite frontend
assets and contains `RecoverySys.exe` plus `README.txt`; it does not use an
installer or registry shortcuts. Build it from this directory with:

```powershell
npm run portable:build
```

This creates the exact archive `RecoverySys-Portable.zip`. Extract it before
running `RecoverySys.exe`. The Microsoft Edge WebView2 Evergreen Runtime is a
required Windows system dependency and is not bundled; install it separately
if needed.

## GitHub Pages

The Vite configuration currently builds for a GitHub Pages project site at `/RecoverySys/`. Keep that base path when deploying this repository as `https://<account>.github.io/RecoverySys/`. If the repository is published under a different Pages path, update the Vite `base` setting before building; otherwise asset URLs will not match the deployed site.

## Local-first and privacy

RecoverySys has no application backend or account system. Saved configurations, custom parts, and appearance preference are kept in this browser's `localStorage` and remain on the device unless you export or share them. The portable Windows app stores local data independently under `%LOCALAPPDATA%`.

The core catalog, calculations, saved configurations, custom parts, and local `.eng` import work without a network connection. Share links encode the configuration in the URL; anyone who receives one can read its contents, and the URL may be retained by browser history, chat, or other services. Use JSON export for an offline backup. Motor search is optional and requests results from ThrustCurve.org; map tiles and web fonts can also be requested from their configured providers.

## Limitations and disclaimer

Simulation results are estimates, not flight-certification results or a substitute for engineering review, field procedures, manufacturer guidance, or range rules. The model includes simplifying assumptions: vertical one-degree-of-freedom ascent, generic aerodynamic drag, simplified parachute and descent behavior, layered wind interpolation, and approximate shock-load and Monte Carlo calculations. The dispersion map is a predicted estimate, not a confidence guarantee. Actual performance can differ with vehicle geometry, motor behavior, deployment, packing, weather, and build conditions.

The built-in catalog is currently marked unverified unless a source is independently reviewed; custom-part data is user supplied. Comparison cases in the checked-in corpus are review cases, not accepted flight evidence. Verify every recovery system, deployment setting, and launch decision independently before flight. RecoverySys does not guarantee safe, legal, or successful operation.
