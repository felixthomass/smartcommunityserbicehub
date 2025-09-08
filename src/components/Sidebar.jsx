import React, { useState } from 'react'
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
  ChevronRight
} from 'lucide-react'

const Sidebar = ({ user, currentPage, setCurrentPage, isCollapsed, setIsCollapsed, darkMode }) => {
  const menuItems = {
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'admin-users', label: 'User Management', icon: Users },
      { id: 'staff-security', label: 'Staff/Security', icon: Shield },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      { id: 'visitors', label: 'Visitor Management', icon: QrCode },
      { id: 'complaints', label: 'Complaints', icon: FileText },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings }
    ],
    resident: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'payments', label: 'My Payments', icon: CreditCard },
      { id: 'complaints', label: 'My Complaints', icon: MessageSquare },
      { id: 'visitors', label: 'Visitor Management', icon: QrCode },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'profile', label: 'Profile', icon: Settings }
    ],
    staff: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'tasks', label: 'My Tasks', icon: FileText },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      { id: 'complaints', label: 'Complaints', icon: MessageSquare },
      { id: 'profile', label: 'Profile', icon: Settings }
    ],
    security: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'visitors', label: 'Visitor Management', icon: QrCode },
      { id: 'scan-pass', label: 'Scan Pass', icon: QrCode },
      { id: 'incidents', label: 'Security Incidents', icon: Shield },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: 'profile', label: 'Profile', icon: Settings }
    ]
  }

  const userMenuItems = menuItems[user?.role] || menuItems.resident

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
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || 'user@example.com'}
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
