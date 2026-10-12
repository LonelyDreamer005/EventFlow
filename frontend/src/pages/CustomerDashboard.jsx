import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, Calendar, DollarSign, Compass, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { bookingService } from '../services/bookings'
import { formatCurrency } from '../utils/formatters'
import BookingCard from '../components/BookingCard'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await bookingService.getBookings({ per_page: 5 })
      setBookings(data.bookings || [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleCancelBooking = async (bookingId) => {
    await bookingService.cancelBooking(bookingId)
    // Reload bookings to reflect updated status
    await loadDashboardData()
  }

  // Calculate quick metrics
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed')
  const totalSpent = confirmedBookings.reduce((acc, b) => acc + parseFloat(b.total_amount || 0), 0)
  const totalTickets = confirmedBookings.reduce((acc, b) => {
    const items = b.items || []
    return acc + items.reduce((iAcc, item) => iAcc + item.quantity, 0)
  }, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Header Banner */}
      <div className="page-header">
        <div className="page-title">
          <h1>Welcome, {user?.name || 'Customer'}!</h1>
          <p className="page-subtitle">Track your event tickets, receipts, and reservations</p>
        </div>

        <Link to="/events" className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Compass size={17} /> Explore More Events
        </Link>
      </div>

      {error && <ErrorMessage error={error} onRetry={loadDashboardData} />}

      {/* Stats Counter Grid */}
      <div className="grid-stats">
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>
              Active Bookings
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {confirmedBookings.length}
            </span>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
            }}
          >
            <Ticket size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>
              Tickets Reserved
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {totalTickets}
            </span>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)',
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>
              Total Value
            </span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {formatCurrency(totalSpent)}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Reservations Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Recent Reservations</h2>
          <Link to="/bookings" className="btn btn-outline btn-sm" style={{ gap: '0.4rem' }}>
            View All ({bookings.length}) <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading your reservations..." />
        ) : bookings.length === 0 ? (
          <div
            className="glass-card"
            style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}
          >
            <Ticket size={44} color="var(--cyan)" style={{ marginBottom: '1rem' }} />
            <h3>No Bookings Yet</h3>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              You haven't reserved any event tickets yet. Explore upcoming events to get started!
            </p>
            <Link to="/events" className="btn btn-primary btn-sm">
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="grid-cards">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancelSuccess={handleCancelBooking}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
