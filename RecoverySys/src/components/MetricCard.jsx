import StatusChip from './primitives/StatusChip.jsx'

// Shared metric card used by the SIMULATION tab's data grid.
// `status`/`statusLabel` drive the StatusChip rendered next to the value
// ('ok' = green, 'marginal' = amber, 'fail' = red). Callers pass the
// canonical criterion presentation; the card never invents its own
// threshold vocabulary.
export default function MetricCard({ label, value, unit, status, statusLabel }) {
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
    </div>
  )
}
