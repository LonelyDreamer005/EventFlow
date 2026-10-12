import apiClient from './api'

export const eventService = {
  async getEvents(params = {}) {
    const res = await apiClient.get('/events', { params })
    return res.data
  },

  async getEventById(id) {
    const res = await apiClient.get(`/events/${id}`)
    return res.data
  },

  async createEvent(data) {
    const res = await apiClient.post('/events', data)
    return res.data
  },

  async updateEvent(id, data) {
    const res = await apiClient.patch(`/events/${id}`, data)
    return res.data
  },

  async cancelEvent(id) {
    const res = await apiClient.post(`/events/${id}/cancel`)
    return res.data
  },

  // Ticket types management
  async getTicketTypes(eventId) {
    const res = await apiClient.get(`/events/${eventId}/ticket-types`)
    return res.data
  },

  async createTicketType(eventId, data) {
    const res = await apiClient.post(`/events/${eventId}/ticket-types`, data)
    return res.data
  },

  async updateTicketType(ticketTypeId, data) {
    const res = await apiClient.patch(`/ticket-types/${ticketTypeId}`, data)
    return res.data
  },
}
