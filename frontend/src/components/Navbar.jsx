import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Ticket, Menu, X, User, LogOut, Shield, Compass, Calendar, PlusCircle } from 'lucide-react'

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(7, 11, 20, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        transition: 'all var(--transition-normal)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.85rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <Ticket size={22} color="#ffffff" />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '1.4rem',
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #ffffff 40%, var(--cyan) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            EventFlow
          </span>
        </Link>

        {/* Desktop Links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.75rem',
          }}
          className="desktop-nav"
        >
          <Link
            to="/events"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 500,
              fontSize: '0.925rem',
              color: isActive('/events') ? 'var(--cyan)' : 'var(--text-secondary)',
              transition: 'color var(--transition-fast)',
            }}
          >
            <Compass size={17} /> Explore Events
          </Link>

          {isAuthenticated && !isAdmin && (
            <>
              <Link
                to="/dashboard"
                style={{
                  fontWeight: 500,
                  fontSize: '0.925rem',
                  color: isActive('/dashboard') ? 'var(--cyan)' : 'var(--text-secondary)',
                }}
              >
                Dashboard
              </Link>
              <Link
                to="/bookings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 500,
                  fontSize: '0.925rem',
                  color: isActive('/bookings') ? 'var(--cyan)' : 'var(--text-secondary)',
                }}
              >
                <Calendar size={17} /> My Bookings
              </Link>
            </>
          )}

          {isAdmin && (
            <>
              <Link
                to="/admin/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600,
                  fontSize: '0.925rem',
                  color: isActive('/admin/dashboard') ? 'var(--cyan)' : 'var(--text-secondary)',
                }}
              >
                <Shield size={17} /> Admin Hub
              </Link>
              <Link
                to="/admin/events"
                style={{
                  fontWeight: 500,
                  fontSize: '0.925rem',
                  color: isActive('/admin/events') ? 'var(--cyan)' : 'var(--text-secondary)',
                }}
              >
                Manage Events
              </Link>
              <Link
                to="/admin/events/new"
                className="btn btn-outline btn-sm"
                style={{ gap: '0.35rem' }}
              >
                <PlusCircle size={15} /> Create Event
              </Link>
            </>
          )}
        </div>

        {/* User Auth controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  background: 'var(--bg-glass-strong)',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem',
                }}
              >
                <User size={15} color="var(--cyan)" />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</span>
                {isAdmin && (
                  <span
                    style={{
                      background: 'rgba(99, 102, 241, 0.25)',
                      color: 'var(--primary)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-sm)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Log Out"
                style={{ padding: '0.45rem 0.75rem' }}
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-secondary btn-sm mobile-toggle"
            style={{ display: 'none', padding: '0.45rem' }}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <Link
            to="/events"
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--text-primary)', fontWeight: 500 }}
          >
            Explore Events
          </Link>
          {isAuthenticated && !isAdmin && (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-primary)', fontWeight: 500 }}
              >
                Dashboard
              </Link>
              <Link
                to="/bookings"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-primary)', fontWeight: 500 }}
              >
                My Bookings
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-primary)', fontWeight: 600 }}
              >
                Admin Hub
              </Link>
              <Link
                to="/admin/events"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-primary)', fontWeight: 500 }}
              >
                Manage Events
              </Link>
              <Link
                to="/admin/events/new"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--cyan)', fontWeight: 600 }}
              >
                + Create Event
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
