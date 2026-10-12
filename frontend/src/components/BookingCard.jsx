import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Hash, Tag, AlertTriangle, ArrowRight, XCircle } from 'lucide-react'
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
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header: Reference and Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'monospace', fontSize: '0.95rem' }}>
          <Hash size={16} color="var(--cyan)" />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{booking.reference}</span>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Booking Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <Calendar size={14} />
        <span>Booked on {formatDateTime(booking.created_at)}</span>
      </div>

      {/* Ticket Items Breakdown */}
      <div
        style={{
          background: 'var(--bg-glass-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1.1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Tag size={13} color="var(--primary)" />
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {item.ticket_type_name || item.ticket_type?.name || 'Standard Admission'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>× {item.quantity}</span>
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              {formatCurrency(item.subtotal)}
            </span>
          </div>
        ))}

        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '0.6rem',
            marginTop: '0.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Total Paid:</span>
          <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--cyan)' }}>
            {formatCurrency(booking.total_amount)}
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        <Link to={`/bookings/${booking.id}`} className="btn btn-secondary btn-sm">
          View Receipt <ArrowRight size={13} />
        </Link>

        {isConfirmed && (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setIsCancelModalOpen(true)}
          >
            <XCircle size={14} /> Cancel Booking
          </button>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        title="Cancel This Reservation?"
        message={`Are you sure you want to cancel booking #${booking.reference}? Your reserved tickets will be atomically restored to available event inventory.`}
        confirmText="Yes, Cancel Booking"
        cancelText="Keep Reservation"
        isDanger={true}
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setIsCancelModalOpen(false)}
      />

      {cancelError && (
        <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {cancelError}
        </p>
      )}
    </div>
  )
}
