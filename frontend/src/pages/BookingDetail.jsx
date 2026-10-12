import React, { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Printer, CheckCircle2, XCircle, User, MapPin, Tag } from 'lucide-react'
import { bookingService } from '../services/bookings'
import { formatDateTime, formatCurrency } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import ConfirmModal from '../components/ConfirmModal'

export default function BookingDetail() {
  const { id } = useParams()
  const location = useLocation()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  const isNewlyCreated = location.state?.newBookingSuccess

  const loadBooking = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await bookingService.getBookingById(id)
      setBooking(data.booking)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooking()
  }, [id])

  const handleConfirmCancel = async () => {
    setIsCancelling(true)
    setCancelError(null)
    try {
      await bookingService.cancelBooking(id)
      setIsCancelModalOpen(false)
      await loadBooking()
    } catch (err) {
      setCancelError(err?.response?.data?.message || err?.message || 'Failed to cancel reservation.')
    } finally {
      setIsCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <LoadingSpinner message="Retrieving your stub..." />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="page-wrap">
        <Link to="/bookings" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to tickets
        </Link>
        <ErrorMessage error={error || 'Booking receipt not found.'} onRetry={loadBooking} />
      </div>
    )
  }

  const isConfirmed = booking.status === 'confirmed'
  const items = booking.items || []
  const eventTitle = booking.event_title || items[0]?.ticket_type?.event?.title || 'Event Admission'
  const eventVenue = booking.event_venue || items[0]?.ticket_type?.event?.venue
  const attendeeName = booking.user_name || booking.user?.name || 'Valued Guest'
  const attendeeEmail = booking.user_email || booking.user?.email

  return (
    <div className="page-wrap">
      <div className="narrow-wrap page-stack">
        <div className="row-between no-print">
          <Link to="/bookings" className="btn btn-secondary btn-sm">
            <ArrowLeft size={16} /> Back to tickets
          </Link>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <Printer size={16} /> Print stub
          </button>
        </div>

        {isNewlyCreated && (
          <div className="alert alert-success no-print">
            <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#fff' }}>You&apos;re in.</strong>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Seats locked. Reference {booking.reference}.
              </p>
            </div>
          </div>
        )}

        <div className="ticket-stub">
          <div className="row-between">
            <span className="form-label" style={{ color: '#8a7764', fontWeight: 600 }}>
              Admit One · Official EventFlow Stub
            </span>
            <StatusBadge status={booking.status} />
          </div>

          <div style={{ marginTop: '0.75rem', marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1a120c', margin: 0, lineHeight: 1.25 }}>
              {eventTitle}
            </h2>
            {eventVenue && (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#68594d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} color="#8a7764" /> {eventVenue}
              </p>
            )}
          </div>

          <div className="ticket-ref">{booking.reference}</div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(26, 18, 12, 0.06)',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              margin: '0.8rem 0',
              fontSize: '0.9rem',
              color: '#2a1e15',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={15} color="#8a7764" />
              <span>Ticket Holder:</span>
              <strong style={{ color: '#1a120c' }}>{attendeeName}</strong>
            </div>
            {attendeeEmail && (
              <span style={{ fontSize: '0.82rem', color: '#7a6a5a' }}>({attendeeEmail})</span>
            )}
          </div>

          <p style={{ margin: '0.2rem 0', fontSize: '0.84rem' }}>Booked {formatDateTime(booking.created_at)}</p>

          <div className="ticket-perforation" />

          {items.map((item, idx) => (
            <div key={item.id || idx} className="ticket-line">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Tag size={13} color="#8a7764" />
                  <strong>{item.ticket_type_name || item.ticket_type?.name || 'General Admission'}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#7a6a5a', marginLeft: '1.2rem' }}>
                  {formatCurrency(item.unit_price)} × {item.quantity}
                </div>
              </div>
              <strong>{formatCurrency(item.subtotal)}</strong>
            </div>
          ))}

          <div className="ticket-total">
            <span>Total settled</span>
            <span style={{ fontSize: '1.7rem' }}>{formatCurrency(booking.total_amount)}</span>
          </div>
          <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Simulated instant settlement</p>
        </div>

        {isConfirmed && (
          <div className="ticket-actions no-print">
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              Need to cancel? Tickets return to public inventory immediately.
            </p>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setIsCancelModalOpen(true)}>
              <XCircle size={15} /> Cancel booking
            </button>
          </div>
        )}

        {cancelError && <ErrorMessage message={cancelError} />}
      </div>

      <ConfirmModal
        isOpen={isCancelModalOpen}
        title="Cancel this stub?"
        message={`Release voucher ${booking.reference}? Seats go back on sale immediately.`}
        confirmText="Cancel booking"
        cancelText="Keep tickets"
        isDanger
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setIsCancelModalOpen(false)}
      />
    </div>
  )
}
