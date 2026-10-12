import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, MapPin, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { eventService } from '../services/events'
import { bookingService } from '../services/bookings'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import TicketSelector from '../components/TicketSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookingError, setBookingError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadEvent = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await eventService.getEventById(id)
      setEvent(data.event)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvent()
  }, [id])

  const handleBookTickets = async (items) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/events/${id}`)}`)
      return
    }

    setIsSubmitting(true)
    setBookingError(null)

    try {
      const result = await bookingService.createBooking(items)
      const bookingId = result.booking?.id
      // Navigate to booking receipt with newly confirmed reservation
      navigate(`/bookings/${bookingId}`, {
        state: { newBookingSuccess: true, reference: result.booking?.reference },
      })
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to complete booking reservation.'
      setBookingError(msg)
      // Reload event details to get updated inventory counts
      loadEvent()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading event details..." />
  }

  if (error || !event) {
    return (
      <div>
        <Link to="/events" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to Events
        </Link>
        <ErrorMessage error={error || 'Event not found'} onRetry={loadEvent} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Top Navigation */}
      <div>
        <Link to="/events" className="btn btn-secondary btn-sm" style={{ gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to Events
        </Link>
      </div>

      {bookingError && (
        <ErrorMessage message={bookingError} />
      )}

      {/* Main Two-Column Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Event Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <StatusBadge status={event.status} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Event #{event.id}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 2.75rem)', marginBottom: '1rem' }}>
              {event.title}
            </h1>
          </div>

          {/* Key Info Cards */}
          <div
            className="glass-card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={20} color="var(--cyan)" />
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Date & Time</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDateTime(event.start_at)}
                  {event.end_at && ` – ${formatDateTime(event.end_at)}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <MapPin size={20} color="var(--primary)" />
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Venue Location</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.venue}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>About This Event</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {event.description || 'No detailed description provided for this event.'}
            </p>
          </div>

          {/* Guarantees Box */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-glass-strong)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            <ShieldCheck size={24} color="var(--success)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Simulated Payment & Instant Confirmation:</strong> All reservations reserve tickets atomically with zero risk of double-booking.
            </span>
          </div>
        </div>

        {/* Right Column: Ticket Selector */}
        <div>
          <TicketSelector
            ticketTypes={event.ticket_types || []}
            onBook={handleBookTickets}
            isSubmitting={isSubmitting}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </div>
  )
}
