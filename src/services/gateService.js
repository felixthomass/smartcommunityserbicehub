// Smart Gate API Service
import { MONGO_API_URL } from '../config/environment.js'

export const gateService = {
  /**
   * Worker Entry with face capture
   */
  workerEntry: async (formData) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/entry/worker`, {
        method: 'POST',
        body: formData // multipart/form-data
      })
      const result = await response.json()
      return result
    } catch (error) {
      console.error('❌ Error in workerEntry service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Staff Entry (Attendance) with face capture
   */
  staffEntry: async (formData) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/entry/staff`, {
        method: 'POST',
        body: formData // multipart/form-data
      })
      const result = await response.json()
      return result
    } catch (error) {
      console.error('❌ Error in staffEntry service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Fetch Attendance Logs
   */
  getAttendance: async (date) => {
    try {
      const url = `${MONGO_API_URL}/api/attendance${date ? `?date=${date}` : ''}`
      const response = await fetch(url)
      const result = await response.json()
      return result
    } catch (error) {
      console.error('❌ Error in getAttendance service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Fetch Entry Logs
   */
  getEntryLogs: async (filters = {}) => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v)
      })
      const url = `${MONGO_API_URL}/api/entry/logs?${params.toString()}`
      const response = await fetch(url)
      const result = await response.json()
      return result
    } catch (error) {
      console.error('❌ Error in getEntryLogs service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get all workers
   */
  getWorkers: async () => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/gate/workers`)
      return await response.json()
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  /**
   * Register a new worker (manual)
   */
  registerWorker: async (payload) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/gate/register-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      return await response.json()
    } catch (error) {
      console.error('❌ Error in registerWorker service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Register a new staff member (manual)
   */
  registerStaff: async (payload) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/gate/register-staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      return await response.json()
    } catch (error) {
      console.error('❌ Error in registerStaff service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get all staff
   */
  getStaff: async () => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/gate/staff`)
      return await response.json()
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  /**
   * Register Face Descriptor (legacy single - backward compat)
   */
  registerFace: async (payload) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/face/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      return await response.json()
    } catch (error) {
      console.error('❌ Error in registerFace service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Register Multiple Face Descriptors (multi-angle)
   * @param {string} staffId - Supabase user_id UUID
   * @param {number[][]} descriptors - array of 128-float face descriptors
   * @param {object} [staffInfo] - optional { name, role, shift } to sync MongoDB Staff record
   */
  registerMultiFace: async (staffId, descriptors, staffInfo = {}) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/face/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, descriptors, ...staffInfo })
      })
      return await response.json()
    } catch (error) {
      console.error('❌ Error in registerMultiFace service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Update Face Data
   * @param {string} staffId - Supabase user_id UUID or MongoDB _id
   * @param {number[][]} descriptors - array of 128-float face descriptors
   * @param {object} [staffInfo] - optional { name, role, shift } to sync MongoDB Staff record
   */
  updateFace: async (staffId, descriptors, staffInfo = {}) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/face/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId, descriptors, ...staffInfo })
      })
      return await response.json()
    } catch (error) {
      console.error('❌ Error in updateFace service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Delete Face Data
   */
  deleteFace: async (staffId) => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/face/${staffId}`, {
        method: 'DELETE'
      })
      return await response.json()
    } catch (error) {
      console.error('❌ Error in deleteFace service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get staff without face data
   */
  getStaffWithoutFace: async () => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/staff/no-face`)
      return await response.json()
    } catch (error) {
      console.error('❌ Error in getStaffWithoutFace service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Match Face Descriptor
   * @param {number[]} descriptor - 128-float face descriptor
   * @param {string} action - 'checkin' | 'checkout'
   */
  matchFace: async (descriptor, action = 'checkin') => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/face/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor, action })
      })
      return await response.json()
    } catch (error) {
      console.error('❌ Error in matchFace service:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get all registered and manageable staff (unified)
   */
  getAllStaff: async () => {
    try {
      const response = await fetch(`${MONGO_API_URL}/api/gate/all-staff`)
      return await response.json()
    } catch (error) {
      console.error('❌ Error in getAllStaff service:', error)
      return { success: false, error: error.message }
    }
  }
}
