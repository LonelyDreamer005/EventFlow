import React from 'react'
import { Link } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Footer() {
  const { isAuthenticated, isAdmin } = useAuth()

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="brand-link">
            <div className="brand-mark" style={{ width: 32, height: 32, boxShadow: 'none' }}>
              <Ticket size={16} color="#ffffff" />
            </div>
            <div>
              <span className="brand-word" style={{ fontSize: '1.1rem' }}>
                EventFlow
              </span>
              <p style={{ fontSize: '0.82rem', margin: 0 }}>Get in. Keep your seat.</p>
            </div>
          </div>

          <div className="footer-links">
            <Link to="/events">Explore events</Link>
            {isAuthenticated ? (
              isAdmin ? (
                <>
                  <Link to="/admin/dashboard">Admin Hub</Link>
                  <Link to="/admin/events">Manage events</Link>
                  <Link to="/admin/users">User directory</Link>
                </>
              ) : (
                <>
                  <Link to="/dashboard">Dashboard</Link>
                  <Link to="/bookings">My tickets</Link>
                </>
              )
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Create account</Link>
              </>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} EventFlow. MIT License.</span>
          <span>Tickets confirmed instantly. No oversell.</span>
        </div>
      </div>
    </footer>
  )
}
