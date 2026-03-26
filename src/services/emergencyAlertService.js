// src/services/emergencyAlertService.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const emergencyAlertService = {
  // Trigger an emergency alert
  triggerAlert: async (data) => {
    try {
      const res = await fetch(`${API_URL}/emergency-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const json = await res.json()
      return json.success ? { success: true, alert: json.data } : { success: false, error: json.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
  createAlert: async (data) => {
    return emergencyAlertService.triggerAlert(data)
  },
  getActiveAlerts: async () => {
    try {
      const res = await fetch(`${API_URL}/emergency-alerts/active`)
      const json = await res.json()
      return json.success ? { success: true, alerts: json.data } : { success: false, error: json.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  // Admin: Get all emergency alerts
  getAlertHistory: async () => {
    try {
      const res = await fetch(`${API_URL}/emergency-alerts`)
      const json = await res.json()
      return json.success ? { success: true, alerts: json.data } : { success: false, error: json.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}
