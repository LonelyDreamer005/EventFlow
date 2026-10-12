import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '2.5rem',
      }}
    >
      <button
        className="btn btn-secondary btn-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} /> Previous
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0 0.75rem',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          fontWeight: 500,
        }}
      >
        Page <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{page}</span> of {totalPages}
      </div>

      <button
        className="btn btn-secondary btn-sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  )
}
