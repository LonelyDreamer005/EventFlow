import React, { useEffect, useState } from 'react'
import { Search, Compass } from 'lucide-react'
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
    <div className="page-wrap page-stack">
      <div className="page-header">
        <div className="page-title">
          <h1>What&apos;s on</h1>
          <p className="page-subtitle">Find a night, claim a seat, walk in with a stub.</p>
        </div>
      </div>

      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit}>
          <div className="search-field">
            <Search size={18} />
            <input
              type="search"
              className="form-input"
              placeholder="Search title or venue"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            Search
          </button>
        </form>
      </div>

      {error && <ErrorMessage error={error} onRetry={() => fetchEvents(page, searchTerm)} />}

      {loading ? (
        <LoadingSpinner message="Pulling the marquee..." />
      ) : events.length === 0 ? (
        <div className="glass-card empty-state">
          <Compass size={44} color="var(--gold)" />
          <h3>No events found</h3>
          <p>
            {searchTerm
              ? `Nothing matches “${searchTerm}”. Try another search.`
              : 'There are no published events yet.'}
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
