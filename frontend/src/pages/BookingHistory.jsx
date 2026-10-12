import React, { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Calendar, Compass } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { bookingService } from '../services/bookings'
import BookingCard from '../components/BookingCard'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'
import ErrorMessage from '../components/ErrorMessage'

export default function BookingHistory() {
  const { isAdmin } = useAuth()
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

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter === 'all') return true
    return b.status === statusFilter
  })

  if (isAdmin) {
    return <Navigate to="/admin/bookings" replace />
  }

  return (
    <div className="page-wrap page-stack">
      <div className="page-header">
        <div className="page-title">
          <h1>Your tickets</h1>
          <p className="page-subtitle">Open a stub, reprint a receipt, or release a seat.</p>
        </div>

        <div className="pill-tabs">
          {['all', 'confirmed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`tab ${statusFilter === tab ? 'is-active' : ''}`}
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
        <div className="glass-card empty-state">
          <Calendar size={44} color="var(--gold)" />
          <h3>No bookings found</h3>
          <p>
            {statusFilter !== 'all'
              ? `Nothing marked “${statusFilter}”.`
              : "You haven't reserved tickets yet."}
          </p>
          <Link to="/events" className="btn btn-primary btn-sm">
            <Compass size={16} /> Explore events
          </Link>
        </div>
      ) : (
        <>
          <div className="grid-cards">
            {filteredBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} onCancelSuccess={handleCancelBooking} />
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
