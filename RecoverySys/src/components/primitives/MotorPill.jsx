import React from 'react'

/**
 * "Selected motor" pill — green-tinted bordered chip with the motor's
 * designation in bold mono + a meta string + a × clear button.
 *
 * Pass 2 found this pattern duplicated near-byte-for-byte in MotorSearch
 * (selected ThrustCurve motor) and CustomMotorImport (selected .eng-imported
 * custom motor). One primitive — both consumers render the same chrome.
 */
export default function MotorPill({ designation, meta, onClear, clearTitle = 'Clear motor selection' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 8px',
        background: 'var(--ok-bg, rgba(74,222,128,0.08))',
        border: '1px solid var(--ok-fg, #4ade80)',
        borderRadius: 'var(--radius)',
      }}
    >
      <span style={{ fontSize: '12px' }}>
        <span className="mono" style={{ color: 'var(--ok-fg, #4ade80)', fontWeight: 700 }}>
          {designation}
        </span>
        {meta && (
          <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>
            {meta}
          </span>
        )}
      </span>
      <button
        onClick={onClear}
        title={clearTitle}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-tertiary)',
          fontSize: '15px',
          padding: '0 2px',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  )
}
