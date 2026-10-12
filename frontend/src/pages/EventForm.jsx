import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { eventService } from '../services/events'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'

export default function EventForm() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    title: '',
    venue: '',
    description: '',
    start_at: '',
    end_at: '',
    status: 'draft',
  })
  const [loading, setLoading] = useState(isEditing)
  const [formErrors, setFormErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isEditing) {
      async function loadEvent() {
        try {
          const data = await eventService.getEventById(id)
          const evt = data.event
          const formatForInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')
          setFormData({
            title: evt.title || '',
            venue: evt.venue || '',
            description: evt.description || '',
            start_at: formatForInput(evt.start_at),
            end_at: formatForInput(evt.end_at),
            status: evt.status || 'draft',
          })
        } catch (err) {
          setServerError('Failed to load event data for editing.')
        } finally {
          setLoading(false)
        }
      }
      loadEvent()
    }
  }, [id, isEditing])

  const validate = () => {
    const errors = {}
    if (!formData.title.trim()) errors.title = 'Title is required.'
    if (!formData.venue.trim()) errors.venue = 'Venue location is required.'
    if (!formData.start_at) errors.start_at = 'Start date and time is required.'
    if (formData.start_at && formData.end_at) {
      if (new Date(formData.end_at) <= new Date(formData.start_at)) {
        errors.end_at = 'End time must be after the start time.'
      }
    }
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = validate()
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    setServerError(null)

    const payload = {
      title: formData.title.trim(),
      venue: formData.venue.trim(),
      description: formData.description.trim(),
      start_at: new Date(formData.start_at).toISOString(),
      end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
      status: formData.status,
    }

    try {
      if (isEditing) {
        await eventService.updateEvent(id, payload)
        navigate('/admin/events')
      } else {
        const created = await eventService.createEvent(payload)
        const newEventId = created.event?.id
        navigate(`/admin/events/${newEventId}/tickets`)
      }
    } catch (err) {
      const resp = err?.response?.data
      if (resp?.details) {
        const detailList = Object.entries(resp.details)
          .map(([f, msgs]) => `${f}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ')
        setServerError(`Validation error (${detailList})`)
      } else {
        setServerError(
          resp?.message ||
            resp?.error ||
            'Failed to save event. Please check input values.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <LoadingSpinner message="Loading event configuration..." />
      </div>
    )
  }

  return (
    <div className="page-wrap">
      <div className="narrow-wrap page-stack">
        <Link to="/admin/events" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
          <ArrowLeft size={16} /> Back to events
        </Link>

        <div className="glass-card">
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.85rem', marginBottom: '0.35rem' }}>
              {isEditing ? 'Edit event' : 'New event'}
            </h1>
            <p>
              {isEditing
                ? 'Update the listing, schedule, or publishing status.'
                : 'Set the basics. Ticket tiers come next.'}
            </p>
          </div>

          {serverError && <ErrorMessage message={serverError} />}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                type="text"
                className="form-input"
                placeholder="Night of the Marquee"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.title && <span className="form-error">{formErrors.title}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="venue">
                Venue
              </label>
              <input
                id="venue"
                type="text"
                className="form-input"
                placeholder="Grand Hall or livestream"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                disabled={isSubmitting}
              />
              {formErrors.venue && <span className="form-error">{formErrors.venue}</span>}
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="start_at">
                  Starts
                </label>
                <input
                  id="start_at"
                  type="datetime-local"
                  className="form-input"
                  value={formData.start_at}
                  onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                  disabled={isSubmitting}
                />
                {formErrors.start_at && <span className="form-error">{formErrors.start_at}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="end_at">
                  Ends (optional)
                </label>
                <input
                  id="end_at"
                  type="datetime-local"
                  className="form-input"
                  value={formData.end_at}
                  onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                  disabled={isSubmitting}
                />
                {formErrors.end_at && <span className="form-error">{formErrors.end_at}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className="form-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={isSubmitting}
              >
                <option value="draft">Draft (hidden)</option>
                <option value="published">Published (live)</option>
                {isEditing && <option value="cancelled">Cancelled</option>}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                className="form-textarea"
                rows={5}
                placeholder="Lineup, doors, what to bring..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-actions">
              <Link to="/admin/events" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                <Save size={16} /> {isSubmitting ? 'Saving...' : isEditing ? 'Save changes' : 'Continue to tiers'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
