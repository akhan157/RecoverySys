import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { verifyFileSha256, validateManifest } from './guards.mjs'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { runSimulation, computeDescentRate } from '../../src/lib/simulation.js'
import { validateNumericProps, parseProperties, pctDelta, validateRunIdentity, runComparison } from './compare.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Derive artifacts dir: priority env var -> git common dir
let artifactsBase = process.env.ARTIFACTS_DIR
if (!artifactsBase) {
  try {
    const commonDir = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: __dirname, encoding: 'utf8' }).stdout.trim()
    const primaryRoot = path.dirname(path.resolve(__dirname, commonDir))
    artifactsBase = path.resolve(primaryRoot, '../RecoverySys-artifacts/online-validation-2026-11-05/openrocket')
  } catch {
    throw new Error('Cannot resolve artifact directory')
  }
}
const orJarPath = path.resolve(artifactsBase, 'OpenRocket-23.09.jar')
const motorPath = path.resolve(artifactsBase, 'I200W.eng')
const manifestPath = path.resolve(__dirname, 'reference-vehicle.json')

const javaBin = process.env.JAVA_BIN || (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin/java') : 'java')
const javacBin = process.env.JAVAC_BIN || (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin/javac') : 'javac')

test('Control Group 1: RecoverySys Valid Baseline then Negative Mass / Guard Rejection', async (t) => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  await t.test('1A: Valid baseline manifest inputs pass runSimulation and computeDescentRate', () => {
    const specs = {
      rocket_mass_g: manifest.mass.total_launch_mass_g.toString(),
      motor_total_impulse_ns: manifest.motor.total_impulse_ns.toString(),
      burn_time_s: manifest.motor.burn_time_s.toString(),
      airframe_id_in: manifest.geometry.outer_diameter_in.toString(),
      drag_cd: manifest.aerodynamics.baseline_subsonic_cd.toString(),
      main_deploy_alt_ft: manifest.recovery.main.deploy_altitude_ft.toString(),
      wind_speed_mph: '0',
      wind_direction_deg: '0',
    }
    const config = {
      drogue_chute: { specs: { diameter_in: 18, cd: 1.5 } },
      main_chute: { specs: { diameter_in: 36, cd: 1.5 } },
    }
    const customMotor = {
      designation: 'I200W',
      curve: manifest.motor.thrust_curve_points,
      totalImpulse_ns: manifest.motor.total_impulse_ns,
      burnTime_s: manifest.motor.burn_time_s,
      propellant_kg: manifest.motor.propellant_mass_kg,
    }

    const res = runSimulation({ specs, config, customMotor })
    assert.ok(res !== null, 'runSimulation must not return null for valid inputs')
    assert.ok(res.apogee_ft > 1000, `Apogee (${res.apogee_ft}) must be > 1000 ft`)
    assert.ok(res.apogee_t_s > 0, 'Apogee time must be positive')
    assert.ok(res.total_time_s > 0, 'Descent time must be positive')

    const descent = computeDescentRate(config.main_chute.specs, 2.1756, 0)
    assert.ok(Number.isFinite(descent) && descent > 0, 'computeDescentRate must return positive finite speed')
  })

  await t.test('1B: Negative mass is rejected with null by runSimulation', () => {
    const specs = {
      rocket_mass_g: '-2357.5',
      motor_total_impulse_ns: '326.78',
      burn_time_s: '1.803',
      airframe_id_in: '3.937',
      drag_cd: '0.50',
    }
    const res = runSimulation({ specs, config: {} })
    assert.equal(res, null, 'Negative rocket mass must return null')
  })

  await t.test('1C: Negative impulse is rejected with null by runSimulation', () => {
    const specs = {
      rocket_mass_g: '2357.5',
      motor_total_impulse_ns: '-326.78',
      burn_time_s: '1.803',
      airframe_id_in: '3.937',
      drag_cd: '0.50',
    }
    const res = runSimulation({ specs, config: {} })
    assert.equal(res, null, 'Negative motor impulse must return null')
  })

  await t.test('1D: computeDescentRate rejects negative mass with null/non-finite', () => {
    const rate = computeDescentRate({ diameter_in: 36, cd: 1.5 }, -2.0, 0)
    assert.ok(!Number.isFinite(rate) || rate === null, 'Negative mass in computeDescentRate must return null or non-finite')
  })
})

test('Control Group 2: OpenRocket Checksum Integrity Guard (Actual Routine vs Tautology)', async (t) => {
  await t.test('2A: Actual JAR byte hashing matches observed pinned SHA-256', () => {
    const expectedJarSha = '65cc0ab68a536fc33fc02a84c416725523a82745e100356efd9ff890b43bfcd0'
    const result = verifyFileSha256(orJarPath, expectedJarSha)
    assert.equal(result.valid, true)
    assert.equal(result.size, 71758139, 'JAR size must match official 71,758,139 bytes')
  })

  await t.test('2B: Actual motor file byte hashing matches I200W.eng SHA-256', () => {
    const expectedMotorSha = '927f60b020cc4f7181925871578319a2e5ddc0500e05c4c124cc709bdd419781'
    const result = verifyFileSha256(motorPath, expectedMotorSha)
    assert.equal(result.valid, true)
  })

  await t.test('2C: Mutated checksum through actual verifier throws verification error', () => {
    const mutatedSha = '0000000000000000000000000000000000000000000000000000000000000000'
    assert.throws(
      () => verifyFileSha256(orJarPath, mutatedSha),
      /Checksum verification failed/
    )
  })
})

test('Control Group 3: OpenRocketDriver Input Guards (Negative Mass & Missing Motor)', async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(process.env.CONTROLS_DIR || os.tmpdir(), 'or-ctrl-'))
  const classesDir = path.join(tmpDir, 'classes')
  fs.mkdirSync(classesDir, { recursive: true })

  // Compile OpenRocketDriver once for controls
  const compile = spawnSync(
    javacBin,
    ['-J-Xmx512m', '-J-XX:ActiveProcessorCount=2', '-cp', orJarPath, '-d', classesDir, path.resolve(__dirname, 'OpenRocketDriver.java')],
    { stdio: 'pipe', encoding: 'utf8' }
  )
  assert.equal(compile.status, 0, `OpenRocketDriver compilation failed: ${compile.stderr}`)

  await t.test('3A: Negative mass in manifest triggers clean non-zero error exit in OpenRocketDriver', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    manifest.mass.vehicle_dry_mass_kg = -2.5 // Malformed negative mass
    const badManifestPath = path.join(tmpDir, 'bad-mass-manifest.json')
    fs.writeFileSync(badManifestPath, JSON.stringify(manifest))

    const run = spawnSync(
      'xvfb-run',
      [
        '-a',
        javaBin,
        '-Xmx512m',
        '-XX:ActiveProcessorCount=2',
        '-cp',
        `${classesDir}:${orJarPath}`,
        'OpenRocketDriver',
        '--manifest',
        badManifestPath,
        '--artifacts-dir',
        tmpDir,
      ],
      { stdio: 'pipe', encoding: 'utf8' }
    )
    assert.notEqual(run.status, 0, 'Driver must exit with non-zero status on negative mass')
    assert.match(
      run.stderr + run.stdout,
      /Invalid vehicle_dry_mass_kg \(must be positive\): -2.5/,
      'Driver must log descriptive error for negative mass'
    )
  })

  await t.test('3B: Missing motor file triggers clean non-zero exit in OpenRocketDriver', () => {
    const run = spawnSync(
      'xvfb-run',
      [
        '-a',
        javaBin,
        '-Xmx512m',
        '-XX:ActiveProcessorCount=2',
        '-cp',
        `${classesDir}:${orJarPath}`,
        'OpenRocketDriver',
        '--manifest',
        manifestPath,
        '--motor',
        path.join(tmpDir, 'nonexistent-motor.eng'),
        '--artifacts-dir',
        tmpDir,
      ],
      { stdio: 'pipe', encoding: 'utf8' }
    )
    assert.notEqual(run.status, 0, 'Driver must exit with non-zero status on missing motor')
    assert.match(
      run.stderr + run.stdout,
      /motor file .*not found/i,
      'Driver must log missing motor file message'
    )
  })

  // Clean up
  if (!process.env.CONTROLS_DIR) fs.rmSync(tmpDir, { recursive: true, force: true })
})

