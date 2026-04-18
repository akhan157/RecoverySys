import React from 'react'

// Generic numeric input used across all rocket spec rows.
// `error` + `errorText` drive inline validation UI (e.g. "Below 12G NAR minimum").
export default function SpecInput({
  label, id, value, unit, placeholder, onChange,
  min = 0, max, error = false, errorText,
}) {
  const restingBorder = error ? 'var(--error-fg)' : 'var(--border-default)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label htmlFor={id} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontWeight: 600,
            fontSize: '13px',
            color: error ? 'var(--error-fg)' : 'var(--text-primary)',
            border: `1px solid ${restingBorder}`,
            borderRadius: 0,
            padding: '5px 7px',
            width: '100%',
            outline: 'none',
            background: 'var(--input-bg)',
            transition: 'border-color 0.18s ease',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)' }}
          onBlur={e => { e.target.style.borderColor = restingBorder; e.target.style.boxShadow = '' }}
        />
        {unit && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{unit}</span>
        )}
      </div>
      {error && errorText && (
        <span style={{ fontSize: '10px', color: 'var(--error-fg)', lineHeight: 1.3 }}>{errorText}</span>
      )}
    </div>
  )
}
