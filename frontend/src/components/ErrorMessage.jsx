import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorMessage({ error, onRetry, message }) {
  const displayMsg =
    message ||
    (typeof error === 'string'
      ? error
      : error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'An unexpected error occurred.')

  return (
    <div
      style={{
        background: 'var(--danger-bg)',
        border: '1px solid rgba(244, 63, 94, 0.3)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        margin: '1.5rem 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)' }}>
        <AlertCircle size={22} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{displayMsg}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary btn-sm"
          style={{ gap: '0.4rem', border: '1px solid rgba(244, 63, 94, 0.4)' }}
        >
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  )
}
