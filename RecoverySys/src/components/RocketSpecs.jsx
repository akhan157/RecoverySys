import React from 'react'

function SpecInput({ label, id, value, unit, placeholder, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label htmlFor={id} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          id={id}
          type="number"
          min="0"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 0,
            padding: '5px 7px',
            width: '100%',
            outline: 'none',
            background: 'var(--input-bg)',
            transition: 'border-color 0.18s ease',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = '' }}
        />
        {unit && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{unit}</span>
        )}
      </div>
    </div>
  )
}

// Auto G-factor: 20G for L1/L2 (<10 kg), 30G for L3 (≥10 kg). Matches NAR/TRA guidelines.
function autoGFactor(mass_g) {
  const mass_kg = parseFloat(mass_g)
  if (!mass_kg || mass_kg <= 0) return 20
  return mass_kg >= 10000 ? 30 : 20
}

export default function RocketSpecs({ specs, onSetSpec }) {
  const gAuto    = autoGFactor(specs.rocket_mass_g)
  const gDisplay = specs.ejection_g_factor ? parseFloat(specs.ejection_g_factor) : gAuto
  const gIsLow   = gDisplay < 12   // below NAR minimum

  // Bay volume — computed from airframe ID + bay length; obstructions subtracted for usable
  const airframe_id     = parseFloat(specs.airframe_id_in)
  const bay_length      = parseFloat(specs.bay_length_in)
  const obstruction_vol = parseFloat(specs.bay_obstruction_vol_in3) || 0
  const bayVolume       = (airframe_id > 0 && bay_length > 0)
    ? Math.PI * Math.pow(airframe_id / 2, 2) * bay_length
    : null
  const usableVolume    = bayVolume != null ? Math.max(0, bayVolume - obstruction_vol) : null

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
        <SpecInput
          id="impulse"
          label="Motor Impulse"
          value={specs.motor_total_impulse_ns}
          unit="Ns"
          placeholder="e.g. 640"
          onChange={v => onSetSpec('motor_total_impulse_ns', v)}
        />
        <SpecInput
          id="burn"
          label="Burn Time"
          value={specs.burn_time_s}
          unit="s"
          placeholder="e.g. 1.8"
          onChange={v => onSetSpec('burn_time_s', v)}
        />
        <SpecInput
          id="airframe-id"
          label="Airframe ID"
          value={specs.airframe_id_in}
          unit="in"
          placeholder="e.g. 3.9"
          onChange={v => onSetSpec('airframe_id_in', v)}
        />
        <SpecInput
          id="bay-length"
          label="Recovery Bay Length"
          value={specs.bay_length_in}
          unit="in"
          placeholder="e.g. 18"
          onChange={v => onSetSpec('bay_length_in', v)}
        />
        <SpecInput
          id="bay-obstruction"
          label="Obstruction Volume"
          value={specs.bay_obstruction_vol_in3}
          unit="in³"
          placeholder="0"
          onChange={v => onSetSpec('bay_obstruction_vol_in3', v)}
        />

        {/* Bay volume readout — computed from ID + length; always shown when both are filled */}
        {bayVolume != null && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', alignItems: 'center',
            padding: '6px 10px', background: 'var(--bg-right)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            <span>Bay <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{bayVolume.toFixed(1)} in³</strong></span>
            {obstruction_vol > 0 && <>
              <span style={{ color: 'var(--border-default)' }}>–</span>
              <span>Obstructions <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{obstruction_vol.toFixed(1)} in³</strong></span>
              <span style={{ color: 'var(--border-default)' }}>=</span>
              <span>Usable <strong style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{usableVolume.toFixed(1)} in³</strong></span>
            </>}
          </div>
        )}

        <SpecInput
          id="cd"
          label="Drag Coeff (Cd)"
          value={specs.drag_cd}
          unit=""
          placeholder="0.50"
          onChange={v => onSetSpec('drag_cd', v)}
        />
        <SpecInput
          id="wind"
          label="Wind Speed"
          value={specs.wind_speed_mph}
          unit="mph"
          placeholder="e.g. 10"
          onChange={v => onSetSpec('wind_speed_mph', v)}
        />
        <SpecInput
          id="deploy"
          label="Main Deploy Alt"
          value={specs.main_deploy_alt_ft}
          unit="ft"
          placeholder="500"
          onChange={v => onSetSpec('main_deploy_alt_ft', v)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="g-factor" style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            Ejection G-Factor
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              id="g-factor"
              type="number"
              min="1"
              max="100"
              value={specs.ejection_g_factor}
              placeholder={`auto (${gAuto}G)`}
              onChange={e => onSetSpec('ejection_g_factor', e.target.value)}
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontWeight: 600,
                fontSize: '13px',
                color: gIsLow ? 'var(--error-fg)' : 'var(--text-primary)',
                border: `1px solid ${gIsLow ? 'var(--error-fg)' : 'var(--border-default)'}`,
                borderRadius: 0,
                padding: '5px 7px',
                width: '100%',
                outline: 'none',
                background: 'var(--input-bg)',
                transition: 'border-color 0.18s ease',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
              onBlur={e => { e.target.style.borderColor = gIsLow ? 'var(--error-fg)' : 'var(--border-default)'; e.target.style.boxShadow = '' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>G</span>
          </div>
          {gIsLow && (
            <span style={{ fontSize: '10px', color: 'var(--error-fg)', lineHeight: 1.3 }}>
              Below 12G NAR minimum
            </span>
          )}
        </div>
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
