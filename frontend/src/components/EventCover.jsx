import React from 'react'

const PALETTES = [
  ['#e11d74', '#2a0b18', '#f5c15a'],
  ['#f5c15a', '#1a1208', '#e11d74'],
  ['#9d174d', '#12080e', '#f8d48a'],
  ['#be185d', '#24100c', '#e8c36a'],
  ['#7c143c', '#0e0a0c', '#f5c15a'],
  ['#d4a017', '#1c0c14', '#ff6ea8'],
]

function hashString(value) {
  let hash = 0
  const str = String(value || '')
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function monogram(title) {
  const parts = String(title || 'EV')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return 'EV'
  return parts.map((word) => word[0]).join('').toUpperCase()
}

export default function EventCover({ event, size = 'card', className = '' }) {
  const seed = hashString(`${event?.id ?? ''}-${event?.title ?? ''}`)
  const [from, mid, to] = PALETTES[seed % PALETTES.length]
  const angle = 118 + (seed % 50)
  const letters = monogram(event?.title)

  return (
    <div className={`event-cover event-cover--${size} ${className}`.trim()}>
      <div
        className="event-cover-art"
        style={{
          background: `linear-gradient(${angle}deg, ${from} 0%, ${mid} 48%, ${to} 100%)`,
        }}
      />
      <span className="event-cover-monogram" aria-hidden="true">
        {letters}
      </span>
    </div>
  )
}
