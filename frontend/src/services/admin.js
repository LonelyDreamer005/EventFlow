import apiClient from './api'

export const adminService = {
  async getDashboardStats() {
    const res = await apiClient.get('/admin/dashboard')
    return res.data
  },

  async getUsers(params = {}) {
    const res = await apiClient.get('/admin/users', { params })
    return res.data
  },
}
