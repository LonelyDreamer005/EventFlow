import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isValidEmail } from '../utils/validators'
import ErrorMessage from '../components/ErrorMessage'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const queryParams = new URLSearchParams(location.search)
  const isExpired = queryParams.get('expired') === 'true'
  const redirectPath = queryParams.get('redirect')

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [formErrors, setFormErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const errors = {}
    if (!formData.email) {
      errors.email = 'Email address is required.'
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Please provide a valid email address.'
    }
    if (!formData.password) {
      errors.password = 'Password is required.'
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

    try {
      const user = await login(formData.email, formData.password)
      if (redirectPath) {
        navigate(redirectPath)
      } else if (user?.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Invalid email or password. Please try again.'
      setServerError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-header">
          <div className="brand-mark" style={{ margin: '0 auto 1rem' }}>
            <Ticket size={20} color="#ffffff" />
          </div>
          <h1>Welcome back</h1>
          <p>Sign in to hold seats and open your stubs.</p>
        </div>

        {isExpired && (
          <div className="alert alert-warning" style={{ marginBottom: '1.1rem' }}>
            Your session expired. Sign in again to continue.
          </div>
        )}

        {serverError && <ErrorMessage message={serverError} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isSubmitting}
              autoComplete="email"
            />
            {formErrors.email && <span className="form-error">{formErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            {formErrors.password && <span className="form-error">{formErrors.password}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          New here? <Link to="/register" style={{ fontWeight: 700 }}>Create an account</Link>
        </div>
      </div>
    </div>
  )
}
