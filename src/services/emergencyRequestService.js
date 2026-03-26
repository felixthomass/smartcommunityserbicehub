// src/services/emergencyRequestService.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const emergencyRequestService = {
  // Guard submits an emergency leave request
  createRequest: async (data) => {
    try {
      const res = await fetch(`${API_URL}/emergency-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const json = await res.json()
      return json.success ? { success: true, request: json.data } : { success: false, error: json.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  // Guard checks their own requests
  getMyRequests: async (securityId) => {
    try {
      const res = await fetch(`${API_URL}/emergency-requests/guard/${securityId}`)
      const json = await res.json()
      return json.success ? { success: true, requests: json.data } : { success: false, error: json.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  // Admin — view all requests
  getAllRequests: async () => {
    try {
      const res = await fetch(`${API_URL}/admin/emergency-requests`)
      const json = await res.json()
      return json.success ? { success: true, requests: json.data } : { success: false, error: json.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  // Admin — approve request + optionally assign replacement guard
  approveRequest: async (requestId, data) => {
    try {
      const res = await fetch(`${API_URL}/emergency-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const json = await res.json()
      return json.success ? { success: true, data: json.data } : { success: false, error: json.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  // Admin — reject request
  rejectRequest: async (requestId, data) => {
    try {
      const res = await fetch(`${API_URL}/emergency-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const json = await res.json()
      return json.success ? { success: true, data: json.data } : { success: false, error: json.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}
