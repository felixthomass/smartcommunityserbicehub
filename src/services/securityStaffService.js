// src/services/securityStaffService.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api'

export const securityStaffService = {
  getProfile: async (userId) => {
    try {
      const response = await fetch(`${API_URL}/security-staff/${userId}`)
      const data = await response.json()
      if (data.success) {
        return { success: true, profile: data.data }
      }
      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error fetching security staff profile:', error)
      return { success: false, error: error.message }
    }
  },

  saveProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_URL}/security-staff`, {
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
      console.error('Error saving security staff profile:', error)
      return { success: false, error: error.message }
    }
  },

  getAllStaff: async () => {
    try {
      const response = await fetch(`${API_URL}/security-staff`)
      const data = await response.json()
      if (data.success) {
        return { success: true, staff: data.data }
      }
      return { success: false, error: data.error }
    } catch (error) {
      console.error('Error fetching all security staff:', error)
      return { success: false, error: error.message }
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_URL}/security/profile`, {
        method: 'PUT',
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
      console.error('Error updating personal security staff profile:', error)
      return { success: false, error: error.message }
    }
  }
}
