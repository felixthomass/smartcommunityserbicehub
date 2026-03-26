import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Home,
  User,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Shield,
  Bell,
  FileText,
  QrCode,
  Wrench,
  Eye,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MessageSquare,
  Truck,
  Map,
  Camera,
  Trash2,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserCheck
} from 'lucide-react'
import { imageUploadService } from '../services/imageUploadService'
import { authService } from '../services/authService'
import { showSuccess, showError } from '../utils/sweetAlert'

const Navigation = ({ currentPage, onNavigate, isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      onNavigate('landing')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

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

  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['resident', 'admin', 'staff', 'security'] },
      { id: 'profile', label: 'Profile', icon: User, roles: ['resident', 'admin', 'staff', 'security'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['resident', 'admin', 'staff', 'security'] }
    ]

    const roleSpecificItems = {
      resident: [
        { id: 'service-requests', label: 'Service Requests', icon: Wrench },
        { id: 'payments', label: 'My Bills', icon: CreditCard },
        { id: 'visitors', label: 'Visitor Pass', icon: QrCode },
        { id: 'deliveries', label: 'Deliveries', icon: Truck },
        { id: 'complaints', label: 'Complaints', icon: FileText },
        { id: 'map', label: 'Community Map', icon: Map },
        { id: 'announcements', label: 'Announcements', icon: Bell },
        { id: 'chat', label: 'Chat', icon: Eye }
      ],
      admin: [
        { id: 'admin-users', label: 'User Management', icon: Users },
        { id: 'staff-security', label: 'Staff/Security', icon: Shield },
        { id: 'gate-management', label: 'Gate Management', icon: ShieldCheck },
        { id: 'face-enrollment', label: 'Face Enrollment', icon: UserCheck },
        { id: 'shift-scheduling', label: 'Shift Scheduling', icon: Calendar },
        { id: 'emergency-alerts', label: 'Emergency Alerts', icon: AlertTriangle },
        { id: 'monthly-fee', label: 'Monthly Fee', icon: CreditCard },
        { id: 'visitors', label: 'Visitor Management', icon: QrCode },
        { id: 'complaints', label: 'Complaints', icon: FileText },
        { id: 'add-residents', label: 'Add Residents', icon: Users },
        { id: 'announcements', label: 'Announcements', icon: Bell },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'settings', label: 'Settings', icon: Settings }
      ],
      staff: [
        { id: 'tasks', label: 'My Tasks', icon: Wrench },
        { id: 'maintenance', label: 'Bill Management', icon: CreditCard }
      ],
      security: [
        { id: 'shifts', label: 'My Shift', icon: Clock },
        { id: 'staff-entry', label: 'Staff Entry', icon: UserCheck },
        { id: 'visitors', label: 'Visitor Log', icon: Eye },
        { id: 'residents', label: 'Resident Directory', icon: Building2 },
        { id: 'deliveries', label: 'Delivery Logs', icon: Truck },
        { id: 'scan-pass', label: 'Scan Pass', icon: QrCode },
        { id: 'security', label: 'Security', icon: Shield }
      ]
    }

    return [
      ...baseItems,
      ...(roleSpecificItems[user?.role] || [])
    ]
  }

  const menuItems = getMenuItems()

  const getRoleColor = (role) => {
    const colors = {
      resident: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      staff: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      security: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
    }
    return colors[role] || colors.resident
  }

  const getRoleLabel = (role) => {
    const labels = {
      resident: 'Resident',
      admin: 'Admin/Owner',
      staff: 'Staff',
      security: 'Security'
    }
    return labels[role] || 'Resident'
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      >
        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Navigation */}
      <nav className={`fixed inset-y-0 left-0 z-40 bg-white dark:bg-gray-800 shadow-xl transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                {!isCollapsed && (
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Community Hub
                  </h1>
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

            {/* User Info */}
            {!isCollapsed ? (
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
            ) : (
              <div className="flex justify-center flex-col items-center gap-2">
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
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onNavigate(item.id)
                        setIsMenuOpen(false)
                      }}
                      className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={isCollapsed ? item.label : ''}
                    >
                      <Icon className="w-5 h-5" />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors`}
              title={isCollapsed ? 'Sign Out' : ''}
            >
              <LogOut className="w-5 h-5" />
              {!isCollapsed && <span className="font-medium">Sign Out</span>}
            </button>
          </div>
        </div>
      </nav>

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

export default Navigation 