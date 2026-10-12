import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, ArrowRight } from 'lucide-react'
import { formatDateTime, formatCurrency, truncate } from '../utils/formatters'
import StatusBadge from './StatusBadge'
import EventCover from './EventCover'

export default function EventCard({ event }) {
  if (!event) return null

  const ticketTypes = event.ticket_types || []
  const prices = ticketTypes.map((t) => parseFloat(t.price)).filter((p) => !isNaN(p))
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null
  const totalAvailable = ticketTypes.reduce((acc, t) => acc + (t.available || 0), 0)

  return (
    <article className="poster-card">
      <EventCover event={event} size="card" />
      <div className="poster-card-body">
        <div className="row-between">
          <StatusBadge status={event.status} />
          {totalAvailable > 0 ? (
            <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 700 }}>
              {totalAvailable} left
            </span>
          ) : ticketTypes.length > 0 ? (
            <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 700 }}>Sold out</span>
          ) : null}
        </div>

        <h3 className="poster-card-title">
          <Link to={`/events/${event.id}`} style={{ color: 'inherit' }}>
            {event.title}
          </Link>
        </h3>

        <p style={{ fontSize: '0.9rem', flex: 1 }}>{truncate(event.description, 90)}</p>

        <div className="meta-row">
          <Calendar size={14} color="var(--gold)" />
          <span>{formatDateTime(event.start_at)}</span>
        </div>
        <div className="meta-row">
          <MapPin size={14} color="var(--magenta)" />
          <span>{event.venue}</span>
        </div>

        <div className="poster-card-footer">
          <div className="price-from">
            <span>From</span>
            <strong>{lowestPrice !== null ? formatCurrency(lowestPrice) : 'Free'}</strong>
          </div>
          <Link to={`/events/${event.id}`} className="btn btn-outline btn-sm">
            View <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  )
}
