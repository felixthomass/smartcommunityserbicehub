const API_BASE =
  (import.meta?.env?.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  (import.meta?.env?.DEV ? 'http://localhost:3002' : '')

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
        if (response.status === 404) {
          // API endpoint doesn't exist, use local storage fallback
          console.warn('Delivery API not available, using local storage fallback')
          return this.createDeliveryLogLocal(deliveryData)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()

      // Ensure resident gets real-time notification even when API is available
      try {
        const serverDelivery = result.data || {}
        const enrichedDeliveryLog = {
          // Prefer server-provided fields, fallback to submitted deliveryData
          _id: serverDelivery._id || `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          vendor: serverDelivery.vendor || deliveryData.vendor,
          vendorId: serverDelivery.vendorId || deliveryData.vendorId,
          flatNumber: serverDelivery.flatNumber || deliveryData.flatNumber,
          building: serverDelivery.building || deliveryData.building,
          residentName: serverDelivery.residentName || deliveryData.residentName,
          agentName: serverDelivery.agentName || deliveryData.agentName,
          agentPhone: serverDelivery.agentPhone || deliveryData.agentPhone,
          trackingId: serverDelivery.trackingId || deliveryData.trackingId,
          packageDescription: serverDelivery.packageDescription || deliveryData.packageDescription,
          deliveryTime: serverDelivery.deliveryTime || deliveryData.deliveryTime || new Date().toISOString(),
          status: serverDelivery.status || deliveryData.status || 'delivered',
          createdAt: serverDelivery.createdAt || new Date().toISOString(),
          updatedAt: serverDelivery.updatedAt || new Date().toISOString()
        }
        // Fire local notification + custom event for resident dashboards
        this.createDeliveryNotification(enrichedDeliveryLog)
      } catch (notifyErr) {
        console.warn('Delivery created on server, but local notification dispatch failed:', notifyErr)
      }

      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error creating delivery log:', error)
      // Fallback to local storage if API fails
      if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
        console.warn('Using local storage fallback for delivery log')
        return this.createDeliveryLogLocal(deliveryData)
      }
      return { success: false, error: error.message }
    }
  },

  /**
   * Create delivery log entry in local storage (fallback)
   * @param {Object} deliveryData - Delivery information
   * @returns {Promise<Object>} Creation result
   */
  createDeliveryLogLocal(deliveryData) {
    try {
      const deliveryLog = {
        _id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...deliveryData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Get existing deliveries from localStorage
      const existingDeliveries = JSON.parse(localStorage.getItem('deliveryLogs') || '[]')
      
      // Add new delivery
      existingDeliveries.unshift(deliveryLog)
      
      // Keep only last 1000 deliveries
      const recentDeliveries = existingDeliveries.slice(0, 1000)
      
      // Save to localStorage
      localStorage.setItem('deliveryLogs', JSON.stringify(recentDeliveries))
      
      // Create notification for resident
      this.createDeliveryNotification(deliveryLog)
      
      console.log('✅ Delivery logged to local storage:', deliveryLog)
      return { success: true, data: deliveryLog }
    } catch (error) {
      console.error('Error saving delivery to local storage:', error)
      return { success: false, error: 'Failed to save delivery log locally' }
    }
  },

  /**
   * Create notification for resident about delivery
   * @param {Object} deliveryLog - Delivery log data
   */
  createDeliveryNotification(deliveryLog) {
    try {
      const notification = {
        _id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'delivery',
        title: '📦 Package Delivered',
        message: `Your ${deliveryLog.vendor} package has been delivered to ${deliveryLog.building}-${deliveryLog.flatNumber}`,
        details: {
          vendor: deliveryLog.vendor,
          packageDescription: deliveryLog.packageDescription,
          agentName: deliveryLog.agentName,
          deliveryTime: deliveryLog.deliveryTime,
          trackingId: deliveryLog.trackingId,
          deliveryId: deliveryLog._id
        },
        recipient: {
          type: 'resident',
          flatNumber: deliveryLog.flatNumber,
          building: deliveryLog.building,
          residentName: deliveryLog.residentName
        },
        status: 'unread',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }

      // Get existing notifications from localStorage
      const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]')
      
      // Add new notification
      existingNotifications.unshift(notification)
      
      // Keep only last 1000 notifications
      const recentNotifications = existingNotifications.slice(0, 1000)
      
      // Save to localStorage
      localStorage.setItem('notifications', JSON.stringify(recentNotifications))
      
      // Also create a resident-specific notification
      this.createResidentNotification(deliveryLog, notification)
      
      console.log('✅ Delivery notification created:', notification)
      
      // Show browser notification if permission granted
      this.showBrowserNotification(notification)
      
    } catch (error) {
      console.error('Error creating delivery notification:', error)
    }
  },

  /**
   * Create resident-specific notification
   * @param {Object} deliveryLog - Delivery log data
   * @param {Object} notification - Base notification
   */
  createResidentNotification(deliveryLog, notification) {
    try {
      // Normalize building/flatNumber (handle cases like flatNumber "A-101")
      let normalizedBuilding = (deliveryLog.building || '').toString().trim()
      let normalizedFlat = (deliveryLog.flatNumber || '').toString().trim()
      if (normalizedFlat.includes('-')) {
        const [maybeBuilding, maybeFlat] = normalizedFlat.split('-')
        if (!normalizedBuilding) normalizedBuilding = maybeBuilding
        if (maybeFlat) normalizedFlat = maybeFlat
      }

      const residentNotification = {
        _id: `resident_notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...notification,
        recipientId: `${normalizedBuilding}-${normalizedFlat}`,
        recipientName: deliveryLog.residentName,
        category: 'delivery',
        actions: [
          {
            id: 'view_details',
            label: 'View Details',
            type: 'button',
            action: 'view_delivery'
          },
          {
            id: 'mark_received',
            label: 'Mark as Received',
            type: 'button',
            action: 'mark_received'
          }
        ]
      }

      // Save resident-specific notification
      const key = `resident_notifications_${normalizedBuilding}_${normalizedFlat}`
      const residentNotifications = JSON.parse(localStorage.getItem(key) || '[]')
      residentNotifications.unshift(residentNotification)
      localStorage.setItem(key, JSON.stringify(residentNotifications))
      
      // Trigger custom event to notify other tabs/components
      console.log('🚀 Dispatching delivery notification event for:', deliveryLog.building, deliveryLog.flatNumber)
      window.dispatchEvent(new CustomEvent('deliveryNotificationCreated', {
        detail: {
          building: deliveryLog.building,
          flatNumber: deliveryLog.flatNumber,
          notification: residentNotification
        }
      }))
      console.log('✅ Delivery notification event dispatched')
      
    } catch (error) {
      console.error('Error creating resident notification:', error)
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
   * Get notifications for a specific resident
   * @param {string} building - Building name
   * @param {string} flatNumber - Flat number
   * @returns {Array} Resident notifications
   */
  getResidentNotifications(building, flatNumber) {
    try {
      // Normalize inputs to match writer
      let normalizedBuilding = (building || '').toString().trim()
      let normalizedFlat = (flatNumber || '').toString().trim()
      if (normalizedFlat.includes('-')) {
        const [maybeBuilding, maybeFlat] = normalizedFlat.split('-')
        if (!normalizedBuilding) normalizedBuilding = maybeBuilding
        if (maybeFlat) normalizedFlat = maybeFlat
      }
      const key = `resident_notifications_${normalizedBuilding}_${normalizedFlat}`
      console.log('🔑 Looking for notifications with key:', key)
      const rawData = localStorage.getItem(key)
      console.log('📄 Raw localStorage data:', rawData)
      const notifications = JSON.parse(rawData || '[]')
      console.log('📋 Parsed notifications:', notifications)
      const filteredNotifications = notifications.filter(notification => 
        new Date(notification.expiresAt) > new Date()
      )
      console.log('✅ Filtered notifications:', filteredNotifications)
      return filteredNotifications
    } catch (error) {
      console.error('Error getting resident notifications:', error)
      return []
    }
  },

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} building - Building name
   * @param {string} flatNumber - Flat number
   */
  markNotificationAsRead(notificationId, building, flatNumber) {
    try {
      const notifications = JSON.parse(localStorage.getItem(`resident_notifications_${building}_${flatNumber}`) || '[]')
      const updatedNotifications = notifications.map(notification => 
        notification._id === notificationId 
          ? { ...notification, status: 'read', readAt: new Date().toISOString() }
          : notification
      )
      localStorage.setItem(`resident_notifications_${building}_${flatNumber}`, JSON.stringify(updatedNotifications))
    } catch (error) {
      console.error('Error marking notification as read:', error)
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
        if (response.status === 404) {
          // API endpoint doesn't exist, use local storage fallback
          console.warn('Delivery API not available, using local storage fallback')
          return this.getDeliveryLogsLocal(filters)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data || result.deliveries || [] }
    } catch (error) {
      console.error('Error fetching delivery logs:', error)
      // Fallback to local storage if API fails
      if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
        console.warn('Using local storage fallback for delivery logs')
        return this.getDeliveryLogsLocal(filters)
      }
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
      result.data = (result.data || []).filter(d => (d.building||'').toLowerCase() === (building||'').toLowerCase())
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
   * Get delivery logs from local storage (fallback)
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Delivery logs
   */
  getDeliveryLogsLocal(filters = {}) {
    try {
      const allDeliveries = JSON.parse(localStorage.getItem('deliveryLogs') || '[]')
      let filteredDeliveries = [...allDeliveries]

      // Apply filters
      if (filters.vendor) {
        filteredDeliveries = filteredDeliveries.filter(delivery => 
          delivery.vendor?.toLowerCase().includes(filters.vendor.toLowerCase())
        )
      }

      if (filters.flatNumber) {
        filteredDeliveries = filteredDeliveries.filter(delivery => 
          delivery.flatNumber?.toLowerCase().includes(filters.flatNumber.toLowerCase())
        )
      }

      if (filters.status && filters.status !== 'all') {
        filteredDeliveries = filteredDeliveries.filter(delivery => 
          delivery.status === filters.status
        )
      }

      if (filters.agentName) {
        filteredDeliveries = filteredDeliveries.filter(delivery => 
          delivery.agentName?.toLowerCase().includes(filters.agentName.toLowerCase())
        )
      }

      if (filters.date) {
        const filterDate = new Date(filters.date).toDateString()
        filteredDeliveries = filteredDeliveries.filter(delivery =>
          new Date(delivery.deliveryTime).toDateString() === filterDate
        )
      }

      // Apply limit
      if (filters.limit) {
        filteredDeliveries = filteredDeliveries.slice(0, parseInt(filters.limit))
      }

      return { success: true, data: filteredDeliveries }
    } catch (error) {
      console.error('Error reading delivery logs from local storage:', error)
      return { success: false, error: error.message, data: [] }
    }
  },

  /**
   * Get common delivery vendors
   * @returns {Promise<Object>} Vendor list
   */
  async getVendors() {
    try {
      const response = await fetch(`${API_BASE}/api/deliveries/vendors`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data || result.vendors || [] }
    } catch (error) {
      console.error('Error fetching vendors:', error)
      // Return default vendors if API fails
      return { 
        success: true, 
        data: [
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
      }
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
        if (response.status === 404) {
          // API endpoint doesn't exist, use local storage fallback
          console.warn('Delivery stats API not available, using local storage fallback')
          return this.getDeliveryStatsLocal(dateRange)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      return { success: true, data: result.data }
    } catch (error) {
      console.error('Error fetching delivery stats:', error)
      // Fallback to local storage if API fails
      if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
        console.warn('Using local storage fallback for delivery stats')
        return this.getDeliveryStatsLocal(dateRange)
      }
      return { success: false, error: error.message, data: null }
    }
  },

  /**
   * Get delivery statistics from local storage (fallback)
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} Statistics
   */
  getDeliveryStatsLocal(dateRange = {}) {
    try {
      const allDeliveries = JSON.parse(localStorage.getItem('deliveryLogs') || '[]')
      const today = new Date()
      const todayString = today.toDateString()

      // Filter deliveries for today
      const todayDeliveries = allDeliveries.filter(delivery => {
        const deliveryDate = new Date(delivery.deliveryTime || delivery.createdAt)
        return deliveryDate.toDateString() === todayString
      })

      // Calculate stats
      const stats = {
        totalToday: todayDeliveries.length,
        deliveredToday: todayDeliveries.filter(d => d.status === 'delivered').length,
        pendingToday: todayDeliveries.filter(d => d.status === 'pending').length,
        failedToday: todayDeliveries.filter(d => d.status === 'failed').length,
        vendorBreakdown: {},
        hourlyBreakdown: {}
      }

      // Vendor breakdown
      todayDeliveries.forEach(delivery => {
        const vendor = delivery.vendor || 'Unknown'
        stats.vendorBreakdown[vendor] = (stats.vendorBreakdown[vendor] || 0) + 1
      })

      // Hourly breakdown
      todayDeliveries.forEach(delivery => {
        const hour = new Date(delivery.deliveryTime || delivery.createdAt).getHours()
        stats.hourlyBreakdown[hour] = (stats.hourlyBreakdown[hour] || 0) + 1
      })

      return { success: true, data: stats }
    } catch (error) {
      console.error('Error calculating delivery stats from local storage:', error)
      return { 
        success: true, 
        data: {
          totalToday: 0,
          deliveredToday: 0,
          pendingToday: 0,
          failedToday: 0,
          vendorBreakdown: {},
          hourlyBreakdown: {}
        }
      }
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

  /**
   * Create sample delivery data for demo purposes
   * @returns {Object} Creation result
   */
  createSampleDeliveries() {
    try {
      const sampleDeliveries = [
        {
          _id: `delivery_${Date.now() - 3600000}_sample1`,
          vendor: 'Swiggy',
          vendorId: 'swiggy',
          flatNumber: 'A-101',
          building: 'A',
          residentName: 'John Smith',
          agentName: 'Rajesh Kumar',
          agentPhone: '+91 98765 43210',
          trackingId: 'SW123456789',
          packageDescription: 'Food Order - Biryani & Curry',
          deliveryNotes: 'Hot food delivery',
          status: 'delivered',
          deliveryTime: new Date(Date.now() - 3600000).toISOString(),
          securityOfficer: 'Security Guard',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          _id: `delivery_${Date.now() - 7200000}_sample2`,
          vendor: 'Amazon',
          vendorId: 'amazon',
          flatNumber: 'A-102',
          building: 'A',
          residentName: 'Sarah Johnson',
          agentName: 'Priya Sharma',
          agentPhone: '+91 98765 43211',
          trackingId: 'AM987654321',
          packageDescription: 'Electronics - Bluetooth Headphones',
          deliveryNotes: 'Fragile package',
          status: 'delivered',
          deliveryTime: new Date(Date.now() - 7200000).toISOString(),
          securityOfficer: 'Security Guard',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          updatedAt: new Date(Date.now() - 7200000).toISOString()
        },
        {
          _id: `delivery_${Date.now() - 1800000}_sample3`,
          vendor: 'Zomato',
          vendorId: 'zomato',
          flatNumber: 'B-201',
          building: 'B',
          residentName: 'Mike Wilson',
          agentName: 'Amit Singh',
          agentPhone: '+91 98765 43212',
          trackingId: 'ZM456789123',
          packageDescription: 'Food Order - Pizza & Pasta',
          deliveryNotes: 'Vegetarian food',
          status: 'delivered',
          deliveryTime: new Date(Date.now() - 1800000).toISOString(),
          securityOfficer: 'Security Guard',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          updatedAt: new Date(Date.now() - 1800000).toISOString()
        }
      ]

      // Get existing deliveries from localStorage
      const existingDeliveries = JSON.parse(localStorage.getItem('deliveryLogs') || '[]')
      
      // Add sample deliveries (avoid duplicates)
      const existingIds = new Set(existingDeliveries.map(d => d._id))
      const newSampleDeliveries = sampleDeliveries.filter(d => !existingIds.has(d._id))
      
      if (newSampleDeliveries.length > 0) {
        const updatedDeliveries = [...newSampleDeliveries, ...existingDeliveries]
        localStorage.setItem('deliveryLogs', JSON.stringify(updatedDeliveries))
        console.log(`✅ Added ${newSampleDeliveries.length} sample deliveries`)
        return { success: true, data: { count: newSampleDeliveries.length } }
      } else {
        return { success: true, data: { count: 0, message: 'Sample deliveries already exist' } }
      }
    } catch (error) {
      console.error('Error creating sample deliveries:', error)
      return { success: false, error: error.message }
    }
  }
}
