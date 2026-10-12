import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save, Calendar, MapPin, FileText, CheckCircle2 } from 'lucide-react'
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
          // Format ISO strings to datetime-local input value (YYYY-MM-DDTHH:mm)
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

    // Convert local datetime input to UTC ISO string
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
        // Take them directly to ticket tiers management
        navigate(`/admin/events/${newEventId}/tickets`)
      }
    } catch (err) {
      setServerError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to save event. Please check input values.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading event configuration..." />
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <Link to="/admin/events" className="btn btn-secondary btn-sm" style={{ gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to Events List
        </Link>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem 2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }}>
            {isEditing ? 'Edit Event Details' : 'Create New Event'}
          </h1>
          <p style={{ fontSize: '0.925rem' }}>
            {isEditing
              ? 'Update event metadata, schedule, or publishing status'
              : 'Configure initial event metadata. You will add ticket tiers next.'}
          </p>
        </div>

        {serverError && <ErrorMessage message={serverError} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="title">
              Event Title
            </label>
            <input
              id="title"
              type="text"
              className="form-input"
              placeholder="e.g. Cloud-Native DevOps Summit 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isSubmitting}
            />
            {formErrors.title && <span className="form-error">{formErrors.title}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="venue">
              Venue Location
            </label>
            <input
              id="venue"
              type="text"
              className="form-input"
              placeholder="e.g. Grand Convention Center or Online Stream"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              disabled={isSubmitting}
            />
            {formErrors.venue && <span className="form-error">{formErrors.venue}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="start_at">
                Start Date & Time
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
                End Date & Time (Optional)
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
              Publishing Status
            </label>
            <select
              id="status"
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              disabled={isSubmitting}
            >
              <option value="draft">Draft (Hidden from Public)</option>
              <option value="published">Published (Live & Bookable)</option>
              {isEditing && <option value="cancelled">Cancelled</option>}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Event Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              rows={5}
              placeholder="Provide agenda, speakers, directions, or key event details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <Link to="/admin/events" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ gap: '0.5rem' }}>
              <Save size={16} /> {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Continue to Ticket Tiers'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
