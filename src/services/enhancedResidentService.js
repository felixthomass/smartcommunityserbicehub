const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

/**
 * Enhanced Resident Service for Security Dashboard
 * Provides comprehensive resident directory and flat management functionality
 */
export const enhancedResidentService = {
  
  /**
   * Search residents with multiple criteria
   * @param {Object} searchParams - Search criteria
   * @param {string} searchParams.query - Search term (name, phone, flat)
   * @param {string} searchParams.building - Filter by building
   * @param {string} searchParams.flatNumber - Filter by flat number
   * @param {string} searchParams.phone - Filter by phone number
   * @param {boolean} searchParams.ownersOnly - Show only owners
   * @param {boolean} searchParams.tenantsOnly - Show only tenants
   * @param {boolean} searchParams.kycVerified - Filter by KYC status
   * @param {boolean} searchParams.restricted - Filter by restriction status
   * @returns {Promise<Object>} Search results
   */
  async searchResidents(searchParams = {}) {
    try {
      const params = new URLSearchParams()
      
      if (searchParams.query) params.append('q', searchParams.query)
      if (searchParams.building) params.append('building', searchParams.building)
      if (searchParams.flatNumber) params.append('flatNumber', searchParams.flatNumber)
      if (searchParams.phone) params.append('phone', searchParams.phone)
      if (searchParams.ownersOnly) params.append('ownersOnly', 'true')
      if (searchParams.tenantsOnly) params.append('tenantsOnly', 'true')
      if (searchParams.kycVerified !== undefined) params.append('kycVerified', searchParams.kycVerified)
      if (searchParams.restricted !== undefined) params.append('restricted', searchParams.restricted)
      
      const url = `${API_BASE}/api/residents/search${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data || result.residents || [] }
    } catch (error) {
      console.error('Error searching residents:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  /**
   * Get detailed resident profile with extended information
   * @param {string} authUserId - Resident's auth user ID
   * @returns {Promise<Object>} Detailed resident profile
   */
  async getResidentDetails(authUserId) {
    try {
      const response = await fetch(`${API_BASE}/api/residents/${encodeURIComponent(authUserId)}/details`)
      
      if (response.status === 404) {
        return { success: true, data: null }
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data || result.resident }
    } catch (error) {
      console.error('Error fetching resident details:', error)
      return { success: false, error: error.message, data: null }
    }
  },

  /**
   * Get flat details and associated information
   * @param {string} building - Building name/number
   * @param {string} flatNumber - Flat number
   * @returns {Promise<Object>} Flat details
   */
  async getFlatDetails(building, flatNumber) {
    try {
      const params = new URLSearchParams({ building, flatNumber })
      const response = await fetch(`${API_BASE}/api/flats/details?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error fetching flat details:', error)
      return { success: false, error: error.message, data: null }
    }
  },

  /**
   * Get resident's pre-approved guest list
   * @param {string} authUserId - Resident's auth user ID
   * @returns {Promise<Object>} Guest list
   */
  async getGuestList(authUserId) {
    try {
      const response = await fetch(`${API_BASE}/api/residents/${encodeURIComponent(authUserId)}/guests`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data || result.guests || [] }
    } catch (error) {
      console.error('Error fetching guest list:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  /**
   * Verify visitor against pre-approved guest list
   * @param {string} authUserId - Resident's auth user ID
   * @param {string} visitorName - Visitor's name
   * @param {string} visitorPhone - Visitor's phone
   * @returns {Promise<Object>} Verification result
   */
  async verifyGuest(authUserId, visitorName, visitorPhone) {
    try {
      const response = await fetch(`${API_BASE}/api/residents/${encodeURIComponent(authUserId)}/verify-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorName, visitorPhone })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error verifying guest:', error)
      return { success: false, error: error.message, data: null }
    }
  },

  /**
   * Get all residents for directory view
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Residents list
   */
  async getAllResidents(filters = {}) {
    try {
      const params = new URLSearchParams()
      
      if (filters.building) params.append('building', filters.building)
      if (filters.limit) params.append('limit', filters.limit)
      if (filters.offset) params.append('offset', filters.offset)
      if (filters.sortBy) params.append('sortBy', filters.sortBy)
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder)
      
      const url = `${API_BASE}/api/residents${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data || result.residents || [] }
    } catch (error) {
      console.error('Error fetching residents:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  /**
   * Get building and flat statistics
   * @returns {Promise<Object>} Building statistics
   */
  async getBuildingStats() {
    try {
      const response = await fetch(`${API_BASE}/api/buildings/stats`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error fetching building stats:', error)
      return { success: false, error: error.message, data: null }
    }
  },

  /**
   * Update resident restriction status
   * @param {string} authUserId - Resident's auth user ID
   * @param {boolean} restricted - Restriction status
   * @returns {Promise<Object>} Update result
   */
  async updateRestriction(authUserId, restricted) {
    try {
      const response = await fetch(`${API_BASE}/api/residents/${encodeURIComponent(authUserId)}/restrict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restricted })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error updating restriction:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Search by QR code or ID scan
   * @param {string} scanData - Scanned data (QR code, ID number, etc.)
   * @returns {Promise<Object>} Search result
   */
  async searchByScan(scanData) {
    try {
      const response = await fetch(`${API_BASE}/api/residents/scan-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanData })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error searching by scan:', error)
      return { success: false, error: error.message, data: null }
    }
  },

  /**
   * Voice search using speech recognition
   * @param {string} audioData - Base64 encoded audio data
   * @returns {Promise<Object>} Search result
   */
  async voiceSearch(audioData) {
    try {
      const response = await fetch(`${API_BASE}/api/residents/voice-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error with voice search:', error)
      return { success: false, error: error.message, data: null }
    }
  }
}
