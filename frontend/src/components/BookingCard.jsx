import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Hash, ArrowRight, XCircle, User } from 'lucide-react'
import { formatDateTime, formatCurrency } from '../utils/formatters'
import StatusBadge from './StatusBadge'
import ConfirmModal from './ConfirmModal'

export default function BookingCard({ booking, onCancelSuccess }) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  if (!booking) return null

  const isConfirmed = booking.status === 'confirmed'
  const items = booking.items || []
  const eventTitle = booking.event_title || items[0]?.ticket_type?.event?.title || 'Event Admission'
  const attendeeName = booking.user_name || booking.user?.name

  const handleConfirmCancel = async () => {
    setIsCancelling(true)
    setCancelError(null)
    try {
      if (onCancelSuccess) {
        await onCancelSuccess(booking.id)
      }
      setIsCancelModalOpen(false)
    } catch (err) {
      setCancelError(err?.response?.data?.message || err?.message || 'Failed to cancel booking.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="glass-card booking-card-body">
      <div className="row-between">
        <div className="meta-row" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
          <Hash size={15} color="var(--gold)" />
          {booking.reference}
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
          {eventTitle}
        </h3>
        {attendeeName && (
          <div className="meta-row" style={{ fontSize: '0.84rem', color: 'var(--gold-soft)' }}>
            <User size={13} />
            <span>Attendee: <strong style={{ color: 'var(--text-primary)' }}>{attendeeName}</strong></span>
          </div>
        )}
      </div>

      <div className="meta-row">
        <Calendar size={14} />
        <span>Booked {formatDateTime(booking.created_at)}</span>
      </div>

      <div className="line-list">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="line-list-row">
            <span>
              {item.ticket_type_name || item.ticket_type?.name || 'Standard'} × {item.quantity}
            </span>
            <span>{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
        <div className="line-list-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
          <strong>Total</strong>
          <strong style={{ color: 'var(--gold)' }}>{formatCurrency(booking.total_amount)}</strong>
        </div>
      </div>

      <div className="row-between">
        <Link to={`/bookings/${booking.id}`} className="btn btn-secondary btn-sm">
          Open stub <ArrowRight size={13} />
        </Link>
        {isConfirmed && (
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setIsCancelModalOpen(true)}>
            <XCircle size={14} /> Cancel
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={isCancelModalOpen}
        title="Cancel this reservation?"
        message={`Cancel booking ${booking.reference}? Tickets return to inventory.`}
        confirmText="Yes, cancel"
        cancelText="Keep reservation"
        isDanger
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setIsCancelModalOpen(false)}
      />

      {cancelError && <p className="form-error">{cancelError}</p>}
    </div>
  )
}
