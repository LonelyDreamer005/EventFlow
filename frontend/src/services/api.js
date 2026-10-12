import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Request Interceptor: Inject JWT token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eventflow_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Handle 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if we are checking /auth/me or already on login
      if (!error.config.url.includes('/auth/me') && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('eventflow_token')
        localStorage.removeItem('eventflow_user')
        window.location.href = '/login?expired=true'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
