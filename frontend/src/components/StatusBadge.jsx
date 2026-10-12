import React from 'react'

export default function StatusBadge({ status, type = 'status' }) {
  if (!status) return null

  const s = String(status).toLowerCase()

  let badgeClass = 'badge-neutral'
  let label = status

  if (s === 'confirmed' || s === 'published') {
    badgeClass = 'badge-success'
  } else if (s === 'draft' || s === 'pending') {
    badgeClass = 'badge-warning'
  } else if (s === 'cancelled' || s === 'failed') {
    badgeClass = 'badge-danger'
  } else if (s === 'admin') {
    badgeClass = 'badge-info'
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  )
}
