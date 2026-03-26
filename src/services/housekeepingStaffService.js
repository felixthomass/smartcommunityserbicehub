// src/services/housekeepingStaffService.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const housekeepingStaffService = {
  getProfile: async (userId) => {
    try {
      const response = await fetch(`${API_URL}/housekeeping-staff/${userId}`)
      const data = await response.json()
      if (data.success) {
        return { success: true, profile: data.data }
      }
      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error fetching housekeeping staff profile:', error)
      return { success: false, error: error.message }
    }
  },

  saveProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_URL}/housekeeping-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      })
      const data = await response.json()
      if (data.success) {
        return { success: true, profile: data.data }
      }
      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error saving housekeeping staff profile:', error)
      return { success: false, error: error.message }
    }
  },

  getAllStaff: async () => {
    try {
      const response = await fetch(`${API_URL}/housekeeping-staff`)
      const data = await response.json()
      if (data.success) {
        return { success: true, staff: data.data }
      }
      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error fetching all housekeeping staff:', error)
      return { success: false, error: error.message }
    }
  },

  getTasks: async (userId) => {
    try {
      const response = await fetch(`${API_URL}/service-requests?assigned_to=${userId}`)
      const data = await response.json()
      if (data.success) {
        return { success: true, tasks: data.data }
      }
      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error fetching housekeeping tasks:', error)
      return { success: false, error: error.message }
    }
  },

  updateTaskStatus: async (taskId, status) => {
    try {
      const response = await fetch(`${API_URL}/service-requests/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      const data = await response.json()
      if (data.success) {
        return { success: true, task: data.data }
      }
      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error updating task status:', error)
      return { success: false, error: error.message }
    }
  }
}
