import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Edit3, Ticket, Eye, Calendar, MapPin, XCircle } from 'lucide-react'
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

  const rowActions = (evt) => (
    <div className="action-cluster">
      <Link to={`/events/${evt.id}`} className="btn btn-secondary btn-sm" title="View public page">
        <Eye size={15} />
      </Link>
      <Link to={`/admin/events/${evt.id}/edit`} className="btn btn-secondary btn-sm" title="Edit">
        <Edit3 size={15} />
      </Link>
      {evt.status === 'draft' && (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => handlePublish(evt.id)}>
          Publish
        </button>
      )}
      {evt.status !== 'cancelled' && (
        <button
          type="button"
          className="btn btn-danger btn-sm"
          title="Cancel event"
          onClick={() => setSelectedEventToCancel(evt)}
        >
          <XCircle size={15} />
        </button>
      )}
    </div>
  )

  return (
    <div className="page-wrap page-stack">
      <div className="page-header">
        <div className="page-title">
          <h1>Manage events</h1>
          <p className="page-subtitle">Draft, publish, and keep inventory honest.</p>
        </div>
        <Link to="/admin/events/new" className="btn btn-primary">
          <PlusCircle size={17} /> New event
        </Link>
      </div>

      {actionError && <ErrorMessage message={actionError} />}
      {error && <ErrorMessage error={error} onRetry={() => loadEvents(page)} />}

      {loading ? (
        <LoadingSpinner message="Loading events..." />
      ) : events.length === 0 ? (
        <div className="glass-card empty-state">
          <Calendar size={44} color="var(--gold)" />
          <h3>No events yet</h3>
          <p>Create a listing, add ticket tiers, then publish to the marquee.</p>
          <Link to="/admin/events/new" className="btn btn-primary btn-sm">
            <PlusCircle size={15} /> Create first event
          </Link>
        </div>
      ) : (
        <div className="glass-card">
          <div className="data-table-wrap stack-on-mobile">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title & venue</th>
                  <th>When</th>
                  <th>Status</th>
                  <th>Tiers</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.id}>
                    <td data-label="Event">
                      <div style={{ fontWeight: 700 }}>{evt.title}</div>
                      <div className="meta-row" style={{ marginTop: '0.2rem', fontSize: '0.8rem' }}>
                        <MapPin size={12} /> {evt.venue}
                      </div>
                    </td>
                    <td data-label="When">{formatDateTime(evt.start_at)}</td>
                    <td data-label="Status">
                      <StatusBadge status={evt.status} />
                    </td>
                    <td data-label="Tiers">
                      <Link to={`/admin/events/${evt.id}/tickets`} className="btn btn-secondary btn-sm">
                        <Ticket size={14} /> Tiers ({evt.ticket_types?.length || 0})
                      </Link>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      {rowActions(evt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(selectedEventToCancel)}
        title="Cancel this event?"
        message={`Cancel “${selectedEventToCancel?.title}”? It will no longer be bookable.`}
        confirmText="Cancel event"
        cancelText="Keep event"
        isDanger
        isLoading={isCancelling}
        onConfirm={handleCancelEvent}
        onCancel={() => setSelectedEventToCancel(null)}
      />
    </div>
  )
}
