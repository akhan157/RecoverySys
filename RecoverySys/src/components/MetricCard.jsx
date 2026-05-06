import React from 'react'
import StatusChip from './primitives/StatusChip.jsx'

// Shared metric card used by the SIMULATION tab's data grid.
// `status` drives the StatusChip rendered next to the value:
// 'ok' = green, 'marginal' = amber, 'fail' = red.
export default function MetricCard({ label, value, unit, warn, status, statusLabel }) {
  return (
    <div className="mc-sim__data-card">
      <div className="mc-metric__label">{label}</div>
      <div className="mc-metric__value mc-metric__value--compact">
        {value}
        {unit && <span className="mc-metric__unit">{unit}</span>}
        {statusLabel && (
          <StatusChip status={status} label={statusLabel} style={{ marginLeft: 8 }} />
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
