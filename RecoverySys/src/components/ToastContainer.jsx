import React, { useEffect } from 'react'

function Toast({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 3000)
    return () => clearTimeout(t)
  }, [toast.id, onRemove])

  return (
    <div
      className="toast-enter"
      style={{
        background: toast.level === 'ok' ? 'var(--cta-bg)' : '#c0392b',
        color: '#fff',
        borderRadius: '4px',
        padding: '8px 14px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        cursor: 'pointer',
      }}
      onClick={() => onRemove(toast.id)}
    >
      {toast.message}
    </div>
  )
}

export default function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: 200,
    }}>
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
