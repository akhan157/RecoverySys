import React from 'react'
import { statusColor } from '../../lib/statusColor.js'

/**
 * Bordered status chip — small uppercase label with colored 1px border + text.
 * Used inside metric cards, status bars, and table cells to flag PASS/WARN/FAIL
 * at a glance.
 *
 * Pass 2 found this pattern inlined in MetricCard (chip with chipColor border).
 * Wrapping it in a primitive lets the SF block in MissionControlLayout's status
 * bar adopt the same exact treatment instead of its current ad-hoc colored span,
 * which is one less inconsistency in the design system.
 *
 * API:
 *   <StatusChip status="ok"  label="PASS" />
 *   <StatusChip status="warn" label="MARGINAL" />
 *   <StatusChip status="error" label="FAIL" />
 *
 * status accepts both naming families ('ok'|'warn'|'error'|'neutral' AND
 * 'ok'|'marginal'|'fail') via statusColor.
 */
export default function StatusChip({ status, label, style }) {
  const color = statusColor(status)
  return (
    <span
      style={{
        fontSize: 10,
        padding: '1px 6px',
        border: `1px solid ${color}`,
        color,
        verticalAlign: 'middle',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        ...style,
      }}
    >
      {label}
    </span>
  )
}
