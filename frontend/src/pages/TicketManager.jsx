import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Ticket, CheckCircle2, Eye } from 'lucide-react'
import { eventService } from '../services/events'
import { formatCurrency } from '../utils/formatters'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'

export default function TicketManager() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [ticketTypes, setTicketTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [newTier, setNewTier] = useState({
    name: '',
    price: '',
    capacity: '',
    max_per_booking: 10,
  })
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const [editingTierId, setEditingTierId] = useState(null)
  const [editFormData, setEditFormData] = useState({ price: '', capacity: '' })
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [evtData, tiersData] = await Promise.all([
        eventService.getEventById(eventId),
        eventService.getTicketTypes(eventId),
      ])
      setEvent(evtData.event)
      setTicketTypes(tiersData.ticket_types || [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [eventId])

  const handleAddTier = async (e) => {
    e.preventDefault()
    if (!newTier.name.trim() || !newTier.price || !newTier.capacity) {
      setAddError('Name, price, and total capacity are required.')
      return
    }

    setIsAdding(true)
    setAddError(null)
    setActionSuccess(null)

    try {
      await eventService.createTicketType(eventId, {
        name: newTier.name.trim(),
        price: parseFloat(newTier.price),
        capacity: parseInt(newTier.capacity, 10),
        max_per_booking: parseInt(newTier.max_per_booking || 10, 10),
      })
      setNewTier({ name: '', price: '', capacity: '', max_per_booking: 10 })
      setActionSuccess('New ticket tier created.')
      await loadData()
    } catch (err) {
      setAddError(err?.response?.data?.message || 'Failed to create ticket tier.')
    } finally {
      setIsAdding(false)
    }
  }

  const startEditing = (tier) => {
    setEditingTierId(tier.id)
    setEditFormData({ price: tier.price, capacity: tier.capacity })
    setUpdateError(null)
  }

  const handleUpdateTier = async (tierId) => {
    setIsUpdating(true)
    setUpdateError(null)
    setActionSuccess(null)
    try {
      await eventService.updateTicketType(tierId, {
        price: parseFloat(editFormData.price),
        capacity: parseInt(editFormData.capacity, 10),
      })
      setEditingTierId(null)
      setActionSuccess('Ticket tier updated.')
      await loadData()
    } catch (err) {
      setUpdateError(err?.response?.data?.message || 'Failed to update ticket tier.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <LoadingSpinner message="Loading ticket tiers..." />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="page-wrap">
        <Link to="/admin/events" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to events
        </Link>
        <ErrorMessage error={error || 'Event not found.'} onRetry={loadData} />
      </div>
    )
  }

  return (
    <div className="page-wrap page-stack" style={{ maxWidth: 880 }}>
      <div className="row-between">
        <Link to="/admin/events" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> Manage events
        </Link>
        <Link to={`/events/${event.id}`} className="btn btn-outline btn-sm">
          <Eye size={15} /> Preview public page
        </Link>
      </div>

      <div className="page-title">
        <h1>Ticket tiers</h1>
        <p className="page-subtitle">
          Pricing and capacity for <strong style={{ color: 'var(--text-primary)' }}>{event.title}</strong>
        </p>
      </div>

      {actionSuccess && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} /> {actionSuccess}
        </div>
      )}

      <div className="glass-card page-stack">
        <div className="row-between">
          <h2 style={{ fontSize: '1.2rem' }}>Configured ({ticketTypes.length})</h2>
        </div>

        {updateError && <ErrorMessage message={updateError} />}

        {ticketTypes.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <Ticket size={36} color="var(--gold)" />
            <p>No tiers yet. Add one below to make this event bookable.</p>
          </div>
        ) : (
          ticketTypes.map((tier) => {
            const soldCount = tier.capacity - tier.available
            const isEditingThis = editingTierId === tier.id

            return (
              <div key={tier.id} className="tier-admin">
                <div className="row-between">
                  <div>
                    <h3 style={{ fontSize: '1.1rem' }}>{tier.name}</h3>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>Max per order: {tier.max_per_booking || 10}</p>
                  </div>
                  {!isEditingThis && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEditing(tier)}>
                      Edit quota
                    </button>
                  )}
                </div>

                {isEditingThis ? (
                  <div className="edit-tier-grid">
                    <div className="form-group tight">
                      <label className="form-label">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={editFormData.price}
                        onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                      />
                    </div>
                    <div className="form-group tight">
                      <label className="form-label">Capacity (min {soldCount})</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editFormData.capacity}
                        onChange={(e) => setEditFormData({ ...editFormData, capacity: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={isUpdating}
                        onClick={() => handleUpdateTier(tier.id)}
                      >
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingTierId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="tier-metrics">
                    <div>
                      <span className="stat-label">Price</span>
                      <strong style={{ color: 'var(--gold)', display: 'block' }}>{formatCurrency(tier.price)}</strong>
                    </div>
                    <div>
                      <span className="stat-label">Capacity</span>
                      <strong style={{ display: 'block' }}>{tier.capacity}</strong>
                    </div>
                    <div>
                      <span className="stat-label">Sold</span>
                      <strong style={{ display: 'block' }}>{soldCount}</strong>
                    </div>
                    <div>
                      <span className="stat-label">Available</span>
                      <strong style={{ display: 'block', color: tier.available > 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {tier.available}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="glass-card">
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Plus size={18} color="var(--gold)" /> Add tier
        </h2>

        {addError && <ErrorMessage message={addError} />}

        <form onSubmit={handleAddTier} className="add-tier-grid">
          <div className="form-group tight">
            <label className="form-label" htmlFor="tierName">
              Name
            </label>
            <input
              id="tierName"
              type="text"
              className="form-input"
              placeholder="VIP"
              value={newTier.name}
              onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
              disabled={isAdding}
            />
          </div>
          <div className="form-group tight">
            <label className="form-label" htmlFor="tierPrice">
              Price
            </label>
            <input
              id="tierPrice"
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              placeholder="49.99"
              value={newTier.price}
              onChange={(e) => setNewTier({ ...newTier, price: e.target.value })}
              disabled={isAdding}
            />
          </div>
          <div className="form-group tight">
            <label className="form-label" htmlFor="tierCapacity">
              Capacity
            </label>
            <input
              id="tierCapacity"
              type="number"
              min="1"
              className="form-input"
              placeholder="100"
              value={newTier.capacity}
              onChange={(e) => setNewTier({ ...newTier, capacity: e.target.value })}
              disabled={isAdding}
            />
          </div>
          <div className="form-group tight">
            <label className="form-label" htmlFor="tierMax">
              Max / order
            </label>
            <input
              id="tierMax"
              type="number"
              min="1"
              max="50"
              className="form-input"
              value={newTier.max_per_booking}
              onChange={(e) => setNewTier({ ...newTier, max_per_booking: e.target.value })}
              disabled={isAdding}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isAdding}>
            <Plus size={16} /> {isAdding ? 'Adding...' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  )
}
