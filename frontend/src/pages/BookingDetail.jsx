import React, { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Printer, CheckCircle2, Hash, Calendar, MapPin, Tag, XCircle, AlertCircle } from 'lucide-react'
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
    return <LoadingSpinner message="Retrieving booking receipt..." />
  }

  if (error || !booking) {
    return (
      <div>
        <Link to="/bookings" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to My Bookings
        </Link>
        <ErrorMessage error={error || 'Booking receipt not found.'} onRetry={loadBooking} />
      </div>
    )
  }

  const isConfirmed = booking.status === 'confirmed'
  const items = booking.items || []

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Back button and Print Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/bookings" className="btn btn-secondary btn-sm" style={{ gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to My Bookings
        </Link>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => window.print()}
          style={{ gap: '0.4rem' }}
        >
          <Printer size={16} /> Print Receipt
        </button>
      </div>

      {/* Instant Success Banner if just booked */}
      {isNewlyCreated && (
        <div
          style={{
            background: 'var(--success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            color: 'var(--success)',
          }}
        >
          <CheckCircle2 size={24} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>Reservation Confirmed!</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Your tickets have been safely locked and secured. Reference code: <strong>{booking.reference}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Main Receipt Card */}
      <div
        className="glass-card"
        style={{
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          position: 'relative',
        }}
      >
        {/* Receipt Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1.5rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Booking Confirmation Voucher
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              <Hash size={20} color="var(--cyan)" />
              <h2 style={{ fontSize: '1.65rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                {booking.reference}
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Booked on {formatDateTime(booking.created_at)}
            </p>
          </div>

          <StatusBadge status={booking.status} />
        </div>

        {/* Itemized Tickets Table */}
        <div>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Ticket Items Breakdown
          </h3>

          <div
            style={{
              background: 'var(--bg-glass-strong)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderBottom: idx < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  fontSize: '0.95rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.ticket_type_name || item.ticket_type?.name || 'General Admission'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatCurrency(item.unit_price)} × {item.quantity} ticket{item.quantity > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--cyan)' }}>
                  {formatCurrency(item.subtotal)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--brand-gradient-subtle)',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-highlight)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Payment Method</span>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Simulated Instant Settlement
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Paid</span>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--cyan)' }}>
              {formatCurrency(booking.total_amount)}
            </div>
          </div>
        </div>

        {/* Actions & Cancellation */}
        {isConfirmed && (
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Need to cancel? Tickets will be returned to the event's public inventory.
            </p>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setIsCancelModalOpen(true)}
            >
              <XCircle size={15} /> Cancel Booking
            </button>
          </div>
        )}
      </div>

      {cancelError && <ErrorMessage message={cancelError} />}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        title="Cancel Booking Reservation"
        message={`Confirm cancellation of voucher #${booking.reference}? All tickets will be immediately released back to the event pool.`}
        confirmText="Confirm Cancellation"
        cancelText="Keep Booking"
        isDanger={true}
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setIsCancelModalOpen(false)}
      />
    </div>
  )
}
