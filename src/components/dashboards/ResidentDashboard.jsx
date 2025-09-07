import React, { useState } from 'react'
import { 
  Home, CreditCard, MessageSquare, QrCode, Bell, 
  User, LogOut, Settings, Calendar, Users, 
  Building2, Phone, Mail, MapPin
} from 'lucide-react'

const ResidentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard')

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

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'complaints', label: 'Complaints', icon: MessageSquare },
    { id: 'visitors', label: 'Visitors', icon: QrCode },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                <CreditCard className="w-8 h-8 text-blue-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">₹2,500</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Bills</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                <MessageSquare className="w-8 h-8 text-green-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">2</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open Complaints</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                <QrCode className="w-8 h-8 text-purple-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">5</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Passes</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg">
                <Bell className="w-8 h-8 text-orange-600 mb-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">3</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">New Announcements</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Bills</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Maintenance</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Due: Dec 31, 2024</p>
                    </div>
                    <span className="text-red-600 font-semibold">₹2,000</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Electricity</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Due: Jan 5, 2025</p>
                    </div>
                    <span className="text-red-600 font-semibold">₹500</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Announcements</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <p className="font-medium text-blue-900 dark:text-blue-300">Water Supply Maintenance</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">Tomorrow 10 AM - 2 PM</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                    <p className="font-medium text-green-900 dark:text-green-300">Community Event</p>
                    <p className="text-sm text-green-700 dark:text-green-400">New Year Celebration - Dec 31</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'payments':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2 text-gray-900 dark:text-white">Date</th>
                      <th className="text-left py-2 text-gray-900 dark:text-white">Description</th>
                      <th className="text-left py-2 text-gray-900 dark:text-white">Amount</th>
                      <th className="text-left py-2 text-gray-900 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b dark:border-gray-700">
                      <td className="py-2 text-gray-600 dark:text-gray-400">Dec 1, 2024</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">Maintenance</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">₹2,000</td>
                      <td className="py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Paid</span></td>
                    </tr>
                    <tr className="border-b dark:border-gray-700">
                      <td className="py-2 text-gray-600 dark:text-gray-400">Nov 15, 2024</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">Electricity</td>
                      <td className="py-2 text-gray-600 dark:text-gray-400">₹450</td>
                      <td className="py-2"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Paid</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      case 'complaints':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Complaints</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  New Complaint
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 border dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Plumbing Issue</h4>
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">In Progress</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Kitchen sink is leaking</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Submitted: Dec 20, 2024</p>
                </div>
                <div className="p-4 border dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">Elevator Maintenance</h4>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Open</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Elevator making strange noises</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Submitted: Dec 18, 2024</p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'visitors':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Visitor Passes</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Generate Pass
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">John Doe</h4>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Active</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valid until: Dec 25, 2024 6:00 PM</p>
                  <div className="mt-2 bg-gray-100 dark:bg-gray-700 p-2 rounded text-center">
                    <QrCode className="w-16 h-16 mx-auto text-gray-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'announcements':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Community Announcements</h3>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Water Supply Maintenance</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                    Water supply will be interrupted tomorrow from 10 AM to 2 PM for maintenance work.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">Posted: Dec 22, 2024</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-300 mb-2">New Year Celebration</h4>
                  <p className="text-sm text-green-700 dark:text-green-400 mb-2">
                    Join us for the New Year celebration on Dec 31st at the community hall.
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">Posted: Dec 20, 2024</p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                  <input 
                    type="text" 
                    value={user.name || ''} 
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    readOnly 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input 
                    type="email" 
                    value={user.email || ''} 
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    readOnly 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Flat Number</label>
                  <input 
                    type="text" 
                    value={user.flatNumber || 'N/A'} 
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    readOnly 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Building</label>
                  <input 
                    type="text" 
                    value={user.building || 'N/A'} 
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    readOnly 
                  />
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return <div>Content not found</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Resident Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Welcome back, {user.name || 'User'}</p>
              </div>
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
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === item.id
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResidentDashboard
