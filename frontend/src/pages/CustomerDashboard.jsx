import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, Compass, ArrowRight } from 'lucide-react'
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
    await loadDashboardData()
  }

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed')
  const totalSpent = confirmedBookings.reduce((acc, b) => acc + parseFloat(b.total_amount || 0), 0)
  const totalTickets = confirmedBookings.reduce((acc, b) => {
    const items = b.items || []
    return acc + items.reduce((iAcc, item) => iAcc + item.quantity, 0)
  }, 0)

  return (
    <div className="page-wrap page-stack">
      <div className="page-header">
        <div className="page-title">
          <h1>Hello, {user?.name || 'guest'}</h1>
          <p className="page-subtitle">Your nights, stubs, and upcoming doors.</p>
        </div>
        <Link to="/events" className="btn btn-primary">
          <Compass size={17} /> Find a night
        </Link>
      </div>

      {error && <ErrorMessage error={error} onRetry={loadDashboardData} />}

      <div className="grid-stats">
        <div className="stat-tile">
          <span className="stat-label">Active bookings</span>
          <span className="stat-value">{confirmedBookings.length}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Tickets held</span>
          <span className="stat-value">{totalTickets}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Total value</span>
          <span className="stat-value">{formatCurrency(totalSpent)}</span>
        </div>
      </div>

      <div className="page-stack">
        <div className="section-heading">
          <h2>Recent stubs</h2>
          <Link to="/bookings" className="btn btn-outline btn-sm">
            All bookings <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading your reservations..." />
        ) : bookings.length === 0 ? (
          <div className="glass-card empty-state">
            <Ticket size={40} color="var(--gold)" />
            <h3>No bookings yet</h3>
            <p>Pick a night and lock your seats — your stub will land here.</p>
            <Link to="/events" className="btn btn-primary btn-sm">
              Browse events
            </Link>
          </div>
        ) : (
          <div className="grid-cards">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} onCancelSuccess={handleCancelBooking} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
