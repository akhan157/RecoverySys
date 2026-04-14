import React, { useRef, useEffect, useCallback } from 'react'

const W = 400
const H = 260
const PAD = { top: 28, right: 16, bottom: 36, left: 56 }
const CHART_W = W - PAD.left - PAD.right
const CHART_H = H - PAD.top  - PAD.bottom

function nice1000(val) {
  return Math.ceil(val / 1000) * 1000
}

/* ── Crosshatch pattern definition ───────────────────────────────────── */
function ChartDefs() {
  return (
    <defs>
      {/* Fine crosshatch for grid */}
      <pattern id="osc-grid" width="16" height="16" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="16" y2="16" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <line x1="16" y1="0" x2="0" y2="16" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      </pattern>
      {/* Denser crosshatch for area fill */}
      <pattern id="osc-fill" width="8" height="8" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="8" y2="8" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
        <line x1="8" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
      </pattern>
      {/* Clip to chart area */}
      <clipPath id="osc-clip">
        <rect x={PAD.left} y={PAD.top} width={CHART_W} height={CHART_H} />
      </clipPath>
    </defs>
  )
}

/* ── Oscilloscope-style axes ─────────────────────────────────────────── */
function Axes({ maxAlt, maxTime }) {
  const yTicks = []
  for (let alt = 0; alt <= maxAlt; alt += 1000) yTicks.push(alt)
  if (yTicks[yTicks.length - 1] < maxAlt) yTicks.push(nice1000(maxAlt))

  const xTicks = []
  for (let t = 0; t <= maxTime; t += 5) xTicks.push(t)
  if (xTicks[xTicks.length - 1] < maxTime) xTicks.push(Math.ceil(maxTime / 5) * 5)

  const xS = t => PAD.left + (t / maxTime) * CHART_W
  const yS = a => PAD.top  + CHART_H - (a / maxAlt) * CHART_H

  return (
    <>
      {/* Background crosshatch grid */}
      <rect x={PAD.left} y={PAD.top} width={CHART_W} height={CHART_H}
        fill="url(#osc-grid)" />

      {/* Major grid lines */}
      {yTicks.map(alt => (
        <line key={`gy${alt}`} x1={PAD.left} y1={yS(alt)} x2={PAD.left + CHART_W} y2={yS(alt)}
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      ))}
      {xTicks.map(t => (
        <line key={`gx${t}`} x1={xS(t)} y1={PAD.top} x2={xS(t)} y2={PAD.top + CHART_H}
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      ))}

      {/* Y-axis labels */}
      {yTicks.filter(alt => alt > 0).map(alt => (
        <text key={`yl${alt}`} x={PAD.left - 6} y={yS(alt) + 3}
          textAnchor="end" fontSize="9" fontFamily="'JetBrains Mono', monospace"
          fill="rgba(255,255,255,0.4)">
          {alt >= 1000 ? `${alt / 1000}k` : alt}
        </text>
      ))}
      <text x={12} y={PAD.top + CHART_H / 2}
        textAnchor="middle" fontSize="8" fontFamily="'JetBrains Mono', monospace"
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
            textAnchor="middle" fontSize="9" fontFamily="'JetBrains Mono', monospace"
            fill="rgba(255,255,255,0.4)">
            {t}s
          </text>
        )
      })}

      {/* Chart border */}
      <rect x={PAD.left} y={PAD.top} width={CHART_W} height={CHART_H}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    </>
  )
}

/* ── Live readout badge ──────────────────────────────────────────────── */
function LiveReadout({ value, unit, x, y }) {
  return (
    <g>
      <rect x={x - 60} y={y} width={58} height={28} rx={2}
        fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <text x={x - 31} y={y + 12}
        textAnchor="middle" fontSize="7" fontFamily="'JetBrains Mono', monospace"
        fill="rgba(255,255,255,0.5)" letterSpacing="0.5">
        LIVE
      </text>
      <text x={x - 31} y={y + 23}
        textAnchor="middle" fontSize="11" fontFamily="'JetBrains Mono', monospace"
        fill="#ffffff" fontWeight="600">
        {value}
      </text>
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
            fillRef.current.style.opacity = 1
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
        if (fillRef.current) fillRef.current.style.opacity = 1
      }, 200)
    }
    prevSim.current = simulation
    return () => clearTimeout(timerId)
  }, [simulation])

  if (!simulation) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%"
        style={{ display: 'block', background: '#0a0a0a', borderRadius: '4px' }}>
        <ChartDefs />
        <Axes maxAlt={5000} maxTime={120} />
        {/* Header bar */}
        <rect x={PAD.left} y={4} width={2} height={14} fill="rgba(255,255,255,0.5)" />
        <text x={PAD.left + 8} y={15}
          fontSize="9" fontFamily="'JetBrains Mono', monospace" fill="rgba(255,255,255,0.5)"
          letterSpacing="0.5">
          FLIGHT PROFILE (FT)
        </text>
        <text x={PAD.left + CHART_W} y={15}
          textAnchor="end" fontSize="8" fontFamily="'JetBrains Mono', monospace"
          fill="rgba(255,255,255,0.3)" letterSpacing="0.5">
          AWAITING DATA
        </text>
        <text x={PAD.left + CHART_W / 2} y={PAD.top + CHART_H / 2}
          textAnchor="middle" fontSize="11" fontFamily="'JetBrains Mono', monospace"
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
      style={{ display: 'block', background: '#0a0a0a', borderRadius: '4px' }}>
      <ChartDefs />

      {/* Header bar */}
      <rect x={PAD.left} y={4} width={2} height={14} fill="#ffffff" />
      <text x={PAD.left + 8} y={15}
        fontSize="9" fontFamily="'JetBrains Mono', monospace" fill="rgba(255,255,255,0.7)"
        letterSpacing="0.5">
        FLIGHT PROFILE (FT)
      </text>
      <text x={PAD.left + CHART_W} y={15}
        textAnchor="end" fontSize="8" fontFamily="'JetBrains Mono', monospace"
        fill="rgba(255,255,255,0.3)" letterSpacing="0.5">
        SCALE: 1:{(maxAlt / 100).toFixed(0)}
      </text>

      <Axes maxAlt={maxAlt} maxTime={maxTime} />

      {/* Crosshatch area fill under the curve */}
      <path
        ref={fillRef}
        d={fillD}
        fill="url(#osc-fill)"
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
            fontSize="7" fontFamily="'JetBrains Mono', monospace"
            fill="rgba(255,255,255,0.35)" letterSpacing="0.5">
            {ev.label}
          </text>
        </g>
      ))}

      {/* Flight path */}
      <path
        ref={pathRef}
        d={d}
        stroke="#ffffff"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />

      {/* Live readout */}
      <LiveReadout
        value={apogee_ft.toLocaleString()}
        unit="ft"
        x={PAD.left + CHART_W}
        y={PAD.top + 6}
      />
    </svg>
  )
}
