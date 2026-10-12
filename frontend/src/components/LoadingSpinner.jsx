import React from 'react'
import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ message = 'Loading...', size = 32 }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem',
      gap: '0.85rem',
      color: 'var(--text-secondary)'
    }}>
      <Loader2
        size={size}
        className="animate-spin"
        style={{ color: 'var(--cyan)' }}
      />
      {message && <p style={{ fontSize: '0.925rem', fontWeight: 500 }}>{message}</p>}
    </div>
  )
}
