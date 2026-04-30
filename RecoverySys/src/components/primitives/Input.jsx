import React from 'react'

/**
 * Token-styled input primitive — JetBrains Mono, 13px, 1px slate border,
 * focus ring via inline `boxShadow`, 0 border-radius (matches DESIGN.md
 * "data-entry elements stay sharp" rule).
 *
 * Pass 2 found 5 separate `inputStyle` constants across the codebase
 * (MotorSearch, FlightLogTab, SuggestPanel, PartsBrowser custom-form,
 * SpecInput) re-declaring the same shape. This primitive consolidates them.
 *
 * SpecInput already wraps inputs with label + unit + help; it can adopt
 * this primitive as its inner element in a follow-up. For now the easy
 * sites are the bare `<input style={inputStyle}>` blocks elsewhere.
 *
 * Props:
 *   - `invalid`  — boolean, paints the resting border red
 *                  (var(--error-fg)) for inline validation errors
 *   - `mono`     — boolean (default true). Set false for free-form text
 *                  inputs that aren't physical-quantity values
 *
 * Native attributes (type, value, onChange, placeholder, min/max/step)
 * pass through. Focus/blur handlers are managed internally — overriding
 * onFocus/onBlur via props composes with the primitive's behavior.
 */
export default function Input({
  invalid = false,
  mono = true,
  style,
  onFocus,
  onBlur,
  ...rest
}) {
  const restingBorder = invalid ? 'var(--error-fg)' : 'var(--border-default)'

  const handleFocus = (e) => {
    e.target.style.borderColor = 'var(--accent)'
    e.target.style.boxShadow = '0 0 0 3px var(--accent-ring)'
    onFocus?.(e)
  }
  const handleBlur = (e) => {
    e.target.style.borderColor = restingBorder
    e.target.style.boxShadow = ''
    onBlur?.(e)
  }

  return (
    <input
      {...rest}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{
        fontFamily: mono ? "'JetBrains Mono', ui-monospace, monospace" : 'inherit',
        fontWeight: mono ? 600 : 400,
        fontSize: '13px',
        color: invalid ? 'var(--error-fg)' : 'var(--text-primary)',
        border: `1px solid ${restingBorder}`,
        borderRadius: 0,
        padding: '5px 7px',
        width: '100%',
        outline: 'none',
        background: 'var(--input-bg)',
        boxSizing: 'border-box',
        transition: 'border-color 0.18s ease',
        ...style,
      }}
    />
  )
}
