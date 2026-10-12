import React, { useState } from 'react'
import { Plus, Minus, ShoppingBag, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

export default function TicketSelector({
  ticketTypes = [],
  onBook,
  isSubmitting = false,
  isAuthenticated = false,
}) {
  // quantities state: { [ticket_type_id]: number }
  const [quantities, setQuantities] = useState({})

  const handleQuantityChange = (ticketTypeId, maxAvailable, maxPerBooking, delta) => {
    const current = quantities[ticketTypeId] || 0
    const limit = Math.min(maxAvailable, maxPerBooking || 10)
    const next = Math.max(0, Math.min(limit, current + delta))
    setQuantities({ ...quantities, [ticketTypeId]: next })
  }

  // Calculate order items and total amount
  const selectedItems = Object.entries(quantities)
    .filter(([_, qty]) => qty > 0)
    .map(([idStr, qty]) => {
      const type = ticketTypes.find((t) => t.id === parseInt(idStr, 10))
      return {
        ticket_type_id: parseInt(idStr, 10),
        name: type?.name || 'Ticket',
        unit_price: parseFloat(type?.price || 0),
        quantity: qty,
        subtotal: parseFloat(type?.price || 0) * qty,
      }
    })

  const totalTickets = selectedItems.reduce((acc, item) => acc + item.quantity, 0)
  const totalAmount = selectedItems.reduce((acc, item) => acc + item.subtotal, 0)

  const handleCheckout = () => {
    if (totalTickets === 0) return
    onBook(selectedItems.map((item) => ({
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
    })))
  }

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag size={20} color="var(--cyan)" /> Select Tickets
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Inventory checked in real-time
        </span>
      </div>

      {ticketTypes.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No ticket tiers are currently available for this event.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {ticketTypes.map((type) => {
            const isSoldOut = type.available <= 0
            const qty = quantities[type.id] || 0
            const maxAllowed = Math.min(type.available, type.max_per_booking || 10)

            return (
              <div
                key={type.id}
                style={{
                  background: isSoldOut ? 'rgba(255, 255, 255, 0.02)' : 'var(--bg-glass-strong)',
                  border: isSoldOut ? '1px solid var(--border-subtle)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  opacity: isSoldOut ? 0.6 : 1,
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{type.name}</h4>
                    {isSoldOut ? (
                      <span className="badge badge-danger">Sold Out</span>
                    ) : type.available <= 5 ? (
                      <span className="badge badge-warning">Only {type.available} left!</span>
                    ) : (
                      <span className="badge badge-success">{type.available} available</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cyan)', marginTop: '0.25rem' }}>
                    {formatCurrency(type.price)}
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      / ticket (max {type.max_per_booking || 10})
                    </span>
                  </div>
                </div>

                {/* Quantity Stepper */}
                {!isSoldOut ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleQuantityChange(type.id, type.available, type.max_per_booking, -1)}
                      disabled={qty <= 0 || isSubmitting}
                      style={{ width: '34px', height: '34px', padding: 0 }}
                    >
                      <Minus size={15} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: '24px', textAlign: 'center' }}>
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleQuantityChange(type.id, type.available, type.max_per_booking, 1)}
                      disabled={qty >= maxAllowed || isSubmitting}
                      style={{ width: '34px', height: '34px', padding: 0 }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 600 }}>
                    Unavailable
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Booking Summary Box */}
      {totalTickets > 0 && (
        <div
          style={{
            background: 'var(--brand-gradient-subtle)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            marginTop: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tickets selected:</span>
            <span style={{ fontWeight: 600 }}>{totalTickets}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total (Simulated Payment):</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--cyan)' }}>
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleCheckout}
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {isSubmitting ? (
              'Securing Reservation...'
            ) : isAuthenticated ? (
              `Confirm & Reserve (${formatCurrency(totalAmount)})`
            ) : (
              'Sign In to Complete Booking'
            )}
          </button>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
             Atomic inventory lock acquired during transaction.
          </p>
        </div>
      )}
    </div>
  )
}
