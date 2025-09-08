import React from 'react'
import { LogOut } from 'lucide-react'

const StaffDashboard = ({ user, onLogout, currentPage }) => {
  // Safety check for user object
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading user data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Dashboard</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {user.name || 'User'}!</p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'tasks' ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">My Tasks</h3>
            <p className="text-gray-600 dark:text-gray-400">Tasks list (coming soon).</p>
          </div>
        ) : currentPage === 'maintenance' ? (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Maintenance</h3>
            <p className="text-gray-600 dark:text-gray-400">Maintenance tools (coming soon).</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Staff Dashboard</h3>
            <p className="text-gray-600 dark:text-gray-400">Select a page from the sidebar.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StaffDashboard