import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, ShieldCheck, Zap, Compass, ArrowRight } from 'lucide-react'
import { eventService } from '../services/events'
import EventCard from '../components/EventCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Landing() {
  const [featuredEvents, setFeaturedEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const data = await eventService.getEvents({ per_page: 3 })
        setFeaturedEvents(data.events || [])
      } catch (err) {
        console.error('Failed to load featured events', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFeatured()
  }, [])

  return (
    <div>
      <section className="hero-frame">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-kicker">
              <Ticket size={14} /> Live inventory · instant confirmation
            </div>
            <h1>Get in. Keep your seat.</h1>
            <p>
              Browse nights, rooms, and stages — then lock tickets before they vanish.
              Every reservation is confirmed in one shot, even when the room is packed.
            </p>
            <div className="hero-actions">
              <Link to="/events" className="btn btn-primary btn-lg">
                <Compass size={18} /> Browse events <ArrowRight size={18} />
              </Link>
              <Link to="/register" className="btn btn-secondary btn-lg">
                Create a free account
              </Link>
            </div>
          </div>

          <aside className="hero-ticket" aria-hidden="true">
            <span className="hero-kicker" style={{ marginBottom: '0.4rem' }}>
              Admit one
            </span>
            <h3>Night of the Marquee</h3>
            <p>Doors 8:00 · Row C · Seat held until you confirm</p>
            <div className="hero-ticket-perforation" />
            <div className="hero-ticket-code">EF–LIVE–001</div>
          </aside>
        </div>
      </section>

      <div className="page-wrap page-stack">
        <section className="proof-strip">
          <div className="glass-card proof-item">
            <ShieldCheck size={22} color="var(--gold)" />
            <h3>No oversell</h3>
            <p>Inventory is locked per ticket tier so two checkouts cannot take the same last seat.</p>
          </div>
          <div className="glass-card proof-item">
            <Zap size={22} color="var(--magenta)" />
            <h3>Instant ticket</h3>
            <p>Payment is simulated and settled on the spot. You leave with a printable voucher.</p>
          </div>
          <div className="glass-card proof-item">
            <Ticket size={22} color="var(--gold)" />
            <h3>Your night, your stub</h3>
            <p>Keep a reference code, line items, and a receipt you can reprint anytime.</p>
          </div>
        </section>

        <section className="page-stack">
          <div className="section-heading">
            <div>
              <h2>On the marquee</h2>
              <p>Upcoming nights you can claim right now.</p>
            </div>
            <Link to="/events" className="btn btn-outline btn-sm">
              All events <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading upcoming events..." />
          ) : featuredEvents.length === 0 ? (
            <div className="glass-card empty-state">
              <Ticket size={40} color="var(--gold)" />
              <h3>Nothing billed yet</h3>
              <p>Check back soon, or sign in as an organizer to publish the first night.</p>
              <Link to="/login" className="btn btn-primary btn-sm">
                Sign in
              </Link>
            </div>
          ) : (
            <div className="grid-cards">
              {featuredEvents.map((evt) => (
                <EventCard key={evt.id} event={evt} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
