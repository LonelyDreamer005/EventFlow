import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, ArrowRight, Users, Ticket } from 'lucide-react'
import { adminService } from '../services/admin'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getDashboardStats()
      setDashboardData(data)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="page-wrap">
        <LoadingSpinner message="Calculating house numbers..." />
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="page-wrap">
        <ErrorMessage error={error || 'Failed to load admin metrics.'} onRetry={loadDashboard} />
      </div>
    )
  }

  const { stats, recent_bookings = [] } = dashboardData

  return (
    <div className="page-wrap page-stack">
      <div className="page-header">
        <div className="page-title">
          <h1>House board</h1>
          <p className="page-subtitle">Revenue, inventory, and live reservation metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Link to="/admin/bookings" className="btn btn-secondary btn-sm">
            <Ticket size={15} /> All bookings
          </Link>
          <Link to="/admin/users" className="btn btn-secondary btn-sm">
            <Users size={15} /> View users ({stats.total_users || 0})
          </Link>
          <Link to="/admin/events" className="btn btn-secondary btn-sm">
            Manage events
          </Link>
          <Link to="/admin/events/new" className="btn btn-primary btn-sm">
            <PlusCircle size={15} /> Create event
          </Link>
        </div>
      </div>

      <div className="grid-stats">
        <div className="stat-tile">
          <span className="stat-label">Revenue</span>
          <span className="stat-value">{formatCurrency(stats.total_revenue || 0)}</span>
        </div>
        <Link to="/admin/bookings" className="stat-tile" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="stat-label">Tickets sold</span>
          <span className="stat-value">{stats.tickets_sold || 0}</span>
          <span className="stat-hint" style={{ color: 'var(--gold)' }}>View all bookings &rarr;</span>
        </Link>
        <div className="stat-tile">
          <span className="stat-label">Events</span>
          <span className="stat-value">{stats.total_events || 0}</span>
          <span className="stat-hint">{stats.published_events || 0} published</span>
        </div>
        <Link to="/admin/users" className="stat-tile" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="stat-label">Users</span>
          <span className="stat-value">{stats.total_users || 0}</span>
          <span className="stat-hint" style={{ color: 'var(--gold)' }}>View accounts &rarr;</span>
        </Link>
      </div>

      <div className="glass-card">
        <div className="section-heading" style={{ marginBottom: '1.1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>Latest bookings</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Real-time bookings with customer names and ticket details.
            </p>
          </div>
          <Link to="/admin/bookings" className="btn btn-outline btn-sm">
            View all bookings <ArrowRight size={13} />
          </Link>
        </div>

        {recent_bookings.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '1.5rem 0' }}>No bookings recorded yet.</p>
        ) : (
          <div className="data-table-wrap stack-on-mobile">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Ticket / Event</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}> </th>
                </tr>
              </thead>
              <tbody>
                {recent_bookings.map((booking) => {
                  const customerName = booking.user_name || booking.user?.name || `User #${booking.user_id}`
                  const customerEmail = booking.user_email || booking.user?.email
                  const eventOrTicket = booking.event_title || booking.ticket_name || 'Event Admission'

                  return (
                    <tr key={booking.id}>
                      <td data-label="Reference" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
                        {booking.reference}
                      </td>
                      <td data-label="Ticket / Event">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Ticket size={13} color="var(--gold)" />
                          <strong style={{ color: 'var(--text-primary)' }}>{eventOrTicket}</strong>
                        </div>
                        {booking.ticket_name && booking.event_title && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '1.25rem' }}>
                            Tier: {booking.ticket_name}
                          </div>
                        )}
                      </td>
                      <td data-label="Customer">
                        <strong style={{ color: 'var(--text-primary)' }}>{customerName}</strong>
                        {customerEmail && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{customerEmail}</div>
                        )}
                      </td>
                      <td data-label="Date">{formatDateTime(booking.created_at)}</td>
                      <td data-label="Status">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--gold)' }}>
                        {formatCurrency(booking.total_amount)}
                      </td>
                      <td data-label="Action" style={{ textAlign: 'right' }}>
                        <Link to={`/bookings/${booking.id}`} className="btn btn-secondary btn-sm">
                          View <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
