import React from 'react'
import { Ticket, Github, ShieldCheck, Cpu } from 'lucide-react'

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(7, 11, 20, 0.95)',
        padding: '3rem 1.5rem 2rem',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--brand-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ticket size={18} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>
                EventFlow
              </span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Production-grade event reservation platform with end-to-end CI/CD automation.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={16} color="var(--success)" /> Concurrency-Safe (PostgreSQL Row Locks)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
              <Cpu size={16} color="var(--cyan)" /> Cloud-Native Architecture
            </div>
          </div>
        </div>

        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.825rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} EventFlow. Distributed under MIT License.
          </div>
          <div>
            Built with React, Flask, PostgreSQL, Docker, Kubernetes & Prometheus.
          </div>
        </div>
      </div>
    </footer>
  )
}
