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
    <div className="error-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        <AlertCircle size={20} style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 600 }}>{displayMsg}</span>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm">
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  )
}
