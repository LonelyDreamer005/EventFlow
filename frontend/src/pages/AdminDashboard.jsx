import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, ArrowRight } from 'lucide-react'
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
          <p className="page-subtitle">Revenue, inventory, and the latest reservations.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
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
        <div className="stat-tile">
          <span className="stat-label">Tickets sold</span>
          <span className="stat-value">{stats.total_tickets_sold || 0}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Events</span>
          <span className="stat-value">{stats.total_events || 0}</span>
          <span className="stat-hint">{stats.published_events || 0} published</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Confirmed</span>
          <span className="stat-value">{stats.confirmed_bookings || 0}</span>
          <span className="stat-hint">of {stats.total_bookings || 0} bookings</span>
        </div>
      </div>

      <div className="glass-card">
        <div className="section-heading" style={{ marginBottom: '1.1rem' }}>
          <h2 style={{ fontSize: '1.3rem' }}>Latest bookings</h2>
          <span className="stat-hint">Most recent 10</span>
        </div>

        {recent_bookings.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '1.5rem 0' }}>No bookings recorded yet.</p>
        ) : (
          <div className="data-table-wrap stack-on-mobile">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}> </th>
                </tr>
              </thead>
              <tbody>
                {recent_bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td data-label="Reference" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
                      {booking.reference}
                    </td>
                    <td data-label="Customer">User #{booking.user_id}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
