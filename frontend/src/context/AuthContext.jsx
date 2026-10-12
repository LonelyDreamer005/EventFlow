import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('eventflow_token'))
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('eventflow_user')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  // Verify token on initial load
  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const res = await authService.getCurrentUser()
          setUser(res.user)
          localStorage.setItem('eventflow_user', JSON.stringify(res.user))
        } catch (err) {
          console.warn('Session expired or invalid token:', err)
          logout()
        }
      }
      setLoading(false)
    }
    verifyAuth()
  }, [token])

  const login = async (email, password) => {
    const res = await authService.login({ email, password })
    const { access_token, user: loggedInUser } = res
    setToken(access_token)
    setUser(loggedInUser)
    localStorage.setItem('eventflow_token', access_token)
    localStorage.setItem('eventflow_user', JSON.stringify(loggedInUser))
    return loggedInUser
  }

  const register = async (name, email, password) => {
    const res = await authService.register({ name, email, password })
    // If registration returns access_token, store it; otherwise user can login
    if (res.access_token) {
      setToken(res.access_token)
      setUser(res.user)
      localStorage.setItem('eventflow_token', res.access_token)
      localStorage.setItem('eventflow_user', JSON.stringify(res.user))
    }
    return res
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('eventflow_token')
    localStorage.removeItem('eventflow_user')
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
