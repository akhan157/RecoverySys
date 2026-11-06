import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { validateManifest } from './guards.mjs'
import { runSimulation, computeDescentRate } from '../../src/lib/simulation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Derive artifacts dir: priority CLI arg -> env var -> external run dir
let artifactsDir = process.env.ARTIFACTS_DIR
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--artifacts-dir' && i + 1 < process.argv.length) {
    artifactsDir = process.argv[++i]
    break
  }
}
if (!artifactsDir) {
  const commonDir = execSync('git rev-parse --git-common-dir', { cwd: __dirname }).toString().trim()
  const primaryRoot = path.dirname(path.resolve(__dirname, commonDir))
  artifactsDir = path.resolve(primaryRoot, '../RecoverySys-artifacts/online-validation-2026-11-05/openrocket')
}

export function parseProperties(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Summary properties file not found: ${filePath}`)
  }
  const lines = fs.readFileSync(filePath, 'utf8').split('\n')
  const map = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      map[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
    }
  }
  return map
}

export function validateNumericProps(props, requiredKeys) {
  for (const key of requiredKeys) {
    if (!(key in props)) {
      throw new Error(`Missing required property key: ${key}`)
    }
    const val = String(props[key]).trim() === '' ? NaN : Number(props[key])
    if (!Number.isFinite(val)) {
      throw new Error(`Non-finite numeric property for key '${key}': ${props[key]}`)
    }
  }
}

export function pctDelta(valA, valB) {
  if (!Number.isFinite(valA) || !Number.isFinite(valB) || valB === 0) throw new Error('Invalid percentage operands')
  return ((valA - valB) / valB) * 100
}

export function runComparison({
  manifestPath = path.resolve(__dirname, 'reference-vehicle.json'),
  targetArtifactsDir = artifactsDir,
  outputPath = null,
} = {}) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found: ${manifestPath}`)
  }
  const manifest = validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')))

  // 1. Prepare RecoverySys Inputs from Shared Manifest
  const specs = {
    rocket_mass_g: manifest.mass.total_launch_mass_g.toString(),
    motor_total_impulse_ns: manifest.motor.total_impulse_ns.toString(),
    burn_time_s: manifest.motor.burn_time_s.toString(),
    airframe_id_in: manifest.geometry.outer_diameter_in.toString(),
    drag_cd: manifest.aerodynamics.baseline_subsonic_cd.toString(),
    main_deploy_alt_ft: manifest.recovery.main.deploy_altitude_ft.toString(),
    wind_speed_mph: manifest.environment.wind_speed_mph.toString(),
    wind_direction_deg: '0',
  }

  const config = {
    drogue_chute: {
      specs: {
        diameter_in: manifest.recovery.drogue.diameter_in,
        cd: manifest.recovery.drogue.cd,
      },
    },
    main_chute: {
      specs: {
        diameter_in: manifest.recovery.main.diameter_in,
        cd: manifest.recovery.main.cd,
      },
    },
  }

  const customMotor = {
    designation: manifest.motor.designation,
    curve: manifest.motor.thrust_curve_points,
    totalImpulse_ns: manifest.motor.total_impulse_ns,
    burnTime_s: manifest.motor.burn_time_s,
    propellant_kg: manifest.motor.propellant_mass_kg,
  }

  // 2. Execute RecoverySys Public Simulation
  const rsResult = runSimulation({ specs, config, customMotor })
  if (!rsResult) {
    throw new Error('RecoverySys runSimulation returned null for valid manifest inputs!')
  }

  // RecoverySys Clocks:
  // rsResult.total_time_s is DESCENT ONLY (phase1 + phase2).
  // Estimated flight time is apogee_t_s + total_time_s.
  const rsDescentTimeS = rsResult.total_time_s
  const rsEstimatedFlightTimeS = rsResult.apogee_t_s + rsResult.total_time_s

  // 3. Supplemental Calculations
  // A. Dry mass single-chute evaluations
  const midDrogueFt = (rsResult.apogee_ft + manifest.recovery.main.deploy_altitude_ft) / 2
  const rsDrogueFpsDryMid = computeDescentRate(config.drogue_chute.specs, manifest.mass.burned_out_mass_kg, midDrogueFt)
  const rsMainFpsDryDeploy = computeDescentRate(config.main_chute.specs, manifest.mass.burned_out_mass_kg, manifest.recovery.main.deploy_altitude_ft)
  const rsMainFpsDrySeaLevel = computeDescentRate(config.main_chute.specs, manifest.mass.burned_out_mass_kg, 0)

  // B. Dry mass aggregate dual-chute evaluation (matching OpenRocket dual-deployed state)
  const drogueDiamIn = manifest.recovery.drogue.diameter_in
  const mainDiamIn = manifest.recovery.main.diameter_in
  const aggregateDiamIn = Math.sqrt(drogueDiamIn**2 * manifest.recovery.drogue.cd / manifest.recovery.main.cd + mainDiamIn**2)
  const aggregateChuteSpecs = {
    diameter_in: aggregateDiamIn,
    cd: manifest.recovery.main.cd,
  }
  const rsAggregateFpsDrySeaLevel = computeDescentRate(aggregateChuteSpecs, manifest.mass.burned_out_mass_kg, 0)

  // C. Launch mass single and aggregate chute evaluations (public runSimulation uses launch mass for drift conservatism)
  const rsMainFpsLaunchSeaLevel = computeDescentRate(config.main_chute.specs, manifest.mass.total_launch_mass_kg, 0)
  const rsAggregateFpsLaunchSeaLevel = computeDescentRate(aggregateChuteSpecs, manifest.mass.total_launch_mass_kg, 0)

  // 4. Load & Validate OpenRocket Results
  const controlledPropsPath = path.resolve(targetArtifactsDir, 'or-reference-controlled-cd-summary.properties')
  const nativePropsPath = path.resolve(targetArtifactsDir, 'or-reference-native-aero-summary.properties')

  const orControlledProps = parseProperties(controlledPropsPath)
  const orNativeProps = parseProperties(nativePropsPath)

  const requiredProps = [
    'observed_apogee_ft',
    'observed_max_velocity_m_s',
    'observed_max_mach',
    'observed_drogue_terminal_velocity_fps',
    'observed_main_terminal_velocity_fps',
    'observed_apogee_m',
    'observed_apogee_time_s',
    'observed_burnout_time_s',
    'observed_launch_mass_kg',
    'observed_burnout_mass_kg',
    'observed_drogue_terminal_velocity_m_s',
    'observed_main_terminal_velocity_m_s',
    'observed_touchdown_velocity_m_s',
    'observed_descent_duration_s',
    'observed_flight_duration_s',
  ]
  validateNumericProps(orControlledProps, requiredProps)
  validateNumericProps(orNativeProps, requiredProps)

  const parseOrData = (props) => ({
    apogee_m: Number(props.observed_apogee_m),
    apogee_ft: Number(props.observed_apogee_ft),
    time_to_apogee_s: Number(props.observed_apogee_time_s),
    burnout_time_s: Number(props.observed_burnout_time_s),
    launch_mass_kg: Number(props.observed_launch_mass_kg),
    burnout_mass_kg: Number(props.observed_burnout_mass_kg),
    max_velocity_m_s: Number(props.observed_max_velocity_m_s),
    max_mach: Number(props.observed_max_mach),
    drogue_terminal_velocity_m_s: Number(props.observed_drogue_terminal_velocity_m_s),
    drogue_terminal_velocity_fps: Number(props.observed_drogue_terminal_velocity_fps),
    main_terminal_velocity_m_s: Number(props.observed_main_terminal_velocity_m_s),
    main_terminal_velocity_fps: Number(props.observed_main_terminal_velocity_fps),
    touchdown_velocity_m_s: Number(props.observed_touchdown_velocity_m_s),
    descent_duration_s: Number(props.observed_descent_duration_s),
    flight_duration_s: Number(props.observed_flight_duration_s),
    warnings: props.warnings,
  })

  const orControlled = parseOrData(orControlledProps)
  const orNative = parseOrData(orNativeProps)

  // 5. Build Metrics Comparison Matrices

  // Table 1: Primary Public API Trajectory Comparison
  const primaryMetrics = [
    {
      metric: 'Apogee Altitude (m)',
      unit: 'm',
      rs_value: rsResult.apogee_ft / 3.28084,
      or_controlled: orControlled.apogee_m,
      delta_controlled_pct: pctDelta(rsResult.apogee_ft / 3.28084, orControlled.apogee_m),
      or_native: orNative.apogee_m,
      delta_native_pct: pctDelta(rsResult.apogee_ft / 3.28084, orNative.apogee_m),
      notes: 'Diagnostic comparison of rounded public apogee with OR maximum altitude; different integrators and mass schedules remain.',
    },
    {
      metric: 'Apogee Altitude (ft)',
      unit: 'ft',
      rs_value: rsResult.apogee_ft,
      or_controlled: orControlled.apogee_ft,
      delta_controlled_pct: pctDelta(rsResult.apogee_ft, orControlled.apogee_ft),
      or_native: orNative.apogee_ft,
      delta_native_pct: pctDelta(rsResult.apogee_ft, orNative.apogee_ft),
      notes: 'Standard conversion (3.28084 ft/m).',
    },
    {
      metric: 'Time to Apogee',
      unit: 's',
      rs_value: rsResult.apogee_t_s,
      or_controlled: orControlled.time_to_apogee_s,
      delta_controlled_pct: pctDelta(rsResult.apogee_t_s, orControlled.time_to_apogee_s),
      or_native: orNative.time_to_apogee_s,
      delta_native_pct: pctDelta(rsResult.apogee_t_s, orNative.time_to_apogee_s),
      notes: 'RecoverySys outputs integer-rounded apogee time (Math.round); OpenRocket event time is continuous.',
    },
    {
      metric: 'Motor Burnout Time',
      unit: 's',
      rs_value: rsResult.burnout_t_s,
      or_controlled: orControlled.burnout_time_s,
      delta_controlled_pct: pctDelta(rsResult.burnout_t_s, orControlled.burnout_time_s),
      or_native: orNative.burnout_time_s,
      delta_native_pct: pctDelta(rsResult.burnout_t_s, orNative.burnout_time_s),
      notes: 'RecoverySys outputs integer-rounded burnout time (Math.round); OpenRocket records actual thrust curve end.',
    },
    {
      metric: 'Descent Duration',
      unit: 's',
      rs_value: rsDescentTimeS,
      or_controlled: orControlled.descent_duration_s,
      delta_controlled_pct: pctDelta(rsDescentTimeS, orControlled.descent_duration_s),
      or_native: orNative.descent_duration_s,
      delta_native_pct: pctDelta(rsDescentTimeS, orNative.descent_duration_s),
      notes: 'Descent-only clock (apogee to landing). RecoverySys total_time_s is descent only.',
    },
    {
      metric: 'Estimated Total Flight Duration',
      unit: 's',
      rs_value: rsEstimatedFlightTimeS,
      or_controlled: orControlled.flight_duration_s,
      delta_controlled_pct: pctDelta(rsEstimatedFlightTimeS, orControlled.flight_duration_s),
      or_native: orNative.flight_duration_s,
      delta_native_pct: pctDelta(rsEstimatedFlightTimeS, orNative.flight_duration_s),
      notes: 'Launch-to-landing clock. RecoverySys estimated flight = apogee_t_s + total_time_s.',
    },
    {
      metric: 'Drogue phase rate vs pre-main sample (m/s)',
      unit: 'm/s',
      rs_value: rsResult.drogue_fps / 3.28084,
      or_controlled: orControlled.drogue_terminal_velocity_m_s,
      delta_controlled_pct: pctDelta(rsResult.drogue_fps / 3.28084, orControlled.drogue_terminal_velocity_m_s),
      or_native: orNative.drogue_terminal_velocity_m_s,
      delta_native_pct: pctDelta(rsResult.drogue_fps / 3.28084, orNative.drogue_terminal_velocity_m_s),
      notes: 'Rounded public launch-mass mid-altitude rate versus OR pre-main sampled speed at depleted mass and a different altitude.',
    },
    {
      metric: 'Main phase rate vs pre-landing sample (m/s)',
      unit: 'm/s',
      rs_value: rsResult.main_fps / 3.28084,
      or_controlled: orControlled.main_terminal_velocity_m_s,
      delta_controlled_pct: pctDelta(rsResult.main_fps / 3.28084, orControlled.main_terminal_velocity_m_s),
      or_native: orNative.main_terminal_velocity_m_s,
      delta_native_pct: pctDelta(rsResult.main_fps / 3.28084, orNative.main_terminal_velocity_m_s),
      notes: 'Model difference: RecoverySys main phase uses main chute alone; OpenRocket maintains both drogue and main deployed.',
    },
  ]

  // Table 2: Supplemental Diagnostic Terminal Descent Checks
  const supplementalMetrics = [
    {
      diagnostic_check: 'Burned-Out Dry Mass, Sea Level, Single Main Chute (36 in)',
      formula: 'sqrt(2*m_dry*g / (rho0 * Cd * A_main))',
      rs_predicted_mps: rsMainFpsDrySeaLevel / 3.28084,
      rs_predicted_fps: rsMainFpsDrySeaLevel,
      or_observed_mps: orControlled.main_terminal_velocity_m_s,
      delta_pct: pctDelta(rsMainFpsDrySeaLevel / 3.28084, orControlled.main_terminal_velocity_m_s),
      finding: 'Single-main dry-mass sea-level diagnostic; OR retains both deployed canopies.',
    },
    {
      diagnostic_check: 'Burned-Out Dry Mass, Sea Level, Aggregate Dual Chutes (36 in + 18 in)',
      formula: 'sqrt(2*m_dry*g / (rho0 * Cd * (A_main + A_drogue)))',
      rs_predicted_mps: rsAggregateFpsDrySeaLevel / 3.28084,
      rs_predicted_fps: rsAggregateFpsDrySeaLevel,
      or_observed_mps: orControlled.main_terminal_velocity_m_s,
      delta_pct: pctDelta(rsAggregateFpsDrySeaLevel / 3.28084, orControlled.main_terminal_velocity_m_s),
      finding: 'Aggregate Cd-area diagnostic; compare with sampled OR pre-landing speed. Numerical proximity supports the canopy-state explanation.',
    },
    {
      diagnostic_check: 'Total Launch Mass, Sea Level, Single Main Chute (36 in)',
      formula: 'sqrt(2*m_launch*g / (rho0 * Cd * A_main))',
      rs_predicted_mps: rsMainFpsLaunchSeaLevel / 3.28084,
      rs_predicted_fps: rsMainFpsLaunchSeaLevel,
      or_observed_mps: orControlled.main_terminal_velocity_m_s,
      delta_pct: pctDelta(rsMainFpsLaunchSeaLevel / 3.28084, orControlled.main_terminal_velocity_m_s),
      finding: 'Supplemental launch-mass sea-level rate, separate from the public deploy-altitude rate.',
    },
    {
      diagnostic_check: 'Burned-Out Dry Mass, Mid-Drogue Altitude, Single Drogue Chute (18 in)',
      formula: 'computeDescentRate(drogue, m_dry, alt_mid)',
      rs_predicted_mps: rsDrogueFpsDryMid / 3.28084,
      rs_predicted_fps: rsDrogueFpsDryMid,
      or_observed_mps: orControlled.drogue_terminal_velocity_m_s,
      delta_pct: pctDelta(rsDrogueFpsDryMid / 3.28084, orControlled.drogue_terminal_velocity_m_s),
      finding: 'Mid-altitude analytic rate versus a pre-main sample at another altitude; diagnostic only.',
    },
  ]

  const outputData = {
    timestamp: new Date().toISOString(),
    benchmark: 'OpenRocket-23.09 vs RecoverySys (Corrected)',
    reference_vehicle: manifest.name,
    manifest_path: manifestPath,
    openrocket_version: '23.09 (release-23.09, commit 6c89a3c)',
    vehicle_mass_nominal: manifest.mass,
    recoverysys_results: {
      apogee_m: rsResult.apogee_ft / 3.28084,
      apogee_ft: rsResult.apogee_ft,
      apogee_t_s: rsResult.apogee_t_s,
      burnout_t_s: rsResult.burnout_t_s,
      descent_duration_s: rsDescentTimeS,
      estimated_total_flight_time_s: rsEstimatedFlightTimeS,
      drogue_fps_public: rsResult.drogue_fps,
      main_fps_public: rsResult.main_fps,
      apogee_method: rsResult.apogee_method,
    },
    openrocket_controlled_cd: orControlled,
    openrocket_native_aero: orNative,
    primary_metrics_comparison: primaryMetrics,
    supplemental_diagnostics: supplementalMetrics,
    clock_clarification: {
      recoverysys_total_time_s_definition: 'Descent duration only (phase1_time_s + phase2_time_s)',
      recoverysys_estimated_flight_s_definition: 'apogee_t_s + total_time_s (launch to landing sum)',
      openrocket_descent_duration_s_definition: 'landing_time_s - apogee_time_s (event-derived descent duration)',
      openrocket_flight_duration_s_definition: 'landing_time_s (event-derived total duration)',
      prior_error_rectification: 'Initial report compared RecoverySys descent time (48 s) directly to OpenRocket flight time (61.23 s), erroneously claiming a 21.61% flight-time error.',
    },
    recovery_configuration_clarification: {
      recoverysys_main_phase: 'Single main parachute alone (below_deploy_fps = main_fps ?? drogue_fps)',
      openrocket_main_phase: 'Dual canopies simultaneously active (drogue remains deployed alongside main)',
      aerodynamic_verification: 'Supplemental Cd-area calculation tests the retained-canopy explanation; sampled speeds are not independently certified terminal rates.',
      status: 'Preserved as an explicit model difference; no phase equivalence or tuning claimed.',
    },
  }

  // Save JSON
  const savePath = outputPath || path.resolve(targetArtifactsDir, 'comparison-results.json')
  fs.writeFileSync(savePath, JSON.stringify(outputData, null, 2), {flag: 'wx'})
  console.log('Saved comparison results to: ' + savePath)

  // Print Formatted Markdown Tables
  console.log('\n### 1. Primary Public Trajectory Benchmark Comparison Table\n')
  console.log('| Metric | Unit | RecoverySys (Public API) | OR Controlled (Cd=0.5) | Delta % (Controlled) | OR Native (Barrowman) | Delta % (Native) |')
  console.log('| :--- | :---: | :---: | :---: | :---: | :---: | :---: |')
  for (const m of primaryMetrics) {
    console.log(
      `| ${m.metric} | ${m.unit} | ${m.rs_value.toFixed(2)} | ${m.or_controlled.toFixed(2)} | ${m.delta_controlled_pct >= 0 ? '+' : ''}${m.delta_controlled_pct.toFixed(2)}% | ${m.or_native.toFixed(2)} | ${m.delta_native_pct >= 0 ? '+' : ''}${m.delta_native_pct.toFixed(2)}% |`
    )
  }

  console.log('\n### 2. Supplemental Diagnostic Terminal Descent Checks\n')
  console.log('| Diagnostic Case | RS Analytical (m/s) | RS Analytical (fps) | OR Observed (m/s) | Delta % | Physical Diagnostic Finding |')
  console.log('| :--- | :---: | :---: | :---: | :---: | :--- |')
  for (const s of supplementalMetrics) {
    console.log(
      `| ${s.diagnostic_check} | ${s.rs_predicted_mps.toFixed(2)} | ${s.rs_predicted_fps.toFixed(2)} | ${s.or_observed_mps.toFixed(2)} | ${s.delta_pct >= 0 ? '+' : ''}${s.delta_pct.toFixed(2)}% | ${s.finding} |`
    )
  }

  console.log('\n==================================================================\n')
  return outputData
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runComparison()
}
