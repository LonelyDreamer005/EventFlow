import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Ticket, Menu, X, User, LogOut, Shield, Compass, Calendar, PlusCircle } from 'lucide-react'

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`)

  const NavLinks = ({ onNavigate }) => (
    <>
      <Link to="/events" className={`nav-link ${isActive('/events') ? 'is-active' : ''}`} onClick={onNavigate}>
        <Compass size={16} /> Explore
      </Link>

      {isAuthenticated && !isAdmin && (
        <>
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'is-active' : ''}`} onClick={onNavigate}>
            Dashboard
          </Link>
          <Link to="/bookings" className={`nav-link ${isActive('/bookings') ? 'is-active' : ''}`} onClick={onNavigate}>
            <Calendar size={16} /> Tickets
          </Link>
        </>
      )}

      {isAdmin && (
        <>
          <Link
            to="/admin/dashboard"
            className={`nav-link ${isActive('/admin/dashboard') ? 'is-active' : ''}`}
            onClick={onNavigate}
          >
            <Shield size={16} /> Admin
          </Link>
          <Link
            to="/admin/events"
            className={`nav-link ${isActive('/admin/events') && !location.pathname.includes('/new') ? 'is-active' : ''}`}
            onClick={onNavigate}
          >
            Events
          </Link>
          <Link to="/admin/events/new" className="btn btn-outline btn-sm" onClick={onNavigate}>
            <PlusCircle size={15} /> Create
          </Link>
        </>
      )}
    </>
  )

  return (
    <nav className="site-nav">
      <div className="nav-inner">
        <Link to="/" className="brand-link">
          <div className="brand-mark">
            <Ticket size={20} color="#ffffff" />
          </div>
          <span className="brand-word">EventFlow</span>
        </Link>

        <div className="desktop-nav">
          <NavLinks />
        </div>

        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <div className="user-chip">
                <User size={14} color="var(--gold)" />
                <span>{user?.name}</span>
                {isAdmin && <span className="role-chip">Admin</span>}
              </div>
              <button type="button" onClick={handleLogout} className="btn btn-secondary btn-sm" title="Log out">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary btn-sm hide-on-mobile">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get tickets
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="btn btn-secondary btn-sm mobile-toggle"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <NavLinks onNavigate={() => setMobileMenuOpen(false)} />
          {!isAuthenticated && (
            <Link to="/login" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              Sign in
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
