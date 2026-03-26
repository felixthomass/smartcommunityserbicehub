// src/services/securityShiftService.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const securityShiftService = {
  createShift: async (shiftData) => {
    try {
      const response = await fetch(`${API_URL}/security-shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData)
      })
      const data = await response.json()
      return data.success ? { success: true, shift: data.data } : { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  getAllShifts: async () => {
    try {
      const response = await fetch(`${API_URL}/admin/security-shifts`)
      const data = await response.json()
      return data.success ? { success: true, shifts: data.data } : { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  getShiftsForUser: async (securityId) => {
    try {
      const response = await fetch(`${API_URL}/security-shifts/${securityId}`)
      const data = await response.json()
      return data.success ? { success: true, shifts: data.data } : { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  logDutyStatus: async (logData) => {
    try {
      const response = await fetch(`${API_URL}/security-duty-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      })
      const data = await response.json()
      return data.success ? { success: true, log: data.data } : { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  getDutyLogs: async (shiftId) => {
    try {
      const response = await fetch(`${API_URL}/security-duty-logs/${shiftId}`)
      const data = await response.json()
      return data.success ? { success: true, logs: data.data } : { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },

  deleteShift: async (shiftId) => {
    try {
      const response = await fetch(`${API_URL}/security-shifts/${shiftId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      return data.success ? { success: true } : { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  },
  getGuardShift: async (guardId) => {
    try {
      const response = await fetch(`${API_URL}/security-shifts/guard/${guardId}`)
      const data = await response.json()
      return data.success ? { success: true, shift: data.data, status: data.status } : { success: false, error: data.error }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}
