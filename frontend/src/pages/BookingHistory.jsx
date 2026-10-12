import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Ticket, Compass, Filter } from 'lucide-react'
import { bookingService } from '../services/bookings'
import BookingCard from '../components/BookingCard'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'
import ErrorMessage from '../components/ErrorMessage'

export default function BookingHistory() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 })

  const loadBookings = async (currPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      const data = await bookingService.getBookings({ page: currPage, per_page: 9 })
      setBookings(data.bookings || [])
      setPagination(data.pagination || { page: currPage, total_pages: 1, total: data.bookings?.length || 0 })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings(page)
  }, [page])

  const handleCancelBooking = async (bookingId) => {
    await bookingService.cancelBooking(bookingId)
    await loadBookings(page)
  }

  // Filter in-memory for active status filter
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'all') return true
    return b.status === statusFilter
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header and Filter Controls */}
      <div className="page-header">
        <div className="page-title">
          <h1>My Booking History</h1>
          <p className="page-subtitle">View, manage, and download confirmation receipts for your reservations</p>
        </div>

        {/* Filter Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-glass-strong)',
            padding: '0.35rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {['all', 'confirmed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className="btn btn-sm"
              style={{
                background: statusFilter === tab ? 'var(--brand-gradient)' : 'transparent',
                color: statusFilter === tab ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                textTransform: 'capitalize',
                padding: '0.4rem 0.85rem',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={() => loadBookings(page)} />}

      {loading ? (
        <LoadingSpinner message="Loading reservations..." />
      ) : filteredBookings.length === 0 ? (
        <div
          className="glass-card"
          style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-secondary)' }}
        >
          <Calendar size={44} color="var(--cyan)" style={{ marginBottom: '1rem' }} />
          <h3>No Bookings Found</h3>
          <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            {statusFilter !== 'all'
              ? `No reservations with status "${statusFilter}".`
              : "You haven't made any ticket reservations yet."}
          </p>
          <Link to="/events" className="btn btn-primary btn-sm">
            <Compass size={16} /> Explore Events
          </Link>
        </div>
      ) : (
        <>
          <div className="grid-cards">
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancelSuccess={handleCancelBooking}
              />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </>
      )}
    </div>
  )
}
