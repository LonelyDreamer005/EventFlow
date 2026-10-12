import React from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Home, Compass } from 'lucide-react'

export default function NotFound() {
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
          background: 'rgba(244, 63, 94, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--danger)',
        }}
      >
        <AlertCircle size={32} />
      </div>

      <h1 style={{ fontSize: '3rem', fontWeight: 800 }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Page Not Found</h2>
      <p style={{ maxWidth: '440px', color: 'var(--text-secondary)' }}>
        The page you are looking for does not exist or has been moved.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/" className="btn btn-secondary" style={{ gap: '0.4rem' }}>
          <Home size={16} /> Home
        </Link>
        <Link to="/events" className="btn btn-primary" style={{ gap: '0.4rem' }}>
          <Compass size={16} /> Browse Events
        </Link>
      </div>
    </div>
  )
}
