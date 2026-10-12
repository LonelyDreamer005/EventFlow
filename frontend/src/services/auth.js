import apiClient from './api'

export const authService = {
  async register(data) {
    const res = await apiClient.post('/auth/register', data)
    return res.data
  },

  async login(credentials) {
    const res = await apiClient.post('/auth/login', credentials)
    return res.data
  },

  async getCurrentUser() {
    const res = await apiClient.get('/auth/me')
    return res.data
  },
}
