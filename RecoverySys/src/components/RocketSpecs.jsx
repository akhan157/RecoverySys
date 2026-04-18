import React from 'react'
import SpecInput from './specs/SpecInput.jsx'
import MotorSearch from './specs/MotorSearch.jsx'
import CustomMotorImport from './specs/CustomMotorImport.jsx'

// Auto G-factor: 20G for L1/L2 (<10 kg), 30G for L3 (≥10 kg). Matches NAR/TRA guidelines.
function autoGFactor(mass_g) {
  const mass_kg = parseFloat(mass_g)
  if (!mass_kg || mass_kg <= 0) return 20
  return mass_kg >= 10000 ? 30 : 20
}

export default function RocketSpecs({
  specs, onSetSpec,
  customMotor, onSetCustomMotor, onClearCustomMotor, onToast,
}) {
  const gAuto = autoGFactor(specs.rocket_mass_g)
  // Use !== '' (not truthy check) so the string '0' is treated as user-entered,
  // not silently replaced with gAuto (which would suppress the "Below 12G" NAR warning).
  const gDisplay = (specs.ejection_g_factor != null && specs.ejection_g_factor !== '')
    ? parseFloat(specs.ejection_g_factor)
    : gAuto
  const gIsLow = gDisplay < 12   // below NAR minimum

  // Bay volume — computed from airframe ID + bay length; obstructions subtracted for usable
  const airframe_id     = parseFloat(specs.airframe_id_in)
  const bay_length      = parseFloat(specs.bay_length_in)
  const obstruction_vol = parseFloat(specs.bay_obstruction_vol_in3) || 0
  const bayVolume = (airframe_id > 0 && bay_length > 0)
    ? Math.PI * Math.pow(airframe_id / 2, 2) * bay_length
    : null
  const usableVolume = bayVolume != null ? Math.max(0, bayVolume - obstruction_vol) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="section-label">Rocket Specs — optional, improves sim accuracy</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <SpecInput
          id="mass"
          label="Rocket Mass"
          value={specs.rocket_mass_g}
          unit="g"
          placeholder="e.g. 2500"
          onChange={v => onSetSpec('rocket_mass_g', v)}
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

        <SpecInput id="impulse"   label="Motor Impulse" value={specs.motor_total_impulse_ns} unit="Ns"  placeholder="e.g. 640" onChange={v => onSetSpec('motor_total_impulse_ns', v)} />
        <SpecInput id="burn"      label="Burn Time"     value={specs.burn_time_s}            unit="s"   placeholder="e.g. 1.8" onChange={v => onSetSpec('burn_time_s', v)} />
        <SpecInput id="airframe-id" label="Airframe ID" value={specs.airframe_id_in}         unit="in"  placeholder="e.g. 3.9" onChange={v => onSetSpec('airframe_id_in', v)} />
        <SpecInput id="bay-length"  label="Recovery Bay Length" value={specs.bay_length_in}  unit="in"  placeholder="e.g. 18"  onChange={v => onSetSpec('bay_length_in', v)} />
        <SpecInput id="bay-obstruction" label="Obstruction Volume" value={specs.bay_obstruction_vol_in3} unit="in³" placeholder="0" onChange={v => onSetSpec('bay_obstruction_vol_in3', v)} />

        {/* Bay volume readout — computed from ID + length; always shown when both are filled */}
        {bayVolume != null && (
          <div style={{
            gridColumn: '1 / -1', display: 'flex', gap: '16px', alignItems: 'center',
            padding: '6px 10px', background: 'var(--bg-right)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius)', fontSize: '11px', color: 'var(--text-tertiary)',
          }}>
            <span>Bay <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{bayVolume.toFixed(1)} in³</strong></span>
            {obstruction_vol > 0 && <>
              <span style={{ color: 'var(--border-default)' }}>–</span>
              <span>Obstructions <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{obstruction_vol.toFixed(1)} in³</strong></span>
              <span style={{ color: 'var(--border-default)' }}>=</span>
              <span>Usable <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{usableVolume.toFixed(1)} in³</strong></span>
            </>}
          </div>
        )}

        <SpecInput id="cd" label="Drag Coeff (Cd)" value={specs.drag_cd} unit="" placeholder="0.50" onChange={v => onSetSpec('drag_cd', v)} />

        {/* ── Wind Profile (multi-layer) ──────────────────────────────── */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.05em', fontWeight: 600, marginTop: '4px' }}>
            WIND PROFILE
          </div>

          {/* Surface layer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <SpecInput id="wind"              label="Surface Speed" value={specs.wind_speed_mph}       unit="mph" placeholder="e.g. 10"   onChange={v => onSetSpec('wind_speed_mph', v)} />
            <SpecInput id="wind-dir"          label="Surface Dir"   value={specs.wind_direction_deg}   unit="°"   placeholder="0=N 90=E"  onChange={v => onSetSpec('wind_direction_deg', v)} />
            <SpecInput id="wind-surface-alt"  label="Surface Alt"   value={specs.wind_surface_alt_ft}  unit="ft"  placeholder="0"         onChange={v => onSetSpec('wind_surface_alt_ft', v)} />
          </div>

          {/* Mid-altitude layer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <SpecInput id="wind-mid"     label="Mid Speed" value={specs.wind_mid_speed_mph}     unit="mph" placeholder="e.g. 15"   onChange={v => onSetSpec('wind_mid_speed_mph', v)} />
            <SpecInput id="wind-mid-dir" label="Mid Dir"   value={specs.wind_mid_direction_deg} unit="°"   placeholder="0=N"       onChange={v => onSetSpec('wind_mid_direction_deg', v)} />
            <SpecInput id="wind-mid-alt" label="Mid Alt"   value={specs.wind_mid_alt_ft}        unit="ft"  placeholder="e.g. 5000" onChange={v => onSetSpec('wind_mid_alt_ft', v)} />
          </div>

          {/* Aloft layer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <SpecInput id="wind-aloft"     label="Aloft Speed" value={specs.wind_aloft_speed_mph}     unit="mph" placeholder="e.g. 30"    onChange={v => onSetSpec('wind_aloft_speed_mph', v)} />
            <SpecInput id="wind-aloft-dir" label="Aloft Dir"   value={specs.wind_aloft_direction_deg} unit="°"   placeholder="0=N"        onChange={v => onSetSpec('wind_aloft_direction_deg', v)} />
            <SpecInput id="wind-aloft-alt" label="Aloft Alt"   value={specs.wind_aloft_alt_ft}        unit="ft"  placeholder="e.g. 15000" onChange={v => onSetSpec('wind_aloft_alt_ft', v)} />
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.3 }}>
            Enter surface wind only for basic drift. Add mid/aloft layers for wind shear modeling.
            Direction = where wind blows FROM (meteorological). Monte Carlo runs 500 iterations with ±30% speed, ±15° direction variance.
          </div>
        </div>

        <SpecInput id="launch-lat" label="Launch Lat"     value={specs.launch_lat}         unit=""  placeholder="e.g. 42.3601"  onChange={v => onSetSpec('launch_lat', v)} />
        <SpecInput id="launch-lon" label="Launch Lon"     value={specs.launch_lon}         unit=""  placeholder="e.g. -71.0589" onChange={v => onSetSpec('launch_lon', v)} />
        <SpecInput id="deploy"     label="Main Deploy Alt" value={specs.main_deploy_alt_ft} unit="ft" placeholder="500"          onChange={v => onSetSpec('main_deploy_alt_ft', v)} />
        <SpecInput
          id="g-factor"
          label="Ejection G-Factor"
          value={specs.ejection_g_factor}
          unit="G"
          placeholder={`auto (${gAuto}G)`}
          onChange={v => onSetSpec('ejection_g_factor', v)}
          min={1}
          max={100}
          error={gIsLow}
          errorText="Below 12G NAR minimum"
        />
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
        {specs.burn_time_s
          ? `Apogee via powered+coast integration with ISA atmosphere (±10–15%). Cd ${specs.drag_cd || '0.50'}, Isp 195s.`
          : 'Enter burn time for ±10–15% apogee accuracy. Without it, fallback heuristic gives ±30%.'}
      </p>
      <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.4, marginTop: '-4px' }}>
        Cd: blank = 0.50 (typical HPR). G-Factor: blank = auto (20G L1/L2, 30G L3 ≥10 kg). BP charges typically 20–30G; CO2/Tender Descender 8–12G. Airframe ID: inner diameter of your airframe tube (e.g. 3.9" for a 4" tube). Bay Length: axial length of your recovery bay. Obstruction Volume: volume of avionics sleds, bulkheads, or other hardware inside the bay — subtracted to get usable packing space.
      </p>
    </div>
  )
}
