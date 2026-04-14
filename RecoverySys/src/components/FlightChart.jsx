import React, { useRef, useEffect, useCallback } from 'react'

const W = 400
const H = 260
const PAD = { top: 28, right: 16, bottom: 36, left: 56 }
const CHART_W = W - PAD.left - PAD.right
const CHART_H = H - PAD.top  - PAD.bottom

function nice1000(val) {
  return Math.ceil(val / 1000) * 1000
}

/* ── SVG defs: single-direction diagonal hatch (matches Stitch export) ── */
function ChartDefs() {
  return (
    <defs>
      {/* Diagonal hatch for area fill — single direction, 4px, white */}
      <pattern id="osc-hatch" width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="white" strokeWidth="0.5" />
      </pattern>
      {/* Clip to chart area */}
      <clipPath id="osc-clip">
        <rect x={PAD.left} y={PAD.top} width={CHART_W} height={CHART_H} />
      </clipPath>
    </defs>
  )
}

/* ── Oscilloscope grid + axes ────────────────────────────────────────── */
function Axes({ maxAlt, maxTime }) {
  const yTicks = []
  for (let alt = 0; alt <= maxAlt; alt += 1000) yTicks.push(alt)
  if (yTicks[yTicks.length - 1] < maxAlt) yTicks.push(nice1000(maxAlt))

  const xTicks = []
  for (let t = 0; t <= maxTime; t += 5) xTicks.push(t)
  if (xTicks[xTicks.length - 1] < maxTime) xTicks.push(Math.ceil(maxTime / 5) * 5)

  const xS = t => PAD.left + (t / maxTime) * CHART_W
  const yS = a => PAD.top  + CHART_H - (a / maxAlt) * CHART_H

  /* CSS-style oscilloscope grid rendered as SVG lines at 20px intervals */
  const gridLines = []
  const gridSpacing = 12 // SVG units, maps to ~20px at rendered size
  for (let x = PAD.left; x <= PAD.left + CHART_W; x += gridSpacing) {
    gridLines.push(
      <line key={`vg${x}`} x1={x} y1={PAD.top} x2={x} y2={PAD.top + CHART_H}
        stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
    )
  }
  for (let y = PAD.top; y <= PAD.top + CHART_H; y += gridSpacing) {
    gridLines.push(
      <line key={`hg${y}`} x1={PAD.left} y1={y} x2={PAD.left + CHART_W} y2={y}
        stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
    )
  }

  return (
    <>
      {/* Oscilloscope grid */}
      {gridLines}

      {/* Y-axis labels */}
      {yTicks.filter(alt => alt > 0).map(alt => (
        <text key={`yl${alt}`} x={PAD.left - 6} y={yS(alt) + 3}
          textAnchor="end" fontSize="9" fontFamily="'Space Grotesk', 'JetBrains Mono', monospace"
          fill="rgba(255,255,255,0.4)">
          {alt >= 1000 ? `${alt / 1000}k` : alt}
        </text>
      ))}
      <text x={12} y={PAD.top + CHART_H / 2}
        textAnchor="middle" fontSize="8" fontFamily="'Space Grotesk', 'JetBrains Mono', monospace"
        fill="rgba(255,255,255,0.35)"
        transform={`rotate(-90, 12, ${PAD.top + CHART_H / 2})`}>
        ALT (ft)
      </text>

      {/* X-axis labels */}
      {xTicks.map((t, i) => {
        const step = xTicks.length > 10 ? 2 : 1
        if (i % step !== 0) return null
        return (
          <text key={`xl${t}`} x={xS(t)} y={PAD.top + CHART_H + 14}
            textAnchor="middle" fontSize="9" fontFamily="'Space Grotesk', 'JetBrains Mono', monospace"
            fill="rgba(255,255,255,0.4)">
            {t}s
          </text>
        )
      })}

      {/* Chart border — white/10 like the Stitch export */}
      <rect x={PAD.left} y={PAD.top} width={CHART_W} height={CHART_H}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
    </>
  )
}

