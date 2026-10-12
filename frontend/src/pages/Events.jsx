import React, { useEffect, useState } from 'react'
import { Search, Compass, AlertCircle } from 'lucide-react'
import { eventService } from '../services/events'
import EventCard from '../components/EventCard'
import LoadingSpinner from '../components/LoadingSpinner'
import Pagination from '../components/Pagination'
import ErrorMessage from '../components/ErrorMessage'

export default function Events() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 })

  const fetchEvents = async (currPage = 1, query = '') => {
    setLoading(true)
    setError(null)
    try {
      const data = await eventService.getEvents({
        page: currPage,
        per_page: 9,
        search: query.trim() || undefined,
      })
      setEvents(data.events || [])
      setPagination(data.pagination || { page: currPage, total_pages: 1, total: data.events?.length || 0 })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(page, searchTerm)
  }, [page, searchTerm])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    setSearchTerm(search)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header & Search */}
      <div className="page-header">
        <div className="page-title">
          <h1>Browse Live Events</h1>
          <p className="page-subtitle">Reserve guaranteed seats for concerts, conferences, and meetups</p>
        </div>

        {/* Search input form */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '380px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by event title or venue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>
      </div>

      {error && <ErrorMessage error={error} onRetry={() => fetchEvents(page, searchTerm)} />}

      {loading ? (
        <LoadingSpinner message="Fetching events from inventory..." />
      ) : events.length === 0 ? (
        <div
          className="glass-card"
          style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-secondary)' }}
        >
          <Compass size={44} color="var(--cyan)" style={{ marginBottom: '1rem' }} />
          <h3>No Events Found</h3>
          <p style={{ marginTop: '0.5rem' }}>
            {searchTerm ? `No results matching "${searchTerm}". Try another query.` : 'There are currently no published events.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid-cards">
            {events.map((evt) => (
              <EventCard key={evt.id} event={evt} />
            ))}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </>
      )}
    </div>
  )
}
