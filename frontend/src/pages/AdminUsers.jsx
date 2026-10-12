import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Shield, User, Search, RefreshCw, ArrowLeft, Mail, Calendar } from 'lucide-react'
import { adminService } from '../services/admin'
import { formatDateTime } from '../utils/formatters'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import Pagination from '../components/Pagination'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadUsers = async (targetPage = 1, role = roleFilter) => {
    setLoading(true)
    setError(null)
    try {
      const params = { page: targetPage, per_page: 15 }
      if (role) {
        params.role = role
      }
      const data = await adminService.getUsers(params)
      setUsers(data.users || [])
      setTotal(data.total || 0)
      setPage(data.page || 1)
      setPages(data.pages || 1)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers(page, roleFilter)
  }, [page, roleFilter])

  const handleRoleChange = (newRole) => {
    setRoleFilter(newRole)
    setPage(1)
  }

  // Client-side quick search filtering on the active page
  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      String(u.id) === q
    )
  })

  const adminCount = users.filter((u) => u.role === 'admin').length
  const customerCount = users.filter((u) => u.role === 'customer').length

  return (
    <div className="page-wrap page-stack">
      <div className="page-header">
        <div className="page-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <Link to="/admin/dashboard" className="btn btn-secondary btn-sm no-print">
              <ArrowLeft size={14} /> Back to dashboard
            </Link>
          </div>
          <h1>User Directory</h1>
          <p className="page-subtitle">All registered customer and administrator accounts in EventFlow.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadUsers(page, roleFilter)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-card" style={{ padding: '1.15rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleRoleChange('')}
            >
              All Users ({total})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleRoleChange('customer')}
            >
              Customers
            </button>
            <button
              type="button"
              className={`btn btn-sm ${roleFilter === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleRoleChange('admin')}
            >
              Administrators
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: '260px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Filter by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.2rem', fontSize: '0.88rem' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Retrieving registered users..." />
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => loadUsers(page, roleFilter)} />
      ) : filteredUsers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Users size={36} color="var(--text-tertiary)" style={{ margin: '0 auto 1rem' }} />
          <h3>No users found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0.5rem auto 1.5rem' }}>
            {searchQuery
              ? `No registered accounts matched "${searchQuery}".`
              : 'There are currently no users in this role.'}
          </p>
          {searchQuery && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearchQuery('')}>
              Clear search filter
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="data-table-wrap stack-on-mobile">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>User ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isAdmin = u.role === 'admin'
                  const initials = (u.name || u.email || 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <tr key={u.id}>
                      <td
                        data-label="User ID"
                        style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--gold)' }}
                      >
                        #{u.id}
                      </td>
                      <td data-label="Full Name">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isAdmin
                                ? 'linear-gradient(135deg, #d4af37, #aa8214)'
                                : 'linear-gradient(135deg, #38bdf8, #0284c7)',
                              color: isAdmin ? '#1a120c' : '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--text-primary)' }}>{u.name || 'Unnamed User'}</strong>
                          </div>
                        </div>
                      </td>
                      <td data-label="Email Address">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <Mail size={13} color="var(--text-tertiary)" />
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td data-label="Role">
                        {isAdmin ? (
                          <span
                            className="status-pill"
                            style={{
                              background: 'rgba(212, 175, 55, 0.15)',
                              color: 'var(--gold)',
                              border: '1px solid rgba(212, 175, 55, 0.35)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontWeight: 600,
                            }}
                          >
                            <Shield size={12} /> Administrator
                          </span>
                        ) : (
                          <span
                            className="status-pill"
                            style={{
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.28)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontWeight: 600,
                            }}
                          >
                            <User size={12} /> Customer
                          </span>
                        )}
                      </td>
                      <td data-label="Joined Date">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                          <Calendar size={13} color="var(--text-tertiary)" />
                          <span>{formatDateTime(u.created_at)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div style={{ padding: '1rem' }}>
              <Pagination page={page} pages={pages} onPageChange={(p) => setPage(p)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
