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
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--text-primary)',
            border: '1px solid #ccc',
            borderRadius: 0,
            padding: '5px 7px',
            width: '100%',
            outline: 'none',
            background: '#fff',
          }}
          onFocus={e => e.target.style.borderColor = '#1a1a1a'}
          onBlur={e => e.target.style.borderColor = '#ccc'}
        />
        {unit && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{unit}</span>
        )}
      </div>
    </div>
  )
}

export default function RocketSpecs({ specs, onSetSpec }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="section-label">Rocket Specs</div>
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
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
        {specs.burn_time_s
          ? `Apogee via powered+coast integration with ISA atmosphere (±10–15%). Cd ${specs.drag_cd || '0.50'}, Isp 195s.`
          : 'Enter burn time for ±10–15% apogee accuracy. Without it, fallback heuristic gives ±30%.'}
      </p>
      <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.4, marginTop: '-4px' }}>
        Cd: leave blank for 0.50 (typical HPR kit). Use OpenRocket for your exact value.
      </p>
    </div>
  )
}
