import SpecInput from './specs/SpecInput.jsx'
import MotorSearch from './specs/MotorSearch.jsx'
import CustomMotorImport from './specs/CustomMotorImport.jsx'
import SectionLabel from './primitives/SectionLabel.jsx'
import { computeEjectionCharge } from '../lib/recoveryLoad.js'
// Auto G-factor: 20G for L1/L2 (<10 kg), 30G for L3 (≥10 kg). Matches NAR/TRA guidelines.
function autoGFactor(mass_g) {
  const mass_kg = parseFloat(mass_g)
  if (!mass_kg || mass_kg <= 0) return 20
  return mass_kg >= 10000 ? 30 : 20
}

export default function RocketSpecs({
  specs,
  onSetSpec,
  customMotor,
  onSetCustomMotor,
  onClearCustomMotor,
  onToast,
}) {
  const gAuto = autoGFactor(specs.rocket_mass_g)
  const gDisplay =
    specs.ejection_g_factor != null && specs.ejection_g_factor !== ''
      ? parseFloat(specs.ejection_g_factor)
      : gAuto
  const gIsLow = gDisplay < 12 // below NAR minimum

  // Bay volume & ejection charges
  const airframe_id = parseFloat(specs.airframe_id_in)
  const bay_length = parseFloat(specs.bay_length_in)
  const obstruction_vol = parseFloat(specs.bay_obstruction_vol_in3) || 0
  const coupler_shoulder = parseFloat(specs.coupler_shoulder_in) || 0
  const main_usable_length = Math.max(0, bay_length - coupler_shoulder)
  const bayArea = airframe_id > 0 ? Math.PI * Math.pow(airframe_id / 2, 2) : 0
  const bayVolume = bayArea > 0 && bay_length > 0 ? bayArea * bay_length : null
  const usableVolume =
    bayArea > 0 && main_usable_length > 0
      ? Math.max(0, bayArea * main_usable_length - obstruction_vol)
      : null

  const mainCharge = computeEjectionCharge({
    compartment_vol_in3: usableVolume,
    airframe_id_in: airframe_id,
    shear_pins_count: specs.shear_pins_main,
  })

  const drogue_bay_length = parseFloat(specs.drogue_bay_length_in) || 0
  const drogue_id = parseFloat(specs.drogue_airframe_id_in) || airframe_id
  const drogue_area = drogue_id > 0 ? Math.PI * Math.pow(drogue_id / 2, 2) : 0
  const drogue_usable_len = Math.max(0, drogue_bay_length - coupler_shoulder)
  const drogue_vol =
    drogue_area > 0 && drogue_usable_len > 0 ? drogue_area * drogue_usable_len : null

  const drogueCharge = computeEjectionCharge({
    compartment_vol_in3: drogue_vol,
    airframe_id_in: drogue_id,
    shear_pins_count: specs.shear_pins_drogue,
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="section-label">Rocket Specs — Vehicle & Recovery Configuration</div>

      {/* ── Vehicle & Motor ────────────────────────────────────────── */}
      <SectionLabel>VEHICLE & MOTOR</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <SpecInput
          id="mass"
          label="Rocket Mass"
          value={specs.rocket_mass_g}
          unit="g"
          placeholder="e.g. 2500"
          onChange={(v) => onSetSpec('rocket_mass_g', v)}
          help="Total liftoff weight including motor, recovery hardware, and airframe"
        />

        {/* Custom motor (.eng import) — preferred over search for HPR custom motors */}
        <CustomMotorImport
          customMotor={customMotor}
          onSetCustomMotor={onSetCustomMotor}
          onClearCustomMotor={onClearCustomMotor}
          onToast={onToast}
        />

        {/* ThrustCurve.org search — for commercial motors */}
        <MotorSearch onSetSpec={onSetSpec} />

        <SpecInput
          id="impulse"
          label="Motor Impulse"
          value={specs.motor_total_impulse_ns}
          unit="Ns"
          placeholder="e.g. 640"
          onChange={(v) => onSetSpec('motor_total_impulse_ns', v)}
          help="Total impulse in Newton-seconds — from motor data sheet or ThrustCurve.org"
        />
        <SpecInput
          id="burn"
          label="Burn Time"
          value={specs.burn_time_s}
          unit="s"
          placeholder="e.g. 1.8"
          onChange={(v) => onSetSpec('burn_time_s', v)}
          help="Motor burn duration in seconds — from motor data. Enables accurate apogee prediction."
        />
        <SpecInput
          id="cd"
          label="Drag Coeff (Cd)"
          value={specs.drag_cd}
          unit=""
          placeholder="0.50"
          onChange={(v) => onSetSpec('drag_cd', v)}
          help="Subsonic drag coefficient — typically 0.4-0.6 for HPR rockets. Sim adjusts for transonic effects automatically."
        />
      </div>

      {/* ── Recovery Bay & Deployment ────────────────────────────────── */}
      <SectionLabel style={{ marginTop: '6px' }}>RECOVERY COMPARTMENTS & DEPLOYMENT</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <SpecInput
          id="airframe-id"
          label="Main Airframe ID"
          value={specs.airframe_id_in}
          unit="in"
          placeholder="e.g. 3.9"
          onChange={(v) => onSetSpec('airframe_id_in', v)}
          help="Inner diameter of the forward main recovery bay tube"
        />
        <SpecInput
          id="bay-length"
          label="Main Bay Length"
          value={specs.bay_length_in}
          unit="in"
          placeholder="e.g. 18"
          onChange={(v) => onSetSpec('bay_length_in', v)}
          help="Axial length of the forward main recovery bay tube"
        />
        <SpecInput
          id="bay-obstruction"
          label="Obstruction Volume"
          value={specs.bay_obstruction_vol_in3}
          unit="in³"
          placeholder="0"
          onChange={(v) => onSetSpec('bay_obstruction_vol_in3', v)}
          help="Volume of avionics sleds, hardpoints, or wiring inside the bay that reduce packing space"
        />
        <SpecInput
          id="shear-pins-main"
          label="Main Shear Pins"
          value={specs.shear_pins_main}
          unit="pins"
          placeholder="0 (friction fit)"
          onChange={(v) => onSetSpec('shear_pins_main', v)}
          help="Number of 2-56 or 4-40 nylon shear pins retaining the nosecone joint"
        />
        <SpecInput
          id="coupler-shoulder"
          label="Coupler Shoulder Inset"
          value={specs.coupler_shoulder_in}
          unit="in"
          placeholder="0"
          onChange={(v) => onSetSpec('coupler_shoulder_in', v)}
          help="Axial depth that the avionics coupler shoulder slides into the tube"
        />
        <SpecInput
          id="drogue-bay-length"
          label="Drogue Bay Length (optional)"
          value={specs.drogue_bay_length_in}
          unit="in"
          placeholder="Leave blank if single bay"
          onChange={(v) => onSetSpec('drogue_bay_length_in', v)}
          help="Length of separate aft drogue compartment for dual-bay rockets"
        />
        <SpecInput
          id="drogue-airframe-id"
          label="Drogue Airframe ID"
          value={specs.drogue_airframe_id_in}
          unit="in"
          placeholder="Defaults to Main ID"
          onChange={(v) => onSetSpec('drogue_airframe_id_in', v)}
          help="Inner diameter of the aft drogue compartment (blank = same as Main)"
        />
        <SpecInput
          id="shear-pins-drogue"
          label="Drogue Shear Pins"
          value={specs.shear_pins_drogue}
          unit="pins"
          placeholder="0"
          onChange={(v) => onSetSpec('shear_pins_drogue', v)}
          help="Number of nylon shear pins retaining the booster/drogue separation joint"
        />
        <SpecInput
          id="deploy"
          label="Main Deploy Alt"
          value={specs.main_deploy_alt_ft}
          unit="ft"
          placeholder="500"
          onChange={(v) => onSetSpec('main_deploy_alt_ft', v)}
          help="Altitude for main chute deployment — typically 500-1000 ft AGL. Lower = less drift, higher = more margin for inflation."
        />
        <SpecInput
          id="g-factor"
          label="Ejection G-Factor"
          value={specs.ejection_g_factor}
          unit="G"
          placeholder={`auto (${gAuto}G)`}
          onChange={(v) => onSetSpec('ejection_g_factor', v)}
          min={1}
          max={100}
          error={gIsLow}
          errorText="Below 12G NAR minimum"
          help="Peak G-force at ejection — leave blank for auto (20G L1/L2, 30G L3). BP charges: 20-30G. CO2/Tender Descender: 8-12G."
        />
      </div>

      {/* Compartment volume & ejection charge readout */}
      {(bayVolume != null || drogue_vol != null) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px 12px',
            background: 'var(--bg-right)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius)',
            fontSize: '11px',
            color: 'var(--text-tertiary)',
          }}
        >
          {bayVolume != null && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span>
                Main Bay Usable:{' '}
                <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
                  {usableVolume?.toFixed(1) || '—'} in³
                </strong>
              </span>
              {mainCharge && (
                <span>
                  Main Ejection Charge:{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {mainCharge.charge_grams}g FFFFg
                  </strong>{' '}
                  ({mainCharge.target_psi} PSI · {mainCharge.separation_force_lbf} lbf)
                </span>
              )}
            </div>
          )}
          {drogue_vol != null && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '6px',
              }}
            >
              <span>
                Drogue Bay Usable:{' '}
                <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
                  {drogue_vol.toFixed(1)} in³
                </strong>
              </span>
              {drogueCharge && (
                <span>
                  Drogue Ejection Charge:{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {drogueCharge.charge_grams}g FFFFg
                  </strong>{' '}
                  ({drogueCharge.target_psi} PSI · {drogueCharge.separation_force_lbf} lbf)
                </span>
              )}
            </div>
          )}
          {(mainCharge?.warning || drogueCharge?.warning) && (
            <div
              style={{
                color: 'var(--accent-red, #ff5555)',
                fontSize: '11px',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '6px',
              }}
            >
              {mainCharge?.warning && <div>⚠ Main: {mainCharge.warning}</div>}
              {drogueCharge?.warning && <div>⚠ Drogue: {drogueCharge.warning}</div>}
            </div>
          )}
        </div>
      )}

      {/* ── Wind Profile (multi-layer) ──────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SectionLabel style={{ marginTop: '6px' }}>WIND PROFILE (MULTI-LAYER)</SectionLabel>

        {/* Surface layer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <SpecInput
            id="wind"
            label="Surface Speed"
            value={specs.wind_speed_mph}
            unit="mph"
            placeholder="e.g. 10"
            onChange={(v) => onSetSpec('wind_speed_mph', v)}
            help="Surface wind speed in mph"
          />
          <SpecInput
            id="wind-dir"
            label="Surface Dir"
            value={specs.wind_direction_deg}
            unit="°"
            placeholder="0=N 90=E"
            onChange={(v) => onSetSpec('wind_direction_deg', v)}
            help="Direction wind blows FROM — 0=N, 90=E, 180=S, 270=W (meteorological convention)"
          />
          <SpecInput
            id="wind-surface-alt"
            label="Surface Alt"
            value={specs.wind_surface_alt_ft}
            unit="ft"
            placeholder="0"
            onChange={(v) => onSetSpec('wind_surface_alt_ft', v)}
          />
        </div>

        {/* Mid-altitude layer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <SpecInput
            id="wind-mid"
            label="Mid Speed"
            value={specs.wind_mid_speed_mph}
            unit="mph"
            placeholder="e.g. 15"
            onChange={(v) => onSetSpec('wind_mid_speed_mph', v)}
          />
          <SpecInput
            id="wind-mid-dir"
            label="Mid Dir"
            value={specs.wind_mid_direction_deg}
            unit="°"
            placeholder="0=N"
            onChange={(v) => onSetSpec('wind_mid_direction_deg', v)}
          />
          <SpecInput
            id="wind-mid-alt"
            label="Mid Alt"
            value={specs.wind_mid_alt_ft}
            unit="ft"
            placeholder="e.g. 5000"
            onChange={(v) => onSetSpec('wind_mid_alt_ft', v)}
          />
        </div>

        {/* Aloft layer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <SpecInput
            id="wind-aloft"
            label="Aloft Speed"
            value={specs.wind_aloft_speed_mph}
            unit="mph"
            placeholder="e.g. 30"
            onChange={(v) => onSetSpec('wind_aloft_speed_mph', v)}
          />
          <SpecInput
            id="wind-aloft-dir"
            label="Aloft Dir"
            value={specs.wind_aloft_direction_deg}
            unit="°"
            placeholder="0=N"
            onChange={(v) => onSetSpec('wind_aloft_direction_deg', v)}
          />
          <SpecInput
            id="wind-aloft-alt"
            label="Aloft Alt"
            value={specs.wind_aloft_alt_ft}
            unit="ft"
            placeholder="e.g. 15000"
            onChange={(v) => onSetSpec('wind_aloft_alt_ft', v)}
          />
        </div>

        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
          Enter surface wind only for basic drift. Add mid/aloft layers for wind shear modeling.
          Direction = where wind blows FROM (meteorological). Monte Carlo runs 500 iterations with
          ±30% speed, ±15° direction variance.
        </div>
      </div>

      {/* ── Launch Site Location ────────────────────────────────────── */}
      <SectionLabel style={{ marginTop: '6px' }}>LAUNCH SITE LOCATION</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <SpecInput
          id="launch-lat"
          label="Launch Lat"
          value={specs.launch_lat}
          unit=""
          placeholder="e.g. 42.3601"
          onChange={(v) => onSetSpec('launch_lat', v)}
          help="Launch site latitude in decimal degrees — enables drift map and Monte Carlo dispersion"
        />
        <SpecInput
          id="launch-lon"
          label="Launch Lon"
          value={specs.launch_lon}
          unit=""
          placeholder="e.g. -71.0589"
          onChange={(v) => onSetSpec('launch_lon', v)}
          help="Launch site longitude in decimal degrees"
        />
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
        {specs.burn_time_s
          ? `Apogee via powered+coast integration with ISA atmosphere (±10–15%). Cd ${specs.drag_cd || '0.50'}, Isp 195s.`
          : 'Enter burn time for ±10–15% apogee accuracy. Without it, fallback heuristic gives ±30%.'}
      </p>
      <p
        style={{
          fontSize: '10px',
          color: 'var(--text-tertiary)',
          lineHeight: 1.4,
          marginTop: '-4px',
        }}
      >
        Cd: blank = 0.50 (typical HPR). G-Factor: blank = auto (20G L1/L2, 30G L3 ≥10 kg). BP
        charges typically 20–30G; CO2/Tender Descender 8–12G. Airframe ID: inner diameter of your
        airframe tube (e.g. 3.9" for a 4" tube). Bay Length: axial length of your recovery bay.
        Obstruction Volume: volume of avionics sleds, bulkheads, or other hardware inside the bay —
        subtracted to get usable packing space.
      </p>
    </div>
  )
}
