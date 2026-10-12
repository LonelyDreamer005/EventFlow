import React from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Home, Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="page-wrap">
      <div className="fallback-page">
        <div className="fallback-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
          <AlertCircle size={32} />
        </div>
        <h1>404</h1>
        <h2>This aisle is empty</h2>
        <p style={{ maxWidth: 420 }}>The page you want is not on the marquee — it may have moved.</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" className="btn btn-secondary">
            <Home size={16} /> Home
          </Link>
          <Link to="/events" className="btn btn-primary">
            <Compass size={16} /> Browse events
          </Link>
        </div>
      </div>
    </div>
  )
}
