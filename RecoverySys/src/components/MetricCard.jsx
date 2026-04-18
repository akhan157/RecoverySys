import React from 'react'

// Shared metric card used by the SIMULATION tab's data grid.
// `status` drives the border/text color of the inline statusLabel chip:
// 'ok' = green, 'marginal' = amber, 'fail' = red.
export default function MetricCard({ label, value, unit, warn, status, statusLabel }) {
  const chipColor =
    status === 'ok'       ? 'var(--mc-green)' :
    status === 'marginal' ? 'var(--mc-amber)' :
    'var(--mc-red)'
  return (
    <div className="mc-sim__data-card">
      <div className="mc-metric__label">{label}</div>
      <div className="mc-metric__value" style={{ fontSize: 22 }}>
        {value}
        {unit && <span className="mc-metric__unit">{unit}</span>}
        {statusLabel && (
          <span style={{
            fontSize: 10,
            marginLeft: 8,
            padding: '1px 6px',
            border: `1px solid ${chipColor}`,
            color: chipColor,
            verticalAlign: 'middle',
          }}>
            {statusLabel}
          </span>
        )}
      </div>
      {warn && (
        <div style={{ fontSize: 9, color: 'var(--mc-amber)', marginTop: 2, letterSpacing: '0.04em' }}>
          ABOVE_NOMINAL_THRESHOLD
        </div>
      )}
    </div>
  )
}