test('Control Group 4: Manifest Mutation Changes Mass, Trajectory and Unequal Fin Geometry', async () => {
  const tmpDir = fs.mkdtempSync(path.join(process.env.CONTROLS_DIR || os.tmpdir(), 'or-mutation-'))
  const classesDir = path.join(tmpDir, 'classes')
  fs.mkdirSync(classesDir, { recursive: true })

  // Compile driver
  const compile = spawnSync(
    javacBin,
    ['-J-Xmx512m', '-J-XX:ActiveProcessorCount=2', '-cp', orJarPath, '-d', classesDir, path.resolve(__dirname, 'OpenRocketDriver.java')],
    { stdio: 'pipe', encoding: 'utf8' }
  )
  assert.equal(compile.status, 0)

  // Mutate manifest: increase dry mass significantly from 2.00 kg to 3.50 kg
  const mutatedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  mutatedManifest.mass.vehicle_dry_mass_kg = 3.500
  mutatedManifest.mass.total_launch_mass_kg = 3.857504
  mutatedManifest.mass.burned_out_mass_kg = 3.675616
  mutatedManifest.mass.total_launch_mass_g = 3857.504
  mutatedManifest.mass.burned_out_mass_g = 3675.616
  mutatedManifest.geometry.fins.sweep_m = 0.12
  mutatedManifest.geometry.fins.height_m = 0.08
  validateManifest(mutatedManifest,fs.readFileSync(motorPath,'utf8'))
  const mutatedPath = path.join(tmpDir, 'mutated-manifest.json')
  fs.writeFileSync(mutatedPath, JSON.stringify(mutatedManifest))

  // Run driver on mutated manifest
  const run = spawnSync(
    'xvfb-run',
    [
      '-a',
      javaBin,
      '-Xmx512m',
      '-XX:ActiveProcessorCount=2',
      '-cp',
      `${classesDir}:${orJarPath}`,
      'OpenRocketDriver',
      '--manifest',
      mutatedPath,
      '--motor',
      motorPath,
      '--artifacts-dir',
      tmpDir,
      '--mode',
      'controlled_cd',
      '--output-prefix',
      'or-mutated',
    ],
    { stdio: 'pipe', encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  )
  assert.equal(run.status, 0, `Mutated run failed: ${run.stderr}\n${run.stdout}`)

  const propsFile = path.join(tmpDir, 'or-mutated-summary.properties')
  assert.ok(fs.existsSync(propsFile), 'Mutated properties file must be written')
  const props = parseProperties(propsFile)

  // 1. Verify Java ingested the mutated manifest parameter
  assert.equal(props.nominal_vehicle_dry_mass_kg, '3.500000', 'Java engine must record mutated dry mass')
  assert.equal(Number(props.configured_fin_sweep_m), 0.12, 'Actual engine sweep must match manifest')
  assert.equal(Number(props.configured_fin_height_m), 0.08, 'Actual engine height must match manifest')

  // 2. Verify Java engine mass curve reflected the mutated mass
  const observedBurnoutMass = parseFloat(props.observed_burnout_mass_kg)
  assert.ok(
    Math.abs(observedBurnoutMass - 3.675616) < 0.05,
    `Observed burnout mass (${observedBurnoutMass}) must reflect 3.5kg dry + 0.176kg casing`
  )

  // 3. Verify trajectory output demonstrably changed: heavier rocket apogee (~350 m) is significantly lower than baseline (542 m)
  const mutatedApogee = parseFloat(props.observed_apogee_m)
  assert.ok(
    mutatedApogee < 400.0,
    `Mutated apogee (${mutatedApogee} m) must be substantially lower than baseline (~542 m)`
  )

  // Clean up
  if (!process.env.CONTROLS_DIR) fs.rmSync(tmpDir, { recursive: true, force: true })
})

test('Control Group 5: Summary Validation & Non-Finite Value Rejection', async (t) => {
  await t.test('5A: Valid properties map passes validation', () => {
    const validProps = {
      observed_apogee_m: '542.29',
      observed_descent_duration_s: '50.96',
    }
    assert.doesNotThrow(() => validateNumericProps(validProps, ['observed_apogee_m', 'observed_descent_duration_s']))
  })

  await t.test('5B: Missing key triggers validation error', () => {
    const invalidProps = { observed_apogee_m: '542.29' }
    assert.throws(
      () => validateNumericProps(invalidProps, ['observed_apogee_m', 'missing_key']),
      /Missing required property key: missing_key/
    )
  })

  await t.test('5C: Non-finite NaN value triggers validation error', () => {
    const nanProps = { observed_apogee_m: 'NaN' }
    assert.throws(
      () => validateNumericProps(nanProps, ['observed_apogee_m']),
      /Non-finite numeric property for key 'observed_apogee_m': NaN/
    )
  })

  await t.test('5D: Non-finite Infinity value triggers validation error', () => {
    const infProps = { observed_apogee_m: 'Infinity' }
    assert.throws(
      () => validateNumericProps(infProps, ['observed_apogee_m']),
      /Non-finite numeric property for key 'observed_apogee_m': Infinity/
    )
  })
})

test('Shared manifest guard rejects unit, motor and unsupported environment mutations', () => {
  const source = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const motor = fs.readFileSync(motorPath, 'utf8')
  assert.doesNotThrow(() => validateManifest(source, motor))
  for (const mutate of [
    m => { m.recovery.main.diameter_in = .9144 },
    m => { m.mass.total_launch_mass_g = 2.357504 },
    m => { m.motor.thrust_curve_points[1].thrust_N += 10 },
    m => { m.environment.wind_speed_mph = 10 },
    m => { m.recovery.main.deploy_delay_s = 1 },
  ]) {
    const m = structuredClone(source); mutate(m)
    assert.throws(() => validateManifest(m, motor))
  }
})

test('Summary numbers reject trailing units and blank values; percentages reject zero denominators', () => {
  for (const bad of ['3m', '', '  ', 'NaN', 'Infinity']) {
    assert.throws(() => validateNumericProps({value: bad}, ['value']))
  }
  assert.throws(() => pctDelta(3, 0))
})

test('Comparison identity rejects stale manifests, swapped modes, motors and mixed runs', () => {
  const source = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const sha = crypto.createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex')
  const metadata = {run_id:'fixture-run', input_hashes:{'reference-vehicle.json':sha, motor:'motor-hash'}}
  const props = {
    run_id:'fixture-run', manifest_sha256:sha, motor_sha256:'motor-hash',
    mode:'controlled_cd', simulator:'OpenRocket', version:'23.09',
    git_commit:'6c89a3c60118226e562e19625d8fd439854b1246',
  }
  assert.doesNotThrow(() => validateRunIdentity(metadata,props,'controlled_cd',sha))
  for (const change of [
    {manifest_sha256:'stale'}, {mode:'native_aero'}, {motor_sha256:'different'},
    {run_id:'other-run'}, {version:'different'}, {simulator:'different'},
  ]) assert.throws(() => validateRunIdentity(metadata,{...props,...change},'controlled_cd',sha),/run identity mismatch/)
  assert.throws(() => validateRunIdentity({...metadata,input_hashes:{}},props,'controlled_cd',sha),/run identity mismatch/)

  // Reproduce the review finding through the public comparison entry point.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'or-stale-review-'))
  try {
    source.mass.vehicle_dry_mass_kg=3.5
    source.mass.total_launch_mass_kg=3.857504
    source.mass.total_launch_mass_g=3857.504
    source.mass.burned_out_mass_kg=3.675616
    source.mass.burned_out_mass_g=3675.616
    validateManifest(source)
    const heavier=path.join(tmp,'heavier.json')
    fs.writeFileSync(heavier,JSON.stringify(source))
    fs.writeFileSync(path.join(tmp,'reproduction-manifest.json'),JSON.stringify(metadata))
    for (const [mode,prefix] of [['controlled_cd','controlled-cd'],['native_aero','native-aero']]) {
      fs.writeFileSync(path.join(tmp,`or-reference-${prefix}-summary.properties`),
        Object.entries({...props,mode}).map(([k,v])=>`${k}=${v}`).join('\n'))
    }
    const outputPath=path.join(tmp,'comparison.json')
    assert.throws(() => runComparison({manifestPath:heavier,targetArtifactsDir:tmp,outputPath}),/run identity mismatch/)
    assert.equal(fs.existsSync(outputPath),false,'Reject before writing misleading output')
  } finally { fs.rmSync(tmp,{recursive:true,force:true}) }
})
