import { API_BASE_URL } from '../config/environment.js'

const API_BASE = API_BASE_URL

/**
 * Delivery Service for Security Dashboard
 * Handles delivery logs, vendor management, and delivery agent tracking
 */
export const deliveryService = {

  /**
   * Create a new delivery log entry
   * @param {Object} deliveryData - Delivery information
   * @returns {Promise<Object>} Creation result
   */
  async createDeliveryLog(deliveryData) {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Delivery log created in MongoDB:', result.data)
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error creating delivery log:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Delete a delivery log entry
   * @param {string} deliveryId - ID of the delivery to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteDeliveryLog(deliveryId) {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/${deliveryId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting delivery log:', error)
      return { success: false, error: error.message }
    }
  },




  /**
   * Show browser notification
   * @param {Object} notification - Notification data
   */
  showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: notification._id,
        data: notification,
        requireInteraction: false,
        silent: false
      })

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotification.close()
      }, 5000)

      // Handle click on notification
      browserNotification.onclick = () => {
        window.focus()
        // You can add logic here to navigate to the delivery details
        browserNotification.close()
      }
    } else if ('Notification' in window && Notification.permission === 'default') {
      // Request permission
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          this.showBrowserNotification(notification)
        }
      })
    }
  },

  /**
   * Get notifications for a specific resident from MongoDB
   * @param {string} building - Building name
   * @param {string} flatNumber - Flat number
   * @returns {Array} Resident notifications
   */
  async getResidentNotifications(building, flatNumber) {
    try {
      // Find the resident by building and flat number
      const response = await fetch(`${API_BASE}/api/residents/flat/${building}/${flatNumber}`)
      if (!response.ok) {
        console.log('Resident not found for notifications')
        return []
      }

      const residentResult = await response.json()
      const resident = residentResult.data

      if (!resident?.authUserId) {
        return []
      }

      // Get notifications for this resident
      const notificationResponse = await fetch(`${API_BASE}/api/notifications/user/${resident.authUserId}?type=delivery`)
      if (!notificationResponse.ok) {
        return []
      }

      const notificationResult = await notificationResponse.json()
      return notificationResult.data?.notifications || []
    } catch (error) {
      console.error('Error getting resident notifications:', error)
      return []
    }
  },

  /**
   * Mark notification as read in MongoDB
   * @param {string} notificationId - Notification ID
   * @param {string} building - Building name (not used, kept for compatibility)
   * @param {string} flatNumber - Flat number (not used, kept for compatibility)
   */
  async markNotificationAsRead(notificationId, building, flatNumber) {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log('✅ Notification marked as read in MongoDB:', notificationId)
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  },

  /**
   * Delete a specific notification from MongoDB
   * @param {string} notificationId - Notification ID
   * @param {string} building - Building name (not used, kept for compatibility)
   * @param {string} flatNumber - Flat number (not used, kept for compatibility)
   */
  async deleteNotification(notificationId, building, flatNumber) {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log('✅ Delivery notification deleted from MongoDB:', notificationId)
      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  },

  /**
   * Get delivery logs with optional filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Delivery logs
   */
  async getDeliveryLogs(filters = {}) {
    try {
      const params = new URLSearchParams()

      if (filters.date) params.append('date', filters.date)
      if (filters.vendor) params.append('vendor', filters.vendor)
      if (filters.flatNumber) params.append('flatNumber', filters.flatNumber)
      if (filters.status) params.append('status', filters.status)
      if (filters.agentName) params.append('agentName', filters.agentName)
      if (filters.limit) params.append('limit', filters.limit)
      if (filters.offset) params.append('offset', filters.offset)

      const url = `${API_BASE}/api/deliveries${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Delivery logs fetched from MongoDB:', result.data?.length || 0, 'logs')
      return { success: true, data: result.data || result.deliveries || [] }
    } catch (error) {
      console.error('Error fetching delivery logs:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  /**
   * Get deliveries for a resident using building/flat filters
   */
  async getResidentDeliveries(building, flatNumber, extra = {}) {
    const filters = { ...extra }
    if (flatNumber) filters.flatNumber = flatNumber
    // building is not a server filter yet, but kept for future or client-side
    const result = await this.getDeliveryLogs(filters)
    if (result.success && building) {
      result.data = (result.data || []).filter(d => (d.building || '').toLowerCase() === (building || '').toLowerCase())
    }
    return result
  },

  /**
   * Accept a delivery by ID (resident action)
   */
  async acceptDelivery(deliveryId, acceptedBy) {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/${deliveryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted', acceptedBy })
      })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error accepting delivery:', error)
      return { success: false, error: error.message }
    }
  },


  /**
   * Get common delivery vendors
   * @returns {Promise<Object>} Vendor list
   */
  async getVendors() {
    const defaultVendors = [
      { id: 'swiggy', name: 'Swiggy', icon: '🍔', color: '#FF6B6B' },
      { id: 'zomato', name: 'Zomato', icon: '🍕', color: '#FF4757' },
      { id: 'amazon', name: 'Amazon', icon: '📦', color: '#FF9500' },
      { id: 'flipkart', name: 'Flipkart', icon: '🛒', color: '#007AFF' },
      { id: 'dunzo', name: 'Dunzo', icon: '🚚', color: '#34C759' },
      { id: 'bigbasket', name: 'BigBasket', icon: '🥬', color: '#5AC8FA' },
      { id: 'grofers', name: 'Grofers', icon: '🛍️', color: '#AF52DE' },
      { id: 'uber-eats', name: 'Uber Eats', icon: '🍜', color: '#000000' },
      { id: 'foodpanda', name: 'Foodpanda', icon: '🐼', color: '#D0021B' },
      { id: 'other', name: 'Other', icon: '📦', color: '#8E8E93' }
    ]

    try {
      const response = await fetch(`${API_BASE}/api/deliveries/vendors`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const apiVendors = result.data || result.vendors || []

      // Merge unique vendors, prioritizing API data for matches
      const mergedVendors = [...defaultVendors]

      apiVendors.forEach(apiV => {
        const index = mergedVendors.findIndex(dv => dv.name.toLowerCase() === apiV.name?.toLowerCase())
        if (index === -1) {
          mergedVendors.push({
            id: apiV.id || apiV._id || apiV.name?.toLowerCase() || 'other',
            name: apiV.name || 'Other',
            icon: apiV.icon || '📦',
            color: apiV.color || '#8E8E93'
          })
        } else {
          // Update existing with potential extra data from API
          mergedVendors[index] = { ...mergedVendors[index], ...apiV }
        }
      })

      return { success: true, data: mergedVendors }
    } catch (error) {
      console.error('Error fetching vendors:', error)
      return { success: true, data: defaultVendors }
    }
  },

  /**
   * Get frequent delivery agents for a vendor
   * @param {string} vendorId - Vendor ID
   * @returns {Promise<Object>} Agent list
   */
  async getFrequentAgents(vendorId) {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/agents/${vendorId}`)

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint not implemented on backend; gracefully degrade with empty list
          return { success: true, data: [] }
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data || [] }
    } catch (error) {
      console.error('Error fetching frequent agents:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  /**
   * Get delivery suggestions based on agent history
   * @param {string} agentName - Agent name
   * @returns {Promise<Object>} Suggestions
   */
  async getDeliverySuggestions(agentName) {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error fetching delivery suggestions:', error)
      return { success: false, error: error.message, data: null }
    }
  },

  /**
   * Update delivery status
   * @param {string} deliveryId - Delivery ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional update data
   * @returns {Promise<Object>} Update result
   */
  async updateDeliveryStatus(deliveryId, status, additionalData = {}) {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/${deliveryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...additionalData })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error updating delivery status:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Notify resident about delivery (Transitions status to 'Waiting Pickup')
   * @param {string} deliveryId - Delivery ID
   * @returns {Promise<Object>} Result
   */
  async notifyResident(deliveryId) {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/${deliveryId}/notify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error notifying resident:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Complete delivery (Transitions status to 'Delivered')
   * @param {string} deliveryId - Delivery ID
   * @param {string} status - Completion status (default 'Delivered')
   * @returns {Promise<Object>} Result
   */
  async completeDelivery(deliveryId, status = 'Delivered') {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/${deliveryId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error completing delivery:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Upload delivery proof photo
   * @param {File} photoFile - Photo file
   * @param {string} deliveryId - Delivery ID
   * @returns {Promise<Object>} Upload result
   */
  async uploadDeliveryProof(photoFile, deliveryId) {
    try {
      const formData = new FormData()
      formData.append('photo', photoFile)
      formData.append('deliveryId', deliveryId)

      const response = await fetch(`${API_BASE}/api/deliveries/${deliveryId}/proof`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error uploading delivery proof:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get delivery statistics
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} Statistics
   */
  async getDeliveryStats(dateRange = {}) {
    try {
      const params = new URLSearchParams()

      if (dateRange.start) params.append('start', dateRange.start)
      if (dateRange.end) params.append('end', dateRange.end)
      if (dateRange.period) params.append('period', dateRange.period) // 'day', 'week', 'month'

      const url = `${API_BASE}/api/deliveries/stats${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error fetching delivery stats:', error)
      return { success: false, error: error.message, data: null }
    }
  },


  /**
   * Blacklist/whitelist delivery agent
   * @param {string} agentName - Agent name
   * @param {string} agentPhone - Agent phone
   * @param {boolean} blacklisted - Blacklist status
   * @param {string} reason - Reason for blacklisting
   * @returns {Promise<Object>} Update result
   */
  async updateAgentStatus(agentName, agentPhone, blacklisted, reason = '') {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/agents/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName, agentPhone, blacklisted, reason })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error updating agent status:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get blacklisted agents
   * @returns {Promise<Object>} Blacklisted agents
   */
  async getBlacklistedAgents() {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/agents/blacklisted`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data || [] }
    } catch (error) {
      console.error('Error fetching blacklisted agents:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  /**
   * Create bulk delivery logs
   * @param {Array} deliveries - Array of delivery data
   * @returns {Promise<Object>} Creation result
   */
  async createBulkDeliveries(deliveries) {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveries })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error creating bulk deliveries:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Search delivery by tracking ID
   * @param {string} trackingId - Tracking ID
   * @returns {Promise<Object>} Search result
   */
  async searchByTrackingId(trackingId) {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/search/${encodeURIComponent(trackingId)}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error searching delivery:', error)
      return { success: false, error: error.message, data: null }
    }
  },

}
