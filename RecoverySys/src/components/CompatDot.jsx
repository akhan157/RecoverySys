import React, { useRef, useEffect, useState } from 'react'

const STATUS_COLOR = {
  ok:      'var(--ok-fg)',
  warn:    'var(--warn-fg)',
  error:   'var(--error-fg)',
  neutral: 'var(--neutral-dot)',
}

export default function CompatDot({ status, tooltip }) {
  const [pulse, setPulse] = useState(false)
  const prevStatus = useRef(status)
  const [showTooltip, setShowTooltip] = useState(false)
  const hoverTimer = useRef(null)

  useEffect(() => {
    if (prevStatus.current !== status) {
      prevStatus.current = status
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 300)
      return () => clearTimeout(t)
    }
  }, [status])

  // Cleanup: clear hover timer if the dot unmounts while the delay is pending.
  // Without this, the timer fires on an unmounted component → stale setState.
  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  const handleMouseEnter = () => {
    if (status === 'neutral' || !tooltip) return
    hoverTimer.current = setTimeout(() => setShowTooltip(true), 200)
  }

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current)
    setShowTooltip(false)
  }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className={pulse ? 'dot-pulse' : ''}
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: STATUS_COLOR[status] ?? STATUS_COLOR.neutral,
          flexShrink: 0,
        }}
      />
      {showTooltip && tooltip && (
        <span style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: '#fff',
          border: '1px solid var(--border-default)',
          borderRadius: '4px',
          padding: '6px 8px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          maxWidth: '240px',
          whiteSpace: 'normal',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          zIndex: 100,
          lineHeight: 1.4,
        }}>
          {tooltip}
        </span>
      )}
    </span>
  )
}
