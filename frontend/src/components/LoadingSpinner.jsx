import React from 'react'
import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ message = 'Loading...', size = 32 }) {
  return (
    <div className="loading-block">
      <Loader2 size={size} className="animate-spin" color="var(--gold)" />
      {message && <p style={{ fontWeight: 600 }}>{message}</p>}
    </div>
  )
}
