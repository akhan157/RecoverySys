import React, { useEffect } from 'react'
import { TOAST_LEVELS } from '../lib/constants.js'

// Per-level design-system token pairs
const LEVEL_STYLES = {
  [TOAST_LEVELS.OK]:    { background: 'var(--cta-bg)',   color: 'var(--cta-fg)'   },
  [TOAST_LEVELS.WARN]:  { background: 'var(--warn-bg)',  color: 'var(--warn-fg)'  },
  [TOAST_LEVELS.ERROR]: { background: 'var(--error-bg)', color: 'var(--error-fg)' },
}

function Toast({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 3000)
    return () => clearTimeout(t)
  }, [toast.id, onRemove])

  const levelStyle = LEVEL_STYLES[toast.level] ?? LEVEL_STYLES[TOAST_LEVELS.ERROR]

  return (
    <div
      role="alert"
      aria-live={toast.level === TOAST_LEVELS.ERROR ? 'assertive' : 'polite'}
      className="toast-enter"
      style={{
        ...levelStyle,
        borderRadius: '4px',
        padding: '8px 14px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        cursor: 'pointer',
        maxWidth: 'min(340px, calc(100vw - 40px))',
        wordBreak: 'break-word',
      }}
      onClick={() => onRemove(toast.id)}
    >
      {toast.message}
    </div>
  )
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts?.length) return null
  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 200,
      }}
    >
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
