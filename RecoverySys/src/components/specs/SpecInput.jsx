import React, { useState, useRef, useEffect } from 'react'

// Generic numeric input used across all rocket spec rows.
// `error` + `errorText` drive inline validation UI (e.g. "Below 12G NAR minimum").
// `help` — optional plain-English tooltip shown on hover/click of a "?" icon.
export default function SpecInput({
  label, id, value, unit, placeholder, onChange,
  min = 0, max, error = false, errorText, help,
}) {
  const restingBorder = error ? 'var(--error-fg)' : 'var(--border-default)'
  const [showHelp, setShowHelp] = useState(false)
  const hoverTimer = useRef(null)
  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label htmlFor={id} style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
        {label}
        {help && (
          <span
            style={{ position: 'relative', display: 'inline-flex', marginLeft: 4 }}
            onMouseEnter={() => { hoverTimer.current = setTimeout(() => setShowHelp(true), 200) }}
            onMouseLeave={() => { clearTimeout(hoverTimer.current); setShowHelp(false) }}
            onClick={() => setShowHelp(v => !v)}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 14, height: 14, borderRadius: '50%',
              border: '1px solid var(--text-tertiary)', color: 'var(--text-tertiary)',
              fontSize: 9, fontWeight: 700, cursor: 'help', userSelect: 'none',
            }}>?</span>
            {showHelp && (
              <span style={{
                position: 'absolute', left: '-8px', top: '100%', marginTop: 6,
                background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
                borderRadius: 4, padding: '7px 10px', fontSize: 11,
                color: 'var(--text-secondary)', width: 300, whiteSpace: 'normal',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)', zIndex: 100, lineHeight: 1.5,
              }}>{help}</span>
            )}
          </span>
        )}
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
