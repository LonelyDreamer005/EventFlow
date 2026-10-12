import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Ticket, Save, CheckCircle2, AlertCircle, Edit2, Eye } from 'lucide-react'
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

  // New ticket type form
  const [newTier, setNewTier] = useState({
    name: '',
    price: '',
    capacity: '',
    max_per_booking: 10,
  })
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState(null)

  // Editing ticket type state
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
      setActionSuccess('New ticket tier created successfully!')
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
      setActionSuccess('Ticket tier updated successfully!')
      await loadData()
    } catch (err) {
      setUpdateError(err?.response?.data?.message || 'Failed to update ticket tier capacity or price.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading ticket tiers..." />
  }

  if (error || !event) {
    return (
      <div>
        <Link to="/admin/events" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to Events
        </Link>
        <ErrorMessage error={error || 'Event not found.'} onRetry={loadData} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/admin/events" className="btn btn-secondary btn-sm" style={{ gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to Manage Events
        </Link>

        <Link to={`/events/${event.id}`} className="btn btn-outline btn-sm" style={{ gap: '0.4rem' }}>
          <Eye size={15} /> Preview Public Page
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-title">
          <h1>Ticket Inventory & Tiers</h1>
          <p className="page-subtitle">Configure pricing tiers, capacity quotas, and limits for <strong>{event.title}</strong></p>
        </div>
      </div>

      {actionSuccess && (
        <div
          style={{
            background: 'var(--success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={18} /> {actionSuccess}
        </div>
      )}

      {/* Existing Ticket Tiers List */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.3rem' }}>Configured Tiers ({ticketTypes.length})</h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Inventory safety enforced via database constraints
          </span>
        </div>

        {updateError && <ErrorMessage message={updateError} />}

        {ticketTypes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <Ticket size={36} color="var(--cyan)" style={{ marginBottom: '0.75rem' }} />
            <p>No ticket tiers configured yet. Add your first tier below to make this event bookable.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ticketTypes.map((tier) => {
              const soldCount = tier.capacity - tier.available
              const isEditingThis = editingTierId === tier.id

              return (
                <div
                  key={tier.id}
                  style={{
                    background: 'var(--bg-glass-strong)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{tier.name}</h3>
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Max per order: {tier.max_per_booking || 10} tickets
                      </div>
                    </div>

                    {!isEditingThis && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => startEditing(tier)}
                        style={{ gap: '0.35rem' }}
                      >
                        <Edit2 size={14} /> Edit Quota
                      </button>
                    )}
                  </div>

                  {isEditingThis ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr auto',
                        gap: '1rem',
                        alignItems: 'end',
                        background: 'rgba(0, 0, 0, 0.25)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-input"
                          value={editFormData.price}
                          onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Total Capacity (min {soldCount})</label>
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
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingTierId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '0.75rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid var(--border-subtle)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Price</span>
                        <strong style={{ color: 'var(--cyan)' }}>{formatCurrency(tier.price)}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Total Capacity</span>
                        <strong>{tier.capacity}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Tickets Sold</span>
                        <strong style={{ color: soldCount > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                          {soldCount}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Available Now</span>
                        <strong style={{ color: tier.available > 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {tier.available}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add New Tier Form Card */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} color="var(--cyan)" /> Add New Ticket Tier
        </h2>

        {addError && <ErrorMessage message={addError} />}

        <form onSubmit={handleAddTier} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="tierName">Tier Name</label>
            <input
              id="tierName"
              type="text"
              className="form-input"
              placeholder="e.g. VIP Early Bird"
              value={newTier.name}
              onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
              disabled={isAdding}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="tierPrice">Price (USD)</label>
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

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="tierCapacity">Capacity</label>
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

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="tierMax">Max Per Order</label>
            <input
              id="tierMax"
              type="number"
              min="1"
              max="50"
              className="form-input"
              placeholder="10"
              value={newTier.max_per_booking}
              onChange={(e) => setNewTier({ ...newTier, max_per_booking: e.target.value })}
              disabled={isAdding}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isAdding}
            style={{ height: '42px', gap: '0.4rem' }}
          >
            <Plus size={16} /> {isAdding ? 'Adding...' : 'Add Tier'}
          </button>
        </form>
      </div>
    </div>
  )
}
