// Notification Management Service
class NotificationService {
  constructor() {
    this.baseUrl = 'http://localhost:3002/api'
  }

  // Create a new notification
  async createNotification(notificationData) {
    try {
      console.log('🔄 Creating notification:', notificationData)
      
      const response = await fetch(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Notification created:', result)
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error creating notification:', error)
      return { success: false, error: error.message }
    }
  }

  // Get notifications for a specific user
  async getUserNotifications(userId, filters = {}) {
    try {
      console.log('🔄 Fetching notifications for user:', userId)
      
      const queryParams = new URLSearchParams({
        userId,
        ...filters
      })

      const response = await fetch(`${this.baseUrl}/notifications/user/${userId}?${queryParams}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ User notifications loaded:', result.data?.notifications?.length || 0, 'notifications')
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error fetching user notifications:', error)
      return { success: false, error: error.message }
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      console.log('🔄 Marking notification as read:', notificationId)
      
      const response = await fetch(`${this.baseUrl}/notifications/${notificationId}/read`, {
        method: 'PUT'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Notification marked as read')
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error)
      return { success: false, error: error.message }
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      console.log('🔄 Marking all notifications as read for user:', userId)
      
      const response = await fetch(`${this.baseUrl}/notifications/user/${userId}/read-all`, {
        method: 'PUT'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ All notifications marked as read')
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error)
      return { success: false, error: error.message }
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      console.log('🔄 Deleting notification:', notificationId)
      
      const response = await fetch(`${this.baseUrl}/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Notification deleted')
      return { success: true, data: result }
    } catch (error) {
      console.error('❌ Error deleting notification:', error)
      return { success: false, error: error.message }
    }
  }

  // Get notification statistics
  async getNotificationStats(userId) {
    try {
      console.log('🔄 Fetching notification stats for user:', userId)
      
      const response = await fetch(`${this.baseUrl}/notifications/user/${userId}/stats`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Notification stats loaded:', result.data)
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error fetching notification stats:', error)
      return { success: false, error: error.message }
    }
  }

  // Send notification to multiple users
  async sendBulkNotification(notificationData) {
    try {
      console.log('🔄 Sending bulk notification:', notificationData)
      
      const response = await fetch(`${this.baseUrl}/notifications/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Bulk notification sent:', result.data?.sentCount || 0, 'notifications')
      return { success: true, data: result.data }
    } catch (error) {
      console.error('❌ Error sending bulk notification:', error)
      return { success: false, error: error.message }
    }
  }

  // Test connection
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/health`)
      return response.ok
    } catch (error) {
      console.error('❌ Notification service connection test failed:', error)
      return false
    }
  }
}

export const notificationService = new NotificationService()
