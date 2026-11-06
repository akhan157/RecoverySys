import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export function verifyFileSha256(filePath, expected) {
  const bytes = fs.readFileSync(filePath)
  const actual = crypto.createHash('sha256').update(bytes).digest('hex')
  if (actual !== expected.toLowerCase()) throw new Error(`Checksum verification failed: ${filePath}`)
  return { valid: true, sha256: actual, size: bytes.length }
}

// Numerical consistency bounds accommodate decimal serialization, not physics acceptance.
export function validateManifest(m, motorText = null) {
  const positive = (v, name) => {
    if (!Number.isFinite(v) || v <= 0) throw new Error(`Invalid positive ${name}`)
  }
  const equal = (a, b, name, eps = 1e-8) => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a-b) > eps * Math.max(1, Math.abs(b))) {
      throw new Error(`Inconsistent ${name}`)
    }
  }
  const g=m.geometry, mass=m.mass, motor=m.motor, e=m.environment, r=m.recovery
  for (const [name,v] of Object.entries(mass)) positive(v, `mass.${name}`)
  equal(g.outer_diameter_in * .0254, g.outer_diameter_m, 'diameter units')
  equal(g.body_tube.outer_radius_m * 2, g.outer_diameter_m, 'body diameter')
  equal(g.nose_cone.base_radius_m * 2, g.outer_diameter_m, 'nose diameter')
  equal(g.reference_area_m2, Math.PI*g.outer_diameter_m**2/4, 'reference area')
  equal(g.total_length_m, g.nose_cone.length_m+g.body_tube.length_m, 'length')
  for (const section of [g.body_tube, g.nose_cone, g.fins]) {
    for (const [key,value] of Object.entries(section)) if (typeof value === 'number') positive(value,key)
  }
  if (g.nose_cone.shape !== 'OGIVE' || g.fins.shape !== 'TRAPEZOIDAL' || !Number.isInteger(g.fins.count) || g.body_tube.inner_radius_m >= g.body_tube.outer_radius_m) throw new Error('Unsupported geometry')
  positive(m.aerodynamics.baseline_subsonic_cd, 'Cd')
  equal(mass.total_launch_mass_g/1000,mass.total_launch_mass_kg,'launch mass units')
  equal(mass.burned_out_mass_g/1000,mass.burned_out_mass_kg,'burnout mass units')
  equal(mass.vehicle_dry_mass_kg+mass.motor_initial_mass_kg,mass.total_launch_mass_kg,'launch mass schedule')
  equal(mass.motor_initial_mass_kg-mass.motor_propellant_mass_kg,mass.motor_casing_mass_kg,'motor casing')
  equal(mass.total_launch_mass_kg-mass.motor_propellant_mass_kg,mass.burned_out_mass_kg,'burnout mass schedule')
  equal(motor.propellant_mass_kg,mass.motor_propellant_mass_kg,'propellant mass')
  positive(motor.burn_time_s,'burn time'); positive(motor.total_impulse_ns,'impulse')
  const curve=motor.thrust_curve_points
  if (!Array.isArray(curve) || curve.length<2 || curve[0].t!==0 || curve[0].thrust_N!==0) throw new Error('Invalid thrust curve start')
  let impulse=0
  for(let i=1;i<curve.length;i++) {
    const a=curve[i-1],b=curve[i]
    if (!Number.isFinite(b.t) || !Number.isFinite(b.thrust_N) || b.t<=a.t || b.thrust_N<0) throw new Error('Invalid thrust curve')
    impulse+=(b.t-a.t)*(a.thrust_N+b.thrust_N)/2
  }
  equal(curve.at(-1).t,motor.burn_time_s,'burn duration')
  equal(impulse,motor.total_impulse_ns,'curve impulse',1e-6)
  for(const [name,chute] of Object.entries(r)) {
    positive(chute.diameter_m, name); positive(chute.cd,`${name} Cd`)
    equal(chute.diameter_in*.0254,chute.diameter_m,`${name} diameter units`)
    equal(chute.nominal_area_m2,Math.PI*chute.diameter_m**2/4,`${name} area`)
    if(chute.deploy_delay_s!==0) throw new Error('Only zero deployment delay supported')
  }
  equal(r.main.deploy_altitude_ft*.3048,r.main.deploy_altitude_m,'deployment units')
  positive(r.main.deploy_altitude_m,'deployment altitude')
  if(r.drogue.deploy_event!=='APOGEE' || r.main.deploy_event!=='ALTITUDE') throw new Error('Unsupported deployment events')
  if(e.atmosphere_model!=='ISA' || e.launch_altitude_m!==0 || e.launch_altitude_ft!==0 || e.wind_speed_m_s!==0 || e.wind_speed_mph!==0 || e.launch_rod_angle_deg!==0 || e.standard_gravity_m_s2!==9.80665) throw new Error('Only calm vertical sea-level ISA fixture supported')
  positive(e.launch_rod_length_m,'rail'); positive(e.simulation_time_step_s,'time step')
  if (motorText !== null) {
    const lines=motorText.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith(';'))
    const header=lines.shift().split(/\s+/)
    if(header[0]!==motor.designation) throw new Error('Motor designation mismatch')
    equal(Number(header[4]),motor.propellant_mass_kg,'motor file propellant')
    equal(Number(header[5]),mass.motor_initial_mass_kg,'motor file mass')
    const points=[{t:0,thrust_N:0},...lines.map(x=>{const [t,thrust_N]=x.split(/\s+/).map(Number);return {t,thrust_N}})]
    if(points.length!==curve.length) throw new Error('Motor curve point count mismatch')
    for(let i=0;i<points.length;i++) { equal(points[i].t,curve[i].t,'motor curve time'); equal(points[i].thrust_N,curve[i].thrust_N,'motor curve thrust') }
  }
  return m
}

if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const [command,...args]=process.argv.slice(2)
  if(command==='asset') verifyFileSha256(...args)
  else if(command==='manifest') validateManifest(JSON.parse(fs.readFileSync(args[0])),fs.readFileSync(args[1],'utf8'))
  else throw new Error('Unknown guard command')
}
