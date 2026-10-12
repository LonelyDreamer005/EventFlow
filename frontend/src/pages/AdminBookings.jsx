import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ticket,
  Search,
  RefreshCw,
  ArrowLeft,
  Mail,
  Calendar,
  Eye,
  XCircle,
  Hash,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { bookingService } from '../services/bookings'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [actionError, setActionError] = useState(null)

  const loadBookings = async (targetPage = 1, status = statusFilter) => {
    setLoading(true)
    setError(null)
    try {
      const params = { page: targetPage, per_page: 15 }
      if (status && status !== 'all') {
        params.status = status
      }
      const data = await bookingService.getBookings(params)
      setBookings(data.bookings || [])
      setTotal(data.total || 0)
      setPage(data.page || 1)
      setPages(data.pages || 1)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings(page, statusFilter)
  }, [page, statusFilter])

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus)
    setPage(1)
    setActionSuccess(null)
    setActionError(null)
  }

  const handleCancelBooking = async () => {
    if (!selectedBookingToCancel) return
    setIsCancelling(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      await bookingService.cancelBooking(selectedBookingToCancel.id)
      setActionSuccess(
        `Reservation ${selectedBookingToCancel.reference} was cancelled successfully. Inventory has been restored.`
      )
      setSelectedBookingToCancel(null)
      await loadBookings(page, statusFilter)
    } catch (err) {
      setActionError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Failed to cancel booking.'
      )
    } finally {
      setIsCancelling(false)
    }
  }

  // Quick client-side filtering on current page
  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (b.reference && b.reference.toLowerCase().includes(q)) ||
      (b.user_name && b.user_name.toLowerCase().includes(q)) ||
      (b.user_email && b.user_email.toLowerCase().includes(q)) ||
      (b.event_title && b.event_title.toLowerCase().includes(q)) ||
      (b.ticket_name && b.ticket_name.toLowerCase().includes(q))
    )
  })

  // Page stats
  const pageConfirmedCount = bookings.filter((b) => b.status === 'confirmed').length
  const pageTotalAmount = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0)

  return (
    <div className="page-wrap page-stack">
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <Link to="/admin/dashboard" className="btn btn-secondary btn-sm no-print">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
          </div>
          <h1>Bookings Ledger</h1>
          <p className="page-subtitle">
            Master registry of all customer reservations, tickets, and transactions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadBookings(page, statusFilter)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Action alerts */}
      {actionSuccess && (
        <div
          className="glass-card"
          style={{
            padding: '0.85rem 1.25rem',
            borderColor: 'rgba(52, 211, 153, 0.4)',
            background: 'rgba(16, 185, 129, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#34d399',
          }}
        >
          <CheckCircle size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div
          className="glass-card"
          style={{
            padding: '0.85rem 1.25rem',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Overview Stat Tiles */}
      <div className="grid-stats">
        <div className="stat-tile">
          <span className="stat-label">Total Reservations</span>
          <span className="stat-value">{total}</span>
          <span className="stat-hint">Across all events</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Active on Page</span>
          <span className="stat-value">{pageConfirmedCount}</span>
          <span className="stat-hint">Confirmed status</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Page Confirmed Value</span>
          <span className="stat-value">{formatCurrency(pageTotalAmount)}</span>
          <span className="stat-hint">Excludes cancelled</span>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="glass-card" style={{ padding: '1.15rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div className="pill-tabs" style={{ margin: 0 }}>
            {[
              { id: 'all', label: `All (${total})` },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleStatusChange(tab.id)}
                className={`tab ${statusFilter === tab.id ? 'is-active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', minWidth: '280px', flex: '1 1 280px', maxWidth: '420px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search reference, customer, or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.2rem', fontSize: '0.88rem' }}
            />
          </div>
        </div>
      </div>

      {/* Table / List View */}
      {loading ? (
        <LoadingSpinner message="Retrieving bookings ledger..." />
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => loadBookings(page, statusFilter)} />
      ) : filteredBookings.length === 0 ? (
        <div className="glass-card empty-state" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <Ticket size={44} color="var(--gold)" style={{ margin: '0 auto 1rem' }} />
          <h3>No bookings found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0.5rem auto 1.5rem' }}>
            {searchQuery
              ? `No reservations matched your query "${searchQuery}".`
              : statusFilter !== 'all'
              ? `No reservations with status "${statusFilter}".`
              : 'There are currently no bookings recorded in the system.'}
          </p>
          {searchQuery && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearchQuery('')}>
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-wrap stack-on-mobile">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Reference</th>
                  <th>Event & Ticket Tier</th>
                  <th>Customer</th>
                  <th>Booked At</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right', width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const customerName = b.user_name || b.user?.name || `Customer #${b.user_id}`
                  const customerEmail = b.user_email || b.user?.email
                  const eventTitle = b.event_title || 'Event Admission'
                  const tierName = b.ticket_name
                  const items = b.items || []
                  const totalTickets = items.reduce((acc, it) => acc + (it.quantity || 1), 0)

                  const initials = (customerName || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <tr key={b.id}>
                      {/* Reference */}
                      <td data-label="Reference">
                        <Link
                          to={`/bookings/${b.id}`}
                          style={{
                            fontFamily: 'ui-monospace, monospace',
                            fontWeight: 700,
                            color: 'var(--gold)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Hash size={13} />
                          {b.reference}
                        </Link>
                      </td>

                      {/* Event & Tier */}
                      <td data-label="Event & Ticket Tier">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                          <Ticket size={14} color="var(--gold)" style={{ marginTop: '3px', flexShrink: 0 }} />
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{eventTitle}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {tierName ? `${tierName}` : 'Standard'}
                              {totalTickets > 0 && ` × ${totalTickets} ticket${totalTickets > 1 ? 's' : ''}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td data-label="Customer">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(212, 175, 55, 0.15)',
                              color: 'var(--gold)',
                              border: '1px solid rgba(212, 175, 55, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{customerName}</div>
                            {customerEmail && (
                              <div
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <Mail size={11} color="var(--text-tertiary)" />
                                {customerEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Booked At */}
                      <td data-label="Booked At">
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Calendar size={13} color="var(--text-tertiary)" />
                          <span>{formatDateTime(b.created_at)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td data-label="Status">
                        <StatusBadge status={b.status} />
                      </td>

                      {/* Total Amount */}
                      <td
                        data-label="Total"
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: '0.96rem',
                          color: b.status === 'confirmed' ? 'var(--gold)' : 'var(--text-tertiary)',
                        }}
                      >
                        {formatCurrency(b.total_amount)}
                      </td>

                      {/* Actions */}
                      <td data-label="Actions" style={{ textAlign: 'right' }}>
                        <div
                          className="action-cluster"
                          style={{ justifyContent: 'flex-end', display: 'flex', gap: '0.4rem' }}
                        >
                          <Link
                            to={`/bookings/${b.id}`}
                            className="btn btn-secondary btn-sm"
                            title="Open ticket voucher"
                          >
                            <Eye size={13} /> Stub
                          </Link>
                          {b.status === 'confirmed' && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              title="Cancel reservation & release seats"
                              onClick={() => setSelectedBookingToCancel(b)}
                            >
                              <XCircle size={13} /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <Pagination page={page} totalPages={pages} onPageChange={(p) => setPage(p)} />
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(selectedBookingToCancel)}
        title="Cancel this reservation?"
        message={`Are you sure you want to cancel booking ${selectedBookingToCancel?.reference}? All reserved seats and tickets will be returned to active inventory.`}
        confirmText="Yes, cancel booking"
        cancelText="Keep booking"
        isDanger
        isLoading={isCancelling}
        onConfirm={handleCancelBooking}
        onCancel={() => setSelectedBookingToCancel(null)}
      />
    </div>
  )
}
