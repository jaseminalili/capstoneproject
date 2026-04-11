import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '') + '/',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('tf_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle responses globally
api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.message || err.message || 'Something went wrong'
    const status = err.response?.status

    if (status === 401) {
      // Token expired or invalid — clear session
      localStorage.removeItem('tf_token')
      localStorage.removeItem('tf_workspace')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(new Error('Session expired. Please log in again.'))
    }

    if (status === 403) {
      toast.error('You do not have permission to perform this action.')
    } else if (status >= 500) {
      toast.error('Server error. Please try again.')
    }

    return Promise.reject(new Error(msg))
  }
)

export default api
