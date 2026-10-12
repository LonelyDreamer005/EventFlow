import apiClient from './api'

export const bookingService = {
  async createBooking(items) {
    // items: [{ ticket_type_id: number, quantity: number }]
    const res = await apiClient.post('/bookings', { items })
    return res.data
  },

  async getBookings(params = {}) {
    const res = await apiClient.get('/bookings', { params })
    return res.data
  },

  async getBookingById(id) {
    const res = await apiClient.get(`/bookings/${id}`)
    return res.data
  },

  async cancelBooking(id) {
    const res = await apiClient.post(`/bookings/${id}/cancel`)
    return res.data
  },
}
