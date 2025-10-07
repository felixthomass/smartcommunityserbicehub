import React, { useState, useEffect } from 'react'
import { 
  Home, 
  Users, 
  Shield, 
  Wrench, 
  QrCode, 
  FileText, 
  Settings,
  CreditCard,
  MessageSquare,
  Bell,
  BarChart3,
  UserPlus,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCheck,
  Truck,
  Map
} from 'lucide-react'
import { notificationService } from '../services/notificationService'

const Sidebar = ({ user, currentPage, setCurrentPage, isCollapsed, setIsCollapsed, darkMode }) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const menuItems = {
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'admin-users', label: 'User Management', icon: Users },
      { id: 'staff-security', label: 'Staff/Security', icon: Shield },
      { id: 'maintenance', label: 'Bill Management', icon: CreditCard },
      { id: 'visitors', label: 'Visitor Management', icon: QrCode },
      { id: 'complaints', label: 'Complaints', icon: FileText },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'add-residents', label: 'Add Residents', icon: UserPlus },
      { id: 'chat', label: 'Chat', icon: MessageSquare },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings }
    ],
    resident: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'service-requests', label: 'Service Requests', icon: Wrench },
      { id: 'payments', label: 'My Bills', icon: CreditCard },
      { id: 'deliveries', label: 'Deliveries', icon: Truck },
      { id: 'complaints', label: 'My Complaints', icon: MessageSquare },
      { id: 'visitors', label: 'Visitor Management', icon: QrCode },
      { id: 'map', label: 'Community Map', icon: Map },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'chat', label: 'Chat', icon: MessageSquare },
      { id: 'profile', label: 'Profile', icon: Settings }
    ],
    staff: [
      { id: 'tasks', label: 'My Tasks', icon: FileText },
      { id: 'maintenance', label: 'Bill Management', icon: CreditCard },
      { id: 'complaints', label: 'Complaints', icon: MessageSquare }
    ],
    security: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'visitors', label: 'Visitor Management', icon: QrCode },
      { id: 'residents', label: 'Resident Directory', icon: Building2 },
      { id: 'deliveries', label: 'Delivery Logs', icon: Truck },
      { id: 'scan-pass', label: 'Scan Pass', icon: QrCode },
      { id: 'incidents', label: 'Security Incidents', icon: Shield },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'Profile', icon: Settings }
    ]
  }

  const userMenuItems = menuItems[user?.role] || menuItems.resident

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) return
      
      try {
        const result = await notificationService.getUserNotifications(user.id, { limit: 10, role: (user.role||'').toLowerCase() })
        if (result.success) {
          setNotifications(result.data.notifications || [])
          setUnreadCount(result.data.unreadCount || 0)
        }
      } catch (error) {
        console.error('Error loading notifications:', error)
      }
    }

    loadNotifications()
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await notificationService.markAsRead(notification._id)
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(prev => 
        prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
      )
    }
    
    // Navigate to relevant page if actionUrl is provided
    if (notification.metadata?.actionUrl) {
      setCurrentPage(notification.metadata.actionUrl.replace('/', ''))
    }
    
    setShowNotifications(false)
  }

  const markAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return
    
    try {
      await notificationService.markAllAsRead(user.id)
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-dropdown')) {
        setShowNotifications(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifications])

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 z-40 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Community Hub</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role} Panel</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="notification-dropdown absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification._id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                            !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              notification.priority === 'urgent' ? 'bg-red-500' :
                              notification.priority === 'high' ? 'bg-orange-500' :
                              notification.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Collapse/Expand Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* User Info */}
        {!isCollapsed && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || user?.email || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {userMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={isCollapsed ? item.label : ''}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Community Hub v1.0
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                © 2024 All rights reserved
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  )
}

export default Sidebar