/* ── Live readout (top-right, with white bar) ────────────────────────── */
function LiveReadout({ label, value, x, y }) {
  return (
    <g>
      <text x={x} y={y}
        textAnchor="end" fontSize="8" fontFamily="'Space Grotesk', 'JetBrains Mono', monospace"
        fill="#ffffff" fontWeight="700">
        {label}: {value}
      </text>
      <line x1={x - 30} y1={y + 4} x2={x} y2={y + 4}
        stroke="#ffffff" strokeWidth="2" />
    </g>
  )
}

export default function FlightChart({ simulation }) {
  const pathRef  = useRef(null)
  const fillRef  = useRef(null)
  const prevSim  = useRef(null)

  const buildPath = useCallback((timeline, maxAlt, maxTime) => {
    const xS = t => PAD.left + (t / maxTime) * CHART_W
    const yS = a => PAD.top  + CHART_H - (Math.max(0, a) / maxAlt) * CHART_H
    return timeline
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xS(p.t).toFixed(1)},${yS(p.alt).toFixed(1)}`)
      .join(' ')
  }, [])

  const buildFillPath = useCallback((timeline, maxAlt, maxTime) => {
    const xS = t => PAD.left + (t / maxTime) * CHART_W
    const yS = a => PAD.top  + CHART_H - (Math.max(0, a) / maxAlt) * CHART_H
    const baseline = PAD.top + CHART_H
    const points = timeline
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xS(p.t).toFixed(1)},${yS(p.alt).toFixed(1)}`)
      .join(' ')
    const last = timeline[timeline.length - 1]
    const first = timeline[0]
    return `${points} L${xS(last.t).toFixed(1)},${baseline} L${xS(first.t).toFixed(1)},${baseline} Z`
  }, [])

  // Animate path on mount / change
  useEffect(() => {
    if (!simulation || !pathRef.current) return
    const path = pathRef.current
    const len  = path.getTotalLength()
    let timerId

    if (!prevSim.current) {
      path.style.transition = 'none'
      path.style.strokeDasharray  = len
      path.style.strokeDashoffset = len
      path.style.opacity = 1
      if (fillRef.current) fillRef.current.style.opacity = 0
      requestAnimationFrame(() => {
        path.style.transition = 'stroke-dashoffset 800ms ease-out'
        path.style.strokeDashoffset = 0
        timerId = setTimeout(() => {
          if (fillRef.current) {
            fillRef.current.style.transition = 'opacity 400ms ease-in'
            fillRef.current.style.opacity = 0.3
          }
        }, 600)
      })
    } else {
      path.style.transition = 'opacity 200ms'
      path.style.opacity = 0
      if (fillRef.current) fillRef.current.style.opacity = 0
      timerId = setTimeout(() => {
        path.style.strokeDasharray  = ''
        path.style.strokeDashoffset = ''
        path.style.opacity = 1
        if (fillRef.current) fillRef.current.style.opacity = 0.3
      }, 200)
    }
    prevSim.current = simulation
    return () => clearTimeout(timerId)
  }, [simulation])

  if (!simulation) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%"
        style={{ display: 'block', background: '#0e0e0e' }}>
        <ChartDefs />
        <Axes maxAlt={5000} maxTime={120} />
        {/* Header */}
        <rect x={PAD.left} y={6} width={2} height={12} fill="rgba(255,255,255,0.5)" />
        <text x={PAD.left + 8} y={15}
          fontSize="8" fontFamily="'Space Grotesk', monospace" fill="rgba(255,255,255,0.5)"
          fontWeight="700" letterSpacing="1.5">
          FLIGHT PROFILE (FT)
        </text>
        <text x={PAD.left + CHART_W} y={15}
          textAnchor="end" fontSize="8" fontFamily="'Space Grotesk', monospace"
          fill="rgba(255,255,255,0.3)" letterSpacing="0.5">
          AWAITING DATA
        </text>
        <text x={PAD.left + CHART_W / 2} y={PAD.top + CHART_H / 2}
          textAnchor="middle" fontSize="11" fontFamily="'Space Grotesk', monospace"
          fill="rgba(255,255,255,0.25)">
          Run Simulation →
        </text>
      </svg>
    )
  }

  const { timeline, apogee_ft, deploy_ft, phase1_time_s, total_time_s, apogee_t_s, burnout_t_s } = simulation
  const maxAlt  = Math.max(1000, nice1000(apogee_ft))
  const descentTime = total_time_s ?? phase1_time_s
  const flightTime  = (apogee_t_s ?? 0) + descentTime
  const maxTime = Math.ceil((flightTime + 5) / 5) * 5

  const xS = t => PAD.left + (t / maxTime) * CHART_W
  const yS = a => PAD.top  + CHART_H - (Math.max(0, a) / maxAlt) * CHART_H

  const d = buildPath(timeline, maxAlt, maxTime)
  const fillD = buildFillPath(timeline, maxAlt, maxTime)

  // Event markers
  const events = []
  if (burnout_t_s != null && burnout_t_s > 0) events.push({ t: burnout_t_s, label: 'BURN' })
  events.push({ t: apogee_t_s ?? 0, label: 'APOG' })
  const mainPt = timeline.find(p => p.alt <= deploy_ft && p.t > (apogee_t_s ?? 0))
  if (mainPt) events.push({ t: mainPt.t, label: 'MAIN' })
  const landPt = timeline[timeline.length - 1]
  if (landPt) events.push({ t: landPt.t, label: 'LDG' })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%"
      style={{ display: 'block', background: '#0e0e0e' }}>
      <ChartDefs />

      {/* Header — left-accent bar + label + scale */}
      <rect x={PAD.left} y={6} width={2} height={12} fill="#ffffff" />
      <text x={PAD.left + 8} y={15}
        fontSize="8" fontFamily="'Space Grotesk', monospace" fill="rgba(255,255,255,0.7)"
        fontWeight="700" letterSpacing="1.5">
        FLIGHT PROFILE (FT)
      </text>
      <text x={PAD.left + CHART_W} y={15}
        textAnchor="end" fontSize="8" fontFamily="'Space Grotesk', monospace"
        fill="rgba(255,255,255,0.3)" letterSpacing="0.5">
        SCALE: 1:{(maxAlt / 100).toFixed(0)}
      </text>

      <Axes maxAlt={maxAlt} maxTime={maxTime} />

      {/* Hatched area fill under the curve — 0.3 opacity like Stitch */}
      <path
        ref={fillRef}
        d={fillD}
        fill="url(#osc-hatch)"
        clipPath="url(#osc-clip)"
        style={{ opacity: 0 }}
      />

      {/* Event marker lines */}
      {events.map(ev => (
        <g key={ev.label}>
          <line
            x1={xS(ev.t)} y1={PAD.top}
            x2={xS(ev.t)} y2={PAD.top + CHART_H}
            stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2"
          />
          <text x={xS(ev.t) + 3} y={PAD.top + 10}
            fontSize="7" fontFamily="'Space Grotesk', monospace"
            fill="rgba(255,255,255,0.35)" letterSpacing="0.5">
            {ev.label}
          </text>
        </g>
      ))}

      {/* Flight path — white, stroke-width 2 */}
      <path
        ref={pathRef}
        d={d}
        stroke="#ffffff"
        strokeWidth="2"
        fill="none"
      />

      {/* Live readout — top right of chart area with white bar */}
      <LiveReadout
        label="LIVE"
        value={apogee_ft.toLocaleString()}
        x={PAD.left + CHART_W - 4}
        y={PAD.top + 14}
      />
    </svg>
  )
}
