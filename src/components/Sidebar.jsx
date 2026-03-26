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
  Map,
  Camera,
  Trash2,
  Plus,
  AlertOctagon,
  Clock
} from 'lucide-react'
import { notificationService } from '../services/notificationService'
import { imageUploadService } from '../services/imageUploadService'
import { authService } from '../services/authService'
import { showSuccess, showError } from '../utils/sweetAlert'

const Sidebar = ({ user, currentPage, setCurrentPage, isCollapsed, setIsCollapsed, darkMode }) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)
      const result = await imageUploadService.uploadImage(file, 'avatars')
      
      if (result.success) {
        const updateResult = await authService.updateProfile({
          profile_picture: result.data.publicUrl
        })
        
        if (updateResult.success) {
          showSuccess('Profile picture updated successfully')
        } else {
          showError('Failed to update profile metadata: ' + updateResult.error)
        }
      } else {
        showError('Upload failed: ' + result.error)
      }
    } catch (err) {
      console.error('Profile picture error:', err)
      showError('An error occurred during upload')
    } finally {
      setUploading(false)
    }
  }

  const removeProfilePicture = async () => {
    try {
      setUploading(true)
      const updateResult = await authService.updateProfile({
        profile_picture: null
      })
      
      if (updateResult.success) {
        showSuccess('Profile picture removed')
        setShowProfileModal(false)
      } else {
        showError('Failed to remove profile picture: ' + updateResult.error)
      }
    } catch (err) {
      console.error('Remove picture error:', err)
      showError('An error occurred')
    } finally {
      setUploading(false)
    }
  }
  const menuItems = {
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'admin-users', label: 'User Management', icon: Users },
      { id: 'staff-security', label: 'Staff/Security', icon: Shield },
      { id: 'security-management', label: 'Security Management', icon: Shield },
      { id: 'monthly-fee', label: 'Monthly Fee', icon: CreditCard },
      { id: 'visitors', label: 'Visitor Management', icon: QrCode },
      { id: 'complaints', label: 'Complaints', icon: FileText },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'add-residents', label: 'Add Residents', icon: UserPlus },
      { id: 'shift-scheduling', label: 'Shift Scheduling', icon: Clock },
      { id: 'shift', label: 'My Shift', icon: Clock },
      { id: 'emergency-requests', label: 'Emergency Requests', icon: AlertOctagon },
      { id: 'chat', label: 'Chat', icon: MessageSquare },
      { id: 'reports', label: 'Reports', icon: FileText },
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
      { id: 'shift', label: 'My Shift', icon: Clock },
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

  const userMenuItems = menuItems[user?.role] || (user?.role === 'housekeeping' ? menuItems.staff : menuItems.resident)

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

  const getRoleLabel = (role) => {
    const labels = {
      resident: 'Resident',
      admin: 'Admin/Owner',
      staff: 'Staff',
      security: 'Security'
    }
    return labels[role] || 'Resident'
  }

  const getRoleColor = (role) => {
    const colors = {
      resident: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      staff: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      security: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
    }
    return colors[role] || colors.resident
  }

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
        {!isCollapsed ? (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg group/profile relative">
              <div className="flex items-center gap-3">
                <div className="relative group/avatar">
                  <button 
                    onClick={() => setShowProfileModal(true)}
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-blue-100 dark:bg-blue-900/20 border-2 border-white dark:border-gray-600 shadow-sm transition-transform hover:scale-105 active:scale-95"
                  >
                    {user?.profilePicture ? (
                      <img 
                        src={user.profilePicture} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                    
                    {/* View Overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity rounded-full">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                  </button>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 rounded-full">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${getRoleColor(user?.role)}`}>
                  {getRoleLabel(user?.role)}
                </span>
              </div>

              {/* Delete Icon on the right side */}
              {user?.profilePicture && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeProfilePicture();
                  }}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10 opacity-0 group-hover/profile:opacity-100"
                  title="Remove Photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-center flex-col items-center gap-2">
            <div className="relative group/avatar">
              <button 
                onClick={() => setShowProfileModal(true)}
                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-blue-100 dark:bg-blue-900/20 border-2 border-white dark:border-gray-600 shadow-sm transition-transform hover:scale-105"
              >
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            </div>
            {uploading && (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
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

      {/* Profile Picture Management Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
          
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Profile Photo</h3>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content - Full Size Photo */}
            <div className="p-6 flex flex-col items-center">
              <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden shadow-xl border-4 border-white dark:border-gray-700 bg-gray-100 dark:bg-gray-900 flex items-center justify-center mb-8 relative">
                {user?.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-6xl font-bold text-blue-600/30 dark:text-blue-400/30">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="w-full grid grid-cols-2 gap-4">
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold cursor-pointer transition-all active:scale-95 disabled:opacity-50">
                  <Camera className="w-5 h-5" />
                  <span>Edit Photo</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={async (e) => {
                      await handleProfilePictureUpload(e);
                      setShowProfileModal(false);
                    }}
                    disabled={uploading}
                  />
                </label>
                
                <button
                  onClick={removeProfilePicture}
                  disabled={uploading || !user.profilePicture}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You can upload a JPG, PNG or WebP image.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
