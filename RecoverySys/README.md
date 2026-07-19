# RecoverySys

RecoverySys is a local-first recovery-bay configuration and flight-estimation tool for high-power rocketry. It helps you assemble recovery hardware, review configuration warnings, and explore simulated flight and landing behavior before a launch.

**Version 1.2.0.0**

## Capabilities

- Configure recovery-bay components from the built-in parts catalog, including main and drogue parachutes, shock cord, and related hardware.
- Enter rocket, motor, airframe, deployment, and wind specifications.
- Search motor data through ThrustCurve.org or import a RASP `.eng` motor file for a thrust-curve simulation.
- Run an ascent, descent, drift, shock-load, and landing-energy estimate.
- Review compatibility checks and warnings for the selected configuration.
- Generate a dispersion map with predicted drift vectors and uncertainty circles.
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
npm run check        # run formatting, lint, tests, and build checks
```

## GitHub Pages

The Vite configuration currently builds for a GitHub Pages project site at `/RecoverySys/`. Keep that base path when deploying this repository as `https://<account>.github.io/RecoverySys/`. If the repository is published under a different Pages path, update the Vite `base` setting before building; otherwise asset URLs will not match the deployed site.

## Local-first and privacy

RecoverySys has no application backend or account system. Saved configurations, custom parts, and appearance preference are kept in this browser's `localStorage` and remain on the device unless you export or share them.

Share links encode the configuration in the URL. Anyone who receives a share link can read the configuration it contains, and the URL may be retained by browser history, chat, or other services. Use JSON export for an offline backup. Motor search is an optional network feature and requests results from ThrustCurve.org; map tiles and web fonts can also be requested from their configured providers.

## Limitations and disclaimer

Simulation results are estimates, not flight-certification results or a substitute for engineering review, field procedures, manufacturer guidance, or range rules. The model includes simplifying assumptions: vertical one-degree-of-freedom ascent, generic aerodynamic drag, simplified parachute and descent behavior, layered wind interpolation, and approximate shock-load and Monte Carlo calculations. Actual performance can differ with vehicle geometry, motor behavior, deployment, packing, weather, and build conditions.

The built-in catalog and user-entered specifications should be checked against current manufacturer documentation. Verify every recovery system, deployment setting, and launch decision independently before flight. RecoverySys does not guarantee safe, legal, or successful operation.
