import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Home, LogIn } from 'lucide-react'

export default function Unauthorized() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '5rem 1rem',
        gap: '1.25rem',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(245, 158, 11, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--warning)',
        }}
      >
        <ShieldAlert size={32} />
      </div>

      <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>403 Forbidden</h1>
      <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>Access Restricted</h2>
      <p style={{ maxWidth: '440px', color: 'var(--text-secondary)' }}>
        You do not have administrative permissions to view this resource.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/" className="btn btn-secondary" style={{ gap: '0.4rem' }}>
          <Home size={16} /> Home
        </Link>
        <Link to="/login" className="btn btn-primary" style={{ gap: '0.4rem' }}>
          <LogIn size={16} /> Switch Account
        </Link>
      </div>
    </div>
  )
}
