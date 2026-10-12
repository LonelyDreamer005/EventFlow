import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Home, LogIn } from 'lucide-react'

export default function Unauthorized() {
  return (
    <div className="page-wrap">
      <div className="fallback-page">
        <div className="fallback-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
          <ShieldAlert size={32} />
        </div>
        <h1>403</h1>
        <h2>Backstage only</h2>
        <p style={{ maxWidth: 420 }}>You need organizer access to open this door.</p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" className="btn btn-secondary">
            <Home size={16} /> Home
          </Link>
          <Link to="/login" className="btn btn-primary">
            <LogIn size={16} /> Switch account
          </Link>
        </div>
      </div>
    </div>
  )
}
