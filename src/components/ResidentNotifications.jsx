import React, { useState, useEffect } from 'react'
import { Bell, Package, Clock, CheckCircle, Eye, X, Truck } from 'lucide-react'
import { deliveryService } from '../services/deliveryService'

const ResidentNotifications = ({ user }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)

  // Load notifications for the resident
  const loadNotifications = () => {
    setLoading(true)
    try {
      // Extract building and flat from user data or use defaults for demo
      const building = user?.building || 'A'
      const flatNumber = user?.flatNumber || '101'
      
      const residentNotifications = deliveryService.getResidentNotifications(building, flatNumber)
      setNotifications(residentNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  // Mark notification as read
  const markAsRead = (notificationId) => {
    const building = user?.building || 'A'
    const flatNumber = user?.flatNumber || '101'
    
    deliveryService.markNotificationAsRead(notificationId, building, flatNumber)
    loadNotifications() // Reload to update the list
  }

  // Mark all notifications as read
  const markAllAsRead = () => {
    notifications.forEach(notification => {
      if (notification.status === 'unread') {
        markAsRead(notification._id)
      }
    })
  }

  // Get unread count
  const unreadCount = notifications.filter(n => n.status === 'unread').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delivery Notifications</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Stay updated on your package deliveries
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <div className="flex items-center gap-3">
              <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 px-3 py-1 rounded-full text-sm font-medium">
                {unreadCount} unread
              </span>
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No delivery notifications yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              You'll receive notifications when packages are delivered to your flat
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  notification.status === 'unread' ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notification.status === 'unread' 
                      ? 'bg-blue-100 dark:bg-blue-900/30' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {notification.status === 'unread' ? (
                      <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-sm font-medium ${
                          notification.status === 'unread' 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className={`text-sm mt-1 ${
                          notification.status === 'unread' 
                            ? 'text-gray-800 dark:text-gray-200' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {notification.message}
                        </p>
                        
                        {/* Delivery Details */}
                        {notification.details && (
                          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                            <span className="flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              {notification.details.vendor}
                            </span>
                            {notification.details.packageDescription && (
                              <span>📦 {notification.details.packageDescription}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(notification.createdAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {notification.status === 'unread' && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            Mark read
                          </button>
                        )}
                        
                        <button
                          onClick={() => setSelectedNotification(notification)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Details Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delivery Details
                </h3>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">📦 Package Information</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Vendor:</strong> {selectedNotification.details?.vendor}
                  </p>
                  {selectedNotification.details?.packageDescription && (
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Description:</strong> {selectedNotification.details.packageDescription}
                    </p>
                  )}
                  {selectedNotification.details?.trackingId && (
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Tracking ID:</strong> {selectedNotification.details.trackingId}
                    </p>
                  )}
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">🚚 Delivery Agent</h4>
                  {selectedNotification.details?.agentName ? (
                    <p className="text-sm text-green-800 dark:text-green-300">
                      <strong>Agent:</strong> {selectedNotification.details.agentName}
                    </p>
                  ) : (
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Agent information not provided
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">⏰ Delivery Time</h4>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {new Date(selectedNotification.details?.deliveryTime || selectedNotification.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Close
                </button>
                {selectedNotification.status === 'unread' && (
                  <button
                    onClick={() => {
                      markAsRead(selectedNotification._id)
                      setSelectedNotification(null)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResidentNotifications
