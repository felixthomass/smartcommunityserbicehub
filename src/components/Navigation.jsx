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
  CreditCard
} from 'lucide-react'

const Navigation = ({ currentPage, onNavigate, isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      onNavigate('landing')
    } catch (error) {
      console.error('Error logging out:', error)
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
        { id: 'payments', label: 'My Bills', icon: CreditCard },
        { id: 'visitors', label: 'Visitor Pass', icon: QrCode },
        { id: 'complaints', label: 'Complaints', icon: FileText },
        { id: 'chat', label: 'Chat', icon: Eye }
      ],
      admin: [
        { id: 'admin-users', label: 'User Management', icon: Users },
        { id: 'staff-security', label: 'Staff/Security', icon: Shield },
        { id: 'maintenance', label: 'Bill Management', icon: CreditCard },
        { id: 'visitors', label: 'Visitor Management', icon: QrCode },
        { id: 'complaints', label: 'Complaints', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings }
      ],
      staff: [
        { id: 'tasks', label: 'My Tasks', icon: Wrench },
        { id: 'maintenance', label: 'Bill Management', icon: CreditCard }
      ],
      security: [
        { id: 'visitors', label: 'Visitor Log', icon: Eye },
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
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${getRoleColor(user?.role)}`}>
                    {getRoleLabel(user?.role)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
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

      {/* Overlay for mobile */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  )
}

export default Navigation 