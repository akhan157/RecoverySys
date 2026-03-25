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
          id="airframe"
          label="Airframe OD"
          value={specs.airframe_od_in}
          unit="in"
          placeholder="e.g. 4"
          onChange={v => onSetSpec('airframe_od_in', v)}
        />
        <SpecInput
          id="airframe-id"
          label="Airframe Inner Dia."
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
          label="Bay Obstructions"
          value={specs.bay_obstruction_in}
          unit="in"
          placeholder="0"
          onChange={v => onSetSpec('bay_obstruction_in', v)}
        />
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
        Cd: blank = 0.50 (typical HPR). G-Factor: blank = auto (20G L1/L2, 30G L3 ≥10 kg). BP charges typically 20–30G; CO2/Tender Descender 8–12G. Bay Obstructions: inches occupied by hardpoints, avionics sleds, or other hardware not part of the recovery stack.
      </p>
    </div>
  )
}
