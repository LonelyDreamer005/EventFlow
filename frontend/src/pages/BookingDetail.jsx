import React, { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Printer, CheckCircle2, XCircle } from 'lucide-react'
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
            <span className="form-label" style={{ color: '#8a7764' }}>
              Admit · EventFlow
            </span>
            <StatusBadge status={booking.status} />
          </div>
          <div className="ticket-ref">{booking.reference}</div>
          <p>Booked {formatDateTime(booking.created_at)}</p>

          <div className="ticket-perforation" />

          {items.map((item, idx) => (
            <div key={item.id || idx} className="ticket-line">
              <div>
                <strong>{item.ticket_type_name || item.ticket_type?.name || 'General Admission'}</strong>
                <div style={{ fontSize: '0.8rem', color: '#7a6a5a' }}>
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
