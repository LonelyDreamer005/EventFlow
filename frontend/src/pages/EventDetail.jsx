import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, MapPin, ArrowLeft, ShieldCheck } from 'lucide-react'
import { eventService } from '../services/events'
import { bookingService } from '../services/bookings'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import TicketSelector from '../components/TicketSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import EventCover from '../components/EventCover'

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
      loadEvent()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <LoadingSpinner message="Loading event details..." />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="page-wrap">
        <Link to="/events" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to events
        </Link>
        <ErrorMessage error={error || 'Event not found'} onRetry={loadEvent} />
      </div>
    )
  }

  return (
    <div className="page-wrap page-stack">
      <Link to="/events" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
        <ArrowLeft size={16} /> Back to events
      </Link>

      {bookingError && <ErrorMessage message={bookingError} />}

      <div className="split-layout">
        <div className="page-stack">
          <EventCover event={event} size="hero" />
          <div>
            <div className="row-between" style={{ marginBottom: '0.75rem' }}>
              <StatusBadge status={event.status} />
            </div>
            <h1>{event.title}</h1>
          </div>

          <div className="glass-card detail-facts">
            <div className="meta-row">
              <Calendar size={18} color="var(--gold)" />
              <div>
                <span className="form-label">Date & time</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatDateTime(event.start_at)}
                  {event.end_at && ` – ${formatDateTime(event.end_at)}`}
                </div>
              </div>
            </div>
            <div className="meta-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              <MapPin size={18} color="var(--magenta)" />
              <div>
                <span className="form-label">Venue</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{event.venue}</div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ marginBottom: '0.7rem' }}>About this night</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {event.description || 'No detailed description provided for this event.'}
            </p>
          </div>

          <div className="guarantee-note">
            <ShieldCheck size={22} color="var(--success)" style={{ flexShrink: 0 }} />
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Instant confirmation.</strong> Seats are reserved
              atomically — you will not share the last ticket with another checkout.
            </span>
          </div>
        </div>

        <div className="checkout-sticky">
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
