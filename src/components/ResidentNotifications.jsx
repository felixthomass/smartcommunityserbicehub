import React, { useState, useEffect } from 'react'
import { Bell, Package, Clock, CheckCircle, Eye, X, Truck } from 'lucide-react'
import { deliveryService } from '../services/deliveryService'

const ResidentNotifications = ({ user }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState(null)

  // Load notifications for the resident
  const loadNotifications = async () => {
    setLoading(true)
    try {
      // Extract building and flat from user data or use defaults for demo
      const building = user?.building || 'A'
      const flatNumber = user?.flatNumber || '101'
      
      const residentNotifications = await deliveryService.getResidentNotifications(building, flatNumber)
      setNotifications(residentNotifications || [])
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
  const markAsRead = async (notificationId) => {
    const building = user?.building || 'A'
    const flatNumber = user?.flatNumber || '101'
    
    await deliveryService.markNotificationAsRead(notificationId, building, flatNumber)
    loadNotifications() // Reload to update the list
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    const unread = notifications.filter(n => n.status === 'unread' || !n.isRead)
    for (const notification of unread) {
      await markAsRead(notification._id)
    }
  }

  // Get unread count
  const unreadCount = notifications.filter(n => n.status === 'unread' || n.isRead === false).length

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
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Residential Notifications</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Stay updated on your community alerts & deliveries
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
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 font-medium tracking-wide">Loading your intelligence feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-bold">All caught up!</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              No new notifications at the moment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {notifications.map((notification) => {
              const isUnread = notification.status === 'unread' || notification.isRead === false
              const metadata = notification.metadata || notification.details || {}
              
              return (
                <div
                  key={notification._id}
                  className={`p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all border-l-4 ${
                    isUnread ? 'bg-blue-50/30 dark:bg-blue-900/10 border-blue-600' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                      isUnread 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}>
                      {notification.type === 'delivery' ? (
                        <Package className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`text-sm font-bold uppercase tracking-tight ${
                              isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {notification.title}
                            </h3>
                            {notification.priority === 'high' && (
                              <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Urgent</span>
                            )}
                          </div>
                          <p className={`text-sm leading-relaxed ${
                            isUnread ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {/* Metadata / Details */}
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                            {metadata.vendor && (
                              <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                                <Truck className="w-3 h-3 text-blue-600 mr-1" />
                                {metadata.vendor}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {new Date(notification.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-4 self-center">
                          {isUnread && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black uppercase rounded-lg hover:scale-105 transition-transform"
                            >
                              Dismiss
                            </button>
                          )}
                          
                          <button
                            onClick={() => setSelectedNotification(notification)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
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
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/20">
                  <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Package details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-blue-800 dark:text-blue-200">
                      <span className="opacity-60 font-medium">Vendor:</span> <span className="font-bold">{(selectedNotification.metadata?.vendor || selectedNotification.details?.vendor) || 'N/A'}</span>
                    </p>
                    {((selectedNotification.metadata?.packageDescription || selectedNotification.details?.packageDescription)) && (
                      <p className="text-blue-800 dark:text-blue-200">
                        <span className="opacity-60 font-medium">Description:</span> <span className="font-bold">{(selectedNotification.metadata?.packageDescription || selectedNotification.details?.packageDescription)}</span>
                      </p>
                    )}
                    {((selectedNotification.metadata?.trackingId || selectedNotification.details?.trackingId)) && (
                      <p className="text-blue-800 dark:text-blue-200">
                        <span className="opacity-60 font-medium">Tracking ID:</span> <span className="font-bold font-mono">{(selectedNotification.metadata?.trackingId || selectedNotification.details?.trackingId)}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/20">
                  <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Handling Info
                  </h4>
                  <div className="space-y-2 text-sm">
                    {((selectedNotification.metadata?.agentName || selectedNotification.details?.agentName)) ? (
                      <>
                        <p className="text-emerald-800 dark:text-emerald-200">
                          <span className="opacity-60 font-medium">Agent:</span> <span className="font-bold">{(selectedNotification.metadata?.agentName || selectedNotification.details?.agentName)}</span>
                        </p>
                        {((selectedNotification.metadata?.agentPhone || selectedNotification.details?.agentPhone)) && (
                          <p className="text-emerald-800 dark:text-emerald-200">
                            <span className="opacity-60 font-medium">Contact:</span> <span className="font-bold">{(selectedNotification.metadata?.agentPhone || selectedNotification.details?.agentPhone)}</span>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-emerald-600 dark:text-emerald-400 italic text-xs">No agent details provided by security.</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  <h4 className="text-xs font-black text-gray-900 dark:text-gray-300 uppercase tracking-widest mb-2">Timestamp</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {new Date(selectedNotification.metadata?.deliveryTime || selectedNotification.createdAt).toLocaleString()}
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
