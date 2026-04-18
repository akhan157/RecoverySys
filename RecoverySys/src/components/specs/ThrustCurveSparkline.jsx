import React from 'react'

// Mini SVG sparkline of the thrust curve — no external dependency.
// Renders the (t, thrust_N) samples at full width, normalized to the peak.
export default function ThrustCurveSparkline({ curve, peak }) {
  const W = 260, H = 40, PAD = 2
  const tMax = curve[curve.length - 1].t
  const points = curve.map(p => {
    const x = PAD + (p.t / tMax) * (W - 2 * PAD)
    const y = H - PAD - (p.thrust_N / peak) * (H - 2 * PAD)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <rect x="0" y="0" width={W} height={H} fill="var(--bg-app)" stroke="var(--border-subtle)" />
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
    </svg>
  )
}
