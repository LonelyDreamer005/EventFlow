import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket, ShieldCheck, Zap, Lock, Compass, ArrowRight, BarChart2, CheckCircle2 } from 'lucide-react'
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4.5rem' }}>
      {/* Hero Section */}
      <section
        style={{
          textAlign: 'center',
          padding: '4rem 1rem 2rem',
          maxWidth: '860px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            background: 'var(--brand-gradient-subtle)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--cyan)',
          }}
        >
          <Lock size={15} /> 100% Concurrency Safe • Zero Overbooking Guarantee
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
          }}
        >
          Seamless Event Tickets with{' '}
          <span
            style={{
              background: 'var(--brand-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Rock-Solid Concurrency
          </span>
        </h1>

        <p
          style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            lineHeight: 1.6,
          }}
        >
          EventFlow combines a fluid reservation experience with PostgreSQL row-level locks,
          preventing ticket overselling even under extreme flash-sale spikes.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem' }}>
          <Link to="/events" className="btn btn-primary btn-lg" style={{ gap: '0.5rem' }}>
            <Compass size={18} /> Browse Live Events <ArrowRight size={18} />
          </Link>
          <Link to="/register" className="btn btn-secondary btn-lg">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid-cards">
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Lock size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem' }}>Pessimistic Row Locking</h3>
          <p style={{ fontSize: '0.925rem' }}>
            Powered by PostgreSQL <code style={{ color: 'var(--cyan)' }}>SELECT ... FOR UPDATE</code>.
            Concurrent bookings queue deterministically without inventory drift.
          </p>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
            }}
          >
            <Zap size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem' }}>Cloud-Native Scaling</h3>
          <p style={{ fontSize: '0.925rem' }}>
            Kubernetes Horizontal Pod Autoscaler (HPA) dynamically expands backend replicas based on CPU demand and incoming load.
          </p>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success)',
            }}
          >
            <BarChart2 size={22} />
          </div>
          <h3 style={{ fontSize: '1.2rem' }}>Real-Time Observability</h3>
          <p style={{ fontSize: '0.925rem' }}>
            Native Prometheus <code style={{ color: 'var(--cyan)' }}>/metrics</code> endpoint emitting request latency histograms, booking counts, and database health.
          </p>
        </div>
      </section>

      {/* Featured Events Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.85rem' }}>Featured Events</h2>
            <p style={{ fontSize: '0.95rem' }}>Discover and reserve tickets for upcoming events.</p>
          </div>
          <Link to="/events" className="btn btn-outline btn-sm" style={{ gap: '0.4rem' }}>
            View All Events <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading upcoming events..." />
        ) : featuredEvents.length === 0 ? (
          <div
            className="glass-card"
            style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}
          >
            <Ticket size={40} color="var(--cyan)" style={{ marginBottom: '1rem' }} />
            <h3>No Published Events Yet</h3>
            <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
              Check back soon or sign in as admin to publish the first event.
            </p>
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In as Admin
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
  )
}
