import React from 'react'

export default function WarningBox({ warnings }) {
  if (!warnings || warnings.length === 0) return null

  const hasError = warnings.some(w => w.level === 'error')
  const level    = hasError ? 'error' : 'warn'

  const styles = {
    error: {
      bg:     'var(--error-bg)',
      border: 'var(--error-fg)',
      fg:     'var(--error-fg)',
    },
    warn: {
      bg:     'var(--warn-bg)',
      border: 'var(--warn-border)',
      fg:     'var(--warn-fg)',
    },
  }[level]

  const errorCount = warnings.filter(w => w.level === 'error').length
  const warnCount  = warnings.filter(w => w.level === 'warn').length

  let header
  if (hasError) {
    header = `${errorCount} Compatibility Error${errorCount !== 1 ? 's' : ''}${warnCount > 0 ? `, ${warnCount} Warning${warnCount !== 1 ? 's' : ''}` : ''}`
  } else {
    header = `${warnCount} Compatibility Warning${warnCount !== 1 ? 's' : ''}`
  }

  return (
    <div style={{
      background: styles.bg,
      border: `1px solid ${styles.border}`,
      borderRadius: '4px',
      padding: '12px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: styles.fg, marginBottom: '8px' }}>
        {header}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {warnings.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
            <span style={{ color: w.level === 'error' ? 'var(--error-fg)' : 'var(--warn-fg)', flexShrink: 0 }}>
              {w.level === 'error' ? '✕' : '⚠'}
            </span>
            <span>{w.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
