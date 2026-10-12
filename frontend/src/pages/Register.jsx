import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isValidEmail, isValidPassword } from '../utils/validators'
import ErrorMessage from '../components/ErrorMessage'

export default function Register() {
  const { register, login } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Full name is required.'
    if (!formData.email) {
      errors.email = 'Email address is required.'
    } else if (!isValidEmail(formData.email)) {
      errors.email = 'Please provide a valid email address.'
    }
    if (!formData.password) {
      errors.password = 'Password is required.'
    } else if (!isValidPassword(formData.password)) {
      errors.password = 'Password must be at least 8 characters long.'
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
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
      await register(formData.name.trim(), formData.email.trim(), formData.password)
      await login(formData.email.trim(), formData.password)
      navigate('/dashboard')
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Registration failed. This email may already be in use.'
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
          <h1>Join the house</h1>
          <p>Create an account to reserve tickets in one tap.</p>
        </div>

        {serverError && <ErrorMessage message={serverError} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="Alex Johnson"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isSubmitting}
            />
            {formErrors.name && <span className="form-error">{formErrors.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="alex@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isSubmitting}
            />
            {formErrors.email && <span className="form-error">{formErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password · 8+ characters
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={isSubmitting}
            />
            {formErrors.password && <span className="form-error">{formErrors.password}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              disabled={isSubmitting}
            />
            {formErrors.confirmPassword && <span className="form-error">{formErrors.confirmPassword}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have a stub? <Link to="/login" style={{ fontWeight: 700 }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
