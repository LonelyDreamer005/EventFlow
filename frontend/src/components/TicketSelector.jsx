import React, { useState } from 'react'
import { Plus, Minus, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'

export default function TicketSelector({
  ticketTypes = [],
  onBook,
  isSubmitting = false,
  isAuthenticated = false,
}) {
  const [quantities, setQuantities] = useState({})

  const handleQuantityChange = (ticketTypeId, maxAvailable, maxPerBooking, delta) => {
    const current = quantities[ticketTypeId] || 0
    const limit = Math.min(maxAvailable, maxPerBooking || 10)
    const next = Math.max(0, Math.min(limit, current + delta))
    setQuantities({ ...quantities, [ticketTypeId]: next })
  }

  const selectedItems = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
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
    onBook(
      selectedItems.map((item) => ({
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
      })),
    )
  }

  return (
    <div className="glass-card page-stack" style={{ gap: '1.25rem' }}>
      <div className="row-between">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
          <ShoppingBag size={18} color="var(--gold)" /> Select tickets
        </h3>
      </div>

      {ticketTypes.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '1.5rem 0' }}>No ticket tiers are available yet.</p>
      ) : (
        <div className="page-stack" style={{ gap: '0.75rem' }}>
          {ticketTypes.map((type) => {
            const isSoldOut = type.available <= 0
            const qty = quantities[type.id] || 0
            const maxAllowed = Math.min(type.available, type.max_per_booking || 10)

            return (
              <div key={type.id} className={`tier-row ${isSoldOut ? 'is-sold' : ''}`}>
                <div>
                  <div className="row-between" style={{ marginBottom: '0.25rem' }}>
                    <h4>{type.name}</h4>
                    {isSoldOut ? (
                      <span className="badge badge-danger">Sold out</span>
                    ) : type.available <= 5 ? (
                      <span className="badge badge-warning">Only {type.available} left</span>
                    ) : (
                      <span className="badge badge-success">{type.available} available</span>
                    )}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gold)' }}>
                    {formatCurrency(type.price)}
                    <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                      / ticket · max {type.max_per_booking || 10}
                    </span>
                  </div>
                </div>

                {!isSoldOut ? (
                  <div className="qty-stepper">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleQuantityChange(type.id, type.available, type.max_per_booking, -1)}
                      disabled={qty <= 0 || isSubmitting}
                      aria-label={`Decrease ${type.name}`}
                    >
                      <Minus size={15} />
                    </button>
                    <span className="qty-value">{qty}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleQuantityChange(type.id, type.available, type.max_per_booking, 1)}
                      disabled={qty >= maxAllowed || isSubmitting}
                      aria-label={`Increase ${type.name}`}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 700 }}>Unavailable</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalTickets > 0 && (
        <div className="order-summary">
          <div className="row-between">
            <span style={{ color: 'var(--text-secondary)' }}>Tickets selected</span>
            <strong>{totalTickets}</strong>
          </div>
          {selectedItems.map((item) => (
            <div key={item.ticket_type_id} className="line-list-row">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
          <div className="row-between" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.7rem' }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--gold)' }}>
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleCheckout} disabled={isSubmitting}>
            {isSubmitting
              ? 'Securing your seats...'
              : isAuthenticated
                ? `Confirm · ${formatCurrency(totalAmount)}`
                : 'Sign in to complete'}
          </button>
          <p style={{ fontSize: '0.78rem', textAlign: 'center', margin: 0 }}>
            Simulated payment · seats locked on confirm
          </p>
        </div>
      )}
    </div>
  )
}
