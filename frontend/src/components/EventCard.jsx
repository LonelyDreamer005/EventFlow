import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Tag, ArrowRight } from 'lucide-react'
import { formatDateTime, formatCurrency, truncate } from '../utils/formatters'
import StatusBadge from './StatusBadge'

export default function EventCard({ event }) {
  if (!event) return null

  // Calculate lowest ticket price
  const ticketTypes = event.ticket_types || []
  const prices = ticketTypes.map((t) => parseFloat(t.price)).filter((p) => !isNaN(p))
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null
  const totalAvailable = ticketTypes.reduce((acc, t) => acc + (t.available || 0), 0)

  return (
    <div className="glass-card glass-card-interactive" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top Banner & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <StatusBadge status={event.status} />
        {totalAvailable > 0 ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
            {totalAvailable} tickets remaining
          </span>
        ) : ticketTypes.length > 0 ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
            Sold Out
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: '1.35rem', marginBottom: '0.65rem' }}>
        <Link
          to={`/events/${event.id}`}
          style={{
            color: 'var(--text-primary)',
            transition: 'color var(--transition-fast)',
          }}
        >
          {event.title}
        </Link>
      </h3>

      {/* Description Snippet */}
      <p style={{ fontSize: '0.925rem', marginBottom: '1.25rem', flex: 1 }}>
        {truncate(event.description, 110)}
      </p>

      {/* Meta: Venue & Date */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '0.9rem 0',
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={15} color="var(--cyan)" />
          <span>{formatDateTime(event.start_at)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={15} color="var(--primary)" />
          <span>{event.venue}</span>
        </div>
      </div>

      {/* Bottom Footer: Starting Price & Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>From</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cyan)' }}>
            {lowestPrice !== null ? formatCurrency(lowestPrice) : 'Free'}
          </span>
        </div>

        <Link to={`/events/${event.id}`} className="btn btn-outline btn-sm">
          View Event <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
