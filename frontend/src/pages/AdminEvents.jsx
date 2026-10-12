import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Edit3, Ticket, AlertTriangle, Eye, Calendar, MapPin, XCircle } from 'lucide-react'
import { eventService } from '../services/events'
import { formatDateTime } from '../utils/formatters'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import ConfirmModal from '../components/ConfirmModal'
import Pagination from '../components/Pagination'

export default function AdminEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 })

  const [selectedEventToCancel, setSelectedEventToCancel] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [actionError, setActionError] = useState(null)

  const loadEvents = async (currPage = 1) => {
    setLoading(true)
    setError(null)
    try {
      // Backend events list will return drafts & published for admin
      const data = await eventService.getEvents({ page: currPage, per_page: 10 })
      setEvents(data.events || [])
      setPagination(data.pagination || { page: currPage, total_pages: 1, total: data.events?.length || 0 })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents(page)
  }, [page])

  const handlePublish = async (eventId) => {
    setActionError(null)
    try {
      await eventService.updateEvent(eventId, { status: 'published' })
      await loadEvents(page)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to publish event.')
    }
  }

  const handleCancelEvent = async () => {
    if (!selectedEventToCancel) return
    setIsCancelling(true)
    setActionError(null)
    try {
      await eventService.cancelEvent(selectedEventToCancel.id)
      setSelectedEventToCancel(null)
      await loadEvents(page)
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to cancel event.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h1>Manage Events</h1>
          <p className="page-subtitle">Create, configure, publish, and oversee event ticketing</p>
        </div>

        <Link to="/admin/events/new" className="btn btn-primary" style={{ gap: '0.4rem' }}>
          <PlusCircle size={17} /> Create New Event
        </Link>
      </div>

      {actionError && <ErrorMessage message={actionError} />}
      {error && <ErrorMessage error={error} onRetry={() => loadEvents(page)} />}

      {loading ? (
        <LoadingSpinner message="Loading events..." />
      ) : events.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-secondary)' }}>
          <Calendar size={44} color="var(--cyan)" style={{ marginBottom: '1rem' }} />
          <h3>No Events Created Yet</h3>
          <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Get started by creating your first event listing and defining ticket tiers.
          </p>
          <Link to="/admin/events/new" className="btn btn-primary btn-sm">
            <PlusCircle size={15} /> Create First Event
          </Link>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.925rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Title & Venue</th>
                <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Tiers</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((evt) => (
                <tr
                  key={evt.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                      {evt.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                      <MapPin size={12} /> {evt.venue}
                    </div>
                  </td>

                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {formatDateTime(evt.start_at)}
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <StatusBadge status={evt.status} />
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <Link
                      to={`/admin/events/${evt.id}/tickets`}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.35rem 0.75rem', gap: '0.35rem' }}
                    >
                      <Ticket size={14} color="var(--cyan)" />
                      Manage Tiers ({evt.ticket_types?.length || 0})
                    </Link>
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Link
                        to={`/events/${evt.id}`}
                        className="btn btn-secondary btn-sm"
                        title="View Public Event Page"
                        style={{ padding: '0.4rem' }}
                      >
                        <Eye size={15} />
                      </Link>

                      <Link
                        to={`/admin/events/${evt.id}/edit`}
                        className="btn btn-secondary btn-sm"
                        title="Edit Event"
                        style={{ padding: '0.4rem' }}
                      >
                        <Edit3 size={15} />
                      </Link>

                      {evt.status === 'draft' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handlePublish(evt.id)}
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }}
                        >
                          Publish
                        </button>
                      )}

                      {evt.status !== 'cancelled' && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          title="Cancel Event"
                          onClick={() => setSelectedEventToCancel(evt)}
                          style={{ padding: '0.4rem' }}
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}

      {/* Cancel Event Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(selectedEventToCancel)}
        title="Cancel Entire Event?"
        message={`Are you sure you want to cancel "${selectedEventToCancel?.title}"? The event will no longer be bookable.`}
        confirmText="Confirm Event Cancellation"
        cancelText="Keep Event"
        isDanger={true}
        isLoading={isCancelling}
        onConfirm={handleCancelEvent}
        onCancel={() => setSelectedEventToCancel(null)}
      />
    </div>
  )
}
